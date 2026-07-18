import { useState } from 'react';
import { useFeatureFlags } from '../hooks/useFeatureFlags';
import { EnquiryQueue } from '../components/EnquiryQueue';
import { NewEnquiryForm } from '../components/NewEnquiryForm';
import { AppShell } from '../components/layout/AppShell';
import { buttonStyles, SlideOver } from '../components/ui';

/** Enquiry Management landing page (issue #130) — mirrors
 * LeadManagementPage.tsx's structure exactly: a header with a "New Enquiry"
 * quick action that opens a right-docked SlideOver panel (rather than
 * navigating to a standalone page) + the existing "My Enquiries" queue table
 * below. Replaces the removed standalone `/enquiries/new` route
 * (NewEnquiryPage.tsx, deleted) — "New Enquiry" is only reachable via this
 * page's slide-over now, matching how "New Lead" already works on
 * LeadManagementPage.
 *
 * The "New Enquiry" quick action is gated behind the same
 * `directEnquiryEnabled` feature flag LeadManagementPage's own "New Enquiry"
 * link used to be gated behind — this page is now the flag's sole
 * consuming entry point for that action.
 *
 * A newly created Enquiry appears in the already-visible "My Enquiries"
 * table via useCreateDirectEnquiry's existing cache write (issue #26) — no
 * extra wiring needed, same convention as LeadManagementPage/useCreateLead.
 */
export function EnquiryManagementPage() {
  const { data: config } = useFeatureFlags();
  const [isNewEnquiryOpen, setIsNewEnquiryOpen] = useState(false);

  return (
    <AppShell>
      <main>
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-900">Enquiry Management</h1>
          <div className="flex items-center gap-3">
            {config?.directEnquiryEnabled !== false && (
              <button
                type="button"
                onClick={() => setIsNewEnquiryOpen(true)}
                className={`${buttonStyles.base} ${buttonStyles.primary}`}
              >
                New Enquiry
              </button>
            )}
          </div>
        </div>
        <h2 className="mb-4 text-lg font-semibold text-slate-700">My Enquiries</h2>
        <EnquiryQueue />
      </main>

      <SlideOver
        open={isNewEnquiryOpen}
        onClose={() => setIsNewEnquiryOpen(false)}
        title="New Enquiry"
        maxWidthClassName="max-w-2xl"
      >
        <NewEnquiryForm onSuccess={() => setIsNewEnquiryOpen(false)} />
      </SlideOver>
    </AppShell>
  );
}
