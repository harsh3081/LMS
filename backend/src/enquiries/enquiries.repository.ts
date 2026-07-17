import { Injectable } from '@nestjs/common';
import { DataSource, DeepPartial, EntityManager } from 'typeorm';
import { EnquiryEntity } from './entities/enquiry.entity';
import { Principal, ROLE_SM_GM, ROLE_TL } from '../common/principal';

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

  /**
   * NEW (issue #32, AC3-AC6) — role-scoped single-Enquiry visibility check,
   * backing FollowupsService's Follow-up-HISTORY (read) eligibility gate
   * only. `findOwnedById` above is left completely untouched and continues
   * to gate the WRITE path (POST a Follow-up, #30/#31) — this Story's ACs
   * are explicitly about VIEWING history (FR-10), not about widening who
   * may log a Follow-up (that remains a DSE-owner-only action; TL/SM-GM
   * "record a follow-up on a DSE's enquiry" is BRD FR-28, a separate future
   * Story). No team/reports-to table exists anywhere in this codebase (see
   * NOTES.md), so this deliberately uses the existing tenant primitives as
   * a pragmatic, documented proxy:
   *   - DSE (default/fallback): unchanged owner+tenant-scoped lookup
   *     (identical to findOwnedById) — a DSE only ever sees Enquiries they
   *     own.
   *   - TL: LOCATION-scoped (+ own dealerGroupId, defense-in-depth) — "same
   *     location" stands in for "TL's team" until a real team-hierarchy
   *     Feature exists (mirrors #29 duplicate-detection's same-location
   *     peer-visibility precedent).
   *   - SM/GM: DEALER-GROUP-scoped only (no locationId filter) — spans
   *     every location under that dealer group, standing in for "org
   *     hierarchy".
   * See .phoenix-os/project/specs/32/NOTES.md for the full rationale.
   */
  async findVisibleById(enquiryId: string, actor: Principal, manager?: EntityManager): Promise<EnquiryEntity | null> {
    const repository = this.repo(manager);

    if (actor.role === ROLE_SM_GM) {
      return repository.findOne({ where: { enquiryId, dealerGroupId: actor.dealerGroupId } });
    }
    if (actor.role === ROLE_TL) {
      return repository.findOne({
        where: { enquiryId, locationId: actor.locationId, dealerGroupId: actor.dealerGroupId },
      });
    }
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
