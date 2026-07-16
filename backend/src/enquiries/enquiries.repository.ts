import { Injectable } from '@nestjs/common';
import { DataSource, DeepPartial, EntityManager } from 'typeorm';
import { EnquiryEntity } from './entities/enquiry.entity';

/**
 * Mirrors LeadsRepository's `repo(manager)` transactional pattern (ref-code.md
 * Sample 1) — accepts an optional transactional EntityManager so
 * EnquiriesService can persist the Enquiry, the Lead status flip, and the
 * audit_log row atomically in one `dataSource.transaction` (ADR-009).
 */
@Injectable()
export class EnquiriesRepository {
  constructor(private readonly dataSource: DataSource) {}

  private repo(manager?: EntityManager) {
    return (manager ?? this.dataSource.manager).getRepository(EnquiryEntity);
  }

  async insert(data: DeepPartial<EnquiryEntity>, manager?: EntityManager): Promise<EnquiryEntity> {
    const repository = this.repo(manager);
    const entity = repository.create(data);
    return repository.save(entity);
  }
}
