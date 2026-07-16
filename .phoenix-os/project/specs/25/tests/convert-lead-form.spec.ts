/**
 * Frontend E2E — "Convert to Enquiry" inline action + form
 * Issue #25 — [Story] Convert a Lead into an Enquiry
 *
 * Covers AC1 (entry point + inline form + field presence), AC3
 * (client-side blocked-until-complete/valid validation), AC5 (UI reflects
 * Lead leaving the open queue), and server-error-surfacing. See
 * ../eval-criteria.md for the full EVAL-ID -> assertion mapping.
 *
 * RED PHASE: no application code exists yet for this Story. Expected to
 * fail until the SPA's "Convert to Enquiry" action, ConvertLeadForm, and
 * the backing API are implemented.
 */
import { test, expect } from '@playwright/test';
import { loginApiContext, loginBrowserContext, getUser, createOpenLead, invalidBudgetCases } from './helpers/test-data';

const SNAPSHOT_DIR = '.phoenix-os/project/specs/25/validation/snapshots';

test.describe('Convert to Enquiry inline action + form (AC1, AC3, AC5)', () => {
  test.beforeEach(async ({ page, context, baseURL }) => {
    const dseA = getUser('dseA');
    // Seed a fresh open Lead as dseA via the API, then log the browser
    // context in as the same DSE so it shows up in their queue.
    const apiContext = await loginApiContext(baseURL ?? '', dseA);
    await createOpenLead(apiContext);
    await apiContext.dispose();

    await loginBrowserContext(context, baseURL ?? '', dseA);
    await page.goto('/');
  });

  // ---------------------------------------------------------------------
  // AC1 — entry point + inline expansion (no new route)
  // ---------------------------------------------------------------------
  test('EVAL-AC1-01: "Convert to Enquiry" action is visible for an eligible (non-Converted) queue row', async ({ page }) => {
    const convertAction = page.getByRole('button', { name: /convert to enquiry/i }).first();
    await expect(convertAction).toBeVisible();

    await page.screenshot({ path: `${SNAPSHOT_DIR}/convert-action-visible.png` });
  });

  test('EVAL-AC1-02: clicking the action reveals the qualifying-details form inline, without navigating', async ({ page }) => {
    const urlBefore = page.url();
    await page.getByRole('button', { name: /convert to enquiry/i }).first().click();

    await expect(page.getByLabel(/budget/i)).toBeVisible();
    expect(page.url()).toBe(urlBefore);

    await page.screenshot({ path: `${SNAPSHOT_DIR}/convert-lead-form-inline.png` });
  });

  // ---------------------------------------------------------------------
  // AC2 — the 4 qualifying fields are present
  // ---------------------------------------------------------------------
  test('EVAL-AC1-03: form renders budget, variant, exchange interest, and finance interest fields plus a submit control', async ({
    page,
  }) => {
    await page.getByRole('button', { name: /convert to enquiry/i }).first().click();

    await expect(page.getByLabel(/budget/i)).toBeVisible();
    await expect(page.getByLabel(/variant/i)).toBeVisible();
    await expect(page.getByLabel(/exchange interest/i)).toBeVisible();
    await expect(page.getByLabel(/finance interest/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /submit|convert|save/i }).last()).toBeVisible();
  });

  // ---------------------------------------------------------------------
  // AC3 — client-side: blocked until all 4 fields captured
  // ---------------------------------------------------------------------
  test('EVAL-AC3-01..04: submitting the form empty shows inline errors for all 4 fields and fires no request', async ({
    page,
  }) => {
    let requestFired = false;
    page.on('request', (req) => {
      if (req.url().includes('/convert') && req.method() === 'POST') requestFired = true;
    });

    await page.getByRole('button', { name: /convert to enquiry/i }).first().click();
    await page.getByRole('button', { name: /submit|convert|save/i }).last().click();

    await expect(page.getByText(/budget.*required|required.*budget/i)).toBeVisible();
    await expect(page.getByText(/variant.*required|required.*variant/i)).toBeVisible();
    await expect(page.getByText(/exchange interest.*required|required.*exchange interest/i)).toBeVisible();
    await expect(page.getByText(/finance interest.*required|required.*finance interest/i)).toBeVisible();

    expect(requestFired).toBe(false);

    await page.screenshot({ path: `${SNAPSHOT_DIR}/convert-lead-form-validation-errors.png` });
  });

  for (const { label, value } of invalidBudgetCases.filter((c) => typeof c.value === 'number')) {
    test(`EVAL-AC3 client: rejects invalid budget — ${label}`, async ({ page }) => {
      let requestFired = false;
      page.on('request', (req) => {
        if (req.url().includes('/convert') && req.method() === 'POST') requestFired = true;
      });

      await page.getByRole('button', { name: /convert to enquiry/i }).first().click();
      await page.getByLabel(/budget/i).fill(String(value));
      await page.getByLabel(/variant/i).fill('VXi (O) CVT');
      await page.getByLabel(/exchange interest/i).selectOption({ label: 'Yes' });
      await page.getByLabel(/finance interest/i).selectOption({ label: 'No' });
      await page.getByRole('button', { name: /submit|convert|save/i }).last().click();

      await expect(page.getByText(/budget.*positive|positive.*budget|valid.*budget/i)).toBeVisible();
      expect(requestFired).toBe(false);
    });
  }

  // ---------------------------------------------------------------------
  // AC4/AC5 — successful conversion removes the Lead from the open queue
  // ---------------------------------------------------------------------
  test('EVAL-AC5-03: successful conversion shows success state and removes the Lead from the displayed open queue', async ({
    page,
    baseURL,
  }) => {
    // This DSE's queue accumulates open Leads across every test run in this
    // shared dev environment, so a generic "first row with a Convert
    // button" locator is not stable once more than one open Lead exists — a
    // different, still-open Lead's row can satisfy that filter after this
    // test's own Lead converts and leaves the queue. Seed and target a
    // second, distinctly-named Lead so the row locator pins to exactly the
    // one this test converts.
    const dseA = getUser('dseA');
    const apiContext = await loginApiContext(baseURL ?? '', dseA);
    const targetLead = await createOpenLead(apiContext);
    await apiContext.dispose();
    await page.reload();

    const customerName = String(targetLead.customerName);
    const row = page.getByRole('row', { name: new RegExp(customerName) });
    await row.getByRole('button', { name: /convert to enquiry/i }).click();

    await page.getByLabel(/budget/i).fill('500000');
    await page.getByLabel(/variant/i).fill('VXi (O) CVT');
    await page.getByLabel(/exchange interest/i).selectOption({ label: 'Yes' });
    await page.getByLabel(/finance interest/i).selectOption({ label: 'No' });

    const convertResponse = page.waitForResponse(
      (res) => res.url().includes('/convert') && res.request().method() === 'POST',
    );
    await page.getByRole('button', { name: /submit|convert|save/i }).last().click();
    const response = await convertResponse;

    expect(response.status()).toBe(201);
    await expect(page.getByText(/converted|enquiry created|success/i)).toBeVisible();

    await page.screenshot({ path: `${SNAPSHOT_DIR}/convert-lead-form-success.png` });

    // The row's "Convert to Enquiry" action (and thus the row's open-queue
    // membership) should no longer be present without a full page reload.
    await expect(row.getByRole('button', { name: /convert to enquiry/i })).not.toBeVisible();
  });

  // ---------------------------------------------------------------------
  // Server field errors surfaced back onto the form
  // ---------------------------------------------------------------------
  test('EVAL-AC3-07: a 400 field error from the API is surfaced back onto the corresponding form field', async ({
    page,
  }) => {
    await page.route('**/api/v1/leads/**/convert', async (route) => {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify([{ field: 'budget', message: 'budget must be a positive integer' }]),
      });
    });

    await page.getByRole('button', { name: /convert to enquiry/i }).first().click();
    await page.getByLabel(/budget/i).fill('500000');
    await page.getByLabel(/variant/i).fill('VXi (O) CVT');
    await page.getByLabel(/exchange interest/i).selectOption({ label: 'Yes' });
    await page.getByLabel(/finance interest/i).selectOption({ label: 'No' });
    await page.getByRole('button', { name: /submit|convert|save/i }).last().click();

    await expect(page.getByText(/budget must be a positive integer/i)).toBeVisible();
  });
});
