/**
 * Auth helper for issue #24 ("Create a New Lead") Playwright suite.
 *
 * ASSUMPTION (see fixtures/README.md): the bootstrap login endpoint is
 * POST /api/v1/auth/login accepting { email, password } and setting a
 * session cookie (ADR-004, cookie-based session). This is not fixed by
 * the frozen tech-design (which starts from an already-authenticated
 * Principal), so this is the single place to update if the real
 * implementation differs.
 */
import { APIRequestContext, BrowserContext, request as playwrightRequest } from '@playwright/test';
import type { TestUser } from './test-data';

const LOGIN_PATH = process.env.E2E_LOGIN_PATH || '/api/v1/auth/login';

/**
 * Logs in via the API and returns an APIRequestContext carrying the
 * resulting session cookie, for direct backend/API-level tests
 * (tests/create-lead-api.spec.ts, tests/leads-queue-api.spec.ts).
 */
export async function loginApiContext(baseURL: string, user: TestUser): Promise<APIRequestContext> {
  const context = await playwrightRequest.newContext({ baseURL });
  const response = await context.post(LOGIN_PATH, {
    data: { email: user.email, password: user.password },
  });
  if (!response.ok()) {
    throw new Error(
      `Login failed for ${user.email} against ${LOGIN_PATH} (status ${response.status()}). ` +
        `If the real login contract differs from this assumption, update tests/helpers/auth.ts.`,
    );
  }
  return context;
}

/**
 * Logs in via the UI's session mechanism for a full browser context, so
 * tests/new-lead-form.spec.ts and tests/feature-toggle.spec.ts can drive
 * the SPA as an authenticated DSE. Uses the same login endpoint via an
 * API request bound to the browser context's cookie jar.
 */
export async function loginBrowserContext(context: BrowserContext, baseURL: string, user: TestUser): Promise<void> {
  const apiContext = await context.request;
  const response = await apiContext.post(`${baseURL}${LOGIN_PATH}`, {
    data: { email: user.email, password: user.password },
  });
  if (!response.ok()) {
    throw new Error(
      `Login failed for ${user.email} against ${LOGIN_PATH} (status ${response.status()}). ` +
        `If the real login contract differs from this assumption, update tests/helpers/auth.ts.`,
    );
  }
}
