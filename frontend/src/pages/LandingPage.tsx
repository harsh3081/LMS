import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useFeatureFlags } from '../hooks/useFeatureFlags';
import { useUpcomingFollowups } from '../hooks/useFollowups';
import { useUpcomingTestDrives } from '../hooks/useTestDrives';
import { LeadQueue } from '../components/LeadQueue';
import { NewLeadForm } from '../components/NewLeadForm';
import { AppShell } from '../components/layout/AppShell';
import { buttonStyles, SlideOver } from '../components/ui';

/** DSE landing page (CC-10 entry point host). MODIFIED (issue #31, AC4): a
 * "My Upcoming Follow-ups" link, badged with the current count, is the
 * reachable entry point into UpcomingFollowupsPage ("Reminder/task is
 * visible to the DSE ahead of the due date"). MODIFIED (issue #34, AC5): a
 * "My Upcoming Test Drives" link (badged with count) and a "Book a Test
 * Drive" entry point, mirroring the Follow-up entry points exactly.
 * MODIFIED (issue #35): a "Test Drive Scheduler" entry point into
 * TestDriveSchedulerPage (AC1-AC5). MODIFIED (issue #118, AC1/AC2/AC3/AC4):
 * "New Lead" is no longer a `<Link>` navigating to /leads/new — it's a
 * `<button>` that opens the New Lead form in a right-docked SlideOver panel
 * over this same Dashboard (the Dashboard stays mounted underneath; nothing
 * here unmounts). On a successful creation, NewLeadForm's `onSuccess` prop
 * (issue #118, AC4) closes the panel automatically after its brief success
 * message; the already-visible "My Leads" table below picks up the new Lead
 * on its own via useCreateLead's existing cache write (src/hooks/useLeads.ts)
 * — no extra wiring needed here. The `/leads/new` route (NewLeadPage) still
 * exists unchanged for direct navigation/bookmarking (AC5). */
export function LandingPage() {
  const { data: config } = useFeatureFlags();
  const { data: upcomingFollowups } = useUpcomingFollowups();
  const { data: upcomingTestDrives } = useUpcomingTestDrives();
  const [isNewLeadOpen, setIsNewLeadOpen] = useState(false);

  return (
    <AppShell>
      <main>
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <div className="flex items-center gap-3">
            <Link to="/follow-ups/upcoming" role="link" className={`${buttonStyles.base} ${buttonStyles.secondary}`}>
              My Upcoming Follow-ups
              {upcomingFollowups && upcomingFollowups.length > 0 && (
                <span className="ml-2 inline-flex items-center justify-center rounded-full bg-brand-600 px-2 py-0.5 text-xs font-semibold text-white">
                  {upcomingFollowups.length}
                </span>
              )}
            </Link>
            <Link to="/test-drives/upcoming" role="link" className={`${buttonStyles.base} ${buttonStyles.secondary}`}>
              My Upcoming Test Drives
              {upcomingTestDrives && upcomingTestDrives.length > 0 && (
                <span className="ml-2 inline-flex items-center justify-center rounded-full bg-brand-600 px-2 py-0.5 text-xs font-semibold text-white">
                  {upcomingTestDrives.length}
                </span>
              )}
            </Link>
            <Link to="/test-drives/new" role="link" className={`${buttonStyles.base} ${buttonStyles.secondary}`}>
              Book a Test Drive
            </Link>
            <Link to="/test-drives/scheduler" role="link" className={`${buttonStyles.base} ${buttonStyles.secondary}`}>
              Test Drive Scheduler
            </Link>
            <Link to="/admin/field-config" role="link" className={`${buttonStyles.base} ${buttonStyles.secondary}`}>
              Field Configuration
            </Link>
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

      <SlideOver open={isNewLeadOpen} onClose={() => setIsNewLeadOpen(false)} title="New Lead">
        <NewLeadForm onSuccess={() => setIsNewLeadOpen(false)} />
      </SlideOver>
    </AppShell>
  );
}
