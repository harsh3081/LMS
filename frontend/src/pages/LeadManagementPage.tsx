import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useFeatureFlags } from '../hooks/useFeatureFlags';
import { LeadQueue } from '../components/LeadQueue';
import { NewLeadForm } from '../components/NewLeadForm';
import { AppShell } from '../components/layout/AppShell';
import { buttonStyles, SlideOver } from '../components/ui';

/** Lead Management landing page (issue #128) — this is a straight RENAME of
 * what used to be `LandingPage`/"Dashboard": the "My Leads" table and the
 * "New Lead"/"New Enquiry" quick actions were never actually Dashboard
 * content, they're Lead Management content that happened to be mounted at
 * `/`. Moved here, at `/leads`, unchanged in behavior — only the route and
 * the page's own heading changed (was "Dashboard", now "Lead Management").
 * The real Dashboard (`/`) is a new, separate, deliberately minimal
 * placeholder — see `DashboardPage.tsx` — to be designed properly later.
 *
 * Everything below this comment is otherwise identical to the former
 * LandingPage: "New Lead" opens a right-docked SlideOver panel (issue #118)
 * rather than navigating away; the already-visible "My Leads" table below
 * picks up a newly created Lead via `useCreateLead`'s existing cache write
 * (issue #24/#116) — no extra wiring needed. The Sidebar's "Lead Management"
 * group header now links here (issue #128) instead of being a plain label.
 */
export function LeadManagementPage() {
  const { data: config } = useFeatureFlags();
  const [isNewLeadOpen, setIsNewLeadOpen] = useState(false);

  return (
    <AppShell>
      <main>
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-900">Lead Management</h1>
          <div className="flex items-center gap-3">
            {config?.directEnquiryEnabled !== false && (
              <Link
                to="/enquiries"
                role="link"
                className={`${buttonStyles.base} ${buttonStyles.secondary}`}
              >
                New Enquiry
              </Link>
            )}
            {config?.newLeadEnabled !== false && (
              <button
                type="button"
                onClick={() => setIsNewLeadOpen(true)}
                className={`${buttonStyles.base} ${buttonStyles.primary}`}
              >
                New Lead
              </button>
            )}
          </div>
        </div>
        <h2 className="mb-4 text-lg font-semibold text-slate-700">My Leads</h2>
        <LeadQueue />
      </main>

      <SlideOver
        open={isNewLeadOpen}
        onClose={() => setIsNewLeadOpen(false)}
        title="New Lead"
        maxWidthClassName="max-w-3xl"
      >
        <NewLeadForm onSuccess={() => setIsNewLeadOpen(false)} />
      </SlideOver>
    </AppShell>
  );
}
