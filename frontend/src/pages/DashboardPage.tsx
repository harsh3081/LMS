import { AppShell } from '../components/layout/AppShell';
import { Card } from '../components/ui';

/** Placeholder Dashboard (issue #128) — `/` previously showed Lead
 * Management content (My Leads table, quick actions), which was mislabeled
 * as "Dashboard" and has moved to `/leads` (see `LeadManagementPage.tsx`).
 * This is a genuinely new, deliberately minimal page: a real Dashboard will
 * be designed in a later step. Every existing "Back to Dashboard" link
 * across the app (ConvertLeadPage, LeadDetailPage, LogFollowupPage,
 * TestDriveSchedulerPage, UpcomingFollowupsPage, UpcomingTestDrivesPage)
 * already points to `/` and needs no change — `/` continues to be
 * "Dashboard", now with real (if placeholder) content instead of
 * accidentally being Lead Management. */
export function DashboardPage() {
  return (
    <AppShell>
      <main>
        <h1 className="mb-6 text-2xl font-bold text-slate-900">Dashboard</h1>
        <Card>
          <p className="text-sm text-slate-500">
            Dashboard coming soon — this page will bring together the key metrics and shortcuts DSEs, TLs, and SM/GMs
            need at a glance. In the meantime, use the sidebar to reach Lead Management, Enquiry Management, and Test
            Drive Scheduling.
          </p>
        </Card>
      </main>
    </AppShell>
  );
}
