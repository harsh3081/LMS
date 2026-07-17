import { Link, useParams } from 'react-router-dom';
import { LogFollowupForm } from '../components/LogFollowupForm';
import { FollowupHistoryTimeline } from '../components/FollowupHistoryTimeline';
import { AppShell } from '../components/layout/AppShell';
import { Card, buttonStyles } from '../components/ui';

/** Rendered at /enquiries/:enquiryId/follow-up (issue #30, "Log a Follow-up
 * with Type and Outcome Remarks") — a dedicated route (rather than a modal)
 * mirrors NewEnquiryPage/NewLeadPage's existing routing convention with the
 * least new plumbing (no modal/overlay component exists anywhere yet in
 * this codebase). Reached from EnquiryQueue's "Log Follow-up" row action.
 *
 * MODIFIED (issue #32, "Role-Scoped Follow-up History Timeline", AC1/AC2):
 * this is also the natural surface to render the chronological history
 * timeline for the SAME Enquiry — it already has the enquiryId in its
 * route and is the closest thing this codebase has to an "Enquiry detail
 * surface", so the timeline is added below the form here rather than a new
 * page (mirrors #30/#31's precedent of keeping new UI surfaces minimal).
 * NOTE: TL/SM-GM's ability to browse to an arbitrary Enquiry they don't
 * own (to reach this same route) is a known, documented gap — see
 * .phoenix-os/project/specs/32/NOTES.md; no team/org-wide Enquiry
 * browse UI exists anywhere in this codebase yet. */
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

        <div className="mt-8 max-w-3xl">
          <h2 className="mb-3 text-lg font-semibold text-slate-900">Follow-up History</h2>
          <FollowupHistoryTimeline enquiryId={enquiryId} />
        </div>
      </main>
    </AppShell>
  );
}
