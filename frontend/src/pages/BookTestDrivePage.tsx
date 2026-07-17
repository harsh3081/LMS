import { NewTestDriveForm } from '../components/NewTestDriveForm';
import { AppShell } from '../components/layout/AppShell';
import { Card } from '../components/ui';

/** Rendered at /test-drives/new (issue #34, "Book a Test Drive Slot") —
 * mirrors NewEnquiryPage's layout convention. */
export function BookTestDrivePage() {
  return (
    <AppShell>
      <main>
        <h1 className="mb-6 text-2xl font-bold text-slate-900">Book a Test Drive</h1>
        <Card className="mb-10 max-w-2xl">
          <NewTestDriveForm />
        </Card>
      </main>
    </AppShell>
  );
}
