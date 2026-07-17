/**
 * RED->GREEN (Inside-Out, Infrastructure + Service Layer) — issue #29 Task
 * 1.2/1.3 (AC1/AC4/AC6/AC7). Integration tests against the real (pg-mem-
 * backed) TypeORM DataSource, mirroring lead.repository.spec.ts /
 * leads.service.spec.ts's structure/pattern.
 */
import { DataSource } from 'typeorm';
import { createTestDataSource } from '../support/test-data-source';
import { seedTestFixtures, SeedResult } from '../../src/seeds/test-seed';
import { DuplicatesRepository } from '../../src/duplicates/duplicates.repository';
import { DuplicatesService } from '../../src/duplicates/duplicates.service';
import { LeadsRepository } from '../../src/leads/leads.repository';
import { EnquiriesRepository } from '../../src/enquiries/enquiries.repository';
import { LEAD_STATUS_CONVERTED } from '../../src/leads/entities/lead.entity';
import { ENQUIRY_ENTRY_TYPE_DIRECT, ENQUIRY_ENTRY_TYPE_CONVERTED } from '../../src/enquiries/entities/enquiry.entity';

describe('Duplicate detection (issue #29, Task 1.2/1.3)', () => {
  let dataSource: DataSource;
  let seed: SeedResult;
  let duplicatesRepository: DuplicatesRepository;
  let duplicatesService: DuplicatesService;
  let leadsRepository: LeadsRepository;
  let enquiriesRepository: EnquiriesRepository;
  let locationId: string;
  let dealerGroupId: string;
  let otherLocationId: string;
  let otherDealerGroupId: string;
  let dseAId: string;

  beforeAll(async () => {
    dataSource = await createTestDataSource();
    seed = await seedTestFixtures(dataSource);
    duplicatesRepository = new DuplicatesRepository(dataSource);
    duplicatesService = new DuplicatesService(duplicatesRepository);
    leadsRepository = new LeadsRepository(dataSource);
    enquiriesRepository = new EnquiriesRepository(dataSource);

    locationId = Object.keys(seed.locationIds)[0];
    dealerGroupId = Object.keys(seed.dealerGroupIds)[0];
    otherLocationId = Object.keys(seed.locationIds)[1] ?? locationId;
    otherDealerGroupId = Object.keys(seed.dealerGroupIds)[1] ?? dealerGroupId;
    dseAId = seed.users['dseA'].userId;
  });

  afterAll(async () => {
    await dataSource.destroy();
  });

  async function createLead(mobile: string, overrides: Partial<Record<string, unknown>> = {}) {
    return leadsRepository.insert({
      customerName: 'Existing Lead Customer',
      mobile,
      sourceId: seed.sourceIds[0],
      modelId: seed.modelIds[0],
      ownerId: dseAId,
      locationId,
      dealerGroupId,
      createdBy: dseAId,
      ...overrides,
    });
  }

  async function createDirectEnquiry(mobile: string, overrides: Partial<Record<string, unknown>> = {}) {
    return enquiriesRepository.insert({
      leadId: null,
      entryType: ENQUIRY_ENTRY_TYPE_DIRECT,
      customerName: 'Existing Enquiry Customer',
      mobile,
      sourceId: seed.sourceIds[0],
      modelId: seed.modelIds[0],
      budget: 500000,
      variant: 'LX',
      exchangeInterest: false,
      financeInterest: false,
      convertedBy: dseAId,
      ownerId: dseAId,
      locationId,
      dealerGroupId,
      ...overrides,
    });
  }

  // -------------------------------------------------------------------
  // DuplicatesRepository.findOpenLeadsByMobile
  // -------------------------------------------------------------------
  describe('DuplicatesRepository.findOpenLeadsByMobile', () => {
    it('finds an open (non-Converted) Lead by exact mobile match', async () => {
      const mobile = '9700000001';
      const lead = await createLead(mobile);
      const results = await duplicatesRepository.findOpenLeadsByMobile(mobile, locationId);
      expect(results.map((l) => l.leadId)).toContain(lead.leadId);
    });

    it('excludes a Converted Lead (AC4 "open" Leads only)', async () => {
      const mobile = '9700000002';
      const lead = await createLead(mobile, { status: LEAD_STATUS_CONVERTED });
      const results = await duplicatesRepository.findOpenLeadsByMobile(mobile, locationId);
      expect(results.map((l) => l.leadId)).not.toContain(lead.leadId);
    });

    it('does not match a different mobile number (AC7 exact match, no fuzzy matching)', async () => {
      const mobile = '9700000003';
      await createLead(mobile);
      const results = await duplicatesRepository.findOpenLeadsByMobile('9700000004', locationId);
      expect(results).toHaveLength(0);
    });

    it('does not leak a matching Lead from a different location (tenant-scoped)', async () => {
      const mobile = '9700000005';
      const lead = await createLead(mobile, { locationId: otherLocationId, dealerGroupId: otherDealerGroupId });
      const results = await duplicatesRepository.findOpenLeadsByMobile(mobile, locationId);
      expect(results.map((l) => l.leadId)).not.toContain(lead.leadId);
    });
  });

  // -------------------------------------------------------------------
  // DuplicatesRepository.findOpenDirectEnquiriesByMobile
  // -------------------------------------------------------------------
  describe('DuplicatesRepository.findOpenDirectEnquiriesByMobile', () => {
    it('finds a Direct Enquiry by exact mobile match', async () => {
      const mobile = '9700000011';
      const enquiry = await createDirectEnquiry(mobile);
      const results = await duplicatesRepository.findOpenDirectEnquiriesByMobile(mobile, locationId);
      expect(results.map((e) => e.enquiryId)).toContain(enquiry.enquiryId);
    });

    it('does not leak a matching Direct Enquiry from a different location', async () => {
      const mobile = '9700000012';
      const enquiry = await createDirectEnquiry(mobile, {
        locationId: otherLocationId,
        dealerGroupId: otherDealerGroupId,
      });
      const results = await duplicatesRepository.findOpenDirectEnquiriesByMobile(mobile, locationId);
      expect(results.map((e) => e.enquiryId)).not.toContain(enquiry.enquiryId);
    });

    it('does not match a Converted-type Enquiry row on the (client-independent) mobile column (only DIRECT carries its own mobile)', async () => {
      // A CONVERTED enquiry never has its own `mobile` populated in real
      // usage (EnquiryEntity doc comment) — this proves the entryType
      // filter itself, defensively, against a row that happens to carry one.
      const mobile = '9700000013';
      const lead = await createLead('9700000013');
      const enquiry = await createDirectEnquiry(mobile, {
        leadId: lead.leadId,
        entryType: ENQUIRY_ENTRY_TYPE_CONVERTED,
      });
      const results = await duplicatesRepository.findOpenDirectEnquiriesByMobile(mobile, locationId);
      expect(results.map((e) => e.enquiryId)).not.toContain(enquiry.enquiryId);
    });
  });

  // -------------------------------------------------------------------
  // DuplicatesService.findMatches
  // -------------------------------------------------------------------
  describe('DuplicatesService.findMatches', () => {
    it('returns both a matching open Lead and a matching Direct Enquiry, typed and labeled', async () => {
      const mobile = '9700000021';
      const lead = await createLead(mobile, { customerName: 'Lead Match' });
      const enquiry = await createDirectEnquiry(mobile, { customerName: 'Enquiry Match' });

      const matches = await duplicatesService.findMatches(mobile, locationId);

      const leadMatch = matches.find((m) => m.id === lead.leadId);
      const enquiryMatch = matches.find((m) => m.id === enquiry.enquiryId);
      expect(leadMatch).toMatchObject({ type: 'LEAD', label: 'Lead Match', status: 'New' });
      expect(enquiryMatch).toMatchObject({ type: 'ENQUIRY', label: 'Enquiry Match', status: 'New' });
    });

    it('returns an empty array when there is no matching record', async () => {
      const matches = await duplicatesService.findMatches('9700000099', locationId);
      expect(matches).toEqual([]);
    });

    it('normalizes the input mobile before matching (AC7) — a spaced/dashed value still matches an exact-stored number', async () => {
      const mobile = '9700000031';
      const lead = await createLead(mobile);
      const matches = await duplicatesService.findMatches('970-000-0031', locationId);
      expect(matches.map((m) => m.id)).toContain(lead.leadId);
    });
  });
});
