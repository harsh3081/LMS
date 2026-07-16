import { Injectable } from '@nestjs/common';
import { DataSource, DeepPartial, EntityManager } from 'typeorm';
import { LeadEntity } from './entities/lead.entity';
import { Principal } from '../common/principal';

/**
 * Single tenant-scope choke-point for all Lead reads/writes (ADR-003;
 * ref-code.md Sample 3). Every read routes through `findOwnQueue`, which
 * derives owner + location + dealer-group scope from the authenticated
 * `Principal` only — never from a client-supplied query param — so a DSE
 * can never see another owner's or another location's leads (EVAL-CC-04/05).
 */
@Injectable()
export class LeadsRepository {
  constructor(private readonly dataSource: DataSource) {}

  /** Accepts an optional transactional EntityManager so callers (LeadsService)
   * can persist the Lead and its audit_log row atomically (ADR-009). */
  private repo(manager?: EntityManager) {
    return (manager ?? this.dataSource.manager).getRepository(LeadEntity);
  }

  async insert(data: DeepPartial<LeadEntity>, manager?: EntityManager): Promise<LeadEntity> {
    const repository = this.repo(manager);
    const entity = repository.create(data);
    return repository.save(entity);
  }

  async findOwnQueue(actor: Principal, manager?: EntityManager): Promise<LeadEntity[]> {
    const repository = this.repo(manager);
    return repository.find({
      where: {
        ownerId: actor.userId,
        locationId: actor.locationId,
        dealerGroupId: actor.dealerGroupId,
      },
      order: { createdAt: 'DESC' },
    });
  }
}
