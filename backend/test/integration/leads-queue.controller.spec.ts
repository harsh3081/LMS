/**
 * RED->GREEN (Inside-Out, Experience/API Layer) — Task 3.3.
 * Jest mirror of the frozen Playwright tests/leads-queue-api.spec.ts
 * (AC6, EVAL-CC-04/05/07).
 */
import request from 'supertest';
import { createTestApp, closeTestApp, TestAppContext } from '../support/test-app';
import { loginAgent } from '../support/auth-agent';

const LEADS_PATH = '/api/v1/leads';

describe('GET /api/v1/leads — owner-scoped queue (Task 3.3)', () => {
  let ctx: TestAppContext;
  let dseAAgent: ReturnType<typeof request.agent>;
  let dseBAgent: ReturnType<typeof request.agent>;
  let dseCAgent: ReturnType<typeof request.agent>;

  // NEW (issue #114, AC2): communicationConsentVerified is a hard,
  // always-required compliance gate — added here so this shared payload
  // helper keeps producing a 201-eligible request; not otherwise related to
  // this file's own owner-scoped-queue assertions.
  const payload = () => ({
    customerName: `Queue Test ${Date.now()}-${Math.random()}`,
    mobile: (() => {
      const leading = ['6', '7', '8', '9'][Math.floor(Math.random() * 4)];
      const rest = Array.from({ length: 9 }, () => Math.floor(Math.random() * 10)).join('');
      return `${leading}${rest}`;
    })(),
    sourceId: 1,
    modelId: 101,
    communicationConsentVerified: true,
  });

  beforeAll(async () => {
    ctx = await createTestApp();
    const dseA = ctx.seed.users['dseA'];
    const dseB = ctx.seed.users['dseB'];
    const dseC = ctx.seed.users['dseC'];
    dseAAgent = await loginAgent(ctx.app, dseA.email, dseA.password);
    dseBAgent = await loginAgent(ctx.app, dseB.email, dseB.password);
    dseCAgent = await loginAgent(ctx.app, dseC.email, dseC.password);
  });

  afterAll(async () => {
    await closeTestApp(ctx);
  });

  it('EVAL-AC6-02: newly created lead appears in the creating DSE queue immediately', async () => {
    const created = await dseAAgent.post(LEADS_PATH).send(payload());
    expect(created.status).toBe(201);

    const queue = await dseAAgent.get(LEADS_PATH);
    expect(queue.status).toBe(200);
    expect(Array.isArray(queue.body)).toBe(true);
    expect(queue.body.some((l: { leadId: string }) => l.leadId === created.body.leadId)).toBe(true);
  });

  it('EVAL-AC6-03: queue is ordered newest-first', async () => {
    const first = await dseAAgent.post(LEADS_PATH).send(payload());
    const second = await dseAAgent.post(LEADS_PATH).send(payload());

    const queue = await dseAAgent.get(LEADS_PATH);
    const firstIndex = queue.body.findIndex((l: { leadId: string }) => l.leadId === first.body.leadId);
    const secondIndex = queue.body.findIndex((l: { leadId: string }) => l.leadId === second.body.leadId);
    expect(secondIndex).toBeLessThan(firstIndex);
  });

  it('EVAL-CC-04: tenant isolation — a location-2 DSE never sees a location-1 DSE lead', async () => {
    const dseALead = await dseAAgent.post(LEADS_PATH).send(payload());
    const dseCQueue = await dseCAgent.get(LEADS_PATH);
    expect(dseCQueue.body.some((l: { leadId: string }) => l.leadId === dseALead.body.leadId)).toBe(false);
  });

  it('EVAL-CC-05: owner isolation — dseB (same location as dseA) does not see dseA leads', async () => {
    const dseALead = await dseAAgent.post(LEADS_PATH).send(payload());
    const dseBQueue = await dseBAgent.get(LEADS_PATH);
    expect(dseBQueue.body.some((l: { leadId: string }) => l.leadId === dseALead.body.leadId)).toBe(false);

    const dseBLead = await dseBAgent.post(LEADS_PATH).send(payload());
    const dseBQueueAfter = await dseBAgent.get(LEADS_PATH);
    expect(dseBQueueAfter.body.some((l: { leadId: string }) => l.leadId === dseBLead.body.leadId)).toBe(true);
  });

  it('EVAL-CC-07: unauthenticated queue read -> 401', async () => {
    const res = await request(ctx.app.getHttpServer()).get(LEADS_PATH);
    expect(res.status).toBe(401);
  });

  // -------------------------------------------------------------------
  // Task 3.1.1 (issue #25, AC5) — Converted leads excluded from the queue;
  // non-Converted siblings remain (regression guard for the queue-exclusion
  // change to findOwnQueue).
  // -------------------------------------------------------------------
  it('AC5: a Converted lead is absent from the owner queue; non-Converted siblings remain', async () => {
    const toConvert = await dseAAgent.post(LEADS_PATH).send(payload());
    const toKeepOpen = await dseAAgent.post(LEADS_PATH).send(payload());

    const convertRes = await dseAAgent
      .post(`${LEADS_PATH}/${toConvert.body.leadId}/convert`)
      .send({ budget: 500000, variant: 'VXi (O) CVT', exchangeInterest: true, financeInterest: false });
    expect(convertRes.status).toBe(201);

    const queue = await dseAAgent.get(LEADS_PATH);
    const ids = queue.body.map((l: { leadId: string }) => l.leadId);
    expect(ids).not.toContain(toConvert.body.leadId);
    expect(ids).toContain(toKeepOpen.body.leadId);
  });
});
