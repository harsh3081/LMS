import { useUpcomingTestDrives } from '../hooks/useTestDrives';
import { Table, TableHead, TableBody, TableRow, TableHeaderCell, TableCell, StatusPill } from './ui';

/** issue #34 AC5: "DSE can view a list of their own upcoming bookings".
 * Renders the calling DSE's own Test Drive bookings (GET
 * /api/v1/test-drives/upcoming, already sorted soonest-first by the
 * backend). Mirrors UpcomingFollowupsList's table-list convention. */
export function UpcomingTestDrivesList() {
  const { data: testDrives, isLoading } = useUpcomingTestDrives();

  if (isLoading) return <p className="text-sm text-slate-500">Loading upcoming test drives…</p>;

  if (!testDrives || testDrives.length === 0) {
    return <p className="text-sm text-slate-500">No upcoming test drives booked.</p>;
  }

  return (
    <Table aria-label="My Upcoming Test Drives">
      <TableHead>
        <TableRow>
          <TableHeaderCell>Slot Start</TableHeaderCell>
          <TableHeaderCell>Slot End</TableHeaderCell>
          <TableHeaderCell>Status</TableHeaderCell>
          <TableHeaderCell>Booking Reference</TableHeaderCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {testDrives.map((testDrive) => (
          <TableRow key={testDrive.testDriveId}>
            <TableCell className="font-medium text-slate-900">{new Date(testDrive.slotStart).toLocaleString()}</TableCell>
            <TableCell>{new Date(testDrive.slotEnd).toLocaleString()}</TableCell>
            <TableCell>
              <StatusPill status={testDrive.status} />
            </TableCell>
            <TableCell className="font-mono text-xs">{testDrive.testDriveId}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
