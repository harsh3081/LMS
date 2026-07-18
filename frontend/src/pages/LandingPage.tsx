import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useFeatureFlags } from '../hooks/useFeatureFlags';
import { LeadQueue } from '../components/LeadQueue';
import { NewLeadForm } from '../components/NewLeadForm';
import { AppShell } from '../components/layout/AppShell';
import { buttonStyles, SlideOver } from '../components/ui';

/** DSE landing page (CC-10 entry point host). MODIFIED (issue #118,
 * AC1/AC2/AC3/AC4): "New Lead" is no longer a `<Link>` navigating to
 * /leads/new — it's a `<button>` that opens the New Lead form in a
 * right-docked SlideOver panel over this same Dashboard (the Dashboard
 * stays mounted underneath; nothing here unmounts). On a successful
 * creation, NewLeadForm's `onSuccess` prop (issue #118, AC4) closes the
 * panel automatically after its brief success message; the already-visible
 * "My Leads" table below picks up the new Lead on its own via
 * useCreateLead's existing cache write (src/hooks/useLeads.ts) — no extra
 * wiring needed here. The `/leads/new` route (NewLeadPage) still exists
 * unchanged for direct navigation/bookmarking (AC5).
 *
 * MODIFIED (issue #126, AC4): the header link row is trimmed down to just
 * the two contextual quick-action controls ("New Enquiry" link, "New Lead"
 * slide-over button). "My Upcoming Follow-ups", "My Upcoming Test Drives",
 * "Book a Test Drive", "Test Drive Scheduler", and "Field Configuration"
 * are pure navigation, now redundant with the new persistent Sidebar (see
 * components/layout/Sidebar.tsx), so they're removed from here — including
 * the badge-count reads (`useUpcomingFollowups`/`useUpcomingTestDrives`)
 * that only existed to badge those now-removed links. The Sidebar's
 * equivalents are plain nav (no badges), per issue #126's minimal-shell
 * scope. */
export function LandingPage() {
  const { data: config } = useFeatureFlags();
  const [isNewLeadOpen, setIsNewLeadOpen] = useState(false);

  return (
    <AppShell>
      <main>
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <div className="flex items-center gap-3">
            {config?.directEnquiryEnabled !== false && (
              <Link
                to="/enquiries/new"
                role="link"
                className={`${buttonStyles.base} ${buttonStyles.secondary}`}
              >
                New Enquiry
              </Link>
            )}
            {config?.newLeadEnabled !== false && (
              <button
                type="button"
                onClick={() => setIsNewLeadOpen(true)}
                className={`${buttonStyles.base} ${buttonStyles.primary}`}
              >
                New Lead
              </button>
            )}
          </div>
        </div>
        <h2 className="mb-4 text-lg font-semibold text-slate-700">My Leads</h2>
        <LeadQueue />
      </main>

      <SlideOver
        open={isNewLeadOpen}
        onClose={() => setIsNewLeadOpen(false)}
        title="New Lead"
        maxWidthClassName="max-w-3xl"
      >
        <NewLeadForm onSuccess={() => setIsNewLeadOpen(false)} />
      </SlideOver>
    </AppShell>
  );
}
