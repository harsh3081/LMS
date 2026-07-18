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

  // NEW (issue #114, AC2): communicationConsentVerified is a hard,
  // always-required compliance gate — added here so this shared payload
  // helper keeps producing a 201-eligible Lead to convert; unrelated to this
  // file's own convert-Lead assertions.
  const leadPayload = () => ({
    customerName: `Convert Test ${Date.now()}-${Math.random()}`,
    mobile: (() => {
      const leading = ['6', '7', '8', '9'][Math.floor(Math.random() * 4)];
      const rest = Array.from({ length: 9 }, () => Math.floor(Math.random() * 10)).join('');
      return `${leading}${rest}`;
    })(),
    sourceId: 1,
    modelId: 101,
    communicationConsentVerified: true,
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

  // ---- issue #124: "Rewrite Convert Lead to Enquiry as a sectioned form" ----
  describe('issue #124 — new sectioned-form fields', () => {
    it('AC5: a fully populated payload (all 8 sections) is accepted (201) and every new field round-trips', async () => {
      const lead = await createOpenLead(dseAAgent);
      const res = await dseAAgent.post(convertPath(lead.leadId)).send(
        validPayload({
          modelId: 101,
          fuelType: 'Petrol',
          transmission: 'Automatic',
          colorFirstPreference: 'Pearl White',
          colorSecondPreference: 'Metallic Grey',
          accessoriesInterest: 'Roof rails',
          competitorConsideration: 'Rival Model X',
          contactVerified: 'OTP Verified',
          intentRating: 'Hot',
          expectedClosureDate: '2026-08-01',
          showroomVisits: '2',
          quotationNumber: 'QT-1001',
          quotedOnRoadPrice: 560000,
          discountDiscussed: 'Rs 35,000 + corporate offer',
          insurancePreference: 'Dealer In-house',
          extendedWarrantyInterest: 'Interested',
          corporateDiscountEligible: 'Acme Corp',
          financeApplicationStatus: 'Login Done',
          financier: 'HDFC Bank',
          loanAmountSought: 400000,
          tenureAndEmiDiscussed: '60 months, Rs 8,500/mo',
          exchangeEvaluationStatus: 'Completed',
          exchangeEvaluatedBy: 'Yard Inspector A',
          exchangeEvaluatedPrice: 250000,
          exchangeCustomerExpectation: 280000,
          testDriveStatus: 'Scheduled',
          testDriveDateTime: '2026-08-02T10:30:00.000Z',
          quotationSharedVia: 'WhatsApp',
          testDriveFeedback: 'Liked the ride quality',
          panCardVerified: true,
          addressProofVerified: true,
          incomeProofVerified: false,
          gstDetailsVerified: false,
        }),
      );

      expect(res.status).toBe(201);
      expect(res.body.modelId).toBe(101);
      expect(res.body.fuelType).toBe('Petrol');
      expect(res.body.transmission).toBe('Automatic');
      expect(res.body.colorFirstPreference).toBe('Pearl White');
      expect(res.body.intentRating).toBe('Hot');
      expect(res.body.showroomVisits).toBe('2');
      expect(res.body.quotedOnRoadPrice).toBe(560000);
      expect(res.body.insurancePreference).toBe('Dealer In-house');
      expect(res.body.financeApplicationStatus).toBe('Login Done');
      expect(res.body.financier).toBe('HDFC Bank');
      expect(res.body.exchangeEvaluationStatus).toBe('Completed');
      expect(res.body.testDriveStatus).toBe('Scheduled');
      expect(res.body.quotationSharedVia).toBe('WhatsApp');
      expect(res.body.panCardVerified).toBe(true);
      expect(res.body.addressProofVerified).toBe(true);
      expect(res.body.incomeProofVerified).toBe(false);
      expect(res.body.gstDetailsVerified).toBe(false);
    });

    it('AC4: a minimal payload (only the original 4 fields) is still accepted — every new field is optional', async () => {
      const lead = await createOpenLead(dseAAgent);
      const res = await dseAAgent.post(convertPath(lead.leadId)).send(validPayload());
      expect(res.status).toBe(201);
      expect(res.body.fuelType).toBeNull();
      expect(res.body.panCardVerified).toBe(false);
    });

    const invalidEnumCases: { field: string; value: string }[] = [
      { field: 'fuelType', value: 'Coal' },
      { field: 'transmission', value: 'Semi-Auto' },
      { field: 'contactVerified', value: 'Carrier Pigeon' },
      { field: 'intentRating', value: 'Lukewarm' },
      { field: 'showroomVisits', value: '5' },
      { field: 'insurancePreference', value: 'Bogus' },
      { field: 'extendedWarrantyInterest', value: 'Maybe' },
      { field: 'financeApplicationStatus', value: 'Pending Review' },
      { field: 'financier', value: 'Bank of Nowhere' },
      { field: 'exchangeEvaluationStatus', value: 'In Progress' },
      { field: 'testDriveStatus', value: 'Postponed' },
      { field: 'quotationSharedVia', value: 'Carrier Pigeon' },
    ];
    for (const { field, value } of invalidEnumCases) {
      it(`rejects an out-of-vocabulary ${field} -> 400 referencing the field`, async () => {
        const lead = await createOpenLead(dseAAgent);
        const res = await dseAAgent.post(convertPath(lead.leadId)).send(validPayload({ [field]: value }));
        expect(res.status).toBe(400);
        expect(JSON.stringify(res.body).toLowerCase()).toContain(field.toLowerCase());
      });
    }

    it('EVAL-CC-01 (extended): client-supplied ownerId/dealerGroupId are still ignored even alongside new fields', async () => {
      const dseA = ctx.seed.users['dseA'];
      const lead = await createOpenLead(dseAAgent);
      const res = await dseAAgent.post(convertPath(lead.leadId)).send(
        validPayload({
          intentRating: 'Warm',
          ownerId: '00000000-0000-0000-0000-000000000000',
        }),
      );
      expect(res.status).toBe(201);
      expect(res.body.ownerId).toBe(dseA.userId);
      expect(res.body.intentRating).toBe('Warm');
    });
  });
});
