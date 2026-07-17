/**
 * RED->GREEN (Inside-Out, Core Domain Layer) — issue #35. Pure-function
 * tests for the "derived, not stored" open/booked grid computation, no
 * React/DOM/network involved.
 */
import { describe, it, expect } from 'vitest';
import {
  computeDaySlots,
  isoDatePart,
  isoTimePart,
  OPERATING_HOURS_START_HOUR,
  OPERATING_HOURS_END_HOUR,
  SLOT_DURATION_MINUTES,
} from '../../src/utils/schedulerGrid';

describe('computeDaySlots (issue #35 AC1/AC2)', () => {
  it('produces one slot per 30-minute increment across the full operating-hours window', () => {
    const slots = computeDaySlots('2026-08-01', []);
    const expectedCount = ((OPERATING_HOURS_END_HOUR - OPERATING_HOURS_START_HOUR) * 60) / SLOT_DURATION_MINUTES;
    expect(slots).toHaveLength(expectedCount);
    expect(slots[0].slotStart).toBe(`2026-08-01T${String(OPERATING_HOURS_START_HOUR).padStart(2, '0')}:00:00.000Z`);
    expect(slots[slots.length - 1].slotEnd).toBe(`2026-08-01T${String(OPERATING_HOURS_END_HOUR).padStart(2, '0')}:00:00.000Z`);
  });

  it('marks every slot open when there are no bookings', () => {
    const slots = computeDaySlots('2026-08-01', []);
    expect(slots.every((s) => s.status === 'open')).toBe(true);
  });

  it('marks a slot exactly matching a booking as booked', () => {
    const slots = computeDaySlots('2026-08-01', [
      { slotStart: '2026-08-01T10:00:00.000Z', slotEnd: '2026-08-01T10:30:00.000Z' },
    ]);
    const target = slots.find((s) => s.slotStart === '2026-08-01T10:00:00.000Z');
    expect(target?.status).toBe('booked');
    expect(slots.filter((s) => s.status === 'booked')).toHaveLength(1);
  });

  it('marks a slot that partially overlaps a (non-grid-aligned) booking as booked', () => {
    const slots = computeDaySlots('2026-08-01', [
      { slotStart: '2026-08-01T10:15:00.000Z', slotEnd: '2026-08-01T10:45:00.000Z' },
    ]);
    const overlapping = slots.filter((s) => s.status === 'booked').map((s) => s.slotStart);
    // Overlaps both the 10:00-10:30 and 10:30-11:00 grid slots.
    expect(overlapping).toEqual(['2026-08-01T10:00:00.000Z', '2026-08-01T10:30:00.000Z']);
  });

  it('does not mark adjacent (non-overlapping, back-to-back) slots as booked', () => {
    const slots = computeDaySlots('2026-08-01', [
      { slotStart: '2026-08-01T10:00:00.000Z', slotEnd: '2026-08-01T10:30:00.000Z' },
    ]);
    const before = slots.find((s) => s.slotEnd === '2026-08-01T10:00:00.000Z');
    const after = slots.find((s) => s.slotStart === '2026-08-01T10:30:00.000Z');
    expect(before?.status).toBe('open');
    expect(after?.status).toBe('open');
  });
});

describe('isoDatePart / isoTimePart (issue #35 AC4 pre-fill)', () => {
  it('extracts the YYYY-MM-DD date part', () => {
    expect(isoDatePart('2026-08-01T10:00:00.000Z')).toBe('2026-08-01');
  });

  it('extracts the HH:MM time part', () => {
    expect(isoTimePart('2026-08-01T10:00:00.000Z')).toBe('10:00');
  });
});
