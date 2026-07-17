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

/** NEW (issue #31, AC2): thrown when a Follow-up is submitted with neither
 * a `nextFollowUpAt` nor a terminal `enquiryStatus` (Lost/Booked) — "System
 * does not allow closing a follow-up without a Next Follow-up Date, unless
 * Enquiry status is set to a terminal state." Mapped to 400 by
 * followups.filters.ts. */
export class NextFollowUpRequiredError extends Error {
  constructor(public readonly errors: FieldError[]) {
    super('Next follow-up date is required unless enquiryStatus is Lost or Booked');
    this.name = 'NextFollowUpRequiredError';
  }
}
