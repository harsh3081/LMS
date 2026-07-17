import { Link } from 'react-router-dom';
import { useEnquiries } from '../hooks/useEnquiries';
import { Table, TableHead, TableBody, TableRow, TableHeaderCell, TableCell, StatusPill, buttonStyles } from './ui';

const ENTRY_TYPE_LABEL: Record<string, string> = {
  DIRECT: 'Direct Entry',
  CONVERTED: 'Converted from Lead',
};

/** DSE's own Enquiry list (issue #26 AC5: "Enquiry is distinguishable in
 * reporting/lists as 'Direct Entry' vs. 'Converted from Lead'"). Reflects a
 * newly created Direct Enquiry immediately via useCreateDirectEnquiry's
 * cache update (no full page reload), mirroring LeadQueue's convention.
 * MODIFIED (issue #30): an "Actions" column with a "Log Follow-up" link per
 * row — the entry point into LogFollowupPage (AC1-AC5). Mirrors
 * LandingPage's `Link` + `buttonStyles` convention rather than LeadQueue's
 * inline-expanding-panel pattern, since a Follow-up form has its own
 * dedicated route (no enquiry-detail page exists yet for an inline panel to
 * live under).*/
export function EnquiryQueue() {
  const { data: enquiries, isLoading } = useEnquiries();

  if (isLoading) return <p className="text-sm text-slate-500">Loading enquiries…</p>;

  return (
    <Table aria-label="My Enquiries">
      <TableHead>
        <TableRow>
          <TableHeaderCell>Customer</TableHeaderCell>
          <TableHeaderCell>Variant</TableHeaderCell>
          <TableHeaderCell>Entry Type</TableHeaderCell>
          <TableHeaderCell>Status</TableHeaderCell>
          <TableHeaderCell>Actions</TableHeaderCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {(enquiries ?? []).map((enquiry) => (
          <TableRow key={enquiry.enquiryId}>
            <TableCell className="font-medium text-slate-900">{enquiry.customerName ?? '—'}</TableCell>
            <TableCell>{enquiry.variant}</TableCell>
            <TableCell>{ENTRY_TYPE_LABEL[enquiry.entryType] ?? enquiry.entryType}</TableCell>
            <TableCell>
              <StatusPill status={enquiry.status} />
            </TableCell>
            <TableCell>
              <Link
                to={`/enquiries/${enquiry.enquiryId}/follow-up`}
                role="link"
                className={`${buttonStyles.base} ${buttonStyles.secondary}`}
              >
                Log Follow-up
              </Link>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
