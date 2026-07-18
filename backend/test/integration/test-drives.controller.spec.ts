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

  // MODIFIED (issue #36): each call now gets its own distinct, non-
  // colliding day so the many tests in this describe block (which all reuse
  // this same vehicleId) don't spuriously conflict with each other now that
  // double-booking is rejected — see test-drives.service.spec.ts's identical
  // comment on validBookingDto for the full rationale.
  let bookingDayCounter = 0;
  const validBookingPayload = () => {
    bookingDayCounter += 1;
    const start = new Date(Date.UTC(2027, 7, 1, 10, 0, 0) + bookingDayCounter * 24 * 60 * 60 * 1000);
    const end = new Date(start.getTime() + 30 * 60000);
    return {
      enquiryId,
      vehicleId,
      slotStart: start.toISOString(),
      slotEnd: end.toISOString(),
    };
  };

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

describe('POST /api/v1/test-drives — issue #36 double-booking conflict (AC1-AC4)', () => {
  let ctx: TestAppContext;
  let dseAAgent: ReturnType<typeof request.agent>;
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

  const bookingPayload = (enquiryId: string, slotStart: string, slotEnd: string) => ({
    enquiryId,
    vehicleId,
    slotStart,
    slotEnd,
  });

  beforeAll(async () => {
    ctx = await createTestApp();
    const dseA = ctx.seed.users['dseA'];
    dseAAgent = await loginAgent(ctx.app, dseA.email, dseA.password);
    vehicleId = ctx.seed.demoVehicleIdsByLocation[Object.keys(ctx.seed.locationIds)[0]][0];
  });

  afterAll(async () => {
    await closeTestApp(ctx);
  });

  it('AC1/AC2: an overlapping booking for the same vehicle -> 409 with a reason and suggestedSlots', async () => {
    const enquiry1 = await dseAAgent.post(ENQUIRIES_PATH).send(validEnquiryPayload());
    const first = await dseAAgent
      .post(TEST_DRIVES_PATH)
      .send(bookingPayload(enquiry1.body.enquiryId, '2029-02-01T10:00:00.000Z', '2029-02-01T10:30:00.000Z'));
    expect(first.status).toBe(201);

    const enquiry2 = await dseAAgent.post(ENQUIRIES_PATH).send(validEnquiryPayload());
    const res = await dseAAgent
      .post(TEST_DRIVES_PATH)
      .send(bookingPayload(enquiry2.body.enquiryId, '2029-02-01T10:00:00.000Z', '2029-02-01T10:30:00.000Z'));

    expect(res.status).toBe(409);
    expect(Array.isArray(res.body.errors)).toBe(true);
    expect(res.body.errors.length).toBeGreaterThan(0);
    expect(Array.isArray(res.body.suggestedSlots)).toBe(true);
    expect(res.body.suggestedSlots).toEqual(
      expect.arrayContaining([{ slotStart: '2029-02-01T10:30:00.000Z', slotEnd: '2029-02-01T11:00:00.000Z' }]),
    );
  });

  it('AC4: a partially-overlapping (not exact-match) slot for the same vehicle -> 409', async () => {
    const enquiry1 = await dseAAgent.post(ENQUIRIES_PATH).send(validEnquiryPayload());
    const first = await dseAAgent
      .post(TEST_DRIVES_PATH)
      .send(bookingPayload(enquiry1.body.enquiryId, '2029-02-02T10:00:00.000Z', '2029-02-02T10:30:00.000Z'));
    expect(first.status).toBe(201);

    const enquiry2 = await dseAAgent.post(ENQUIRIES_PATH).send(validEnquiryPayload());
    const res = await dseAAgent
      .post(TEST_DRIVES_PATH)
      .send(bookingPayload(enquiry2.body.enquiryId, '2029-02-02T10:15:00.000Z', '2029-02-02T10:45:00.000Z'));
    expect(res.status).toBe(409);
  });

  it('an adjacent, non-overlapping slot for the same vehicle -> 201 (not a conflict)', async () => {
    const enquiry1 = await dseAAgent.post(ENQUIRIES_PATH).send(validEnquiryPayload());
    const first = await dseAAgent
      .post(TEST_DRIVES_PATH)
      .send(bookingPayload(enquiry1.body.enquiryId, '2029-02-03T10:30:00.000Z', '2029-02-03T11:00:00.000Z'));
    expect(first.status).toBe(201);

    const enquiry2 = await dseAAgent.post(ENQUIRIES_PATH).send(validEnquiryPayload());
    const res = await dseAAgent
      .post(TEST_DRIVES_PATH)
      .send(bookingPayload(enquiry2.body.enquiryId, '2029-02-03T10:00:00.000Z', '2029-02-03T10:30:00.000Z'));
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

describe('GET /api/v1/test-drives (issue #35 scheduler grid, AC1/AC2/AC5)', () => {
  let ctx: TestAppContext;
  let dseAAgent: ReturnType<typeof request.agent>;
  let dseBAgent: ReturnType<typeof request.agent>;
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
    const dseB = ctx.seed.users['dseB'];
    const dseC = ctx.seed.users['dseC'];
    dseAAgent = await loginAgent(ctx.app, dseA.email, dseA.password);
    dseBAgent = await loginAgent(ctx.app, dseB.email, dseB.password);
    dseCAgent = await loginAgent(ctx.app, dseC.email, dseC.password);

    const created = await dseAAgent.post(ENQUIRIES_PATH).send(validEnquiryPayload());
    enquiryId = created.body.enquiryId;
    vehicleId = ctx.seed.demoVehicleIdsByLocation[Object.keys(ctx.seed.locationIds)[0]][0];
  });

  afterAll(async () => {
    await closeTestApp(ctx);
  });

  const schedulerQuery = (from: string, to: string) =>
    `${TEST_DRIVES_PATH}?vehicleId=${vehicleId}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;

  it('AC1/AC2: returns the booked slot (slotStart/slotEnd only, anonymized) for the requested vehicle+range', async () => {
    const booking = await dseAAgent
      .post(TEST_DRIVES_PATH)
      .send({ enquiryId, vehicleId, slotStart: '2026-12-01T10:00:00.000Z', slotEnd: '2026-12-01T10:30:00.000Z' });
    expect(booking.status).toBe(201);

    const res = await dseAAgent.get(schedulerQuery('2026-12-01T00:00:00.000Z', '2026-12-01T23:59:59.999Z'));
    expect(res.status).toBe(200);
    expect(res.body).toEqual(
      expect.arrayContaining([{ slotStart: '2026-12-01T10:00:00.000Z', slotEnd: '2026-12-01T10:30:00.000Z' }]),
    );
    // Deliberately anonymized (AC2/NOTES.md) — no cross-DSE identifying fields.
    expect(res.body.every((s: Record<string, unknown>) => !('testDriveId' in s) && !('enquiryId' in s) && !('bookedBy' in s))).toBe(
      true,
    );
  });

  it('AC5: a DIFFERENT DSE at the SAME location sees the booking (tenant-scoped, not owner-scoped)', async () => {
    await dseAAgent
      .post(TEST_DRIVES_PATH)
      .send({ enquiryId, vehicleId, slotStart: '2026-12-02T10:00:00.000Z', slotEnd: '2026-12-02T10:30:00.000Z' });

    const res = await dseBAgent.get(schedulerQuery('2026-12-02T00:00:00.000Z', '2026-12-02T23:59:59.999Z'));
    expect(res.status).toBe(200);
    expect(res.body).toEqual(
      expect.arrayContaining([{ slotStart: '2026-12-02T10:00:00.000Z', slotEnd: '2026-12-02T10:30:00.000Z' }]),
    );
  });

  it("does not include a booking from a different location/tenant's DSE", async () => {
    await dseAAgent
      .post(TEST_DRIVES_PATH)
      .send({ enquiryId, vehicleId, slotStart: '2026-12-03T10:00:00.000Z', slotEnd: '2026-12-03T10:30:00.000Z' });

    const res = await dseCAgent.get(schedulerQuery('2026-12-03T00:00:00.000Z', '2026-12-03T23:59:59.999Z'));
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('missing vehicleId -> 400', async () => {
    const res = await dseAAgent.get(`${TEST_DRIVES_PATH}?from=2026-12-01T00:00:00.000Z&to=2026-12-01T23:59:59.999Z`);
    expect(res.status).toBe(400);
  });

  it('missing from -> 400', async () => {
    const res = await dseAAgent.get(`${TEST_DRIVES_PATH}?vehicleId=${vehicleId}&to=2026-12-01T23:59:59.999Z`);
    expect(res.status).toBe(400);
  });

  it('missing to -> 400', async () => {
    const res = await dseAAgent.get(`${TEST_DRIVES_PATH}?vehicleId=${vehicleId}&from=2026-12-01T00:00:00.000Z`);
    expect(res.status).toBe(400);
  });

  it('an unknown vehicleId returns an empty array, not an error', async () => {
    const res = await dseAAgent.get(
      `${TEST_DRIVES_PATH}?vehicleId=${NON_EXISTENT_UUID}&from=2026-12-01T00:00:00.000Z&to=2026-12-01T23:59:59.999Z`,
    );
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('unauthenticated -> 401', async () => {
    const res = await request(ctx.app.getHttpServer()).get(
      schedulerQuery('2026-12-01T00:00:00.000Z', '2026-12-01T23:59:59.999Z'),
    );
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
