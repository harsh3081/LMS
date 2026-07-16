/**
 * RED->GREEN (Inside-Out, Experience/API Layer) — issue #27 Task 3.2/4.1.
 * Proves AC3/AC4 end-to-end: POST /api/v1/leads and POST /api/v1/enquiries
 * enforce whatever is CURRENTLY configured in field_config (via
 * FieldConfigService), not a hardcoded field list — toggling a field
 * optional lets a submission omitting it succeed; toggling it back blocks it
 * again with a validation error identifying the missing field.
 */
import request from 'supertest';
import { createTestApp, closeTestApp, TestAppContext } from '../support/test-app';
import { loginAgent } from '../support/auth-agent';

const LEADS_PATH = '/api/v1/leads';
const ENQUIRIES_PATH = '/api/v1/enquiries';
const FIELD_CONFIG_PATH = '/api/v1/field-config';

describe('field-config-driven mandatory enforcement (issue #27 Task 3.2/4.1)', () => {
  let ctx: TestAppContext;
  let adminAgent: ReturnType<typeof request.agent>;
  let dseAAgent: ReturnType<typeof request.agent>;

  const validLeadPayload = () => ({
    customerName: `Config Test ${Date.now()}-${Math.random()}`,
    mobile: '9876543210',
    sourceId: 1,
    modelId: 101,
  });

  const validDirectEnquiryPayload = () => ({
    ...validLeadPayload(),
    budget: 500000,
    variant: 'VXi (O) CVT',
    exchangeInterest: true,
    financeInterest: false,
  });

  async function setSourceIdMandatory(mandatory: boolean) {
    await adminAgent.put(FIELD_CONFIG_PATH).send({ fields: [{ fieldName: 'sourceId', mandatory }] });
  }

  beforeAll(async () => {
    ctx = await createTestApp();
    const admin = ctx.seed.users['admin'];
    const dseA = ctx.seed.users['dseA'];
    adminAgent = await loginAgent(ctx.app, admin.email, admin.password);
    dseAAgent = await loginAgent(ctx.app, dseA.email, dseA.password);
  });

  afterAll(async () => {
    await setSourceIdMandatory(true); // restore AC6 default for any later suite
    await closeTestApp(ctx);
  });

  it('AC6/default: sourceId mandatory by default — omitting it on Lead creation -> 400', async () => {
    const payload = validLeadPayload() as Record<string, unknown>;
    delete payload.sourceId;
    const res = await dseAAgent.post(LEADS_PATH).send(payload);
    expect(res.status).toBe(400);
    expect(JSON.stringify(res.body).toLowerCase()).toContain('sourceid');
  });

  it('AC2/AC3: after an admin marks sourceId optional, omitting it on Lead creation -> 201 with sourceId null', async () => {
    await setSourceIdMandatory(false);
    const payload = validLeadPayload() as Record<string, unknown>;
    delete payload.sourceId;

    const res = await dseAAgent.post(LEADS_PATH).send(payload);
    expect(res.status).toBe(201);
    expect(res.body.sourceId).toBeNull();
  });

  it('AC3: re-marking sourceId mandatory blocks the same omission again ("enforced at next load")', async () => {
    await setSourceIdMandatory(true);
    const payload = validLeadPayload() as Record<string, unknown>;
    delete payload.sourceId;

    const res = await dseAAgent.post(LEADS_PATH).send(payload);
    expect(res.status).toBe(400);
    expect(JSON.stringify(res.body).toLowerCase()).toContain('sourceid');
  });

  it('a still-supplied-but-invalid sourceId is rejected referentially even while optional', async () => {
    await setSourceIdMandatory(false);
    const res = await dseAAgent.post(LEADS_PATH).send({ ...validLeadPayload(), sourceId: 999999 });
    expect(res.status).toBe(400);
    await setSourceIdMandatory(true);
  });

  it('AC4 (Direct Enquiry): omitting customerName when mandatory -> 400 identifying the field', async () => {
    const payload = validDirectEnquiryPayload() as Record<string, unknown>;
    delete payload.customerName;
    const res = await dseAAgent.post(ENQUIRIES_PATH).send(payload);
    expect(res.status).toBe(400);
    expect(JSON.stringify(res.body).toLowerCase()).toContain('customername');
  });

  it('AC3 (Direct Enquiry): after marking customerName optional, omitting it succeeds (201, null)', async () => {
    await adminAgent.put(FIELD_CONFIG_PATH).send({ fields: [{ fieldName: 'customerName', mandatory: false }] });
    const payload = validDirectEnquiryPayload() as Record<string, unknown>;
    delete payload.customerName;

    const res = await dseAAgent.post(ENQUIRIES_PATH).send(payload);
    expect(res.status).toBe(201);
    expect(res.body.customerName).toBeNull();

    await adminAgent.put(FIELD_CONFIG_PATH).send({ fields: [{ fieldName: 'customerName', mandatory: true }] });
  });

  it('an empty-string mandatory field is treated as missing (blank submission blocked, AC4)', async () => {
    const res = await dseAAgent.post(LEADS_PATH).send({ ...validLeadPayload(), customerName: '' });
    expect(res.status).toBe(400);
    expect(JSON.stringify(res.body).toLowerCase()).toContain('customername');
  });
});
