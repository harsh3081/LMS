import { FieldError } from '../leads/leads.errors';

export type { FieldError };

/** Thrown when the target Lead does not exist, or exists but is out of the
 * caller's owner/tenant scope (indistinguishable from non-existent — no
 * cross-tenant leakage, EVAL-CC-02/03/04). Mapped to 404 by
 * enquiry-eligibility.filter.ts. */
export class LeadNotFoundError extends Error {
  constructor(public readonly errors: FieldError[]) {
    super('Lead not found');
    this.name = 'LeadNotFoundError';
  }
}

/** Thrown when the target Lead is already `Converted` (EVAL-CC-05 — one
 * Enquiry per Lead). Mapped to 409 by enquiry-eligibility.filter.ts. */
export class LeadAlreadyConvertedError extends Error {
  constructor(public readonly errors: FieldError[]) {
    super('Lead is already converted');
    this.name = 'LeadAlreadyConvertedError';
  }
}
