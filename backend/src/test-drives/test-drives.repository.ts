import { Injectable } from '@nestjs/common';
import { DataSource, DeepPartial, EntityManager, LessThan, MoreThan, MoreThanOrEqual } from 'typeorm';
import { TestDriveEntity } from './entities/test-drive.entity';
import { Principal } from '../common/principal';

/**
 * Mirrors FollowupsRepository's `repo(manager)` transactional pattern —
 * accepts an optional transactional EntityManager so TestDrivesService can
 * persist the Test Drive and the audit_log row atomically in one
 * `dataSource.transaction` (ADR-009).
 */
@Injectable()
export class TestDrivesRepository {
  constructor(private readonly dataSource: DataSource) {}

  private repo(manager?: EntityManager) {
    return (manager ?? this.dataSource.manager).getRepository(TestDriveEntity);
  }

  async insert(data: DeepPartial<TestDriveEntity>, manager?: EntityManager): Promise<TestDriveEntity> {
    const repository = this.repo(manager);
    const entity = repository.create(data);
    return repository.save(entity);
  }

  /** AC5: "DSE can view a list of their own upcoming bookings" — tenant +
   * `bookedBy`-scoped (the DSE who made the booking, mirrors
   * FollowupsRepository.findUpcomingForActor's `loggedBy` scoping exactly),
   * `slotStart >= now`, ascending (soonest first). */
  async findUpcomingForActor(actor: Principal, manager?: EntityManager): Promise<TestDriveEntity[]> {
    const repository = this.repo(manager);
    return repository.find({
      where: {
        bookedBy: actor.userId,
        locationId: actor.locationId,
        dealerGroupId: actor.dealerGroupId,
        slotStart: MoreThanOrEqual(new Date()),
      },
      order: { slotStart: 'ASC' },
    });
  }

  /** issue #35 AC1/AC2/AC5 — the scheduler grid's data source: every BOOKED
   * slot for one vehicle whose [slotStart,slotEnd) window overlaps the
   * requested [from,to) range, tenant-scoped (`locationId`/`dealerGroupId`,
   * mirrors FollowupsRepository.findByEnquiry's tenant-not-owner scoping)
   * but deliberately NOT owner/`bookedBy`-scoped — any DSE at the same
   * location sees every booking against a vehicle they can also see via
   * GET /api/v1/demo-vehicles (demo vehicles are a shared dealership
   * resource, not per-DSE). No SM/GM cross-location widening (unlike
   * FollowupsRepository.findByEnquiry's SM/GM branch) — GET /demo-vehicles
   * itself has no role-based branching either, so this mirrors that
   * simpler, single-location-scoped precedent. Ascending by slotStart. */
  async findBookedInRange(
    vehicleId: string,
    from: Date,
    to: Date,
    actor: Principal,
    manager?: EntityManager,
  ): Promise<TestDriveEntity[]> {
    const repository = this.repo(manager);
    return repository.find({
      where: {
        vehicleId,
        locationId: actor.locationId,
        dealerGroupId: actor.dealerGroupId,
        slotStart: LessThan(to),
        slotEnd: MoreThan(from),
      },
      order: { slotStart: 'ASC' },
    });
  }
}
