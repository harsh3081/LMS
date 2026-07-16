import { Link } from 'react-router-dom';
import { useFeatureFlags } from '../hooks/useFeatureFlags';
import { LeadQueue } from '../components/LeadQueue';
import { AppShell } from '../components/layout/AppShell';
import { buttonStyles } from '../components/ui';

/** DSE landing page (CC-10 entry point host). */
export function LandingPage() {
  const { data: config } = useFeatureFlags();

  return (
    <AppShell>
      <main>
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
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
        <h2 className="mb-4 text-lg font-semibold text-slate-700">My Leads</h2>
        <LeadQueue />
      </main>
    </AppShell>
  );
}
