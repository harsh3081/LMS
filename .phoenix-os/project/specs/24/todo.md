# Implementation TODO

> **Instructions**: Detailed, hierarchical, ≤ 2-hour task breakdown with TDD cadence and estimates (Phase 4 / `/impl:design`). Follows the frozen `spec.md` scope and the Inside-Out TDD default (core-first, integration-preferred). Step sub-task (N.M) lines are groupings with a rollup estimate in parentheses; leaf tasks (N.M.P / N.M.P.Q) carry the real estimate — the total is the sum of the leaves.

**Issue**: #24
**Title**: [Story] Create a New Lead
**Traces To**: FR-01 (Parent Feature #7)
**Created**: 2026-07-16
**Stack** (from analysis/spec): React (Vite) SPA -> NestJS/TypeScript Backend API -> PostgreSQL
**TDD Cadence**: Inside-Out (Infrastructure -> Core Domain -> Service -> Experience/API -> Presentation)

> **Resolved note**: `tech-design.md` has landed and all previously-open clarifications are resolved (see decisions.md Phase 4). Concrete details below (endpoint paths, migration tooling, exact table/column names, RBAC guard, audit mechanism, feature-toggle mechanism) are now aligned with the frozen `tech-design.md`.

---

## Implementation Status Summary (reconciled against evidence.md — 2026-07-16)

> At-a-glance handoff for the next implementation pass / reviewer. Full detail in `evidence.md`.

**Tasks complete**: 77 / 81 leaf tasks. Checkbox state below is reconciled against `evidence.md` and accurate — the only 4 unchecked leaves (2.6.1, 3.4.1, 4.2.2, 7.6.1) are the documented remaining gaps.

**Quality gates**: ✅ All green.
- Backend: 65/65 Jest tests passing (10 suites); coverage 97.72% stmts / 82.14% branch / 88.46% funcs / 97.35% lines; tsc + ESLint clean.
- Frontend: 19/19 Vitest tests passing (4 files); coverage 99.02% stmts / 91.78% branch / 100% funcs / 99.02% lines; tsc + ESLint clean.
- Acceptance (frozen Playwright, authoritative): 38 passed / 1 skipped (39 total) — the skip is the spec's own documented manual companion in `feature-toggle.spec.ts`. Went from 100% RED (`ECONNREFUSED`, no app code at Story start) to 100% of automated tests GREEN against a live instance.
- Coverage gate (80% line / 75% branch) exceeded on both packages.

**Environment caveat (⚠️ re-verify before merge)**: No local PostgreSQL/Docker in the build sandbox. The full slice (real TypeORM migrations, `pg` driver, `docker-compose.yml` for real PG16) is written for real Postgres, but tests ran against **pg-mem** (in-memory Postgres-wire substitute). Two verification gaps result, both are test-harness ceilings, not untested code:
- Transactional-atomicity / rollback: pg-mem accepts BEGIN/COMMIT/ROLLBACK but has no real MVCC rollback. Atomicity is verified structurally (single `dataSource.transaction()` spanning both writes) + via audit-failure propagation, but "zero orphan Lead rows after forced audit failure" cannot be asserted through the substitute. **Re-run the atomicity + migration-reversibility tests against real Postgres 16** (swap `backend/test/support/test-data-source.ts` to `src/data-source.ts`'s real options; `docker-compose.yml` provided).
- Mobile CHECK constraint (DB-layer defense-in-depth) is skipped only under `E2E_DB_DRIVER=pgmem` (no `~` regex operator); real Postgres always gets it. Primary `class-validator` enforcement is always active and is what the 400-rejection tests exercise.

**4 remaining minor gaps** (none block the vertical slice — per `evidence.md` Next Steps):
- **2.6.1** — Structured logging with correlation-id not added to the create-Lead path (shared validation/error helpers were extracted; only default Nest logging today; no PII logged, so CC-12 intent is met, but no correlation id attached yet).
- **3.4.1** — Read-path controllers (`LeadSourcesController`/`VehicleModelsController`) still call `DataSource.getRepository(...)` inline; consolidate behind a shared thin read-repository helper (minor duplication).
- **4.2.2** — No static `openapi.json` artifact committed; the live OpenAPI document is correct and test-verified, only the committed-artifact convenience is missing.
- **7.6.1** — PR creation is the orchestrator's `create-pr` flow, not this session's responsibility; self-review is captured in `evidence.md`.

Also pending manual (per eval-criteria's own flags): CC-12 log audit in a real running env (code never logs request bodies) and CC-14 visual/layout fidelity (6 snapshots captured; no design mockup to compare against).

---

## Task Breakdown

Step 0: Setup & Alignment
[x] 0.1: Working branch & environment (rollup 1h 15m)
    [x] 0.1.1: Create/verify feature branch from base - Est: 15m - TDD: Setup
    [x] 0.1.2: Verify backend + frontend + Postgres dev environment runs (app boots, DB reachable, migrations apply) - Est: 30m - TDD: Setup (see evidence.md Blockers: no local Postgres/Docker in this sandbox — verified via the pg-mem substitute instead; real Postgres re-verification is a next step)
    [x] 0.1.3: Confirm test runners + coverage thresholds wired (backend integration harness, frontend test runner, >=80% line / >=75% branch gate) - Est: 30m - TDD: Setup
[x] 0.2: Test scaffolding & fixtures for the vertical slice (rollup 1h 45m)
    [x] 0.2.1: Set up transactional/isolated test database harness for integration tests - Est: 30m - TDD: Setup
    [x] 0.2.2: Prepare fixtures — source-master rows, model-master rows, DSE users across two location_ids/dealer_group_ids - Est: 45m - TDD: Setup
    [x] 0.2.3: Prepare authenticated-session test helper (injects user_id, role, location_id, dealer_group_id) - Est: 30m - TDD: Setup
[x] 0.3: Alignment & traceability skeleton (rollup 45m)
    [x] 0.3.1: Re-confirm frozen spec decisions and build the AC1–AC7 + cross-cutting traceability map skeleton - Est: 30m - TDD: Setup (matrix delivered in evidence.md)
    [x] 0.3.2: Confirm Inside-Out layering order and layer-level test approach with team - Est: 15m - TDD: Setup

Step 1: Data & Migration
[x] 1.1: Design Lead schema (DESIGN) (rollup 1h)
    [x] 1.1.1: Define Lead fields/types/constraints/defaults (internal id, unique lead_id, customer_name, mobile, source_id FK, model_id FK, owner_id, location_id, dealer_group_id, status default "New", configurable_fields JSONB, created_by/created_on, updated metadata) - Est: 45m - TDD: Setup (Design)
    [x] 1.1.2: Define supporting index for the owner-scoped list query (owner_id + location_id) - Est: 15m - TDD: Setup (Design)
[x] 1.2: Migration & repository tests (rollup 1h 30m)
    [x] 1.2.1: Write test asserting up-migration creates table with columns, FKs, and default status "New" - Est: 30m - TDD: Red
    [x] 1.2.2: Write test asserting down-migration drops table + index (reversibility) - Est: 30m - TDD: Red
    [x] 1.2.3: Write repository test — insert persists all fields incl. server-derived defaults & JSONB default - Est: 30m - TDD: Red
[x] 1.3: Implement migration, entity, repository (rollup 2h 30m)
    [x] 1.3.1: Implement reversible up/down migration (table, FKs, default status, JSONB, index) - Est: 1h - TDD: Green
    [x] 1.3.2: Implement Lead entity/model mapping - Est: 30m - TDD: Green
    [x] 1.3.3: Implement Lead repository (insert + owner-scoped find) - Est: 45m - TDD: Green
    [x] 1.3.4: Run migration + repository tests to green - Est: 15m - TDD: Green
[x] 1.4: Refactor (rollup 30m)
    [x] 1.4.1: Extract status enum/field constants; tidy entity & repository naming - Est: 30m - TDD: Refactor

Step 2: Backend — Create-Lead Contract & Validation
[x] 2.1: Domain validation — presence & mobile format (rollup 2h 15m)
    [x] 2.1.1: Write tests for India 10-digit mobile rule incl. boundaries (too short/long, non-numeric, disallowed leading digit) - Est: 45m - TDD: Red
    [x] 2.1.2: Write tests for presence of the four mandatory fields - Est: 30m - TDD: Red
    [x] 2.1.3: Implement mobile-format validator - Est: 30m - TDD: Green
    [x] 2.1.4: Implement presence/DTO validation rules - Est: 30m - TDD: Green
[x] 2.2: Referential validation — source & model (rollup 1h 45m)
    [x] 2.2.1: Write tests — source_id must exist in source master (reject otherwise) - Est: 30m - TDD: Red
    [x] 2.2.2: Write tests — model_id must exist in model master (reject otherwise) - Est: 30m - TDD: Red
    [x] 2.2.3: Implement referential validation against source & model masters - Est: 45m - TDD: Green
[x] 2.3: Create-Lead service / use case (rollup 4h)
    [x] 2.3.1: Write service tests — owner/location_id/dealer_group_id/status/audit derived from session, never from client - Est: 45m - TDD: Red
    [x] 2.3.2: Write service test — unique lead_id generated on create - Est: 30m - TDD: Red
    [x] 2.3.3: Write service tests — transactional persist + audit_log write are atomic (both or neither) - Est: 45m - TDD: Red (see evidence.md Blockers: pg-mem does not implement real rollback — atomicity verified structurally + via failure-propagation; full rollback re-verification needs real Postgres)
    [x] 2.3.4: Write service test — duplicate mobile permitted (second Lead accepted; no uniqueness check) - Est: 15m - TDD: Red
    [x] 2.3.5: Implement create-Lead service (unique-ID gen, server-derived fields, transactional persist + audit write) - Est: 1.5h - TDD: Green
    [x] 2.3.6: Run service tests to green - Est: 15m - TDD: Green
[x] 2.4: RBAC / tenant enforcement (rollup 1h 15m)
    [x] 2.4.1: Write test — unauthenticated request rejected - Est: 15m - TDD: Red
    [x] 2.4.2: Write test — wrong-role/insufficient capability rejected (deny-by-default) - Est: 30m - TDD: Red
    [x] 2.4.3: Implement authorization guard for DSE create-Lead capability - Est: 30m - TDD: Green
[x] 2.5: Controller / endpoint (Experience layer) (rollup 2h 45m)
    [x] 2.5.1: Write DTO tests — client-supplied owner/tenant/status/lead_id are ignored/rejected - Est: 30m - TDD: Red
    [x] 2.5.2: Write happy-path integration test (201 + created representation incl. unique id & status "New") - Est: 30m - TDD: Red
    [x] 2.5.3: Write validation-error integration tests (field-level 400 for each missing field + invalid mobile) - Est: 30m - TDD: Red
    [x] 2.5.4: Implement controller — request DTO, wire guard + service, response shape, error mapping - Est: 1h - TDD: Green
    [x] 2.5.5: Run endpoint integration tests to green - Est: 15m - TDD: Green
[ ] 2.6: Refactor (rollup 45m)
    [ ] 2.6.1: Extract shared validation/error-mapping helpers; add structured logging with correlation id - Est: 45m - TDD: Refactor (helpers extracted — validation-exception.factory.ts, referential-validation.filter.ts; correlation-id structured logging NOT done — see evidence.md Next Steps)

Step 3: Backend — Supporting Read Paths
[x] 3.1: Source-list read path (rollup 1h)
    [x] 3.1.1: Write test — source-list endpoint returns configured sources (tenant-appropriate) - Est: 30m - TDD: Red
    [x] 3.1.2: Implement/confirm source-list read endpoint - Est: 30m - TDD: Green
[x] 3.2: Model-master read path (rollup 1h)
    [x] 3.2.1: Write test — model-master endpoint returns selectable models - Est: 30m - TDD: Red
    [x] 3.2.2: Implement/confirm model-master read endpoint - Est: 30m - TDD: Green
[x] 3.3: Owner-scoped Lead list/queue (AC6) (rollup 3h 15m)
    [x] 3.3.1: Write tests — list returns only caller's own leads within their location/tenant - Est: 45m - TDD: Red
    [x] 3.3.2: Write tests — cross-owner/cross-location isolation (DSE A cannot see DSE B leads) - Est: 45m - TDD: Red
    [x] 3.3.3: Write test — newly created Lead appears in the list immediately - Est: 30m - TDD: Red
    [x] 3.3.4: Implement owner-scoped list endpoint using the supporting index - Est: 1h - TDD: Green
    [x] 3.3.5: Run read-path tests to green - Est: 15m - TDD: Green
[ ] 3.4: Refactor (rollup 30m)
    [ ] 3.4.1: Consolidate read-path query/scope helpers - Est: 30m - TDD: Refactor (LeadSourcesController/VehicleModelsController still call DataSource.getRepository directly — minor duplication left as next step)

Step 4: API Contract Documentation (AC7)
[x] 4.1: Author OpenAPI documentation (rollup 1h 30m)
    [x] 4.1.1: Document create-Lead endpoint (request/response schemas, field-level error codes) on the OpenAPI contract of record - Est: 45m - TDD: Green
    [x] 4.1.2: Document read endpoints (source-list, model-master, owner-scoped Lead list) - Est: 45m - TDD: Green
[x] 4.2: Validate contract (rollup 1h)
    [x] 4.2.1: Write contract test asserting create + read endpoints are exposed on the OpenAPI contract - Est: 30m - TDD: Red
    [ ] 4.2.2: Lint/build OpenAPI and regenerate the contract artifact - Est: 30m - TDD: Integrate (document is generated correctly at runtime and verified by tests; no static openapi.json artifact was committed — next step)

Step 5: Frontend — New Lead Form & Queue
[x] 5.1: Typed API client / data hooks (rollup 1h 15m)
    [x] 5.1.1: Write tests for API client (createLead, getSources, getModels, getMyLeads) - Est: 30m - TDD: Red
    [x] 5.1.2: Implement typed API client methods against the OpenAPI contract - Est: 45m - TDD: Green
[x] 5.2: New Lead form component (rollup 3h 45m)
    [x] 5.2.1: Write tests — renders four fields; source & model dropdowns populated from read paths (AC5) - Est: 45m - TDD: Red
    [x] 5.2.2: Write tests — inline error for each missing mandatory field (AC2) - Est: 45m - TDD: Red
    [x] 5.2.3: Write tests — inline mobile-format validation mirrors server rule (AC4) - Est: 30m - TDD: Red
    [x] 5.2.4: Implement form UI with fields + populated dropdowns - Est: 1h - TDD: Green
    [x] 5.2.5: Implement inline validation mirroring server rules - Est: 45m - TDD: Green
[x] 5.3: Submit / success / error handling (rollup 1h 45m)
    [x] 5.3.1: Write tests — successful submit calls create endpoint and shows success (AC1/AC3) - Est: 30m - TDD: Red
    [x] 5.3.2: Write tests — server errors surface as field-level/summary messages - Est: 30m - TDD: Red
    [x] 5.3.3: Implement submit handler with success + error states - Est: 45m - TDD: Green
[x] 5.4: DSE list/queue reflection (AC6) (rollup 1h 30m)
    [x] 5.4.1: Write tests — created Lead appears in DSE list/queue immediately after submit - Est: 45m - TDD: Red
    [x] 5.4.2: Implement list refresh/insert on success - Est: 45m - TDD: Green
[x] 5.5: Entry point + feature toggle (rollup 1h)
    [x] 5.5.1: Write test — entry point opens form when toggle enabled; hidden when disabled - Est: 30m - TDD: Red
    [x] 5.5.2: Implement "New Lead" entry point behind the feature toggle - Est: 30m - TDD: Green
[x] 5.6: Refactor (rollup 45m)
    [x] 5.6.1: Extract shared form/validation/list-state hooks; tidy component structure - Est: 45m - TDD: Refactor

Step 6: Testing & Traceability
[x] 6.1: AC traceability matrix (rollup 45m)
    [x] 6.1.1: Complete AC1–AC7 + cross-cutting -> test mapping; identify gaps - Est: 45m - TDD: Integrate (see evidence.md)
[x] 6.2: Close coverage gaps (rollup 1h)
    [x] 6.2.1: Add tests for any gap surfaced by the matrix - Est: 1h - TDD: Red/Green (no automated-criteria gaps found; remaining gaps are the 4 eval-criteria manual-only items, inherently non-automatable)
[x] 6.3: Backend integration scenario pass (rollup 1h 30m)
    [x] 6.3.1: Run/verify validation + auth suite (4 missing-field cases, invalid mobile, bad source, bad model, unauthenticated, wrong role) - Est: 45m - TDD: Integrate
    [x] 6.3.2: Run/verify tenant-owner scoping + unique-id + status "New" + audit-write + duplicate-mobile-permitted suite - Est: 45m - TDD: Integrate
[x] 6.4: Frontend test pass (rollup 45m)
    [x] 6.4.1: Run/verify inline errors, dropdowns, submit, and list-reflection tests - Est: 45m - TDD: Integrate
[x] 6.5: Coverage verification (rollup 45m)
    [x] 6.5.1: Generate coverage report; confirm >=80% line / >=75% branch; close residual gaps - Est: 45m - TDD: Integrate

Step 7: Quality Gates & Handoff
[x] 7.1: Static analysis (rollup 45m)
    [x] 7.1.1: Run linters/formatters/static analysis on backend + frontend; fix findings - Est: 45m - TDD: Integrate (ESLint added to both packages, 0 errors/warnings)
[x] 7.2: Full suite + coverage gate (rollup 30m)
    [x] 7.2.1: Run full backend + frontend test suite with coverage gate green - Est: 30m - TDD: Integrate
[x] 7.3: Migration reversibility check (rollup 30m)
    [x] 7.3.1: Verify up/down migration on a clean database - Est: 30m - TDD: Integrate (verified via pg-mem substitute in this sandbox — see evidence.md Blockers; real-Postgres re-run recommended before merge)
[x] 7.4: Feature-toggle check (rollup 30m)
    [x] 7.4.1: Verify toggle disables the UI entry point cleanly without breaking the app - Est: 30m - TDD: Integrate
[x] 7.5: Traceability & evidence (rollup 30m)
    [x] 7.5.1: Confirm AC traceability complete and attach test/coverage evidence - Est: 30m - TDD: Integrate
[ ] 7.6: Prepare for review (rollup 45m)
    [ ] 7.6.1: Self-review the slice; write PR description referencing each AC - Est: 45m - TDD: Integrate (self-review captured in evidence.md; PR creation is the orchestrator's create-pr flow, not this Developer session)

---

## Blockers and Dependencies

**Blockers**:
- None remaining — `tech-design.md` has landed and all task details (migration tooling, endpoint paths, RBAC guard, audit_log mechanism, feature-toggle mechanism, table/column names) are finalized and resolved.
- Reference data (source-master and model-master rows) must be present in dev/test environments, or fixtures (Step 0.2.2) must seed them, before referential-validation (Step 2.2) and dropdown tests (Step 5.2) can pass — this is routine test setup, not an open decision.

**Dependencies** (task ordering):
- Step 1 (schema/migration/repository) precedes Steps 2 and 3.
- Step 2.1/2.2 (domain + referential validation) precede Step 2.3 (service); Step 2.3 precedes Step 2.4/2.5.
- Steps 2 and 3 (endpoints) precede Step 4 (contract docs).
- Step 4 (contract) precedes Step 5.1 (typed client generated/typed against the contract); Step 3 (read paths) precedes Step 5.2 (dropdowns) and Step 5.4 (list reflection).
- Steps 2, 3, 5 precede Step 6 (traceability + integration pass); Step 6 precedes Step 7 (quality gates & handoff).
- External: authenticated session context supplying `user_id`, role, `location_id`, `dealer_group_id` (ADR-004); existing source master (`source_id` FK) and vehicle/model master (`model_id` FK); `audit_log` table (append-only, ADR-009); OpenAPI 3.1 contract of record (ADR-006).

**Open Questions** (all resolved — see decisions.md Phase 4 for full record):
> **[RESOLVED]**: Migration tooling is TypeORM migrations.
> **[RESOLVED]**: `lead_id` is a DB-default UUID (internal id only).
> **[RESOLVED]**: No existing RBAC/capability model to reuse — this Story defines a minimal deny-by-default "create-lead" capability for the DSE role.
> **[RESOLVED]**: No existing audit service to reuse — this Story defines a minimal `audit_log` write (append-only, `action=LEAD_CREATED`) in the same transaction as the Lead insert.
> **[RESOLVED]**: Source-list and model-master read endpoints do not exist — this Story adds thin read endpoints for both.
> **[RESOLVED]**: Error-response format is a simple `{ field, message }[]` array — no elaborate project-wide envelope this Story.
> **[RESOLVED]**: Owner-scoped list is newest-first with a simple limit; full pagination deferred.
> **[RESOLVED]**: India mobile rule is 10 digits, leading 6–9, country-code prefixes rejected (not stripped).
> **[RESOLVED]**: `configurable_fields` JSONB defaults to `{}`; no validation this Story (provisioned only).
> **[RESOLVED]**: `dealer_group_id` is required (NOT NULL) on Lead, always present in a DSE session per ADR-003/004.
> **[RESOLVED]**: Feature-toggle mechanism is a simple config/env flag (no existing toggle service).
> **[RESOLVED]**: No existing DSE Lead list/queue view to extend — this Story builds a net-new minimal list.

---

## Progress Tracking

**Total Leaf Tasks**: 81
**Completed**: 77
**Remaining**: 4 (2.6.1 correlation-id logging, 3.4.1 read-path helper consolidation, 4.2.2 static OpenAPI artifact, 7.6.1 PR creation — see evidence.md Next Steps)
**Estimated Total Time**: ~48.5 hours (2910 minutes; ≈ 6–6.5 dev-days)

**Estimate by TDD phase (approx.)**:
- Setup: ~5h 45m
- Red: ~13h 45m
- Green: ~14h 15m
- Refactor: ~3h 15m
- Integrate: ~7h 45m
- Red/Green (mixed, Step 6.2): ~1h

**Per-step rollup**:
- Step 0 (Setup & Alignment): 3h 45m
- Step 1 (Data & Migration): 5h 30m
- Step 2 (Create-Lead Contract & Validation): 12h 45m
- Step 3 (Supporting Read Paths): 5h 45m
- Step 4 (API Contract Documentation): 2h 30m
- Step 5 (Frontend Form & Queue): 10h
- Step 6 (Testing & Traceability): 4h 45m
- Step 7 (Quality Gates & Handoff): 3h 30m

---

**Status**: ✅ Implementation substantially complete (77/81 leaf tasks; see evidence.md)

*Detailed breakdown generated during Phase 4 (Design), expanding the Level 1 flow into ≤ 2-hour, TDD-cadenced, estimated tasks, fully re-baselined against the frozen `tech-design.md`. Update checkboxes as work progresses in Phase 6 (Implementation).*
