/**
 * RED->GREEN (Inside-Out, Service Layer) — issue #114 Task 2. Integration
 * tests against the real (pg-mem-backed) TypeORM DataSource — no mocking,
 * mirrors leads.service.spec.ts's structure/conventions exactly (kept in its
 * own file for isolation).
 */
import { DataSource } from 'typeorm';
import { createTestDataSource } from '../support/test-data-source';
import { seedTestFixtures, SeedResult } from '../../src/seeds/test-seed';
import { LeadsService } from '../../src/leads/leads.service';
import { LeadsRepository } from '../../src/leads/leads.repository';
import { AuditLogRepository } from '../../src/audit-log/audit-log.repository';
import { FieldConfigService } from '../../src/field-config/field-config.service';
import { FieldConfigRepository } from '../../src/field-config/field-config.repository';
import { DuplicatesService } from '../../src/duplicates/duplicates.service';
import { DuplicatesRepository } from '../../src/duplicates/duplicates.repository';
import { ReferentialValidationError } from '../../src/leads/leads.errors';
import { Principal } from '../../src/common/principal';

describe('LeadsService — customer-details fields (issue #114 Task 2)', () => {
  let dataSource: DataSource;
  let seed: SeedResult;
  let service: LeadsService;
  let actorA: Principal;
  let actorC: Principal;

  beforeAll(async () => {
    dataSource = await createTestDataSource();
    seed = await seedTestFixtures(dataSource);
    const auditLogRepository = new AuditLogRepository(dataSource);
    const fieldConfigService = new FieldConfigService(dataSource, new FieldConfigRepository(dataSource), auditLogRepository);
    const duplicatesService = new DuplicatesService(new DuplicatesRepository(dataSource));
    service = new LeadsService(dataSource, new LeadsRepository(dataSource), auditLogRepository, fieldConfigService, duplicatesService);

    const dseA = seed.users['dseA'];
    const dseC = seed.users['dseC'];
    actorA = {
      userId: dseA.userId,
      role: 'DSE',
      locationId: '11111111-0000-0000-0000-000000000001',
      dealerGroupId: '99999999-0000-0000-0000-000000000001',
      capabilities: ['create-lead'],
    };
    actorC = {
      userId: dseC.userId,
      role: 'DSE',
      locationId: '22222222-0000-0000-0000-000000000002',
      dealerGroupId: '99999999-0000-0000-0000-000000000002',
      capabilities: ['create-lead'],
    };
  });

  afterAll(async () => {
    await dataSource.destroy();
  });

  const randomMobile = () => {
    const leading = ['6', '7', '8', '9'][Math.floor(Math.random() * 4)];
    const rest = Array.from({ length: 9 }, () => Math.floor(Math.random() * 10)).join('');
    return `${leading}${rest}`;
  };

  const validDto = () => ({
    customerName: 'Asha Rao',
    mobile: randomMobile(),
    sourceId: 1,
    modelId: 101,
    communicationConsentVerified: true as const,
  });

  it('persists every new field exactly as supplied', async () => {
    const saved = await service.create(
      {
        ...validDto(),
        email: 'asha.rao@example.com',
        customerType: 'Individual',
        city: 'Pune',
        pinCode: '411001',
        preferredLanguage: 'Hindi',
        variant: 'VXi (O) CVT',
        fuelType: 'Petrol',
        transmission: 'Manual',
        budgetMin: 800000,
        budgetMax: 1200000,
        buyingTimeline: 'Immediate',
        exchangeInterest: true,
        currentVehicle: 'Maruti Swift 2018',
        kmsDriven: 45000,
        registrationNumber: 'MH12AB1234',
        expectedValue: 350000,
        paymentMode: 'Loan',
        preferredFinancer: 'HDFC Bank',
        downPaymentCapacity: 100000,
        referrerName: 'Rohit Sharma',
        firstFollowUpAt: '2026-08-01T10:00:00.000Z',
        remarks: 'Interested in a test drive.',
      },
      actorA,
    );

    expect(saved.email).toBe('asha.rao@example.com');
    expect(saved.customerType).toBe('Individual');
    expect(saved.city).toBe('Pune');
    expect(saved.pinCode).toBe('411001');
    expect(saved.preferredLanguage).toBe('Hindi');
    expect(saved.variant).toBe('VXi (O) CVT');
    expect(saved.fuelType).toBe('Petrol');
    expect(saved.transmission).toBe('Manual');
    expect(saved.budgetMin).toBe(800000);
    expect(saved.budgetMax).toBe(1200000);
    expect(saved.buyingTimeline).toBe('Immediate');
    expect(saved.exchangeInterest).toBe(true);
    expect(saved.currentVehicle).toBe('Maruti Swift 2018');
    expect(saved.kmsDriven).toBe(45000);
    expect(saved.registrationNumber).toBe('MH12AB1234');
    expect(saved.expectedValue).toBe(350000);
    expect(saved.paymentMode).toBe('Loan');
    expect(saved.preferredFinancer).toBe('HDFC Bank');
    expect(saved.downPaymentCapacity).toBe(100000);
    expect(saved.referrerName).toBe('Rohit Sharma');
    expect(saved.firstFollowUpAt).toBeInstanceOf(Date);
    expect(saved.remarks).toBe('Interested in a test drive.');
    expect(saved.communicationConsentVerified).toBe(true);
  });

  it('defaults every new field to null when omitted (all optional except consent)', async () => {
    const saved = await service.create(validDto(), actorA);
    expect(saved.email).toBeNull();
    expect(saved.customerType).toBeNull();
    expect(saved.budgetMin).toBeNull();
    expect(saved.exchangeInterest).toBeNull();
    expect(saved.firstFollowUpAt).toBeNull();
    expect(saved.communicationConsentVerified).toBe(true);
  });

  // -------------------------------------------------------------------
  // AC5 — Assign to Consultant (LeadsService.resolveOwnerId)
  // -------------------------------------------------------------------
  describe('assign-to-consultant (AC5)', () => {
    it('defaults ownerId to the actor when assignedOwnerId is omitted (issue #28 self-assignment preserved)', async () => {
      const saved = await service.create(validDto(), actorA);
      expect(saved.ownerId).toBe(actorA.userId);
      expect(saved.createdBy).toBe(actorA.userId);
    });

    it('sets ownerId to a different DSE at the same location/dealerGroup, leaving createdBy as the actor', async () => {
      const dseB = seed.users['dseB'];
      const saved = await service.create({ ...validDto(), assignedOwnerId: dseB.userId }, actorA);
      expect(saved.ownerId).toBe(dseB.userId);
      expect(saved.createdBy).toBe(actorA.userId);
    });

    it('rejects an assignedOwnerId that does not exist', async () => {
      await expect(
        service.create({ ...validDto(), assignedOwnerId: '00000000-0000-0000-0000-000000000000' }, actorA),
      ).rejects.toBeInstanceOf(ReferentialValidationError);
    });

    it('rejects an assignedOwnerId belonging to a non-DSE role', async () => {
      const noCap = seed.users['noCapabilityUser']; // role: ReadOnlyStaff, same location as actorA
      await expect(service.create({ ...validDto(), assignedOwnerId: noCap.userId }, actorA)).rejects.toBeInstanceOf(
        ReferentialValidationError,
      );
    });

    it("rejects an assignedOwnerId at a different location/dealerGroup than the actor", async () => {
      const dseC = seed.users['dseC'];
      await expect(service.create({ ...validDto(), assignedOwnerId: dseC.userId }, actorA)).rejects.toBeInstanceOf(
        ReferentialValidationError,
      );
    });

    it('allows self-assignment via an explicit assignedOwnerId matching the actor', async () => {
      const saved = await service.create({ ...validDto(), assignedOwnerId: actorA.userId }, actorA);
      expect(saved.ownerId).toBe(actorA.userId);
    });

    it('a different-location actor (dseC) can still self-assign within their own tenant', async () => {
      const saved = await service.create(validDto(), actorC);
      expect(saved.ownerId).toBe(actorC.userId);
    });
  });
});
