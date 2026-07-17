import { Link } from 'react-router-dom';
import { computeDaySlots, isoDatePart, isoTimePart, BookedSlot } from '../utils/schedulerGrid';
import { Table, TableHead, TableBody, TableRow, TableHeaderCell, TableCell, buttonStyles } from './ui';

export interface TestDriveSchedulerGridProps {
  vehicleId: string;
  date: string;
  bookedSlots: BookedSlot[];
  isLoading?: boolean;
}

/**
 * issue #35 AC1/AC2/AC4 — renders the fixed 30-minute-slot grid for one
 * vehicle+date, computed client-side from the backend's booked-slots list
 * (`computeDaySlots` — "derived, not stored", see NOTES.md). Open vs.
 * booked slots are distinguished by BOTH color AND an explicit text
 * label/action, not color alone (AC2, accessibility). Clicking an OPEN
 * slot's "Book" link navigates to /test-drives/new pre-filled with this
 * vehicle/date/time via query params (AC4) — mirrors EnquiryQueue's
 * `<Link>`-styled-as-button row-action convention exactly (a dedicated
 * route already exists for the booking form, so no onClick/imperative
 * navigation was needed).
 */
export function TestDriveSchedulerGrid({ vehicleId, date, bookedSlots, isLoading }: TestDriveSchedulerGridProps) {
  if (isLoading) return <p className="text-sm text-slate-500">Loading scheduler…</p>;

  const slots = computeDaySlots(date, bookedSlots);

  return (
    <Table aria-label="Test Drive Scheduler">
      <TableHead>
        <TableRow>
          <TableHeaderCell>Time Slot</TableHeaderCell>
          <TableHeaderCell>Status</TableHeaderCell>
          <TableHeaderCell>Action</TableHeaderCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {slots.map((slot) => (
          <TableRow key={slot.slotStart}>
            <TableCell className="font-medium text-slate-900">
              {isoTimePart(slot.slotStart)} – {isoTimePart(slot.slotEnd)}
            </TableCell>
            <TableCell>
              <span
                className={
                  slot.status === 'open'
                    ? 'inline-flex items-center rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20'
                    : 'inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700 ring-1 ring-inset ring-slate-500/20'
                }
              >
                {slot.status === 'open' ? 'Open' : 'Booked'}
              </span>
            </TableCell>
            <TableCell>
              {slot.status === 'open' ? (
                <Link
                  to={`/test-drives/new?vehicleId=${encodeURIComponent(vehicleId)}&date=${isoDatePart(slot.slotStart)}&time=${isoTimePart(slot.slotStart)}`}
                  role="link"
                  className={`${buttonStyles.base} ${buttonStyles.secondary}`}
                >
                  Book
                </Link>
              ) : (
                <span className="text-sm text-slate-400">Unavailable</span>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
