/**
 * RED->GREEN — Task 3.2.2 (issue #25). GET /api/v1/config exposes both
 * feature flags (newLeadEnabled from #24, convertLeadEnabled from #25,
 * tech-design.md Component 4) so the SPA can read them without a build-step
 * env injection. Also closes a pre-existing #24 coverage gap: this endpoint
 * had no dedicated backend integration test before this Story.
 */
import request from 'supertest';
import { createTestApp, closeTestApp, TestAppContext } from '../support/test-app';

describe('GET /api/v1/config (Task 3.2.2)', () => {
  let ctx: TestAppContext;
  const originalConvertFlag = process.env.CONVERT_LEAD_ENABLED;
  const originalNewLeadFlag = process.env.NEW_LEAD_ENABLED;

  beforeAll(async () => {
    ctx = await createTestApp();
  });

  afterAll(async () => {
    await closeTestApp(ctx);
    if (originalConvertFlag === undefined) delete process.env.CONVERT_LEAD_ENABLED;
    else process.env.CONVERT_LEAD_ENABLED = originalConvertFlag;
    if (originalNewLeadFlag === undefined) delete process.env.NEW_LEAD_ENABLED;
    else process.env.NEW_LEAD_ENABLED = originalNewLeadFlag;
  });

  it('returns both flags enabled by default', async () => {
    delete process.env.CONVERT_LEAD_ENABLED;
    delete process.env.NEW_LEAD_ENABLED;
    const res = await request(ctx.app.getHttpServer()).get('/api/v1/config');
    expect(res.status).toBe(200);
    expect(res.body.newLeadEnabled).toBe(true);
    expect(res.body.convertLeadEnabled).toBe(true);
  });

  it('reflects CONVERT_LEAD_ENABLED=false', async () => {
    process.env.CONVERT_LEAD_ENABLED = 'false';
    const res = await request(ctx.app.getHttpServer()).get('/api/v1/config');
    expect(res.body.convertLeadEnabled).toBe(false);
  });

  it('reflects NEW_LEAD_ENABLED=false (regression, #24 flag unaffected by #25 wiring)', async () => {
    process.env.NEW_LEAD_ENABLED = 'false';
    const res = await request(ctx.app.getHttpServer()).get('/api/v1/config');
    expect(res.body.newLeadEnabled).toBe(false);
  });

  it('config read requires no authentication (public bootstrap read)', async () => {
    delete process.env.CONVERT_LEAD_ENABLED;
    delete process.env.NEW_LEAD_ENABLED;
    const res = await request(ctx.app.getHttpServer()).get('/api/v1/config');
    expect(res.status).toBe(200);
  });

  // -----------------------------------------------------------------
  // ADDED (issue #26) — directEnquiryEnabled, mirrors convertLeadEnabled.
  // -----------------------------------------------------------------
  describe('directEnquiryEnabled (issue #26)', () => {
    const originalDirectEnquiryFlag = process.env.DIRECT_ENQUIRY_ENABLED;

    afterAll(() => {
      if (originalDirectEnquiryFlag === undefined) delete process.env.DIRECT_ENQUIRY_ENABLED;
      else process.env.DIRECT_ENQUIRY_ENABLED = originalDirectEnquiryFlag;
    });

    it('defaults to enabled', async () => {
      delete process.env.DIRECT_ENQUIRY_ENABLED;
      const res = await request(ctx.app.getHttpServer()).get('/api/v1/config');
      expect(res.body.directEnquiryEnabled).toBe(true);
    });

    it('reflects DIRECT_ENQUIRY_ENABLED=false', async () => {
      process.env.DIRECT_ENQUIRY_ENABLED = 'false';
      const res = await request(ctx.app.getHttpServer()).get('/api/v1/config');
      expect(res.body.directEnquiryEnabled).toBe(false);
    });
  });
});
