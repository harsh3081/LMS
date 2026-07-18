/**
 * RED->GREEN (Inside-Out, Experience/API Layer) — issue #116, AC1.
 * GET /api/v1/leads (the owner-scoped queue) must return denormalized
 * sourceName/modelName/ownerName alongside the raw ids, and must resolve
 * them with a bounded number of queries regardless of queue size (no N+1) —
 * mirrors leads-queue.controller.spec.ts's structure/conventions, kept in
 * its own file so that frozen-in-spirit #24/#25 suite stays untouched.
 */
import request from 'supertest';
import { DataSource } from 'typeorm';
import { createTestApp, closeTestApp, TestAppContext } from '../support/test-app';
import { loginAgent } from '../support/auth-agent';
import { LeadSourceEntity } from '../../src/lead-sources/entities/lead-source.entity';
import { VehicleModelEntity } from '../../src/vehicle-models/entities/vehicle-model.entity';
import { UserEntity } from '../../src/users/entities/user.entity';

const LEADS_PATH = '/api/v1/leads';

describe('GET /api/v1/leads — denormalized names (issue #116, AC1)', () => {
  let ctx: TestAppContext;
  let dseAAgent: ReturnType<typeof request.agent>;
  let adminAgent: ReturnType<typeof request.agent>;

  const payload = (overrides: Record<string, unknown> = {}) => ({
    customerName: `Names Test ${Date.now()}-${Math.random()}`,
    mobile: (() => {
      const leading = ['6', '7', '8', '9'][Math.floor(Math.random() * 4)];
      const rest = Array.from({ length: 9 }, () => Math.floor(Math.random() * 10)).join('');
      return `${leading}${rest}`;
    })(),
    sourceId: 1,
    modelId: 101,
    communicationConsentVerified: true,
    ...overrides,
  });

  beforeAll(async () => {
    ctx = await createTestApp();
    const dseA = ctx.seed.users['dseA'];
    const admin = ctx.seed.users['admin'];
    dseAAgent = await loginAgent(ctx.app, dseA.email, dseA.password);
    adminAgent = await loginAgent(ctx.app, admin.email, admin.password);
  });

  afterAll(async () => {
    await closeTestApp(ctx);
  });

  it('AC1: resolves sourceId/modelId/ownerId to sourceName/modelName/ownerName', async () => {
    const created = await dseAAgent.post(LEADS_PATH).send(payload({ sourceId: 1, modelId: 101 }));
    expect(created.status).toBe(201);

    const queue = await dseAAgent.get(LEADS_PATH);
    expect(queue.status).toBe(200);
    const row = queue.body.find((l: { leadId: string }) => l.leadId === created.body.leadId);
    expect(row).toBeDefined();
    expect(row.sourceName).toBe('Walk-in');
    expect(row.modelName).toBe('Compact Hatchback LX');
    expect(row.ownerName).toBe('Dealer Sales Executive Loc1-A');
  });

  it('AC1: a lead with a null sourceId/modelId returns null names, not an error', async () => {
    // sourceId/modelId default to mandatory=true (field-config, issue #27) —
    // relax them via the admin PUT so this test can omit both.
    const relax = await adminAgent.put('/api/v1/field-config').send({
      fields: [
        { fieldName: 'sourceId', mandatory: false },
        { fieldName: 'modelId', mandatory: false },
      ],
    });
    expect(relax.status).toBe(200);

    const created = await dseAAgent.post(LEADS_PATH).send({
      customerName: 'No Source Or Model',
      mobile: payload().mobile,
      communicationConsentVerified: true,
    });
    expect(created.status).toBe(201);

    const queue = await dseAAgent.get(LEADS_PATH);
    const row = queue.body.find((l: { leadId: string }) => l.leadId === created.body.leadId);
    expect(row).toBeDefined();
    expect(row.sourceId).toBeNull();
    expect(row.sourceName).toBeNull();
    expect(row.modelId).toBeNull();
    expect(row.modelName).toBeNull();
    // ownerId is always server-derived/non-null, so ownerName still resolves.
    expect(row.ownerName).toBe('Dealer Sales Executive Loc1-A');
  });

  it('AC1: does not N+1 — resolves names for many leads in a bounded number of master-table queries', async () => {
    // Create several leads with varying (but from a small, fixed pool of)
    // sourceId/modelId so the batched IN(...) queries have real work to do.
    const sourceModelPairs = [
      [1, 101],
      [2, 102],
      [3, 103],
      [1, 102],
      [4, 101],
    ];
    for (const [sourceId, modelId] of sourceModelPairs) {
      const res = await dseAAgent.post(LEADS_PATH).send(payload({ sourceId, modelId }));
      expect(res.status).toBe(201);
    }

    // Spy directly on each master-table repository's `.find` — TypeORM
    // caches one repository instance per entity per DataSource, so these
    // spies see every call LeadsService.attachNames makes, however many
    // Leads end up in the queue.
    const dataSource: DataSource = ctx.dataSource;
    const sourceFindSpy = jest.spyOn(dataSource.getRepository(LeadSourceEntity), 'find');
    const modelFindSpy = jest.spyOn(dataSource.getRepository(VehicleModelEntity), 'find');
    const ownerFindSpy = jest.spyOn(dataSource.getRepository(UserEntity), 'find');

    const queue = await dseAAgent.get(LEADS_PATH);
    expect(queue.status).toBe(200);
    expect(queue.body.length).toBeGreaterThanOrEqual(sourceModelPairs.length);

    // Exactly one batched IN(...) call per master table — NOT one per row
    // (that would be `sourceModelPairs.length` or more calls each).
    expect(sourceFindSpy).toHaveBeenCalledTimes(1);
    expect(modelFindSpy).toHaveBeenCalledTimes(1);
    expect(ownerFindSpy).toHaveBeenCalledTimes(1);

    sourceFindSpy.mockRestore();
    modelFindSpy.mockRestore();
    ownerFindSpy.mockRestore();
  });
});
