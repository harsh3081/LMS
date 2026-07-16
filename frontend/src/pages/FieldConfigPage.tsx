import { FieldConfigForm } from '../components/FieldConfigForm';
import { AppShell } from '../components/layout/AppShell';
import { Card } from '../components/ui';

/** Rendered at /admin/field-config (issue #27 AC1). */
export function FieldConfigPage() {
  return (
    <AppShell>
      <main>
        <h1 className="mb-6 text-2xl font-bold text-slate-900">Field Configuration</h1>
        <Card className="max-w-2xl">
          <FieldConfigForm />
        </Card>
      </main>
    </AppShell>
  );
}
