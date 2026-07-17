/**
 * RED->GREEN (Inside-Out, Presentation Layer) — issue #35 AC1/AC2/AC4.
 * Component tests for TestDriveSchedulerGrid — pure props in, no
 * hooks/network mocking needed (computeDaySlots does the derivation).
 */
import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { TestDriveSchedulerGrid } from '../../src/components/TestDriveSchedulerGrid';

function renderGrid(bookedSlots: { slotStart: string; slotEnd: string }[] = [], isLoading = false) {
  return render(
    <MemoryRouter>
      <TestDriveSchedulerGrid vehicleId="v1" date="2026-08-01" bookedSlots={bookedSlots} isLoading={isLoading} />
    </MemoryRouter>,
  );
}

describe('TestDriveSchedulerGrid (issue #35)', () => {
  it('AC1: renders a row for every 30-minute slot within operating hours (09:00-19:00 -> 20 slots)', () => {
    renderGrid();
    const rows = screen.getAllByRole('row');
    // header row + 20 slot rows
    expect(rows).toHaveLength(21);
    expect(screen.getByText('09:00 – 09:30')).toBeInTheDocument();
    expect(screen.getByText('18:30 – 19:00')).toBeInTheDocument();
  });

  it('AC2: an open slot is labeled "Open" and offers a "Book" action (not distinguished by color alone)', () => {
    renderGrid();
    const row = screen.getByText('09:00 – 09:30').closest('tr')!;
    expect(within(row).getByText('Open')).toBeInTheDocument();
    expect(within(row).getByRole('link', { name: /book/i })).toBeInTheDocument();
  });

  it('AC2: a booked slot is labeled "Booked" and offers no Book action', () => {
    renderGrid([{ slotStart: '2026-08-01T09:00:00.000Z', slotEnd: '2026-08-01T09:30:00.000Z' }]);
    const row = screen.getByText('09:00 – 09:30').closest('tr')!;
    expect(within(row).getByText('Booked')).toBeInTheDocument();
    expect(within(row).queryByRole('link', { name: /book/i })).not.toBeInTheDocument();
  });

  it('AC4: the "Book" link for a given slot pre-fills vehicleId/date/time as query params to /test-drives/new', () => {
    renderGrid();
    const row = screen.getByText('10:00 – 10:30').closest('tr')!;
    const link = within(row).getByRole('link', { name: /book/i });
    expect(link).toHaveAttribute('href', '/test-drives/new?vehicleId=v1&date=2026-08-01&time=10:00');
  });

  it('shows a loading state and no table when isLoading is true', () => {
    renderGrid([], true);
    expect(screen.getByText(/loading scheduler/i)).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });
});
