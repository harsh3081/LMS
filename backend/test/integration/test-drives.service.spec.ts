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
import { TestDriveEnquiryNotFoundError, OperatingHoursViolationError } from '../../src/test-drives/test-drives.errors';
import { ReferentialValidationError } from '../../src/leads/leads.errors';
import { TEST_DRIVE_STATUS_BOOKED } from '../../src/test-drives/entities/test-drive.entity';
import { Principal } from '../../src/common/principal';

describe('TestDrivesService.book (issue #34)', () => {
  let dataSource: DataSource;
  let seed: SeedResult;
  let service: TestDrivesService;
  let enquiriesService: EnquiriesService;
  let actorA: Principal;
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
    const dseC = seed.users['dseC'];
    const loc1 = Object.keys(seed.locationIds)[0];
    const dg1 = Object.keys(seed.dealerGroupIds)[0];
    const loc2 = Object.keys(seed.locationIds)[1];
    const dg2 = Object.keys(seed.dealerGroupIds)[1];
    actorA = { userId: dseA.userId, role: 'DSE', locationId: loc1, dealerGroupId: dg1, capabilities: ['create-lead'] };
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

  const validBookingDto = (enquiryId: string, vehicleId: string) => ({
    enquiryId,
    vehicleId,
    slotStart: '2026-08-01T10:00:00.000Z',
    slotEnd: '2026-08-01T10:30:00.000Z',
  });

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
      const testDrive = await service.book(
        {
          enquiryId: enquiry.enquiryId,
          vehicleId: vehicleIdLoc1,
          slotStart: `2026-08-01T${String(OPERATING_HOURS_START_HOUR).padStart(2, '0')}:00:00.000Z`,
          slotEnd: `2026-08-01T${String(OPERATING_HOURS_END_HOUR).padStart(2, '0')}:00:00.000Z`,
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

  describe('deliberate scope boundary with issue #36: no double-booking/overlap check', () => {
    it('accepts two overlapping bookings for the same vehicle naively (no conflict rejection in this Story)', async () => {
      const enquiry1 = await enquiriesService.createDirect(validEnquiryDto(), actorA);
      const enquiry2 = await enquiriesService.createDirect(validEnquiryDto(), actorA);
      const first = await service.book(validBookingDto(enquiry1.enquiryId, vehicleIdLoc1), actorA);
      const second = await service.book(validBookingDto(enquiry2.enquiryId, vehicleIdLoc1), actorA);
      expect(first.testDriveId).not.toBe(second.testDriveId);
      expect(first.vehicleId).toBe(second.vehicleId);
      expect(first.slotStart).toEqual(second.slotStart);
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
});
