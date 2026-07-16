/**
 * Backend API E2E — GET /api/v1/leads (owner-scoped queue), post-conversion behavior
 * Issue #25 — [Story] Convert a Lead into an Enquiry
 *
 * Covers AC5 ("The original Lead is marked 'Converted' and is no longer
 * treated as an open Lead — excluded from the DSE's open queue") and the
 * CC-13 regression guard (create-Lead / open-queue behavior from #24 must
 * not be broken by the queue-exclusion change). See ../eval-criteria.md.
 *
 * RED PHASE: expected to fail until the backend implements both the
 * convert endpoint and the `findOwnQueue` exclusion of Converted leads.
 */
import { test, expect, APIRequestContext } from '@playwright/test';
import { loginApiContext, getUser, createOpenLead, validConvertLeadPayload } from './helpers/test-data';

const LEADS_PATH = '/api/v1/leads';
const convertPath = (leadId: string) => `${LEADS_PATH}/${leadId}/convert`;

test.describe('GET /api/v1/leads — Converted-Lead exclusion (AC5)', () => {
  let dseAContext: APIRequestContext;

  test.beforeAll(async ({ baseURL }) => {
    dseAContext = await loginApiContext(baseURL ?? '', getUser('dseA'));
  });

  test.afterAll(async () => {
    await dseAContext?.dispose();
  });

  test('EVAL-AC5-01: a converted Lead no longer appears in the owning DSE\'s open queue', async () => {
    const lead = await createOpenLead(dseAContext);

    // Sanity: it's in the queue before conversion.
    const beforeQueue = await (await dseAContext.get(LEADS_PATH)).json();
    expect(beforeQueue.some((l: { leadId: string }) => l.leadId === lead.leadId)).toBe(true);

    const convertResponse = await dseAContext.post(convertPath(lead.leadId), { data: validConvertLeadPayload() });
    expect(convertResponse.status()).toBe(201);

    const afterQueue = await (await dseAContext.get(LEADS_PATH)).json();
    expect(afterQueue.some((l: { leadId: string }) => l.leadId === lead.leadId)).toBe(false);
  });

  test('EVAL-AC5-02 (regression guard): converting one Lead does not remove a sibling non-Converted Lead from the queue', async () => {
    const leadToConvert = await createOpenLead(dseAContext);
    const leadToKeepOpen = await createOpenLead(dseAContext);

    const convertResponse = await dseAContext.post(convertPath(leadToConvert.leadId), {
      data: validConvertLeadPayload(),
    });
    expect(convertResponse.status()).toBe(201);

    const queue = await (await dseAContext.get(LEADS_PATH)).json();
    expect(queue.some((l: { leadId: string }) => l.leadId === leadToConvert.leadId)).toBe(false);
    expect(queue.some((l: { leadId: string }) => l.leadId === leadToKeepOpen.leadId)).toBe(true);
  });

  test('EVAL-CC-13 (regression): newest-first queue ordering among remaining open Leads still holds after a conversion', async () => {
    const converted = await createOpenLead(dseAContext);
    await dseAContext.post(convertPath(converted.leadId), { data: validConvertLeadPayload() });

    const olderOpen = await createOpenLead(dseAContext);
    const newerOpen = await createOpenLead(dseAContext);

    const queue = await (await dseAContext.get(LEADS_PATH)).json();
    const olderIndex = queue.findIndex((l: { leadId: string }) => l.leadId === olderOpen.leadId);
    const newerIndex = queue.findIndex((l: { leadId: string }) => l.leadId === newerOpen.leadId);

    expect(newerIndex).toBeLessThan(olderIndex);
  });
});
