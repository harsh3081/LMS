import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { EnquiriesRepository } from './enquiries.repository';
import { LeadsRepository } from '../leads/leads.repository';
import { AuditLogRepository } from '../audit-log/audit-log.repository';
import { ConvertLeadDto } from './dto/convert-lead.dto';
import { EnquiryEntity, ENQUIRY_STATUS_NEW } from './entities/enquiry.entity';
import { LeadEntity, LEAD_STATUS_CONVERTED } from '../leads/entities/lead.entity';
import { LeadNotFoundError, LeadAlreadyConvertedError } from './enquiries.errors';
import { Principal } from '../common/principal';

/**
 * Convert-Lead-into-Enquiry use case (tech-design.md Component 1 / ref-code.md
 * Sample 1). Eligibility (exists / in-scope / not already converted) is
 * checked BEFORE opening the transaction (fail fast, mirroring
 * LeadsService.create's referential-validity-first pattern), then the
 * Enquiry insert + Lead status flip + audit_log write are persisted
 * atomically in one transaction (ADR-009) with owner/tenant/convertedBy/
 * status fully server-derived from the `Principal` — never from the client
 * DTO (ADR-003/009).
 */
@Injectable()
export class EnquiriesService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly enquiriesRepository: EnquiriesRepository,
    private readonly leadsRepository: LeadsRepository,
    private readonly auditLogRepository: AuditLogRepository,
  ) {}

  async convert(leadId: string, dto: ConvertLeadDto, actor: Principal): Promise<EnquiryEntity> {
    const lead = await this.assertEligible(leadId, actor);

    return this.dataSource.transaction(async (manager) => {
      const previousStatus = lead.status;

      const enquiry = await this.enquiriesRepository.insert(
        {
          leadId: lead.leadId,
          budget: dto.budget,
          variant: dto.variant,
          exchangeInterest: dto.exchangeInterest,
          financeInterest: dto.financeInterest,
          // ---- server-derived, never from the client DTO ----
          convertedBy: actor.userId,
          ownerId: actor.userId,
          locationId: actor.locationId,
          dealerGroupId: actor.dealerGroupId,
          status: ENQUIRY_STATUS_NEW,
          customFields: {},
        },
        manager,
      );

      lead.status = LEAD_STATUS_CONVERTED;
      await manager.getRepository(LeadEntity).save(lead);

      await this.auditLogRepository.record(
        {
          actor: actor.userId,
          action: 'LEAD_CONVERTED',
          entityType: 'lead',
          entityId: String(lead.leadId),
          before: { status: previousStatus },
          after: { status: LEAD_STATUS_CONVERTED, enquiryId: enquiry.enquiryId },
          locationId: actor.locationId,
          dealerGroupId: actor.dealerGroupId,
        },
        manager,
      );

      return enquiry;
    });
  }

  /** Tenant/owner-scoped load — returns ALL statuses (incl. Converted) so we
   * can tell 409 (already converted) apart from 404 (absent/out-of-scope). */
  private async assertEligible(leadId: string, actor: Principal) {
    const lead = await this.leadsRepository.findOwnedById(leadId, actor);
    if (!lead) {
      throw new LeadNotFoundError([{ field: 'leadId', message: `Lead ${leadId} not found` }]);
    }
    if (lead.status === LEAD_STATUS_CONVERTED) {
      throw new LeadAlreadyConvertedError([{ field: 'leadId', message: `Lead ${leadId} is already converted` }]);
    }
    return lead;
  }
}
