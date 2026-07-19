import { NavLink } from 'react-router-dom';

interface NavItem {
  label: string;
  to: string;
}

/** A plain top-level link, rendered with the same bold visual treatment as
 * the original "Dashboard" link (issue #130: "same visual treatment as
 * Dashboard"). `end` mirrors NavLink's own prop — only Dashboard needs it
 * (every other route's pathname starts with `/`, so without `end` the
 * Dashboard link would read as "active" everywhere). `icon` is new (issue
 * #138): a small leading glyph matching the reference design's icon-led nav
 * — purely decorative (`aria-hidden`), so it never affects the link's
 * accessible name. */
interface NavLinkEntry {
  kind: 'link';
  label: string;
  to: string;
  end?: boolean;
  icon: (props: { className?: string }) => JSX.Element;
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
  icon: (props: { className?: string }) => JSX.Element;
  items: NavItem[];
}

type NavEntry = NavLinkEntry | NavGroupEntry;

function DashboardIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M4 13h6V4H4v9Zm0 7h6v-5H4v5Zm10 0h6V11h-6v9Zm0-16v5h6V4h-6Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function LeadsIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M16 11a4 4 0 1 0-4-4M8 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-6 8c0-3.3 2.7-6 6-6s6 2.7 6 6M14 14c2.8 0 6 1.5 6 6"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function EnquiriesIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M3 6.5 12 12l9-5.5M4 5h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function TestDriveIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M5 11l1.5-4.5A2 2 0 0 1 8.4 5h7.2a2 2 0 0 1 1.9 1.5L19 11m-14 0h14m-14 0a2 2 0 0 0-2 2v3a1 1 0 0 0 1 1h1m14-6a2 2 0 0 1 2 2v3a1 1 0 0 1-1 1h-1m-14 0v1.5A1.5 1.5 0 0 0 6.5 20h0A1.5 1.5 0 0 0 8 18.5V17m9 0v1.5a1.5 1.5 0 0 0 1.5 1.5h0a1.5 1.5 0 0 0 1.5-1.5V17M8 17h8"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function AdminIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Purely decorative brand mark (issue #138) — a small rounded square with
 * an abstract bar-chart glyph, in the same violet accent as the reference
 * design's logo. Not a link/button: this app has no "home" concept distinct
 * from the Dashboard link right below it. */
function LogoMark() {
  return (
    <div className="mb-6 flex items-center gap-2 px-2">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600">
        <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 text-white" aria-hidden="true">
          <path
            d="M4 20V10m6 10V4m6 16v-7"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      <span className="text-base font-semibold text-slate-900">
        LMS <span className="text-brand-600">·</span>{' '}
        <span className="font-normal text-slate-500">Lead Management</span>
      </span>
    </div>
  );
}

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
 *
 * MODIFIED (issue #138): each entry now carries an `icon`, matching the
 * reference design's icon-led nav — see NavLinkEntry/NavGroupEntry doc
 * comments above for why these are purely decorative.
 */
const NAV_ENTRIES: NavEntry[] = [
  { kind: 'link', label: 'Dashboard', to: '/', end: true, icon: DashboardIcon },
  { kind: 'link', label: 'Lead Management', to: '/leads', icon: LeadsIcon },
  {
    kind: 'group',
    label: 'Enquiry Management',
    to: '/enquiries',
    icon: EnquiriesIcon,
    items: [{ label: 'My Upcoming Follow-ups', to: '/follow-ups/upcoming' }],
  },
  {
    kind: 'group',
    label: 'Test Drive Scheduling',
    icon: TestDriveIcon,
    items: [
      { label: 'Book a Test Drive', to: '/test-drives/new' },
      { label: 'Test Drive Scheduler', to: '/test-drives/scheduler' },
      { label: 'My Upcoming Test Drives', to: '/test-drives/upcoming' },
    ],
  },
  {
    kind: 'group',
    label: 'Admin',
    icon: AdminIcon,
    items: [{ label: 'Field Configuration', to: '/admin/field-config' }],
  },
];

/** REDESIGNED (issue #138): flat rounded "pill" active state (light slate
 * fill, bold dark text) replacing the old left-border-accent treatment, to
 * match the reference design. Icon color follows the same active/inactive
 * split as the text. */
const linkBase =
  'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors focus:outline-none ' +
  'focus:ring-2 focus:ring-brand-500 focus:ring-offset-1';
const linkActive = 'bg-slate-100 font-semibold text-slate-900';
const linkInactive = 'text-slate-600 hover:bg-slate-50 hover:text-slate-900';

function navLinkClassName({ isActive }: { isActive: boolean }): string {
  return `${linkBase} ${isActive ? linkActive : linkInactive}`;
}

const subLinkBase =
  'block rounded-lg px-3 py-1.5 text-sm transition-colors focus:outline-none ' +
  'focus:ring-2 focus:ring-brand-500 focus:ring-offset-1';
const subLinkActive = 'bg-slate-100 font-semibold text-slate-900';
const subLinkInactive = 'text-slate-500 hover:bg-slate-50 hover:text-slate-900';

function subNavLinkClassName({ isActive }: { isActive: boolean }): string {
  return `${subLinkBase} ${isActive ? subLinkActive : subLinkInactive}`;
}

/** Persistent left navigation shell (issue #126, restructured by issue
 * #130, restyled by issue #138). Rendered once by AppShell so it appears on
 * every page (AC1). Active-route highlighting (AC2) uses react-router's
 * `NavLink`. Sub-links within a group don't need `end`: none of their
 * routes is a prefix of another route in this app (verified against
 * App.tsx). Top-level plain links (Lead Management `/leads`, Enquiry
 * Management `/enquiries`) also skip `end` deliberately — nested routes
 * like `/leads/:leadId` or `/enquiries/:enquiryId/follow-up` should still
 * highlight their parent section as active, mirroring the pre-#130 "Lead
 * Management" group-header link's behavior (issue #128).
 *
 * Responsive/collapse behavior (AC3, issue #126) remains explicitly
 * deferred — see .phoenix-os/project/specs/126/NOTES.md for the rationale;
 * the sidebar renders at a fixed width on all viewport sizes. The reference
 * design's collapse icon and bottom "trial/upgrade" card are both omitted
 * (issue #138): the former isn't backed by any collapse behavior, the
 * latter has no billing/trial concept in this app — see NOTES.md.
 */
export function Sidebar() {
  return (
    <nav
      aria-label="Primary"
      className="flex w-64 shrink-0 flex-col gap-6 border-r border-slate-200 bg-white px-3 py-6"
    >
      <LogoMark />
      {NAV_ENTRIES.map((entry) => {
        if (entry.kind === 'link') {
          const Icon = entry.icon;
          return (
            <NavLink
              key={entry.to}
              to={entry.to}
              end={entry.end}
              className={navLinkClassName}
            >
              <Icon className="h-5 w-5 shrink-0" />
              {entry.label}
            </NavLink>
          );
        }

        const GroupIcon = entry.icon;
        return (
          <div key={entry.label}>
            {entry.to ? (
              <NavLink
                to={entry.to}
                className={(state) =>
                  `mb-1 flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
                    state.isActive ? 'bg-slate-100 text-slate-900' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`
                }
              >
                <GroupIcon className="h-5 w-5 shrink-0" />
                {entry.label}
              </NavLink>
            ) : (
              <p className="mb-1 flex items-center gap-2.5 px-3 py-2 text-sm font-semibold text-slate-600">
                <GroupIcon className="h-5 w-5 shrink-0" />
                {entry.label}
              </p>
            )}
            <ul className="space-y-0.5 pl-9">
              {entry.items.map((item) => (
                <li key={item.to}>
                  <NavLink to={item.to} className={subNavLinkClassName}>
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
