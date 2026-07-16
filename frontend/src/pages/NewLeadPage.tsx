import { NewLeadForm } from '../components/NewLeadForm';
import { LeadQueue } from '../components/LeadQueue';
import { AppShell } from '../components/layout/AppShell';
import { Card } from '../components/ui';

/** Rendered at /leads/new (tech-design.md Component 4 Interfaces). */
export function NewLeadPage() {
  return (
    <AppShell>
      <main>
        <h1 className="mb-6 text-2xl font-bold text-slate-900">New Lead</h1>
        <Card className="mb-10 max-w-2xl">
          <NewLeadForm />
        </Card>
        <h2 className="mb-4 text-lg font-semibold text-slate-700">My Leads</h2>
        <LeadQueue />
      </main>
    </AppShell>
  );
}
