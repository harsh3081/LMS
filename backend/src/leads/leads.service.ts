import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { LeadsRepository } from './leads.repository';
import { AuditLogRepository } from '../audit-log/audit-log.repository';
import { CreateLeadDto } from './dto/create-lead.dto';
import { LeadEntity, LEAD_STATUS_NEW } from './entities/lead.entity';
import { LeadSourceEntity } from '../lead-sources/entities/lead-source.entity';
import { VehicleModelEntity } from '../vehicle-models/entities/vehicle-model.entity';
import { ReferentialValidationError } from './leads.errors';
import { Principal } from '../common/principal';

/**
 * Create-Lead use case (tech-design.md Component 2 / ref-code.md Sample 2).
 * Referential validity is checked first (fail fast at the boundary, AC5),
 * then the Lead + audit_log rows are persisted atomically in one
 * transaction (ADR-009) with owner/tenant/status/audit fully server-derived
 * from the `Principal` — never from the client DTO (ADR-003/009).
 * No duplicate/mobile-uniqueness check here (deferred to FR-06).
 */
@Injectable()
export class LeadsService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly leadsRepository: LeadsRepository,
    private readonly auditLogRepository: AuditLogRepository,
  ) {}

  async create(dto: CreateLeadDto, actor: Principal): Promise<LeadEntity> {
    await this.assertSourceExists(dto.sourceId);
    await this.assertModelExists(dto.modelId);

    return this.dataSource.transaction(async (manager) => {
      const saved = await this.leadsRepository.insert(
        {
          customerName: dto.customerName,
          mobile: dto.mobile,
          sourceId: dto.sourceId,
          modelId: dto.modelId,
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

      return saved;
    });
  }

  async findOwnQueue(actor: Principal): Promise<LeadEntity[]> {
    return this.leadsRepository.findOwnQueue(actor);
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
