import { Link, useNavigate, useParams } from 'react-router-dom';
import { ConvertLeadForm } from '../components/ConvertLeadForm';
import { AppShell } from '../components/layout/AppShell';
import { Card, buttonStyles } from '../components/ui';

/**
 * Rendered at /leads/:leadId/convert (issue #124, AC1) — the rewritten,
 * sectioned "Convert to Enquiry" flow.
 *
 * DESIGN DECISION (issue #124 — "implementer's call, document it"): a
 * dedicated ROUTE, not a `SlideOver`. The New Lead form (issue #118/#120)
 * already established the SlideOver-over-Dashboard pattern for a form of
 * comparable complexity, but this Story's form is larger still (8 sections,
 * more fields than even the New Lead form, PLUS a read-only Customer
 * Information display pulled from a second data source). Even at
 * `SlideOver`'s widest supported panel (`max-w-3xl`/`max-w-4xl`), an 8-section
 * form with a side-nav inside a fixed-height right-docked panel would force
 * either a cramped single-column layout or a claustrophobic scroll region —
 * neither matches the "professional card layout" visual bar the New Lead
 * form set. A full page gives the 2-column-grid-per-section + side-nav
 * layout the same breathing room NewLeadPage/LeadDetailPage already use, and
 * keeps this large flow bookmarkable/directly-navigable/back-button-friendly
 * the same way NewLeadPage is. See NOTES.md for the fuller rationale.
 *
 * Mirrors NewLeadPage/LeadDetailPage's AppShell + Card page-shell
 * convention. LeadQueue's "Convert to Enquiry" button now navigates here
 * (`Link to={/leads/${leadId}/convert}`) instead of inline-expanding the old
 * 4-field ConvertLeadForm panel (issue #124 replaces that UX entirely).
 */
export function ConvertLeadPage() {
  const { leadId } = useParams<{ leadId: string }>();
  const navigate = useNavigate();

  if (!leadId) {
    return (
      <AppShell>
        <main>
          <p role="alert" className="text-sm text-red-700">
            No lead specified.
          </p>
        </main>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <main>
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-900">Convert to Enquiry</h1>
          <Link to="/" role="link" className={`${buttonStyles.base} ${buttonStyles.secondary}`}>
            Back to Leads
          </Link>
        </div>
        <Card className="max-w-6xl">
          <ConvertLeadForm leadId={leadId} onConverted={() => navigate('/')} />
        </Card>
      </main>
    </AppShell>
  );
}
