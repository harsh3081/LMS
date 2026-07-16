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
import { LEAD_STATUS_NEW } from '../../src/leads/entities/lead.entity';

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
});
