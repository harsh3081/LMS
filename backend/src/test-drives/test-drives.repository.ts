import { Injectable } from '@nestjs/common';
import { DataSource, DeepPartial, EntityManager, MoreThanOrEqual } from 'typeorm';
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
}
