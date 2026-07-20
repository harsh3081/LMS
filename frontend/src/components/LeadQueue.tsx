import { useMemo, useState } from 'react';
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
  TextInput,
  Select,
  buttonStyles,
} from './ui';

const CONVERTED_STATUS = 'Converted';
const COLUMN_COUNT = 8;
const SKELETON_ROW_COUNT = 5;

/** The only 2 statuses a Lead actually has (see LEAD_STATUS_NEW /
 * LEAD_STATUS_CONVERTED on the backend entity) — issue #140's status filter
 * offers exactly these, plus "All", rather than the reference design's
 * generic Qualified/Lost options this app's data model doesn't have. */
const STATUS_FILTER_OPTIONS = ['All', 'New', 'Converted'] as const;
type StatusFilter = (typeof STATUS_FILTER_OPTIONS)[number];

/** Two-letter initials for the row avatar (issue #138) — e.g. "Asha Rao" ->
 * "AR". Falls back to "?" for a missing/blank name rather than rendering an
 * empty circle. */
function getInitials(name: string | null | undefined): string {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  const first = parts[0][0];
  const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
  return `${first}${last}`.toUpperCase();
}

/** Case-insensitive substring match across the columns a DSE would actually
 * search by (issue #138) — real, working filtering over the already-fetched
 * `leads` array, not a decorative search box. */
function matchesSearch(lead: { customerName: string | null; mobile: string | null; modelName?: string | null; sourceName?: string | null; ownerName?: string | null }, term: string): boolean {
  const haystack = [lead.customerName, lead.mobile, lead.modelName, lead.sourceName, lead.ownerName];
  return haystack.some((field) => field?.toLowerCase().includes(term));
}

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
  // issue #138: real client-side search over the already-fetched queue.
  const [searchTerm, setSearchTerm] = useState('');
  // issue #140: real client-side status filter, combined with search.
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('All');

  const convertLeadEnabled = config?.convertLeadEnabled !== false;
  const rows = leads ?? [];
  const filteredRows = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return (leads ?? []).filter(
      (lead) =>
        (statusFilter === 'All' || lead.status === statusFilter) && (!term || matchesSearch(lead, term)),
    );
  }, [leads, searchTerm, statusFilter]);

  return (
    <>
      <div className="mb-3 flex justify-end gap-3">
        <TextInput
          type="search"
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          placeholder="Search leads…"
          aria-label="Search leads"
          className="max-w-xs"
        />
        <Select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
          aria-label="Filter by status"
          className="w-auto"
        >
          {STATUS_FILTER_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option === 'All' ? 'All Statuses' : option}
            </option>
          ))}
        </Select>
      </div>
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
          ) : filteredRows.length === 0 ? (
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={COLUMN_COUNT} className="py-10 text-center text-sm text-slate-500">
                No leads match your search or filter.
              </TableCell>
            </TableRow>
          ) : (
            filteredRows.map((lead) => (
              <TableRow key={lead.leadId}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div
                      aria-hidden="true"
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-700"
                    >
                      {getInitials(lead.customerName)}
                    </div>
                    <div className="min-w-0">
                      <p
                        className="max-w-[12rem] truncate font-medium text-slate-900"
                        title={lead.customerName ?? undefined}
                      >
                        {lead.customerName ?? '—'}
                      </p>
                      {lead.email && <p className="truncate text-xs text-slate-400">{lead.email}</p>}
                    </div>
                  </div>
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
