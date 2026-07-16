/**
 * Feature-toggle entry point E2E
 * Issue #24 — [Story] Create a New Lead
 *
 * Covers CC-10: the "New Lead" entry point is gated by a simple config/env
 * feature-toggle flag (tech-design.md, resolved). See ../eval-criteria.md.
 *
 * NOTE ON SCOPE: fully exercising the toggle (proving the entry point is
 * HIDDEN when the flag is off) requires restarting the server/app with a
 * different environment variable, which is outside a single Playwright
 * test run against one running instance. That half is flagged
 * MANUAL VERIFICATION REQUIRED in eval-criteria.md (EVAL-CC-10 note). This
 * spec automates the half that IS reachable from one running instance:
 * the entry point is visible and functional when the toggle is at its
 * default (enabled) test-environment state.
 *
 * RED PHASE: expected to fail until the SPA and its entry point exist.
 */
import { test, expect } from '@playwright/test';
import { loginBrowserContext } from './helpers/auth';
import { getUser } from './helpers/test-data';

const SNAPSHOT_DIR = '.phoenix-os/project/specs/24/validation/snapshots';

test.describe('New Lead entry point / feature toggle (CC-10)', () => {
  test('EVAL-CC-10: entry point to the New Lead form is visible on the DSE landing page (toggle enabled)', async ({
    page,
    context,
    baseURL,
  }) => {
    const dseA = getUser('dseA');
    await loginBrowserContext(context, baseURL ?? '', dseA);
    await page.goto('/');

    const entryPoint = page.getByRole('link', { name: /new lead/i }).or(page.getByRole('button', { name: /new lead/i }));
    await expect(entryPoint.first()).toBeVisible();

    await page.screenshot({ path: `${SNAPSHOT_DIR}/dse-landing-entry-point.png` });

    await entryPoint.first().click();
    await expect(page).toHaveURL(/\/leads\/new/);
  });

  // eslint-disable-next-line playwright/no-skipped-test
  test.skip(
    'EVAL-CC-10 (manual companion): entry point is hidden when NEW_LEAD_ENABLED=false — ' +
      'requires restarting the app with the flag off; see eval-criteria.md EVAL-CC-10 / EVAL-CC-14 notes. ' +
      'Not automated in this single-instance Playwright run.',
    async () => {
      /* Intentionally left as a documented manual/ops step, not executed here. */
    },
  );
});
