import { Injectable } from '@nestjs/common';
import { DataSource, EntityManager, QueryFailedError } from 'typeorm';
import { TestDrivesRepository } from './test-drives.repository';
import { EnquiriesRepository } from '../enquiries/enquiries.repository';
import { AuditLogRepository } from '../audit-log/audit-log.repository';
import { DemoVehicleEntity } from '../demo-vehicles/entities/demo-vehicle.entity';
import { CreateTestDriveDto } from './dto/create-test-drive.dto';
import { SchedulerQueryDto } from './dto/scheduler-query.dto';
import { TestDriveEntity, TEST_DRIVE_STATUS_BOOKED } from './entities/test-drive.entity';
import {
  TestDriveEnquiryNotFoundError,
  OperatingHoursViolationError,
  TestDriveSlotConflictError,
  FieldError,
} from './test-drives.errors';
import { computeNearestOpenSlots } from './nearest-open-slots';
import { ReferentialValidationError } from '../leads/leads.errors';
import { EnquiryEntity } from '../enquiries/entities/enquiry.entity';
import { Principal } from '../common/principal';

/** Postgres SQLSTATE for `unique_violation` — set identically by TypeORM's
 * `QueryFailedError.code` against both real Postgres and pg-mem (the driver
 * surfaces the actual Postgres error code, not a driver-specific one;
 * confirmed via a throwaway sandbox test — see NOTES.md). Used by
 * TestDrivesService.book to detect the migration-1700000000015 partial
 * UNIQUE index's backstop rejection and translate it into the same
 * TestDriveSlotConflictError the app-level pre-check throws. */
const POSTGRES_UNIQUE_VIOLATION = '23505';

/** AC2 simplification: no configurable dealership-operating-hours
 * feature/config exists anywhere in this codebase (verified), so a simple
 * hardcoded 09:00-19:00 window is used, documented here as a deliberate
 * placeholder pending a real dealership-hours config feature (see NOTES.md
 * "Operating-hours simplification"). Hour-of-day boundaries only — no
 * day-of-week/holiday concept.
 *
 * Evaluated in UTC (`getUTCHours`), not the host machine's local timezone:
 * "server local time" is ambiguous/non-deterministic across dev machines and
 * CI runners (this sandbox and a CI box are not guaranteed to share a TZ),
 * so UTC is used as the one fixed, deterministic stand-in for "the
 * dealership's local time" — every ISO 8601 datetime sent by the client
 * (slotStart/slotEnd, always `Z`-suffixed/offset-qualified per
 * `@IsISO8601`) is compared against this same fixed reference. A real
 * dealership-hours config feature would instead resolve hours against the
 * dealership's own configured timezone. */
export const OPERATING_HOURS_START_HOUR = 9;
export const OPERATING_HOURS_END_HOUR = 19;

function minutesOfDay(date: Date): number {
  return date.getUTCHours() * 60 + date.getUTCMinutes();
}

function isWithinOperatingHours(date: Date): boolean {
  const minutes = minutesOfDay(date);
  return minutes >= OPERATING_HOURS_START_HOUR * 60 && minutes <= OPERATING_HOURS_END_HOUR * 60;
}

/**
 * Book-a-Test-Drive use case (issue #34, "Book a Test Drive Slot" — first
 * Story under Epic #2, Test Drive Management). Mirrors
 * FollowupsService.logFollowup's structure exactly: eligibility (does the
 * target Enquiry exist, within the caller's own owner/tenant scope, AC1) and
 * business-rule validation (AC2 operating hours) are checked BEFORE opening
 * the transaction (fail fast), then the Test Drive insert + audit_log write
 * are persisted atomically in one transaction (ADR-009) with
 * `status`/`bookedBy`/`locationId`/`dealerGroupId` fully server-derived from
 * the `Principal` — never from the client DTO (ADR-003/009).
 *
 * MODIFIED (issue #36, "Prevent Double-Booking of Demo Vehicles" —
 * AC1/AC3/AC4/AC5): `book()` now rejects a request whose [slotStart,
 * slotEnd) range overlaps an existing BOOKED Test Drive for the same
 * vehicle. Two layers, both documented in detail on `assertNoConflict` and
 * the catch block inside the transaction below (see NOTES.md "Concurrency
 * mechanism" for the full investigation this design rests on):
 *   1. An APP-LEVEL pre-check (`assertNoConflict`), run INSIDE the same
 *      transaction as the insert (ADR-002), covers general range overlap
 *      (AC4) — the PRIMARY correctness mechanism.
 *   2. A DB-level partial UNIQUE index (migration 1700000000015) is the
 *      defense-in-depth BACKSTOP: if two requests still race past the
 *      app-level check (a real risk this Story's own investigation proved
 *      `SELECT ... FOR UPDATE` cannot reliably prevent in this sandbox), the
 *      second INSERT itself fails with a Postgres unique_violation, caught
 *      below and translated into the same 409.
 */
@Injectable()
export class TestDrivesService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly testDrivesRepository: TestDrivesRepository,
    private readonly enquiriesRepository: EnquiriesRepository,
    private readonly auditLogRepository: AuditLogRepository,
  ) {}

  async book(dto: CreateTestDriveDto, actor: Principal): Promise<TestDriveEntity> {
    this.assertWithinOperatingHours(dto);
    await this.assertEnquiryOwnedByActor(dto.enquiryId, actor);
    await this.assertVehicleExists(dto.vehicleId);

    return this.dataSource.transaction(async (manager) => {
      // issue #36 AC1/AC4: app-level overlap pre-check, run INSIDE this same
      // transaction (ADR-002) so the check and the insert observe a
      // consistent snapshot as far as this sandbox's pg-mem substitute is
      // able to guarantee — see assertNoConflict's own comment for why this
      // is the PRIMARY mechanism, not row-locking.
      await this.assertNoConflict(dto, actor, manager);

      let testDrive: TestDriveEntity;
      try {
        testDrive = await this.testDrivesRepository.insert(
          {
            enquiryId: dto.enquiryId,
            vehicleId: dto.vehicleId,
            slotStart: new Date(dto.slotStart),
            slotEnd: new Date(dto.slotEnd),
            // ---- server-derived, never from the client DTO ----
            status: TEST_DRIVE_STATUS_BOOKED,
            bookedBy: actor.userId,
            locationId: actor.locationId,
            dealerGroupId: actor.dealerGroupId,
          },
          manager,
        );
      } catch (err) {
        // issue #36 AC3: DB-level backstop. If the app-level pre-check above
        // missed a race (two requests both passed it before either
        // committed), the partial UNIQUE index added by migration
        // 1700000000015 rejects the second INSERT with a Postgres
        // unique_violation — caught here and translated into the same 409
        // shape the pre-check throws, rather than leaking a raw 500.
        if (err instanceof QueryFailedError && (err as unknown as { code?: string }).code === POSTGRES_UNIQUE_VIOLATION) {
          throw await this.buildConflictError(dto, actor, manager);
        }
        throw err;
      }

      await this.auditLogRepository.record(
        {
          actor: actor.userId,
          action: 'TEST_DRIVE_BOOKED',
          entityType: 'test_drive',
          entityId: String(testDrive.testDriveId),
          before: null,
          after: {
            testDriveId: testDrive.testDriveId,
            enquiryId: dto.enquiryId,
            vehicleId: dto.vehicleId,
            slotStart: testDrive.slotStart,
            slotEnd: testDrive.slotEnd,
          },
          locationId: actor.locationId,
          dealerGroupId: actor.dealerGroupId,
        },
        manager,
      );

      return testDrive;
    });
  }

  /** AC5: "DSE can view a list of their own upcoming bookings." */
  async findUpcoming(actor: Principal): Promise<TestDriveEntity[]> {
    return this.testDrivesRepository.findUpcomingForActor(actor);
  }

  /** issue #35 AC1/AC2/AC5 — the scheduler grid's data source: every BOOKED
   * slot for the requested vehicle+date-range, tenant-scoped but NOT
   * owner-scoped (see TestDrivesRepository.findBookedInRange's comment).
   * Deliberately does no existence check on `vehicleId` and no cross-field
   * `to > from` validation — mirrors DuplicatesService's "no match -> empty
   * array" convention (GET /api/v1/duplicates) rather than 404/400: this is
   * a read-only, nothing-is-written endpoint, so an unknown/inactive/
   * other-tenant vehicleId or a malformed range simply yields an empty
   * booked-slots list, which the frontend already renders as "every slot
   * open" — never a dangerous false negative. */
  async getScheduler(query: SchedulerQueryDto, actor: Principal): Promise<TestDriveEntity[]> {
    return this.testDrivesRepository.findBookedInRange(query.vehicleId, new Date(query.from), new Date(query.to), actor);
  }

  /** AC2: "System validates the selected slot is within dealership
   * operating hours." Also rejects a slotEnd not after slotStart — a
   * necessary sanity check the DTO's per-field ISO-format validation cannot
   * express (cross-field rule, mirrors
   * FollowupsService.assertNextFollowUpOrTerminalStatus's convention of
   * doing cross-field checks at the service layer). */
  private assertWithinOperatingHours(dto: CreateTestDriveDto): void {
    const start = new Date(dto.slotStart);
    const end = new Date(dto.slotEnd);
    const errors: FieldError[] = [];

    if (!(end.getTime() > start.getTime())) {
      errors.push({ field: 'slotEnd', message: 'slotEnd must be after slotStart' });
    }
    if (!isWithinOperatingHours(start)) {
      errors.push({
        field: 'slotStart',
        message: `slotStart must be within dealership operating hours (${OPERATING_HOURS_START_HOUR}:00-${OPERATING_HOURS_END_HOUR}:00)`,
      });
    }
    if (!isWithinOperatingHours(end)) {
      errors.push({
        field: 'slotEnd',
        message: `slotEnd must be within dealership operating hours (${OPERATING_HOURS_START_HOUR}:00-${OPERATING_HOURS_END_HOUR}:00)`,
      });
    }

    if (errors.length > 0) {
      throw new OperatingHoursViolationError(errors);
    }
  }

  /** AC1: "select a customer... from a booking form" = select one of the
   * DSE's own open Enquiries. Mirrors
   * FollowupsService.assertEnquiryOwnedByActor exactly — a DSE may only
   * book a Test Drive against an Enquiry they own within their own tenant
   * (indistinguishable from non-existent otherwise — no cross-tenant/
   * cross-owner leakage). Deliberately does NOT build #32's role-scoping —
   * that pattern exists only for Follow-up viewing, not for this Story. */
  private async assertEnquiryOwnedByActor(enquiryId: string, actor: Principal): Promise<EnquiryEntity> {
    const enquiry = await this.enquiriesRepository.findOwnedById(enquiryId, actor);
    if (!enquiry) {
      throw new TestDriveEnquiryNotFoundError([{ field: 'enquiryId', message: `Enquiry ${enquiryId} not found` }]);
    }
    return enquiry;
  }

  /** Referential validity of vehicleId (mirrors
   * LeadsService.assertSourceExists/assertModelExists exactly) — reuses the
   * existing ReferentialValidationError/ReferentialValidationExceptionFilter
   * (already globally registered) rather than a new error+filter pair.
   * Deliberately NOT location-scoped to the actor (no requirement in this
   * Story that the selected vehicle's location matches the caller's own
   * location) — see NOTES.md "Known gaps". */
  private async assertVehicleExists(vehicleId: string): Promise<void> {
    const exists = await this.dataSource
      .getRepository(DemoVehicleEntity)
      .exist({ where: { vehicleId, isActive: true } });
    if (!exists) {
      throw new ReferentialValidationError([
        { field: 'vehicleId', message: `vehicleId ${vehicleId} not found in the active demo_vehicles fleet` },
      ]);
    }
  }

  /**
   * issue #36 AC1/AC4/AC5: the PRIMARY conflict-detection mechanism —
   * rejects a booking whose [slotStart, slotEnd) range overlaps an existing
   * BOOKED Test Drive for the same vehicle, tenant-scoped. REUSES
   * TestDrivesRepository.findBookedInRange (the exact overlap-range query
   * issue #35 already built for the scheduler grid, per this Story's own
   * brief: "REUSE this pattern (or the method itself)") — passed the SAME
   * transactional `manager` this call is running inside, so the
   * conflict-check and the insert that follows observe one consistent
   * transaction (ADR-002). `findBookedInRange` already filters
   * `status = TEST_DRIVE_STATUS_BOOKED`, which is exactly what makes AC5
   * ("cancelled/rescheduled bookings free up the slot immediately") true —
   * a row whose status has been changed away from 'Booked' (by a future #39
   * outcome-logging action) is automatically excluded here with zero
   * conflict-check-specific code.
   *
   * WHY THIS IS THE PRIMARY MECHANISM, NOT `SELECT ... FOR UPDATE` ROW
   * LOCKING (ADR-002 mentions both as options): a throwaway sandbox
   * investigation proved pg-mem (this backend test harness's in-memory
   * Postgres-wire-compatible substitute, see test/support/test-data-source.ts)
   * ACCEPTS `SELECT ... FOR UPDATE` syntactically but provides NO real
   * row-level blocking — two "concurrent" transactions racing a
   * check-then-insert both read 0 conflicting rows before either committed,
   * and BOTH inserted, i.e. FOR UPDATE gave zero actual protection in this
   * sandbox. A bare UNIQUE constraint, by contrast, correctly rejected the
   * second of two identically-raced inserts in the same throwaway harness.
   * This is why the design instead pairs this app-level pre-check with a
   * DB-level UNIQUE-index backstop (see the `catch` block in `book()` above
   * and migration 1700000000015) — mirroring this codebase's own established
   * precedent for an equivalent problem (EnquiriesService.convert's
   * app-level 409 pre-check + `UNIQUE(lead_id)` DB backstop, migration
   * 1700000000003). See NOTES.md for the full investigation writeup.
   */
  private async assertNoConflict(dto: CreateTestDriveDto, actor: Principal, manager: EntityManager): Promise<void> {
    const conflicts = await this.testDrivesRepository.findBookedInRange(
      dto.vehicleId,
      new Date(dto.slotStart),
      new Date(dto.slotEnd),
      actor,
      manager,
    );
    if (conflicts.length > 0) {
      throw await this.buildConflictError(dto, actor, manager);
    }
  }

  /** AC2: builds the 409 error, including the nearest open slots for the
   * SAME vehicle+date (best-effort — a failure computing suggestions must
   * never suppress the 409 itself, so any error from this secondary lookup
   * is swallowed and simply yields an empty suggestion list). Reused by both
   * the app-level pre-check (assertNoConflict) and the DB-level
   * unique-violation catch in `book()`, so both paths return an identically
   * shaped, equally helpful response. */
  private async buildConflictError(
    dto: CreateTestDriveDto,
    actor: Principal,
    manager: EntityManager,
  ): Promise<TestDriveSlotConflictError> {
    const requestedStart = new Date(dto.slotStart);
    let suggestedSlots: { slotStart: string; slotEnd: string }[] = [];
    try {
      const dayStart = new Date(`${requestedStart.toISOString().slice(0, 10)}T00:00:00.000Z`);
      const dayEnd = new Date(`${requestedStart.toISOString().slice(0, 10)}T23:59:59.999Z`);
      const dayBookings = await this.testDrivesRepository.findBookedInRange(
        dto.vehicleId,
        dayStart,
        dayEnd,
        actor,
        manager,
      );
      suggestedSlots = computeNearestOpenSlots(
        requestedStart,
        dayBookings.map((b) => ({ slotStart: b.slotStart, slotEnd: b.slotEnd })),
      );
    } catch {
      // Best-effort — see this method's comment.
    }

    return new TestDriveSlotConflictError(
      [
        {
          field: 'slotStart',
          message: 'The selected vehicle is already booked for an overlapping time slot',
        },
      ],
      suggestedSlots,
    );
  }
}
