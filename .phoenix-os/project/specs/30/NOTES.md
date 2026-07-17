# Issue #30 — Log a Follow-up with Type and Outcome Remarks

Fast-track implementation (no separate spec.md/tech-design.md/todo.md for this Story — direct TDD implementation using the existing codebase as the pattern reference, per orchestrator instruction). This document records the design decisions, test results, and known gaps.

## What was built

**Backend** (`backend/src/followups/`, first module for Feature #8, Follow-up management):
- `entities/followup.entity.ts` — `FollowupEntity`, `FOLLOWUP_TYPES` constant
- `dto/log-followup.dto.ts`, `dto/followup-response.dto.ts`
- `followups.repository.ts`, `followups.service.ts`, `followups.controller.ts`
- `followups.errors.ts`, `followups.filters.ts`
- `backend/src/migrations/1700000000010-CreateFollowups.ts` (new `followups` table)
- `backend/src/enquiries/enquiries.repository.ts` — added `findOwnedById` (new method, mirrors `LeadsRepository.findOwnedById`)
- Wired into `data-source.ts`, `app.module.ts`, `app.factory.ts`

Routes: `POST /api/v1/enquiries/:enquiryId/follow-ups` (AC1-AC5), `GET /api/v1/enquiries/:enquiryId/follow-ups` (see "GET endpoint" below).

**Frontend**:
- `frontend/src/components/LogFollowupForm.tsx`, `frontend/src/pages/LogFollowupPage.tsx`
- `frontend/src/components/ui/Textarea.tsx` (new UI atom, mirrors `TextInput`)
- `frontend/src/hooks/useFollowups.ts`
- `frontend/src/api/client.ts` — `LogFollowupInput`/`Followup` types, `logFollowup`/`getFollowups` methods
- `frontend/src/App.tsx` — new route `/enquiries/:enquiryId/follow-up`
- `frontend/src/components/EnquiryQueue.tsx` — new "Actions" column with a "Log Follow-up" link per row

## Design decisions

### Schema (`followups` table, migration 1700000000010)

- `followup_id` (uuid PK), `enquiry_id` (uuid FK -> enquiries, NOT NULL), `type` (varchar, NOT NULL, IN-list CHECK), `remarks` (text, NOT NULL), `logged_by` (uuid FK -> users, NOT NULL), `location_id`/`dealer_group_id` (uuid FK, NOT NULL), `logged_at` (timestamptz, default now()).
- **`logged_by` not `owner_id`**: mirrors `leads.created_by`/`enquiries.converted_by` — an immutable "who performed this action" audit column. A Follow-up log entry is never reassigned, so there is no `owner_id`/`owner_updated_at` pair (unlike `leads`/`enquiries`).
- **`location_id`/`dealer_group_id` duplicated onto the row** (not reached only via a join through `enquiry_id`): mirrors the `enquiries` table's own precedent (it duplicates tenant fields even though technically reachable via `leads` for `CONVERTED` rows). Keeps the row self-sufficient for a tenant-scoped choke-point query and gives #32 ("role-scoped follow-up history timeline") an index-friendly column to filter/sort on without a join.
- **`type` is a plain `varchar` + IN-list CHECK, not a Postgres ENUM type**: a future Story adding a new follow-up type value only needs a CHECK-constraint migration (`DROP`/`ADD CONSTRAINT`), not the more invasive `ALTER TYPE ... ADD VALUE`. The CHECK is an IN-list (not a regex), so — unlike the mobile-format CHECK in `CreateLeads1700000000002` — it does **not** need the `E2E_DB_DRIVER=pgmem` skip; pg-mem supports simple IN-list CHECK expressions, verified by `followups-migration.spec.ts`.
- **No `updated_at` column**: a Follow-up is an immutable, append-only log entry once created (mirrors `audit_log`'s single-timestamp convention, not the mutable `leads`/`enquiries` created+updated pair).
- **Deliberately NOT added this Story** (kept additive-friendly for later, per the parent issue's explicit instruction not to build #31/#32/#33 now): `next_follow_up_at` (#31, reminder scheduling) and `outcome_status` (#33, Enquiry status update). Both would be nullable additive columns, addable later exactly the way `1700000000009-AddOwnerUpdatedAt.ts` added a nullable column to two existing tables with no breaking change — nothing in this schema blocks that.
- Index: `idx_followups_enquiry_logged` on `(enquiry_id, logged_at)`, embedded in the `CREATE TABLE` (not a follow-up `createIndex()` call) — matches the pg-mem-compatible convention used by every prior migration in this repo.

### RBAC / capability

Reused the existing **`create-lead`** capability rather than introducing a new `log-followup` one. Considered both options (the parent issue explicitly floated either). Chose reuse because:
- It mirrors #26 (`DirectEnquiryController`) and #29 (`DuplicatesController`)'s explicit precedent and reasoning: a DSE who can create a Lead/Direct-Enquiry performs the same frontline data-capture role that logging a Follow-up against their own Enquiry continues.
- It requires **zero changes** to the frozen `.phoenix-os/project/specs/24/tests/fixtures/test-users.json` fixture. A dedicated `log-followup` capability would have forced a choice between (a) mutating the frozen fixture (not allowed) or (b) mutating the *generated* `test-seed.ts` array to add the capability onto `dseA`/`dseB`/`dseC` — but the Follow-up flow inherently needs the *same* Principal to both own the Enquiry and hold the capability (ownership is scope-checked), so a workaround would have needed either fixture surgery or a second bespoke test user wired into an ownership chain, adding risk for no behavioral benefit at this Story's scope.
- `noCapabilityUser` (already fixture-frozen with zero capabilities) continues to prove deny-by-default RBAC for this endpoint too, with no fixture change.

A dedicated `log-followup` capability remains a reasonable follow-up if a future Story needs to grant "can view/log follow-ups" independently of "can create leads/enquiries" (e.g. a role that only manages existing relationships).

### Feature flag

**No new feature flag was added** (e.g. no `LOG_FOLLOWUP_ENABLED`). Checked precedent: `NEW_LEAD_ENABLED`/`CONVERT_LEAD_ENABLED`/`DIRECT_ENQUIRY_ENABLED` were all introduced by the first three Stories (#24/#25/#26); the three most recent Stories (#27 field-config, #28 ownership/audit metadata, #29 duplicate detection) introduced **zero** new flags — `backend/src/config/feature-flags.service.ts` has been unchanged since #26. A Follow-up log is "always-on record keeping" (part of the core DSE workflow, not an experimental/optional entry point like a brand-new intake form), so it follows the #27-#29 precedent of no flag rather than the #24-#26 precedent of a flag per new top-level entry point.

### UI entry point

A DSE reaches `LogFollowupForm` via a dedicated route, `/enquiries/:enquiryId/follow-up` (`LogFollowupPage`), linked from a new "Log Follow-up" action in `EnquiryQueue`'s row-level "Actions" column. Considered:
- **Inline expansion under the queue row** (mirrors `LeadQueue`'s `ConvertLeadForm` pattern) — rejected because that pattern relies on `EnquiryQueue`/`LeadQueue` already being the natural "detail surface" for the parent record; a Follow-up form has more room to grow (remarks textarea) and #32's future timeline view will want its own dedicated space next to the log form, which a cramped inline panel doesn't leave room for.
- **A full Enquiry-detail page** — rejected as out of scope; none exists yet in this codebase, and the parent issue explicitly says not to build one for this Story.
- **A modal** — rejected; no modal/overlay component exists anywhere in this codebase yet, so building one would be new plumbing disproportionate to this Story's scope.
- **Dedicated route** (chosen) — matches the exact routing/component convention already used by `NewLeadPage`/`NewEnquiryPage` (`AppShell` + `Card` + form), with the least new plumbing, and leaves `/enquiries/:enquiryId/...` as a natural place for #32's future timeline to live alongside.

### GET endpoint

`GET /api/v1/enquiries/:enquiryId/follow-ups` was added alongside the `POST` (owner/tenant-scoped, same eligibility check) purely to prove AC5 ("associated with... the correct Enquiry") end-to-end in this Story's own backend test suite — it mirrors `DirectEnquiryController`'s `GET /api/v1/enquiries` precedent of pairing a create endpoint with a minimal list endpoint. It is **not** wired into any frontend UI in this Story (no list/timeline is rendered) — that is deliberately left for #32's "role-scoped follow-up history timeline," which will likely need different scoping semantics (e.g. team-wide, not just owner-scoped) than this simple owner/tenant-scoped read.

## Test results

**Backend (Jest)** — `npm test` (backend/):
- Full regression suite: **295/295 passing**, 31 suites.
- New in this Story: 45 tests across `test/unit/log-followup.dto.spec.ts`, `test/integration/followups-migration.spec.ts`, `test/integration/followups.service.spec.ts`, `test/integration/followups.controller.spec.ts`.
- Fixed 4 pre-existing frozen-adjacent migration tests whose `undoLastMigration()` call counts hard-coded the total migration count (`test/integration/migration.spec.ts` [×2 blocks], `direct-enquiry-migration.spec.ts`, `owner-updated-at-migration.spec.ts`, `field-config-migration.spec.ts`) — each needed one more `undoLastMigration()` call to account for the new `CreateFollowups1700000000010` migration now being the last one. This is the same established pattern each prior Story's migration already followed when a later Story added a migration after it (see e.g. `direct-enquiry-migration.spec.ts`'s own comment tracking #27/#28's additions before this Story).
- `npm run lint` — clean, 0 warnings. `tsc --noEmit` — clean.

**Frontend (Vitest)** — `npm test` (frontend/):
- Full regression suite: **83/83 passing**, 14 files.
- New in this Story: `LogFollowupForm.spec.tsx` (8 tests), `LogFollowupPage.spec.tsx` (2 tests), `EnquiryQueue.spec.tsx` (1 test, new file — none existed before), plus additions to `api-client.spec.ts` (4 tests).
- Fixed a regression in `NewEnquiryPage.spec.tsx`: `EnquiryQueue` now renders a react-router `<Link>` (the new "Log Follow-up" action), which threw outside a Router context — wrapped the render in `<MemoryRouter>`, mirroring `LandingPage.spec.tsx`'s existing pattern for the same reason.
- `npm run lint` — clean, 0 warnings. `tsc -b` — clean.

## Known gaps / follow-ups for future Stories

- No reminder scheduling (`next_follow_up_at`) — #31.
- No role-scoped history timeline UI — #32 (the backend `GET` endpoint here is intentionally minimal/owner-scoped, not the future timeline's likely team-wide scoping).
- No Enquiry-status-update side effect from logging a Follow-up — #33.
- No Playwright/E2E suite was written for this fast-tracked Story (mirrors this repo's other fast-tracked Stories, which rely on the backend Supertest + frontend Vitest suites as the primary regression net); if this Story graduates to the full Phoenix OS pipeline later, an eval-criteria.md / E2E pass would be a reasonable addition.
- `logged_by`/tenant fields are captured, but there is no UI surface yet showing "who logged this and when" back to the DSE after submission beyond the transient success message — deferred to #32's timeline.
