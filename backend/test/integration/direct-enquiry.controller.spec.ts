/**
 * RED->GREEN (Inside-Out, Experience/API Layer) — issue #26 Task 2.5.
 * Supertest integration tests against the real Nest HTTP pipeline (guards,
 * ValidationPipe, filters) — mirrors create-lead.controller.spec.ts /
 * convert-lead.controller.spec.ts structure and EVAL-CC numbering
 * conventions (documented fast-track: no separate eval-criteria.md for this
 * Story, so these labels are this file's own local IDs).
 */
import request from 'supertest';
import { createTestApp, closeTestApp, TestAppContext } from '../support/test-app';
import { loginAgent } from '../support/auth-agent';

const ENQUIRIES_PATH = '/api/v1/enquiries';
const UUID_V4_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

describe('POST /api/v1/enquiries (Task 2.5, issue #26)', () => {
  let ctx: TestAppContext;
  let dseAAgent: ReturnType<typeof request.agent>;
  let dseCAgent: ReturnType<typeof request.agent>;
  let noCapAgent: ReturnType<typeof request.agent>;

  const validPayload = () => ({
    customerName: `Walk-in Customer ${Date.now()}-${Math.random()}`,
    mobile: (() => {
      const leading = ['6', '7', '8', '9'][Math.floor(Math.random() * 4)];
      const rest = Array.from({ length: 9 }, () => Math.floor(Math.random() * 10)).join('');
      return `${leading}${rest}`;
    })(),
    sourceId: 1,
    modelId: 101,
    budget: 300000,
    variant: 'LX',
    exchangeInterest: false,
    financeInterest: true,
  });

  beforeAll(async () => {
    ctx = await createTestApp();
    const dseA = ctx.seed.users['dseA'];
    const dseC = ctx.seed.users['dseC'];
    const noCap = ctx.seed.users['noCapabilityUser'];
    dseAAgent = await loginAgent(ctx.app, dseA.email, dseA.password);
    dseCAgent = await loginAgent(ctx.app, dseC.email, dseC.password);
    noCapAgent = await loginAgent(ctx.app, noCap.email, noCap.password);
  });

  afterAll(async () => {
    await closeTestApp(ctx);
  });

  it('AC1/AC4: happy path returns 201 with entryType DIRECT and no leadId', async () => {
    const res = await dseAAgent.post(ENQUIRIES_PATH).send(validPayload());
    expect(res.status).toBe(201);
    expect(res.body.enquiryId).toMatch(UUID_V4_RE);
    expect(res.body.leadId).toBeNull();
    expect(res.body.entryType).toBe('DIRECT');
    expect(res.body.status).toBe('New');
  });

  it('AC2: persists the Lead-equivalent fields plus the qualifying details in one step', async () => {
    const payload = validPayload();
    const res = await dseAAgent.post(ENQUIRIES_PATH).send(payload);
    expect(res.status).toBe(201);
    expect(res.body.customerName).toBe(payload.customerName);
    expect(res.body.mobile).toBe(payload.mobile);
    expect(res.body.sourceId).toBe(payload.sourceId);
    expect(res.body.modelId).toBe(payload.modelId);
    expect(res.body.budget).toBe(payload.budget);
    expect(res.body.variant).toBe(payload.variant);
    expect(res.body.exchangeInterest).toBe(payload.exchangeInterest);
    expect(res.body.financeInterest).toBe(payload.financeInterest);
  });

  it('AC3: missing customerName -> 400 referencing the field', async () => {
    const payload = validPayload() as Record<string, unknown>;
    delete payload.customerName;
    const res = await dseAAgent.post(ENQUIRIES_PATH).send(payload);
    expect(res.status).toBe(400);
    expect(JSON.stringify(res.body).toLowerCase()).toContain('customername');
  });

  it('AC3: missing mobile -> 400 referencing the field', async () => {
    const payload = validPayload() as Record<string, unknown>;
    delete payload.mobile;
    const res = await dseAAgent.post(ENQUIRIES_PATH).send(payload);
    expect(res.status).toBe(400);
    expect(JSON.stringify(res.body).toLowerCase()).toContain('mobile');
  });

  it('AC3: missing sourceId -> 400 referencing the field', async () => {
    const payload = validPayload() as Record<string, unknown>;
    delete payload.sourceId;
    const res = await dseAAgent.post(ENQUIRIES_PATH).send(payload);
    expect(res.status).toBe(400);
    expect(JSON.stringify(res.body).toLowerCase()).toContain('sourceid');
  });

  it('AC3: missing modelId -> 400 referencing the field', async () => {
    const payload = validPayload() as Record<string, unknown>;
    delete payload.modelId;
    const res = await dseAAgent.post(ENQUIRIES_PATH).send(payload);
    expect(res.status).toBe(400);
    expect(JSON.stringify(res.body).toLowerCase()).toContain('modelid');
  });

  it('AC3: missing budget -> 400 referencing the field', async () => {
    const payload = validPayload() as Record<string, unknown>;
    delete payload.budget;
    const res = await dseAAgent.post(ENQUIRIES_PATH).send(payload);
    expect(res.status).toBe(400);
    expect(JSON.stringify(res.body).toLowerCase()).toContain('budget');
  });

  it('AC3: missing variant -> 400 referencing the field', async () => {
    const payload = validPayload() as Record<string, unknown>;
    delete payload.variant;
    const res = await dseAAgent.post(ENQUIRIES_PATH).send(payload);
    expect(res.status).toBe(400);
    expect(JSON.stringify(res.body).toLowerCase()).toContain('variant');
  });

  it('AC3: missing exchangeInterest -> 400 referencing the field, not defaulted', async () => {
    const payload = validPayload() as Record<string, unknown>;
    delete payload.exchangeInterest;
    const res = await dseAAgent.post(ENQUIRIES_PATH).send(payload);
    expect(res.status).toBe(400);
    expect(JSON.stringify(res.body).toLowerCase()).toContain('exchangeinterest');
  });

  it('AC3: missing financeInterest -> 400 referencing the field, not defaulted', async () => {
    const payload = validPayload() as Record<string, unknown>;
    delete payload.financeInterest;
    const res = await dseAAgent.post(ENQUIRIES_PATH).send(payload);
    expect(res.status).toBe(400);
    expect(JSON.stringify(res.body).toLowerCase()).toContain('financeinterest');
  });

  it('server-side: sourceId not present in lead_sources -> 400', async () => {
    const res = await dseAAgent.post(ENQUIRIES_PATH).send({ ...validPayload(), sourceId: 999999 });
    expect(res.status).toBe(400);
  });

  it('server-side: modelId not present in vehicle_models -> 400', async () => {
    const res = await dseAAgent.post(ENQUIRIES_PATH).send({ ...validPayload(), modelId: 999999 });
    expect(res.status).toBe(400);
  });

  it('client-supplied ownerId/locationId/dealerGroupId/status/leadId/entryType are ignored', async () => {
    const dseA = ctx.seed.users['dseA'];
    const res = await dseAAgent.post(ENQUIRIES_PATH).send({
      ...validPayload(),
      ownerId: '00000000-0000-0000-0000-000000000000',
      locationId: '00000000-0000-0000-0000-000000000000',
      dealerGroupId: '00000000-0000-0000-0000-000000000000',
      status: 'Hijacked',
      leadId: '00000000-0000-0000-0000-000000000000',
      entryType: 'CONVERTED',
    });
    expect(res.status).toBe(201);
    expect(res.body.ownerId).toBe(dseA.userId);
    expect(res.body.ownerId).not.toBe('00000000-0000-0000-0000-000000000000');
    expect(res.body.status).toBe('New');
    expect(res.body.leadId).toBeNull();
    expect(res.body.entryType).toBe('DIRECT');
  });

  it('two successive Direct Enquiry creates yield two distinct UUID enquiryIds, both with null leadId', async () => {
    const first = await dseAAgent.post(ENQUIRIES_PATH).send(validPayload());
    const second = await dseAAgent.post(ENQUIRIES_PATH).send(validPayload());
    expect(first.body.enquiryId).not.toBe(second.body.enquiryId);
    expect(first.body.leadId).toBeNull();
    expect(second.body.leadId).toBeNull();
  });

  it('unauthenticated create -> 401', async () => {
    const res = await request(ctx.app.getHttpServer()).post(ENQUIRIES_PATH).send(validPayload());
    expect(res.status).toBe(401);
  });

  it('authenticated but capability-lacking principal -> 403 (reuses create-lead capability)', async () => {
    const res = await noCapAgent.post(ENQUIRIES_PATH).send(validPayload());
    expect(res.status).toBe(403);
  });

  it("GET /api/v1/enquiries returns only the caller's own Enquiries (tenant/owner scoped)", async () => {
    const created = await dseAAgent.post(ENQUIRIES_PATH).send(validPayload());
    const dseAList = await dseAAgent.get(ENQUIRIES_PATH);
    expect(dseAList.status).toBe(200);
    expect(dseAList.body.some((e: { enquiryId: string }) => e.enquiryId === created.body.enquiryId)).toBe(true);

    const dseCList = await dseCAgent.get(ENQUIRIES_PATH);
    expect(dseCList.body.some((e: { enquiryId: string }) => e.enquiryId === created.body.enquiryId)).toBe(false);
  });

  it('regression: POST /api/v1/leads still succeeds unaffected by the Direct-Enquiry slice', async () => {
    const res = await dseAAgent.post('/api/v1/leads').send({
      customerName: 'Regression Check',
      mobile: '9876543299',
      sourceId: 1,
      modelId: 101,
    });
    expect(res.status).toBe(201);
  });
});
