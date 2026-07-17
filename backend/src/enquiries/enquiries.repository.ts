import { Injectable } from '@nestjs/common';
import { DataSource, DeepPartial, EntityManager } from 'typeorm';
import { EnquiryEntity } from './entities/enquiry.entity';
import { Principal } from '../common/principal';

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

  /** NEW (issue #26) — owner/tenant-scoped Enquiry list (Direct + Converted
   * alike), newest first. Mirrors LeadsRepository.findOwnQueue's tenant-scope
   * choke-point convention (ADR-003). */
  async findOwnQueue(actor: Principal, manager?: EntityManager): Promise<EnquiryEntity[]> {
    const repository = this.repo(manager);
    return repository.find({
      where: { ownerId: actor.userId, locationId: actor.locationId, dealerGroupId: actor.dealerGroupId },
      order: { convertedAt: 'DESC' },
    });
  }

  /** NEW (issue #30) — owner/tenant-scoped single-Enquiry lookup, mirrors
   * LeadsRepository.findOwnedById exactly. Backs FollowupsService's
   * eligibility check: a DSE may only log/view a Follow-up against an
   * Enquiry they own within their own tenant (indistinguishable from
   * non-existent otherwise — no cross-tenant/cross-owner leakage). */
  async findOwnedById(enquiryId: string, actor: Principal, manager?: EntityManager): Promise<EnquiryEntity | null> {
    const repository = this.repo(manager);
    return repository.findOne({
      where: {
        enquiryId,
        ownerId: actor.userId,
        locationId: actor.locationId,
        dealerGroupId: actor.dealerGroupId,
      },
    });
  }

  /** NEW (issue #28, AC4) — reassigns an Enquiry's owner and stamps
   * `ownerUpdatedAt`. Mirrors LeadsRepository.reassignOwner exactly
   * (not owner/tenant-scoped here; a future reassignment endpoint owns
   * that authorization check). Returns null if no Enquiry with that id
   * exists. */
  async reassignOwner(
    enquiryId: string,
    newOwnerId: string,
    manager?: EntityManager,
  ): Promise<EnquiryEntity | null> {
    const repository = this.repo(manager);
    const enquiry = await repository.findOne({ where: { enquiryId } });
    if (!enquiry) return null;
    enquiry.ownerId = newOwnerId;
    enquiry.ownerUpdatedAt = new Date();
    return repository.save(enquiry);
  }

  /** NEW (issue #31, AC2) — the minimal status-write this Story needs: sets
   * `status` to one of the two terminal values (LogFollowupDto.enquiryStatus,
   * already validated to Lost/Booked before this is called). Deliberately
   * NOT a general status-update method (no transition rules, no reason
   * capture) — issue #33 ("Update Enquiry Status as Part of a Follow-up")
   * owns the fuller version; this exists only to satisfy AC2's exception.
   * Called from within FollowupsService's transaction alongside the
   * Follow-up insert (ADR-009). Returns null if no Enquiry with that id
   * exists (mirrors reassignOwner's contract). */
  async updateStatus(enquiryId: string, status: string, manager?: EntityManager): Promise<EnquiryEntity | null> {
    const repository = this.repo(manager);
    const enquiry = await repository.findOne({ where: { enquiryId } });
    if (!enquiry) return null;
    enquiry.status = status;
    return repository.save(enquiry);
  }
}
