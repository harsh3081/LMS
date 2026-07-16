/**
 * Backend API E2E — POST /api/v1/leads/{leadId}/convert
 * Issue #25 — [Story] Convert a Lead into an Enquiry
 *
 * Covers AC2, AC3 (server-side), AC4, AC6, and cross-cutting rules
 * CC-01..CC-10, CC-12. See ../eval-criteria.md for the full mapping.
 *
 * Uses Playwright's APIRequestContext directly (no browser) per the
 * "prefer integration tests over mocks" guidance in tech-design.md — these
 * hit the real HTTP boundary rather than mocking the service layer.
 *
 * RED PHASE: no application code exists yet for this Story. Expected to
 * fail (connection refused / 404) until the backend is implemented.
 */
import { test, expect, request as playwrightRequest, APIRequestContext } from '@playwright/test';
import {
  loginApiContext,
  getUser,
  createOpenLead,
  validConvertLeadPayload,
  invalidBudgetCases,
  invalidVariantCases,
  largeValidBudget,
} from './helpers/test-data';

const LEADS_PATH = '/api/v1/leads';
const convertPath = (leadId: string) => `${LEADS_PATH}/${leadId}/convert`;
const UUID_V4_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

test.describe('POST /api/v1/leads/{leadId}/convert — conversion contract', () => {
  let dseAContext: APIRequestContext;
  let dseBContext: APIRequestContext;
  let dseCContext: APIRequestContext;
  let noCapabilityContext: APIRequestContext;

  test.beforeAll(async ({ baseURL }) => {
    dseAContext = await loginApiContext(baseURL ?? '', getUser('dseA'));
    dseBContext = await loginApiContext(baseURL ?? '', getUser('dseB'));
    dseCContext = await loginApiContext(baseURL ?? '', getUser('dseC'));
    noCapabilityContext = await loginApiContext(baseURL ?? '', getUser('noCapabilityUser'));
  });

  test.afterAll(async () => {
    await dseAContext?.dispose();
    await dseBContext?.dispose();
    await dseCContext?.dispose();
    await noCapabilityContext?.dispose();
  });

  // ---------------------------------------------------------------------
  // AC4 / AC6 — happy path: Enquiry created, linked, converted-by/at stamped
  // ---------------------------------------------------------------------
  test('EVAL-AC4-01: happy-path conversion returns 201 with an Enquiry linked to the source Lead', async () => {
    const lead = await createOpenLead(dseAContext);
    const response = await dseAContext.post(convertPath(lead.leadId), { data: validConvertLeadPayload() });

    expect(response.status()).toBe(201);
    const body = await response.json();
    expect(body.enquiryId).toMatch(UUID_V4_RE);
    expect(body.leadId).toBe(lead.leadId);
  });

  test('EVAL-AC4-02: Enquiry response echoes the submitted qualifying fields', async () => {
    const lead = await createOpenLead(dseAContext);
    const payload = validConvertLeadPayload({ budget: 750000, variant: 'ZXi Plus AT', exchangeInterest: false, financeInterest: true });
    const response = await dseAContext.post(convertPath(lead.leadId), { data: payload });

    expect(response.status()).toBe(201);
    const body = await response.json();
    expect(body.budget).toBe(750000);
    expect(body.variant).toBe('ZXi Plus AT');
    expect(body.exchangeInterest).toBe(false);
    expect(body.financeInterest).toBe(true);
  });

  test('EVAL-AC4-03 / EVAL-CC-10: two separate conversions yield two distinct, UUID-shaped enquiryIds', async () => {
    const leadOne = await createOpenLead(dseAContext);
    const leadTwo = await createOpenLead(dseAContext);

    const first = await (await dseAContext.post(convertPath(leadOne.leadId), { data: validConvertLeadPayload() })).json();
    const second = await (await dseAContext.post(convertPath(leadTwo.leadId), { data: validConvertLeadPayload() })).json();

    expect(first.enquiryId).not.toBe(second.enquiryId);
    expect(first.enquiryId).toMatch(UUID_V4_RE);
    expect(second.enquiryId).toMatch(UUID_V4_RE);
  });

  test('EVAL-AC6-01: convertedBy on the Enquiry identifies the converting DSE (differs by actor)', async () => {
    const leadForA = await createOpenLead(dseAContext);
    const leadForB = await createOpenLead(dseBContext);

    const byA = await (await dseAContext.post(convertPath(leadForA.leadId), { data: validConvertLeadPayload() })).json();
    const byB = await (await dseBContext.post(convertPath(leadForB.leadId), { data: validConvertLeadPayload() })).json();

    expect(typeof byA.convertedBy).toBe('string');
    expect(byA.convertedBy.length).toBeGreaterThan(0);
    expect(byA.convertedBy).not.toBe(byB.convertedBy);
  });

  test('EVAL-AC6-02: convertedAt is a valid ISO timestamp close to the conversion moment', async () => {
    const lead = await createOpenLead(dseAContext);
    const before = Date.now();
    const body = await (await dseAContext.post(convertPath(lead.leadId), { data: validConvertLeadPayload() })).json();
    const after = Date.now();

    const convertedAtMs = new Date(body.convertedAt).getTime();
    expect(Number.isNaN(convertedAtMs)).toBe(false);
    expect(convertedAtMs).toBeGreaterThanOrEqual(before - 5000);
    expect(convertedAtMs).toBeLessThanOrEqual(after + 5000);
  });

  // ---------------------------------------------------------------------
  // AC2 — server-side missing-qualifying-field validation
  // ---------------------------------------------------------------------
  test('EVAL-AC2-01: missing budget -> 400 referencing the field', async () => {
    const lead = await createOpenLead(dseAContext);
    const payload = validConvertLeadPayload();
    delete (payload as Record<string, unknown>).budget;
    const response = await dseAContext.post(convertPath(lead.leadId), { data: payload });
    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(JSON.stringify(body).toLowerCase()).toContain('budget');
  });

  test('EVAL-AC2-02: missing variant -> 400 referencing the field', async () => {
    const lead = await createOpenLead(dseAContext);
    const payload = validConvertLeadPayload();
    delete (payload as Record<string, unknown>).variant;
    const response = await dseAContext.post(convertPath(lead.leadId), { data: payload });
    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(JSON.stringify(body).toLowerCase()).toContain('variant');
  });

  test('EVAL-AC2-03: missing exchangeInterest -> 400 referencing the field, not defaulted to false', async () => {
    const lead = await createOpenLead(dseAContext);
    const payload = validConvertLeadPayload();
    delete (payload as Record<string, unknown>).exchangeInterest;
    const response = await dseAContext.post(convertPath(lead.leadId), { data: payload });
    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(JSON.stringify(body).toLowerCase()).toContain('exchangeinterest');
  });

  test('EVAL-AC2-04: missing financeInterest -> 400 referencing the field, not defaulted to false', async () => {
    const lead = await createOpenLead(dseAContext);
    const payload = validConvertLeadPayload();
    delete (payload as Record<string, unknown>).financeInterest;
    const response = await dseAContext.post(convertPath(lead.leadId), { data: payload });
    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(JSON.stringify(body).toLowerCase()).toContain('financeinterest');
  });

  // ---------------------------------------------------------------------
  // AC3 — boundary/value validation of the qualifying fields
  // ---------------------------------------------------------------------
  for (const { label, value } of invalidBudgetCases) {
    test(`EVAL-AC3 server: rejects invalid budget — ${label}`, async () => {
      const lead = await createOpenLead(dseAContext);
      const payload = validConvertLeadPayload({ budget: value });
      const response = await dseAContext.post(convertPath(lead.leadId), { data: payload });
      expect(response.status()).toBe(400);
    });
  }

  test('EVAL-AC3-05: a large-but-valid budget is accepted (no artificial upper bound)', async () => {
    const lead = await createOpenLead(dseAContext);
    const response = await dseAContext.post(convertPath(lead.leadId), {
      data: validConvertLeadPayload({ budget: largeValidBudget }),
    });
    expect(response.status()).toBe(201);
    const body = await response.json();
    expect(body.budget).toBe(largeValidBudget);
  });

  for (const { label, value } of invalidVariantCases) {
    test(`EVAL-AC3 server: rejects invalid variant — ${label}`, async () => {
      const lead = await createOpenLead(dseAContext);
      const payload = validConvertLeadPayload({ variant: value });
      const response = await dseAContext.post(convertPath(lead.leadId), { data: payload });
      expect(response.status()).toBe(400);
    });
  }

  test('EVAL-AC3-06: valid conversion payload is accepted (201) — positive control', async () => {
    const lead = await createOpenLead(dseAContext);
    const response = await dseAContext.post(convertPath(lead.leadId), { data: validConvertLeadPayload() });
    expect(response.status()).toBe(201);
  });

  // ---------------------------------------------------------------------
  // Cross-cutting: server-derived owner/tenant/convertedBy/status
  // ---------------------------------------------------------------------
  test('EVAL-CC-01: client-supplied ownerId/locationId/dealerGroupId/convertedBy/status are ignored, not honored', async () => {
    const dseA = getUser('dseA');
    const lead = await createOpenLead(dseAContext);
    const payload = validConvertLeadPayload({
      ownerId: '00000000-0000-0000-0000-000000000000',
      locationId: '00000000-0000-0000-0000-000000000000',
      dealerGroupId: '00000000-0000-0000-0000-000000000000',
      convertedBy: '00000000-0000-0000-0000-000000000000',
      status: 'Hijacked',
    });
    const response = await dseAContext.post(convertPath(lead.leadId), { data: payload });
    expect(response.status()).toBe(201);
    const body = await response.json();
    expect(body.ownerId).not.toBe('00000000-0000-0000-0000-000000000000');
    expect(body.locationId).toBe(dseA.locationId);
    expect(body.convertedBy).not.toBe('00000000-0000-0000-0000-000000000000');
    expect(body.status).not.toBe('Hijacked');
  });

  // ---------------------------------------------------------------------
  // Cross-cutting: EnquiryResponseDto shape — dealerGroupId intentionally excluded
  // ---------------------------------------------------------------------
  test('EVAL-CC-09: EnquiryResponseDto omits dealerGroupId (per resolved spec)', async () => {
    const lead = await createOpenLead(dseAContext);
    const body = await (await dseAContext.post(convertPath(lead.leadId), { data: validConvertLeadPayload() })).json();
    expect(body.dealerGroupId).toBeUndefined();
  });

  // ---------------------------------------------------------------------
  // Cross-cutting: eligibility — 404 (not found / out-of-scope) vs 409 (already converted)
  // ---------------------------------------------------------------------
  test('EVAL-CC-02: converting a non-existent leadId -> 404', async () => {
    const response = await dseAContext.post(convertPath('00000000-0000-0000-0000-000000000000'), {
      data: validConvertLeadPayload(),
    });
    expect(response.status()).toBe(404);
  });

  test('EVAL-CC-03: converting another owner\'s Lead (same location) -> 404, not 403 (no cross-tenant leakage)', async () => {
    const dseALead = await createOpenLead(dseAContext);
    const response = await dseBContext.post(convertPath(dseALead.leadId), { data: validConvertLeadPayload() });
    expect(response.status()).toBe(404);
  });

  test('EVAL-CC-04: converting a Lead from a different location -> 404', async () => {
    const dseALead = await createOpenLead(dseAContext);
    const response = await dseCContext.post(convertPath(dseALead.leadId), { data: validConvertLeadPayload() });
    expect(response.status()).toBe(404);
  });

  test('EVAL-CC-05: re-converting an already-Converted Lead -> 409', async () => {
    const lead = await createOpenLead(dseAContext);
    const first = await dseAContext.post(convertPath(lead.leadId), { data: validConvertLeadPayload() });
    expect(first.status()).toBe(201);

    const second = await dseAContext.post(convertPath(lead.leadId), { data: validConvertLeadPayload() });
    expect(second.status()).toBe(409);
  });

  // ---------------------------------------------------------------------
  // Cross-cutting: authN/authZ deny-by-default
  // ---------------------------------------------------------------------
  test('EVAL-CC-06: unauthenticated convert -> 401', async ({ baseURL }) => {
    const lead = await createOpenLead(dseAContext);
    const anonContext = await playwrightRequest.newContext({ baseURL });
    const response = await anonContext.post(convertPath(lead.leadId), { data: validConvertLeadPayload() });
    expect(response.status()).toBe(401);
    await anonContext.dispose();
  });

  test('EVAL-CC-07: authenticated but capability-lacking principal -> 403', async () => {
    const lead = await createOpenLead(dseAContext);
    const response = await noCapabilityContext.post(convertPath(lead.leadId), { data: validConvertLeadPayload() });
    expect(response.status()).toBe(403);
  });

  // ---------------------------------------------------------------------
  // Cross-cutting: atomicity proxy — a rejected (400) attempt must not
  // partially convert the Lead; a subsequent valid attempt must still
  // succeed exactly once.
  // ---------------------------------------------------------------------
  test('EVAL-CC-08: a failed (400) conversion attempt leaves the Lead convertible; the next valid attempt succeeds', async () => {
    const lead = await createOpenLead(dseAContext);

    const failed = await dseAContext.post(convertPath(lead.leadId), {
      data: validConvertLeadPayload({ budget: -1 }),
    });
    expect(failed.status()).toBe(400);

    const succeeded = await dseAContext.post(convertPath(lead.leadId), { data: validConvertLeadPayload() });
    expect(succeeded.status()).toBe(201);

    // And it is now genuinely Converted — a second valid attempt correctly 409s,
    // proving the failed attempt didn't leave the Lead in a half-converted state.
    const reconvert = await dseAContext.post(convertPath(lead.leadId), { data: validConvertLeadPayload() });
    expect(reconvert.status()).toBe(409);
  });

  // ---------------------------------------------------------------------
  // Regression: existing create-Lead flow is unaffected by this Story
  // ---------------------------------------------------------------------
  test('EVAL-CC-12 (regression): POST /api/v1/leads still succeeds unaffected by the conversion slice', async () => {
    const lead = await createOpenLead(dseAContext);
    expect(lead.leadId).toMatch(UUID_V4_RE);
  });
});
