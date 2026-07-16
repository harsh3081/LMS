/**
 * RED->GREEN — bootstrap login endpoint (tech-design.md ADR-004; the
 * fixtures/README.md assumed contract the frozen Playwright suite relies
 * on: POST /api/v1/auth/login).
 */
import request from 'supertest';
import { createTestApp, closeTestApp, TestAppContext } from '../support/test-app';

describe('POST /api/v1/auth/login', () => {
  let ctx: TestAppContext;

  beforeAll(async () => {
    ctx = await createTestApp();
  });

  afterAll(async () => {
    await closeTestApp(ctx);
  });

  it('sets a session cookie on valid credentials', async () => {
    const dseA = ctx.seed.users['dseA'];
    const res = await request(ctx.app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: dseA.email, password: dseA.password });
    expect(res.status).toBe(200);
    expect(res.headers['set-cookie']?.[0]).toMatch(/^sid=/);
  });

  it('rejects an invalid password with 401', async () => {
    const dseA = ctx.seed.users['dseA'];
    const res = await request(ctx.app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: dseA.email, password: 'wrong-password' });
    expect(res.status).toBe(401);
  });

  it('rejects an unknown email with 401', async () => {
    const res = await request(ctx.app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'nobody@issue24.test', password: 'whatever' });
    expect(res.status).toBe(401);
  });
});
