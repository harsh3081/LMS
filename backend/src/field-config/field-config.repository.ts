import { Injectable } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { FieldConfigEntity } from './entities/field-config.entity';

/**
 * Plain DataSource-backed repository (mirrors LeadsRepository/
 * AuditLogRepository's `repo(manager)` convention) — accepts an optional
 * transactional EntityManager so FieldConfigService can update a row and
 * write its audit_log entry atomically (ADR-009 precedent).
 */
@Injectable()
export class FieldConfigRepository {
  constructor(private readonly dataSource: DataSource) {}

  private repo(manager?: EntityManager) {
    return (manager ?? this.dataSource.manager).getRepository(FieldConfigEntity);
  }

  async findAll(manager?: EntityManager): Promise<FieldConfigEntity[]> {
    return this.repo(manager).find({ order: { fieldName: 'ASC' } });
  }

  async findByName(fieldName: string, manager?: EntityManager): Promise<FieldConfigEntity | null> {
    return this.repo(manager).findOne({ where: { fieldName } });
  }

  async upsert(
    fieldName: string,
    mandatory: boolean,
    updatedBy: string,
    manager?: EntityManager,
  ): Promise<FieldConfigEntity> {
    const repository = this.repo(manager);
    const existing = await repository.findOne({ where: { fieldName } });
    const entity = repository.create({ ...existing, fieldName, mandatory, updatedBy });
    return repository.save(entity);
  }
}
