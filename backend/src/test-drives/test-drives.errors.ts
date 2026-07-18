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

/** One candidate open slot suggested alongside a 409 conflict (issue #36
 * AC2: "Error message... suggests the nearest open slots"). Mirrors
 * SchedulerSlotDto's minimal shape exactly. */
export interface SuggestedSlot {
  slotStart: string;
  slotEnd: string;
}

/** issue #36 ("Prevent Double-Booking of Demo Vehicles") AC1/AC3/AC4.
 * Thrown when the requested [slotStart, slotEnd) range overlaps an existing
 * BOOKED Test Drive for the same vehicle (tenant-scoped) — either detected
 * by TestDrivesService.book's app-level pre-check (the PRIMARY mechanism,
 * covers general range overlap, not just exact matches — AC4), or by
 * catching a Postgres unique_violation (SQLSTATE 23505) raised by the
 * partial UNIQUE index added in migration 1700000000015 (the DB-level
 * defense-in-depth BACKSTOP for a raced exact-duplicate-slot insert — AC3).
 * Carries `suggestedSlots` (AC2) — the next few open 30-minute slots for the
 * same vehicle after the requested time, best-effort (may be empty; never
 * blocks the 409 itself). Mapped to 409 by
 * TestDriveSlotConflictExceptionFilter, with a response body shape of
 * `{ errors, suggestedSlots }` — deliberately NOT the plain `FieldError[]`
 * array every other error in this file uses, since this is the first error
 * in this codebase that needs to carry structured data beyond a field/message
 * pair. See NOTES.md "Concurrency mechanism" for the full design rationale. */
export class TestDriveSlotConflictError extends Error {
  constructor(
    public readonly errors: FieldError[],
    public readonly suggestedSlots: SuggestedSlot[],
  ) {
    super('The selected slot conflicts with an existing booking');
    this.name = 'TestDriveSlotConflictError';
  }
}
