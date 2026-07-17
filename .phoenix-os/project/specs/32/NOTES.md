# Issue #32 — Role-Scoped Follow-up History Timeline

Fast-track implementation notes (no separate spec.md/tech-design.md for this Story — see the issue body for the full brief). TDD approach: Inside-Out (DESIGN -> RED -> GREEN), mirroring #30/#31's existing test structure exactly.

## What was built

### Backend

- **Migration `1700000000012-AddResultingStatusToFollowups.ts`** — adds nullable `followups.resulting_status varchar`. Registered in `backend/src/data-source.ts`.
- **`FollowupEntity.resultingStatus`** (nullable) — persists the terminal Enquiry status (`Lost`/`Booked`) a given Follow-up entry applied, if any.
- **`FollowupsService.logFollowup`** now stores `dto.enquiryStatus ?? null` onto `resultingStatus` at insert time, in the same transaction as before — no new side-effect logic, just persisting a value that was already being validated/applied to `Enquiry.status`.
- **`FollowupResponseDto.resultingStatus`** / `followups.mapper.ts` — surfaced in the API response and consumed by the frontend timeline.
- **Role constants** (`backend/src/common/principal.ts`): `ROLE_DSE`, `ROLE_TL`, `ROLE_SM_GM` (`'SM-GM'`, not `'SM/GM'` — avoids a literal slash in a plain string value), `ROLE_SYSTEM_ADMINISTRATOR`. No role-constant file existed anywhere in this codebase before this Story.
- **`EnquiriesRepository.findVisibleById`** — the new role-aware **read**-eligibility check. `findOwnedById` (the pre-existing DSE-owner-only lookup) is left completely untouched and still gates the **write** path (`FollowupsService.logFollowup`, unchanged from #30/#31).
- **`FollowupsService.findByEnquiry`** now calls a new private `assertEnquiryVisibleToActor` (backed by `findVisibleById`) instead of the owner-only `assertEnquiryOwnedByActor`. `logFollowup`'s eligibility check is untouched.
- **`FollowupsRepository.findByEnquiry`** — role-branches its tenant-scope filter: SM/GM drops the `locationId` filter (dealer-group-scoped only, since their visibility spans every location under the group); DSE/TL keep the original `locationId + dealerGroupId` filter (a no-op for them, since `findVisibleById` already proved eligibility using their own `locationId`).
- **Test-only TL/SM-GM users** added to `backend/src/seeds/test-seed.ts` (`tlLoc1`, `tlLoc2`, `smgmGroup1`, `smgmGroup2`), mirroring the `SeedAdminUser`/`adminUser` precedent exactly. The frozen `.phoenix-os/project/specs/24/tests/fixtures/test-users.json` was **not** touched.

### Frontend

- **`Followup.resultingStatus`** added to `frontend/src/api/client.ts`.
- **New `FollowupHistoryTimeline` component** (`frontend/src/components/FollowupHistoryTimeline.tsx`) — renders the chronological history (type, remarks, next follow-up date, status-change pill) for one Enquiry via the existing `useFollowups`/`GET /api/v1/enquiries/:enquiryId/follow-ups`. No role branching client-side — it renders whatever the (already role-scoped) API returns.
- **`LogFollowupPage.tsx`** now renders `FollowupHistoryTimeline` below the existing `LogFollowupForm`, reusing the same `enquiryId` route param — the natural "Enquiry detail surface" per the issue brief, rather than a new page.

## Design decision: location/dealer-group as team/org proxy

No team-hierarchy table (`team_id`, `reports_to`, `manager_id`, etc.) exists anywhere in this codebase, and building one is out of scope for this Story (BRD FR-25 implies a dedicated team-management capability that doesn't exist yet). This Story uses the existing tenant primitives as a **pragmatic, explicit proxy**, exactly as suggested by the issue brief:

| Role | Scope | Rationale |
|---|---|---|
| DSE | `ownerId = actor.userId` (+ own `locationId`/`dealerGroupId`) | Unchanged from #30/#31. |
| TL | same `locationId` (+ own `dealerGroupId`, defense-in-depth) | A physical dealership location's DSEs stand in for "a TL's team" — mirrors #29 duplicate-detection's same-location peer-visibility precedent. |
| SM/GM | same `dealerGroupId` only (no `locationId` filter) | Spans every location under that dealer group — the broader org unit above location. |

This is a deliberate simplification pending a real team-hierarchy Feature (BRD FR-25/FR-29/FR-33 — TL/DSE team mapping, cross-team reassignment). When that Feature ships, `findVisibleById`/`findByEnquiry` are the two call sites to revisit.

## Design decision: write path unchanged (DSE-owner-only)

`FollowupsService.logFollowup`'s eligibility check (`assertEnquiryOwnedByActor` / `findOwnedById`) is **untouched**. This Story's ACs (1-6) are explicitly about **viewing** history (FR-10); widening who may **log** a Follow-up is BRD FR-28 ("TL shall be able to record a follow-up directly on a DSE's enquiry"), a separate future Story. Only `findByEnquiry` (the GET/read path) was made role-aware, via a new, separate `assertEnquiryVisibleToActor` / `findVisibleById` pair, so this Story cannot accidentally widen write permissions as a side effect.

## Design decision: `resulting_status` column

Issue #31 added `LogFollowupDto.enquiryStatus` and applied it to `Enquiry.status` (+ an `ENQUIRY_STATUS_UPDATED` audit_log row), but never persisted the value onto the Follow-up row itself — so a Follow-up entry had no way to show "this is the entry that changed status to Lost/Booked" when listed later (AC2's "any status change"). Fixed with a purely additive nullable column (`resulting_status`), populated in the same transaction as the Follow-up insert, no new validation/logic beyond storing a value already being validated/applied by #31's existing code.

## Capability gating (RBAC) note

`FollowupsController.findByEnquiry` (GET) still requires the `create-lead` capability, reusing #30's existing RBAC decision rather than introducing a new capability — the new TL/SM-GM test users are granted `create-lead` for this reason. This keeps the RBAC surface minimal, consistent with #30/#31's own precedent (see `followups.controller.ts`'s docblock). A future Story that gives TL/SM-GM their own dashboard/capability set may want to revisit this.

## Known gap: TL/SM-GM frontend browsing

There is no team-wide or org-wide Enquiry list/browse UI anywhere in this codebase yet (a separate future TL/SM-GM dashboard Feature per the BRD, not this Story). This Story implements and fully tests TL/SM-GM access at the **backend/API level** (AC3-AC6's actual requirement), while the **frontend** surface for a TL/SM-GM to browse to an arbitrary Enquiry they don't own (to reach `LogFollowupPage`'s route and see the timeline) remains a known, deliberately out-of-scope gap. A TL/SM-GM who already has an Enquiry's ID (e.g. shared via another channel) can navigate directly to `/enquiries/:enquiryId/follow-up` and will see the correctly role-scoped timeline — only the "how do they discover that ID" browsing UI is missing.

## Test results

### Backend (Jest) — full regression

```
Test Suites: 32 passed, 32 total
Tests:       362 passed, 362 total
```

New/changed coverage for this Story:
- `backend/test/integration/followups-migration.spec.ts` — `resulting_status` column up/down migration (4 new tests).
- `backend/test/integration/followups.service.spec.ts` — `resultingStatus` persistence (4 new tests) + full role-scoping matrix via `FollowupsService.findByEnquiry` (8 new tests: DSE-owns / DSE-other-owner-same-location / TL-same-location / TL-other-location / SM-GM-same-group-other-location / SM-GM-other-group / DSE-cross-tenant / newest-first-order-for-SMGM).
- `backend/test/integration/followups.controller.spec.ts` — `resultingStatus` in POST/GET responses (2 new tests) + the same role-scoping matrix through the real HTTP/guard pipeline (7 new tests).
- `backend/test/integration/enquiries.repository.spec.ts` — `EnquiriesRepository.findVisibleById` unit coverage (7 new tests).
- Five pre-existing migration-reversibility specs (`migration.spec.ts`, `direct-enquiry-migration.spec.ts`, `owner-updated-at-migration.spec.ts`, `field-config-migration.spec.ts`, `next-follow-up-at-migration.spec.ts`) needed one additional `undoLastMigration()` call each to account for the new migration #12 sitting on top — fixed as part of this Story's regression pass, no behavior change.

### Frontend (Vitest) — full regression

```
Test Files: 17 passed (17)
Tests:      106 passed (106)
```

New coverage: `frontend/tests/unit/FollowupHistoryTimeline.spec.tsx` (6 tests) + 2 new tests in `LogFollowupPage.spec.tsx` (timeline renders on the page; empty-history state). Existing Follow-up-related spec files (`LogFollowupForm`, `UpcomingFollowupsList`, `LogFollowupPage`) updated only to add the new required `resultingStatus` field to their mocked `Followup` fixtures.

## Files touched

Backend:
- `backend/src/migrations/1700000000012-AddResultingStatusToFollowups.ts` (new)
- `backend/src/data-source.ts`
- `backend/src/common/principal.ts`
- `backend/src/followups/entities/followup.entity.ts`
- `backend/src/followups/dto/followup-response.dto.ts`
- `backend/src/followups/followups.mapper.ts`
- `backend/src/followups/followups.service.ts`
- `backend/src/followups/followups.repository.ts`
- `backend/src/enquiries/enquiries.repository.ts`
- `backend/src/seeds/test-seed.ts`
- `backend/test/integration/followups-migration.spec.ts`
- `backend/test/integration/followups.service.spec.ts`
- `backend/test/integration/followups.controller.spec.ts`
- `backend/test/integration/enquiries.repository.spec.ts`
- `backend/test/integration/migration.spec.ts`
- `backend/test/integration/direct-enquiry-migration.spec.ts`
- `backend/test/integration/owner-updated-at-migration.spec.ts`
- `backend/test/integration/field-config-migration.spec.ts`
- `backend/test/integration/next-follow-up-at-migration.spec.ts`

Frontend:
- `frontend/src/api/client.ts`
- `frontend/src/components/FollowupHistoryTimeline.tsx` (new)
- `frontend/src/pages/LogFollowupPage.tsx`
- `frontend/tests/unit/FollowupHistoryTimeline.spec.tsx` (new)
- `frontend/tests/unit/LogFollowupPage.spec.tsx`
- `frontend/tests/unit/LogFollowupForm.spec.tsx`
- `frontend/tests/unit/UpcomingFollowupsList.spec.tsx`

## Not touched

Frozen specs under `.phoenix-os/project/specs/{24,25,26,27,28,29,30,31}/` and the frozen fixture `.phoenix-os/project/specs/24/tests/fixtures/test-users.json` — untouched, per instructions.
