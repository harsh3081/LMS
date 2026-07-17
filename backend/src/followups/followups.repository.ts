import { Injectable } from '@nestjs/common';
import { DataSource, DeepPartial, EntityManager, IsNull, Not } from 'typeorm';
import { FollowupEntity } from './entities/followup.entity';
import { Principal } from '../common/principal';

/**
 * Mirrors EnquiriesRepository's `repo(manager)` transactional pattern —
 * accepts an optional transactional EntityManager so FollowupsService can
 * persist the Follow-up and the audit_log row atomically in one
 * `dataSource.transaction` (ADR-009).
 */
@Injectable()
export class FollowupsRepository {
  constructor(private readonly dataSource: DataSource) {}

  private repo(manager?: EntityManager) {
    return (manager ?? this.dataSource.manager).getRepository(FollowupEntity);
  }

  async insert(data: DeepPartial<FollowupEntity>, manager?: EntityManager): Promise<FollowupEntity> {
    const repository = this.repo(manager);
    const entity = repository.create(data);
    return repository.save(entity);
  }

  /** Tenant-scoped Follow-up history for one Enquiry, newest first (AC5).
   * Scoped by `locationId`/`dealerGroupId` (not `loggedBy`) so any DSE in the
   * same tenant who is otherwise authorized to view the Enquiry's Follow-ups
   * sees the full history, not just their own entries — the eligibility
   * check (does this Enquiry belong to the caller at all) happens one layer
   * up in FollowupsService, mirroring EnquiriesRepository/LeadsRepository's
   * split between the tenant-scope choke-point (here) and the owner
   * eligibility check (service layer). */
  async findByEnquiry(enquiryId: string, actor: Principal, manager?: EntityManager): Promise<FollowupEntity[]> {
    const repository = this.repo(manager);
    return repository.find({
      where: { enquiryId, locationId: actor.locationId, dealerGroupId: actor.dealerGroupId },
      order: { loggedAt: 'DESC' },
    });
  }

  /** NEW (issue #31, AC4) — "reminder/task is visible to the DSE ahead of
   * the due date": every Follow-up the actor themselves logged
   * (`loggedBy`, not `enquiries.owner_id` — the DSE who scheduled the next
   * action is the one who should see the reminder) that carries a
   * `nextFollowUpAt`, tenant-scoped, most-overdue-first (ascending —
   * earliest due date first covers both overdue and future reminders in
   * one simple sort, per the parent issue's guidance). */
  async findUpcomingForActor(actor: Principal, manager?: EntityManager): Promise<FollowupEntity[]> {
    const repository = this.repo(manager);
    return repository.find({
      where: {
        loggedBy: actor.userId,
        locationId: actor.locationId,
        dealerGroupId: actor.dealerGroupId,
        nextFollowUpAt: Not(IsNull()),
      },
      order: { nextFollowUpAt: 'ASC' },
    });
  }
}
