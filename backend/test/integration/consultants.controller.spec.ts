/**
 * RED->GREEN (Inside-Out, API Layer) — issue #114 Task 3. Exercises
 * GET /api/v1/consultants (backs the New Lead form's "Assign to Consultant"
 * dropdown). Mirrors demo-vehicles.controller's test conventions (issue #34)
 * — location-scoped, role-filtered, auth-guarded.
 */
import request from 'supertest';
import { createTestApp, closeTestApp, TestAppContext } from '../support/test-app';
import { loginAgent } from '../support/auth-agent';

const CONSULTANTS_PATH = '/api/v1/consultants';

describe('GET /api/v1/consultants (issue #114 Task 3)', () => {
  let ctx: TestAppContext;
  let dseAAgent: ReturnType<typeof request.agent>;
  let dseCAgent: ReturnType<typeof request.agent>;

  beforeAll(async () => {
    ctx = await createTestApp();
    const dseA = ctx.seed.users['dseA'];
    const dseC = ctx.seed.users['dseC'];
    dseAAgent = await loginAgent(ctx.app, dseA.email, dseA.password);
    dseCAgent = await loginAgent(ctx.app, dseC.email, dseC.password);
  });

  afterAll(async () => {
    await closeTestApp(ctx);
  });

  it('returns the DSEs at the caller\'s own location (dseA and dseB, both location 1)', async () => {
    const dseA = ctx.seed.users['dseA'];
    const dseB = ctx.seed.users['dseB'];
    const res = await dseAAgent.get(CONSULTANTS_PATH);
    expect(res.status).toBe(200);
    const ids = res.body.map((c: { userId: string }) => c.userId);
    expect(ids).toContain(dseA.userId);
    expect(ids).toContain(dseB.userId);
  });

  it('excludes DSEs at a different location', async () => {
    const dseC = ctx.seed.users['dseC']; // location 2
    const res = await dseAAgent.get(CONSULTANTS_PATH);
    expect(res.status).toBe(200);
    const ids = res.body.map((c: { userId: string }) => c.userId);
    expect(ids).not.toContain(dseC.userId);
  });

  it('excludes non-DSE roles (e.g. ReadOnlyStaff) at the same location', async () => {
    const noCap = ctx.seed.users['noCapabilityUser']; // role: ReadOnlyStaff, location 1
    const res = await dseAAgent.get(CONSULTANTS_PATH);
    expect(res.status).toBe(200);
    const ids = res.body.map((c: { userId: string }) => c.userId);
    expect(ids).not.toContain(noCap.userId);
  });

  it('each entry carries only userId and displayName', async () => {
    const res = await dseAAgent.get(CONSULTANTS_PATH);
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
    for (const entry of res.body) {
      expect(Object.keys(entry).sort()).toEqual(['displayName', 'userId']);
    }
  });

  it('a caller at a different location sees only their own location\'s DSEs', async () => {
    const dseC = ctx.seed.users['dseC'];
    const dseA = ctx.seed.users['dseA'];
    const res = await dseCAgent.get(CONSULTANTS_PATH);
    expect(res.status).toBe(200);
    const ids = res.body.map((c: { userId: string }) => c.userId);
    expect(ids).toContain(dseC.userId);
    expect(ids).not.toContain(dseA.userId);
  });

  it('unauthenticated request -> 401', async () => {
    const res = await request(ctx.app.getHttpServer()).get(CONSULTANTS_PATH);
    expect(res.status).toBe(401);
  });
});
