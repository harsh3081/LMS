import { NewEnquiryForm } from '../components/NewEnquiryForm';
import { EnquiryQueue } from '../components/EnquiryQueue';
import { AppShell } from '../components/layout/AppShell';
import { Card } from '../components/ui';

/** Rendered at /enquiries/new (issue #26, "Create a Direct Enquiry
 * (Walk-in/Referred)") — mirrors NewLeadPage's layout convention. */
export function NewEnquiryPage() {
  return (
    <AppShell>
      <main>
        <h1 className="mb-6 text-2xl font-bold text-slate-900">New Enquiry</h1>
        <Card className="mb-10 max-w-2xl">
          <NewEnquiryForm />
        </Card>
        <h2 className="mb-4 text-lg font-semibold text-slate-700">My Enquiries</h2>
        <EnquiryQueue />
      </main>
    </AppShell>
  );
}
