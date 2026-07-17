import { Link } from 'react-router-dom';
import { useFeatureFlags } from '../hooks/useFeatureFlags';
import { useUpcomingFollowups } from '../hooks/useFollowups';
import { LeadQueue } from '../components/LeadQueue';
import { AppShell } from '../components/layout/AppShell';
import { buttonStyles } from '../components/ui';

/** DSE landing page (CC-10 entry point host). MODIFIED (issue #31, AC4): a
 * "My Upcoming Follow-ups" link, badged with the current count, is the
 * reachable entry point into UpcomingFollowupsPage ("Reminder/task is
 * visible to the DSE ahead of the due date"). */
export function LandingPage() {
  const { data: config } = useFeatureFlags();
  const { data: upcomingFollowups } = useUpcomingFollowups();

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
              <Link
                to="/leads/new"
                role="link"
                className={`${buttonStyles.base} ${buttonStyles.primary}`}
              >
                New Lead
              </Link>
            )}
          </div>
        </div>
        <h2 className="mb-4 text-lg font-semibold text-slate-700">My Leads</h2>
        <LeadQueue />
      </main>
    </AppShell>
  );
}
