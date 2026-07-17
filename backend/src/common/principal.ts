/**
 * Role-string constants (issue #32, "Role-Scoped Follow-up History
 * Timeline"). No role-constant file/enum existed anywhere in this codebase
 * before this Story — `'DSE'`/`'SystemAdministrator'`/`'ReadOnlyStaff'` were
 * only ever plain string literals scattered across fixtures/migrations
 * (see .phoenix-os/project/specs/24/tests/fixtures/test-users.json,
 * migrations/1700000000008-SeedAdminUser.ts). `ROLE_TL`/`ROLE_SM_GM` are
 * introduced here because the BRD (LMS_1.md, "11.2 User Personas & Access
 * Rights") defines the hierarchy "DSE -> Team Lead (TL) -> Sales Manager /
 * General Manager (SM/GM)" but this Story is the first to need those two
 * roles as actual, checkable values (EnquiriesRepository.findVisibleById).
 * `'SM-GM'` (not `'SM/GM'`) avoids a literal slash inside a plain string
 * value that later ends up in URLs/query params/CSV exports elsewhere in
 * the app. `ROLE_DSE` mirrors the existing `'DSE'` literal so every caller
 * can migrate to the constant incrementally without a forced rename. */
export const ROLE_DSE = 'DSE';
export const ROLE_TL = 'TL';
export const ROLE_SM_GM = 'SM-GM';
export const ROLE_SYSTEM_ADMINISTRATOR = 'SystemAdministrator';

/**
 * Principal — the authenticated caller's identity/context, derived server-side
 * from the session (ADR-004). This is the SOLE source for owner/tenant fields
 * on create-Lead and for the tenant-scope choke-point on reads (ADR-003).
 * Never constructed from client-supplied request-body fields.
 */
export interface Principal {
  userId: string;
  role: string;
  locationId: string;
  dealerGroupId: string;
  capabilities: string[];
}

/** Deny-by-default capability check used by CapabilityGuard. */
export function hasCapability(principal: Principal, capability: string): boolean {
  return principal.capabilities.includes(capability);
}
