import { useState } from 'react';
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
} from './ui';

const CONVERTED_STATUS = 'Converted';

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
 * intentionally decoupled so the success confirmation remains visible. */
export function LeadQueue() {
  const { data: leads, isLoading } = useLeads();
  const { data: config } = useFeatureFlags();
  const [expandedLeadId, setExpandedLeadId] = useState<string | null>(null);

  if (isLoading) return <p className="text-sm text-slate-500">Loading leads…</p>;

  const convertLeadEnabled = config?.convertLeadEnabled !== false;

  return (
    <>
      <Table aria-label="My Leads">
        <TableHead>
          <TableRow>
            <TableHeaderCell>Customer</TableHeaderCell>
            <TableHeaderCell>Mobile</TableHeaderCell>
            <TableHeaderCell>Status</TableHeaderCell>
            <TableHeaderCell>Actions</TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {(leads ?? []).map((lead) => (
            <TableRow key={lead.leadId}>
              <TableCell className="font-medium text-slate-900">{lead.customerName ?? '—'}</TableCell>
              <TableCell>{lead.mobile ?? '—'}</TableCell>
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
            </TableRow>
          ))}
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
