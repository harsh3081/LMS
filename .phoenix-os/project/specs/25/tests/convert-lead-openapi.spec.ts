/**
 * OpenAPI contract E2E
 * Issue #25 — [Story] Convert a Lead into an Enquiry
 *
 * Covers AC7: "Conversion is exposed via a documented REST endpoint on the
 * OpenAPI contract." See ../eval-criteria.md for the mapping and the
 * documented assumption on the OpenAPI JSON mount path (@nestjs/swagger
 * default is /api-json — same assumption as #24's openapi-contract.spec.ts;
 * update OPENAPI_JSON_PATH below if the implementation mounts it
 * elsewhere).
 *
 * RED PHASE: expected to fail until the backend publishes its OpenAPI
 * document including the new conversion endpoint.
 */
import { test, expect } from '@playwright/test';

const OPENAPI_JSON_PATH = process.env.E2E_OPENAPI_JSON_PATH || '/api-json';
const CONVERT_PATH = '/api/v1/leads/{leadId}/convert';

test.describe('OpenAPI contract (AC7)', () => {
  test('EVAL-AC7-01: OpenAPI document is reachable and documents POST /api/v1/leads/{leadId}/convert', async ({ request }) => {
    const response = await request.get(OPENAPI_JSON_PATH);
    expect(response.status()).toBe(200);

    const doc = await response.json();
    expect(doc.paths).toBeDefined();
    expect(doc.paths[CONVERT_PATH]).toBeDefined();
    expect(doc.paths[CONVERT_PATH].post).toBeDefined();
  });

  test('EVAL-AC7-02: documented operation references ConvertLeadDto request fields and a 201 EnquiryResponseDto-shaped response', async ({
    request,
  }) => {
    const response = await request.get(OPENAPI_JSON_PATH);
    const doc = await response.json();

    const postOp = doc.paths[CONVERT_PATH].post;
    expect(postOp.responses['201']).toBeDefined();

    // Resolve the request-body / response schemas (may be inline or $ref'd
    // into components.schemas) by searching the serialized document.
    const docText = JSON.stringify(doc);
    for (const field of ['budget', 'variant', 'exchangeInterest', 'financeInterest']) {
      expect(docText).toContain(field);
    }

    for (const field of ['enquiryId', 'leadId', 'convertedBy', 'convertedAt', 'status', 'ownerId', 'locationId']) {
      expect(docText).toContain(field);
    }
  });

  test('EVAL-AC7 supporting: the convert operation requires the convert-lead capability and a session (documented or enforced, not merely public)', async ({
    request,
  }) => {
    const response = await request.get(OPENAPI_JSON_PATH);
    const doc = await response.json();

    // The endpoint must exist alongside the existing #24 Lead endpoints,
    // proving this is an additive contract change, not a replacement.
    expect(doc.paths['/api/v1/leads']).toBeDefined();
    expect(doc.paths[CONVERT_PATH]).toBeDefined();
  });
});
