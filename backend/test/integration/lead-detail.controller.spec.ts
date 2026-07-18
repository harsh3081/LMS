/**
 * RED->GREEN (Inside-Out, Experience/API Layer) — issue #116, AC2.
 * GET /api/v1/leads/:leadId — single-Lead detail read backing the new Lead
 * Detail page. Owner-scoped exactly like EnquiriesRepository.findOwnedById/
 * FollowupsService.assertEnquiryOwnedByActor: 404 (never 403) for any Lead
 * the caller does not own, indistinguishable from a non-existent Lead.
 * Mirrors convert-lead.controller.spec.ts's structure/conventions.
 */
import request from 'supertest';
import { createTestApp, closeTestApp, TestAppContext } from '../support/test-app';
import { loginAgent } from '../support/auth-agent';

const LEADS_PATH = '/api/v1/leads';
const detailPath = (leadId: string) => `${LEADS_PATH}/${leadId}`;
const UUID_V4_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

describe('GET /api/v1/leads/:leadId — Lead detail (issue #116, AC2)', () => {
  let ctx: TestAppContext;
  let dseAAgent: ReturnType<typeof request.agent>;
  let dseBAgent: ReturnType<typeof request.agent>;
  let dseCAgent: ReturnType<typeof request.agent>;
  let adminAgent: ReturnType<typeof request.agent>;

  const fullPayload = () => ({
    customerName: `Detail Test ${Date.now()}-${Math.random()}`,
    mobile: (() => {
      const leading = ['6', '7', '8', '9'][Math.floor(Math.random() * 4)];
      const rest = Array.from({ length: 9 }, () => Math.floor(Math.random() * 10)).join('');
      return `${leading}${rest}`;
    })(),
    sourceId: 2,
    modelId: 102,
    communicationConsentVerified: true,
    email: 'asha.rao@example.com',
    customerType: 'Individual',
    city: 'Pune',
    pinCode: '411001',
    preferredLanguage: 'English',
    variant: 'VXi (O) CVT',
    fuelType: 'Petrol',
    transmission: 'Automatic',
    budgetMin: 800000,
    budgetMax: 1200000,
    buyingTimeline: 'Within 1 Month',
    exchangeInterest: true,
    currentVehicle: 'Maruti Swift 2018',
    kmsDriven: 45000,
    registrationNumber: 'MH12AB1234',
    expectedValue: 350000,
    paymentMode: 'Loan',
    preferredFinancer: 'HDFC Bank',
    downPaymentCapacity: 100000,
    referrerName: 'Rohit Sharma (existing customer)',
    firstFollowUpAt: '2026-08-01T10:00:00.000Z',
    remarks: 'Interested in test drive next week.',
  });

  beforeAll(async () => {
    ctx = await createTestApp();
    const dseA = ctx.seed.users['dseA'];
    const dseB = ctx.seed.users['dseB'];
    const dseC = ctx.seed.users['dseC'];
    const admin = ctx.seed.users['admin'];
    dseAAgent = await loginAgent(ctx.app, dseA.email, dseA.password);
    dseBAgent = await loginAgent(ctx.app, dseB.email, dseB.password);
    dseCAgent = await loginAgent(ctx.app, dseC.email, dseC.password);
    adminAgent = await loginAgent(ctx.app, admin.email, admin.password);
  });

  afterAll(async () => {
    await closeTestApp(ctx);
  });

  it('AC2: returns the full Lead, including every issue #114 field, plus denormalized names', async () => {
    const created = await dseAAgent.post(LEADS_PATH).send(fullPayload());
    expect(created.status).toBe(201);

    const res = await dseAAgent.get(detailPath(created.body.leadId));
    expect(res.status).toBe(200);
    expect(res.body.leadId).toBe(created.body.leadId);

    // ---- core + issue #28 fields ----
    expect(res.body.customerName).toBe(created.body.customerName);
    expect(res.body.mobile).toBe(created.body.mobile);
    expect(res.body.status).toBe('New');
    expect(res.body.ownerId).toBeDefined();
    expect(UUID_V4_RE.test(res.body.createdBy)).toBe(true);

    // ---- denormalized names (AC2) ----
    expect(res.body.sourceName).toBe('Referral');
    expect(res.body.modelName).toBe('Sedan GT');
    expect(res.body.ownerName).toBe('Dealer Sales Executive Loc1-A');

    // ---- issue #114 fields, all 6 sections ----
    expect(res.body.email).toBe('asha.rao@example.com');
    expect(res.body.customerType).toBe('Individual');
    expect(res.body.city).toBe('Pune');
    expect(res.body.pinCode).toBe('411001');
    expect(res.body.preferredLanguage).toBe('English');
    expect(res.body.variant).toBe('VXi (O) CVT');
    expect(res.body.fuelType).toBe('Petrol');
    expect(res.body.transmission).toBe('Automatic');
    expect(res.body.budgetMin).toBe(800000);
    expect(res.body.budgetMax).toBe(1200000);
    expect(res.body.buyingTimeline).toBe('Within 1 Month');
    expect(res.body.exchangeInterest).toBe(true);
    expect(res.body.currentVehicle).toBe('Maruti Swift 2018');
    expect(res.body.kmsDriven).toBe(45000);
    expect(res.body.registrationNumber).toBe('MH12AB1234');
    expect(res.body.expectedValue).toBe(350000);
    expect(res.body.paymentMode).toBe('Loan');
    expect(res.body.preferredFinancer).toBe('HDFC Bank');
    expect(res.body.downPaymentCapacity).toBe(100000);
    expect(res.body.referrerName).toBe('Rohit Sharma (existing customer)');
    expect(res.body.firstFollowUpAt).toBe('2026-08-01T10:00:00.000Z');
    expect(res.body.remarks).toBe('Interested in test drive next week.');
    expect(res.body.communicationConsentVerified).toBe(true);
  });

  it('AC2: a Lead with none of the optional fields supplied returns nulls, not errors', async () => {
    // sourceId/modelId default to mandatory=true (field-config, issue #27) —
    // relax them via the admin PUT so this test can omit both and exercise
    // the null-name path, without touching any other field's mandatory-ness.
    const relax = await adminAgent.put('/api/v1/field-config').send({
      fields: [
        { fieldName: 'sourceId', mandatory: false },
        { fieldName: 'modelId', mandatory: false },
      ],
    });
    expect(relax.status).toBe(200);

    const created = await dseAAgent.post(LEADS_PATH).send({
      customerName: 'Minimal Lead',
      mobile: fullPayload().mobile,
      communicationConsentVerified: true,
    });
    expect(created.status).toBe(201);

    const res = await dseAAgent.get(detailPath(created.body.leadId));
    expect(res.status).toBe(200);
    expect(res.body.sourceId).toBeNull();
    expect(res.body.sourceName).toBeNull();
    expect(res.body.modelId).toBeNull();
    expect(res.body.modelName).toBeNull();
    expect(res.body.email).toBeNull();
    expect(res.body.exchangeInterest).toBeNull();
  });

  it('EVAL-CC: owner isolation — dseB cannot view a Lead owned by dseA (404, not 403)', async () => {
    const created = await dseAAgent.post(LEADS_PATH).send(fullPayload());
    const res = await dseBAgent.get(detailPath(created.body.leadId));
    expect(res.status).toBe(404);
  });

  it('EVAL-CC: tenant isolation — dseC (different location) cannot view a Lead owned by dseA', async () => {
    const created = await dseAAgent.post(LEADS_PATH).send(fullPayload());
    const res = await dseCAgent.get(detailPath(created.body.leadId));
    expect(res.status).toBe(404);
  });

  it('404s (not 500) for a syntactically-valid but non-existent leadId', async () => {
    const res = await dseAAgent.get(detailPath('00000000-0000-4000-8000-000000000000'));
    expect(res.status).toBe(404);
  });

  it('401s for an unauthenticated request', async () => {
    const created = await dseAAgent.post(LEADS_PATH).send(fullPayload());
    const res = await request(ctx.app.getHttpServer()).get(detailPath(created.body.leadId));
    expect(res.status).toBe(401);
  });
});
