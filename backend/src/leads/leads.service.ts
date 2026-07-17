import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { LeadsRepository } from './leads.repository';
import { AuditLogRepository } from '../audit-log/audit-log.repository';
import { CreateLeadDto } from './dto/create-lead.dto';
import { LeadEntity, LEAD_STATUS_NEW } from './entities/lead.entity';
import { LeadSourceEntity } from '../lead-sources/entities/lead-source.entity';
import { VehicleModelEntity } from '../vehicle-models/entities/vehicle-model.entity';
import { ReferentialValidationError, LeadReassignTargetNotFoundError } from './leads.errors';
import { Principal } from '../common/principal';
import { FieldConfigService } from '../field-config/field-config.service';
import { DuplicatesService } from '../duplicates/duplicates.service';

/**
 * Create-Lead use case (tech-design.md Component 2 / ref-code.md Sample 2).
 * MODIFIED (issue #27, FR-04): mandatory-field validation (customerName/
 * mobile/sourceId/modelId) is now config-driven — checked FIRST via
 * FieldConfigService.assertMandatoryFieldsPresent (AC3/AC4), before the
 * pre-existing referential-validity checks (fail fast at the boundary, AC5
 * of #24), then the Lead + audit_log rows are persisted atomically in one
 * transaction (ADR-009) with owner/tenant/status/audit fully server-derived
 * from the `Principal` — never from the client DTO (ADR-003/009).
 * MODIFIED (issue #29, FR-06): a mobile-number duplicate is NEVER blocked
 * here — creation always proceeds (AC3: "DSE can choose to proceed... [the
 * client-side warning is] advisory, not blocking" — see NOTES.md "Design
 * decisions"). When dto.mobile matches an existing open Lead/Direct-Enquiry
 * at the same location, an extra audit_log row is written in the SAME
 * transaction, action = DUPLICATE_OVERRIDE_ACKNOWLEDGED (dto.acknowledgeDuplicate
 * true — the DSE saw and dismissed the NewLeadForm warning) or
 * DUPLICATE_OVERRIDE_UNACKNOWLEDGED (flag absent/false — the DSE's client
 * either found no duplicate, or the request bypassed the UI check
 * entirely, e.g. a direct API call).
 */
@Injectable()
export class LeadsService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly leadsRepository: LeadsRepository,
    private readonly auditLogRepository: AuditLogRepository,
    private readonly fieldConfigService: FieldConfigService,
    private readonly duplicatesService: DuplicatesService,
  ) {}

  async create(dto: CreateLeadDto, actor: Principal): Promise<LeadEntity> {
    await this.fieldConfigService.assertMandatoryFieldsPresent({
      customerName: dto.customerName,
      mobile: dto.mobile,
      sourceId: dto.sourceId,
      modelId: dto.modelId,
    });
    if (dto.sourceId !== undefined) await this.assertSourceExists(dto.sourceId);
    if (dto.modelId !== undefined) await this.assertModelExists(dto.modelId);

    const duplicateMatches = dto.mobile
      ? await this.duplicatesService.findMatches(dto.mobile, actor.locationId)
      : [];

    return this.dataSource.transaction(async (manager) => {
      const saved = await this.leadsRepository.insert(
        {
          customerName: dto.customerName ?? null,
          mobile: dto.mobile ?? null,
          sourceId: dto.sourceId ?? null,
          modelId: dto.modelId ?? null,
          // ---- server-derived, never from the client DTO ----
          ownerId: actor.userId,
          createdBy: actor.userId,
          locationId: actor.locationId,
          dealerGroupId: actor.dealerGroupId,
          status: LEAD_STATUS_NEW,
          customFields: {},
        },
        manager,
      );

      await this.auditLogRepository.record(
        {
          actor: actor.userId,
          action: 'LEAD_CREATED',
          entityType: 'lead',
          entityId: String(saved.leadId),
          before: null,
          after: { leadId: saved.leadId, status: saved.status, sourceId: saved.sourceId, modelId: saved.modelId },
          locationId: actor.locationId,
          dealerGroupId: actor.dealerGroupId,
        },
        manager,
      );

      if (duplicateMatches.length > 0) {
        await this.auditLogRepository.record(
          {
            actor: actor.userId,
            action: dto.acknowledgeDuplicate ? 'DUPLICATE_OVERRIDE_ACKNOWLEDGED' : 'DUPLICATE_OVERRIDE_UNACKNOWLEDGED',
            entityType: 'lead',
            entityId: String(saved.leadId),
            before: null,
            after: { mobile: dto.mobile, matchedIds: duplicateMatches.map((m) => m.id) },
            locationId: actor.locationId,
            dealerGroupId: actor.dealerGroupId,
          },
          manager,
        );
      }

      return saved;
    });
  }

  async findOwnQueue(actor: Principal): Promise<LeadEntity[]> {
    return this.leadsRepository.findOwnQueue(actor);
  }

  /**
   * Reassign-Lead-Owner use case (issue #28, AC4: "Owner field updates are
   * tracked with a timestamp when ownership is reassigned"). No controller
   * calls this yet — Feature #7 (this Story's parent) covers Lead/Enquiry
   * CREATION, not TL/SM-GM ownership reassignment (a separate, later
   * Epic/Feature). This method + LeadsRepository.reassignOwner prove the
   * ownership-audit mechanism itself: the Lead's ownerId + ownerUpdatedAt
   * are updated and an audit_log row (action=LEAD_OWNER_REASSIGNED) is
   * written atomically in one transaction (ADR-009), mirroring the
   * transactional pattern used by `create`/`EnquiriesService.convert`.
   */
  async reassignOwner(leadId: string, newOwnerId: string, actor: Principal): Promise<LeadEntity> {
    return this.dataSource.transaction(async (manager) => {
      const existing = await manager.getRepository(LeadEntity).findOne({ where: { leadId } });
      if (!existing) {
        throw new LeadReassignTargetNotFoundError([{ field: 'leadId', message: `Lead ${leadId} not found` }]);
      }
      const previousOwnerId = existing.ownerId;

      const updated = await this.leadsRepository.reassignOwner(leadId, newOwnerId, manager);
      /* istanbul ignore next -- existing was just found in this same
       * transaction; reassignOwner can only return null on a not-found race
       * that cannot occur within a single transaction against pg-mem/Postgres. */
      if (!updated) {
        throw new LeadReassignTargetNotFoundError([{ field: 'leadId', message: `Lead ${leadId} not found` }]);
      }

      await this.auditLogRepository.record(
        {
          actor: actor.userId,
          action: 'LEAD_OWNER_REASSIGNED',
          entityType: 'lead',
          entityId: String(leadId),
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
