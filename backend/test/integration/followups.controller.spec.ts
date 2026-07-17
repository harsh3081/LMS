/**
 * RED->GREEN (Inside-Out, Experience/API Layer) — issue #30.
 * Supertest integration tests against the real Nest HTTP pipeline (guards,
 * ValidationPipe, filters) — mirrors direct-enquiry.controller.spec.ts's
 * structure and local EVAL-CC-numbering convention (documented fast-track:
 * no separate eval-criteria.md for this Story).
 */
import request from 'supertest';
import { createTestApp, closeTestApp, TestAppContext } from '../support/test-app';
import { loginAgent } from '../support/auth-agent';

const ENQUIRIES_PATH = '/api/v1/enquiries';
const UUID_V4_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

describe('POST /api/v1/enquiries/:enquiryId/follow-ups (issue #30)', () => {
  let ctx: TestAppContext;
  let dseAAgent: ReturnType<typeof request.agent>;
  let dseCAgent: ReturnType<typeof request.agent>;
  let noCapAgent: ReturnType<typeof request.agent>;
  let enquiryId: string;

  const validEnquiryPayload = () => ({
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

  // MODIFIED (issue #31 AC2): a Follow-up now requires nextFollowUpAt (or a
  // terminal enquiryStatus) to close — the default valid payload includes it
  // so every pre-existing #30 happy-path test keeps exercising a valid
  // submission unrelated to #31's own new assertions below.
  const validFollowupPayload = () => ({
    type: 'Home Visit',
    remarks: 'Discussed financing options.',
    nextFollowUpAt: '2026-08-01',
  });

  beforeAll(async () => {
    ctx = await createTestApp();
    const dseA = ctx.seed.users['dseA'];
    const dseC = ctx.seed.users['dseC'];
    const noCap = ctx.seed.users['noCapabilityUser'];
    dseAAgent = await loginAgent(ctx.app, dseA.email, dseA.password);
    dseCAgent = await loginAgent(ctx.app, dseC.email, dseC.password);
    noCapAgent = await loginAgent(ctx.app, noCap.email, noCap.password);

    const created = await dseAAgent.post(ENQUIRIES_PATH).send(validEnquiryPayload());
    enquiryId = created.body.enquiryId;
  });

  afterAll(async () => {
    await closeTestApp(ctx);
  });

  const followupPath = (id: string) => `${ENQUIRIES_PATH}/${id}/follow-ups`;

  it('AC1/AC5: happy path returns 201, associated with the correct Enquiry and the logging DSE', async () => {
    const dseA = ctx.seed.users['dseA'];
    const res = await dseAAgent.post(followupPath(enquiryId)).send(validFollowupPayload());
    expect(res.status).toBe(201);
    expect(res.body.followupId).toMatch(UUID_V4_RE);
    expect(res.body.enquiryId).toBe(enquiryId);
    expect(res.body.loggedBy).toBe(dseA.userId);
    expect(res.body.type).toBe('Home Visit');
    expect(res.body.remarks).toBe('Discussed financing options.');
    expect(res.body.loggedAt).toBeTruthy();
  });

  it.each(['Home Visit', 'Showroom Visit', 'Call'])('AC1: accepts follow-up type "%s"', async (type) => {
    const res = await dseAAgent
      .post(followupPath(enquiryId))
      .send({ type, remarks: `Logged as ${type}`, nextFollowUpAt: '2026-08-01' });
    expect(res.status).toBe(201);
    expect(res.body.type).toBe(type);
  });

  it('AC4: missing type -> 400 referencing the field', async () => {
    const payload = validFollowupPayload() as Record<string, unknown>;
    delete payload.type;
    const res = await dseAAgent.post(followupPath(enquiryId)).send(payload);
    expect(res.status).toBe(400);
    expect(JSON.stringify(res.body).toLowerCase()).toContain('type');
  });

  it('AC4: blank type -> 400 (empty string is not a valid selection)', async () => {
    const res = await dseAAgent.post(followupPath(enquiryId)).send({ ...validFollowupPayload(), type: '' });
    expect(res.status).toBe(400);
  });

  it('AC4: unrecognized type value -> 400', async () => {
    const res = await dseAAgent
      .post(followupPath(enquiryId))
      .send({ ...validFollowupPayload(), type: 'Carrier Pigeon' });
    expect(res.status).toBe(400);
  });

  it('AC2/AC3: missing remarks -> 400 referencing the field with a clear message', async () => {
    const payload = validFollowupPayload() as Record<string, unknown>;
    delete payload.remarks;
    const res = await dseAAgent.post(followupPath(enquiryId)).send(payload);
    expect(res.status).toBe(400);
    expect(JSON.stringify(res.body).toLowerCase()).toContain('remarks');
  });

  it('AC2/AC3: empty-string remarks -> 400 (mandatory, cannot be blank)', async () => {
    const res = await dseAAgent.post(followupPath(enquiryId)).send({ ...validFollowupPayload(), remarks: '' });
    expect(res.status).toBe(400);
    expect(JSON.stringify(res.body).toLowerCase()).toContain('remarks');
  });

  it('AC2/AC3: whitespace-only remarks -> 400 (not meaningful free text)', async () => {
    const res = await dseAAgent.post(followupPath(enquiryId)).send({ ...validFollowupPayload(), remarks: '   ' });
    expect(res.status).toBe(400);
  });

  it('client-supplied loggedBy/locationId/dealerGroupId/followupId are ignored', async () => {
    const dseA = ctx.seed.users['dseA'];
    const res = await dseAAgent.post(followupPath(enquiryId)).send({
      ...validFollowupPayload(),
      loggedBy: '00000000-0000-0000-0000-000000000000',
      locationId: '00000000-0000-0000-0000-000000000000',
      dealerGroupId: '00000000-0000-0000-0000-000000000000',
      followupId: '00000000-0000-0000-0000-000000000000',
    });
    expect(res.status).toBe(201);
    expect(res.body.loggedBy).toBe(dseA.userId);
    expect(res.body.loggedBy).not.toBe('00000000-0000-0000-0000-000000000000');
    expect(res.body.followupId).not.toBe('00000000-0000-0000-0000-000000000000');
  });

  it('unauthenticated create -> 401', async () => {
    const res = await request(ctx.app.getHttpServer()).post(followupPath(enquiryId)).send(validFollowupPayload());
    expect(res.status).toBe(401);
  });

  it('authenticated but capability-lacking principal -> 403 (reuses create-lead capability)', async () => {
    const res = await noCapAgent.post(followupPath(enquiryId)).send(validFollowupPayload());
    expect(res.status).toBe(403);
  });

  it('logging against a non-existent Enquiry -> 404', async () => {
    const res = await dseAAgent
      .post(followupPath('00000000-0000-0000-0000-000000000000'))
      .send(validFollowupPayload());
    expect(res.status).toBe(404);
  });

  it("logging against another DSE's Enquiry (different owner/tenant) -> 404, not 403 (no cross-tenant leakage)", async () => {
    const res = await dseCAgent.post(followupPath(enquiryId)).send(validFollowupPayload());
    expect(res.status).toBe(404);
  });

  it('GET /api/v1/enquiries/:enquiryId/follow-ups returns the Follow-up history for the correct Enquiry (AC5)', async () => {
    const created = await dseAAgent.post(followupPath(enquiryId)).send(validFollowupPayload());
    const list = await dseAAgent.get(followupPath(enquiryId));
    expect(list.status).toBe(200);
    expect(list.body.some((f: { followupId: string }) => f.followupId === created.body.followupId)).toBe(true);
    expect(list.body.every((f: { enquiryId: string }) => f.enquiryId === enquiryId)).toBe(true);
  });

  it('GET for a different owner/tenant Enquiry -> 404', async () => {
    const res = await dseCAgent.get(followupPath(enquiryId));
    expect(res.status).toBe(404);
  });

  it('issue #32 AC2: a Follow-up that sets enquiryStatus returns resultingStatus in both POST and GET responses', async () => {
    const created = await dseAAgent.post(ENQUIRIES_PATH).send(validEnquiryPayload());
    const eid = created.body.enquiryId;

    const posted = await dseAAgent
      .post(followupPath(eid))
      .send({ type: 'Call', remarks: 'Closing out.', enquiryStatus: 'Lost' });
    expect(posted.status).toBe(201);
    expect(posted.body.resultingStatus).toBe('Lost');

    const list = await dseAAgent.get(followupPath(eid));
    const closingEntry = list.body.find((f: { followupId: string }) => f.followupId === posted.body.followupId);
    expect(closingEntry.resultingStatus).toBe('Lost');
  });

  it('a Follow-up without enquiryStatus returns resultingStatus null', async () => {
    const res = await dseAAgent.post(followupPath(enquiryId)).send(validFollowupPayload());
    expect(res.status).toBe(201);
    expect(res.body.resultingStatus).toBeNull();
  });

  it('regression: POST /api/v1/enquiries still succeeds unaffected by the Follow-up slice', async () => {
    const res = await dseAAgent.post(ENQUIRIES_PATH).send(validEnquiryPayload());
    expect(res.status).toBe(201);
  });
});

describe('issue #31: Schedule Next Follow-up and Auto-Generate Reminder', () => {
  let ctx: TestAppContext;
  let dseAAgent: ReturnType<typeof request.agent>;
  let dseCAgent: ReturnType<typeof request.agent>;
  let enquiryId: string;

  const validEnquiryPayload = () => ({
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
    dseAAgent = await loginAgent(ctx.app, dseA.email, dseA.password);
    dseCAgent = await loginAgent(ctx.app, dseC.email, dseC.password);

    const created = await dseAAgent.post(ENQUIRIES_PATH).send(validEnquiryPayload());
    enquiryId = created.body.enquiryId;
  });

  afterAll(async () => {
    await closeTestApp(ctx);
  });

  const followupPath = (id: string) => `${ENQUIRIES_PATH}/${id}/follow-ups`;

  it('AC2: missing both nextFollowUpAt and enquiryStatus -> 400 referencing nextFollowUpAt', async () => {
    const res = await dseAAgent.post(followupPath(enquiryId)).send({ type: 'Call', remarks: 'No date given.' });
    expect(res.status).toBe(400);
    expect(JSON.stringify(res.body).toLowerCase()).toContain('nextfollowupat');
  });

  it('AC2: an unrecognized enquiryStatus value -> 400', async () => {
    const res = await dseAAgent
      .post(followupPath(enquiryId))
      .send({ type: 'Call', remarks: 'Bad status.', enquiryStatus: 'Won' });
    expect(res.status).toBe(400);
  });

  it('AC1/AC3: a valid nextFollowUpAt is persisted and returned on the created Follow-up', async () => {
    const res = await dseAAgent
      .post(followupPath(enquiryId))
      .send({ type: 'Home Visit', remarks: 'Scheduling next visit.', nextFollowUpAt: '2026-09-01' });
    expect(res.status).toBe(201);
    expect(res.body.nextFollowUpAt).toBeTruthy();
    expect(new Date(res.body.nextFollowUpAt).toISOString().slice(0, 10)).toBe('2026-09-01');
  });

  it.each(['Lost', 'Booked'])(
    'AC2: enquiryStatus "%s" without a nextFollowUpAt succeeds (terminal-status exception)',
    async (status) => {
      const created = await dseAAgent.post(ENQUIRIES_PATH).send(validEnquiryPayload());
      const res = await dseAAgent
        .post(followupPath(created.body.enquiryId))
        .send({ type: 'Call', remarks: 'Closing out.', enquiryStatus: status });
      expect(res.status).toBe(201);
      expect(res.body.nextFollowUpAt).toBeNull();
    },
  );

  it('AC2: setting enquiryStatus updates the Enquiry visible on GET /api/v1/enquiries', async () => {
    const created = await dseAAgent.post(ENQUIRIES_PATH).send(validEnquiryPayload());
    await dseAAgent
      .post(followupPath(created.body.enquiryId))
      .send({ type: 'Call', remarks: 'Closing out.', enquiryStatus: 'Booked' });

    const list = await dseAAgent.get(ENQUIRIES_PATH);
    const updated = list.body.find((e: { enquiryId: string }) => e.enquiryId === created.body.enquiryId);
    expect(updated.status).toBe('Booked');
  });

  describe('issue #33: Update Enquiry Status as Part of a Follow-up (AC1/AC4/AC5)', () => {
    it.each(['Hot', 'Warm', 'Cold'])(
      'AC1: accepts enquiryStatus "%s" (widened set) when nextFollowUpAt is also given',
      async (status) => {
        const created = await dseAAgent.post(ENQUIRIES_PATH).send(validEnquiryPayload());
        const res = await dseAAgent
          .post(followupPath(created.body.enquiryId))
          .send({ type: 'Call', remarks: 'Marking interest level.', nextFollowUpAt: '2026-09-15', enquiryStatus: status });
        expect(res.status).toBe(201);
        expect(res.body.resultingStatus).toBe(status);
      },
    );

    it.each(['Hot', 'Warm', 'Cold'])(
      'AC4: enquiryStatus "%s" WITHOUT nextFollowUpAt -> 400 (non-terminal, does not waive the requirement)',
      async (status) => {
        const created = await dseAAgent.post(ENQUIRIES_PATH).send(validEnquiryPayload());
        const res = await dseAAgent
          .post(followupPath(created.body.enquiryId))
          .send({ type: 'Call', remarks: 'Marking interest level.', enquiryStatus: status });
        expect(res.status).toBe(400);
        expect(JSON.stringify(res.body).toLowerCase()).toContain('nextfollowupat');
      },
    );

    it('AC1: setting enquiryStatus to "Hot" updates the Enquiry visible on GET /api/v1/enquiries', async () => {
      const created = await dseAAgent.post(ENQUIRIES_PATH).send(validEnquiryPayload());
      await dseAAgent
        .post(followupPath(created.body.enquiryId))
        .send({ type: 'Call', remarks: 'Warming up.', nextFollowUpAt: '2026-09-15', enquiryStatus: 'Hot' });

      const list = await dseAAgent.get(ENQUIRIES_PATH);
      const updated = list.body.find((e: { enquiryId: string }) => e.enquiryId === created.body.enquiryId);
      expect(updated.status).toBe('Hot');
    });

    it('AC5: an invalid/unrecognized enquiryStatus value -> 400', async () => {
      const created = await dseAAgent.post(ENQUIRIES_PATH).send(validEnquiryPayload());
      const res = await dseAAgent
        .post(followupPath(created.body.enquiryId))
        .send({ type: 'Call', remarks: 'Bad status.', nextFollowUpAt: '2026-09-15', enquiryStatus: 'Bogus' });
      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/v1/follow-ups/upcoming (AC4)', () => {
    it('returns the calling DSE\'s own upcoming Follow-ups, most-overdue-first', async () => {
      const created = await dseAAgent.post(ENQUIRIES_PATH).send(validEnquiryPayload());
      const eid = created.body.enquiryId;
      const later = await dseAAgent
        .post(followupPath(eid))
        .send({ type: 'Call', remarks: 'Later.', nextFollowUpAt: '2027-01-01' });
      const sooner = await dseAAgent
        .post(followupPath(eid))
        .send({ type: 'Call', remarks: 'Sooner.', nextFollowUpAt: '2026-08-15' });

      const res = await dseAAgent.get('/api/v1/follow-ups/upcoming');
      expect(res.status).toBe(200);
      const ids = res.body.map((f: { followupId: string }) => f.followupId);
      expect(ids).toContain(sooner.body.followupId);
      expect(ids).toContain(later.body.followupId);
      expect(ids.indexOf(sooner.body.followupId)).toBeLessThan(ids.indexOf(later.body.followupId));
    });

    it('does not include another DSE\'s upcoming Follow-ups', async () => {
      const res = await dseCAgent.get('/api/v1/follow-ups/upcoming');
      expect(res.status).toBe(200);
      expect(res.body.every((f: { enquiryId: string }) => f.enquiryId !== enquiryId)).toBe(true);
    });

    it('unauthenticated -> 401', async () => {
      const res = await request(ctx.app.getHttpServer()).get('/api/v1/follow-ups/upcoming');
      expect(res.status).toBe(401);
    });
  });
});

/**
 * RED->GREEN (Inside-Out, Experience/API Layer) — issue #32
 * ("Role-Scoped Follow-up History Timeline", AC3-AC6). Supertest
 * integration tests against the real Nest HTTP pipeline (guards,
 * ValidationPipe, filters) for GET
 * /api/v1/enquiries/:enquiryId/follow-ups, proving the role-scoping matrix
 * end to end through the actual session/capability/eligibility pipeline —
 * not just the service layer (already covered by
 * followups.service.spec.ts). Mirrors this file's own structure/login
 * convention.
 */
describe('GET /api/v1/enquiries/:enquiryId/follow-ups: role-scoped visibility (issue #32, AC3-AC6)', () => {
  let ctx: TestAppContext;
  let dseAAgent: ReturnType<typeof request.agent>;
  let dseBAgent: ReturnType<typeof request.agent>;
  let tlLoc1Agent: ReturnType<typeof request.agent>;
  let tlLoc2Agent: ReturnType<typeof request.agent>;
  let smgmGroup1Agent: ReturnType<typeof request.agent>;
  let smgmGroup2Agent: ReturnType<typeof request.agent>;
  let enquiryId: string;
  let followupId: string;

  const validEnquiryPayload = () => ({
    customerName: `Role Scoping Target ${Date.now()}-${Math.random()}`,
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
    const dseB = ctx.seed.users['dseB'];
    const tlLoc1 = ctx.seed.users['tlLoc1'];
    const tlLoc2 = ctx.seed.users['tlLoc2'];
    const smgmGroup1 = ctx.seed.users['smgmGroup1'];
    const smgmGroup2 = ctx.seed.users['smgmGroup2'];
    dseAAgent = await loginAgent(ctx.app, dseA.email, dseA.password);
    dseBAgent = await loginAgent(ctx.app, dseB.email, dseB.password);
    tlLoc1Agent = await loginAgent(ctx.app, tlLoc1.email, tlLoc1.password);
    tlLoc2Agent = await loginAgent(ctx.app, tlLoc2.email, tlLoc2.password);
    smgmGroup1Agent = await loginAgent(ctx.app, smgmGroup1.email, smgmGroup1.password);
    smgmGroup2Agent = await loginAgent(ctx.app, smgmGroup2.email, smgmGroup2.password);

    const created = await dseAAgent.post(ENQUIRIES_PATH).send(validEnquiryPayload());
    enquiryId = created.body.enquiryId;
    const followup = await dseAAgent
      .post(followupPath(enquiryId))
      .send({ type: 'Home Visit', remarks: 'Owned by dseA.', nextFollowUpAt: '2026-08-01' });
    followupId = followup.body.followupId;
  });

  afterAll(async () => {
    await closeTestApp(ctx);
  });

  function followupPath(id: string) {
    return `${ENQUIRIES_PATH}/${id}/follow-ups`;
  }

  it('DSE: owner sees the history (200, includes the logged Follow-up)', async () => {
    const res = await dseAAgent.get(followupPath(enquiryId));
    expect(res.status).toBe(200);
    expect(res.body.some((f: { followupId: string }) => f.followupId === followupId)).toBe(true);
  });

  it('DSE: a different DSE in the same location cannot see it -> 404 (AC3/AC6)', async () => {
    const res = await dseBAgent.get(followupPath(enquiryId));
    expect(res.status).toBe(404);
  });

  it("TL: same-location TL CAN see the history (200) — location proxy for 'team' (AC4)", async () => {
    const res = await tlLoc1Agent.get(followupPath(enquiryId));
    expect(res.status).toBe(200);
    expect(res.body.some((f: { followupId: string }) => f.followupId === followupId)).toBe(true);
  });

  it('TL: a different-location TL cannot see it -> 404 (AC6)', async () => {
    const res = await tlLoc2Agent.get(followupPath(enquiryId));
    expect(res.status).toBe(404);
  });

  it("SM/GM: same-dealer-group SM/GM (different location) CAN see the history (200) — 'org hierarchy' proxy (AC5)", async () => {
    const res = await smgmGroup1Agent.get(followupPath(enquiryId));
    expect(res.status).toBe(200);
    expect(res.body.some((f: { followupId: string }) => f.followupId === followupId)).toBe(true);
  });

  it('SM/GM: a different-dealer-group SM/GM cannot see it -> 404 (AC6)', async () => {
    const res = await smgmGroup2Agent.get(followupPath(enquiryId));
    expect(res.status).toBe(404);
  });

  it('unauthenticated -> 401 (AC6)', async () => {
    const res = await request(ctx.app.getHttpServer()).get(followupPath(enquiryId));
    expect(res.status).toBe(401);
  });
});
