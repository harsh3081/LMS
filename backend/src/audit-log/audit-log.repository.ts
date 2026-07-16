import { Injectable } from '@nestjs/common';
import { DataSource, DeepPartial, EntityManager } from 'typeorm';
import { AuditLogEntity } from './entities/audit-log.entity';

/**
 * Minimal append-only audit_log writer (ADR-009). Always called within the
 * same transaction as the Lead insert (ref-code.md Sample 2 / EVAL-CC-11).
 */
@Injectable()
export class AuditLogRepository {
  constructor(private readonly dataSource: DataSource) {}

  async record(entry: DeepPartial<AuditLogEntity>, manager?: EntityManager): Promise<AuditLogEntity> {
    const repository = (manager ?? this.dataSource.manager).getRepository(AuditLogEntity);
    return repository.save(repository.create(entry));
  }
}
