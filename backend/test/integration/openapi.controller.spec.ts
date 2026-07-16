/**
 * RED->GREEN — Task 4.2.1. Jest mirror of the frozen Playwright
 * tests/openapi-contract.spec.ts (AC7).
 */
import request from 'supertest';
import { createTestApp, closeTestApp, TestAppContext } from '../support/test-app';

describe('OpenAPI contract (Task 4.2.1, AC7)', () => {
  let ctx: TestAppContext;

  beforeAll(async () => {
    ctx = await createTestApp();
  });

  afterAll(async () => {
    await closeTestApp(ctx);
  });

  it('EVAL-AC7-01: OpenAPI document is reachable and documents POST /api/v1/leads', async () => {
    const res = await request(ctx.app.getHttpServer()).get('/api-json');
    expect(res.status).toBe(200);
    expect(res.body.paths['/api/v1/leads']).toBeDefined();
    expect(res.body.paths['/api/v1/leads'].post).toBeDefined();
  });

  it('EVAL-AC7-02: documented operation references CreateLeadDto/LeadResponseDto fields', async () => {
    const res = await request(ctx.app.getHttpServer()).get('/api-json');
    const postOp = res.body.paths['/api/v1/leads'].post;
    expect(postOp.responses['201']).toBeDefined();

    const docText = JSON.stringify(res.body);
    for (const field of ['customerName', 'mobile', 'sourceId', 'modelId']) {
      expect(docText).toContain(field);
    }
    for (const field of ['leadId', 'status', 'ownerId', 'locationId', 'createdAt']) {
      expect(docText).toContain(field);
    }
  });

  it('EVAL-AC7 supporting: GET /api/v1/leads, /lead-sources, /vehicle-models are documented', async () => {
    const res = await request(ctx.app.getHttpServer()).get('/api-json');
    expect(res.body.paths['/api/v1/leads']?.get).toBeDefined();
    expect(res.body.paths['/api/v1/lead-sources']?.get).toBeDefined();
    expect(res.body.paths['/api/v1/vehicle-models']?.get).toBeDefined();
  });

  // -------------------------------------------------------------------
  // Task 3.2.3 (issue #25, AC7) — /convert additive endpoint documented.
  // -------------------------------------------------------------------
  it('EVAL-AC7-01 (issue #25): documents POST /api/v1/leads/{leadId}/convert', async () => {
    const res = await request(ctx.app.getHttpServer()).get('/api-json');
    expect(res.status).toBe(200);
    expect(res.body.paths['/api/v1/leads/{leadId}/convert']).toBeDefined();
    expect(res.body.paths['/api/v1/leads/{leadId}/convert'].post).toBeDefined();
  });

  it('EVAL-AC7-02 (issue #25): documented operation references ConvertLeadDto/EnquiryResponseDto fields', async () => {
    const res = await request(ctx.app.getHttpServer()).get('/api-json');
    const postOp = res.body.paths['/api/v1/leads/{leadId}/convert'].post;
    expect(postOp.responses['201']).toBeDefined();

    const docText = JSON.stringify(res.body);
    for (const field of ['budget', 'variant', 'exchangeInterest', 'financeInterest']) {
      expect(docText).toContain(field);
    }
    for (const field of ['enquiryId', 'leadId', 'convertedBy', 'convertedAt', 'status', 'ownerId', 'locationId']) {
      expect(docText).toContain(field);
    }
  });

  it('EVAL-AC7 supporting (issue #25): /convert is additive alongside the existing /api/v1/leads endpoint', async () => {
    const res = await request(ctx.app.getHttpServer()).get('/api-json');
    expect(res.body.paths['/api/v1/leads']).toBeDefined();
    expect(res.body.paths['/api/v1/leads/{leadId}/convert']).toBeDefined();
  });
});
