import { Link, useParams } from 'react-router-dom';
import { LogFollowupForm } from '../components/LogFollowupForm';
import { AppShell } from '../components/layout/AppShell';
import { Card, buttonStyles } from '../components/ui';

/** Rendered at /enquiries/:enquiryId/follow-up (issue #30, "Log a Follow-up
 * with Type and Outcome Remarks") — a dedicated route (rather than a modal)
 * mirrors NewEnquiryPage/NewLeadPage's existing routing convention with the
 * least new plumbing (no modal/overlay component exists anywhere yet in
 * this codebase). Reached from EnquiryQueue's "Log Follow-up" row action. */
export function LogFollowupPage() {
  const { enquiryId } = useParams<{ enquiryId: string }>();

  if (!enquiryId) {
    return (
      <AppShell>
        <main>
          <p role="alert" className="text-sm text-red-700">
            No enquiry specified.
          </p>
        </main>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <main>
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-900">Log Follow-up</h1>
          <Link to="/" role="link" className={`${buttonStyles.base} ${buttonStyles.secondary}`}>
            Back to Dashboard
          </Link>
        </div>
        <Card className="max-w-2xl">
          <LogFollowupForm enquiryId={enquiryId} />
        </Card>
      </main>
    </AppShell>
  );
}
