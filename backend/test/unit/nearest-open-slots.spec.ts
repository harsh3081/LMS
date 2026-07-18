/**
 * RED->GREEN (Inside-Out, Core Domain Layer) — issue #36 AC2.
 * Pure-function unit tests for computeNearestOpenSlots, no DB/HTTP wiring —
 * mirrors frontend/tests/unit/schedulerGrid.spec.ts's structure (the
 * frontend counterpart this function is a documented server-side port of).
 */
import { computeNearestOpenSlots } from '../../src/test-drives/nearest-open-slots';

describe('computeNearestOpenSlots (issue #36 AC2)', () => {
  it('returns the next 3 open 30-minute slots after the requested time when none are booked', () => {
    const requested = new Date('2026-08-01T10:00:00.000Z');
    const suggestions = computeNearestOpenSlots(requested, []);
    expect(suggestions).toEqual([
      { slotStart: '2026-08-01T10:30:00.000Z', slotEnd: '2026-08-01T11:00:00.000Z' },
      { slotStart: '2026-08-01T11:00:00.000Z', slotEnd: '2026-08-01T11:30:00.000Z' },
      { slotStart: '2026-08-01T11:30:00.000Z', slotEnd: '2026-08-01T12:00:00.000Z' },
    ]);
  });

  it('skips slots that overlap a booked slot', () => {
    const requested = new Date('2026-08-01T10:00:00.000Z');
    const suggestions = computeNearestOpenSlots(
      requested,
      [
        { slotStart: new Date('2026-08-01T10:30:00.000Z'), slotEnd: new Date('2026-08-01T11:00:00.000Z') },
        { slotStart: new Date('2026-08-01T11:00:00.000Z'), slotEnd: new Date('2026-08-01T11:30:00.000Z') },
      ],
      2,
    );
    expect(suggestions).toEqual([
      { slotStart: '2026-08-01T11:30:00.000Z', slotEnd: '2026-08-01T12:00:00.000Z' },
      { slotStart: '2026-08-01T12:00:00.000Z', slotEnd: '2026-08-01T12:30:00.000Z' },
    ]);
  });

  it('respects the requested `count`', () => {
    const requested = new Date('2026-08-01T10:00:00.000Z');
    const suggestions = computeNearestOpenSlots(requested, [], 1);
    expect(suggestions).toHaveLength(1);
  });

  it('does not suggest a slot at or before the requested time', () => {
    const requested = new Date('2026-08-01T18:30:00.000Z'); // last slot of the day (ends at 19:00)
    const suggestions = computeNearestOpenSlots(requested, []);
    expect(suggestions).toEqual([]);
  });

  it('returns fewer than `count` (never errors) when the day runs out of open slots before operating hours end', () => {
    const requested = new Date('2026-08-01T18:00:00.000Z');
    const suggestions = computeNearestOpenSlots(requested, [], 3);
    // Only one more 30-min slot fits before the 19:00 UTC operating-hours end.
    expect(suggestions).toEqual([{ slotStart: '2026-08-01T18:30:00.000Z', slotEnd: '2026-08-01T19:00:00.000Z' }]);
  });

  it('does not suggest slots on a different calendar date (same-day only, documented scope limit)', () => {
    const requested = new Date('2026-08-01T18:45:00.000Z'); // past the last slot boundary for the day
    const suggestions = computeNearestOpenSlots(requested, []);
    expect(suggestions).toEqual([]);
  });

  it('an adjacent (non-overlapping) booked slot does not exclude the next slot', () => {
    const requested = new Date('2026-08-01T10:00:00.000Z');
    // Booked exactly 10:30-11:00 should not affect a slot starting exactly at 11:00.
    const suggestions = computeNearestOpenSlots(
      requested,
      [{ slotStart: new Date('2026-08-01T10:30:00.000Z'), slotEnd: new Date('2026-08-01T11:00:00.000Z') }],
      1,
    );
    expect(suggestions).toEqual([{ slotStart: '2026-08-01T11:00:00.000Z', slotEnd: '2026-08-01T11:30:00.000Z' }]);
  });
});
