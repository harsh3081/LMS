/**
 * OpenAPI contract E2E
 * Issue #24 — [Story] Create a New Lead
 *
 * Covers AC7: "Lead creation is exposed via a documented REST endpoint on
 * the OpenAPI contract." See ../eval-criteria.md for the mapping and the
 * documented assumption on the OpenAPI JSON mount path (@nestjs/swagger
 * default is /api-json; update OPENAPI_JSON_PATH below if the
 * implementation mounts it elsewhere).
 *
 * RED PHASE: expected to fail until the backend publishes its OpenAPI
 * document.
 */
import { test, expect } from '@playwright/test';

const OPENAPI_JSON_PATH = process.env.E2E_OPENAPI_JSON_PATH || '/api-json';

test.describe('OpenAPI contract (AC7)', () => {
  test('EVAL-AC7-01: OpenAPI document is reachable and documents POST /api/v1/leads', async ({ request }) => {
    const response = await request.get(OPENAPI_JSON_PATH);
    expect(response.status()).toBe(200);

    const doc = await response.json();
    expect(doc.paths).toBeDefined();
    expect(doc.paths['/api/v1/leads']).toBeDefined();
    expect(doc.paths['/api/v1/leads'].post).toBeDefined();
  });

  test('EVAL-AC7-02: documented operation references CreateLeadDto request fields and a 201 LeadResponseDto-shaped response', async ({
    request,
  }) => {
    const response = await request.get(OPENAPI_JSON_PATH);
    const doc = await response.json();

    const postOp = doc.paths['/api/v1/leads'].post;
    expect(postOp.responses['201']).toBeDefined();

    // Resolve the request-body schema (may be inline or $ref'd into components.schemas)
    const docText = JSON.stringify(doc);
    for (const field of ['customerName', 'mobile', 'sourceId', 'modelId']) {
      expect(docText).toContain(field);
    }

    // Response DTO fields expected somewhere in the document's schemas
    for (const field of ['leadId', 'status', 'ownerId', 'locationId', 'createdAt']) {
      expect(docText).toContain(field);
    }
  });

  test('EVAL-AC7 supporting: GET /api/v1/leads and read-path endpoints are also documented', async ({ request }) => {
    const response = await request.get(OPENAPI_JSON_PATH);
    const doc = await response.json();

    expect(doc.paths['/api/v1/leads']?.get).toBeDefined();
    expect(doc.paths['/api/v1/lead-sources']?.get).toBeDefined();
    expect(doc.paths['/api/v1/vehicle-models']?.get).toBeDefined();
  });
});
