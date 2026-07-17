import { useFollowups } from '../hooks/useFollowups';
import { Table, TableHead, TableBody, TableRow, TableHeaderCell, TableCell, StatusPill } from './ui';

export interface FollowupHistoryTimelineProps {
  enquiryId: string;
}

/**
 * "Role-Scoped Follow-up History Timeline" (issue #32, AC1/AC2) — renders
 * the chronological Follow-up history for one Enquiry via the existing
 * `GET /api/v1/enquiries/:enquiryId/follow-ups` endpoint (already
 * role-scoped server-side per AC3-AC6, see
 * backend/src/enquiries/enquiries.repository.ts findVisibleById and
 * .phoenix-os/project/specs/32/NOTES.md — DSE sees only Enquiries they own,
 * TL sees their location, SM/GM sees their dealer group). This component
 * has NO role branching of its own: it renders exactly what the API
 * returns for the calling Principal, and a caller outside their access
 * scope never reaches this component at all (LogFollowupPage only ever
 * renders for an `enquiryId` the caller already navigated to from their own
 * visible queue — see NOTES.md's TL/SM-GM browsing-gap note for the one
 * caveat: this Story does not add a team/org-wide Enquiry browse UI for
 * TL/SM-GM to reach an arbitrary Enquiry they don't own).
 *
 * AC1: the backend already returns newest-first order
 * (FollowupsRepository.findByEnquiry `ORDER BY logged_at DESC`) — no
 * client-side re-sort. AC2: each row shows type, remarks, next follow-up
 * date, and "any status change" (`resultingStatus`, issue #32's new
 * column) via a StatusPill when present. Mirrors UpcomingFollowupsList's
 * table-list/loading/empty-state convention exactly.
 */
export function FollowupHistoryTimeline({ enquiryId }: FollowupHistoryTimelineProps) {
  const { data: followups, isLoading } = useFollowups(enquiryId);

  if (isLoading) return <p className="text-sm text-slate-500">Loading follow-up history…</p>;

  if (!followups || followups.length === 0) {
    return <p className="text-sm text-slate-500">No follow-up history yet.</p>;
  }

  return (
    <Table aria-label="Follow-up History">
      <TableHead>
        <TableRow>
          <TableHeaderCell>Logged At</TableHeaderCell>
          <TableHeaderCell>Type</TableHeaderCell>
          <TableHeaderCell>Remarks</TableHeaderCell>
          <TableHeaderCell>Next Follow-up Date</TableHeaderCell>
          <TableHeaderCell>Status Change</TableHeaderCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {followups.map((followup) => (
          <TableRow key={followup.followupId}>
            <TableCell className="font-medium text-slate-900">
              {new Date(followup.loggedAt).toLocaleDateString()}
            </TableCell>
            <TableCell>{followup.type}</TableCell>
            <TableCell>{followup.remarks}</TableCell>
            <TableCell>
              {followup.nextFollowUpAt ? new Date(followup.nextFollowUpAt).toLocaleDateString() : '—'}
            </TableCell>
            <TableCell>{followup.resultingStatus ? <StatusPill status={followup.resultingStatus} /> : '—'}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
