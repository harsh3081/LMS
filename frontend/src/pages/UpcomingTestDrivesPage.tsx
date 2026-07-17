import { Link } from 'react-router-dom';
import { UpcomingTestDrivesList } from '../components/UpcomingTestDrivesList';
import { AppShell } from '../components/layout/AppShell';
import { buttonStyles } from '../components/ui';

/** Rendered at /test-drives/upcoming (issue #34, AC5) — mirrors
 * UpcomingFollowupsPage's structure exactly. */
export function UpcomingTestDrivesPage() {
  return (
    <AppShell>
      <main>
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-900">My Upcoming Test Drives</h1>
          <Link to="/" role="link" className={`${buttonStyles.base} ${buttonStyles.secondary}`}>
            Back to Dashboard
          </Link>
        </div>
        <UpcomingTestDrivesList />
      </main>
    </AppShell>
  );
}
