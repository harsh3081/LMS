import { SetMetadata } from '@nestjs/common';

export const CAPABILITY_METADATA_KEY = 'requiredCapability';

/**
 * Deny-by-default RBAC (ADR-003): a route with no @RequireCapability still
 * requires a valid session (SessionAuthGuard always checks authentication);
 * routes that also carry this decorator additionally require the named
 * capability on the caller's Principal, else 403 (EVAL-CC-08).
 */
export const RequireCapability = (capability: string) => SetMetadata(CAPABILITY_METADATA_KEY, capability);
