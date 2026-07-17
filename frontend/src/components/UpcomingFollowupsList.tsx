import { Link } from 'react-router-dom';
import { useUpcomingFollowups } from '../hooks/useFollowups';
import { Table, TableHead, TableBody, TableRow, TableHeaderCell, TableCell, StatusPill, buttonStyles } from './ui';

const OVERDUE_STATUS = 'Overdue';
const UPCOMING_STATUS = 'Upcoming';

/** issue #31 AC4: "Reminder/task is visible to the DSE ahead of the due
 * date". Renders the calling DSE's own Follow-ups that carry a
 * `nextFollowUpAt` (GET /api/v1/follow-ups/upcoming, already sorted
 * most-overdue-first by the backend) — this IS the reminder surface (no
 * separate Reminder entity/notification, see
 * .phoenix-os/project/specs/31/NOTES.md). Mirrors LeadQueue/EnquiryQueue's
 * table-list convention. */
export function UpcomingFollowupsList() {
  const { data: followups, isLoading } = useUpcomingFollowups();

  if (isLoading) return <p className="text-sm text-slate-500">Loading upcoming follow-ups…</p>;

  if (!followups || followups.length === 0) {
    return <p className="text-sm text-slate-500">No upcoming follow-ups scheduled.</p>;
  }

  const now = Date.now();

  return (
    <Table aria-label="My Upcoming Follow-ups">
      <TableHead>
        <TableRow>
          <TableHeaderCell>Next Follow-up Date</TableHeaderCell>
          <TableHeaderCell>Type</TableHeaderCell>
          <TableHeaderCell>Remarks</TableHeaderCell>
          <TableHeaderCell>Status</TableHeaderCell>
          <TableHeaderCell>Actions</TableHeaderCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {followups.map((followup) => {
          const dueTime = followup.nextFollowUpAt ? new Date(followup.nextFollowUpAt).getTime() : null;
          const isOverdue = dueTime !== null && dueTime < now;
          return (
            <TableRow key={followup.followupId}>
              <TableCell className="font-medium text-slate-900">
                {followup.nextFollowUpAt ? new Date(followup.nextFollowUpAt).toLocaleDateString() : '—'}
              </TableCell>
              <TableCell>{followup.type}</TableCell>
              <TableCell>{followup.remarks}</TableCell>
              <TableCell>
                <StatusPill status={isOverdue ? OVERDUE_STATUS : UPCOMING_STATUS} />
              </TableCell>
              <TableCell>
                <Link
                  to={`/enquiries/${followup.enquiryId}/follow-up`}
                  role="link"
                  className={`${buttonStyles.base} ${buttonStyles.secondary}`}
                >
                  Log Follow-up
                </Link>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
