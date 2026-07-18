import { NewLeadForm } from '../components/NewLeadForm';
import { AppShell } from '../components/layout/AppShell';
import { Card } from '../components/ui';

/** Rendered at /leads/new (tech-design.md Component 4 Interfaces). Kept as a
 * standalone route for direct navigation/bookmarking (issue #118, AC5), but
 * MODIFIED (issue #118, AC5) to drop the redundant "My Leads" table that
 * used to be re-displayed below the form here — LandingPage already shows
 * the same DSE queue, and the Dashboard's new "New Lead" entry point now
 * opens this same form in a slide-over panel instead of navigating to this
 * page, so duplicating the table on this route added no value. */
export function NewLeadPage() {
  return (
    <AppShell>
      <main>
        <h1 className="mb-6 text-2xl font-bold text-slate-900">New Lead</h1>
        <Card className="max-w-4xl">
          <NewLeadForm />
        </Card>
      </main>
    </AppShell>
  );
}
