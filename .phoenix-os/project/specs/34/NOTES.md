# Issue #34 — Book a Test Drive Slot

Fast-track implementation (no separate spec.md/tech-design.md/todo.md for this Story — direct TDD implementation against the authoritative pre-existing `.phoenix-os/project/specs/design/lms-1/tech-design.md`, per orchestrator instruction). This document records the design decisions, test results, and known gaps.

This is the **first Story of Epic #2 ("Test Drive Management")**. It builds the foundational `demo_vehicles`/`test_drives` schema and naive booking flow that six more Epic #2 Stories (#35 scheduler grid, #36 double-booking prevention, #37 data integrity, #38 auto-reminders, #39 outcome logging, #40 outcome reporting) will extend. Every deliberate omission below is scoped to one of those Stories, not an oversight.

## What was built

**Backend** (new `backend/src/demo-vehicles/` and `backend/src/test-drives/` modules):
- `backend/src/migrations/1700000000013-CreateTestDrives.ts` — creates `demo_vehicles` (location-scoped physical fleet master, uuid PK) and `test_drives` (uuid PK, FKs to `enquiries`/`demo_vehicles`/`users`, tenant-scoped, CHECK-constrained to `status IN ('Booked')`).
- `backend/src/migrations/1700000000014-SeedDemoVehicles.ts` — seeds 3 demo vehicles at the `SeedAdminUser1700000000008` location for a real-Postgres environment.
- `backend/src/demo-vehicles/entities/demo-vehicle.entity.ts`, `backend/src/demo-vehicles/demo-vehicles.controller.ts` — `GET /api/v1/demo-vehicles` (caller's own location's active fleet, for the booking-form dropdown).
- `backend/src/test-drives/entities/test-drive.entity.ts` — `TEST_DRIVE_STATUS_BOOKED` plus the anticipated (not-yet-legal-at-the-DB-layer) `TEST_DRIVE_STATUS_COMPLETED`/`NO_SHOW`/`CANCELLED` constants for #39.
- `backend/src/test-drives/dto/create-test-drive.dto.ts`, `dto/test-drive-response.dto.ts`, `test-drives.mapper.ts`, `test-drives.errors.ts`, `test-drives.filters.ts`, `test-drives.repository.ts`.
- `backend/src/test-drives/test-drives.service.ts` — `book()`: operating-hours validation → Enquiry ownership eligibility → vehicle existence → transactional insert + `audit_log` (`TEST_DRIVE_BOOKED`) write. `findUpcoming()` for AC5.
- `backend/src/test-drives/test-drives.controller.ts` (`POST /api/v1/test-drives`), `upcoming-test-drives.controller.ts` (`GET /api/v1/test-drives/upcoming`). Wired into `app.module.ts`/`app.factory.ts`/`data-source.ts`.
- `backend/src/seeds/test-seed.ts` — extended to seed 2 demo vehicles per distinct Jest-fixture location, exposed as `SeedResult.demoVehicleIdsByLocation`.

**Frontend**:
- `frontend/src/api/client.ts` — `DemoVehicle`, `CreateTestDriveInput`, `TestDrive` types; `api.getDemoVehicles()`, `api.bookTestDrive()`, `api.getUpcomingTestDrives()`.
- `frontend/src/hooks/useDemoVehicles.ts`, `frontend/src/hooks/useTestDrives.ts` (`useBookTestDrive`, `useUpcomingTestDrives`).
- `frontend/src/components/NewTestDriveForm.tsx`, `frontend/src/pages/BookTestDrivePage.tsx` (route `/test-drives/new`).
- `frontend/src/components/UpcomingTestDrivesList.tsx`, `frontend/src/pages/UpcomingTestDrivesPage.tsx` (route `/test-drives/upcoming`).
- `frontend/src/pages/LandingPage.tsx` — new "My Upcoming Test Drives" (badged) and "Book a Test Drive" entry points, alongside the existing Follow-up ones.

## Design decisions

### `demo_vehicles` schema — separate from `vehicle_models`, uuid PK, split seeding path

Per the orchestrator's brief and `vehicle-models/entities/vehicle-model.entity.ts`'s own anticipating comment, `demo_vehicles` is a NEW table, not a reuse of the abstract `vehicle_models` catalog: `vehicle_id` (uuid PK — operational, per-location fleet data, mirrors the leads/enquiries/followups convention, not `lead_sources`/`vehicle_models`'s small-static-catalog plain-int PK), `model_id` (FK to `vehicle_models`), `variant` (free text, mirrors `enquiries.variant`), `location_id` (NOT NULL), `is_active` (boolean — the issue explicitly says a richer availability-calendar concept is #35/#36's territory, so this Story keeps it to the simplest possible flag), `created_at`.

**Seeding is deliberately split across two paths**, because `demo_vehicles.location_id` is NOT NULL and a migration cannot FK against a location that doesn't exist yet:
- **Migration path** (`1700000000014-SeedDemoVehicles.ts`, real Postgres): seeds 3 vehicles at the location `SeedAdminUser1700000000008` already created (`33333333-...-000000000099`) — the only location any migration currently knows about. `ON CONFLICT (vehicle_id) DO NOTHING` on fixed UUIDs, mirroring `SeedMasterData1700000000004`'s idempotent pattern exactly.
- **Jest-fixture path** (`backend/src/seeds/test-seed.ts`): seeds 2 vehicles per distinct DSE-fixture location (loc1: dseA/dseB, loc2: dseC, etc.) at test-run time, since those location rows don't exist until `seedTestFixtures()` runs — well after migrations. This is generated test code (not a frozen fixture), analogous to how `test-seed.ts` already seeds its own `tlLoc1`/`smgmGroup1` test users beyond the frozen `test-users.json`.

### Operating-hours simplification (AC2) — hardcoded 09:00-19:00, evaluated in UTC

No configurable dealership-operating-hours feature/config exists anywhere in this codebase (verified). `TestDrivesService` hardcodes `OPERATING_HOURS_START_HOUR = 9` / `OPERATING_HOURS_END_HOUR = 19` and validates `slotStart`/`slotEnd` against it, plus a `slotEnd > slotStart` sanity check. Deliberately evaluated via `Date.getUTCHours()`, not the host machine's local timezone — "server local time" is non-deterministic across dev machines/CI runners (this was caught directly: the implementation sandbox itself runs in a non-UTC offset, and using `getHours()` made the operating-hours tests flaky/environment-dependent). UTC is used as the one fixed, deterministic stand-in for "the dealership's local time," matching the `Z`-suffixed ISO datetimes the client always sends. A real dealership-hours config feature would resolve this against the dealership's own configured timezone instead — flagged clearly in the service file's own comment.

### Booking is against an existing Enquiry, DSE-owner-scoped only (no #32 role-scoping)

Mirrors `FollowupsService.assertEnquiryOwnedByActor`/`EnquiriesRepository.findOwnedById` exactly: a DSE may only book a Test Drive against an Enquiry they own within their own tenant (indistinguishable from non-existent otherwise — no cross-tenant/cross-owner leakage). This Story deliberately does NOT build #32's TL/SM-GM role-scoped visibility — that pattern exists only for Follow-up *viewing*, not for this Story's booking action.

### Response shape — no server-side denormalization/confirmation-number scheme

AC3 ("confirmation is displayed with booking reference details") is satisfied by returning the created `TestDriveResponseDto` record as-is (`testDriveId` + `enquiryId`/`vehicleId`/`slotStart`/`slotEnd`/`status`) — no joined vehicle-model-name/customer-name fields, no separate confirmation-number scheme. The client already has the customer/vehicle details it selected on the form (it built the request), so no server-side join was needed to render a friendly confirmation. Mirrors `EnquiryResponseDto`'s flat-field convention.

### Frontend slot capture — single start DATE + single start TIME, fixed 30-minute duration, entered as UTC directly

The parent issue left "date, time slot (start/end, or a single start time + fixed duration)" as an explicit judgment call. Chose a single date input + single time input with a fixed 30-minute duration computed client-side (`NewTestDriveForm.tsx`) — simpler than two time pickers for this Story's scope; a richer slot-picker UI is #35's ("scheduler grid") territory. The entered date+time is combined into an explicit `Z`-suffixed ISO string (`${date}T${time}:00.000Z`) rather than run through the browser's local-timezone `Date` parsing, so the hours the DSE sees on the form line up 1:1 with the hours the server validates against (both treat the wall-clock value as UTC) — this also keeps the Vitest suite deterministic regardless of the test runner's local TZ.

### RBAC — reuses `create-lead`, no new capability

Mirrors `FollowupsController`'s/`DirectEnquiryController`'s/`DuplicatesController`'s established precedent: a DSE who can create a Lead/Direct-Enquiry/Follow-up performs the same frontline data-capture role that booking a Test Drive against their own Enquiry continues. No new capability introduced; the frozen #24 test-user fixtures (dseA/dseB/dseC) already carry `create-lead` and can book test drives out of the box.

### Deliberate scope boundary with #36 — no double-booking/overlap detection

Per the orchestrator's brief and mirroring how issue #29 deliberately deferred duplicate detection out of #24/#25's initial create flows: `TestDrivesService.book()` performs **no** uniqueness/overlap check on `(vehicle_id, slot_start, slot_end)` beyond DTO-level required-field validation. Two Enquiries can book the exact same vehicle for the exact same slot today — proven explicitly by a regression test (`test-drives.service.spec.ts`, "accepts two overlapping bookings for the same vehicle naively"). Issue #36 ("Prevent Double-Booking of Demo Vehicles") owns this entire concern: transactional conflict detection (`SELECT ... FOR UPDATE`/unique-constraint per ADR-002), helpful error messages, nearest-open-slot suggestions, and freeing slots on cancel/reschedule. The `idx_test_drives_vehicle_slot` index was added now specifically so #36 has an efficient starting point for its own conflict query, without pre-building the conflict logic itself.

### Status vocabulary anticipating #39

`test_drives.status` defaults to `'Booked'` and carries a DB CHECK constraint scoped to **only** `'Booked'` for now (mirrors `followups.type`'s IN-list CHECK precedent) — this Story never writes any other status. `TestDriveEntity` exports `TEST_DRIVE_STATUS_COMPLETED`/`NO_SHOW`/`CANCELLED` as named constants already, so issue #39 ("Log Test Drive Outcome") can import a single source of truth for the full vocabulary once it widens the CHECK constraint via an additive `ALTER ... DROP/ADD CONSTRAINT` migration — exactly the pattern `CreateFollowups1700000000010`'s own comment anticipated for its `type` column. `remarks` (nullable text) and `updated_at` are already on the table so #39 has somewhere to write outcome notes without a further schema change.

### Notification/reminder gap (ADR-007) — explicitly not this Story's concern

Per the brief: no `NotificationService` abstraction exists anywhere in this codebase. Issue #38 ("Auto-Reminders") is where this gap gets pragmatically handled, the same way issue #31 handled an identical gap for Follow-ups (see `.phoenix-os/project/specs/31/NOTES.md`). This Story does not touch it.

## Test results

**Backend (Jest)** — `npm test` (backend/):
- Full regression suite: **439/439 passing**, 36 suites (up from 330/330 pre-#34; #35-onward inherits a clean baseline).
- New in this Story: `test-drives-migration.spec.ts` (10 tests: table shape, CHECK constraint, FK constraints, seed-migration idempotency/reversibility), `create-test-drive.dto.spec.ts` (11 tests: required-field/format validation, no server-derived properties declared), `test-drives.service.spec.ts` (20 tests: booking, server-derived fields, audit row, Enquiry eligibility incl. fail-fast-before-transaction, operating-hours validation incl. boundary values, vehicle referential validation, the deliberate no-double-booking-check proof, `findUpcoming` scoping/ordering/past-exclusion), `test-drives.controller.spec.ts` (18 tests: happy path, AC6 missing-field 400s, AC2 operating-hours 400, vehicle-not-found 400, client-supplied server-derived fields ignored, 401/403/404 paths, `GET /upcoming` scoping, `GET /demo-vehicles` location-scoping).
- Fixed 7 pre-existing migration-count tests (`migration.spec.ts` ×2 blocks, `direct-enquiry-migration.spec.ts`, `field-config-migration.spec.ts`, `owner-updated-at-migration.spec.ts`, `next-follow-up-at-migration.spec.ts`, `followups-migration.spec.ts` ×2 blocks) — each needed two more `undoLastMigration()` calls to account for the two new migrations (1700000000013/1700000000014) now being the last ones, following the exact pattern every prior Story in this codebase established.
- `npx tsc --noEmit` — clean. `npm run lint` — clean, 0 warnings.
- One real bug caught and fixed during TDD: the operating-hours check originally used `Date.getHours()` (host-local time); this sandbox's own non-UTC offset made several tests flaky/failing until switched to `getUTCHours()` (see "Operating-hours simplification" above) — a good example of why the fast-track's "run the full suite before reporting done" instruction matters.

**Frontend (Vitest)** — `npm test` (frontend/):
- Full regression suite: **129/129 passing**, 21 files (up from 98/98 pre-#34).
- New in this Story: `NewTestDriveForm.spec.tsx` (4 tests: field rendering, AC6 required-field errors, happy path with computed UTC slot + booking-reference confirmation, AC2 server field-error mapping), `UpcomingTestDrivesList.spec.tsx` (2 tests), `BookTestDrivePage.spec.tsx` (1 test), `UpcomingTestDrivesPage.spec.tsx` (1 test), plus additions to `api-client.spec.ts` (+6 tests) and `LandingPage.spec.tsx` (+3 tests: badge entry point, no-badge state, "Book a Test Drive" link).
- `npx tsc -b --force` (forced, not incremental cache) — clean. `npm run lint` — clean, 0 warnings.

## Known gaps / follow-ups for future Stories

- **No double-booking/overlap prevention** (deliberate — see "Deliberate scope boundary with #36" above). Issue #36 owns this entirely.
- **No location-matching requirement** between the selected `vehicleId` and the actor's/Enquiry's `location_id` — a DSE can currently book a demo vehicle registered at a different location than their own. Not required by this Story's ACs; flagged as a candidate for #37 ("Test Drive Data Integrity") to tighten if desired.
- **No scheduler/calendar grid view of open vs. booked slots** — issue #35's territory; this Story only exposes a flat vehicle dropdown.
- **No auto-reminder/notification on booking** (ADR-007 gap) — issue #38's territory, mirrors the identical, already-accepted gap from issue #31.
- **No outcome logging (Completed/No-show/Cancelled + remarks)** — issue #39's territory; the schema/constants are provisioned but unused by this Story.
- **No reporting/dashboard surface for test-drive-to-booking ratio etc.** — issue #40's territory.
- The booking form's fixed 30-minute duration is not user-adjustable in this Story (see "Frontend slot capture" design decision) — a future Story could add a duration/end-time control if needed.
- No Playwright/E2E suite was written for this fast-tracked Story, mirroring every other fast-tracked Story in this codebase (#26, #29, #30, #31, etc.).
