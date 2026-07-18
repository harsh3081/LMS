import { ReactNode } from 'react';

export interface DetailFieldProps {
  label: string;
  children: ReactNode;
}

/** NEW (issue #116) — a single read-only label/value pair for a detail/
 * summary view (e.g. LeadDetailPage). No equivalent primitive existed
 * anywhere in this codebase's `components/ui/` before this Story (checked:
 * FormField.tsx is an editable-field wrapper for form controls, not a
 * read-only display). Renders as a `<div>` (not `<dt>/<dd>`) so callers can
 * lay a set of these out in a plain CSS grid without also having to wrap
 * them in a `<dl>` — kept deliberately minimal, matching this codebase's
 * existing `ui/` primitives' thin-wrapper style. */
export function DetailField({ label, children }: DetailFieldProps) {
  return (
    <div>
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 text-sm text-slate-900">{children}</div>
    </div>
  );
}
