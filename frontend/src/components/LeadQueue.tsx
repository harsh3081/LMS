import { useLeads } from '../hooks/useLeads';
import {
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableHeaderCell,
  TableCell,
  StatusPill,
} from './ui';

/** DSE's own Lead list/queue (AC6) — newest first, reflects new creates
 * immediately via the useCreateLead cache update (no full page reload). */
export function LeadQueue() {
  const { data: leads, isLoading } = useLeads();

  if (isLoading) return <p className="text-sm text-slate-500">Loading leads…</p>;

  return (
    <Table aria-label="My Leads">
      <TableHead>
        <TableRow>
          <TableHeaderCell>Customer</TableHeaderCell>
          <TableHeaderCell>Mobile</TableHeaderCell>
          <TableHeaderCell>Status</TableHeaderCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {(leads ?? []).map((lead) => (
          <TableRow key={lead.leadId}>
            <TableCell className="font-medium text-slate-900">{lead.customerName}</TableCell>
            <TableCell>{lead.mobile}</TableCell>
            <TableCell>
              <StatusPill status={lead.status} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
