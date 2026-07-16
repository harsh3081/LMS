/**
 * Feature-toggle E2E — "Convert to Enquiry" entry point
 * Issue #25 — [Story] Convert a Lead into an Enquiry
 *
 * Covers CC-11: the "Convert to Enquiry" entry point is gated by the
 * CONVERT_LEAD_ENABLED feature flag (tech-design.md Component 4, mirrors
 * #24's NEW_LEAD_ENABLED pattern). See ../eval-criteria.md.
 *
 * NOTE ON SCOPE: fully exercising the toggle (proving the entry point is
 * HIDDEN when the flag is off) requires restarting the server/app with a
 * different environment variable, which is outside a single Playwright
 * test run against one running instance. That half is flagged MANUAL
 * VERIFICATION REQUIRED in eval-criteria.md (EVAL-CC-11 note), mirroring
 * #24's tests/feature-toggle.spec.ts precedent exactly. This spec
 * automates the half that IS reachable from one running instance: the
 * entry point is visible and functional when the toggle is at its default
 * (enabled) test-environment state.
 *
 * RED PHASE: expected to fail until the SPA and its entry point exist.
 */
import { test, expect } from '@playwright/test';
import { loginApiContext, loginBrowserContext, getUser, createOpenLead } from './helpers/test-data';

const SNAPSHOT_DIR = '.phoenix-os/project/specs/25/validation/snapshots';

test.describe('Convert to Enquiry entry point / feature toggle (CC-11)', () => {
  test('EVAL-CC-11: "Convert to Enquiry" action is visible on the DSE landing/queue page (toggle enabled)', async ({
    page,
    context,
    baseURL,
  }) => {
    const dseA = getUser('dseA');
    const apiContext = await loginApiContext(baseURL ?? '', dseA);
    await createOpenLead(apiContext);
    await apiContext.dispose();

    await loginBrowserContext(context, baseURL ?? '', dseA);
    await page.goto('/');

    const convertAction = page.getByRole('button', { name: /convert to enquiry/i }).first();
    await expect(convertAction).toBeVisible();

    await page.screenshot({ path: `${SNAPSHOT_DIR}/convert-entry-point-enabled.png` });
  });

  // eslint-disable-next-line playwright/no-skipped-test
  test.skip(
    'EVAL-CC-11 (manual companion): entry point is hidden when CONVERT_LEAD_ENABLED=false — ' +
      'requires restarting the app with the flag off; see eval-criteria.md EVAL-CC-11 note. ' +
      'Not automated in this single-instance Playwright run.',
    async () => {
      /* Intentionally left as a documented manual/ops step, not executed here. */
    },
  );
});
