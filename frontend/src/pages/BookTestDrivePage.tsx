import { useSearchParams } from 'react-router-dom';
import { NewTestDriveForm } from '../components/NewTestDriveForm';
import { AppShell } from '../components/layout/AppShell';
import { Card } from '../components/ui';

/** Rendered at /test-drives/new (issue #34, "Book a Test Drive Slot") —
 * mirrors NewEnquiryPage's layout convention. MODIFIED (issue #35 AC4):
 * reads optional `vehicleId`/`date`/`time` query params — set by the
 * Scheduler grid's "Book" link on an OPEN slot (TestDriveSchedulerGrid) —
 * and passes them through as NewTestDriveForm's `initialValues`. Chosen as
 * the pre-fill mechanism because there is no existing precedent in this
 * codebase for form pre-fill via navigation (verified: every other
 * create-form route, e.g. /leads/new, /enquiries/new, starts blank); query
 * params are the simplest, most inspectable option (a plain URL, no
 * route-state/context plumbing that a page refresh would lose) — see
 * NOTES.md. Arriving at /test-drives/new directly (no query params, issue
 * #34's original entry point) is unaffected. */
export function BookTestDrivePage() {
  const [searchParams] = useSearchParams();
  const vehicleId = searchParams.get('vehicleId');
  const date = searchParams.get('date');
  const time = searchParams.get('time');
  const initialValues =
    vehicleId || date || time
      ? { vehicleId: vehicleId ?? undefined, date: date ?? undefined, time: time ?? undefined }
      : undefined;

  return (
    <AppShell>
      <main>
        <h1 className="mb-6 text-2xl font-bold text-slate-900">Book a Test Drive</h1>
        <Card className="mb-10 max-w-2xl">
          <NewTestDriveForm initialValues={initialValues} />
        </Card>
      </main>
    </AppShell>
  );
}
