/**
 * RED->GREEN (Inside-Out, Experience/API Layer) — issue #29 Task 1.5
 * (AC1/AC4/AC6/AC7). Supertest integration tests against the real Nest HTTP
 * pipeline (guards, ValidationPipe, filters) — mirrors
 * direct-enquiry.controller.spec.ts structure.
 */
import request from 'supertest';
import { createTestApp, closeTestApp, TestAppContext } from '../support/test-app';
import { loginAgent } from '../support/auth-agent';

const DUPLICATES_PATH = '/api/v1/duplicates';
const LEADS_PATH = '/api/v1/leads';

describe('GET /api/v1/duplicates (Task 1.5, issue #29)', () => {
  let ctx: TestAppContext;
  let dseAAgent: ReturnType<typeof request.agent>;
  let dseBAgent: ReturnType<typeof request.agent>;
  let dseCAgent: ReturnType<typeof request.agent>;
  let noCapAgent: ReturnType<typeof request.agent>;

  beforeAll(async () => {
    ctx = await createTestApp();
    const dseA = ctx.seed.users['dseA'];
    const dseB = ctx.seed.users['dseB'];
    const dseC = ctx.seed.users['dseC'];
    const noCap = ctx.seed.users['noCapabilityUser'];
    dseAAgent = await loginAgent(ctx.app, dseA.email, dseA.password);
    dseBAgent = await loginAgent(ctx.app, dseB.email, dseB.password);
    dseCAgent = await loginAgent(ctx.app, dseC.email, dseC.password);
    noCapAgent = await loginAgent(ctx.app, noCap.email, noCap.password);
  });

  afterAll(async () => {
    await closeTestApp(ctx);
  });

  it('AC6/AC1: returns 200 with an empty array when there is no matching record', async () => {
    const res = await dseAAgent.get(DUPLICATES_PATH).query({ mobile: '9123400001' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('AC2/AC6: returns the matching open Lead created by another DSE at the SAME location (dealership-wide, not owner-scoped)', async () => {
    const mobile = '9123400002';
    const created = await dseAAgent.post(LEADS_PATH).send({
      customerName: 'Duplicate Target',
      mobile,
      sourceId: 1,
      modelId: 101,
      communicationConsentVerified: true,
    });
    expect(created.status).toBe(201);

    const res = await dseBAgent.get(DUPLICATES_PATH).query({ mobile });
    expect(res.status).toBe(200);
    expect(res.body).toEqual([
      expect.objectContaining({ id: created.body.leadId, type: 'LEAD', status: 'New' }),
    ]);
  });

  it('AC4: does not leak a matching Lead from a different location (tenant-scoped)', async () => {
    const mobile = '9123400003';
    const created = await dseAAgent.post(LEADS_PATH).send({
      customerName: 'Loc1 Only',
      mobile,
      sourceId: 1,
      modelId: 101,
      communicationConsentVerified: true,
    });
    expect(created.status).toBe(201);

    const res = await dseCAgent.get(DUPLICATES_PATH).query({ mobile });
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('AC7: rejects a malformed mobile query param with 400 (no fuzzy matching — exact format required)', async () => {
    const res = await dseAAgent.get(DUPLICATES_PATH).query({ mobile: '12345' });
    expect(res.status).toBe(400);
    expect(JSON.stringify(res.body).toLowerCase()).toContain('mobile');
  });

  it('unauthenticated request -> 401', async () => {
    const res = await request(ctx.app.getHttpServer()).get(DUPLICATES_PATH).query({ mobile: '9123400004' });
    expect(res.status).toBe(401);
  });

  it('authenticated but capability-lacking principal -> 403', async () => {
    const res = await noCapAgent.get(DUPLICATES_PATH).query({ mobile: '9123400005' });
    expect(res.status).toBe(403);
  });
});
