import { Link } from 'react-router-dom';
import { UpcomingFollowupsList } from '../components/UpcomingFollowupsList';
import { AppShell } from '../components/layout/AppShell';
import { buttonStyles } from '../components/ui';

/** Rendered at /follow-ups/upcoming (issue #31, AC4: "Reminder/task is
 * visible to the DSE ahead of the due date") — a dedicated route mirroring
 * LogFollowupPage/NewEnquiryPage's existing AppShell + heading + "Back to
 * Dashboard" routing convention, reached from LandingPage. */
export function UpcomingFollowupsPage() {
  return (
    <AppShell>
      <main>
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-900">My Upcoming Follow-ups</h1>
          <Link to="/" role="link" className={`${buttonStyles.base} ${buttonStyles.secondary}`}>
            Back to Dashboard
          </Link>
        </div>
        <UpcomingFollowupsList />
      </main>
    </AppShell>
  );
}
