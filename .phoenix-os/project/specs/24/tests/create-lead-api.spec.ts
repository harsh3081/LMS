/**
 * Backend API E2E — POST /api/v1/leads
 * Issue #24 — [Story] Create a New Lead
 *
 * Covers AC2 (server-side), AC3, AC4 (server-side), AC5 (server-side, sourceId
 * + modelId referential checks), and cross-cutting rules CC-01, CC-02, CC-03,
 * CC-06, CC-08, CC-09. See ../eval-criteria.md for the full mapping.
 *
 * Uses Playwright's APIRequestContext directly (no browser) per the
 * "prefer integration tests over mocks" guidance in tech-design.md — these
 * hit the real HTTP boundary rather than mocking the service layer.
 *
 * RED PHASE: no application code exists yet for this Story. Expected to
 * fail (connection refused / 404) until the backend is implemented.
 */
import { test, expect, request as playwrightRequest, APIRequestContext } from '@playwright/test';
import { loginApiContext } from './helpers/auth';
import {
  getUser,
  validCreateLeadPayload,
  invalidMobileCases,
  nonExistentSourceId,
  nonExistentModelId,
} from './helpers/test-data';

const LEADS_PATH = '/api/v1/leads';
const UUID_V4_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

test.describe('POST /api/v1/leads — creation contract', () => {
  let dseAContext: APIRequestContext;
  let noCapabilityContext: APIRequestContext;

  test.beforeAll(async ({ baseURL }) => {
    dseAContext = await loginApiContext(baseURL ?? '', getUser('dseA'));
    noCapabilityContext = await loginApiContext(baseURL ?? '', getUser('noCapabilityUser'));
  });

  test.afterAll(async () => {
    await dseAContext?.dispose();
    await noCapabilityContext?.dispose();
  });

  // ---------------------------------------------------------------------
  // AC3 — unique identifier
  // ---------------------------------------------------------------------
  test('EVAL-AC3-01: happy-path create returns 201 with a UUID leadId and status "New"', async () => {
    const response = await dseAContext.post(LEADS_PATH, { data: validCreateLeadPayload() });
    expect(response.status()).toBe(201);
    const body = await response.json();
    expect(body.leadId).toMatch(UUID_V4_RE);
    expect(body.status).toBe('New');
  });

  test('EVAL-AC3-02 / EVAL-CC-09: two successive creates yield two distinct, non-sequential leadIds', async () => {
    const first = await (await dseAContext.post(LEADS_PATH, { data: validCreateLeadPayload() })).json();
    const second = await (await dseAContext.post(LEADS_PATH, { data: validCreateLeadPayload() })).json();

    expect(first.leadId).not.toBe(second.leadId);
    expect(first.leadId).toMatch(UUID_V4_RE);
    expect(second.leadId).toMatch(UUID_V4_RE);
  });

  // ---------------------------------------------------------------------
  // AC2 — server-side missing-mandatory-field validation
  // ---------------------------------------------------------------------
  test('EVAL-AC2-05: missing customerName -> 400 referencing the field', async () => {
    const payload = validCreateLeadPayload();
    delete (payload as Record<string, unknown>).customerName;
    const response = await dseAContext.post(LEADS_PATH, { data: payload });
    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(JSON.stringify(body).toLowerCase()).toContain('customername');
  });

  test('EVAL-AC2-06: missing mobile -> 400 referencing the field', async () => {
    const payload = validCreateLeadPayload();
    delete (payload as Record<string, unknown>).mobile;
    const response = await dseAContext.post(LEADS_PATH, { data: payload });
    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(JSON.stringify(body).toLowerCase()).toContain('mobile');
  });

  test('EVAL-AC2-07: missing sourceId -> 400 referencing the field', async () => {
    const payload = validCreateLeadPayload();
    delete (payload as Record<string, unknown>).sourceId;
    const response = await dseAContext.post(LEADS_PATH, { data: payload });
    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(JSON.stringify(body).toLowerCase()).toContain('sourceid');
  });

  test('EVAL-AC2-08: missing modelId -> 400 referencing the field', async () => {
    const payload = validCreateLeadPayload();
    delete (payload as Record<string, unknown>).modelId;
    const response = await dseAContext.post(LEADS_PATH, { data: payload });
    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(JSON.stringify(body).toLowerCase()).toContain('modelid');
  });

  // ---------------------------------------------------------------------
  // AC4 — server-side India mobile format validation
  // ---------------------------------------------------------------------
  for (const { label, value } of invalidMobileCases) {
    test(`EVAL-AC4 server: rejects invalid mobile — ${label}`, async () => {
      const payload = validCreateLeadPayload({ mobile: value });
      const response = await dseAContext.post(LEADS_PATH, { data: payload });
      expect(response.status()).toBe(400);
    });
  }

  test('EVAL-AC4-10: valid mobile is accepted (201)', async () => {
    const response = await dseAContext.post(LEADS_PATH, { data: validCreateLeadPayload() });
    expect(response.status()).toBe(201);
  });

  // ---------------------------------------------------------------------
  // AC5 — referential validation of source and model
  // ---------------------------------------------------------------------
  test('EVAL-AC5-02: sourceId not present in lead_sources -> 400', async () => {
    const payload = validCreateLeadPayload({ sourceId: nonExistentSourceId });
    const response = await dseAContext.post(LEADS_PATH, { data: payload });
    expect(response.status()).toBe(400);
  });

  test('EVAL-AC5-04: modelId not present in vehicle_models -> 400', async () => {
    const payload = validCreateLeadPayload({ modelId: nonExistentModelId });
    const response = await dseAContext.post(LEADS_PATH, { data: payload });
    expect(response.status()).toBe(400);
  });

  // ---------------------------------------------------------------------
  // Cross-cutting: server-derived owner/tenant/status, never client-supplied
  // ---------------------------------------------------------------------
  test('EVAL-CC-01: client-supplied ownerId/locationId/dealerGroupId are ignored, not honored', async () => {
    const dseA = getUser('dseA');
    const payload = validCreateLeadPayload({
      ownerId: '00000000-0000-0000-0000-000000000000',
      locationId: '00000000-0000-0000-0000-000000000000',
      dealerGroupId: '00000000-0000-0000-0000-000000000000',
    });
    const response = await dseAContext.post(LEADS_PATH, { data: payload });
    expect(response.status()).toBe(201);
    const body = await response.json();
    expect(body.ownerId).not.toBe('00000000-0000-0000-0000-000000000000');
    expect(body.locationId).toBe(dseA.locationId);
  });

  test('EVAL-CC-02: client-supplied status is ignored — persisted status is always "New"', async () => {
    const payload = validCreateLeadPayload({ status: 'Converted' });
    const response = await dseAContext.post(LEADS_PATH, { data: payload });
    expect(response.status()).toBe(201);
    const body = await response.json();
    expect(body.status).toBe('New');
  });

  // ---------------------------------------------------------------------
  // Cross-cutting: duplicate mobile permitted (no dedupe this Story)
  // ---------------------------------------------------------------------
  test('EVAL-CC-03: duplicate mobile across two leads is permitted (both 201)', async () => {
    const sharedMobile = validCreateLeadPayload().mobile;
    const first = await dseAContext.post(LEADS_PATH, { data: validCreateLeadPayload({ mobile: sharedMobile }) });
    const second = await dseAContext.post(LEADS_PATH, { data: validCreateLeadPayload({ mobile: sharedMobile }) });

    expect(first.status()).toBe(201);
    expect(second.status()).toBe(201);
    const firstBody = await first.json();
    const secondBody = await second.json();
    expect(firstBody.leadId).not.toBe(secondBody.leadId);
  });

  // ---------------------------------------------------------------------
  // Cross-cutting: authN/authZ deny-by-default
  // ---------------------------------------------------------------------
  test('EVAL-CC-06: unauthenticated create -> 401', async ({ baseURL }) => {
    const anonContext = await playwrightRequest.newContext({ baseURL });
    const response = await anonContext.post(LEADS_PATH, { data: validCreateLeadPayload() });
    expect(response.status()).toBe(401);
    await anonContext.dispose();
  });

  test('EVAL-CC-08: authenticated but capability-lacking principal -> 403', async () => {
    const response = await noCapabilityContext.post(LEADS_PATH, { data: validCreateLeadPayload() });
    expect(response.status()).toBe(403);
  });
});
