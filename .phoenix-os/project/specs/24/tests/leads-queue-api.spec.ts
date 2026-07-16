/**
 * Backend API E2E — GET /api/v1/leads (owner-scoped queue)
 * Issue #24 — [Story] Create a New Lead
 *
 * Covers AC6 (API-level: immediate visibility, newest-first ordering) and
 * cross-cutting tenant/owner isolation (CC-04, CC-05) and auth (CC-07).
 * See ../eval-criteria.md for the full mapping.
 *
 * RED PHASE: expected to fail until the backend and its owner-scoped queue
 * endpoint exist.
 */
import { test, expect, request as playwrightRequest, APIRequestContext } from '@playwright/test';
import { loginApiContext } from './helpers/auth';
import { getUser, validCreateLeadPayload } from './helpers/test-data';

const LEADS_PATH = '/api/v1/leads';

test.describe('GET /api/v1/leads — owner-scoped queue (AC6, tenant/owner isolation)', () => {
  let dseAContext: APIRequestContext;
  let dseBContext: APIRequestContext;
  let dseCContext: APIRequestContext;

  test.beforeAll(async ({ baseURL }) => {
    dseAContext = await loginApiContext(baseURL ?? '', getUser('dseA'));
    dseBContext = await loginApiContext(baseURL ?? '', getUser('dseB'));
    dseCContext = await loginApiContext(baseURL ?? '', getUser('dseC'));
  });

  test.afterAll(async () => {
    await dseAContext?.dispose();
    await dseBContext?.dispose();
    await dseCContext?.dispose();
  });

  test('EVAL-AC6-02: newly created lead appears in the creating DSE queue immediately', async () => {
    const payload = validCreateLeadPayload();
    const createResponse = await dseAContext.post(LEADS_PATH, { data: payload });
    expect(createResponse.status()).toBe(201);
    const created = await createResponse.json();

    const queueResponse = await dseAContext.get(LEADS_PATH);
    expect(queueResponse.status()).toBe(200);
    const queue = await queueResponse.json();

    expect(Array.isArray(queue)).toBe(true);
    expect(queue.some((lead: { leadId: string }) => lead.leadId === created.leadId)).toBe(true);
  });

  test('EVAL-AC6-03: queue is ordered newest-first', async () => {
    const first = await (await dseAContext.post(LEADS_PATH, { data: validCreateLeadPayload() })).json();
    const second = await (await dseAContext.post(LEADS_PATH, { data: validCreateLeadPayload() })).json();

    const queueResponse = await dseAContext.get(LEADS_PATH);
    const queue = await queueResponse.json();

    const firstIndex = queue.findIndex((l: { leadId: string }) => l.leadId === first.leadId);
    const secondIndex = queue.findIndex((l: { leadId: string }) => l.leadId === second.leadId);

    expect(secondIndex).toBeLessThan(firstIndex);
  });

  test('EVAL-CC-04: tenant isolation — a location-2 DSE never sees a location-1 DSE lead', async () => {
    const dseALead = await (await dseAContext.post(LEADS_PATH, { data: validCreateLeadPayload() })).json();

    const dseCQueue = await (await dseCContext.get(LEADS_PATH)).json();
    expect(dseCQueue.some((l: { leadId: string }) => l.leadId === dseALead.leadId)).toBe(false);
  });

  test('EVAL-CC-05: owner isolation — dseB (same location as dseA) does not see dseA leads', async () => {
    const dseALead = await (await dseAContext.post(LEADS_PATH, { data: validCreateLeadPayload() })).json();

    const dseBQueue = await (await dseBContext.get(LEADS_PATH)).json();
    expect(dseBQueue.some((l: { leadId: string }) => l.leadId === dseALead.leadId)).toBe(false);

    // Confirm dseB's own queue does correctly show their own lead (sanity check
    // that the endpoint isn't simply returning an empty array for everyone).
    const dseBLead = await (await dseBContext.post(LEADS_PATH, { data: validCreateLeadPayload() })).json();
    const dseBQueueAfterOwnCreate = await (await dseBContext.get(LEADS_PATH)).json();
    expect(dseBQueueAfterOwnCreate.some((l: { leadId: string }) => l.leadId === dseBLead.leadId)).toBe(true);
  });

  test('EVAL-CC-07: unauthenticated queue read -> 401', async ({ baseURL }) => {
    const anonContext = await playwrightRequest.newContext({ baseURL });
    const response = await anonContext.get(LEADS_PATH);
    expect(response.status()).toBe(401);
    await anonContext.dispose();
  });
});
