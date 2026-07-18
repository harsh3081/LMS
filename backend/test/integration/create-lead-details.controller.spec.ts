/**
 * RED->GREEN (Inside-Out, API Layer) — issue #114 Task 2. Exercises the 22
 * new CreateLeadDto fields, the consent compliance gate, and the
 * "Assign to Consultant" flow through the real Nest HTTP pipeline
 * (guards/ValidationPipe/filters). Mirrors create-lead.controller.spec.ts's
 * structure/conventions exactly — kept in its own file for isolation rather
 * than editing that frozen-in-spirit #24 suite.
 */
import request from 'supertest';
import { createTestApp, closeTestApp, TestAppContext } from '../support/test-app';
import { loginAgent } from '../support/auth-agent';

const LEADS_PATH = '/api/v1/leads';

describe('POST /api/v1/leads — new customer-details fields (issue #114 Task 2)', () => {
  let ctx: TestAppContext;
  let dseAAgent: ReturnType<typeof request.agent>;
  let dseCAgent: ReturnType<typeof request.agent>;

  const randomMobile = () => {
    const leading = ['6', '7', '8', '9'][Math.floor(Math.random() * 4)];
    const rest = Array.from({ length: 9 }, () => Math.floor(Math.random() * 10)).join('');
    return `${leading}${rest}`;
  };

  // Every required-by-config field plus the hard consent gate — the minimal
  // payload that a 201 test can build on.
  const basePayload = () => ({
    customerName: `Asha Rao ${Date.now()}-${Math.random()}`,
    mobile: randomMobile(),
    sourceId: 1,
    modelId: 101,
    communicationConsentVerified: true,
  });

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

  // -------------------------------------------------------------------
  // AC2 — consent is the ONLY hard-required new field
  // -------------------------------------------------------------------
  describe('communicationConsentVerified compliance gate (AC2)', () => {
    it('rejects (400) when the consent field is omitted', async () => {
      const payload = basePayload() as Record<string, unknown>;
      delete payload.communicationConsentVerified;
      const res = await dseAAgent.post(LEADS_PATH).send(payload);
      expect(res.status).toBe(400);
      expect(JSON.stringify(res.body).toLowerCase()).toContain('communicationconsentverified');
    });

    it('rejects (400) when the consent field is explicitly false', async () => {
      const res = await dseAAgent.post(LEADS_PATH).send({ ...basePayload(), communicationConsentVerified: false });
      expect(res.status).toBe(400);
    });

    it('accepts (201) when the consent field is explicitly true', async () => {
      const res = await dseAAgent.post(LEADS_PATH).send(basePayload());
      expect(res.status).toBe(201);
      expect(res.body.communicationConsentVerified).toBe(true);
    });
  });

  // -------------------------------------------------------------------
  // AC2 — every OTHER new field is optional; a minimal payload still succeeds
  // -------------------------------------------------------------------
  it('AC2: creates a Lead with none of the 22 optional new fields supplied', async () => {
    const res = await dseAAgent.post(LEADS_PATH).send(basePayload());
    expect(res.status).toBe(201);
    expect(res.body.email).toBeNull();
    expect(res.body.customerType).toBeNull();
    expect(res.body.budgetMin).toBeNull();
    expect(res.body.exchangeInterest).toBeNull();
    expect(res.body.firstFollowUpAt).toBeNull();
  });

  // -------------------------------------------------------------------
  // AC3 — email / pin code format validation
  // -------------------------------------------------------------------
  describe('email format validation (AC3)', () => {
    it('rejects a malformed email', async () => {
      const res = await dseAAgent.post(LEADS_PATH).send({ ...basePayload(), email: 'not-an-email' });
      expect(res.status).toBe(400);
    });

    it('accepts a well-formed email', async () => {
      const res = await dseAAgent.post(LEADS_PATH).send({ ...basePayload(), email: 'asha.rao@example.com' });
      expect(res.status).toBe(201);
      expect(res.body.email).toBe('asha.rao@example.com');
    });
  });

  describe('pinCode format validation (AC3)', () => {
    const invalidCases = ['0000', '12345', '1234567', 'ABCDEF', '012345'];
    for (const value of invalidCases) {
      it(`rejects an invalid pin code — "${value}"`, async () => {
        const res = await dseAAgent.post(LEADS_PATH).send({ ...basePayload(), pinCode: value });
        expect(res.status).toBe(400);
      });
    }

    it('accepts a valid 6-digit pin code', async () => {
      const res = await dseAAgent.post(LEADS_PATH).send({ ...basePayload(), pinCode: '411001' });
      expect(res.status).toBe(201);
      expect(res.body.pinCode).toBe('411001');
    });
  });

  // -------------------------------------------------------------------
  // AC4 — closed-set dropdowns rejected/accepted via @IsIn
  // -------------------------------------------------------------------
  const closedSetCases: { field: string; valid: string; invalid: string }[] = [
    { field: 'customerType', valid: 'Corporate', invalid: 'Bogus' },
    { field: 'preferredLanguage', valid: 'Marathi', invalid: 'Klingon' },
    { field: 'fuelType', valid: 'Electric', invalid: 'Coal' },
    { field: 'transmission', valid: 'Automatic', invalid: 'Semi-Auto' },
    { field: 'buyingTimeline', valid: '1-3 Months', invalid: 'Someday' },
    { field: 'paymentMode', valid: 'Loan', invalid: 'Barter' },
  ];
  describe('closed-set dropdown fields (AC4)', () => {
    for (const { field, valid, invalid } of closedSetCases) {
      it(`rejects an out-of-vocabulary value for ${field}`, async () => {
        const res = await dseAAgent.post(LEADS_PATH).send({ ...basePayload(), [field]: invalid });
        expect(res.status).toBe(400);
      });

      it(`accepts an in-vocabulary value for ${field}`, async () => {
        const res = await dseAAgent.post(LEADS_PATH).send({ ...basePayload(), [field]: valid });
        expect(res.status).toBe(201);
        expect(res.body[field]).toBe(valid);
      });
    }
  });

  // -------------------------------------------------------------------
  // Numeric fields (budgetMin/budgetMax/kmsDriven/expectedValue/downPaymentCapacity)
  // -------------------------------------------------------------------
  it('persists budgetMin/budgetMax as numbers (bigint round-trip)', async () => {
    const res = await dseAAgent.post(LEADS_PATH).send({ ...basePayload(), budgetMin: 800000, budgetMax: 1200000 });
    expect(res.status).toBe(201);
    expect(res.body.budgetMin).toBe(800000);
    expect(res.body.budgetMax).toBe(1200000);
  });

  it('rejects a negative numeric field', async () => {
    const res = await dseAAgent.post(LEADS_PATH).send({ ...basePayload(), kmsDriven: -5 });
    expect(res.status).toBe(400);
  });

  // -------------------------------------------------------------------
  // Exchange Vehicle group (AC1 — independently optional, no cross-field requirement)
  // -------------------------------------------------------------------
  it('persists the Exchange Vehicle group together', async () => {
    const res = await dseAAgent.post(LEADS_PATH).send({
      ...basePayload(),
      exchangeInterest: true,
      currentVehicle: 'Maruti Swift 2018',
      kmsDriven: 45000,
      registrationNumber: 'MH12AB1234',
      expectedValue: 350000,
    });
    expect(res.status).toBe(201);
    expect(res.body.exchangeInterest).toBe(true);
    expect(res.body.currentVehicle).toBe('Maruti Swift 2018');
    expect(res.body.kmsDriven).toBe(45000);
    expect(res.body.registrationNumber).toBe('MH12AB1234');
    expect(res.body.expectedValue).toBe(350000);
  });

  it('accepts exchange detail fields even when exchangeInterest itself is omitted (AC2: independently optional)', async () => {
    const res = await dseAAgent.post(LEADS_PATH).send({ ...basePayload(), currentVehicle: 'Old Car' });
    expect(res.status).toBe(201);
    expect(res.body.exchangeInterest).toBeNull();
    expect(res.body.currentVehicle).toBe('Old Car');
  });

  // -------------------------------------------------------------------
  // firstFollowUpAt / remarks / referrerName — plain optional fields
  // -------------------------------------------------------------------
  it('persists firstFollowUpAt, remarks, and referrerName', async () => {
    const res = await dseAAgent.post(LEADS_PATH).send({
      ...basePayload(),
      firstFollowUpAt: '2026-08-01T10:00:00.000Z',
      remarks: 'Interested in a test drive.',
      referrerName: 'Rohit Sharma',
    });
    expect(res.status).toBe(201);
    expect(new Date(res.body.firstFollowUpAt).toISOString()).toBe('2026-08-01T10:00:00.000Z');
    expect(res.body.remarks).toBe('Interested in a test drive.');
    expect(res.body.referrerName).toBe('Rohit Sharma');
  });

  // -------------------------------------------------------------------
  // AC5 — Assign to Consultant
  // -------------------------------------------------------------------
  describe('assignedOwnerId — Assign to Consultant (AC5)', () => {
    it('omitting assignedOwnerId preserves self-assignment (issue #28 default)', async () => {
      const dseA = ctx.seed.users['dseA'];
      const res = await dseAAgent.post(LEADS_PATH).send(basePayload());
      expect(res.status).toBe(201);
      expect(res.body.ownerId).toBe(dseA.userId);
      expect(res.body.createdBy).toBe(dseA.userId);
    });

    it('assigns ownerId to a different DSE at the same location/dealer group', async () => {
      const dseA = ctx.seed.users['dseA'];
      const dseB = ctx.seed.users['dseB'];
      const res = await dseAAgent.post(LEADS_PATH).send({ ...basePayload(), assignedOwnerId: dseB.userId });
      expect(res.status).toBe(201);
      expect(res.body.ownerId).toBe(dseB.userId);
      // createdBy always reflects who actually submitted the request, never the assignee.
      expect(res.body.createdBy).toBe(dseA.userId);
    });

    it('rejects (400) an assignedOwnerId that does not exist', async () => {
      const res = await dseAAgent
        .post(LEADS_PATH)
        .send({ ...basePayload(), assignedOwnerId: '00000000-0000-0000-0000-000000000000' });
      expect(res.status).toBe(400);
      expect(JSON.stringify(res.body).toLowerCase()).toContain('assignedownerid');
    });

    it('rejects (400) an assignedOwnerId that is not a DSE (wrong role)', async () => {
      const noCap = ctx.seed.users['noCapabilityUser']; // role: ReadOnlyStaff, same location as dseA
      const res = await dseAAgent.post(LEADS_PATH).send({ ...basePayload(), assignedOwnerId: noCap.userId });
      expect(res.status).toBe(400);
    });

    it("rejects (400) an assignedOwnerId at a different location/dealer group", async () => {
      const dseA = ctx.seed.users['dseA'];
      // dseC is a valid DSE, but at a different location/dealer group than dseA.
      const res = await dseAAgent.post(LEADS_PATH).send({ ...basePayload(), assignedOwnerId: dseA.userId });
      expect(res.status).toBe(201); // sanity: dseA assigning to self via the field also works

      const dseC = ctx.seed.users['dseC'];
      const cross = await dseAAgent.post(LEADS_PATH).send({ ...basePayload(), assignedOwnerId: dseC.userId });
      expect(cross.status).toBe(400);
    });

    it('a DSE at a different location can self-assign or assign within their own location (sanity, not cross-location)', async () => {
      const dseC = ctx.seed.users['dseC'];
      const res = await dseCAgent.post(LEADS_PATH).send(basePayload());
      expect(res.status).toBe(201);
      expect(res.body.ownerId).toBe(dseC.userId);
    });
  });
});
