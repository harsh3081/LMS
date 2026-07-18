import { Link } from 'react-router-dom';
import { useLeads } from '../hooks/useLeads';
import { useFeatureFlags } from '../hooks/useFeatureFlags';
import {
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableHeaderCell,
  TableCell,
  StatusPill,
  buttonStyles,
} from './ui';

const CONVERTED_STATUS = 'Converted';
const COLUMN_COUNT = 8;
const SKELETON_ROW_COUNT = 5;

/** DSE's own Lead list/queue (AC6) — newest first, reflects new creates
 * immediately via the useCreateLead cache update (no full page reload).
 * Extended (issue #25) with a flag-gated per-row "Convert to Enquiry" action
 * (AC1).
 *
 * REDESIGNED (issue #124, AC1): "Convert to Enquiry" no longer inline-
 * expands the old 4-field `ConvertLeadForm` panel below the table — it is
 * now a `Link` navigating to the dedicated `/leads/:leadId/convert` route
 * (`ConvertLeadPage`), which hosts the rewritten 8-section sectioned form.
 * See ConvertLeadPage.tsx for the SlideOver-vs-dedicated-route rationale.
 * The row-leaves-the-queue-on-success behavior (AC5) is unaffected — it
 * still comes from useConvertLead's onSuccess cache update, which fires
 * once the DSE completes the conversion on that page and is routed back to
 * this queue.
 *
 * REDESIGNED (issue #116, AC1/AC3): renders the full professional 8-column
 * table — Name, Mobile, Model of Interest, Source, Assigned To, Status,
 * Action, View — using the denormalized modelName/sourceName/ownerName the
 * backend now returns (LeadResponseDto, issue #116) instead of raw ids.
 * "View" is a per-row link into the Lead Detail page (`/leads/:leadId`,
 * LeadDetailPage) — mirrors EnquiryQueue's `Link` + `buttonStyles`
 * convention for a per-row navigation action. Loading is a skeleton-row
 * table (rather than a plain "Loading…" string, matching this table's real
 * shape so the layout doesn't jump once data arrives) and an empty queue
 * renders an explicit "no leads yet" row instead of a blank table body — no
 * loading/empty-state precedent existed elsewhere in this codebase to
 * reuse, so both are new, deliberately minimal implementations (see
 * NOTES.md "Visual/layout choices"). */
export function LeadQueue() {
  const { data: leads, isLoading } = useLeads();
  const { data: config } = useFeatureFlags();

  const convertLeadEnabled = config?.convertLeadEnabled !== false;
  const rows = leads ?? [];

  return (
    <>
      <Table aria-label="My Leads">
        <TableHead>
          <TableRow>
            <TableHeaderCell>Name</TableHeaderCell>
            <TableHeaderCell>Mobile</TableHeaderCell>
            <TableHeaderCell>Model of Interest</TableHeaderCell>
            <TableHeaderCell>Source</TableHeaderCell>
            <TableHeaderCell>Assigned To</TableHeaderCell>
            <TableHeaderCell>Status</TableHeaderCell>
            <TableHeaderCell>Action</TableHeaderCell>
            <TableHeaderCell>View</TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {isLoading ? (
            Array.from({ length: SKELETON_ROW_COUNT }).map((_, rowIndex) => (
              <TableRow key={`skeleton-${rowIndex}`} aria-hidden="true" className="hover:bg-transparent">
                {Array.from({ length: COLUMN_COUNT }).map((__, colIndex) => (
                  <TableCell key={colIndex}>
                    <div className="h-4 w-full max-w-[8rem] animate-pulse rounded bg-slate-200" />
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : rows.length === 0 ? (
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={COLUMN_COUNT} className="py-10 text-center text-sm text-slate-500">
                No leads yet — create one to get started.
              </TableCell>
            </TableRow>
          ) : (
            rows.map((lead) => (
              <TableRow key={lead.leadId}>
                <TableCell
                  className="max-w-[14rem] truncate font-medium text-slate-900"
                  title={lead.customerName ?? undefined}
                >
                  {lead.customerName ?? '—'}
                </TableCell>
                <TableCell>{lead.mobile ?? '—'}</TableCell>
                <TableCell>{lead.modelName ?? '—'}</TableCell>
                <TableCell>{lead.sourceName ?? '—'}</TableCell>
                <TableCell>{lead.ownerName ?? '—'}</TableCell>
                <TableCell>
                  <StatusPill status={lead.status} />
                </TableCell>
                <TableCell>
                  {lead.status !== CONVERTED_STATUS && convertLeadEnabled && (
                    <Link
                      to={`/leads/${lead.leadId}/convert`}
                      role="link"
                      className={`${buttonStyles.base} ${buttonStyles.secondary}`}
                    >
                      Convert to Enquiry
                    </Link>
                  )}
                </TableCell>
                <TableCell>
                  <Link
                    to={`/leads/${lead.leadId}`}
                    role="link"
                    className={`${buttonStyles.base} ${buttonStyles.secondary}`}
                  >
                    View
                  </Link>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </>
  );
}
