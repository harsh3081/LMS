/**
 * RED->GREEN — Tasks 3.1 / 3.2. Source-list and model-master read paths.
 */
import request from 'supertest';
import { createTestApp, closeTestApp, TestAppContext } from '../support/test-app';
import { loginAgent } from '../support/auth-agent';

describe('Read paths (Task 3.1 / 3.2)', () => {
  let ctx: TestAppContext;
  let dseAAgent: ReturnType<typeof request.agent>;

  beforeAll(async () => {
    ctx = await createTestApp();
    const dseA = ctx.seed.users['dseA'];
    dseAAgent = await loginAgent(ctx.app, dseA.email, dseA.password);
  });

  afterAll(async () => {
    await closeTestApp(ctx);
  });

  it('EVAL-AC5-01: GET /api/v1/lead-sources returns only active sources (excludes Discontinued)', async () => {
    const res = await dseAAgent.get('/api/v1/lead-sources');
    expect(res.status).toBe(200);
    const names = res.body.map((s: { name: string }) => s.name).sort();
    expect(names).toEqual(['Call', 'Online', 'Referral', 'Walk-in'].sort());
  });

  it('EVAL-AC5-03: GET /api/v1/vehicle-models returns the seeded model master', async () => {
    const res = await dseAAgent.get('/api/v1/vehicle-models');
    expect(res.status).toBe(200);
    const names = res.body.map((m: { name: string }) => m.name).sort();
    expect(names).toEqual(['Compact Hatchback LX', 'SUV Adventure Plus', 'Sedan GT'].sort());
  });

  it('unauthenticated read of lead-sources -> 401 (deny-by-default, ADR-003)', async () => {
    const res = await request(ctx.app.getHttpServer()).get('/api/v1/lead-sources');
    expect(res.status).toBe(401);
  });

  it('unauthenticated read of vehicle-models -> 401 (deny-by-default, ADR-003)', async () => {
    const res = await request(ctx.app.getHttpServer()).get('/api/v1/vehicle-models');
    expect(res.status).toBe(401);
  });
});
