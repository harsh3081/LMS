/**
 * Derived (not stored) open/booked slot grid computation — issue #35
 * ("Real-Time Test Drive Scheduler View") AC1/AC2. There is no separate
 * "available inventory calendar" table anywhere in this codebase (verified
 * — see .phoenix-os/project/specs/34/NOTES.md, "Operating-hours
 * simplification"): the backend endpoint (GET /api/v1/test-drives) only
 * returns existing BOOKED slots for a vehicle+range; this module computes
 * the fixed-grid of every POSSIBLE 30-minute slot within dealership
 * operating hours for one calendar date and marks any slot overlapping a
 * returned booking as 'booked', everything else as 'open'. See NOTES.md.
 *
 * Mirrors backend/src/test-drives/test-drives.service.ts's
 * OPERATING_HOURS_START_HOUR/OPERATING_HOURS_END_HOUR constants exactly
 * (09:00-19:00, evaluated in UTC) and NewTestDriveForm.tsx's fixed
 * 30-minute slot-duration convention — this is a deliberate, documented
 * duplication (no shared-config endpoint exists yet), not drift.
 */
export const OPERATING_HOURS_START_HOUR = 9;
export const OPERATING_HOURS_END_HOUR = 19;
export const SLOT_DURATION_MINUTES = 30;

export type SchedulerSlotStatus = 'open' | 'booked';

export interface SchedulerSlotView {
  slotStart: string;
  slotEnd: string;
  status: SchedulerSlotStatus;
}

export interface BookedSlot {
  slotStart: string;
  slotEnd: string;
}

/** Computes every possible 30-minute slot within operating hours for one
 * calendar date (`date` is a `YYYY-MM-DD` string, treated as UTC — mirrors
 * NewTestDriveForm.tsx's "entered date+time is treated as UTC directly"
 * decision), marking each 'booked' if its [slotStart,slotEnd) window
 * overlaps ANY of the given `booked` slots, 'open' otherwise. */
export function computeDaySlots(date: string, booked: BookedSlot[]): SchedulerSlotView[] {
  const bookedRanges = booked.map((b) => ({ start: new Date(b.slotStart).getTime(), end: new Date(b.slotEnd).getTime() }));
  const totalSlots = ((OPERATING_HOURS_END_HOUR - OPERATING_HOURS_START_HOUR) * 60) / SLOT_DURATION_MINUTES;
  const dayStart = new Date(`${date}T00:00:00.000Z`).getTime();
  const startOffsetMs = OPERATING_HOURS_START_HOUR * 60 * 60000;
  const slotMs = SLOT_DURATION_MINUTES * 60000;

  const slots: SchedulerSlotView[] = [];
  for (let i = 0; i < totalSlots; i++) {
    const startMs = dayStart + startOffsetMs + i * slotMs;
    const endMs = startMs + slotMs;
    const isBooked = bookedRanges.some((b) => b.start < endMs && b.end > startMs);
    slots.push({
      slotStart: new Date(startMs).toISOString(),
      slotEnd: new Date(endMs).toISOString(),
      status: isBooked ? 'booked' : 'open',
    });
  }
  return slots;
}

/** `YYYY-MM-DD` for `slotStart`/`slotEnd`'s date-only navigation query
 * param (AC4 pre-fill — see NewTestDriveForm/BookTestDrivePage). */
export function isoDatePart(isoDateTime: string): string {
  return isoDateTime.slice(0, 10);
}

/** `HH:MM` for `slotStart`'s time-only navigation query param (AC4
 * pre-fill). */
export function isoTimePart(isoDateTime: string): string {
  return isoDateTime.slice(11, 16);
}
