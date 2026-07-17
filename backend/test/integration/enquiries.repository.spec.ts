/**
 * RED->GREEN (Inside-Out, Infrastructure Layer) — Task 2.3.1/2.3.3 (issue #25).
 * Repository test: insert persists all fields incl. server-derived defaults &
 * JSONB default, called directly WITHOUT a transactional manager (mirrors
 * lead.repository.spec.ts) so both branches of the `manager ?? dataSource.manager`
 * choke-point are exercised (the WITH-manager path is covered by
 * enquiries.service.spec.ts's transactional convert() calls).
 */
import { DataSource } from 'typeorm';
import { createTestDataSource } from '../support/test-data-source';
import { seedTestFixtures, SeedResult } from '../../src/seeds/test-seed';
import { LeadsRepository } from '../../src/leads/leads.repository';
import { EnquiriesRepository } from '../../src/enquiries/enquiries.repository';
import { ENQUIRY_STATUS_NEW } from '../../src/enquiries/entities/enquiry.entity';

describe('EnquiriesRepository (Task 2.3.1/2.3.3)', () => {
  let dataSource: DataSource;
  let seed: SeedResult;
  let leadsRepository: LeadsRepository;
  let repository: EnquiriesRepository;

  beforeAll(async () => {
    dataSource = await createTestDataSource();
    seed = await seedTestFixtures(dataSource);
    leadsRepository = new LeadsRepository(dataSource);
    repository = new EnquiriesRepository(dataSource);
  });

  afterAll(async () => {
    await dataSource.destroy();
  });

  it('insert (no manager) persists all fields including server-derived defaults and JSONB custom_fields default', async () => {
    const dseA = seed.users['dseA'];
    const locationId = Object.keys(seed.locationIds)[0];
    const dealerGroupId = Object.keys(seed.dealerGroupIds)[0];

    const lead = await leadsRepository.insert({
      customerName: 'Repo Direct Insert',
      mobile: '9876511111',
      sourceId: seed.sourceIds[0],
      modelId: seed.modelIds[0],
      ownerId: dseA.userId,
      locationId,
      dealerGroupId,
      createdBy: dseA.userId,
    });

    const enquiry = await repository.insert({
      leadId: lead.leadId,
      budget: 650000,
      variant: 'ZXi',
      exchangeInterest: false,
      financeInterest: true,
      convertedBy: dseA.userId,
      ownerId: dseA.userId,
      locationId,
      dealerGroupId,
      status: ENQUIRY_STATUS_NEW,
      customFields: {},
    });

    expect(enquiry.enquiryId).toBeDefined();
    expect(enquiry.leadId).toBe(lead.leadId);
    expect(enquiry.budget).toBe(650000);
    expect(typeof enquiry.budget).toBe('number');
    expect(enquiry.status).toBe(ENQUIRY_STATUS_NEW);
    expect(enquiry.customFields).toEqual({});
  });

  /**
   * RED->GREEN (Inside-Out, Infrastructure Layer) — issue #32 (AC3-AC6:
   * role-scoped Follow-up history visibility). `findVisibleById` is the
   * role-aware eligibility boundary FollowupsService.findByEnquiry now uses
   * in place of the DSE-only `findOwnedById` (unchanged, still used by the
   * write/logFollowup path). See .phoenix-os/project/specs/32/NOTES.md for
   * the full location/dealer-group-as-team/org-proxy rationale.
   */
  describe('findVisibleById (issue #32, AC3-AC6)', () => {
    let dseA: { userId: string; locationId: string; dealerGroupId: string };
    let dseB: { userId: string; locationId: string; dealerGroupId: string };
    let dseC: { userId: string; locationId: string; dealerGroupId: string };
    let tlLoc1: { userId: string; locationId: string; dealerGroupId: string };
    let tlLoc2: { userId: string; locationId: string; dealerGroupId: string };
    let smgmGroup1: { userId: string; locationId: string; dealerGroupId: string };
    let smgmGroup2: { userId: string; locationId: string; dealerGroupId: string };
    let enquiryOwnedByDseA: { enquiryId: string };

    beforeAll(() => {
      const loc1 = Object.keys(seed.locationIds)[0];
      const dg1 = Object.keys(seed.dealerGroupIds)[0];
      const loc2 = Object.keys(seed.locationIds)[1];
      const dg2 = Object.keys(seed.dealerGroupIds)[1];

      dseA = { userId: seed.users['dseA'].userId, locationId: loc1, dealerGroupId: dg1 };
      dseB = { userId: seed.users['dseB'].userId, locationId: loc1, dealerGroupId: dg1 };
      dseC = { userId: seed.users['dseC'].userId, locationId: loc2, dealerGroupId: dg2 };
      tlLoc1 = { userId: seed.users['tlLoc1'].userId, locationId: loc1, dealerGroupId: dg1 };
      tlLoc2 = { userId: seed.users['tlLoc2'].userId, locationId: loc2, dealerGroupId: dg2 };
      smgmGroup1 = {
        userId: seed.users['smgmGroup1'].userId,
        locationId: '33333333-0000-0000-0000-000000000032',
        dealerGroupId: dg1,
      };
      smgmGroup2 = { userId: seed.users['smgmGroup2'].userId, locationId: loc2, dealerGroupId: dg2 };
    });

    beforeEach(async () => {
      enquiryOwnedByDseA = await repository.insert({
        leadId: null,
        entryType: 'DIRECT',
        customerName: 'Visibility Target',
        mobile: `96${Math.floor(10000000 + Math.random() * 89999999)}`,
        budget: 400000,
        variant: 'VX',
        exchangeInterest: false,
        financeInterest: false,
        convertedBy: dseA.userId,
        ownerId: dseA.userId,
        locationId: dseA.locationId,
        dealerGroupId: dseA.dealerGroupId,
        status: ENQUIRY_STATUS_NEW,
        customFields: {},
      });
    });

    it('DSE: sees an Enquiry it owns', async () => {
      const found = await repository.findVisibleById(enquiryOwnedByDseA.enquiryId, {
        userId: dseA.userId,
        role: 'DSE',
        locationId: dseA.locationId,
        dealerGroupId: dseA.dealerGroupId,
        capabilities: [],
      });
      expect(found?.enquiryId).toBe(enquiryOwnedByDseA.enquiryId);
    });

    it('DSE: does NOT see an Enquiry owned by a different DSE, even in the same location (owner-scoped, unchanged)', async () => {
      const found = await repository.findVisibleById(enquiryOwnedByDseA.enquiryId, {
        userId: dseB.userId,
        role: 'DSE',
        locationId: dseB.locationId,
        dealerGroupId: dseB.dealerGroupId,
        capabilities: [],
      });
      expect(found).toBeNull();
    });

    it("TL: sees a same-location Enquiry it does not own (location proxy for 'team')", async () => {
      const found = await repository.findVisibleById(enquiryOwnedByDseA.enquiryId, {
        userId: tlLoc1.userId,
        role: 'TL',
        locationId: tlLoc1.locationId,
        dealerGroupId: tlLoc1.dealerGroupId,
        capabilities: [],
      });
      expect(found?.enquiryId).toBe(enquiryOwnedByDseA.enquiryId);
    });

    it('TL: does NOT see an Enquiry at a different location (AC6 denial)', async () => {
      const found = await repository.findVisibleById(enquiryOwnedByDseA.enquiryId, {
        userId: tlLoc2.userId,
        role: 'TL',
        locationId: tlLoc2.locationId,
        dealerGroupId: tlLoc2.dealerGroupId,
        capabilities: [],
      });
      expect(found).toBeNull();
    });

    it("SM/GM: sees a same-dealer-group Enquiry at a DIFFERENT location ('org hierarchy' proxy)", async () => {
      const found = await repository.findVisibleById(enquiryOwnedByDseA.enquiryId, {
        userId: smgmGroup1.userId,
        role: 'SM-GM',
        locationId: smgmGroup1.locationId,
        dealerGroupId: smgmGroup1.dealerGroupId,
        capabilities: [],
      });
      expect(found?.enquiryId).toBe(enquiryOwnedByDseA.enquiryId);
    });

    it('SM/GM: does NOT see an Enquiry in a different dealer group (AC6 denial)', async () => {
      const found = await repository.findVisibleById(enquiryOwnedByDseA.enquiryId, {
        userId: smgmGroup2.userId,
        role: 'SM-GM',
        locationId: smgmGroup2.locationId,
        dealerGroupId: smgmGroup2.dealerGroupId,
        capabilities: [],
      });
      expect(found).toBeNull();
    });

    it('returns null for a non-existent enquiryId regardless of role', async () => {
      const found = await repository.findVisibleById('00000000-0000-0000-0000-000000000000', {
        userId: smgmGroup1.userId,
        role: 'SM-GM',
        locationId: smgmGroup1.locationId,
        dealerGroupId: smgmGroup1.dealerGroupId,
        capabilities: [],
      });
      expect(found).toBeNull();
    });
  });
});
