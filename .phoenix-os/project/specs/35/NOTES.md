# Issue #35 — Real-Time Test Drive Scheduler View

Fast-track implementation (no separate spec.md/tech-design.md/todo.md — direct TDD implementation against the existing #34 foundation, per orchestrator instruction). This document records the design decisions, test results, and known gaps.

Builds directly on `.phoenix-os/project/specs/34/NOTES.md` (`demo_vehicles`/`test_drives` schema, `TestDrivesRepository`/`TestDrivesService`/`TestDrivesController`, `NewTestDriveForm`/`BookTestDrivePage`). This Story adds a READ/VIEW-only scheduler grid on top of that data — no schema change, no double-booking prevention (still #36's job).

## What was built

**Backend** (extends `backend/src/test-drives/`, no new module, no migration — read-only, no schema change):
- `backend/src/test-drives/dto/scheduler-query.dto.ts` — `SchedulerQueryDto` (`vehicleId`/`from`/`to`, all required, `@IsUUID`/`@IsISO8601`).
- `backend/src/test-drives/dto/scheduler-slot.dto.ts` — `SchedulerSlotDto` (`slotStart`/`slotEnd` only — deliberately anonymized, see below).
- `backend/src/test-drives/test-drives.repository.ts` — `findBookedInRange()`: every BOOKED slot for one vehicle whose window overlaps `[from,to)`, tenant-scoped (`locationId`/`dealerGroupId`) but NOT owner-scoped, ascending by `slotStart`.
- `backend/src/test-drives/test-drives.service.ts` — `getScheduler()`: thin pass-through to the repository, no existence/cross-field validation (see below).
- `backend/src/test-drives/test-drives.controller.ts` — `GET /api/v1/test-drives?vehicleId=&from=&to=` (new method on the existing `TestDrivesController`, reuses the `create-lead` capability).
- `backend/src/test-drives/test-drives.mapper.ts` — `toSchedulerSlot()`.
- `backend/test/unit/scheduler-query.dto.spec.ts`, additions to `backend/test/integration/test-drives.service.spec.ts` (`getScheduler` describe block) and `backend/test/integration/test-drives.controller.spec.ts` (`GET /api/v1/test-drives` describe block).

**Frontend**:
- `frontend/src/utils/schedulerGrid.ts` — `computeDaySlots()` (the "derived, not stored" open/booked grid computation), `isoDatePart`/`isoTimePart` helpers. New `frontend/src/utils/` directory (didn't exist before).
- `frontend/src/api/client.ts` — `SchedulerQuery`/`SchedulerSlot` types, `api.getScheduler()`.
- `frontend/src/hooks/useTestDrives.ts` — `useSchedulerSlots()` (polling query, `SCHEDULER_POLL_INTERVAL_MS = 20_000`).
- `frontend/src/components/TestDriveSchedulerGrid.tsx` — the grid itself (AC1/AC2/AC4).
- `frontend/src/pages/TestDriveSchedulerPage.tsx` — vehicle switcher + date control (AC1/AC5), route `/test-drives/scheduler`.
- `frontend/src/components/NewTestDriveForm.tsx` / `frontend/src/pages/BookTestDrivePage.tsx` — MODIFIED to accept/read `vehicleId`/`date`/`time` pre-fill (AC4).
- `frontend/src/pages/LandingPage.tsx` — new "Test Drive Scheduler" entry point.
- `frontend/src/App.tsx` — new route.
- New/modified specs: `tests/unit/schedulerGrid.spec.ts`, `tests/unit/useSchedulerSlots.spec.tsx`, `tests/unit/TestDriveSchedulerGrid.spec.tsx`, `tests/unit/TestDriveSchedulerPage.spec.tsx`, plus additions to `api-client.spec.ts`, `NewTestDriveForm.spec.tsx`, `BookTestDrivePage.spec.tsx`, `LandingPage.spec.tsx`.

## Design decisions

### Scheduler endpoint shape — a filtered GET on the existing `/api/v1/test-drives` collection, not a new `/api/v1/scheduler` path

The issue left this as an explicit judgment call. Chose `GET /api/v1/test-drives?vehicleId=&from=&to=` — a new `@Get()` method added directly to the existing `TestDrivesController` (which already hosts `POST /api/v1/test-drives`) — over a dedicated `/api/v1/scheduler` resource. Rationale: this is fundamentally a filtered read of the SAME `test_drives` collection resource (REST-idiomatic "collection GET with query filters", mirrors `GET /api/v1/duplicates?mobile=` / `DuplicateQueryDto`'s exact convention), not a distinct domain concept needing its own controller/module. No route conflict with the existing `GET /api/v1/test-drives/upcoming` (a different, more-specific path segment on a separate controller mounted at the same base path — Nest resolves both without ambiguity).

### Scoping — tenant-scoped, NOT owner-scoped

`findBookedInRange()` filters by `locationId`/`dealerGroupId` (mirrors `FollowupsRepository.findByEnquiry`'s tenant-not-owner scoping) but deliberately does NOT filter by `bookedBy` — any DSE at the caller's own location sees every booking against a vehicle they can also see via `GET /api/v1/demo-vehicles`, since demo vehicles are a shared dealership resource, not per-DSE. Proven by dedicated tests (`dseB` — same location as `dseA` — sees `dseA`'s booking; `dseC` — different location — does not). Unlike `FollowupsRepository.findByEnquiry`, there is no SM/GM cross-location-widening branch here: `GET /api/v1/demo-vehicles` itself has no role-based branching either, so this endpoint mirrors that simpler, single-location-scoped precedent rather than introducing new role logic this Story doesn't need.

### Response shape — deliberately minimal/anonymized (`slotStart`/`slotEnd` only)

`SchedulerSlotDto` intentionally omits `testDriveId`/`enquiryId`/`bookedBy`. No Story to date has established cross-DSE visibility rules into another DSE's Enquiry — every existing lookup (`EnquiriesRepository.findOwnedById`, `FollowupsRepository.findByEnquiry`) is scoped to the caller's own Enquiries or one the caller already has eligibility for. Since this endpoint is deliberately NOT owner-scoped, exposing WHICH other booking/customer a slot belongs to would be a new, unreviewed cross-DSE data exposure. Took the safer default: the response only says a slot IS booked, never by whom/for whom. AC2 ("open slots are visually distinguished from booked") doesn't require more than that.

### "Open slots" — derived client-side, not stored

There is no separate "available inventory calendar" table (confirmed — `test_drives` only ever stores actual bookings, per #34's NOTES.md). The backend returns only booked slots for the requested vehicle+range; the FRONTEND (`schedulerGrid.ts#computeDaySlots`) computes the fixed grid of every possible 30-minute slot within operating hours (09:00-19:00 UTC = 20 slots/day/vehicle, mirroring `TestDrivesService`'s `OPERATING_HOURS_START_HOUR`/`OPERATING_HOURS_END_HOUR` constants and `NewTestDriveForm`'s fixed-30-minute-duration convention) and marks any slot overlapping a returned booking as `'booked'`, everything else `'open'`. This IS a deliberate, documented duplication of the 09:00-19:00 constants on the frontend (no shared-config endpoint exists yet) — not drift; both sides comment on it explicitly.

### No existence/cross-field validation on the scheduler query

`getScheduler()`/`findBookedInRange()` do not check that `vehicleId` exists, nor that `to > from`. An unknown/inactive/other-tenant `vehicleId` or a malformed range simply yields an empty booked-slots list (never a 404/400) — this is a read-only, nothing-is-written endpoint, mirroring `GET /api/v1/duplicates`'s "no match → empty array" convention rather than erroring. The frontend already renders an empty booked list as "every slot open," which is never a dangerous false negative (it can't create a phantom booking).

### Single-day view, not a multi-week calendar

`TestDriveSchedulerPage` shows one vehicle × one date at a time, with a native `<input type="date">` plus Previous/Next-Day buttons. Chosen over a full multi-week calendar grid as the simpler, still-fully-functional scope the issue explicitly allowed ("a single-day view... is a reasonable, simpler scope"). `SchedulerQueryDto`'s `from`/`to` are generic enough that a future multi-day view would only need a frontend change, not a backend one.

### Pre-fill mechanism (AC4) — query params, not route state/context

No existing precedent for form pre-fill via navigation exists anywhere in this codebase (verified — every other create-form route, e.g. `/leads/new`, `/enquiries/new`, always starts blank). Per the issue's own guidance, chose query params (`?vehicleId=&date=&time=`) as the simplest, most inspectable option — a plain URL survives a page refresh/bookmark/copy-paste, unlike React Router's `location.state` or a lightweight context, neither of which this codebase uses anywhere. `BookTestDrivePage` reads the three params and passes them as `NewTestDriveForm`'s new `initialValues` prop; `enquiryId` is deliberately never part of this (the DSE still picks the customer on the form regardless of entry point). One implementation subtlety: `useDemoVehicles()` loads asynchronously, so at mount time the pre-filled `vehicleId`'s `<option>` doesn't exist yet on the native `<select>` — a `useEffect` re-applies the pre-fill via `setValue()` once the vehicle list (and therefore the matching `<option>`) has actually loaded.

### AC3 "real time... without manual refresh" — polling, not push infrastructure

No WebSocket/SSE/push infrastructure exists anywhere in this codebase (verified — mirrors the identical ADR-007 gap #31/#34 already flagged and pragmatically handled). `useSchedulerSlots()` sets React Query's `refetchInterval` to `SCHEDULER_POLL_INTERVAL_MS = 20_000` (20s, within the issue's suggested 15-30s range) — a booking made by another DSE shows up within one interval, without the viewing DSE doing anything. The interval-refetch behavior itself is proven with `vi.useFakeTimers()`/`vi.advanceTimersByTimeAsync()` (`useSchedulerSlots.spec.tsx`) rather than a real wall-clock wait, per the orchestrator's explicit instruction.

### Accessibility — open/booked distinguished by more than color

Each grid row shows an explicit "Open"/"Booked" text label (not just a color swatch) plus a differing action column ("Book" link vs. "Unavailable" text) — satisfies AC2's "not by color alone" without introducing a new shared UI primitive (kept local to `TestDriveSchedulerGrid` rather than modifying the existing `StatusPill`, which only special-cases the `'New'` status and is used elsewhere for Lead/Enquiry/TestDrive `status` values with different semantics).

## Test results

**Backend (Jest)** — `npm test` (backend/):
- Full regression suite: **461/461 passing**, 37 suites (up from 439/439 pre-#35).
- New in this Story: `scheduler-query.dto.spec.ts` (8 tests: required-field/format validation), additions to `test-drives.service.spec.ts` (`getScheduler` describe block — 6 tests: tenant-not-owner scoping via `dseB`, cross-tenant exclusion via `dseC`, date-range overlap filtering, per-vehicle filtering, empty-result-not-error, ascending order), additions to `test-drives.controller.spec.ts` (`GET /api/v1/test-drives` describe block — 8 tests: happy path + anonymized-shape assertion, same-location-different-DSE visibility, cross-tenant exclusion, missing-field 400s ×3, unknown-vehicleId-returns-empty (not error), unauthenticated 401).
- `npx tsc --noEmit` — clean. `npm run lint` — clean, 0 warnings.

**Frontend (Vitest)** — `npm test` (frontend/):
- Full regression suite: **152/152 passing**, 25 files (up from 129/129 pre-#35).
- New in this Story: `schedulerGrid.spec.ts` (7 tests: fixed-grid generation, exact/partial-overlap booking detection, adjacent-slot non-overlap, date/time part extraction), `useSchedulerSlots.spec.tsx` (3 tests, including the fake-timer AC3 polling-interval proof), `TestDriveSchedulerGrid.spec.tsx` (5 tests: 20-slot rendering, open/booked labeling+action, AC4 pre-fill link href, loading state), `TestDriveSchedulerPage.spec.tsx` (4 tests: default vehicle/date, Prev/Next-Day date-range shift, vehicle-switch re-query, grid rendering), plus additions to `api-client.spec.ts` (+1 test), `NewTestDriveForm.spec.tsx` (+1 test), `BookTestDrivePage.spec.tsx` (+1 test), `LandingPage.spec.tsx` (+1 test).
- `npx tsc -b --force` (forced, not incremental cache) — clean. `npm run lint` — clean, 0 warnings.
- One real implementation bug caught and fixed during TDD: the AC4 pre-fill's `vehicleId` initially failed to "stick" on the native `<select>` because `useDemoVehicles()` resolves asynchronously — react-hook-form's `defaultValues` are applied once at mount, before the matching `<option>` exists. Fixed with a `useEffect` that re-applies the pre-filled `vehicleId` via `setValue()` once the vehicle list has actually loaded.

## Known gaps / follow-ups for future Stories

- **No double-booking/overlap prevention** — unchanged from #34, still entirely #36's territory. This Story is read-only; it does not write to `test_drives` at all.
- **No vehicle-existence/location-matching validation on the scheduler query** (deliberate — see "No existence/cross-field validation" above). An unknown or wrong-tenant `vehicleId` silently returns an empty (all-open) grid rather than a 404 — acceptable for a read endpoint, but worth tightening if a future Story wants stricter API ergonomics.
- **Single-day view only** — no multi-day/week calendar grid. `SchedulerQueryDto`'s generic `from`/`to` range means a future Story could extend the frontend to a multi-day view without a backend change.
- **Polling, not push** (AC3, ADR-007 gap) — a genuine WebSocket/SSE notification layer, if ever built for #38 ("Auto-Reminders") or elsewhere, could replace this polling with real push; 20s is "near real time," not instantaneous.
- **Operating-hours constants (09:00-19:00 UTC) are duplicated** between `backend/src/test-drives/test-drives.service.ts` and `frontend/src/utils/schedulerGrid.ts` — both comment on this explicitly; a future dealership-hours-config feature (flagged already in #34's NOTES.md) would need to update both, or better, expose the value via a config endpoint.
- No Playwright/E2E suite was written for this fast-tracked Story, mirroring every other fast-tracked Story in this codebase (#26, #29, #30, #31, #34, etc.).
