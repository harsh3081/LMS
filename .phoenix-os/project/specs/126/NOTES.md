# Issue #126 — Persistent Left Sidebar (Step 1: navigation shell only)

Fast-tracked, frontend-only implementation. Direct user request (not BRD-sourced).

## What was built

- `frontend/src/components/layout/Sidebar.tsx` (new) — persistent left nav: a
  "Dashboard" link (`/`) plus 3 labeled groups (Lead Management, Enquiry
  Management, Test Drive Scheduling) with their sub-links, using the exact
  routes from the issue body. No new routes/pages.
- `frontend/src/components/layout/AppShell.tsx` (modified) — restructured
  into a two-column flex layout: `Sidebar` on the left, the existing header +
  content column on the right.
- `frontend/src/pages/LandingPage.tsx` (modified) — header link row trimmed
  per AC4.
- `frontend/tests/unit/Sidebar.spec.tsx` (new) — 6 tests.
- `frontend/tests/unit/LandingPage.spec.tsx` (modified) — collision fixes +
  updated coverage for the trimmed links (see below).

## Layout restructuring approach

**Decision: keep the existing header as-is, do NOT fold it into the
Sidebar.** The two chrome pieces are conceptually distinct (branding header
vs. navigation), and keeping them separate is the lower-risk change for a
"navigation shell only" step. `AppShell` is now:

```
<div className="flex min-h-screen ...">
  <Sidebar />                          {/* full-height, fixed width (w-64) */}
  <div className="flex flex-1 flex-col">
    <header>...(unchanged content)...</header>
    <div className="flex-1 ...">
      <div className="mx-auto max-w-5xl">{children}</div>
    </div>
  </div>
</div>
```

The content column keeps its own `max-w-5xl` constraint (per the issue:
"reasonable to keep the content area's own max-width") but is no longer
centered across the full viewport — it's centered within the space to the
right of the Sidebar instead. `Sidebar` is a sibling of the header/content
column, not nested inside `<main>`, so it doesn't interfere with any page's
own `<main>`/`<h1>` landmark structure — pages didn't need touching except
`LandingPage.tsx`.

## Active-highlighting mechanism

`react-router-dom`'s `NavLink` (already a dependency, no new package). The
Dashboard link uses the `end` prop — without it, `/` would read as "active"
on every route since every pathname starts with `/`. The group sub-links
don't need `end`: none of their routes is a prefix of another app route
(verified against `App.tsx`, e.g. `/leads/new` never matches `/leads/:leadId`
or `/leads/:leadId/convert`). Visual treatment: `bg-brand-50` +
`text-brand-700` + a `border-brand-600` left border on the active link,
mirroring `LeadFormSectionNav`'s existing `bg-brand-50`/`text-brand-700`
convention and the app's general `brand-600` accent usage.

## Responsive/collapse decision: DEFERRED

Per AC3 ("implementer's call whether to address it now or defer"), the
Sidebar renders at a fixed `w-64` on all viewport sizes for this step — no
`md:`/collapse/hamburger treatment. Rationale: this is explicitly "Step 1 —
navigation shell only," the issue states responsive collapse is "not
blocking," and a correct collapse/toggle treatment (state management, a
trigger control, focus handling, its own test coverage) is a
non-trivial enough addition that bundling it into this fast-tracked step
risked scope creep without corresponding user ask. **Known gap**: on narrow
viewports the fixed-width Sidebar will consume proportionally more of the
screen and the content column will not reflow around it — a reasonable
follow-up step, not addressed here.

## Existing page-level spec collision audit

12 files import `AppShell`. Audited all of them (all `AppShell`-rendering
page specs in `frontend/tests/unit/`) against what `Sidebar` now always
additionally renders on every page:

| File | Needed a fix? | Why / why not |
|---|---|---|
| `LandingPage.spec.tsx` | **Yes** | See below — genuine query collisions + tests for now-removed page content. |
| `NewLeadPage.spec.tsx` | No | Only queries `getByRole('heading', { name: /new lead/i })`; Sidebar's "New Lead" is a `link`, different role — no collision. |
| `NewEnquiryPage.spec.tsx` | No | Queries `getByText('Queue Check Enquiry')` / `getByText('Direct Entry')` — text not present in Sidebar. No heading/link query on "New Enquiry" in this file. |
| `LogFollowupPage.spec.tsx` | No | Queries scoped to form labels/buttons/timeline text; no overlap with Sidebar's link labels. |
| `UpcomingFollowupsPage.spec.tsx` | No | `getByRole('heading', ...)` for the page title (Sidebar's equivalent is a `link`); `getByRole('link', { name: /back to dashboard/i })` doesn't match Sidebar's plain "Dashboard" link (different accessible name). |
| `BookTestDrivePage.spec.tsx` | No | Same pattern — `heading`/`form` roles, not `link`. |
| `UpcomingTestDrivesPage.spec.tsx` | No | Same pattern. |
| `TestDriveSchedulerPage.spec.tsx` | No | Same pattern (`heading`, `button`, `table` roles). |
| `LeadDetailPage.spec.tsx` | No | Queries exact customer names/section headings; nothing overlaps Sidebar text. |
| `ConvertLeadPage.spec.tsx` | No | Same; the one `getByText('Dashboard')` assertion targets a `<div>Dashboard</div>` placeholder the spec's own local `<Route path="/">` renders — not through `AppShell`/`Sidebar` at all. |
| `FieldConfigPage.tsx` | N/A | No dedicated page-level spec exists in this codebase (only `FieldConfigForm.spec.tsx`, which renders the form directly, not the page/`AppShell`) — nothing to fix. |

**Net result: only 1 of 11 existing page-level spec files needed collision
fixes — `LandingPage.spec.tsx`.** This makes sense: every other page queries
its own heading via `getByRole('heading', ...)`, and Sidebar's equivalent
entries are `link`s (a different role), so `getByRole` naturally
disambiguates. `LandingPage` was the one page whose own quick-action
controls are themselves `link`s with the *same* accessible name as their
Sidebar counterparts (`New Enquiry`), which is where role-based
disambiguation stops helping.

### `LandingPage.spec.tsx` fixes

1. **Removed** 6 tests for content AC4 explicitly retires from
   `LandingPage` itself: the 2 badge tests for "My Upcoming Follow-ups", the
   2 badge tests for "My Upcoming Test Drives", "shows the Book a Test
   Drive entry point", and "shows the Test Drive Scheduler entry point".
   Also removed the now-unused `getUpcomingFollowups`/`getUpcomingTestDrives`
   mocks (the component no longer calls them — the badge counts left with
   the removed links).
2. **Added** one new test asserting, scoped to `within(screen.getByRole('main'))`,
   that the 5 trimmed links are absent from `LandingPage`'s own content,
   while separately confirming (via an unscoped query) that the same routes
   remain reachable through the Sidebar — proving this is a page-level trim,
   not a functional regression.
3. **Fixed a genuine collision**: `Sidebar`'s "New Enquiry" link points at
   the same `/enquiries/new` route with the identical accessible name as
   `LandingPage`'s own quick-action link. An unscoped
   `screen.findByRole('link', { name: /new enquiry/i })` now matches *two*
   elements once `Sidebar` is always-rendered, which `findByRole` throws on
   ("multiple elements found"). Fixed by scoping both the "shows/hides the
   New Enquiry entry point" tests to `within(main)`. The "hides" test
   additionally now asserts the Sidebar's own (always-present, non-toggle-
   aware) "New Enquiry" link still exists — documenting that the feature
   toggle only ever gated `LandingPage`'s own copy, never the Sidebar's,
   which is correct per issue #126's minimal-shell scope (the Sidebar isn't
   toggle-aware).

No other component-level specs (`NewLeadForm.spec.tsx`, `LeadQueue.spec.tsx`,
etc.) render through `AppShell` — they mount components directly — so they
were unaffected and not modified.

## Test results

- New: `Sidebar.spec.tsx` — 6/6 passed.
- Regression: full frontend Vitest suite — **31 test files, 217 tests, all
  passed** (`npx vitest run`, no filters).
- Typecheck: `npx tsc -b --force` (forced, non-incremental) — no errors.
- `git status` confirms only frontend files touched: `Sidebar.tsx` (new),
  `Sidebar.spec.tsx` (new), `AppShell.tsx`, `LandingPage.tsx`,
  `LandingPage.spec.tsx` (modified). No `backend/` files touched.

## Known gaps / follow-ups

- Responsive/collapse behavior for narrow viewports — deferred (see above).
- `FieldConfigPage.tsx` has no dedicated page-level spec in this codebase
  (pre-existing gap, not introduced by this change) — not addressed here,
  out of scope.
- Content reorganization (e.g. does the Leads table move off the Dashboard
  onto a dedicated page under a sidebar link?) is explicitly out of scope
  per the issue ("Step 1 — navigation shell only... deferred to a
  follow-up step").
- Sidebar's nav-group labels ("Lead Management", etc.) are rendered as plain
  text (not `<h2>`/heading role) — a deliberate choice both to avoid
  incidental collisions with existing page section headings elsewhere in the
  app, and because they're presentational group labels within a single
  `nav` landmark rather than independent page sections.
