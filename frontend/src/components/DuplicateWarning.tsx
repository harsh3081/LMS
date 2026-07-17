import { DuplicateMatch } from '../api/client';
import { Button } from './ui';

export interface DuplicateWarningProps {
  matches: DuplicateMatch[];
  acknowledged: boolean;
  onProceed: () => void;
  onCancel: () => void;
}

/**
 * Duplicate-mobile warning banner (issue #29, AC2/AC3) — rendered inline by
 * NewLeadForm/NewEnquiryForm when GET /api/v1/duplicates returns one or
 * more matches for the entered mobile number (AC2: "the DSE sees an alert
 * before the record is created, showing the matching existing record(s)").
 * A plain link/list-item per match is intentionally all that is shown here
 * (no navigation to a record-detail page, which does not exist yet in this
 * product — see NOTES.md "Known gaps").
 *
 * This component blocks nothing itself — it is purely presentational; the
 * owning form is responsible for gating submission on `acknowledged` (AC3:
 * the check is advisory and client-side-only, the server never hard-blocks
 * on a duplicate — see backend/src/leads/leads.service.ts's comment).
 */
export function DuplicateWarning({ matches, acknowledged, onProceed, onCancel }: DuplicateWarningProps) {
  if (matches.length === 0) return null;

  if (acknowledged) {
    return (
      <div role="status" className="rounded-md bg-yellow-50 px-3 py-2 text-sm text-yellow-800">
        Proceeding despite the duplicate-mobile warning — this will be noted in the audit trail.
      </div>
    );
  }

  return (
    <div
      role="alert"
      data-testid="duplicate-warning"
      className="space-y-2 rounded-md bg-yellow-50 px-3 py-2 text-sm text-yellow-800"
    >
      <p className="font-medium">A record with this mobile number already exists:</p>
      <ul className="list-disc space-y-1 pl-5">
        {matches.map((match) => (
          <li key={`${match.type}-${match.id}`}>
            {match.type === 'LEAD' ? 'Lead' : 'Enquiry'}: {match.label ?? 'Unknown'} ({match.status})
          </li>
        ))}
      </ul>
      <div className="flex gap-2 pt-1">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="button" onClick={onProceed}>
          Proceed anyway
        </Button>
      </div>
    </div>
  );
}
