/**
 * RED->GREEN (Inside-Out, Experience/API Layer) — issue #34.
 * Supertest integration tests against the real Nest HTTP pipeline (guards,
 * ValidationPipe, filters) — mirrors followups.controller.spec.ts's
 * structure and local EVAL-CC-numbering convention (documented fast-track:
 * no separate eval-criteria.md for this Story).
 */
import request from 'supertest';
import { createTestApp, closeTestApp, TestAppContext } from '../support/test-app';
import { loginAgent } from '../support/auth-agent';

const ENQUIRIES_PATH = '/api/v1/enquiries';
const TEST_DRIVES_PATH = '/api/v1/test-drives';
const UUID_V4_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
// A syntactically-valid v4 UUID that does not exist in the seeded data.
// Unlike the all-zero placeholder ('00000000-...-000000000000') used
// elsewhere in this codebase for route-param ids (e.g. followups' :enquiryId
// — no format validation there), CreateTestDriveDto's enquiryId/vehicleId
// carry `@IsUUID('4')`, which the all-zero id fails (version nibble 0, not
// 4) — that would surface as 400 (bad format) rather than the 404/400
// referential-not-found cases these tests intend to exercise.
const NON_EXISTENT_UUID = '00000000-0000-4000-8000-000000000000';

describe('POST /api/v1/test-drives (issue #34)', () => {
  let ctx: TestAppContext;
  let dseAAgent: ReturnType<typeof request.agent>;
  let dseCAgent: ReturnType<typeof request.agent>;
  let noCapAgent: ReturnType<typeof request.agent>;
  let enquiryId: string;
  let vehicleId: string;

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

  const validBookingPayload = () => ({
    enquiryId,
    vehicleId,
    slotStart: '2026-08-01T10:00:00.000Z',
    slotEnd: '2026-08-01T10:30:00.000Z',
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
    vehicleId = ctx.seed.demoVehicleIdsByLocation[Object.keys(ctx.seed.locationIds)[0]][0];
  });

  afterAll(async () => {
    await closeTestApp(ctx);
  });

  it('AC1/AC3/AC4: happy path returns 201 with the booking record (test drive id, enquiry, vehicle, slot, status)', async () => {
    const dseA = ctx.seed.users['dseA'];
    const res = await dseAAgent.post(TEST_DRIVES_PATH).send(validBookingPayload());
    expect(res.status).toBe(201);
    expect(res.body.testDriveId).toMatch(UUID_V4_RE);
    expect(res.body.enquiryId).toBe(enquiryId);
    expect(res.body.vehicleId).toBe(vehicleId);
    expect(res.body.slotStart).toBeTruthy();
    expect(res.body.slotEnd).toBeTruthy();
    expect(res.body.status).toBe('Booked');
    expect(res.body.bookedBy).toBe(dseA.userId);
  });

  it('AC6: missing enquiryId -> 400 referencing the field', async () => {
    const payload = validBookingPayload() as Record<string, unknown>;
    delete payload.enquiryId;
    const res = await dseAAgent.post(TEST_DRIVES_PATH).send(payload);
    expect(res.status).toBe(400);
    expect(JSON.stringify(res.body).toLowerCase()).toContain('enquiryid');
  });

  it('AC6: missing vehicleId -> 400 referencing the field', async () => {
    const payload = validBookingPayload() as Record<string, unknown>;
    delete payload.vehicleId;
    const res = await dseAAgent.post(TEST_DRIVES_PATH).send(payload);
    expect(res.status).toBe(400);
    expect(JSON.stringify(res.body).toLowerCase()).toContain('vehicleid');
  });

  it('AC6: missing slotStart -> 400 referencing the field', async () => {
    const payload = validBookingPayload() as Record<string, unknown>;
    delete payload.slotStart;
    const res = await dseAAgent.post(TEST_DRIVES_PATH).send(payload);
    expect(res.status).toBe(400);
    expect(JSON.stringify(res.body).toLowerCase()).toContain('slotstart');
  });

  it('AC6: missing slotEnd -> 400 referencing the field', async () => {
    const payload = validBookingPayload() as Record<string, unknown>;
    delete payload.slotEnd;
    const res = await dseAAgent.post(TEST_DRIVES_PATH).send(payload);
    expect(res.status).toBe(400);
    expect(JSON.stringify(res.body).toLowerCase()).toContain('slotend');
  });

  it('AC2: a slot outside dealership operating hours -> 400', async () => {
    const res = await dseAAgent
      .post(TEST_DRIVES_PATH)
      .send({ ...validBookingPayload(), slotStart: '2026-08-01T05:00:00.000Z', slotEnd: '2026-08-01T05:30:00.000Z' });
    expect(res.status).toBe(400);
  });

  it('vehicleId not found -> 400 (referential validation)', async () => {
    const res = await dseAAgent
      .post(TEST_DRIVES_PATH)
      .send({ ...validBookingPayload(), vehicleId: NON_EXISTENT_UUID });
    expect(res.status).toBe(400);
  });

  it('client-supplied status/bookedBy/locationId/dealerGroupId/testDriveId are ignored', async () => {
    const dseA = ctx.seed.users['dseA'];
    const res = await dseAAgent.post(TEST_DRIVES_PATH).send({
      ...validBookingPayload(),
      status: 'Completed',
      bookedBy: '00000000-0000-0000-0000-000000000000',
      locationId: '00000000-0000-0000-0000-000000000000',
      dealerGroupId: '00000000-0000-0000-0000-000000000000',
      testDriveId: '00000000-0000-0000-0000-000000000000',
    });
    expect(res.status).toBe(201);
    expect(res.body.status).toBe('Booked');
    expect(res.body.bookedBy).toBe(dseA.userId);
    expect(res.body.testDriveId).not.toBe('00000000-0000-0000-0000-000000000000');
  });

  it('unauthenticated create -> 401', async () => {
    const res = await request(ctx.app.getHttpServer()).post(TEST_DRIVES_PATH).send(validBookingPayload());
    expect(res.status).toBe(401);
  });

  it('authenticated but capability-lacking principal -> 403 (reuses create-lead capability)', async () => {
    const res = await noCapAgent.post(TEST_DRIVES_PATH).send(validBookingPayload());
    expect(res.status).toBe(403);
  });

  it('booking against a non-existent Enquiry -> 404', async () => {
    const res = await dseAAgent
      .post(TEST_DRIVES_PATH)
      .send({ ...validBookingPayload(), enquiryId: NON_EXISTENT_UUID });
    expect(res.status).toBe(404);
  });

  it("booking against another DSE's Enquiry (different owner/tenant) -> 404, not 403 (no cross-tenant leakage)", async () => {
    const res = await dseCAgent.post(TEST_DRIVES_PATH).send(validBookingPayload());
    expect(res.status).toBe(404);
  });

  it('regression: POST /api/v1/enquiries still succeeds unaffected by the Test Drive slice', async () => {
    const res = await dseAAgent.post(ENQUIRIES_PATH).send(validEnquiryPayload());
    expect(res.status).toBe(201);
  });
});

describe('GET /api/v1/test-drives/upcoming (issue #34 AC5)', () => {
  let ctx: TestAppContext;
  let dseAAgent: ReturnType<typeof request.agent>;
  let dseCAgent: ReturnType<typeof request.agent>;
  let enquiryId: string;
  let vehicleId: string;

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
    vehicleId = ctx.seed.demoVehicleIdsByLocation[Object.keys(ctx.seed.locationIds)[0]][0];
  });

  afterAll(async () => {
    await closeTestApp(ctx);
  });

  it("returns the calling DSE's own upcoming bookings, ascending by slot", async () => {
    const later = await dseAAgent
      .post(TEST_DRIVES_PATH)
      .send({ enquiryId, vehicleId, slotStart: '2027-02-01T11:00:00.000Z', slotEnd: '2027-02-01T11:30:00.000Z' });
    const sooner = await dseAAgent
      .post(TEST_DRIVES_PATH)
      .send({ enquiryId, vehicleId, slotStart: '2026-09-01T09:00:00.000Z', slotEnd: '2026-09-01T09:30:00.000Z' });

    const res = await dseAAgent.get('/api/v1/test-drives/upcoming');
    expect(res.status).toBe(200);
    const ids = res.body.map((t: { testDriveId: string }) => t.testDriveId);
    expect(ids).toContain(sooner.body.testDriveId);
    expect(ids).toContain(later.body.testDriveId);
    expect(ids.indexOf(sooner.body.testDriveId)).toBeLessThan(ids.indexOf(later.body.testDriveId));
  });

  it("does not include another DSE's upcoming bookings", async () => {
    const res = await dseCAgent.get('/api/v1/test-drives/upcoming');
    expect(res.status).toBe(200);
    expect(res.body.every((t: { enquiryId: string }) => t.enquiryId !== enquiryId)).toBe(true);
  });

  it('unauthenticated -> 401', async () => {
    const res = await request(ctx.app.getHttpServer()).get('/api/v1/test-drives/upcoming');
    expect(res.status).toBe(401);
  });
});

describe('GET /api/v1/demo-vehicles (issue #34 AC1)', () => {
  let ctx: TestAppContext;
  let dseAAgent: ReturnType<typeof request.agent>;

  beforeAll(async () => {
    ctx = await createTestApp();
    const dseA = ctx.seed.users['dseA'];
    dseAAgent = await loginAgent(ctx.app, dseA.email, dseA.password);
  });

  afterAll(async () => {
    await closeTestApp(ctx);
  });

  it("returns the caller's own location's active demo fleet", async () => {
    const dseALocationId = Object.keys(ctx.seed.locationIds)[0];
    const res = await dseAAgent.get('/api/v1/demo-vehicles');
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body.every((v: { locationId: string }) => v.locationId === dseALocationId)).toBe(true);
  });

  it('unauthenticated -> 401', async () => {
    const res = await request(ctx.app.getHttpServer()).get('/api/v1/demo-vehicles');
    expect(res.status).toBe(401);
  });
});
