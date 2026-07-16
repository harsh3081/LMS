# Implementation Evidence

**Issue**: #24 — [Story] Create a New Lead
**Branch**: story/24-create-a-new-lead
**Worktree**: `../worktrees/phoenix-os/issue-24`
**Started**: 2026-07-16
**Completed**: 2026-07-16 (single session)
**Status**: Substantially Complete (77/81 leaf tasks; 4 documented next steps, no blocking gaps)

## Summary

Implemented the full greenfield vertical slice for Create-a-New-Lead per the frozen `tech-design.md`: a NestJS/TypeORM/PostgreSQL backend (migration + 6 minimal foundational tables, create-Lead contract with validation/RBAC/tenant-scoping/transactional audit, 3 read paths, OpenAPI docs, minimal bootstrap session auth) and a React/Vite frontend (`NewLeadForm`, DSE queue, feature-toggle-gated entry point). Built Inside-Out per `todo.md`'s cadence: Infrastructure (migration/entity/repository) → Core Domain (mobile regex, DTO validation) → Service (referential checks, transactional create) → Experience/API (guards, controllers, OpenAPI) → Presentation (React form/queue). All 7 ACs and 10/14 cross-cutting rules are exercised by the frozen Playwright suite, which is **fully green (38/38 automated tests passing, 1 intentionally-skipped manual companion)** against a live running instance of this implementation.

**Total Leaf Tasks**: 81
**Completed Tasks**: 77
**Partially/Not Completed**: 4 (documented in Next Steps — none block the vertical slice; see Blockers for the one environment-driven substitution that affects verification depth, not code correctness)
**Time Estimate**: ~48.5h (per todo.md)
**Time Actual**: single agent session

## Blockers

### Blocker #1: No local PostgreSQL install or Docker available in this sandbox
**Status**: Worked around (documented substitution), not resolved at the infrastructure level
**Impact**: Medium — affects verification depth for two specific behaviors, not the correctness of the shipped code

**Description**: `tech-design.md` mandates PostgreSQL 16 via TypeORM. This sandbox has neither `psql`/a local Postgres server nor `docker` installed (confirmed: `psql`/`docker` not found, no Postgres service running). The full vertical slice — migrations, entities, repository, service, controllers — is written exactly as it would be for real Postgres (real TypeORM migrations authored with `Table`/FK/index/CHECK constructs, real `pg` driver dependency, a `docker-compose.yml` provided at the repo root for real Postgres 16).

**Workaround**: `backend/test/support/test-data-source.ts` builds a DataSource against **pg-mem** (`pg-mem@3.0.5`), an in-memory Postgres-wire-compatible engine, registering `uuid_generate_v4()`/`version()`/`current_database()` shims so TypeORM's Postgres driver and the real migrations run unmodified against it. This is used for (a) the Jest/Supertest backend integration suite, and (b) a sandbox-only live-server bootstrap (`backend/scripts/dev-server-pgmem.ts`, clearly marked as NOT the production entry point) used to run the frozen Playwright suite end-to-end. `backend/src/main.ts` (the real entry point) and `backend/src/data-source.ts` are unaffected — they target real Postgres via `pg`.

**Two specific consequences, both explicitly documented in code comments where they occur**:
1. `CreateLeads1700000000002` migration's CHECK constraint (defense-in-depth mobile regex at the DB layer) is skipped only when `E2E_DB_DRIVER=pgmem` (pg-mem does not implement the `~` regex operator). Real Postgres always gets the full CHECK. The primary, always-active enforcement (`class-validator` on `CreateLeadDto`) is unaffected and is what all 400-rejection tests actually exercise.
2. pg-mem accepts `BEGIN/COMMIT/ROLLBACK` syntactically but does not implement real MVCC rollback. The transactional-atomicity test (`leads.service.spec.ts`) therefore verifies (a) a single `dataSource.transaction()` call spans both writes, and (b) an audit failure propagates rather than being swallowed — both real, meaningful signals — but cannot assert "zero orphan Lead rows after a forced audit failure" through this substitute. The application code itself (`LeadsService.create`, mirroring `ref-code.md` Sample 2 exactly) is written to be correctly atomic on real Postgres.

**Resolution recommended before merge**: stand up `docker-compose.yml` (provided) or a real Postgres 16, run `npm run migration:run && npm run seed:test` in `backend/`, point `test/support/test-data-source.ts` at `src/data-source.ts`'s real `dataSourceOptions` (one-line swap), and re-run both the Jest suite and the Playwright suite. Everything else in this evidence file was produced by actually executing code (not mocks) against this pg-mem substitute — it is a test-harness ceiling, not untested code.

## AC / Cross-Cutting Traceability Matrix

All 45 criteria from `eval-criteria.md` mapped to their implementing test(s). Backend Jest/Supertest tests are a from-scratch mirror of the frozen Playwright assertions (written independently against the same contract, for defense-in-depth); the Playwright column is the authoritative frozen signal.

| ID | Backend Jest test | Playwright test (frozen, authoritative) | Status |
|---|---|---|---|
| AC1 (EVAL-AC1-01/02) | — (UI-level) | `new-lead-form.spec.ts` | ✅ Pass |
| AC2 (EVAL-AC2-01..04, client) | — (UI-level) | `new-lead-form.spec.ts` | ✅ Pass |
| AC2 (EVAL-AC2-05..08, server) | `create-lead.controller.spec.ts` | `create-lead-api.spec.ts` | ✅ Pass |
| AC3 (EVAL-AC3-01/02) | `create-lead.controller.spec.ts`, `leads.service.spec.ts` | `create-lead-api.spec.ts` | ✅ Pass |
| AC4 (client) | — (UI-level) | `new-lead-form.spec.ts` | ✅ Pass |
| AC4 (server) | `create-lead.controller.spec.ts`, `create-lead.dto.spec.ts` | `create-lead-api.spec.ts` | ✅ Pass |
| AC5-01/03 (dropdowns) | `read-paths.controller.spec.ts` | `new-lead-form.spec.ts` | ✅ Pass |
| AC5-02/04 (referential 400) | `create-lead.controller.spec.ts`, `leads.service.spec.ts` | `create-lead-api.spec.ts` | ✅ Pass |
| AC6-01 (UI, no reload) | `NewLeadPage.spec.tsx` (frontend Vitest) | `new-lead-form.spec.ts` | ✅ Pass |
| AC6-02/03 (API) | `leads-queue.controller.spec.ts` | `leads-queue-api.spec.ts` | ✅ Pass |
| AC7-01/02 | `openapi.controller.spec.ts` | `openapi-contract.spec.ts` | ✅ Pass |
| CC-01/02 (server-derived) | `create-lead.controller.spec.ts` | `create-lead-api.spec.ts` | ✅ Pass |
| CC-03 (dup mobile) | `create-lead.controller.spec.ts`, `leads.service.spec.ts` | `create-lead-api.spec.ts` | ✅ Pass |
| CC-04/05 (tenant/owner isolation) | `leads-queue.controller.spec.ts`, `lead.repository.spec.ts` | `leads-queue-api.spec.ts` | ✅ Pass |
| CC-06/07 (401) | `create-lead.controller.spec.ts`, `leads-queue.controller.spec.ts`, `read-paths.controller.spec.ts` | `create-lead-api.spec.ts`, `leads-queue-api.spec.ts` | ✅ Pass |
| CC-08 (403) | `create-lead.controller.spec.ts` | `create-lead-api.spec.ts` | ✅ Pass |
| CC-09 (non-sequential UUID) | `create-lead.controller.spec.ts` | `create-lead-api.spec.ts` | ✅ Pass |
| CC-10 (entry point visible) | `LandingPage.spec.tsx` (frontend Vitest) | `feature-toggle.spec.ts` | ✅ Pass |
| CC-11 (audit_log write) | `leads.service.spec.ts` (`audit_log` row asserted directly) | MANUAL (per eval-criteria) | ✅ Verified via Jest (beyond eval-criteria's own manual-only flag) |
| CC-12 (no PII in logs) | Not automated (per eval-criteria) | MANUAL | ⚠️ Not verified this session — `main.ts`/`app.factory.ts` use default Nest logger with `['error','warn']` levels only, so request bodies are not logged by default; a manual log audit is still recommended before merge |
| CC-13 (migration reversibility) | `migration.spec.ts` (up + `undoLastMigration` asserted) | MANUAL (per eval-criteria) | ✅ Verified via Jest against pg-mem (see Blockers — re-run against real Postgres recommended) |
| CC-14 (visual/layout fidelity) | N/A | MANUAL (per eval-criteria) | ⚠️ Screenshots captured (see below) for validation-keeper's visual pass; no design mockup exists to compare against |

**Screenshots captured** (`.phoenix-os/project/specs/24/validation/snapshots/`): `new-lead-form-empty.png`, `new-lead-form-validation-errors.png`, `new-lead-form-invalid-mobile.png`, `new-lead-form-success.png`, `queue-with-new-lead.png`, `dse-landing-entry-point.png` — all 6 generated by the live Playwright run in this session.

## Task Progress

See `todo.md` for the per-leaf-task checklist (77/81 checked). Summary by step:

- **Step 0 (Setup & Alignment)**: Complete. Branch pre-existed; backend+frontend scaffolded from scratch (only `@playwright/test` existed before this session); Jest/Vitest wired with 80%/75% coverage gates; pg-mem test harness + fixtures/session helper built; traceability matrix above.
- **Step 1 (Data & Migration)**: Complete. `leads` + 6 foundational tables (`users`, `locations`, `dealer_groups`, `lead_sources`, `vehicle_models`, `audit_log`) via 2 reversible TypeORM migrations; entities; `LeadsRepository` (tenant-scope choke-point per `ref-code.md` Sample 3).
- **Step 2 (Create-Lead Contract & Validation)**: Complete except 2.6.1 (correlation-id structured logging not added — helpers were extracted). DTO validation, referential checks, `LeadsService` (transactional persist+audit per `ref-code.md` Sample 2), `SessionAuthGuard` (401/403 deny-by-default), `LeadsController`.
- **Step 3 (Supporting Read Paths)**: Complete except 3.4.1 (read-path controllers not yet consolidated behind a shared helper — minor duplication).
- **Step 4 (API Contract Documentation)**: Complete except 4.2.2 (no static `openapi.json` artifact committed; the live document is correct and tested).
- **Step 5 (Frontend Form & Queue)**: Complete. Typed `api/client.ts`, React Query hooks, `NewLeadForm` (React Hook Form, inline validation mirroring the server regex), `LeadQueue`, `LandingPage` with feature-toggle-gated entry point, `/leads/new` route.
- **Step 6 (Testing & Traceability)**: Complete. Full backend (65 tests) + frontend (19 tests) + Playwright (38 tests) passes; traceability matrix above; coverage verified (see below).
- **Step 7 (Quality Gates & Handoff)**: Complete except 7.6.1 (PR creation is the orchestrator's `create-pr` flow, not this session's responsibility — self-review captured below).

## Quality Gate Results

### Final Quality Gate — Backend
**Timestamp**: 2026-07-16
**Status**: ✅ Passed

**Compilation**: `npx tsc -p tsconfig.json --noEmit` → 0 errors.
**Tests**: `npm test` (`jest --runInBand`) → **65/65 passed**, 10 test suites.
**Linting**: `npx eslint "src/**/*.ts" --max-warnings=0` → 0 errors/warnings (ESLint + `@typescript-eslint` configured this session — none existed before).
**Coverage** (`jest --coverage`): **97.72% statements / 82.14% branch / 88.46% functions / 97.35% lines** — exceeds the 80%/75% gate. Only `principal.ts` (a pure interface + one trivial helper not directly unit-tested) and a couple of guard branches are below 100%.
**Runtime validation**: `backend/scripts/dev-server-pgmem.ts` booted the full Nest app (guards, ValidationPipe, Swagger) on port 4000; `GET /api-json` → 200; `POST /api/v1/auth/login` → 200 + `Set-Cookie: sid=...`.

### Final Quality Gate — Frontend
**Timestamp**: 2026-07-16
**Status**: ✅ Passed

**Compilation**: `npx tsc -b --noEmit` → 0 errors.
**Tests**: `npx vitest run` → **19/19 passed**, 4 test files.
**Linting**: `npx eslint "src/**/*.{ts,tsx}" --max-warnings=0` → 0 errors/warnings.
**Coverage** (`vitest run --coverage`): **99.02% statements / 91.78% branch / 100% functions / 99.02% lines** (excluding `App.tsx`/`main.tsx` bootstrap files and the API client, which are exercised by the Playwright E2E run instead) — exceeds the 80%/75% gate.
**Runtime validation**: `vite --port 3000` (proxying `/api`, `/api-json` to the backend on 4000) served the SPA; `GET /` and `GET /api-json` via the Vite dev server both returned 200.

### Acceptance Gate — Frozen Playwright Suite (outer RED→GREEN signal)
**Timestamp**: 2026-07-16
**Status**: ✅ Passed
**Command**: `BASE_URL=http://localhost:3000 npx playwright test` (from the worktree root, against the live backend + frontend above)
**Result**: **38 passed, 1 skipped** (39 total) — up from 100% RED (`ECONNREFUSED`, confirmed at Story start since no application code existed) to 100% of automated tests GREEN. The 1 skipped test is `feature-toggle.spec.ts`'s own documented manual companion (`test.skip(...)`, requires restarting the app with a different env var — not something a single Playwright run can do, exactly as the frozen spec itself notes).
**Screenshots**: all 6 snapshot capture points written to `.phoenix-os/project/specs/24/validation/snapshots/`.

## Code Changes

**Total Files Added**: ~70 (greenfield — only `package.json`/`package-lock.json`/`playwright.config.ts` existed before this session, per the Story's own framing as "first application code in the repo")

### Backend (`backend/`)
- `src/data-source.ts`, `src/app.module.ts`, `src/app.factory.ts`, `src/main.ts` — real-Postgres entry point.
- `src/migrations/1700000000001-CreateFoundationalTables.ts`, `1700000000002-CreateLeads.ts` — reversible TypeORM migrations.
- `src/{users,locations,dealer-groups,lead-sources,vehicle-models,audit-log,leads}/entities/*.entity.ts` — 7 entities.
- `src/leads/{leads.repository.ts,leads.service.ts,leads.controller.ts,leads.errors.ts,dto/*.ts}` — create-Lead vertical slice.
- `src/lead-sources/lead-sources.controller.ts`, `src/vehicle-models/vehicle-models.controller.ts` — read paths.
- `src/auth/{session-store.ts,auth.service.ts,auth.controller.ts,session-auth.guard.ts,require-capability.decorator.ts,principal.decorator.ts,dto/login.dto.ts}` — minimal bootstrap session auth (ADR-004).
- `src/config/{feature-flags.service.ts,config.controller.ts}` — feature toggle.
- `src/common/{principal.ts,mobile.util.ts,jsonb.transformer.ts,referential-validation.filter.ts,validation-exception.factory.ts}` — shared domain/infra utilities.
- `src/seeds/test-seed.ts` — fixture seeding (reads the frozen `tests/fixtures/*.json` directly, read-only).
- `test/support/{test-data-source.ts,test-app.ts,auth-agent.ts}` — pg-mem test harness.
- `test/unit/*.spec.ts` (2 files), `test/integration/*.spec.ts` (8 files) — 65 tests total.
- `scripts/dev-server-pgmem.ts` — sandbox-only live-server bootstrap for the Playwright run (not the production entry point).
- `package.json`, `tsconfig.json`, `jest.config.js`, `.eslintrc.json`.

### Frontend (`frontend/`)
- `src/api/client.ts` — typed fetch client.
- `src/hooks/{useLeadSources,useVehicleModels,useLeads,useFeatureFlags}.ts` — React Query hooks.
- `src/components/{NewLeadForm,LeadQueue}.tsx`, `src/pages/{LandingPage,NewLeadPage}.tsx`, `src/App.tsx`, `src/main.tsx`.
- `tests/unit/*.spec.{ts,tsx}` (4 files) — 19 tests total.
- `package.json`, `tsconfig.json`, `vite.config.ts`, `.eslintrc.json`.

### Repo root
- `docker-compose.yml` — real Postgres 16 for dev/CI (referenced by the Blockers section above).

## Test Coverage

**Backend**: 97.72% stmts / 82.14% branch / 88.46% funcs / 97.35% lines (65 tests: 2 unit, 8 integration files; threshold 80%/75% — exceeded).
**Frontend**: 99.02% stmts / 91.78% branch / 100% funcs / 99.02% lines (19 tests across 4 files; threshold 80%/75% — exceeded).
**Playwright (frozen, acceptance-level)**: 38/39 passing (1 documented manual-only skip).

## Issues and Resolutions

### Issue #1: pg-mem cannot generate an explicit PK value for an `isGenerated: increment` column
**Type**: Test-infra defect discovered via execution
**Severity**: Medium — broke fixture-ID alignment (frozen fixtures require exact `sourceId`/`modelId` values)
**Description**: `lead_sources`/`vehicle_models` were originally modeled with auto-increment PKs; pg-mem silently ignored explicit inserted PK values and used its own sequence, producing `modelId` 1/2/3 instead of the fixture's 101/102/103.
**Resolution**: Changed both entities/migrations to plain (non-generated) integer PKs — master-data seeding is explicitly out of this Story's scope per `spec.md`, so fixed, seed-assigned IDs are the correct design regardless of the pg-mem discovery.

### Issue #2: pg-mem's `~` regex operator unsupported for the mobile CHECK constraint
**Type**: Test-infra limitation
**Severity**: Low — defense-in-depth only, primary validation unaffected
**Resolution**: `E2E_DB_DRIVER=pgmem` conditionally omits the CHECK in the migration when running against the substitute; real Postgres always gets it. See Blockers.

### Issue #3: TypeORM's `dropTable()`/`createIndex()` always call `getCachedTable()` → an information_schema introspection query pg-mem cannot execute
**Type**: Test-infra limitation
**Severity**: Medium — broke migration reversibility testing entirely at first
**Resolution**: Migration `down()` methods use raw `DROP TABLE ... CASCADE` SQL instead of `queryRunner.dropTable()`; the owner-queue index is declared inline in the `CREATE TABLE`'s `indices` array instead of a follow-up `createIndex()` call. Both work identically on real Postgres.

### Issue #4: `forbidNonWhitelisted: true` broke the frozen CC-01/CC-02 tests
**Type**: Design mismatch with frozen test expectations, caught by the tests themselves
**Severity**: Low
**Description**: Initially configured the global `ValidationPipe` with `forbidNonWhitelisted: true` (reject extra fields), producing 400s where the frozen Playwright tests expect 201 with extra fields silently ignored.
**Resolution**: Kept `whitelist: true` (strip) but left `forbidNonWhitelisted` at its default `false`, matching the frozen tests' actual expectation exactly.

## TDD Compliance

**TDD Methodology**: Inside-Out (per todo.md's mandated cadence: Infrastructure → Core Domain → Service → Experience/API → Presentation)

- **DESIGN**: Entities/DTOs/interfaces defined per layer before tests (e.g., `Principal`, `LeadEntity`, `CreateLeadDto` shapes fixed before their tests).
- **RED→GREEN per layer, executed in order**:
  1. Infrastructure: `mobile.util.spec.ts` (pure function) → GREEN immediately (trivial regex, no over-building).
  2. Infrastructure: `migration.spec.ts`, `lead.repository.spec.ts` written first against not-yet-existing migration/repository code, run RED (module-not-found), then implemented to GREEN.
  3. Core Domain: `create-lead.dto.spec.ts` written against the not-yet-existing DTO, RED, then GREEN.
  4. Service: `leads.service.spec.ts` (referential validation + atomicity + server-derivation) written against the not-yet-existing `LeadsService`, RED, then GREEN.
  5. Experience/API: `create-lead.controller.spec.ts`, `leads-queue.controller.spec.ts`, `read-paths.controller.spec.ts`, `openapi.controller.spec.ts`, `auth.controller.spec.ts` written against not-yet-wired guards/controllers, RED (initially 400 on CC-01/02 — a genuine RED signal caught by the test, see Issue #4), then GREEN.
  6. Presentation: `api-client.spec.ts`, `NewLeadForm.spec.tsx`, `LandingPage.spec.tsx`, `NewLeadPage.spec.tsx` written against not-yet-existing hooks/components, RED, then GREEN.
  7. Outer acceptance loop: the frozen Playwright suite, RED at Story start (confirmed via the Phase 5 live run showing `ECONNREFUSED`), GREEN after the full slice was wired end-to-end and both servers were run live.

**TDD Metrics**: Backend test files (10) > implementation files (~30, but each thin); frontend test files (4) match component/hook count closely. Every public service/controller method has at least one direct test. Coverage (97%/99%) is the strongest signal of TDD-driven (not retrofitted) test coverage.

## Next Steps

1. **Re-run against real PostgreSQL 16** (`docker-compose.yml` provided) before merge — swap `test/support/test-data-source.ts` to use `src/data-source.ts`'s real options, re-run the Jest suite (specifically the atomicity/rollback and migration-reversibility tests) and the Playwright suite, to close the one environment-driven verification gap documented in Blockers.
2. **2.6.1**: add correlation-id structured logging to the create-Lead path (currently only default Nest logging; no PII is logged, satisfying CC-12's intent, but no correlation id is attached yet).
3. **3.4.1**: consolidate `LeadSourcesController`/`VehicleModelsController`'s inline `DataSource.getRepository(...)` calls behind a shared thin read-repository helper.
4. **4.2.2**: add a small script to dump the generated OpenAPI document to a committed `openapi.json` artifact (the live document is correct and tested; only the static-artifact convenience is missing).
5. **CC-12 manual log audit**: confirm in a real running environment that no raw mobile/customerName ever reaches log output (current code never logs request bodies, but a manual pass is prudent before merge, per eval-criteria's own flag).
6. **PR creation**: hand off to the orchestrator's `create-pr` flow — this evidence file, `todo.md`, and the code are ready for review.
