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
  SlideOver,
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
 * REDESIGNED (issue #124, AC1) then REVERSED (issue #132): issue #124
 * replaced the original inline-expanding 4-field `ConvertLeadForm` panel
 * with a `Link` navigating to a dedicated `/leads/:leadId/convert` route
 * (`ConvertLeadPage`), reasoning the rewritten 8-section form was too large
 * for a slide-over. Issue #132 reverses that decision at the user's explicit
 * request, for consistency with how "New Lead" (issue #118) and "New
 * Enquiry" (issue #130) both already work: "Convert to Enquiry" is once
 * again a `<button>`, but now opens the NEW 8-section `ConvertLeadForm`
 * (unchanged from #124's rewrite) in a right-docked `SlideOver` panel,
 * rather than the OLD 4-field inline-expand #124 removed. Per-row state
 * (`openLeadId`) tracks which lead's panel is open — at most one at a time,
 * since only a single `SlideOver` instance is rendered (outside the table's
 * `.map()`), reused for whichever row's button was last clicked. `leadId`
 * (not e.g. a boolean per row) is the natural key here: it both identifies
 * which panel is open AND is the prop ConvertLeadForm needs to fetch that
 * lead's data. See NOTES.md ("LeadQueue per-row panel-state mechanism") for
 * the fuller rationale. The row-leaves-the-queue-on-success behavior (AC5)
 * is unaffected — it still comes from useConvertLead's onSuccess cache
 * update, which now fires while this queue is the only thing on screen
 * (the panel closes itself shortly after, via ConvertLeadForm's
 * SUCCESS_AUTO_CLOSE_MS delayed-close mechanism).
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
  // issue #132: which lead's Convert to Enquiry panel is open, if any — see
  // the class doc comment above for why a single leadId (rather than a
  // per-row boolean) is the right piece of state here.
  const [openLeadId, setOpenLeadId] = useState<string | null>(null);

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
                    <button
                      type="button"
                      onClick={() => setOpenLeadId(lead.leadId)}
                      className={`${buttonStyles.base} ${buttonStyles.secondary}`}
                    >
                      Convert to Enquiry
                    </button>
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

      <SlideOver
        open={openLeadId !== null}
        onClose={() => setOpenLeadId(null)}
        title="Convert to Enquiry"
        maxWidthClassName="max-w-4xl"
      >
        {openLeadId !== null && (
          // `key={openLeadId}` forces a fresh ConvertLeadForm instance (and
          // therefore fresh internal form state) whenever the open lead
          // changes, rather than reusing the same instance with a swapped
          // `leadId` prop — avoids a previously-typed value on one lead's
          // panel silently carrying over onto a different lead's panel.
          <ConvertLeadForm key={openLeadId} leadId={openLeadId} onConverted={() => setOpenLeadId(null)} />
        )}
      </SlideOver>
    </>
  );
}
