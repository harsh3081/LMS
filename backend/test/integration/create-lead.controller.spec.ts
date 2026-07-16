/**
 * RED->GREEN (Inside-Out, Experience/API Layer) — Task 2.5.
 * Supertest integration tests against the real Nest HTTP pipeline (guards,
 * ValidationPipe, filters) — the Jest mirror of the frozen Playwright
 * suite's tests/create-lead-api.spec.ts (EVAL-AC2/AC3/AC4/AC5, EVAL-CC-01/
 * 02/03/06/08/09).
 */
import request from 'supertest';
import { createTestApp, closeTestApp, TestAppContext } from '../support/test-app';
import { loginAgent } from '../support/auth-agent';

const LEADS_PATH = '/api/v1/leads';
const UUID_V4_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

describe('POST /api/v1/leads (Task 2.5)', () => {
  let ctx: TestAppContext;
  let dseAAgent: ReturnType<typeof request.agent>;
  let noCapAgent: ReturnType<typeof request.agent>;

  const validPayload = () => ({
    customerName: `Asha Rao ${Date.now()}-${Math.random()}`,
    mobile: (() => {
      const leading = ['6', '7', '8', '9'][Math.floor(Math.random() * 4)];
      const rest = Array.from({ length: 9 }, () => Math.floor(Math.random() * 10)).join('');
      return `${leading}${rest}`;
    })(),
    sourceId: 1,
    modelId: 101,
  });

  beforeAll(async () => {
    ctx = await createTestApp();
    const dseA = ctx.seed.users['dseA'];
    const noCap = ctx.seed.users['noCapabilityUser'];
    dseAAgent = await loginAgent(ctx.app, dseA.email, dseA.password);
    noCapAgent = await loginAgent(ctx.app, noCap.email, noCap.password);
  });

  afterAll(async () => {
    await closeTestApp(ctx);
  });

  it('EVAL-AC3-01: happy path returns 201 with a UUID leadId and status "New"', async () => {
    const res = await dseAAgent.post(LEADS_PATH).send(validPayload());
    expect(res.status).toBe(201);
    expect(res.body.leadId).toMatch(UUID_V4_RE);
    expect(res.body.status).toBe('New');
  });

  it('EVAL-AC3-02/CC-09: two successive creates yield two distinct UUID leadIds', async () => {
    const first = await dseAAgent.post(LEADS_PATH).send(validPayload());
    const second = await dseAAgent.post(LEADS_PATH).send(validPayload());
    expect(first.body.leadId).not.toBe(second.body.leadId);
    expect(first.body.leadId).toMatch(UUID_V4_RE);
  });

  it('EVAL-AC2-05: missing customerName -> 400 referencing the field', async () => {
    const payload = validPayload() as Record<string, unknown>;
    delete payload.customerName;
    const res = await dseAAgent.post(LEADS_PATH).send(payload);
    expect(res.status).toBe(400);
    expect(JSON.stringify(res.body).toLowerCase()).toContain('customername');
  });

  it('EVAL-AC2-06: missing mobile -> 400 referencing the field', async () => {
    const payload = validPayload() as Record<string, unknown>;
    delete payload.mobile;
    const res = await dseAAgent.post(LEADS_PATH).send(payload);
    expect(res.status).toBe(400);
    expect(JSON.stringify(res.body).toLowerCase()).toContain('mobile');
  });

  it('EVAL-AC2-07: missing sourceId -> 400 referencing the field', async () => {
    const payload = validPayload() as Record<string, unknown>;
    delete payload.sourceId;
    const res = await dseAAgent.post(LEADS_PATH).send(payload);
    expect(res.status).toBe(400);
    expect(JSON.stringify(res.body).toLowerCase()).toContain('sourceid');
  });

  it('EVAL-AC2-08: missing modelId -> 400 referencing the field', async () => {
    const payload = validPayload() as Record<string, unknown>;
    delete payload.modelId;
    const res = await dseAAgent.post(LEADS_PATH).send(payload);
    expect(res.status).toBe(400);
    expect(JSON.stringify(res.body).toLowerCase()).toContain('modelid');
  });

  const invalidMobileCases = [
    { label: '9-digit (too short)', value: '987654321' },
    { label: '11-digit (too long)', value: '98765432101' },
    { label: 'leading 0-5 disallowed', value: '5876543210' },
    { label: 'non-numeric', value: '98765abcde' },
  ];
  for (const { label, value } of invalidMobileCases) {
    it(`EVAL-AC4 server: rejects invalid mobile — ${label}`, async () => {
      const res = await dseAAgent.post(LEADS_PATH).send({ ...validPayload(), mobile: value });
      expect(res.status).toBe(400);
    });
  }

  it('EVAL-AC4-10: valid mobile is accepted (201)', async () => {
    const res = await dseAAgent.post(LEADS_PATH).send(validPayload());
    expect(res.status).toBe(201);
  });

  it('EVAL-AC5-02: sourceId not present in lead_sources -> 400', async () => {
    const res = await dseAAgent.post(LEADS_PATH).send({ ...validPayload(), sourceId: 999999 });
    expect(res.status).toBe(400);
  });

  it('EVAL-AC5-04: modelId not present in vehicle_models -> 400', async () => {
    const res = await dseAAgent.post(LEADS_PATH).send({ ...validPayload(), modelId: 999999 });
    expect(res.status).toBe(400);
  });

  it('EVAL-CC-01: client-supplied ownerId/locationId/dealerGroupId are ignored', async () => {
    const dseA = ctx.seed.users['dseA'];
    const res = await dseAAgent.post(LEADS_PATH).send({
      ...validPayload(),
      ownerId: '00000000-0000-0000-0000-000000000000',
      locationId: '00000000-0000-0000-0000-000000000000',
      dealerGroupId: '00000000-0000-0000-0000-000000000000',
    });
    expect(res.status).toBe(201);
    expect(res.body.ownerId).toBe(dseA.userId);
    expect(res.body.ownerId).not.toBe('00000000-0000-0000-0000-000000000000');
  });

  // -------------------------------------------------------------------
  // issue #28 (AC1/AC2/AC3/AC6) — direct proof that ownership/audit
  // metadata (createdBy/createdAt/ownerId) is (a) auto-captured from the
  // authenticated Principal, (b) present in the API response payload
  // (LeadResponseDto was missing `createdBy` before this Story — see
  // NOTES.md), and (c) never overridable by a client-supplied value, even
  // when the field IS present in the request body (the ValidationPipe
  // whitelist strips it before CreateLeadDto ever carries it, so the
  // server-derived value always wins).
  // -------------------------------------------------------------------
  it('EVAL-CC-14 (issue #28): createdBy/createdAt/ownerId are present in the create response and reflect the authenticated actor', async () => {
    const dseA = ctx.seed.users['dseA'];
    const before = Date.now();
    const res = await dseAAgent.post(LEADS_PATH).send(validPayload());
    const after = Date.now();

    expect(res.status).toBe(201);
    expect(res.body.createdBy).toBe(dseA.userId);
    expect(res.body.ownerId).toBe(dseA.userId);
    const createdAtMs = new Date(res.body.createdAt).getTime();
    expect(Number.isNaN(createdAtMs)).toBe(false);
    expect(createdAtMs).toBeGreaterThanOrEqual(before - 5000);
    expect(createdAtMs).toBeLessThanOrEqual(after + 5000);
  });

  it('EVAL-CC-15 (issue #28, AC3): a client-supplied createdBy is ignored — the server-derived actor always wins', async () => {
    const dseA = ctx.seed.users['dseA'];
    const res = await dseAAgent.post(LEADS_PATH).send({
      ...validPayload(),
      createdBy: '00000000-0000-0000-0000-000000000000',
    });
    expect(res.status).toBe(201);
    expect(res.body.createdBy).toBe(dseA.userId);
    expect(res.body.createdBy).not.toBe('00000000-0000-0000-0000-000000000000');
  });

  it('EVAL-CC-02: client-supplied status is ignored — persisted status is always "New"', async () => {
    const res = await dseAAgent.post(LEADS_PATH).send({ ...validPayload(), status: 'Converted' });
    expect(res.status).toBe(201);
    expect(res.body.status).toBe('New');
  });

  it('EVAL-CC-03: duplicate mobile across two leads is permitted (both 201)', async () => {
    const shared = validPayload();
    const first = await dseAAgent.post(LEADS_PATH).send(shared);
    const second = await dseAAgent.post(LEADS_PATH).send({ ...shared, customerName: `${shared.customerName}-2` });
    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    expect(first.body.leadId).not.toBe(second.body.leadId);
  });

  it('EVAL-CC-06: unauthenticated create -> 401', async () => {
    const res = await request(ctx.app.getHttpServer()).post(LEADS_PATH).send(validPayload());
    expect(res.status).toBe(401);
  });

  it('EVAL-CC-08: authenticated but capability-lacking principal -> 403', async () => {
    const res = await noCapAgent.post(LEADS_PATH).send(validPayload());
    expect(res.status).toBe(403);
  });
});
