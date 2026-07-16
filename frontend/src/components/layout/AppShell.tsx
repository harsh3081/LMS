import { ReactNode } from 'react';

/** Shared page chrome: a slim header + a centered, max-width content
 * column. Purely presentational — does not wrap page <main> elements, so
 * each page keeps its own <main>/<h1> exactly as before. */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center px-4 py-4 sm:px-6">
          <span className="text-lg font-semibold text-slate-900">
            LMS <span className="text-brand-600">·</span>{' '}
            <span className="font-normal text-slate-500">Lead Management</span>
          </span>
        </div>
      </header>
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">{children}</div>
    </div>
  );
}
