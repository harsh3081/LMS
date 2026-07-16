/**
 * RED->GREEN (Inside-Out, Experience/API Layer) — Task 2.5.1 (issue #25).
 * Supertest integration tests against the real Nest HTTP pipeline (guards,
 * ValidationPipe, filters) — the Jest mirror of the frozen Playwright suite's
 * tests/convert-lead-api.spec.ts (EVAL-AC1/AC2/AC3/AC4/AC6, EVAL-CC-01..09).
 */
import request from 'supertest';
import { createTestApp, closeTestApp, TestAppContext } from '../support/test-app';
import { loginAgent } from '../support/auth-agent';

const LEADS_PATH = '/api/v1/leads';
const convertPath = (leadId: string) => `${LEADS_PATH}/${leadId}/convert`;
const UUID_V4_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

describe('POST /api/v1/leads/:leadId/convert (Task 2.5)', () => {
  let ctx: TestAppContext;
  let dseAAgent: ReturnType<typeof request.agent>;
  let dseBAgent: ReturnType<typeof request.agent>;
  let dseCAgent: ReturnType<typeof request.agent>;
  let noCapAgent: ReturnType<typeof request.agent>;

  const leadPayload = () => ({
    customerName: `Convert Test ${Date.now()}-${Math.random()}`,
    mobile: (() => {
      const leading = ['6', '7', '8', '9'][Math.floor(Math.random() * 4)];
      const rest = Array.from({ length: 9 }, () => Math.floor(Math.random() * 10)).join('');
      return `${leading}${rest}`;
    })(),
    sourceId: 1,
    modelId: 101,
  });

  const validPayload = (overrides: Record<string, unknown> = {}) => ({
    budget: 500000,
    variant: 'VXi (O) CVT',
    exchangeInterest: true,
    financeInterest: false,
    ...overrides,
  });

  async function createOpenLead(agent: ReturnType<typeof request.agent>) {
    const res = await agent.post(LEADS_PATH).send(leadPayload());
    return res.body as { leadId: string };
  }

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

  it('EVAL-AC4-01: happy path returns 201 with a full Enquiry body linked to the source Lead', async () => {
    const lead = await createOpenLead(dseAAgent);
    const res = await dseAAgent.post(convertPath(lead.leadId)).send(validPayload());

    expect(res.status).toBe(201);
    expect(res.body.enquiryId).toMatch(UUID_V4_RE);
    expect(res.body.leadId).toBe(lead.leadId);
    expect(res.body.budget).toBe(500000);
    expect(res.body.variant).toBe('VXi (O) CVT');
    expect(res.body.exchangeInterest).toBe(true);
    expect(res.body.financeInterest).toBe(false);
    expect(res.body.status).toBe('New');
  });

  it('EVAL-AC6-01/02: convertedBy and convertedAt are recorded', async () => {
    const lead = await createOpenLead(dseAAgent);
    const before = Date.now();
    const res = await dseAAgent.post(convertPath(lead.leadId)).send(validPayload());
    const after = Date.now();

    const dseA = ctx.seed.users['dseA'];
    expect(res.body.convertedBy).toBe(dseA.userId);
    const convertedAtMs = new Date(res.body.convertedAt).getTime();
    expect(Number.isNaN(convertedAtMs)).toBe(false);
    expect(convertedAtMs).toBeGreaterThanOrEqual(before - 5000);
    expect(convertedAtMs).toBeLessThanOrEqual(after + 5000);
  });

  it('EVAL-CC-09: EnquiryResponseDto omits dealerGroupId', async () => {
    const lead = await createOpenLead(dseAAgent);
    const res = await dseAAgent.post(convertPath(lead.leadId)).send(validPayload());
    expect(res.body.dealerGroupId).toBeUndefined();
  });

  it('EVAL-AC2-01: missing budget -> 400 referencing the field', async () => {
    const lead = await createOpenLead(dseAAgent);
    const payload = validPayload() as Record<string, unknown>;
    delete payload.budget;
    const res = await dseAAgent.post(convertPath(lead.leadId)).send(payload);
    expect(res.status).toBe(400);
    expect(JSON.stringify(res.body).toLowerCase()).toContain('budget');
  });

  it('EVAL-AC2-02: missing variant -> 400 referencing the field', async () => {
    const lead = await createOpenLead(dseAAgent);
    const payload = validPayload() as Record<string, unknown>;
    delete payload.variant;
    const res = await dseAAgent.post(convertPath(lead.leadId)).send(payload);
    expect(res.status).toBe(400);
    expect(JSON.stringify(res.body).toLowerCase()).toContain('variant');
  });

  it('EVAL-AC2-03: missing exchangeInterest -> 400 referencing the field, not defaulted to false', async () => {
    const lead = await createOpenLead(dseAAgent);
    const payload = validPayload() as Record<string, unknown>;
    delete payload.exchangeInterest;
    const res = await dseAAgent.post(convertPath(lead.leadId)).send(payload);
    expect(res.status).toBe(400);
    expect(JSON.stringify(res.body).toLowerCase()).toContain('exchangeinterest');
  });

  it('EVAL-AC2-04: missing financeInterest -> 400 referencing the field, not defaulted to false', async () => {
    const lead = await createOpenLead(dseAAgent);
    const payload = validPayload() as Record<string, unknown>;
    delete payload.financeInterest;
    const res = await dseAAgent.post(convertPath(lead.leadId)).send(payload);
    expect(res.status).toBe(400);
    expect(JSON.stringify(res.body).toLowerCase()).toContain('financeinterest');
  });

  const invalidBudgetCases = [
    { label: 'zero', value: 0 },
    { label: 'negative', value: -50000 },
    { label: 'non-integer / decimal', value: 500000.5 },
    { label: 'non-numeric string', value: 'five-lakh' },
  ];
  for (const { label, value } of invalidBudgetCases) {
    it(`EVAL-AC3 server: rejects invalid budget — ${label}`, async () => {
      const lead = await createOpenLead(dseAAgent);
      const res = await dseAAgent.post(convertPath(lead.leadId)).send(validPayload({ budget: value }));
      expect(res.status).toBe(400);
    });
  }

  it('EVAL-AC3-05: a large-but-valid budget is accepted (no artificial upper bound)', async () => {
    const lead = await createOpenLead(dseAAgent);
    const res = await dseAAgent.post(convertPath(lead.leadId)).send(validPayload({ budget: 999999999 }));
    expect(res.status).toBe(201);
    expect(res.body.budget).toBe(999999999);
  });

  it('EVAL-AC3 server: rejects empty-string variant', async () => {
    const lead = await createOpenLead(dseAAgent);
    const res = await dseAAgent.post(convertPath(lead.leadId)).send(validPayload({ variant: '' }));
    expect(res.status).toBe(400);
  });

  it('EVAL-AC3-06: a fully valid conversion payload is accepted (201)', async () => {
    const lead = await createOpenLead(dseAAgent);
    const res = await dseAAgent.post(convertPath(lead.leadId)).send(validPayload());
    expect(res.status).toBe(201);
  });

  it('EVAL-CC-01: client-supplied ownerId/locationId/dealerGroupId/convertedBy/status are ignored', async () => {
    const dseA = ctx.seed.users['dseA'];
    const lead = await createOpenLead(dseAAgent);
    const res = await dseAAgent.post(convertPath(lead.leadId)).send(
      validPayload({
        ownerId: '00000000-0000-0000-0000-000000000000',
        locationId: '00000000-0000-0000-0000-000000000000',
        dealerGroupId: '00000000-0000-0000-0000-000000000000',
        convertedBy: '00000000-0000-0000-0000-000000000000',
        status: 'Hijacked',
      }),
    );
    expect(res.status).toBe(201);
    expect(res.body.ownerId).toBe(dseA.userId);
    expect(res.body.ownerId).not.toBe('00000000-0000-0000-0000-000000000000');
    expect(res.body.convertedBy).not.toBe('00000000-0000-0000-0000-000000000000');
    expect(res.body.status).not.toBe('Hijacked');
  });

  it('EVAL-CC-02: converting a non-existent leadId -> 404', async () => {
    const res = await dseAAgent
      .post(convertPath('00000000-0000-0000-0000-000000000000'))
      .send(validPayload());
    expect(res.status).toBe(404);
  });

  it("EVAL-CC-03: converting another owner's Lead (same location) -> 404, not 403", async () => {
    const lead = await createOpenLead(dseAAgent);
    const res = await dseBAgent.post(convertPath(lead.leadId)).send(validPayload());
    expect(res.status).toBe(404);
  });

  it('EVAL-CC-04: converting a Lead from a different location -> 404', async () => {
    const lead = await createOpenLead(dseAAgent);
    const res = await dseCAgent.post(convertPath(lead.leadId)).send(validPayload());
    expect(res.status).toBe(404);
  });

  it('EVAL-CC-05: re-converting an already-Converted Lead -> 409', async () => {
    const lead = await createOpenLead(dseAAgent);
    const first = await dseAAgent.post(convertPath(lead.leadId)).send(validPayload());
    expect(first.status).toBe(201);

    const second = await dseAAgent.post(convertPath(lead.leadId)).send(validPayload());
    expect(second.status).toBe(409);
  });

  it('EVAL-CC-06: unauthenticated convert -> 401', async () => {
    const lead = await createOpenLead(dseAAgent);
    const res = await request(ctx.app.getHttpServer()).post(convertPath(lead.leadId)).send(validPayload());
    expect(res.status).toBe(401);
  });

  it('EVAL-CC-07: authenticated but capability-lacking principal -> 403', async () => {
    const lead = await createOpenLead(dseAAgent);
    const res = await noCapAgent.post(convertPath(lead.leadId)).send(validPayload());
    expect(res.status).toBe(403);
  });

  it('EVAL-CC-08: a failed (400) conversion attempt leaves the Lead convertible; the next valid attempt succeeds', async () => {
    const lead = await createOpenLead(dseAAgent);

    const failed = await dseAAgent.post(convertPath(lead.leadId)).send(validPayload({ budget: -1 }));
    expect(failed.status).toBe(400);

    const succeeded = await dseAAgent.post(convertPath(lead.leadId)).send(validPayload());
    expect(succeeded.status).toBe(201);

    const reconvert = await dseAAgent.post(convertPath(lead.leadId)).send(validPayload());
    expect(reconvert.status).toBe(409);
  });

  it('EVAL-AC4-03/EVAL-CC-10: two separate conversions yield two distinct, UUID-shaped enquiryIds', async () => {
    const leadOne = await createOpenLead(dseAAgent);
    const leadTwo = await createOpenLead(dseAAgent);
    const first = await dseAAgent.post(convertPath(leadOne.leadId)).send(validPayload());
    const second = await dseAAgent.post(convertPath(leadTwo.leadId)).send(validPayload());
    expect(first.body.enquiryId).not.toBe(second.body.enquiryId);
    expect(first.body.enquiryId).toMatch(UUID_V4_RE);
    expect(second.body.enquiryId).toMatch(UUID_V4_RE);
  });

  it('EVAL-CC-12 (regression): POST /api/v1/leads still succeeds unaffected by the conversion slice', async () => {
    const res = await dseAAgent.post(LEADS_PATH).send(leadPayload());
    expect(res.status).toBe(201);
  });
});
