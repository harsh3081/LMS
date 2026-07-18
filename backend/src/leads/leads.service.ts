import { Injectable } from '@nestjs/common';
import { DataSource, In } from 'typeorm';
import { LeadsRepository } from './leads.repository';
import { AuditLogRepository } from '../audit-log/audit-log.repository';
import { CreateLeadDto } from './dto/create-lead.dto';
import { LeadEntity, LEAD_STATUS_NEW } from './entities/lead.entity';
import { LeadSourceEntity } from '../lead-sources/entities/lead-source.entity';
import { VehicleModelEntity } from '../vehicle-models/entities/vehicle-model.entity';
import { UserEntity } from '../users/entities/user.entity';
import { ReferentialValidationError, LeadReassignTargetNotFoundError } from './leads.errors';
import { LeadNotFoundError } from '../enquiries/enquiries.errors';
import { Principal, ROLE_DSE } from '../common/principal';
import { FieldConfigService } from '../field-config/field-config.service';
import { DuplicatesService } from '../duplicates/duplicates.service';

/** NEW (issue #116): a Lead plus its denormalized, human-readable names —
 * see LeadsService.attachNames. */
export type EnrichedLead = LeadEntity & {
  sourceName: string | null;
  modelName: string | null;
  ownerName: string | null;
};

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

    // NEW (issue #114, AC5): "Assign to Consultant" — resolves to
    // actor.userId (today's exact self-assignment default, issue #28)
    // unless dto.assignedOwnerId names a different, valid DSE at the
    // caller's own location/dealer group.
    const ownerId = await this.resolveOwnerId(dto.assignedOwnerId, actor);

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

          // ---- issue #114: new fields (all pass through as supplied, all optional) ----
          email: dto.email ?? null,
          customerType: dto.customerType ?? null,
          city: dto.city ?? null,
          pinCode: dto.pinCode ?? null,
          preferredLanguage: dto.preferredLanguage ?? null,
          variant: dto.variant ?? null,
          fuelType: dto.fuelType ?? null,
          transmission: dto.transmission ?? null,
          budgetMin: dto.budgetMin ?? null,
          budgetMax: dto.budgetMax ?? null,
          buyingTimeline: dto.buyingTimeline ?? null,
          exchangeInterest: dto.exchangeInterest ?? null,
          currentVehicle: dto.currentVehicle ?? null,
          kmsDriven: dto.kmsDriven ?? null,
          registrationNumber: dto.registrationNumber ?? null,
          expectedValue: dto.expectedValue ?? null,
          paymentMode: dto.paymentMode ?? null,
          preferredFinancer: dto.preferredFinancer ?? null,
          downPaymentCapacity: dto.downPaymentCapacity ?? null,
          referrerName: dto.referrerName ?? null,
          firstFollowUpAt: dto.firstFollowUpAt ? new Date(dto.firstFollowUpAt) : null,
          remarks: dto.remarks ?? null,
          communicationConsentVerified: dto.communicationConsentVerified,

          // ---- server-derived, never from the client DTO ----
          ownerId,
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

  /** MODIFIED (issue #116, AC1): now returns names denormalized alongside
   * the raw ids — a LIST view read by a human benefits from human-readable
   * Source/Model/Assigned-To, unlike the flat CREATE response (see
   * LeadResponseDto's comment for why this Story adds them here without
   * disturbing #34/#114's minimal-create precedent). */
  async findOwnQueue(actor: Principal): Promise<EnrichedLead[]> {
    const leads = await this.leadsRepository.findOwnQueue(actor);
    return this.attachNames(leads);
  }

  /**
   * NEW (issue #116, AC2): single-Lead detail read, backing the new Lead
   * Detail page. Owner-scoped via LeadsRepository.findOwnedById — mirrors
   * EnquiriesRepository.findOwnedById / FollowupsService.
   * assertEnquiryOwnedByActor's exact eligibility pattern: the caller must
   * own the Lead (same ownerId + locationId + dealerGroupId), otherwise a
   * 404 (LeadNotFoundError, reused from enquiries.errors.ts — its
   * "not found, or out of scope, indistinguishable from non-existent"
   * semantics and its already-globally-registered 404 filter
   * (EnquiryEligibilityExceptionFilter) are exactly what this needs, so a
   * second near-duplicate error class + filter would be pure repetition).
   */
  async findOwnedById(leadId: string, actor: Principal): Promise<EnrichedLead> {
    const lead = await this.leadsRepository.findOwnedById(leadId, actor);
    if (!lead) {
      throw new LeadNotFoundError([{ field: 'leadId', message: `Lead ${leadId} not found` }]);
    }
    const [enriched] = await this.attachNames([lead]);
    return enriched;
  }

  /**
   * NEW (issue #116): denormalizes sourceId/modelId/ownerId into
   * human-readable names for read surfaces (list + detail) — a LIST/DETAIL
   * view read by a human benefits from this, unlike the flat CREATE
   * response which #34/#114 deliberately kept minimal since the client
   * already has what it just submitted. Batched into at most 3 queries
   * TOTAL regardless of how many leads are passed in (one `IN (...)` query
   * per master table), not one query per row — avoids N+1.
   */
  private async attachNames(leads: LeadEntity[]): Promise<EnrichedLead[]> {
    if (leads.length === 0) return [];

    const sourceIds = [...new Set(leads.map((l) => l.sourceId).filter((id): id is number => id !== null))];
    const modelIds = [...new Set(leads.map((l) => l.modelId).filter((id): id is number => id !== null))];
    const ownerIds = [...new Set(leads.map((l) => l.ownerId))];

    const [sources, models, owners] = await Promise.all([
      sourceIds.length
        ? this.dataSource.getRepository(LeadSourceEntity).find({ where: { sourceId: In(sourceIds) } })
        : Promise.resolve([]),
      modelIds.length
        ? this.dataSource.getRepository(VehicleModelEntity).find({ where: { modelId: In(modelIds) } })
        : Promise.resolve([]),
      ownerIds.length
        ? this.dataSource.getRepository(UserEntity).find({ where: { userId: In(ownerIds) } })
        : Promise.resolve([]),
    ]);

    const sourceMap = new Map(sources.map((s) => [s.sourceId, s.name]));
    const modelMap = new Map(models.map((m) => [m.modelId, m.name]));
    const ownerMap = new Map(owners.map((o) => [o.userId, o.displayName]));

    return leads.map((lead) => ({
      ...lead,
      sourceName: lead.sourceId !== null ? (sourceMap.get(lead.sourceId) ?? null) : null,
      modelName: lead.modelId !== null ? (modelMap.get(lead.modelId) ?? null) : null,
      ownerName: ownerMap.get(lead.ownerId) ?? null,
    }));
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

  /**
   * NEW (issue #114, AC5): "Assign to Consultant". Returns `actor.userId`
   * unchanged (today's exact self-assignment default, issue #28) when
   * `assignedOwnerId` is omitted. When supplied, the target user MUST exist,
   * carry role `ROLE_DSE`, and share the caller's own `locationId` AND
   * `dealerGroupId` — otherwise a 400 (ReferentialValidationError, reused
   * exactly as assertSourceExists/assertModelExists do below — this is
   * itself a referential-validity check on a client-supplied id) is thrown
   * rather than silently falling back to self-assignment. `createdBy` is
   * NEVER affected by this — it always remains `actor.userId` (see `create`).
   */
  private async resolveOwnerId(assignedOwnerId: string | undefined, actor: Principal): Promise<string> {
    if (assignedOwnerId === undefined) return actor.userId;

    const target = await this.dataSource.getRepository(UserEntity).findOne({ where: { userId: assignedOwnerId } });
    if (!target) {
      throw new ReferentialValidationError([
        { field: 'assignedOwnerId', message: `assignedOwnerId ${assignedOwnerId} not found` },
      ]);
    }
    if (target.role !== ROLE_DSE) {
      throw new ReferentialValidationError([
        { field: 'assignedOwnerId', message: `assignedOwnerId ${assignedOwnerId} is not a DSE` },
      ]);
    }
    if (target.locationId !== actor.locationId || target.dealerGroupId !== actor.dealerGroupId) {
      throw new ReferentialValidationError([
        {
          field: 'assignedOwnerId',
          message: `assignedOwnerId ${assignedOwnerId} is not at the caller's own location/dealer group`,
        },
      ]);
    }
    return target.userId;
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
