const STATUS_STYLES: Record<string, string> = {
  New: 'bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-600/20',
};

const DEFAULT_STYLE = 'bg-slate-100 text-slate-700 ring-1 ring-inset ring-slate-500/20';

/** Renders `status` as its own plain text content inside a styled pill —
 * the text itself is untouched, so any assertion on the status string
 * (getByText/row accessible name) still matches. */
export function StatusPill({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
        STATUS_STYLES[status] ?? DEFAULT_STYLE
      }`}
    >
      {status}
    </span>
  );
}
