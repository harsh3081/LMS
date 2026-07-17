import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { FollowupsRepository } from './followups.repository';
import { EnquiriesRepository } from '../enquiries/enquiries.repository';
import { AuditLogRepository } from '../audit-log/audit-log.repository';
import { LogFollowupDto } from './dto/log-followup.dto';
import { FollowupEntity } from './entities/followup.entity';
import { FollowupEnquiryNotFoundError, NextFollowUpRequiredError } from './followups.errors';
import { EnquiryEntity } from '../enquiries/entities/enquiry.entity';
import { Principal } from '../common/principal';

/**
 * Log-a-Follow-up use case (issue #30, "Log a Follow-up with Type and
 * Outcome Remarks" — first Story under Feature #8). Mirrors
 * EnquiriesService.createDirect's structure: eligibility (does the target
 * Enquiry exist, within the caller's own owner/tenant scope) is checked
 * BEFORE opening the transaction (fail fast), then the Follow-up insert +
 * audit_log write are persisted atomically in one transaction (ADR-009)
 * with `loggedBy`/`locationId`/`dealerGroupId` fully server-derived from the
 * `Principal` — never from the client DTO (ADR-003/009).
 */
@Injectable()
export class FollowupsService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly followupsRepository: FollowupsRepository,
    private readonly enquiriesRepository: EnquiriesRepository,
    private readonly auditLogRepository: AuditLogRepository,
  ) {}

  async logFollowup(enquiryId: string, dto: LogFollowupDto, actor: Principal): Promise<FollowupEntity> {
    // Validation-before-referential ordering mirrors
    // EnquiriesService.createDirect (assertMandatoryFieldsPresent runs
    // before the existence checks) — a cheap in-memory check fails fast
    // before any DB round-trip.
    this.assertNextFollowUpOrTerminalStatus(dto);
    const enquiry = await this.assertEnquiryOwnedByActor(enquiryId, actor);

    return this.dataSource.transaction(async (manager) => {
      const followup = await this.followupsRepository.insert(
        {
          enquiryId,
          type: dto.type,
          remarks: dto.remarks,
          nextFollowUpAt: dto.nextFollowUpAt ? new Date(dto.nextFollowUpAt) : null,
          // ---- server-derived, never from the client DTO ----
          loggedBy: actor.userId,
          locationId: actor.locationId,
          dealerGroupId: actor.dealerGroupId,
        },
        manager,
      );

      await this.auditLogRepository.record(
        {
          actor: actor.userId,
          action: 'FOLLOWUP_LOGGED',
          entityType: 'followup',
          entityId: String(followup.followupId),
          before: null,
          after: {
            followupId: followup.followupId,
            enquiryId,
            type: dto.type,
            nextFollowUpAt: followup.nextFollowUpAt,
          },
          locationId: actor.locationId,
          dealerGroupId: actor.dealerGroupId,
        },
        manager,
      );

      // NEW (issue #31, AC2): the minimal terminal-status side effect —
      // see LogFollowupDto.enquiryStatus / EnquiriesRepository.updateStatus
      // for the explicit scope boundary with #33. Persisted in the SAME
      // transaction as the Follow-up insert (ADR-009).
      if (dto.enquiryStatus) {
        const previousStatus = enquiry.status;
        await this.enquiriesRepository.updateStatus(enquiryId, dto.enquiryStatus, manager);
        await this.auditLogRepository.record(
          {
            actor: actor.userId,
            action: 'ENQUIRY_STATUS_UPDATED',
            entityType: 'enquiry',
            entityId: String(enquiryId),
            before: { status: previousStatus },
            after: { status: dto.enquiryStatus },
            locationId: actor.locationId,
            dealerGroupId: actor.dealerGroupId,
          },
          manager,
        );
      }

      return followup;
    });
  }

  /** AC5: history for one Enquiry — same eligibility check as logFollowup,
   * so a caller can never enumerate Follow-ups for an Enquiry they cannot
   * already see. */
  async findByEnquiry(enquiryId: string, actor: Principal): Promise<FollowupEntity[]> {
    await this.assertEnquiryOwnedByActor(enquiryId, actor);
    return this.followupsRepository.findByEnquiry(enquiryId, actor);
  }

  /** NEW (issue #31, AC4) — the DSE's own upcoming/overdue Follow-up
   * reminders, most-overdue-first. No eligibility check needed beyond the
   * tenant/loggedBy scope already applied by the repository query — unlike
   * findByEnquiry, this is not scoped to a single Enquiry the caller must
   * already be able to see. */
  async findUpcoming(actor: Principal): Promise<FollowupEntity[]> {
    return this.followupsRepository.findUpcomingForActor(actor);
  }

  /** AC2: "System does not allow closing a follow-up without a Next
   * Follow-up Date, unless Enquiry status is set to a terminal state
   * (Lost/Booked)." `dto.enquiryStatus` is already constrained to
   * Lost/Booked by LogFollowupDto's `@IsIn` — its mere presence is
   * sufficient to prove the exception applies. Mirrors
   * FieldConfigService.assertMandatoryFieldsPresent's manual
   * conditional-mandatory pattern. */
  private assertNextFollowUpOrTerminalStatus(dto: LogFollowupDto): void {
    const hasNextFollowUp = typeof dto.nextFollowUpAt === 'string' && dto.nextFollowUpAt.trim().length > 0;
    const isTerminal = dto.enquiryStatus !== undefined;
    if (!hasNextFollowUp && !isTerminal) {
      throw new NextFollowUpRequiredError([
        {
          field: 'nextFollowUpAt',
          message: 'nextFollowUpAt is required unless enquiryStatus is Lost or Booked',
        },
      ]);
    }
  }

  private async assertEnquiryOwnedByActor(enquiryId: string, actor: Principal): Promise<EnquiryEntity> {
    const enquiry = await this.enquiriesRepository.findOwnedById(enquiryId, actor);
    if (!enquiry) {
      throw new FollowupEnquiryNotFoundError([{ field: 'enquiryId', message: `Enquiry ${enquiryId} not found` }]);
    }
    return enquiry;
  }
}
