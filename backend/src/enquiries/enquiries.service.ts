import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { EnquiriesRepository } from './enquiries.repository';
import { LeadsRepository } from '../leads/leads.repository';
import { AuditLogRepository } from '../audit-log/audit-log.repository';
import { ConvertLeadDto } from './dto/convert-lead.dto';
import { CreateDirectEnquiryDto } from './dto/create-direct-enquiry.dto';
import { EnquiryEntity, ENQUIRY_STATUS_NEW, ENQUIRY_ENTRY_TYPE_DIRECT } from './entities/enquiry.entity';
import { LeadEntity, LEAD_STATUS_CONVERTED } from '../leads/entities/lead.entity';
import { LeadSourceEntity } from '../lead-sources/entities/lead-source.entity';
import { VehicleModelEntity } from '../vehicle-models/entities/vehicle-model.entity';
import { LeadNotFoundError, LeadAlreadyConvertedError, EnquiryReassignTargetNotFoundError } from './enquiries.errors';
import { ReferentialValidationError } from '../leads/leads.errors';
import { Principal } from '../common/principal';
import { FieldConfigService } from '../field-config/field-config.service';

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
    private readonly fieldConfigService: FieldConfigService,
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

  /**
   * Create-a-Direct-Enquiry use case (issue #26, "Create a Direct Enquiry
   * (Walk-in/Referred)"). No Lead is created or referenced (AC1/AC4) — the
   * Lead-equivalent fields (AC2) are persisted directly on the Enquiry row
   * (migration 1700000000005). Referential validity is checked first (fail
   * fast, mirrors LeadsService.create's convention), then the Enquiry +
   * audit_log rows are persisted atomically in one transaction (ADR-009)
   * with owner/tenant/convertedBy/status/entryType fully server-derived from
   * the `Principal` — never from the client DTO (ADR-003/009).
   */
  async createDirect(dto: CreateDirectEnquiryDto, actor: Principal): Promise<EnquiryEntity> {
    await this.fieldConfigService.assertMandatoryFieldsPresent({
      customerName: dto.customerName,
      mobile: dto.mobile,
      sourceId: dto.sourceId,
      modelId: dto.modelId,
    });
    if (dto.sourceId !== undefined) await this.assertSourceExists(dto.sourceId);
    if (dto.modelId !== undefined) await this.assertModelExists(dto.modelId);

    return this.dataSource.transaction(async (manager) => {
      const enquiry = await this.enquiriesRepository.insert(
        {
          leadId: null,
          entryType: ENQUIRY_ENTRY_TYPE_DIRECT,
          customerName: dto.customerName ?? null,
          mobile: dto.mobile ?? null,
          sourceId: dto.sourceId ?? null,
          modelId: dto.modelId ?? null,
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

      await this.auditLogRepository.record(
        {
          actor: actor.userId,
          action: 'ENQUIRY_CREATED_DIRECT',
          entityType: 'enquiry',
          entityId: String(enquiry.enquiryId),
          before: null,
          after: { enquiryId: enquiry.enquiryId, entryType: ENQUIRY_ENTRY_TYPE_DIRECT, status: enquiry.status },
          locationId: actor.locationId,
          dealerGroupId: actor.dealerGroupId,
        },
        manager,
      );

      return enquiry;
    });
  }

  /** Owner/tenant-scoped Enquiry list (Direct + Converted alike, AC5). */
  async findOwnQueue(actor: Principal): Promise<EnquiryEntity[]> {
    return this.enquiriesRepository.findOwnQueue(actor);
  }

  /**
   * Reassign-Enquiry-Owner use case (issue #28, AC4). Mirrors
   * LeadsService.reassignOwner exactly — no controller calls this yet (a
   * future TL-reassignment Story wires the HTTP surface); this method +
   * EnquiriesRepository.reassignOwner prove the ownership-audit mechanism
   * (ownerId + ownerUpdatedAt updated, audit_log row written, both in one
   * transaction, ADR-009).
   */
  async reassignOwner(enquiryId: string, newOwnerId: string, actor: Principal): Promise<EnquiryEntity> {
    return this.dataSource.transaction(async (manager) => {
      const existing = await manager.getRepository(EnquiryEntity).findOne({ where: { enquiryId } });
      if (!existing) {
        throw new EnquiryReassignTargetNotFoundError([
          { field: 'enquiryId', message: `Enquiry ${enquiryId} not found` },
        ]);
      }
      const previousOwnerId = existing.ownerId;

      const updated = await this.enquiriesRepository.reassignOwner(enquiryId, newOwnerId, manager);
      /* istanbul ignore next -- existing was just found in this same
       * transaction; cannot race to null within a single transaction. */
      if (!updated) {
        throw new EnquiryReassignTargetNotFoundError([
          { field: 'enquiryId', message: `Enquiry ${enquiryId} not found` },
        ]);
      }

      await this.auditLogRepository.record(
        {
          actor: actor.userId,
          action: 'ENQUIRY_OWNER_REASSIGNED',
          entityType: 'enquiry',
          entityId: String(enquiryId),
          before: { ownerId: previousOwnerId },
          after: { ownerId: newOwnerId },
          locationId: existing.locationId,
          dealerGroupId: existing.dealerGroupId,
        },
        manager,
      );

      return updated;
    });
  }

  /** Duplicated from (rather than extracted out of) LeadsService's private
   * equivalents — both are two-line existence checks and this keeps the
   * #24/#25 LeadsService untouched (lower regression risk) for this
   * fast-tracked Story. Throws the same ReferentialValidationError already
   * mapped to 400 by the globally registered
   * ReferentialValidationExceptionFilter, so no new filter is needed. */
  private async assertSourceExists(sourceId: number): Promise<void> {
    const exists = await this.dataSource
      .getRepository(LeadSourceEntity)
      .exist({ where: { sourceId, active: true } });
    if (!exists) {
      throw new ReferentialValidationError([
        { field: 'sourceId', message: `sourceId ${sourceId} not found in the active lead_sources master` },
      ]);
    }
  }

  private async assertModelExists(modelId: number): Promise<void> {
    const exists = await this.dataSource.getRepository(VehicleModelEntity).exist({ where: { modelId } });
    if (!exists) {
      throw new ReferentialValidationError([
        { field: 'modelId', message: `modelId ${modelId} not found in the vehicle_models master` },
      ]);
    }
  }
}
