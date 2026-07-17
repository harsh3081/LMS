import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { TestDrivesRepository } from './test-drives.repository';
import { EnquiriesRepository } from '../enquiries/enquiries.repository';
import { AuditLogRepository } from '../audit-log/audit-log.repository';
import { DemoVehicleEntity } from '../demo-vehicles/entities/demo-vehicle.entity';
import { CreateTestDriveDto } from './dto/create-test-drive.dto';
import { SchedulerQueryDto } from './dto/scheduler-query.dto';
import { TestDriveEntity, TEST_DRIVE_STATUS_BOOKED } from './entities/test-drive.entity';
import { TestDriveEnquiryNotFoundError, OperatingHoursViolationError, FieldError } from './test-drives.errors';
import { ReferentialValidationError } from '../leads/leads.errors';
import { EnquiryEntity } from '../enquiries/entities/enquiry.entity';
import { Principal } from '../common/principal';

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
 * DELIBERATELY NOT DONE HERE (see NOTES.md "Deliberate scope boundary with
 * #36"): no double-booking/overlap conflict detection. Bookings are accepted
 * naively — issue #36 ("Prevent Double-Booking of Demo Vehicles") is the
 * dedicated Story for that entire concern and needs a working, naive booking
 * flow to layer onto, mirroring how issue #29 deliberately deferred
 * duplicate detection out of #24/#25's initial create flows.
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
      const testDrive = await this.testDrivesRepository.insert(
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
}
