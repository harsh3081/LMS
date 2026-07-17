import { FieldError } from '../leads/leads.errors';

export type { FieldError };

/** Thrown when the target Enquiry does not exist, or exists but is out of
 * the caller's owner/tenant scope (indistinguishable from non-existent — no
 * cross-tenant/cross-owner leakage, mirrors LeadNotFoundError exactly).
 * Mapped to 404 by followups.filters.ts. */
export class FollowupEnquiryNotFoundError extends Error {
  constructor(public readonly errors: FieldError[]) {
    super('Enquiry not found');
    this.name = 'FollowupEnquiryNotFoundError';
  }
}
