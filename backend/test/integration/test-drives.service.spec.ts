/**
 * RED->GREEN (Inside-Out, Service Layer) — issue #34 Task 2.
 * Integration tests against the real (pg-mem-backed) TypeORM DataSource — no
 * mocking of the DB, mirroring followups.service.spec.ts's structure.
 */
import { DataSource } from 'typeorm';
import { createTestDataSource } from '../support/test-data-source';
import { seedTestFixtures, SeedResult } from '../../src/seeds/test-seed';
import { TestDrivesService, OPERATING_HOURS_START_HOUR, OPERATING_HOURS_END_HOUR } from '../../src/test-drives/test-drives.service';
import { TestDrivesRepository } from '../../src/test-drives/test-drives.repository';
import { EnquiriesService } from '../../src/enquiries/enquiries.service';
import { EnquiriesRepository } from '../../src/enquiries/enquiries.repository';
import { LeadsRepository } from '../../src/leads/leads.repository';
import { AuditLogRepository } from '../../src/audit-log/audit-log.repository';
import { FieldConfigService } from '../../src/field-config/field-config.service';
import { FieldConfigRepository } from '../../src/field-config/field-config.repository';
import { DuplicatesService } from '../../src/duplicates/duplicates.service';
import { DuplicatesRepository } from '../../src/duplicates/duplicates.repository';
import {
  TestDriveEnquiryNotFoundError,
  OperatingHoursViolationError,
  TestDriveSlotConflictError,
} from '../../src/test-drives/test-drives.errors';
import { ReferentialValidationError } from '../../src/leads/leads.errors';
import { TEST_DRIVE_STATUS_BOOKED } from '../../src/test-drives/entities/test-drive.entity';
import { Principal } from '../../src/common/principal';

describe('TestDrivesService.book (issue #34)', () => {
  let dataSource: DataSource;
  let seed: SeedResult;
  let service: TestDrivesService;
  let enquiriesService: EnquiriesService;
  let actorA: Principal;
  let actorB: Principal;
  let actorC: Principal;
  let vehicleIdLoc1: string;
  let vehicleIdLoc2: string;

  beforeAll(async () => {
    dataSource = await createTestDataSource();
    seed = await seedTestFixtures(dataSource);

    const auditLogRepository = new AuditLogRepository(dataSource);
    const enquiriesRepository = new EnquiriesRepository(dataSource);
    const fieldConfigService = new FieldConfigService(
      dataSource,
      new FieldConfigRepository(dataSource),
      auditLogRepository,
    );
    const duplicatesService = new DuplicatesService(new DuplicatesRepository(dataSource));
    enquiriesService = new EnquiriesService(
      dataSource,
      enquiriesRepository,
      new LeadsRepository(dataSource),
      auditLogRepository,
      fieldConfigService,
      duplicatesService,
    );
    service = new TestDrivesService(dataSource, new TestDrivesRepository(dataSource), enquiriesRepository, auditLogRepository);

    const dseA = seed.users['dseA'];
    const dseB = seed.users['dseB'];
    const dseC = seed.users['dseC'];
    const loc1 = Object.keys(seed.locationIds)[0];
    const dg1 = Object.keys(seed.dealerGroupIds)[0];
    const loc2 = Object.keys(seed.locationIds)[1];
    const dg2 = Object.keys(seed.dealerGroupIds)[1];
    actorA = { userId: dseA.userId, role: 'DSE', locationId: loc1, dealerGroupId: dg1, capabilities: ['create-lead'] };
    // dseB shares dseA's location/dealer-group (NOTES.md #34: "loc1:
    // dseA/dseB") — used to prove the scheduler is tenant-scoped, NOT
    // owner-scoped (issue #35).
    actorB = { userId: dseB.userId, role: 'DSE', locationId: loc1, dealerGroupId: dg1, capabilities: ['create-lead'] };
    actorC = { userId: dseC.userId, role: 'DSE', locationId: loc2, dealerGroupId: dg2, capabilities: ['create-lead'] };
    vehicleIdLoc1 = seed.demoVehicleIdsByLocation[loc1][0];
    vehicleIdLoc2 = seed.demoVehicleIdsByLocation[loc2][0];
  });

  afterAll(async () => {
    await dataSource.destroy();
  });

  const validEnquiryDto = () => ({
    customerName: 'Walk-in Customer',
    mobile: `9${Math.floor(100000000 + Math.random() * 899999999)}`,
    sourceId: seed.sourceIds[0],
    modelId: seed.modelIds[0],
    budget: 300000,
    variant: 'LX',
    exchangeInterest: false,
    financeInterest: true,
  });

  // MODIFIED (issue #36): a fixed hardcoded slot here meant every call to
  // validBookingDto() booked the exact same vehicle+slot — harmless before
  // #36 (bookings were accepted naively), but now correctly rejected as a
  // conflict by every call after the first. Each call now gets its own
  // distinct, non-overlapping day so pre-existing tests that don't care
  // about the specific slot value keep passing unaffected by the new
  // conflict-detection behavior; tests that DO care about a specific
  // date/time (operating-hours boundaries, the #36 conflict matrix) set
  // slotStart/slotEnd explicitly instead of calling this helper.
  let bookingDayCounter = 0;
  const validBookingDto = (enquiryId: string, vehicleId: string) => {
    bookingDayCounter += 1;
    const start = new Date(Date.UTC(2027, 5, 1, 10, 0, 0) + bookingDayCounter * 24 * 60 * 60 * 1000);
    const end = new Date(start.getTime() + 30 * 60000);
    return {
      enquiryId,
      vehicleId,
      slotStart: start.toISOString(),
      slotEnd: end.toISOString(),
    };
  };

  it('AC1: books a Test Drive against an owned Enquiry', async () => {
    const enquiry = await enquiriesService.createDirect(validEnquiryDto(), actorA);
    const testDrive = await service.book(validBookingDto(enquiry.enquiryId, vehicleIdLoc1), actorA);

    expect(testDrive.enquiryId).toBe(enquiry.enquiryId);
    expect(testDrive.vehicleId).toBe(vehicleIdLoc1);
    expect(testDrive.status).toBe(TEST_DRIVE_STATUS_BOOKED);
  });

  it('derives bookedBy/locationId/dealerGroupId fully server-side from the Principal (AC5)', async () => {
    const enquiry = await enquiriesService.createDirect(validEnquiryDto(), actorA);
    const testDrive = await service.book(validBookingDto(enquiry.enquiryId, vehicleIdLoc1), actorA);

    expect(testDrive.bookedBy).toBe(actorA.userId);
    expect(testDrive.locationId).toBe(actorA.locationId);
    expect(testDrive.dealerGroupId).toBe(actorA.dealerGroupId);
  });

  it('stamps createdAt/updatedAt', async () => {
    const enquiry = await enquiriesService.createDirect(validEnquiryDto(), actorA);
    const before = new Date();
    const testDrive = await service.book(validBookingDto(enquiry.enquiryId, vehicleIdLoc1), actorA);

    expect(testDrive.createdAt).toBeInstanceOf(Date);
    expect(testDrive.createdAt.getTime()).toBeGreaterThanOrEqual(before.getTime() - 1000);
  });

  it('writes an audit_log row (action=TEST_DRIVE_BOOKED)', async () => {
    const enquiry = await enquiriesService.createDirect(validEnquiryDto(), actorA);
    const testDrive = await service.book(validBookingDto(enquiry.enquiryId, vehicleIdLoc1), actorA);

    const auditRows = await dataSource.query('SELECT * FROM audit_log WHERE entity_id = $1', [testDrive.testDriveId]);
    expect(auditRows).toHaveLength(1);
    expect(auditRows[0].action).toBe('TEST_DRIVE_BOOKED');
    expect(auditRows[0].entity_type).toBe('test_drive');
  });

  describe('AC1: Enquiry eligibility (mirrors FollowupsService.assertEnquiryOwnedByActor)', () => {
    it('throws TestDriveEnquiryNotFoundError for a non-existent enquiryId', async () => {
      await expect(
        service.book(validBookingDto('00000000-0000-0000-0000-000000000000', vehicleIdLoc1), actorA),
      ).rejects.toBeInstanceOf(TestDriveEnquiryNotFoundError);
    });

    it('throws TestDriveEnquiryNotFoundError when the Enquiry belongs to a different owner/tenant', async () => {
      const enquiry = await enquiriesService.createDirect(validEnquiryDto(), actorA);
      await expect(service.book(validBookingDto(enquiry.enquiryId, vehicleIdLoc1), actorC)).rejects.toBeInstanceOf(
        TestDriveEnquiryNotFoundError,
      );
    });

    it('does not persist a Test Drive when the Enquiry is not owned by the actor (fail fast, before any transaction)', async () => {
      const enquiry = await enquiriesService.createDirect(validEnquiryDto(), actorA);
      const before = await dataSource.query('SELECT COUNT(*)::int AS count FROM test_drives');
      await expect(service.book(validBookingDto(enquiry.enquiryId, vehicleIdLoc1), actorC)).rejects.toBeInstanceOf(
        TestDriveEnquiryNotFoundError,
      );
      const after = await dataSource.query('SELECT COUNT(*)::int AS count FROM test_drives');
      expect(after[0].count).toBe(before[0].count);
    });
  });

  describe('AC2: operating hours validation', () => {
    it('throws OperatingHoursViolationError when slotStart is before the operating window', async () => {
      const enquiry = await enquiriesService.createDirect(validEnquiryDto(), actorA);
      await expect(
        service.book(
          { enquiryId: enquiry.enquiryId, vehicleId: vehicleIdLoc1, slotStart: '2026-08-01T05:00:00.000Z', slotEnd: '2026-08-01T05:30:00.000Z' },
          actorA,
        ),
      ).rejects.toBeInstanceOf(OperatingHoursViolationError);
    });

    it('throws OperatingHoursViolationError when slotEnd is after the operating window', async () => {
      const enquiry = await enquiriesService.createDirect(validEnquiryDto(), actorA);
      await expect(
        service.book(
          { enquiryId: enquiry.enquiryId, vehicleId: vehicleIdLoc1, slotStart: '2026-08-01T20:00:00.000Z', slotEnd: '2026-08-01T20:30:00.000Z' },
          actorA,
        ),
      ).rejects.toBeInstanceOf(OperatingHoursViolationError);
    });

    it('throws OperatingHoursViolationError when slotEnd is not after slotStart', async () => {
      const enquiry = await enquiriesService.createDirect(validEnquiryDto(), actorA);
      await expect(
        service.book(
          { enquiryId: enquiry.enquiryId, vehicleId: vehicleIdLoc1, slotStart: '2026-08-01T10:30:00.000Z', slotEnd: '2026-08-01T10:00:00.000Z' },
          actorA,
        ),
      ).rejects.toBeInstanceOf(OperatingHoursViolationError);
    });

    it('does not persist a Test Drive when operating hours validation fails (fail fast, before any transaction)', async () => {
      const enquiry = await enquiriesService.createDirect(validEnquiryDto(), actorA);
      const before = await dataSource.query('SELECT COUNT(*)::int AS count FROM test_drives');
      await expect(
        service.book(
          { enquiryId: enquiry.enquiryId, vehicleId: vehicleIdLoc1, slotStart: '2026-08-01T05:00:00.000Z', slotEnd: '2026-08-01T05:30:00.000Z' },
          actorA,
        ),
      ).rejects.toBeInstanceOf(OperatingHoursViolationError);
      const after = await dataSource.query('SELECT COUNT(*)::int AS count FROM test_drives');
      expect(after[0].count).toBe(before[0].count);
    });

    it(`accepts a slot exactly at the operating-window boundaries (${OPERATING_HOURS_START_HOUR}:00-${OPERATING_HOURS_END_HOUR}:00)`, async () => {
      const enquiry = await enquiriesService.createDirect(validEnquiryDto(), actorA);
      // A dedicated, otherwise-untouched date (MODIFIED, issue #36): this
      // slot spans the ENTIRE operating window, so it would (correctly)
      // conflict with any other booking made against vehicleIdLoc1 on the
      // same day — isolated onto its own date to avoid that.
      const testDrive = await service.book(
        {
          enquiryId: enquiry.enquiryId,
          vehicleId: vehicleIdLoc1,
          slotStart: `2027-03-15T${String(OPERATING_HOURS_START_HOUR).padStart(2, '0')}:00:00.000Z`,
          slotEnd: `2027-03-15T${String(OPERATING_HOURS_END_HOUR).padStart(2, '0')}:00:00.000Z`,
        },
        actorA,
      );
      expect(testDrive.status).toBe(TEST_DRIVE_STATUS_BOOKED);
    });
  });

  describe('vehicle referential validation', () => {
    it('throws ReferentialValidationError for a non-existent vehicleId', async () => {
      const enquiry = await enquiriesService.createDirect(validEnquiryDto(), actorA);
      await expect(
        service.book(validBookingDto(enquiry.enquiryId, '00000000-0000-0000-0000-000000000000'), actorA),
      ).rejects.toBeInstanceOf(ReferentialValidationError);
    });
  });

  describe('AC6: missing required fields are already rejected at the DTO layer (see create-test-drive.dto.spec.ts) — service-layer sanity', () => {
    it('a well-formed booking against a different location vehicle than the actor still succeeds (no location-matching requirement in this Story)', async () => {
      const enquiry = await enquiriesService.createDirect(validEnquiryDto(), actorA);
      const testDrive = await service.book(validBookingDto(enquiry.enquiryId, vehicleIdLoc2), actorA);
      expect(testDrive.vehicleId).toBe(vehicleIdLoc2);
    });
  });

  describe('issue #36: prevent double-booking of demo vehicles (AC1/AC3/AC4/AC5)', () => {
    async function bookOnce(vehicleId: string, slotStart: string, slotEnd: string, actor = actorA) {
      const enquiry = await enquiriesService.createDirect(validEnquiryDto(), actor);
      return service.book({ enquiryId: enquiry.enquiryId, vehicleId, slotStart, slotEnd }, actor);
    }

    it('AC1: rejects a second booking for the exact same vehicle+slot with TestDriveSlotConflictError', async () => {
      await bookOnce(vehicleIdLoc1, '2028-01-05T10:00:00.000Z', '2028-01-05T10:30:00.000Z');

      const enquiry2 = await enquiriesService.createDirect(validEnquiryDto(), actorA);
      await expect(
        service.book(
          { enquiryId: enquiry2.enquiryId, vehicleId: vehicleIdLoc1, slotStart: '2028-01-05T10:00:00.000Z', slotEnd: '2028-01-05T10:30:00.000Z' },
          actorA,
        ),
      ).rejects.toBeInstanceOf(TestDriveSlotConflictError);
    });

    it('does not persist a second Test Drive when a conflict is rejected (fail fast within the transaction)', async () => {
      const first = await bookOnce(vehicleIdLoc1, '2028-01-06T10:00:00.000Z', '2028-01-06T10:30:00.000Z');
      const enquiry2 = await enquiriesService.createDirect(validEnquiryDto(), actorA);
      const before = await dataSource.query('SELECT COUNT(*)::int AS count FROM test_drives');

      await expect(
        service.book(
          { enquiryId: enquiry2.enquiryId, vehicleId: vehicleIdLoc1, slotStart: '2028-01-06T10:00:00.000Z', slotEnd: '2028-01-06T10:30:00.000Z' },
          actorA,
        ),
      ).rejects.toBeInstanceOf(TestDriveSlotConflictError);

      const after = await dataSource.query('SELECT COUNT(*)::int AS count FROM test_drives');
      expect(after[0].count).toBe(before[0].count);
      expect(first.status).toBe(TEST_DRIVE_STATUS_BOOKED);
    });

    it('AC4: rejects a PARTIAL overlap where the new slot starts before and ends inside the existing booking', async () => {
      await bookOnce(vehicleIdLoc1, '2028-01-07T10:00:00.000Z', '2028-01-07T10:30:00.000Z');
      const enquiry2 = await enquiriesService.createDirect(validEnquiryDto(), actorA);
      await expect(
        service.book(
          { enquiryId: enquiry2.enquiryId, vehicleId: vehicleIdLoc1, slotStart: '2028-01-07T09:45:00.000Z', slotEnd: '2028-01-07T10:15:00.000Z' },
          actorA,
        ),
      ).rejects.toBeInstanceOf(TestDriveSlotConflictError);
    });

    it('AC4: rejects a PARTIAL overlap where the new slot starts inside and ends after the existing booking', async () => {
      await bookOnce(vehicleIdLoc1, '2028-01-08T10:00:00.000Z', '2028-01-08T10:30:00.000Z');
      const enquiry2 = await enquiriesService.createDirect(validEnquiryDto(), actorA);
      await expect(
        service.book(
          { enquiryId: enquiry2.enquiryId, vehicleId: vehicleIdLoc1, slotStart: '2028-01-08T10:15:00.000Z', slotEnd: '2028-01-08T10:45:00.000Z' },
          actorA,
        ),
      ).rejects.toBeInstanceOf(TestDriveSlotConflictError);
    });

    it('AC4: rejects a new slot that fully CONTAINS an existing booking', async () => {
      await bookOnce(vehicleIdLoc1, '2028-01-09T10:15:00.000Z', '2028-01-09T10:30:00.000Z');
      const enquiry2 = await enquiriesService.createDirect(validEnquiryDto(), actorA);
      await expect(
        service.book(
          { enquiryId: enquiry2.enquiryId, vehicleId: vehicleIdLoc1, slotStart: '2028-01-09T10:00:00.000Z', slotEnd: '2028-01-09T11:00:00.000Z' },
          actorA,
        ),
      ).rejects.toBeInstanceOf(TestDriveSlotConflictError);
    });

    it('AC4: an ADJACENT, non-overlapping slot (ends exactly when the existing one starts) does NOT conflict', async () => {
      await bookOnce(vehicleIdLoc1, '2028-01-10T10:30:00.000Z', '2028-01-10T11:00:00.000Z');
      const enquiry2 = await enquiriesService.createDirect(validEnquiryDto(), actorA);
      const second = await service.book(
        { enquiryId: enquiry2.enquiryId, vehicleId: vehicleIdLoc1, slotStart: '2028-01-10T10:00:00.000Z', slotEnd: '2028-01-10T10:30:00.000Z' },
        actorA,
      );
      expect(second.status).toBe(TEST_DRIVE_STATUS_BOOKED);
    });

    it('a booking for a DIFFERENT vehicle at the same slot does NOT conflict', async () => {
      await bookOnce(vehicleIdLoc1, '2028-01-11T10:00:00.000Z', '2028-01-11T10:30:00.000Z');
      const enquiry2 = await enquiriesService.createDirect(validEnquiryDto(), actorA);
      const otherVehicle = seed.demoVehicleIdsByLocation[actorA.locationId][1];
      const second = await service.book(
        { enquiryId: enquiry2.enquiryId, vehicleId: otherVehicle, slotStart: '2028-01-11T10:00:00.000Z', slotEnd: '2028-01-11T10:30:00.000Z' },
        actorA,
      );
      expect(second.status).toBe(TEST_DRIVE_STATUS_BOOKED);
    });

    it('the SAME vehicle+slot at a DIFFERENT tenant/location does NOT conflict (tenant-scoped)', async () => {
      await bookOnce(vehicleIdLoc1, '2028-01-12T10:00:00.000Z', '2028-01-12T10:30:00.000Z', actorA);
      const enquiryC = await enquiriesService.createDirect(validEnquiryDto(), actorC);
      const second = await service.book(
        { enquiryId: enquiryC.enquiryId, vehicleId: vehicleIdLoc2, slotStart: '2028-01-12T10:00:00.000Z', slotEnd: '2028-01-12T10:30:00.000Z' },
        actorC,
      );
      expect(second.status).toBe(TEST_DRIVE_STATUS_BOOKED);
    });

    it('AC2: the conflict error includes a reason and the nearest open slots for the same vehicle/day', async () => {
      await bookOnce(vehicleIdLoc1, '2028-01-13T10:00:00.000Z', '2028-01-13T10:30:00.000Z');
      const enquiry2 = await enquiriesService.createDirect(validEnquiryDto(), actorA);

      try {
        await service.book(
          { enquiryId: enquiry2.enquiryId, vehicleId: vehicleIdLoc1, slotStart: '2028-01-13T10:00:00.000Z', slotEnd: '2028-01-13T10:30:00.000Z' },
          actorA,
        );
        throw new Error('expected book() to reject');
      } catch (err) {
        expect(err).toBeInstanceOf(TestDriveSlotConflictError);
        const conflictError = err as TestDriveSlotConflictError;
        expect(conflictError.errors.length).toBeGreaterThan(0);
        expect(conflictError.errors[0].message).toMatch(/booked|overlap/i);
        expect(conflictError.suggestedSlots).toEqual(
          expect.arrayContaining([{ slotStart: '2028-01-13T10:30:00.000Z', slotEnd: '2028-01-13T11:00:00.000Z' }]),
        );
      }
    });

    it('AC5: a booking whose status has been directly set to a TERMINAL value no longer blocks a new overlapping booking', async () => {
      const cancelled = await bookOnce(vehicleIdLoc1, '2028-01-14T10:00:00.000Z', '2028-01-14T10:30:00.000Z');

      // Directly manipulate the row's status via raw SQL (bypassing the
      // not-yet-built #39 cancel/reschedule endpoint) — proves the
      // conflict-check query's status=BOOKED filter, not any #39 feature.
      await dataSource.query(`UPDATE test_drives SET status = 'Cancelled' WHERE test_drive_id = $1`, [
        cancelled.testDriveId,
      ]);

      const enquiry2 = await enquiriesService.createDirect(validEnquiryDto(), actorA);
      const second = await service.book(
        { enquiryId: enquiry2.enquiryId, vehicleId: vehicleIdLoc1, slotStart: '2028-01-14T10:00:00.000Z', slotEnd: '2028-01-14T10:30:00.000Z' },
        actorA,
      );
      expect(second.status).toBe(TEST_DRIVE_STATUS_BOOKED);
    });

    it('AC3: of two concurrently-fired overlapping booking attempts for the same vehicle/slot, exactly one succeeds and one is rejected with TestDriveSlotConflictError', async () => {
      const [enquiry1, enquiry2] = await Promise.all([
        enquiriesService.createDirect(validEnquiryDto(), actorA),
        enquiriesService.createDirect(validEnquiryDto(), actorA),
      ]);

      const slotStart = '2028-01-15T10:00:00.000Z';
      const slotEnd = '2028-01-15T10:30:00.000Z';
      const results = await Promise.allSettled([
        service.book({ enquiryId: enquiry1.enquiryId, vehicleId: vehicleIdLoc1, slotStart, slotEnd }, actorA),
        service.book({ enquiryId: enquiry2.enquiryId, vehicleId: vehicleIdLoc1, slotStart, slotEnd }, actorA),
      ]);

      const fulfilled = results.filter((r) => r.status === 'fulfilled');
      const rejected = results.filter((r) => r.status === 'rejected');
      expect(fulfilled).toHaveLength(1);
      expect(rejected).toHaveLength(1);
      expect((rejected[0] as PromiseRejectedResult).reason).toBeInstanceOf(TestDriveSlotConflictError);

      const rows = await dataSource.query(
        `SELECT COUNT(*)::int AS count FROM test_drives WHERE vehicle_id = $1 AND slot_start = $2 AND status = 'Booked'`,
        [vehicleIdLoc1, slotStart],
      );
      expect(rows[0].count).toBe(1);
    });
  });

  describe('findUpcoming (AC5)', () => {
    it("returns only the actor's own upcoming bookings, ascending by slotStart", async () => {
      const enquiry = await enquiriesService.createDirect(validEnquiryDto(), actorA);
      const later = await service.book(
        { enquiryId: enquiry.enquiryId, vehicleId: vehicleIdLoc1, slotStart: '2027-01-01T11:00:00.000Z', slotEnd: '2027-01-01T11:30:00.000Z' },
        actorA,
      );
      const sooner = await service.book(
        { enquiryId: enquiry.enquiryId, vehicleId: vehicleIdLoc1, slotStart: '2026-09-01T09:00:00.000Z', slotEnd: '2026-09-01T09:30:00.000Z' },
        actorA,
      );

      const upcoming = await service.findUpcoming(actorA);
      const ids = upcoming.map((t) => t.testDriveId);
      expect(ids).toContain(sooner.testDriveId);
      expect(ids).toContain(later.testDriveId);
      expect(ids.indexOf(sooner.testDriveId)).toBeLessThan(ids.indexOf(later.testDriveId));
    });

    it("does not return another DSE's bookings (tenant/bookedBy scoped)", async () => {
      const enquiry = await enquiriesService.createDirect(validEnquiryDto(), actorA);
      await service.book(
        { enquiryId: enquiry.enquiryId, vehicleId: vehicleIdLoc1, slotStart: '2026-10-01T09:00:00.000Z', slotEnd: '2026-10-01T09:30:00.000Z' },
        actorA,
      );

      const upcomingForC = await service.findUpcoming(actorC);
      expect(upcomingForC.some((t) => t.enquiryId === enquiry.enquiryId)).toBe(false);
    });

    it('excludes a booking whose slotStart is in the past', async () => {
      const enquiry = await enquiriesService.createDirect(validEnquiryDto(), actorA);
      const pastBooking = await service.book(
        { enquiryId: enquiry.enquiryId, vehicleId: vehicleIdLoc1, slotStart: '2020-01-01T09:00:00.000Z', slotEnd: '2020-01-01T09:30:00.000Z' },
        actorA,
      );

      const upcoming = await service.findUpcoming(actorA);
      expect(upcoming.some((t) => t.testDriveId === pastBooking.testDriveId)).toBe(false);
    });
  });

  describe('getScheduler (issue #35 AC1/AC2/AC5)', () => {
    const dayRange = (dateIso: string) => ({
      from: `${dateIso}T00:00:00.000Z`,
      to: `${dateIso}T23:59:59.999Z`,
    });

    it('returns a booking made by a DIFFERENT DSE at the SAME location (tenant-scoped, not owner-scoped)', async () => {
      const enquiry = await enquiriesService.createDirect(validEnquiryDto(), actorA);
      const booking = await service.book(
        { enquiryId: enquiry.enquiryId, vehicleId: vehicleIdLoc1, slotStart: '2026-11-01T10:00:00.000Z', slotEnd: '2026-11-01T10:30:00.000Z' },
        actorA,
      );

      const slots = await service.getScheduler(
        { vehicleId: vehicleIdLoc1, ...dayRange('2026-11-01') },
        actorB,
      );
      expect(slots.some((s) => s.slotStart.getTime() === booking.slotStart.getTime())).toBe(true);
    });

    it('does NOT return a booking scoped to a different location/dealer-group', async () => {
      const enquiry = await enquiriesService.createDirect(validEnquiryDto(), actorA);
      await service.book(
        { enquiryId: enquiry.enquiryId, vehicleId: vehicleIdLoc1, slotStart: '2026-11-02T10:00:00.000Z', slotEnd: '2026-11-02T10:30:00.000Z' },
        actorA,
      );

      const slots = await service.getScheduler(
        { vehicleId: vehicleIdLoc1, ...dayRange('2026-11-02') },
        actorC,
      );
      expect(slots).toHaveLength(0);
    });

    it('only returns slots overlapping the requested date range', async () => {
      const enquiry = await enquiriesService.createDirect(validEnquiryDto(), actorA);
      const inRange = await service.book(
        { enquiryId: enquiry.enquiryId, vehicleId: vehicleIdLoc1, slotStart: '2026-11-03T10:00:00.000Z', slotEnd: '2026-11-03T10:30:00.000Z' },
        actorA,
      );
      const outOfRange = await service.book(
        { enquiryId: enquiry.enquiryId, vehicleId: vehicleIdLoc1, slotStart: '2026-11-04T10:00:00.000Z', slotEnd: '2026-11-04T10:30:00.000Z' },
        actorA,
      );

      const slots = await service.getScheduler(
        { vehicleId: vehicleIdLoc1, ...dayRange('2026-11-03') },
        actorA,
      );
      const starts = slots.map((s) => s.slotStart.getTime());
      expect(starts).toContain(inRange.slotStart.getTime());
      expect(starts).not.toContain(outOfRange.slotStart.getTime());
    });

    it('only returns slots for the requested vehicle', async () => {
      const enquiry = await enquiriesService.createDirect(validEnquiryDto(), actorA);
      const vehicleIdLoc1Other = seed.demoVehicleIdsByLocation[actorA.locationId][1];
      const wantedVehicle = await service.book(
        { enquiryId: enquiry.enquiryId, vehicleId: vehicleIdLoc1, slotStart: '2026-11-05T10:00:00.000Z', slotEnd: '2026-11-05T10:30:00.000Z' },
        actorA,
      );
      await service.book(
        { enquiryId: enquiry.enquiryId, vehicleId: vehicleIdLoc1Other, slotStart: '2026-11-05T11:00:00.000Z', slotEnd: '2026-11-05T11:30:00.000Z' },
        actorA,
      );

      const slots = await service.getScheduler(
        { vehicleId: vehicleIdLoc1, ...dayRange('2026-11-05') },
        actorA,
      );
      expect(slots).toHaveLength(1);
      expect(slots[0].slotStart.getTime()).toBe(wantedVehicle.slotStart.getTime());
    });

    it('returns an empty array for a vehicle/range with no bookings (never errors)', async () => {
      const slots = await service.getScheduler(
        { vehicleId: vehicleIdLoc1, ...dayRange('2030-01-01') },
        actorA,
      );
      expect(slots).toEqual([]);
    });

    it('is ordered ascending by slotStart', async () => {
      const enquiry = await enquiriesService.createDirect(validEnquiryDto(), actorA);
      const later = await service.book(
        { enquiryId: enquiry.enquiryId, vehicleId: vehicleIdLoc1, slotStart: '2026-11-06T15:00:00.000Z', slotEnd: '2026-11-06T15:30:00.000Z' },
        actorA,
      );
      const sooner = await service.book(
        { enquiryId: enquiry.enquiryId, vehicleId: vehicleIdLoc1, slotStart: '2026-11-06T09:00:00.000Z', slotEnd: '2026-11-06T09:30:00.000Z' },
        actorA,
      );

      const slots = await service.getScheduler(
        { vehicleId: vehicleIdLoc1, ...dayRange('2026-11-06') },
        actorA,
      );
      const starts = slots.map((s) => s.slotStart.getTime());
      expect(starts.indexOf(sooner.slotStart.getTime())).toBeLessThan(starts.indexOf(later.slotStart.getTime()));
    });
  });
});
