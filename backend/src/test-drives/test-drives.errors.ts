import { FieldError } from '../leads/leads.errors';

export type { FieldError };

/** Thrown when the target Enquiry does not exist, or exists but is out of
 * the caller's owner/tenant scope (indistinguishable from non-existent — no
 * cross-tenant/cross-owner leakage, mirrors FollowupEnquiryNotFoundError
 * exactly). Mapped to 404 by test-drives.filters.ts. */
export class TestDriveEnquiryNotFoundError extends Error {
  constructor(public readonly errors: FieldError[]) {
    super('Enquiry not found');
    this.name = 'TestDriveEnquiryNotFoundError';
  }
}

/** AC2: "System validates the selected slot is within dealership operating
 * hours." Thrown when slotStart/slotEnd fall outside the hardcoded operating
 * window, or when slotEnd is not after slotStart. Mapped to 400 by
 * test-drives.filters.ts. See TestDrivesService's operating-hours constants
 * for the simplification this represents (no configurable-hours feature
 * exists in this codebase). */
export class OperatingHoursViolationError extends Error {
  constructor(public readonly errors: FieldError[]) {
    super('Slot is outside dealership operating hours');
    this.name = 'OperatingHoursViolationError';
  }
}
