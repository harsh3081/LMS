import { NavLink } from 'react-router-dom';

interface NavItem {
  label: string;
  to: string;
}

/** A plain top-level link, rendered with the same bold visual treatment as
 * the original "Dashboard" link (issue #130: "same visual treatment as
 * Dashboard"). `end` mirrors NavLink's own prop — only Dashboard needs it
 * (every other route's pathname starts with `/`, so without `end` the
 * Dashboard link would read as "active" everywhere). */
interface NavLinkEntry {
  kind: 'link';
  label: string;
  to: string;
  end?: boolean;
}

/** A labeled section containing its own sub-links — the original "group"
 * concept from issue #126. `to` is optional (issue #128's pattern, carried
 * forward): when present, the group's own label renders as a link to that
 * section's landing page (e.g. Enquiry Management -> `/enquiries`); Test
 * Drive Scheduling and Admin have no landing page of their own, so their
 * labels stay plain (non-clickable) headings. */
interface NavGroupEntry {
  kind: 'group';
  label: string;
  to?: string;
  items: NavItem[];
}

type NavEntry = NavLinkEntry | NavGroupEntry;

/** Sidebar structure per issue #130's final navigation shape — supersedes
 * issue #126/#128's `NAV_GROUPS` model.
 *
 * MODIFIED (issue #130): "New Lead" (moved into the Lead Management
 * slide-over, issue #118), "Field Configuration" (moved into the new Admin
 * group below), and "New Enquiry" (moved into the new Enquiry Management
 * slide-over) all leave their old groups. Once "New Enquiry" leaves, Lead
 * Management has no sub-items left at all, so it collapses into a plain
 * single link (same treatment as Dashboard). Enquiry Management still has
 * "My Upcoming Follow-ups" as a sub-item, so it stays a group — with its own
 * label now linking to `/enquiries` (issue #128's group-header-as-link
 * pattern, carried forward), not a plain non-clickable heading.
 *
 * CORRECTION: the original issue #130 text enumerated a 5-entry final
 * structure that omitted "My Upcoming Follow-ups" entirely — an oversight in
 * the issue itself (its stated premise "Enquiry Management ends up with no
 * sub-items" was only true if that item was dropped too, which was never
 * actually asked for). Restored here rather than silently losing the
 * Sidebar's only path to `/follow-ups/upcoming` — see NOTES.md.
 *
 * DESIGN DECISION (issue #130, "your call, document it"): rather than keep
 * treating "Dashboard" as a hardcoded special case separate from an array of
 * groups (the pre-#130 shape), every entry — plain link or group — now lives
 * in one ordered `NAV_ENTRIES` array of a `NavEntry` union, rendered by a
 * single `.map()` that branches on `entry.kind`. This is the "unified array"
 * structure the issue asked for: adding/removing/reordering any entry (link
 * or group) is a one-line change in this array, and the render loop never
 * needs to special-case any particular entry by name.
 */
const NAV_ENTRIES: NavEntry[] = [
  { kind: 'link', label: 'Dashboard', to: '/', end: true },
  { kind: 'link', label: 'Lead Management', to: '/leads' },
  {
    kind: 'group',
    label: 'Enquiry Management',
    to: '/enquiries',
    items: [{ label: 'My Upcoming Follow-ups', to: '/follow-ups/upcoming' }],
  },
  {
    kind: 'group',
    label: 'Test Drive Scheduling',
    items: [
      { label: 'Book a Test Drive', to: '/test-drives/new' },
      { label: 'Test Drive Scheduler', to: '/test-drives/scheduler' },
      { label: 'My Upcoming Test Drives', to: '/test-drives/upcoming' },
    ],
  },
  {
    kind: 'group',
    label: 'Admin',
    items: [{ label: 'Field Configuration', to: '/admin/field-config' }],
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

/** Persistent left navigation shell (issue #126, restructured by issue
 * #130). Rendered once by AppShell so it appears on every page (AC1).
 * Active-route highlighting (AC2) uses react-router's `NavLink`. Sub-links
 * within a group don't need `end`: none of their routes is a prefix of
 * another route in this app (verified against App.tsx). Top-level plain
 * links (Lead Management `/leads`, Enquiry Management `/enquiries`) also
 * skip `end` deliberately — nested routes like `/leads/:leadId` or
 * `/enquiries/:enquiryId/follow-up` should still highlight their parent
 * section as active, mirroring the pre-#130 "Lead Management" group-header
 * link's behavior (issue #128).
 *
 * Responsive/collapse behavior (AC3, issue #126) remains explicitly
 * deferred — see .phoenix-os/project/specs/126/NOTES.md for the rationale;
 * the sidebar renders at a fixed width on all viewport sizes.
 */
export function Sidebar() {
  return (
    <nav
      aria-label="Primary"
      className="flex w-64 shrink-0 flex-col gap-6 border-r border-slate-200 bg-white px-4 py-6"
    >
      {NAV_ENTRIES.map((entry) => {
        if (entry.kind === 'link') {
          return (
            <NavLink
              key={entry.to}
              to={entry.to}
              end={entry.end}
              className={(state) => `${navLinkClassName(state)} text-sm font-semibold`}
            >
              {entry.label}
            </NavLink>
          );
        }

        return (
          <div key={entry.label}>
            {entry.to ? (
              <NavLink
                to={entry.to}
                className={(state) =>
                  `mb-2 block px-3 text-xs font-semibold uppercase tracking-wide ${
                    state.isActive ? 'text-brand-700' : 'text-slate-400 hover:text-slate-600'
                  }`
                }
              >
                {entry.label}
              </NavLink>
            ) : (
              <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wide text-slate-400">{entry.label}</p>
            )}
            <ul className="space-y-1">
              {entry.items.map((item) => (
                <li key={item.to}>
                  <NavLink to={item.to} className={navLinkClassName}>
                    {item.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </nav>
  );
}
