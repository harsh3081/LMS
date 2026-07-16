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
