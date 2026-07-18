import { OPERATING_HOURS_START_HOUR, OPERATING_HOURS_END_HOUR } from './test-drives.service';

/** Mirrors frontend/src/utils/schedulerGrid.ts's SLOT_DURATION_MINUTES
 * exactly (deliberate, documented duplication — no shared-config endpoint
 * exists yet, same rationale as that file's own comment and
 * NewTestDriveForm.tsx's FIXED_DURATION_MINUTES). */
export const SLOT_DURATION_MINUTES = 30;

export interface BookedSlot {
  slotStart: Date;
  slotEnd: Date;
}

export interface SuggestedSlot {
  slotStart: string;
  slotEnd: string;
}

/**
 * issue #36 AC2: "Error message explains why the slot is unavailable and
 * suggests the nearest open slots." Computes the next `count` open
 * 30-minute slots, for the SAME calendar date (UTC) as the requested slot,
 * strictly after the requested `slotStart`, that do not overlap any of the
 * given `bookedSlots`.
 *
 * A server-side PORT of frontend/src/utils/schedulerGrid.ts#computeDaySlots'
 * fixed-grid-generation + overlap-marking logic (same 09:00-19:00 UTC
 * operating-hours window, same 30-minute step, same `start < bEnd && end >
 * bStart` overlap test) — cross-reference, not a shared import: this is a
 * separate NestJS backend package with no dependency on the Vite frontend
 * package (and vice versa), so a small duplicated pure function is the
 * pragmatic choice for this fast-tracked Story rather than standing up a
 * new shared package for one ~15-line function. See NOTES.md "Nearest-open-
 * slot suggestion approach".
 *
 * Deliberately SAME-DAY only (does not search into the next day if the
 * requested date's remaining slots are all booked/past operating hours) —
 * a documented, pragmatic scope limit for this Story; may return fewer than
 * `count` slots, or an empty array, in that case. The 409 response is still
 * correct and useful without suggestions (AC2 says "suggests", not
 * "guarantees a non-empty list").
 */
export function computeNearestOpenSlots(
  requestedSlotStart: Date,
  bookedSlots: BookedSlot[],
  count = 3,
): SuggestedSlot[] {
  const dateOnly = requestedSlotStart.toISOString().slice(0, 10);
  const dayStartMs = new Date(`${dateOnly}T00:00:00.000Z`).getTime();
  const startOffsetMs = OPERATING_HOURS_START_HOUR * 60 * 60000;
  const endOffsetMs = OPERATING_HOURS_END_HOUR * 60 * 60000;
  const slotMs = SLOT_DURATION_MINUTES * 60000;
  const requestedMs = requestedSlotStart.getTime();

  const bookedRanges = bookedSlots.map((b) => ({ start: b.slotStart.getTime(), end: b.slotEnd.getTime() }));

  const suggestions: SuggestedSlot[] = [];
  for (let startMs = dayStartMs + startOffsetMs; startMs + slotMs <= dayStartMs + endOffsetMs; startMs += slotMs) {
    if (startMs <= requestedMs) continue; // strictly after the requested time
    const endMs = startMs + slotMs;
    const isBooked = bookedRanges.some((b) => b.start < endMs && b.end > startMs);
    if (isBooked) continue;

    suggestions.push({ slotStart: new Date(startMs).toISOString(), slotEnd: new Date(endMs).toISOString() });
    if (suggestions.length >= count) break;
  }
  return suggestions;
}
