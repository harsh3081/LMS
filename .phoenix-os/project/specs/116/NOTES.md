# Issue #116 — Redesign Lead Management table and detail views

Fast-tracked implementation (no full Phoenix OS phase pipeline). TDD throughout,
mirroring this codebase's existing test structure (backend Jest integration
specs under `backend/test/integration/`, frontend Vitest specs under
`frontend/tests/unit/`).

## What was built

**Backend**
- `backend/src/leads/leads.service.ts` — new `EnrichedLead` type and a
  private `attachNames()` helper that denormalizes `sourceId`/`modelId`/
  `ownerId` into `sourceName`/`modelName`/`ownerName`. `findOwnQueue` and the
  new `findOwnedById` both route through it.
- `backend/src/leads/leads.controller.ts` — new `GET /api/v1/leads/:leadId`
  route (`findOne`); `toResponse` now accepts either a plain `LeadEntity`
  (create path) or an `EnrichedLead` (list/detail paths).
- `backend/src/leads/dto/lead-response.dto.ts` — added `sourceName`/
  `modelName`/`ownerName` as optional (`?:`) fields.
- New tests: `backend/test/integration/leads-queue-names.controller.spec.ts`,
  `backend/test/integration/lead-detail.controller.spec.ts`.

**Frontend**
- `frontend/src/api/client.ts` — `Lead` interface gained the 3 optional
  name fields; added `api.getLead(leadId)`.
- `frontend/src/hooks/useLeads.ts` — added `useLead(leadId)`.
- `frontend/src/components/LeadQueue.tsx` — redesigned into the requested
  8-column table (Name, Mobile, Model of Interest, Source, Assigned To,
  Status, Action, View), skeleton loading rows, an explicit empty state,
  row truncation with a `title` tooltip, and a "View" link per row.
  "Convert to Enquiry" behavior under Action is unchanged.
- `frontend/src/pages/LeadDetailPage.tsx` (new) — renders a Lead's full
  detail as 6 read-only section cards, a header with name + `StatusPill`,
  a "Back to Leads" link, and loading/404/error states.
- `frontend/src/components/ui/DetailField.tsx` (new primitive) — a
  read-only label/value pair; no equivalent existed in `ui/` before this.
- `frontend/src/App.tsx` — new route `/leads/:leadId` → `LeadDetailPage`.
- New/updated tests: `LeadQueue.spec.tsx` (extended), `LeadDetailPage.spec.tsx`
  (new), `useLeads.spec.tsx` (new), `NewLeadPage.spec.tsx` (wrapped in
  `MemoryRouter` — required now that `LeadQueue` renders a `Link`).

## Denormalization approach and query strategy (avoiding N+1)

`LeadsService.attachNames(leads: LeadEntity[])` collects the **distinct**
`sourceId`/`modelId`/`ownerId` values across the whole batch, then issues at
most 3 queries total — one `IN (...)` lookup each against `lead_sources`,
`vehicle_models`, `users` — regardless of how many Leads are in the list.
Results are folded into `Map`s and merged back onto each Lead. This scales
as O(1) queries per request rather than O(n) per row. Verified directly in
`leads-queue-names.controller.spec.ts` by spying on each master-table
repository's `.find()` and asserting exactly one call each after creating 5+
Leads with varying source/model combinations.

The **CREATE** response (`POST /api/v1/leads`) deliberately does **not**
route through `attachNames` — its `toResponse` overload accepts a plain
`LeadEntity` and the 3 name fields come through as `undefined` (omitted from
the JSON body), per the issue's explicit guidance: a human-read LIST/DETAIL
view benefits from denormalized names, but a client that just submitted
`sourceId`/`modelId` itself doesn't need the round-trip, mirroring #34/#114's
precedent of keeping the create response minimal.

## Detail endpoint scoping decision

`GET /api/v1/leads/:leadId` reuses the exact owner+tenant eligibility pattern
already established by `EnquiriesRepository.findOwnedById` /
`FollowupsService.assertEnquiryOwnedByActor`: the caller must match
`ownerId` + `locationId` + `dealerGroupId` exactly (via the pre-existing
`LeadsRepository.findOwnedById`, which this Story did not need to touch — it
already had the right shape). A Lead that exists but is out of scope is
**indistinguishable from a non-existent Lead** — both 404, never 403 or a
partial/redacted body — no cross-tenant/cross-owner leakage.

For the error itself, rather than adding a new near-duplicate error class +
exception filter, the service throws the existing `LeadNotFoundError` from
`backend/src/enquiries/enquiries.errors.ts`, whose semantics ("not found, or
out of scope, indistinguishable from non-existent") already match exactly,
and whose filter (`EnquiryEligibilityExceptionFilter`) is already registered
globally in `app.factory.ts`. This is a judgment call: it couples
`leads.service.ts` to an error type defined in the `enquiries` module, but
avoids duplicating a class + filter pair for identical semantics. If the
`enquiries` module is ever split out, this error should move to a shared
location.

## Visual/layout choices for "professional"

- **Table**: kept the existing `Table`/`TableHeaderCell`/`TableCell`
  primitives (zebra/hover already built in) — added column-appropriate
  truncation (`max-w-[14rem] truncate` + `title` tooltip) on the Name column
  only, since it's the one free-text field long enough to overflow.
- **Loading**: no skeleton-row precedent existed anywhere in this codebase
  (checked `EnquiryQueue`, `FollowupHistoryTimeline`, `UpcomingFollowupsList`
  — all use a plain "Loading…" string). Built a small, deliberately minimal
  skeleton (5 pulsing rows matching the real column count) rather than
  reusing the plain-text convention, since the issue explicitly asked for
  more than the bare minimum here.
- **Empty state**: "No leads yet — create one to get started." as a single
  full-width row, rather than collapsing the table away entirely, so the
  column headers stay visible.
- **Detail page**: 6 `Card`-based sections mirroring issue #114's New Lead
  form groupings (Customer Details / Vehicle Interest / Exchange Vehicle /
  Finance / Source & Assignment / Follow-up & Consent) rather than a flat
  list of 25+ fields. Currency fields render with a `₹` prefix and
  `toLocaleString('en-IN')` grouping; booleans render as Yes/No/"Not
  provided" (tri-state, since e.g. `exchangeInterest` is nullable and null
  is semantically distinct from `false`); every other null/unset field
  renders "Not provided" rather than blank or literal `null`.
- Reused the existing `AppShell` + `Card` + `buttonStyles` conventions
  throughout (matches `NewLeadPage`/`FieldConfigPage`) — no new one-off
  layout system introduced.

## Judgment calls

- `sourceName`/`modelName`/`ownerName` made **optional** (`?:`) on both the
  backend DTO and frontend `Lead` interface, rather than always-present
  `string | null`, specifically so the CREATE response can omit them
  cleanly (`undefined`, not a misleading `null` that could read as "lookup
  found nothing" for an id the caller just supplied).
- The two new backend test files intentionally use the seeded `admin` user
  to relax `sourceId`/`modelId` mandatory-ness (field-config, issue #27)
  for their "null source/model" scenarios — those two fields default to
  mandatory=true, so a minimal Lead can't otherwise be created to exercise
  the null-name path.
- No migration was needed — this Story adds no new columns, only new
  computed/joined response fields.

## Test results

- Backend: `npx jest --runInBand` — **44 suites / 578 tests, all passing**
  (2 new suites, 26 new tests). `npx tsc --noEmit -p tsconfig.json` — clean.
- Frontend: `npx vitest run` — **28 files / 192 tests, all passing** (2 new
  files, ~18 new tests; `LeadQueue.spec.tsx` extended in place).
  `npx tsc -b --force` (forced, not incremental cache) — clean.

## Known gaps

- The "no N+1" backend test asserts exactly one `.find()` call per master
  repository for a single request; it does not assert on total SQL
  round-trips at the pg-mem/Postgres wire level (no such harness exists in
  this codebase yet).
- `ownerName` can only be null if the owning `users` row was deleted after
  the fact (no FK cascade exists) — not reachable through any current
  code path, so not exercised by a test.
- No pagination/sorting/filtering was added to the Lead list or detail
  views — out of scope per the issue (visual redesign + missing fields
  only).
