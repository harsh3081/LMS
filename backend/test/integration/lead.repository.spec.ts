/**
 * RED->GREEN (Inside-Out, Infrastructure Layer) — Task 1.2.3 / 1.3.3.
 * Repository test: insert persists all fields incl. server-derived defaults
 * & JSONB default; owner-scoped find is the tenant-scope choke-point
 * (ref-code.md Sample 3 / tech-design.md Component 3, AC6).
 */
import { DataSource } from 'typeorm';
import { createTestDataSource } from '../support/test-data-source';
import { seedTestFixtures, SeedResult } from '../../src/seeds/test-seed';
import { LeadsRepository } from '../../src/leads/leads.repository';
import { LEAD_STATUS_NEW, LEAD_STATUS_CONVERTED } from '../../src/leads/entities/lead.entity';

describe('LeadsRepository (Task 1.2.3 / 1.3.3)', () => {
  let dataSource: DataSource;
  let seed: SeedResult;
  let repository: LeadsRepository;

  beforeAll(async () => {
    dataSource = await createTestDataSource();
    seed = await seedTestFixtures(dataSource);
    repository = new LeadsRepository(dataSource);
  });

  afterAll(async () => {
    await dataSource.destroy();
  });

  it('insert persists all fields including server-derived defaults and the JSONB custom_fields default', async () => {
    const dseA = seed.users['dseA'];
    const saved = await repository.insert({
      customerName: 'Asha Rao',
      mobile: '9876543210',
      sourceId: seed.sourceIds[0],
      modelId: seed.modelIds[0],
      ownerId: dseA.userId,
      locationId: Object.keys(seed.locationIds)[0],
      dealerGroupId: Object.keys(seed.dealerGroupIds)[0],
      createdBy: dseA.userId,
    });

    expect(saved.leadId).toBeDefined();
    expect(saved.status).toBe(LEAD_STATUS_NEW);
    expect(saved.customFields).toEqual({});
    expect(saved.customerName).toBe('Asha Rao');
    expect(saved.mobile).toBe('9876543210');
  });

  it('findOwnQueue returns only the given owner+location+dealerGroup scoped leads, newest first', async () => {
    const dseA = seed.users['dseA'];
    const dseB = seed.users['dseB'];
    const locationId = Object.keys(seed.locationIds)[0];
    const dealerGroupId = Object.keys(seed.dealerGroupIds)[0];

    const first = await repository.insert({
      customerName: 'Owner Queue First',
      mobile: '9876500001',
      sourceId: seed.sourceIds[0],
      modelId: seed.modelIds[0],
      ownerId: dseA.userId,
      locationId,
      dealerGroupId,
      createdBy: dseA.userId,
    });
    const second = await repository.insert({
      customerName: 'Owner Queue Second',
      mobile: '9876500002',
      sourceId: seed.sourceIds[0],
      modelId: seed.modelIds[0],
      ownerId: dseA.userId,
      locationId,
      dealerGroupId,
      createdBy: dseA.userId,
    });
    // A different owner's lead in the same location must not leak in.
    await repository.insert({
      customerName: 'Other Owner Lead',
      mobile: '9876500003',
      sourceId: seed.sourceIds[0],
      modelId: seed.modelIds[0],
      ownerId: dseB.userId,
      locationId,
      dealerGroupId,
      createdBy: dseB.userId,
    });

    const queue = await repository.findOwnQueue({
      userId: dseA.userId,
      locationId,
      dealerGroupId,
      role: 'DSE',
      capabilities: ['create-lead'],
    });

    const ids = queue.map((l) => l.leadId);
    expect(ids).toContain(first.leadId);
    expect(ids).toContain(second.leadId);
    expect(ids).not.toContain(undefined);
    expect(queue.every((l) => l.ownerId === dseA.userId)).toBe(true);
    // newest first
    expect(queue.findIndex((l) => l.leadId === second.leadId)).toBeLessThan(
      queue.findIndex((l) => l.leadId === first.leadId),
    );
  });

  // -------------------------------------------------------------------
  // Task 2.3.1 / 2.3.2 (issue #25) — findOwnedById: status-agnostic
  // scoped single-Lead load backing the convert action (404 vs 409).
  // -------------------------------------------------------------------
  it('findOwnedById returns the owner+tenant-scoped Lead regardless of status', async () => {
    const dseA = seed.users['dseA'];
    const locationId = Object.keys(seed.locationIds)[0];
    const dealerGroupId = Object.keys(seed.dealerGroupIds)[0];
    const actor = { userId: dseA.userId, locationId, dealerGroupId, role: 'DSE', capabilities: ['convert-lead'] };

    const lead = await repository.insert({
      customerName: 'Findable Lead',
      mobile: '9876500011',
      sourceId: seed.sourceIds[0],
      modelId: seed.modelIds[0],
      ownerId: dseA.userId,
      locationId,
      dealerGroupId,
      createdBy: dseA.userId,
    });

    const found = await repository.findOwnedById(lead.leadId, actor);
    expect(found?.leadId).toBe(lead.leadId);

    // A Converted lead must still be returned (so the service can 409, not 404).
    await dataSource.query('UPDATE leads SET status = $1 WHERE lead_id = $2', [LEAD_STATUS_CONVERTED, lead.leadId]);
    const foundAfterConvert = await repository.findOwnedById(lead.leadId, actor);
    expect(foundAfterConvert?.status).toBe(LEAD_STATUS_CONVERTED);
  });

  it('findOwnedById returns null for an out-of-scope (other owner/location) leadId', async () => {
    const dseA = seed.users['dseA'];
    const dseC = seed.users['dseC'];
    const locationIdA = Object.keys(seed.locationIds)[0];
    const dealerGroupIdA = Object.keys(seed.dealerGroupIds)[0];
    const locationIdC = Object.keys(seed.locationIds)[1] ?? locationIdA;
    const dealerGroupIdC = Object.keys(seed.dealerGroupIds)[1] ?? dealerGroupIdA;

    const lead = await repository.insert({
      customerName: 'Other Owner Lead 2',
      mobile: '9876500012',
      sourceId: seed.sourceIds[0],
      modelId: seed.modelIds[0],
      ownerId: dseA.userId,
      locationId: locationIdA,
      dealerGroupId: dealerGroupIdA,
      createdBy: dseA.userId,
    });

    const foundByOther = await repository.findOwnedById(lead.leadId, {
      userId: dseC.userId,
      locationId: locationIdC,
      dealerGroupId: dealerGroupIdC,
      role: 'DSE',
      capabilities: ['convert-lead'],
    });
    expect(foundByOther).toBeNull();

    const foundNonExistent = await repository.findOwnedById('00000000-0000-0000-0000-000000000000', {
      userId: dseA.userId,
      locationId: locationIdA,
      dealerGroupId: dealerGroupIdA,
      role: 'DSE',
      capabilities: ['convert-lead'],
    });
    expect(foundNonExistent).toBeNull();
  });

  // -------------------------------------------------------------------
  // Task 3.1.2 (issue #25) — findOwnQueue excludes Converted leads (AC5).
  // -------------------------------------------------------------------
  it('findOwnQueue excludes Converted leads but keeps other non-Converted leads (AC5)', async () => {
    const dseA = seed.users['dseA'];
    const locationId = Object.keys(seed.locationIds)[0];
    const dealerGroupId = Object.keys(seed.dealerGroupIds)[0];

    const openLead = await repository.insert({
      customerName: 'Still Open',
      mobile: '9876500013',
      sourceId: seed.sourceIds[0],
      modelId: seed.modelIds[0],
      ownerId: dseA.userId,
      locationId,
      dealerGroupId,
      createdBy: dseA.userId,
    });
    const convertedLead = await repository.insert({
      customerName: 'Now Converted',
      mobile: '9876500014',
      sourceId: seed.sourceIds[0],
      modelId: seed.modelIds[0],
      ownerId: dseA.userId,
      locationId,
      dealerGroupId,
      createdBy: dseA.userId,
      status: LEAD_STATUS_CONVERTED,
    });

    const queue = await repository.findOwnQueue({
      userId: dseA.userId,
      locationId,
      dealerGroupId,
      role: 'DSE',
      capabilities: ['convert-lead'],
    });
    const ids = queue.map((l) => l.leadId);
    expect(ids).toContain(openLead.leadId);
    expect(ids).not.toContain(convertedLead.leadId);
  });
});
