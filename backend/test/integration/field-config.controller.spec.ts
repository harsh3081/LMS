/**
 * RED->GREEN (Inside-Out, Experience/API Layer) — issue #27 Task 3.1.
 * Supertest integration tests against the real Nest HTTP pipeline (guards,
 * ValidationPipe, filters) for GET/PUT /api/v1/field-config (AC1/AC2/AC5/AC6).
 */
import request from 'supertest';
import { createTestApp, closeTestApp, TestAppContext } from '../support/test-app';
import { loginAgent } from '../support/auth-agent';

const FIELD_CONFIG_PATH = '/api/v1/field-config';

describe('GET/PUT /api/v1/field-config (Task 3.1)', () => {
  let ctx: TestAppContext;
  let adminAgent: ReturnType<typeof request.agent>;
  let dseAAgent: ReturnType<typeof request.agent>;

  beforeAll(async () => {
    ctx = await createTestApp();
    const admin = ctx.seed.users['admin'];
    const dseA = ctx.seed.users['dseA'];
    adminAgent = await loginAgent(ctx.app, admin.email, admin.password);
    dseAAgent = await loginAgent(ctx.app, dseA.email, dseA.password);
  });

  afterAll(async () => {
    await closeTestApp(ctx);
  });

  it('AC6: GET returns the default configuration with all four fields mandatory', async () => {
    const res = await request(ctx.app.getHttpServer()).get(FIELD_CONFIG_PATH);
    expect(res.status).toBe(200);
    const byName = new Map(res.body.map((f: { fieldName: string; mandatory: boolean }) => [f.fieldName, f.mandatory]));
    expect(byName.get('customerName')).toBe(true);
    expect(byName.get('mobile')).toBe(true);
    expect(byName.get('sourceId')).toBe(true);
    expect(byName.get('modelId')).toBe(true);
  });

  it('GET requires no authentication (forms of any authenticated/unauthenticated role can read it)', async () => {
    const res = await request(ctx.app.getHttpServer()).get(FIELD_CONFIG_PATH);
    expect(res.status).toBe(200);
  });

  it('PUT without a session -> 401', async () => {
    const res = await request(ctx.app.getHttpServer())
      .put(FIELD_CONFIG_PATH)
      .send({ fields: [{ fieldName: 'sourceId', mandatory: false }] });
    expect(res.status).toBe(401);
  });

  it('PUT with a session lacking manage-field-config -> 403', async () => {
    const res = await dseAAgent.put(FIELD_CONFIG_PATH).send({ fields: [{ fieldName: 'sourceId', mandatory: false }] });
    expect(res.status).toBe(403);
  });

  it('PUT with an unknown field name -> 400', async () => {
    const res = await adminAgent.put(FIELD_CONFIG_PATH).send({ fields: [{ fieldName: 'favoriteColor', mandatory: true }] });
    expect(res.status).toBe(400);
    expect(JSON.stringify(res.body).toLowerCase()).toContain('favoritecolor');
  });

  it('AC2/AC3: admin can toggle sourceId to optional and GET reflects it immediately', async () => {
    const putRes = await adminAgent.put(FIELD_CONFIG_PATH).send({ fields: [{ fieldName: 'sourceId', mandatory: false }] });
    expect(putRes.status).toBe(200);
    const sourceId = putRes.body.find((f: { fieldName: string }) => f.fieldName === 'sourceId');
    expect(sourceId.mandatory).toBe(false);
    expect(sourceId.updatedBy).toBe(ctx.seed.users['admin'].userId);

    const getRes = await request(ctx.app.getHttpServer()).get(FIELD_CONFIG_PATH);
    const sourceIdAfter = getRes.body.find((f: { fieldName: string }) => f.fieldName === 'sourceId');
    expect(sourceIdAfter.mandatory).toBe(false);

    // restore for test isolation
    await adminAgent.put(FIELD_CONFIG_PATH).send({ fields: [{ fieldName: 'sourceId', mandatory: true }] });
  });

  it('AC5: a config change is recorded in audit_log with actor/before/after', async () => {
    await adminAgent.put(FIELD_CONFIG_PATH).send({ fields: [{ fieldName: 'modelId', mandatory: false }] });

    const rows: { actor: string; action: string; entity_id: string; before: unknown; after: unknown }[] =
      await ctx.dataSource.query(
        `SELECT actor, action, entity_id, before, after FROM audit_log WHERE action = 'FIELD_CONFIG_UPDATED' AND entity_id = 'modelId' ORDER BY created_at DESC LIMIT 1`,
      );
    expect(rows).toHaveLength(1);
    expect(rows[0].actor).toBe(ctx.seed.users['admin'].userId);
    const before = typeof rows[0].before === 'string' ? JSON.parse(rows[0].before) : rows[0].before;
    const after = typeof rows[0].after === 'string' ? JSON.parse(rows[0].after) : rows[0].after;
    expect(before).toEqual({ mandatory: true });
    expect(after).toEqual({ mandatory: false });

    // restore for test isolation
    await adminAgent.put(FIELD_CONFIG_PATH).send({ fields: [{ fieldName: 'modelId', mandatory: true }] });
  });

  it('re-submitting the same value does not write a new audit entry', async () => {
    const before: { id: string }[] = await ctx.dataSource.query(
      `SELECT id FROM audit_log WHERE action = 'FIELD_CONFIG_UPDATED' AND entity_id = 'mobile'`,
    );
    await adminAgent.put(FIELD_CONFIG_PATH).send({ fields: [{ fieldName: 'mobile', mandatory: true }] });
    const after: { id: string }[] = await ctx.dataSource.query(
      `SELECT id FROM audit_log WHERE action = 'FIELD_CONFIG_UPDATED' AND entity_id = 'mobile'`,
    );
    expect(after.length).toBe(before.length);
  });
});
