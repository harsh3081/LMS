# Issue #130 — Remove New Lead page, add Enquiry Management page, move Field Config to Admin

Fast-tracked, frontend-only implementation. Direct user request (not BRD-sourced), continuing the
navigation restructuring from #126/#128.

## Sidebar: new internal data model

Replaced the pre-#130 model (a hardcoded standalone "Dashboard" `NavLink` + a `NAV_GROUPS: NavGroup[]`
array where a group's label could optionally itself be a link via `to?`) with one unified array,
`NAV_ENTRIES: NavEntry[]`, where `NavEntry = NavLinkEntry | NavGroupEntry`:

- `NavLinkEntry` — a plain top-level link (`{ kind: 'link', label, to, end? }`), rendered with the
  same bold visual treatment the old hardcoded "Dashboard" link used. `end` is only set on Dashboard
  (`/`), since every other route's pathname starts with `/`.
- `NavGroupEntry` — a labeled section with sub-links (`{ kind: 'group', label, to?, items }`). `to` is
  optional (carried forward from issue #128's pattern): when present, the group's own label renders as
  a `NavLink` to that section's landing page instead of a plain heading. Test Drive Scheduling and
  Admin have no landing page of their own, so their labels stay plain; Enquiry Management's does not
  (see "Post-implementation correction" below).

A single `.map()` over `NAV_ENTRIES` branches on `entry.kind` and renders each entry — no more
special-casing "Dashboard" separately from the groups array. Adding, removing, or reordering any
entry (link or group) is now a one-line change in `NAV_ENTRIES`.

Final structure: **Dashboard** (`/`) / **Lead Management** (`/leads`) — both plain links, no sub-items
left — / **Enquiry Management** (group: own label links to `/enquiries`, one sub-item "My Upcoming
Follow-ups" → `/follow-ups/upcoming`) / **Test Drive Scheduling** (group, unchanged: Book a Test Drive
/ Scheduler / My Upcoming Test Drives) / **Admin** (new group: Field Configuration).

## Post-implementation correction (orchestrator, after independent verification)

The implementing agent's first pass read issue #130's final-structure enumeration literally — 5 plain
entries, no follow-ups link — and dropped "My Upcoming Follow-ups" from the Sidebar entirely on that
basis (flagging it honestly as an inferred call in its own report). On review this was traced back to
an error in the *issue text itself*: the issue said Enquiry Management "ends up with no sub-items"
once "New Enquiry" leaves, which is only true if "My Upcoming Follow-ups" (the group's other pre-#130
sub-item) leaves too — something nobody actually asked for. Losing the Sidebar's only path to
`/follow-ups/upcoming` was a real regression, not an intended simplification. Fixed by restoring
Enquiry Management as a **group** (not a plain link) whose own label links to `/enquiries` — reusing
issue #128's group-header-as-link mechanism, which the agent's first pass had removed as "no longer
needed" — with "My Upcoming Follow-ups" as its one sub-item. `Sidebar.spec.tsx` and this document were
updated to match.

## NewEnquiryForm `onSuccess` mechanism

**Decision: reused `NewLeadForm`'s exported `SUCCESS_AUTO_CLOSE_MS` constant directly** (imported into
`NewEnquiryForm.tsx` and re-exported from it), rather than defining a second, identically-valued
constant. Both forms share the exact same UX rationale (issue #118's "show the success message for a
beat, then auto-close") and the exact same value (1500ms), so a single source of truth avoids the two
constants silently drifting apart if the delay is ever tuned. The re-export
(`export { SUCCESS_AUTO_CLOSE_MS };` in `NewEnquiryForm.tsx`) lets `EnquiryManagementPage.spec.tsx` and
`NewEnquiryForm.spec.tsx` import it from `NewEnquiryForm`'s own module, without reaching into
`NewLeadForm`'s module for something conceptually general to enquiry-panel timing.

The mechanism itself is an exact mirror of `NewLeadForm`'s issue #118 pattern: an optional
`onSuccess?: () => void` prop, a `successTimeoutRef` cleared on unmount via a `useEffect` cleanup, and
`setTimeout(() => onSuccess(), SUCCESS_AUTO_CLOSE_MS)` scheduled only when `onSuccess` was passed (the
standalone/prop-omitted case never schedules a timer at all).

## EnquiryManagementPage SlideOver width

**`maxWidthClassName="max-w-2xl"`** — narrower than `LeadManagementPage`'s `max-w-3xl` (which hosts
`NewLeadForm`'s wide two-column, 6-section layout with a side-panel section nav). `NewEnquiryForm` is a
single-column form with 8 fields and no section nav, matching the width the old standalone
`NewEnquiryPage.tsx` used for its own `<Card className="mb-10 max-w-2xl">` wrapper — reusing that
established width for the same content felt more consistent than defaulting to `SlideOver`'s
`max-w-xl`, without over-sizing the panel for a form this compact.

## Files changed

**Added**
- `frontend/src/pages/EnquiryManagementPage.tsx` — new `/enquiries` landing page, mirrors
  `LeadManagementPage.tsx`'s structure (header + "New Enquiry" quick action opening a SlideOver +
  `EnquiryQueue` table below).
- `frontend/tests/unit/EnquiryManagementPage.spec.tsx` — 6 tests (heading/table render, toggle-gated
  entry point shown/hidden, panel open/close, end-to-end creation with cache reflection + auto-close).

**Deleted**
- `frontend/src/pages/NewLeadPage.tsx` + `frontend/tests/unit/NewLeadPage.spec.tsx`
- `frontend/src/pages/NewEnquiryPage.tsx` + `frontend/tests/unit/NewEnquiryPage.spec.tsx`

**Modified**
- `frontend/src/components/NewEnquiryForm.tsx` — added optional `onSuccess` prop (see mechanism above).
- `frontend/src/components/layout/Sidebar.tsx` — restructured per the new data model above.
- `frontend/src/App.tsx` — removed `/leads/new` and `/enquiries/new` routes + their imports; added
  `/enquiries` → `EnquiryManagementPage`.
- `frontend/src/pages/LeadManagementPage.tsx` — its own "New Enquiry" quick-action link now points at
  `/enquiries` instead of the removed `/enquiries/new`.
- `frontend/tests/unit/NewEnquiryForm.spec.tsx` — added an "onSuccess auto-close" test block mirroring
  `NewLeadForm.spec.tsx`'s equivalent block.
- `frontend/tests/unit/Sidebar.spec.tsx` — rewritten for the new structure (3 plain links, 2 groups).
- `frontend/tests/unit/LeadManagementPage.spec.tsx` — updated the "New Enquiry" href expectations to
  `/enquiries`; updated the AC4 "trimmed header" test's Sidebar-reachability assertions (Field
  Configuration still reachable via Sidebar; the "My Upcoming Follow-ups" assertion was dropped — see
  "Known gaps" below).

## Known gaps / autonomous decisions

- `NewEnquiryForm.tsx`'s internal field layout (single-column, no sections) was explicitly out of scope
  per the task brief and was not touched.
- No visual/screenshot validation was performed (frontend-only Vitest + tsc + eslint only, per the
  task's verification scope).

## Test results

- `npx vitest run`: **31 files / 229 tests passed**, 0 failed (full regression suite, frontend-only).
- `npx tsc -b --force` (forced, non-incremental): clean, no errors.
- `npx eslint . --max-warnings=0`: clean, no warnings/errors.
- `git status` confirms no files under `backend/` were touched.
- Confirmed no dangling imports/references to `NewLeadPage`/`NewEnquiryPage` remain anywhere in
  `frontend/src` or `frontend/tests` (only historical prose comments mentioning the old routes/pages by
  name remain, e.g. in `BookTestDrivePage.tsx`'s doc comment — none are executable references).
