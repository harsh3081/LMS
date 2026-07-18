import { NavLink } from 'react-router-dom';

interface NavItem {
  label: string;
  to: string;
}

interface NavGroup {
  label: string;
  /** When present, the group label itself becomes a link to that section's
   * own landing page (issue #128). Groups without a landing page yet
   * (Enquiry Management, Test Drive Scheduling) keep a plain, non-clickable
   * label until one exists. */
  to?: string;
  items: NavItem[];
}

/** Sidebar structure per issue #126 — EXACT routes/labels from the issue
 * body ("Step 1 — navigation shell only"). No new routes/pages are
 * introduced here; every `to` below already exists in App.tsx.
 * MODIFIED (issue #128): "Lead Management" now links to `/leads`, its new
 * landing page (formerly mislabeled `/` — see DashboardPage.tsx). */
const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Lead Management',
    to: '/leads',
    items: [
      { label: 'New Lead', to: '/leads/new' },
      { label: 'Field Configuration', to: '/admin/field-config' },
    ],
  },
  {
    label: 'Enquiry Management',
    items: [
      { label: 'New Enquiry', to: '/enquiries/new' },
      { label: 'My Upcoming Follow-ups', to: '/follow-ups/upcoming' },
    ],
  },
  {
    label: 'Test Drive Scheduling',
    items: [
      { label: 'Book a Test Drive', to: '/test-drives/new' },
      { label: 'Test Drive Scheduler', to: '/test-drives/scheduler' },
      { label: 'My Upcoming Test Drives', to: '/test-drives/upcoming' },
    ],
  },
];

const linkBase =
  'block rounded-md border-l-2 px-3 py-1.5 text-sm transition-colors focus:outline-none ' +
  'focus:ring-2 focus:ring-brand-500 focus:ring-offset-1';
const linkActive = 'border-brand-600 bg-brand-50 font-medium text-brand-700';
const linkInactive = 'border-transparent text-slate-600 hover:bg-slate-50 hover:text-slate-900';

function navLinkClassName({ isActive }: { isActive: boolean }): string {
  return `${linkBase} ${isActive ? linkActive : linkInactive}`;
}

/** Persistent left navigation shell (issue #126, "Step 1 — navigation shell
 * only"). Rendered once by AppShell so it appears on every page (AC1).
 * Active-route highlighting (AC2) uses react-router's `NavLink`, which
 * already ships with this codebase's `react-router-dom` dependency — no new
 * package. `end` is set on the Dashboard link only: every other route's
 * pathname starts with "/", so without `end` the Dashboard link would read
 * as "active" on every page. The three group sub-links don't need `end`
 * since none of their routes is a prefix of another route in this app
 * (verified against App.tsx: `/leads/new` is never a prefix match for
 * `/leads/:leadId` or `/leads/:leadId/convert`, etc.).
 *
 * Responsive/collapse behavior (AC3) is explicitly deferred — see
 * .phoenix-os/project/specs/126/NOTES.md for the rationale; the sidebar
 * renders at a fixed width on all viewport sizes for this step. */
export function Sidebar() {
  return (
    <nav
      aria-label="Primary"
      className="flex w-64 shrink-0 flex-col gap-6 border-r border-slate-200 bg-white px-4 py-6"
    >
      <NavLink to="/" end className={(state) => `${navLinkClassName(state)} text-sm font-semibold`}>
        Dashboard
      </NavLink>

      {NAV_GROUPS.map((group) => (
        <div key={group.label}>
          {group.to ? (
            <NavLink
              to={group.to}
              className={(state) =>
                `mb-2 block px-3 text-xs font-semibold uppercase tracking-wide ${
                  state.isActive ? 'text-brand-700' : 'text-slate-400 hover:text-slate-600'
                }`
              }
            >
              {group.label}
            </NavLink>
          ) : (
            <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wide text-slate-400">{group.label}</p>
          )}
          <ul className="space-y-1">
            {group.items.map((item) => (
              <li key={item.to}>
                <NavLink to={item.to} className={navLinkClassName}>
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}
