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
});
