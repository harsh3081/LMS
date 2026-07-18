import { ReactNode } from 'react';
import { Sidebar } from './Sidebar';

/** Shared page chrome (issue #126): a persistent full-height left `Sidebar`
 * plus the existing slim header + max-width content column, arranged as a
 * two-column layout (Sidebar | header-over-content). Purely presentational
 * — does not wrap page <main> elements, so each page keeps its own
 * <main>/<h1> exactly as before.
 *
 * DESIGN DECISION (issue #126, "your call, document it"): the existing
 * header is KEPT AS-IS (not folded into the Sidebar) — it's simpler, lower
 * risk for this "navigation shell only" step, and the two chrome pieces
 * (branding header vs. navigation sidebar) are conceptually distinct. See
 * NOTES.md.
 *
 * The content column's `max-w-5xl` constraint is kept (issue #126: "keep
 * the content area's own max-width") but is no longer centered across the
 * full viewport — it now sits beside the Sidebar via `mx-auto` inside the
 * remaining flex column, so on wide viewports it's centered within the
 * space to the right of the Sidebar rather than the whole window. */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="border-b border-slate-200 bg-white">
          <div className="flex items-center px-4 py-4 sm:px-6">
            <span className="text-lg font-semibold text-slate-900">
              LMS <span className="text-brand-600">·</span>{' '}
              <span className="font-normal text-slate-500">Lead Management</span>
            </span>
          </div>
        </header>
        <div className="flex-1 px-4 py-8 sm:px-6">
          <div className="mx-auto max-w-5xl">{children}</div>
        </div>
      </div>
    </div>
  );
}
