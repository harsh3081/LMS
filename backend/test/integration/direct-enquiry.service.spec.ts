/**
 * RED->GREEN (Inside-Out, Service Layer) — issue #26 Task 2.4.
 * Integration tests against the real (pg-mem-backed) TypeORM DataSource — no
 * mocking of the DB, mirroring enquiries.service.spec.ts's (#25) structure.
 */
import { DataSource } from 'typeorm';
import { createTestDataSource } from '../support/test-data-source';
import { seedTestFixtures, SeedResult } from '../../src/seeds/test-seed';
import { EnquiriesService } from '../../src/enquiries/enquiries.service';
import { EnquiriesRepository } from '../../src/enquiries/enquiries.repository';
import { LeadsRepository } from '../../src/leads/leads.repository';
import { AuditLogRepository } from '../../src/audit-log/audit-log.repository';
import { FieldConfigService } from '../../src/field-config/field-config.service';
import { FieldConfigRepository } from '../../src/field-config/field-config.repository';
import { DuplicatesService } from '../../src/duplicates/duplicates.service';
import { DuplicatesRepository } from '../../src/duplicates/duplicates.repository';
import { ReferentialValidationError } from '../../src/leads/leads.errors';
import { ENQUIRY_STATUS_NEW, ENQUIRY_ENTRY_TYPE_DIRECT } from '../../src/enquiries/entities/enquiry.entity';
import { Principal } from '../../src/common/principal';

describe('EnquiriesService.createDirect (Task 2.4, issue #26)', () => {
  let dataSource: DataSource;
  let seed: SeedResult;
  let service: EnquiriesService;
  let enquiriesRepository: EnquiriesRepository;
  let auditLogRepository: AuditLogRepository;
  let actor: Principal;

  beforeAll(async () => {
    dataSource = await createTestDataSource();
    seed = await seedTestFixtures(dataSource);
    enquiriesRepository = new EnquiriesRepository(dataSource);
    auditLogRepository = new AuditLogRepository(dataSource);
    const fieldConfigService = new FieldConfigService(dataSource, new FieldConfigRepository(dataSource), auditLogRepository);
    const duplicatesService = new DuplicatesService(new DuplicatesRepository(dataSource));
    service = new EnquiriesService(
      dataSource,
      enquiriesRepository,
      new LeadsRepository(dataSource),
      auditLogRepository,
      fieldConfigService,
      duplicatesService,
    );

    const dseA = seed.users['dseA'];
    actor = {
      userId: dseA.userId,
      role: 'DSE',
      locationId: Object.keys(seed.locationIds)[0],
      dealerGroupId: Object.keys(seed.dealerGroupIds)[0],
      capabilities: ['create-lead'],
    };
  });

  afterAll(async () => {
    await dataSource.destroy();
  });

  const validDto = () => ({
    customerName: 'Walk-in Customer',
    mobile: `9${Math.floor(100000000 + Math.random() * 899999999)}`,
    sourceId: seed.sourceIds[0],
    modelId: seed.modelIds[0],
    budget: 300000,
    variant: 'LX',
    exchangeInterest: false,
    financeInterest: true,
  });

  it('creates a Direct Enquiry with no parent Lead (AC4) and entryType DIRECT (AC5)', async () => {
    const enquiry = await service.createDirect(validDto(), actor);

    expect(enquiry.leadId).toBeNull();
    expect(enquiry.entryType).toBe(ENQUIRY_ENTRY_TYPE_DIRECT);
    expect(enquiry.status).toBe(ENQUIRY_STATUS_NEW);
  });

  it('persists the Lead-equivalent fields directly on the Enquiry (AC2)', async () => {
    const dto = validDto();
    const enquiry = await service.createDirect(dto, actor);

    expect(enquiry.customerName).toBe(dto.customerName);
    expect(enquiry.mobile).toBe(dto.mobile);
    expect(enquiry.sourceId).toBe(dto.sourceId);
    expect(enquiry.modelId).toBe(dto.modelId);
    expect(enquiry.budget).toBe(dto.budget);
    expect(enquiry.variant).toBe(dto.variant);
    expect(enquiry.exchangeInterest).toBe(dto.exchangeInterest);
    expect(enquiry.financeInterest).toBe(dto.financeInterest);
  });

  it('derives owner/tenant/convertedBy fully server-side from the Principal', async () => {
    const enquiry = await service.createDirect(validDto(), actor);
    expect(enquiry.ownerId).toBe(actor.userId);
    expect(enquiry.locationId).toBe(actor.locationId);
    expect(enquiry.dealerGroupId).toBe(actor.dealerGroupId);
    expect(enquiry.convertedBy).toBe(actor.userId);
  });

  it('throws ReferentialValidationError for a non-existent sourceId (mirrors LeadsService)', async () => {
    await expect(service.createDirect({ ...validDto(), sourceId: 999999 }, actor)).rejects.toBeInstanceOf(
      ReferentialValidationError,
    );
  });

  it('throws ReferentialValidationError for a non-existent modelId (mirrors LeadsService)', async () => {
    await expect(service.createDirect({ ...validDto(), modelId: 999999 }, actor)).rejects.toBeInstanceOf(
      ReferentialValidationError,
    );
  });

  it('writes an audit_log row (action=ENQUIRY_CREATED_DIRECT)', async () => {
    const enquiry = await service.createDirect(validDto(), actor);
    const auditRows = await dataSource.query('SELECT * FROM audit_log WHERE entity_id = $1', [enquiry.enquiryId]);
    expect(auditRows).toHaveLength(1);
    expect(auditRows[0].action).toBe('ENQUIRY_CREATED_DIRECT');
    expect(auditRows[0].entity_type).toBe('enquiry');
  });

  it('does not persist an Enquiry when referential validation fails (fail fast, before any transaction)', async () => {
    const before = await dataSource.query('SELECT COUNT(*)::int AS count FROM enquiries');
    await expect(service.createDirect({ ...validDto(), sourceId: 999999 }, actor)).rejects.toBeInstanceOf(
      ReferentialValidationError,
    );
    const after = await dataSource.query('SELECT COUNT(*)::int AS count FROM enquiries');
    expect(after[0].count).toBe(before[0].count);
  });

  it('two successive Direct Enquiries both succeed (UNIQUE(lead_id) does not collide on NULL)', async () => {
    const first = await service.createDirect(validDto(), actor);
    const second = await service.createDirect(validDto(), actor);
    expect(first.enquiryId).not.toBe(second.enquiryId);
    expect(first.leadId).toBeNull();
    expect(second.leadId).toBeNull();
  });

  it('findOwnQueue returns the actor\'s own Direct + Converted Enquiries, newest first', async () => {
    const created = await service.createDirect(validDto(), actor);
    const queue = await service.findOwnQueue(actor);
    expect(queue.some((e) => e.enquiryId === created.enquiryId)).toBe(true);
  });

  // -------------------------------------------------------------------
  // issue #134 — every new Customer Details + Section 1-7 field persists on
  // the created Enquiry, mirroring convert()'s equivalent coverage.
  // -------------------------------------------------------------------
  describe('issue #134: extended field set', () => {
    it('persists the 5 new Customer Details fields (Section 0)', async () => {
      const dto = {
        ...validDto(),
        email: 'asha.rao@example.com',
        customerType: 'Individual' as const,
        city: 'Pune',
        pinCode: '411001',
        preferredLanguage: 'Hindi' as const,
      };
      const enquiry = await service.createDirect(dto, actor);

      expect(enquiry.email).toBe(dto.email);
      expect(enquiry.customerType).toBe(dto.customerType);
      expect(enquiry.city).toBe(dto.city);
      expect(enquiry.pinCode).toBe(dto.pinCode);
      expect(enquiry.preferredLanguage).toBe(dto.preferredLanguage);
    });

    it('defaults the 5 new Customer Details fields to null when omitted', async () => {
      const enquiry = await service.createDirect(validDto(), actor);

      expect(enquiry.email).toBeNull();
      expect(enquiry.customerType).toBeNull();
      expect(enquiry.city).toBeNull();
      expect(enquiry.pinCode).toBeNull();
      expect(enquiry.preferredLanguage).toBeNull();
    });

    it('persists Sections 1-7 fields (mirrors ConvertLeadDto field set)', async () => {
      const dto = {
        ...validDto(),
        fuelType: 'Petrol' as const,
        transmission: 'Manual' as const,
        colorFirstPreference: 'White',
        colorSecondPreference: 'Silver',
        accessoriesInterest: 'Sunroof',
        competitorConsideration: 'Rival X',
        contactVerified: 'OTP Verified' as const,
        intentRating: 'Hot' as const,
        expectedClosureDate: '2026-08-01',
        showroomVisits: '1' as const,
        quotationNumber: 'Q-1001',
        quotedOnRoadPrice: 550000,
        discountDiscussed: 'Rs 20,000',
        insurancePreference: 'Dealer In-house' as const,
        extendedWarrantyInterest: 'Interested' as const,
        corporateDiscountEligible: 'Acme Corp',
        financeApplicationStatus: 'Login Done' as const,
        financier: 'HDFC Bank' as const,
        loanAmountSought: 400000,
        tenureAndEmiDiscussed: '60 months',
        exchangeEvaluationStatus: 'Completed' as const,
        exchangeEvaluatedBy: 'DSE A',
        exchangeEvaluatedPrice: 250000,
        exchangeCustomerExpectation: 280000,
        testDriveStatus: 'Completed' as const,
        testDriveDateTime: '2026-08-02T10:30:00.000Z',
        quotationSharedVia: 'WhatsApp' as const,
        testDriveFeedback: 'Positive',
        panCardVerified: true,
        addressProofVerified: true,
        incomeProofVerified: true,
        gstDetailsVerified: true,
      };
      const enquiry = await service.createDirect(dto, actor);

      expect(enquiry.fuelType).toBe(dto.fuelType);
      expect(enquiry.transmission).toBe(dto.transmission);
      expect(enquiry.colorFirstPreference).toBe(dto.colorFirstPreference);
      expect(enquiry.colorSecondPreference).toBe(dto.colorSecondPreference);
      expect(enquiry.accessoriesInterest).toBe(dto.accessoriesInterest);
      expect(enquiry.competitorConsideration).toBe(dto.competitorConsideration);
      expect(enquiry.contactVerified).toBe(dto.contactVerified);
      expect(enquiry.intentRating).toBe(dto.intentRating);
      expect(enquiry.expectedClosureDate).toBe(dto.expectedClosureDate);
      expect(enquiry.showroomVisits).toBe(dto.showroomVisits);
      expect(enquiry.quotationNumber).toBe(dto.quotationNumber);
      expect(enquiry.quotedOnRoadPrice).toBe(dto.quotedOnRoadPrice);
      expect(enquiry.discountDiscussed).toBe(dto.discountDiscussed);
      expect(enquiry.insurancePreference).toBe(dto.insurancePreference);
      expect(enquiry.extendedWarrantyInterest).toBe(dto.extendedWarrantyInterest);
      expect(enquiry.corporateDiscountEligible).toBe(dto.corporateDiscountEligible);
      expect(enquiry.financeApplicationStatus).toBe(dto.financeApplicationStatus);
      expect(enquiry.financier).toBe(dto.financier);
      expect(enquiry.loanAmountSought).toBe(dto.loanAmountSought);
      expect(enquiry.tenureAndEmiDiscussed).toBe(dto.tenureAndEmiDiscussed);
      expect(enquiry.exchangeEvaluationStatus).toBe(dto.exchangeEvaluationStatus);
      expect(enquiry.exchangeEvaluatedBy).toBe(dto.exchangeEvaluatedBy);
      expect(enquiry.exchangeEvaluatedPrice).toBe(dto.exchangeEvaluatedPrice);
      expect(enquiry.exchangeCustomerExpectation).toBe(dto.exchangeCustomerExpectation);
      expect(enquiry.testDriveStatus).toBe(dto.testDriveStatus);
      expect(enquiry.testDriveDateTime?.toISOString()).toBe(dto.testDriveDateTime);
      expect(enquiry.quotationSharedVia).toBe(dto.quotationSharedVia);
      expect(enquiry.testDriveFeedback).toBe(dto.testDriveFeedback);
      expect(enquiry.panCardVerified).toBe(true);
      expect(enquiry.addressProofVerified).toBe(true);
      expect(enquiry.incomeProofVerified).toBe(true);
      expect(enquiry.gstDetailsVerified).toBe(true);
    });

    it('defaults the 4 Document Checklist booleans to false when omitted', async () => {
      const enquiry = await service.createDirect(validDto(), actor);
      expect(enquiry.panCardVerified).toBe(false);
      expect(enquiry.addressProofVerified).toBe(false);
      expect(enquiry.incomeProofVerified).toBe(false);
      expect(enquiry.gstDetailsVerified).toBe(false);
    });
  });

  // -------------------------------------------------------------------
  // issue #29 (FR-06, AC3) — mirrors leads.service.spec.ts's duplicate-audit
  // block exactly.
  // -------------------------------------------------------------------
  describe('duplicate-mobile audit note (issue #29)', () => {
    it('still creates the Direct Enquiry when a duplicate mobile exists (advisory only, never blocks)', async () => {
      const sharedMobile = '9444400001';
      const first = await service.createDirect({ ...validDto(), mobile: sharedMobile }, actor);
      const second = await service.createDirect({ ...validDto(), mobile: sharedMobile }, actor);
      expect(second.enquiryId).not.toBe(first.enquiryId);
    });

    it('writes DUPLICATE_OVERRIDE_UNACKNOWLEDGED when a duplicate exists and acknowledgeDuplicate is absent', async () => {
      const sharedMobile = '9444400002';
      await service.createDirect({ ...validDto(), mobile: sharedMobile }, actor);
      const second = await service.createDirect({ ...validDto(), mobile: sharedMobile }, actor);

      const auditRows = await dataSource.query(
        'SELECT * FROM audit_log WHERE entity_id = $1 AND action = $2',
        [second.enquiryId, 'DUPLICATE_OVERRIDE_UNACKNOWLEDGED'],
      );
      expect(auditRows).toHaveLength(1);
      expect(auditRows[0].entity_type).toBe('enquiry');
    });

    it('writes DUPLICATE_OVERRIDE_ACKNOWLEDGED when a duplicate exists and acknowledgeDuplicate is true', async () => {
      const sharedMobile = '9444400003';
      const first = await service.createDirect({ ...validDto(), mobile: sharedMobile }, actor);
      const second = await service.createDirect(
        { ...validDto(), mobile: sharedMobile, acknowledgeDuplicate: true },
        actor,
      );

      const auditRows = await dataSource.query(
        'SELECT * FROM audit_log WHERE entity_id = $1 AND action = $2',
        [second.enquiryId, 'DUPLICATE_OVERRIDE_ACKNOWLEDGED'],
      );
      expect(auditRows).toHaveLength(1);
      const after = typeof auditRows[0].after === 'string' ? JSON.parse(auditRows[0].after) : auditRows[0].after;
      expect(after.matchedIds).toContain(first.enquiryId);
    });

    it('writes no duplicate-audit row when the mobile is not a duplicate', async () => {
      const uniqueMobile = '9444400004';
      const saved = await service.createDirect(
        { ...validDto(), mobile: uniqueMobile, acknowledgeDuplicate: true },
        actor,
      );

      const auditRows = await dataSource.query(
        "SELECT * FROM audit_log WHERE entity_id = $1 AND action LIKE 'DUPLICATE_OVERRIDE%'",
        [saved.enquiryId],
      );
      expect(auditRows).toHaveLength(0);
    });
  });
});
