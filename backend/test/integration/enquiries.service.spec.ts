/**
 * RED->GREEN (Inside-Out, Service Layer) — Task 2.4.1 (issue #25).
 * Integration tests against the real (pg-mem-backed) TypeORM DataSource — no
 * mocking of the DB, mirroring leads.service.spec.ts's structure/pattern.
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
import { LeadNotFoundError, LeadAlreadyConvertedError } from '../../src/enquiries/enquiries.errors';
import { ENQUIRY_STATUS_NEW } from '../../src/enquiries/entities/enquiry.entity';
import { LEAD_STATUS_CONVERTED } from '../../src/leads/entities/lead.entity';
import { Principal } from '../../src/common/principal';

describe('EnquiriesService (Task 2.4)', () => {
  let dataSource: DataSource;
  let seed: SeedResult;
  let service: EnquiriesService;
  let leadsRepository: LeadsRepository;
  let auditLogRepository: AuditLogRepository;
  let actor: Principal;

  beforeAll(async () => {
    dataSource = await createTestDataSource();
    seed = await seedTestFixtures(dataSource);
    leadsRepository = new LeadsRepository(dataSource);
    auditLogRepository = new AuditLogRepository(dataSource);
    const fieldConfigService = new FieldConfigService(dataSource, new FieldConfigRepository(dataSource), auditLogRepository);
    const duplicatesService = new DuplicatesService(new DuplicatesRepository(dataSource));
    service = new EnquiriesService(
      dataSource,
      new EnquiriesRepository(dataSource),
      leadsRepository,
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
      capabilities: ['convert-lead'],
    };
  });

  afterAll(async () => {
    await dataSource.destroy();
  });

  const validDto = () => ({ budget: 500000, variant: 'VXi (O) CVT', exchangeInterest: true, financeInterest: false });

  async function createLead(overrides: Partial<Record<string, unknown>> = {}) {
    return leadsRepository.insert({
      customerName: 'Asha Rao',
      mobile: `9${Math.floor(100000000 + Math.random() * 899999999)}`,
      sourceId: seed.sourceIds[0],
      modelId: seed.modelIds[0],
      ownerId: actor.userId,
      locationId: actor.locationId,
      dealerGroupId: actor.dealerGroupId,
      createdBy: actor.userId,
      ...overrides,
    });
  }

  it('creates an Enquiry linked to the source Lead with server-derived owner/tenant/convertedBy/status', async () => {
    const lead = await createLead();
    const enquiry = await service.convert(lead.leadId, validDto(), actor);

    expect(enquiry.leadId).toBe(lead.leadId);
    expect(enquiry.ownerId).toBe(actor.userId);
    expect(enquiry.locationId).toBe(actor.locationId);
    expect(enquiry.dealerGroupId).toBe(actor.dealerGroupId);
    expect(enquiry.convertedBy).toBe(actor.userId);
    expect(enquiry.status).toBe(ENQUIRY_STATUS_NEW);
    expect(enquiry.budget).toBe(500000);
    expect(enquiry.variant).toBe('VXi (O) CVT');
    expect(enquiry.exchangeInterest).toBe(true);
    expect(enquiry.financeInterest).toBe(false);
    expect(enquiry.convertedAt).toBeDefined();
  });

  it('flips the source Lead status to Converted', async () => {
    const lead = await createLead();
    await service.convert(lead.leadId, validDto(), actor);

    const reloaded = await leadsRepository.findOwnedById(lead.leadId, actor);
    expect(reloaded?.status).toBe(LEAD_STATUS_CONVERTED);
  });

  it('throws LeadNotFoundError for a non-existent leadId', async () => {
    await expect(
      service.convert('00000000-0000-0000-0000-000000000000', validDto(), actor),
    ).rejects.toBeInstanceOf(LeadNotFoundError);
  });

  it('throws LeadNotFoundError for an out-of-scope (other owner) leadId', async () => {
    const dseC = seed.users['dseC'];
    const otherActor: Principal = {
      userId: dseC.userId,
      role: 'DSE',
      locationId: Object.keys(seed.locationIds)[1] ?? actor.locationId,
      dealerGroupId: Object.keys(seed.dealerGroupIds)[1] ?? actor.dealerGroupId,
      capabilities: ['convert-lead'],
    };
    const lead = await createLead();
    await expect(service.convert(lead.leadId, validDto(), otherActor)).rejects.toBeInstanceOf(LeadNotFoundError);
  });

  it('throws LeadAlreadyConvertedError on re-conversion of an already-Converted Lead', async () => {
    const lead = await createLead();
    await service.convert(lead.leadId, validDto(), actor);
    await expect(service.convert(lead.leadId, validDto(), actor)).rejects.toBeInstanceOf(LeadAlreadyConvertedError);
  });

  it('writes an audit_log row (action=LEAD_CONVERTED) with before/after status + enquiryId', async () => {
    const lead = await createLead();
    const enquiry = await service.convert(lead.leadId, validDto(), actor);

    const auditRows = await dataSource.query('SELECT * FROM audit_log WHERE entity_id = $1', [lead.leadId]);
    expect(auditRows).toHaveLength(1);
    expect(auditRows[0].action).toBe('LEAD_CONVERTED');
    const before = typeof auditRows[0].before === 'string' ? JSON.parse(auditRows[0].before) : auditRows[0].before;
    const after = typeof auditRows[0].after === 'string' ? JSON.parse(auditRows[0].after) : auditRows[0].after;
    expect(before.status).toBe('New');
    expect(after.status).toBe(LEAD_STATUS_CONVERTED);
    expect(after.enquiryId).toBe(enquiry.enquiryId);
  });

  it('uses a single DataSource transaction spanning the Enquiry insert, Lead flip, and audit write', async () => {
    const lead = await createLead();
    const transactionSpy = jest.spyOn(dataSource, 'transaction');
    await service.convert(lead.leadId, validDto(), actor);
    expect(transactionSpy).toHaveBeenCalledTimes(1);
    transactionSpy.mockRestore();
  });

  it('does not persist an Enquiry when the eligibility check fails (fail fast, before any transaction)', async () => {
    const before = await dataSource.query('SELECT COUNT(*)::int AS count FROM enquiries');
    await expect(
      service.convert('00000000-0000-0000-0000-000000000000', validDto(), actor),
    ).rejects.toBeInstanceOf(LeadNotFoundError);
    const after = await dataSource.query('SELECT COUNT(*)::int AS count FROM enquiries');
    expect(after[0].count).toBe(before[0].count);
  });

  // ---- issue #124: "Rewrite Convert Lead to Enquiry as a sectioned form" ----
  describe('issue #124 — new sectioned-form fields', () => {
    it('persists every new field across all 6 non-checklist sections when supplied', async () => {
      const lead = await createLead();
      const enquiry = await service.convert(
        lead.leadId,
        {
          ...validDto(),
          modelId: seed.modelIds[0],
          fuelType: 'Petrol',
          transmission: 'Automatic',
          colorFirstPreference: 'Pearl White',
          colorSecondPreference: 'Metallic Grey',
          accessoriesInterest: 'Roof rails, seat covers',
          competitorConsideration: 'Rival Model X',
          contactVerified: 'OTP Verified',
          intentRating: 'Hot',
          expectedClosureDate: '2026-08-01',
          showroomVisits: '2',
          quotationNumber: 'QT-1001',
          quotedOnRoadPrice: 560000,
          discountDiscussed: 'Rs 35,000 + corporate offer',
          insurancePreference: 'Dealer In-house',
          extendedWarrantyInterest: 'Interested',
          corporateDiscountEligible: 'Acme Corp',
          financeApplicationStatus: 'Login Done',
          financier: 'HDFC Bank',
          loanAmountSought: 400000,
          tenureAndEmiDiscussed: '60 months, Rs 8,500/mo',
          exchangeEvaluationStatus: 'Completed',
          exchangeEvaluatedBy: 'Yard Inspector A',
          exchangeEvaluatedPrice: 250000,
          exchangeCustomerExpectation: 280000,
          testDriveStatus: 'Scheduled',
          testDriveDateTime: '2026-08-02T10:30:00.000Z',
          quotationSharedVia: 'WhatsApp',
          nextActionOwnerId: actor.userId,
          testDriveFeedback: 'Customer liked the ride quality',
          panCardVerified: true,
          addressProofVerified: true,
          incomeProofVerified: false,
          gstDetailsVerified: false,
        },
        actor,
      );

      expect(enquiry.modelId).toBe(seed.modelIds[0]);
      expect(enquiry.fuelType).toBe('Petrol');
      expect(enquiry.transmission).toBe('Automatic');
      expect(enquiry.colorFirstPreference).toBe('Pearl White');
      expect(enquiry.colorSecondPreference).toBe('Metallic Grey');
      expect(enquiry.accessoriesInterest).toBe('Roof rails, seat covers');
      expect(enquiry.competitorConsideration).toBe('Rival Model X');
      expect(enquiry.contactVerified).toBe('OTP Verified');
      expect(enquiry.intentRating).toBe('Hot');
      expect(enquiry.showroomVisits).toBe('2');
      expect(enquiry.quotationNumber).toBe('QT-1001');
      expect(enquiry.quotedOnRoadPrice).toBe(560000);
      expect(enquiry.discountDiscussed).toBe('Rs 35,000 + corporate offer');
      expect(enquiry.insurancePreference).toBe('Dealer In-house');
      expect(enquiry.extendedWarrantyInterest).toBe('Interested');
      expect(enquiry.corporateDiscountEligible).toBe('Acme Corp');
      expect(enquiry.financeApplicationStatus).toBe('Login Done');
      expect(enquiry.financier).toBe('HDFC Bank');
      expect(enquiry.loanAmountSought).toBe(400000);
      expect(enquiry.tenureAndEmiDiscussed).toBe('60 months, Rs 8,500/mo');
      expect(enquiry.exchangeEvaluationStatus).toBe('Completed');
      expect(enquiry.exchangeEvaluatedBy).toBe('Yard Inspector A');
      expect(enquiry.exchangeEvaluatedPrice).toBe(250000);
      expect(enquiry.exchangeCustomerExpectation).toBe(280000);
      expect(enquiry.testDriveStatus).toBe('Scheduled');
      expect(enquiry.testDriveDateTime).toBeInstanceOf(Date);
      expect(enquiry.quotationSharedVia).toBe('WhatsApp');
      expect(enquiry.nextActionOwnerId).toBe(actor.userId);
      expect(enquiry.testDriveFeedback).toBe('Customer liked the ride quality');
      expect(enquiry.panCardVerified).toBe(true);
      expect(enquiry.addressProofVerified).toBe(true);
      expect(enquiry.incomeProofVerified).toBe(false);
      expect(enquiry.gstDetailsVerified).toBe(false);
    });

    it('every new field defaults to null (booleans to false) when entirely omitted', async () => {
      const lead = await createLead();
      const enquiry = await service.convert(lead.leadId, validDto(), actor);

      expect(enquiry.fuelType).toBeNull();
      expect(enquiry.intentRating).toBeNull();
      expect(enquiry.quotedOnRoadPrice).toBeNull();
      expect(enquiry.financier).toBeNull();
      expect(enquiry.exchangeEvaluationStatus).toBeNull();
      expect(enquiry.testDriveDateTime).toBeNull();
      expect(enquiry.nextActionOwnerId).toBeNull();
      expect(enquiry.panCardVerified).toBe(false);
      expect(enquiry.addressProofVerified).toBe(false);
      expect(enquiry.incomeProofVerified).toBe(false);
      expect(enquiry.gstDetailsVerified).toBe(false);
    });

    it('the original 4 required fields persist unchanged alongside the new optional ones', async () => {
      const lead = await createLead();
      const enquiry = await service.convert(lead.leadId, validDto(), actor);
      expect(enquiry.budget).toBe(500000);
      expect(enquiry.variant).toBe('VXi (O) CVT');
      expect(enquiry.exchangeInterest).toBe(true);
      expect(enquiry.financeInterest).toBe(false);
    });
  });
});
