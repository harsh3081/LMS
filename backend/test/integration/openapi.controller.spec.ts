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
});
