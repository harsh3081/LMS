/**
 * Shared test-data helpers for issue #25 ("Convert a Lead into an Enquiry")
 * Playwright suite.
 *
 * REUSE, not duplication: this Story's DSE principals, login helpers, and
 * lead-creation payload builder are the exact same ones #24 established —
 * per tech-design.md's resolved clarification, the #24 `test-users.json`
 * fixture was additively edited to grant `dseA`/`dseB`/`dseC` the new
 * `convert-lead` capability alongside their existing `create-lead` one
 * (`noCapabilityUser` deliberately still has neither, so it continues to
 * prove RBAC deny-by-default for both Stories). See
 * ../../24/tests/fixtures/README.md and ../fixtures/README.md.
 *
 * This file re-exports #24's login helpers and user/lead-payload builders
 * unchanged, and adds only what's NEW for this Story: a ConvertLeadDto
 * payload builder, budget/variant/boolean boundary cases, and a helper that
 * seeds a fresh open Lead (via POST /api/v1/leads, reusing #24's create
 * payload) so each conversion test has its own Lead to act on — mirroring
 * #24's test-independence convention (no cross-spec shared row state).
 */
import type { APIRequestContext } from '@playwright/test';

export { loginApiContext, loginBrowserContext } from '../../../24/tests/helpers/auth';
export {
  getUser,
  testUsers,
  validCreateLeadPayload,
  activeLeadSources,
  vehicleModels,
  uniqueTag,
  validMobile,
} from '../../../24/tests/helpers/test-data';
export type { TestUser } from '../../../24/tests/helpers/test-data';

import { validCreateLeadPayload as buildCreateLeadPayload } from '../../../24/tests/helpers/test-data';

const LEADS_PATH = '/api/v1/leads';

export type SeededLead = { leadId: string; [key: string]: unknown };

/**
 * Creates a fresh, non-Converted Lead owned by whichever authenticated
 * context performs the POST, and returns the created Lead body (including
 * `leadId`). Used to give every conversion test its own eligible Lead
 * without depending on seed data or another spec's rows.
 */
export async function createOpenLead(
  context: APIRequestContext,
  overrides: Partial<Record<string, unknown>> = {},
): Promise<SeededLead> {
  const response = await context.post(LEADS_PATH, { data: buildCreateLeadPayload(overrides) });
  if (!response.ok()) {
    throw new Error(
      `Failed to seed a Lead for conversion tests via POST ${LEADS_PATH} (status ${response.status()}). ` +
        `Conversion tests depend on issue #24's create-Lead endpoint existing and working.`,
    );
  }
  return response.json();
}

/** Valid ConvertLeadDto payload — the 4 qualifying fields per tech-design.md Data Design. */
export function validConvertLeadPayload(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    budget: 500000,
    variant: 'VXi (O) CVT',
    exchangeInterest: true,
    financeInterest: false,
    ...overrides,
  };
}

/** The 4 qualifying fields, for generic missing-field-loop tests (AC2/AC3). */
export const qualifyingFields = ['budget', 'variant', 'exchangeInterest', 'financeInterest'] as const;

/**
 * Invalid `budget` boundary cases per tech-design's ConvertLeadDto
 * (`@IsInt` `@IsPositive`) — each must be rejected with 400.
 */
export const invalidBudgetCases: { label: string; value: unknown }[] = [
  { label: 'zero', value: 0 },
  { label: 'negative', value: -50000 },
  { label: 'non-integer / decimal', value: 500000.5 },
  { label: 'non-numeric string', value: 'five-lakh' },
];

/** A large-but-valid budget, to prove no artificial upper bound is enforced (tech-design Clarification Q1: bigint, no explicit max). */
export const largeValidBudget = 999999999;

/** Empty/whitespace `variant` cases — must be rejected with 400 (`@IsNotEmpty`). */
export const invalidVariantCases: { label: string; value: unknown }[] = [
  { label: 'empty string', value: '' },
];
