import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { FollowupsRepository } from './followups.repository';
import { EnquiriesRepository } from '../enquiries/enquiries.repository';
import { AuditLogRepository } from '../audit-log/audit-log.repository';
import { LogFollowupDto } from './dto/log-followup.dto';
import { FollowupEntity } from './entities/followup.entity';
import { FollowupEnquiryNotFoundError } from './followups.errors';
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
    await this.assertEnquiryOwnedByActor(enquiryId, actor);

    return this.dataSource.transaction(async (manager) => {
      const followup = await this.followupsRepository.insert(
        {
          enquiryId,
          type: dto.type,
          remarks: dto.remarks,
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
          after: { followupId: followup.followupId, enquiryId, type: dto.type },
          locationId: actor.locationId,
          dealerGroupId: actor.dealerGroupId,
        },
        manager,
      );

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

  private async assertEnquiryOwnedByActor(enquiryId: string, actor: Principal): Promise<void> {
    const enquiry = await this.enquiriesRepository.findOwnedById(enquiryId, actor);
    if (!enquiry) {
      throw new FollowupEnquiryNotFoundError([{ field: 'enquiryId', message: `Enquiry ${enquiryId} not found` }]);
    }
  }
}
