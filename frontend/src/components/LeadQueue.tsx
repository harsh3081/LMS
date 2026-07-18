import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useLeads } from '../hooks/useLeads';
import { useFeatureFlags } from '../hooks/useFeatureFlags';
import { ConvertLeadForm } from './ConvertLeadForm';
import {
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableHeaderCell,
  TableCell,
  StatusPill,
  Button,
  buttonStyles,
} from './ui';

const CONVERTED_STATUS = 'Converted';
const COLUMN_COUNT = 8;
const SKELETON_ROW_COUNT = 5;

/** DSE's own Lead list/queue (AC6) — newest first, reflects new creates
 * immediately via the useCreateLead cache update (no full page reload).
 * Extended (issue #25) with a flag-gated per-row "Convert to Enquiry"
 * action (AC1) that inline-expands ConvertLeadForm in a single panel below
 * the queue table (no new route, resolved Clarification) for whichever row
 * was selected — rendered once outside the table (rather than nested per-row)
 * so there is always at most one submit control on the page regardless of
 * queue size. The panel stays open (showing its success message) after a
 * successful conversion — it is not auto-collapsed — because the source
 * Lead's row disappears on its own once useConvertLead's onSuccess cache
 * update removes it from the queue (AC5); the two behaviors are
 * intentionally decoupled so the success confirmation remains visible.
 *
 * REDESIGNED (issue #116, AC1/AC3): now renders the full professional
 * 8-column table requested — Name, Mobile, Model of Interest, Source,
 * Assigned To, Status, Action, View — using the denormalized
 * modelName/sourceName/ownerName the backend now returns (LeadResponseDto,
 * issue #116) instead of raw ids. "Convert to Enquiry" keeps living under
 * Action, unchanged (AC4); "View" is a NEW per-row link into the new Lead
 * Detail page (`/leads/:leadId`, LeadDetailPage) — mirrors EnquiryQueue's
 * `Link` + `buttonStyles` convention for a per-row navigation action rather
 * than LeadQueue's own inline-expanding-panel pattern (a Lead detail page
 * is its own dedicated route, not an inline panel). Loading is now a
 * skeleton-row table (rather than a plain "Loading…" string, matching this
 * table's real shape so the layout doesn't jump once data arrives) and an
 * empty queue renders an explicit "no leads yet" row instead of a blank
 * table body — no loading/empty-state precedent existed elsewhere in this
 * codebase to reuse, so both are new, deliberately minimal implementations
 * (see NOTES.md "Visual/layout choices"). */
export function LeadQueue() {
  const { data: leads, isLoading } = useLeads();
  const { data: config } = useFeatureFlags();
  const [expandedLeadId, setExpandedLeadId] = useState<string | null>(null);

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
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => setExpandedLeadId((current) => (current === lead.leadId ? null : lead.leadId))}
                    >
                      Convert to Enquiry
                    </Button>
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
      {expandedLeadId && (
        <div className="mt-4">
          <ConvertLeadForm leadId={expandedLeadId} />
        </div>
      )}
    </>
  );
}
