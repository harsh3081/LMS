# Implementation Specification

> **Instructions**: This specification is technology-agnostic. It captures intent, scope, validation, and blast radius; concrete tooling is deferred to Phase 4 (tech-design.md) and is only pointed to here via tech-stack tags. This is the deep-dive that expands the frozen Phase 2 `analysis.md` — it does not re-open its resolved decisions.

**Issue**: #24
**Title**: [Story] Create a New Lead
**Parent Feature**: #7 — Lead & Enquiry Creation and Duplicate Management
**Traces To**: FR-01
**Created**: 2026-07-16

---

## Objective

- **Primary Goal**: Enable a Dealer Sales Executive (DSE) to capture a new Lead via a "New Lead" form and a documented REST endpoint, persisting a uniquely-identified, owner-scoped Lead record from the four minimum mandatory fields (customer name, mobile number, source, model of interest), and surfacing it immediately in the DSE's own Lead list/queue.
- **Context**: This is the foundational create-path for the Lead entity and the first functional slice of the Lead & Enquiry lifecycle (FR-01). It establishes the create contract that later stories (qualification/conversion FR-02, duplicate management FR-06, configurable mandatory fields FR-04) build on. It fits the established, API-first LMS layered architecture — SPA (Frontend) → Backend API (Experience/Services, single enforcement point for authN, RBAC, and tenant scoping) → relational store (Data) — per the project design set `.phoenix-os/project/specs/design/lms-1/` (tech-design.md; ADR-001/002/003/006/009).
- **Constraints & Assumptions**:
  - Owner (creating DSE), `location_id`, `dealer_group_id`, created-by/on, unique `lead_id`, and initial status "New" are auto-captured server-side from the authenticated session and are never accepted from the client (ADR-003, ADR-009).
  - Lead creation and reads are exposed on the published OpenAPI contract; the SPA consumes the same contract as any future consumer — no privileged path (ADR-006).
  - Mobile validation is India 10-digit format (resolved in analysis); duplicate-on-mobile detection is fully deferred to sibling story FR-06 — this Story performs no duplicate check and adds no mobile uniqueness constraint.
  - `source` is chosen from an existing configured lead-source list (this Story consumes it; it does not seed or administer it). `model of interest` is selectable from the vehicle/model master (controlled list), not free-text (both resolved in analysis).
  - This Story introduces the Lead table and its migration — no prior Lead schema exists.
  - This Story targets only the four minimum mandatory fields; the JSONB configurable-fields mechanism (ADR-002/FR-04) is provisioned in the schema but its configuration/UI is out of scope.
  - Input is validated at the API boundary; every create writes an `audit_log` entry and emits structured logs (principal-guidelines: validate at boundaries; ADR-009).
  - Test approach follows architecture guidance: prefer integration tests over mocked unit tests; ≥ 80% coverage; each AC maps to at least one test.

## Solution Outline

- **Approach Overview**: Deliver a thin, well-tested vertical slice through the layered architecture. A create-Lead endpoint on the Backend API validates the four mandatory fields (presence + mobile format + referential validity of source and model against their masters), enforces the caller's DSE capability and tenant scope, generates a unique identifier, auto-populates owner/tenant/audit metadata and default status "New", and persists the Lead in one transaction alongside an audit entry. Supporting read paths supply the source list and model master for the form and return the DSE's own Lead list/queue. The SPA renders the form with inline validation mirroring the server rules, submits, and refreshes/inserts the new Lead into the DSE's list on success.
- **Key Activities**:
  1. Introduce the Lead persistence schema (table + reversible migration) with tenant-scoping columns, owner, audit metadata, status, unique identifier, and a JSONB column reserved for future configurable fields.
  2. Implement the create-Lead contract: request DTO (client-supplied fields only), server-side validation (presence, mobile format, referential checks against source and model masters), RBAC/tenant enforcement, unique-ID generation, server-derived owner/tenant/status/audit, transactional persist + audit write, and OpenAPI documentation.
  3. Provide/confirm read paths: source-list retrieval and model-master retrieval for the form, and the owner-scoped Lead list/queue used by AC6.
  4. Build the "New Lead" form in the SPA with inline validation, submit/success/error handling, and immediate reflection of the created Lead in the DSE's list/queue.
  5. Cover the slice with integration and UI tests traceable to each of the seven acceptance criteria.
- **Success Criteria** (traceable to ACs):
  - AC1: DSE can open the "New Lead" form and submit with name, mobile, source, and model of interest.
  - AC2: Submission is blocked with field-level inline errors when any of the four mandatory fields is missing (enforced on both client and server).
  - AC3: On success, a Lead is created with a unique identifier.
  - AC4: Mobile number is validated to the agreed format before persistence (and mirrored inline on the form).
  - AC5: Source is chosen from the configured lead-source list (e.g., Walk-in, Referral, Call, Online) and validated server-side against that list.
  - AC6: The created Lead appears in the creating DSE's Lead list/queue immediately after creation.
  - AC7: Lead creation is exposed via a documented REST endpoint on the OpenAPI contract.
  - Cross-cutting: owner/`location_id`/`dealer_group_id`/created-by-on/status "New" auto-captured server-side; audit entry written on create; ≥ 80% coverage.

## Affected Work Areas

- **Domains / Components**:
  - Frontend (SPA): "New Lead" form (fields, inline validation, submit/success/error states); entry point to open the form; source and model dropdowns populated from read paths; refresh/insert into the DSE Lead list/queue on success.
  - Backend API — Lead & Enquiry module: create-Lead controller/service/DTO; presence + mobile-format + referential validation; deny-by-default authorization guard (DSE create-Lead capability); tenant-scope enforcement at the data-access choke-point; unique-ID generation; server-derived owner/tenant/status/audit; transactional persist; OpenAPI annotations.
  - Backend API — read paths: source-list endpoint and model-master endpoint for the form; owner-scoped Lead list/queue endpoint (confirm pre-existing vs introduced here — see Open Questions).
  - Data (relational store): new Lead table + reversible migration with `location_id`/`dealer_group_id` scoping, owner, created-by/on, status, unique identifier, and reserved JSONB configurable-fields column; supporting index for the owner-scoped list query.
  - Cross-cutting: boundary input validation; `audit_log` entry on create; structured logging with correlation.
- **External Dependencies / Interfaces**:
  - Authenticated session context providing the caller's `user_id`, role, `location_id`, and `dealer_group_id` (ADR-004) — source of all server-derived fields.
  - Existing configured lead-source list (representation to confirm — see Open Questions).
  - Vehicle/model master providing the selectable model-of-interest list (availability and representation in Phase 1 to confirm — see Open Questions).
  - `audit_log` table (append-only; ADR-009) and the OpenAPI 3.1 contract of record (ADR-006).

## Test Strategy

- **Quality Gates**:
  - ≥ 80% line coverage (≥ 75% branch) on the new create path, achieved through actual execution (architecture guidance).
  - All quality gates green; each of the seven ACs maps to at least one automated test (traceability).
  - Boundary validation, RBAC, and tenant-scope behaviors explicitly asserted, not assumed.
- **Validation Methods**:
  - Backend integration tests (preferred over mocked unit tests): happy-path create; each of the four missing-mandatory-field cases; invalid mobile format; source not in configured list; model not in master; unauthenticated (reject); wrong-role/insufficient-capability (reject); tenant scoping (owner/`location_id`/`dealer_group_id` derived from session, not client); unique-identifier assignment; default status "New"; audit entry written; OpenAPI contract exposes the endpoint.
  - Frontend tests: inline error for each missing field and invalid mobile; source and model dropdowns render from their read paths; successful submit; created Lead appears in the DSE list/queue (AC6).
- **Data / Scenario Considerations**:
  - Seeded/available source-list and model-master fixtures for referential-validation and dropdown tests.
  - Multiple DSEs across different `location_id`s to prove owner + tenant scoping (a DSE sees only their own leads in their location).
  - Duplicate mobile numbers are permitted (no uniqueness check this Story) — assert that a second Lead with the same mobile is accepted, to guard against premature FR-06 coupling.
  - Boundary mobile inputs (too short/long, non-numeric, disallowed leading digit) exercised against the agreed India 10-digit rule.

## Blast Radius

- **Potential Impact Areas**:
  - New Lead table/migration — foundational shared schema consumed by sibling stories (FR-02/FR-04/FR-05/FR-06); schema shape and migration reversibility carry the most downstream weight.
  - OpenAPI contract — additive new endpoint(s); consumed by the SPA and any future API consumer.
  - DSE Lead list/queue view — new or extended; if a list path already exists, changes must not regress it.
  - `audit_log` — additional append-only writes on create.
  - Read-only coupling to source-list and model-master data — behavior depends on that reference data being present in each environment.
- **Mitigation Strategies**:
  - Keep the change additive: introduce the Lead table without altering existing tables; no modification to conversion/follow-up flows (none consume Lead yet).
  - Provision (not implement) the JSONB configurable-fields column now to avoid a breaking migration when FR-04 lands (design-for-evolution, without over-engineering).
  - Do not add a mobile uniqueness constraint or duplicate logic — leave that surface entirely to FR-06 to avoid rework and premature coupling (YAGNI).
  - Validate source and model referentially so bad reference data fails fast at the boundary with a clear error rather than persisting an invalid Lead.
  - Enforce tenant scope and owner derivation at the single data-access choke-point, covered by explicit tests, so the create-path cannot leak across locations.
- **Rollback / Contingency Notes**:
  - Migration must be reversible (down-migration drops the Lead table/index) since this Story introduces the schema; no data backfill is required.
  - The feature is a self-contained additive slice — reverting the endpoint, form, and migration removes the capability cleanly with no impact on other modules.
  - Prefer a feature toggle for the "New Lead" entry point so the UI surface can be disabled independently of a code rollback (deployment principle: feature toggles for safe rollout).

---

## Tech Stack Guidance

> **Instructions**: Pointers only — Tech-Lead reads these in Phase 4 to produce tech-design.md. No implementation detail here. The project design set has already fixed the stack via ADR-001/002/003/006; the tags below point to the corresponding memory so Phase 4 stays consistent with those decisions.

**Recommended Tech Stack Tags**:
- Frontend: `.phoenix-os/core/memory/practices/tech-stack/react.md`
- Backend: `.phoenix-os/core/memory/practices/tech-stack/nodejs.md`
- Database: `.phoenix-os/core/memory/practices/tech-stack/postgresql.md`
- Stack defaults / decision context: `.phoenix-os/core/memory/practices/tech-stack/corporate-defaults.md`, `.phoenix-os/core/memory/practices/tech-stack/stack-decision-heuristics.md`

**Architecture Guidance**:
- Principles: `.phoenix-os/core/memory/practices/architecture/principal-guidelines.md` (API-first, validate-at-boundaries, separation of concerns, design-for-unit-testing, security/least-privilege)
- Layering: `.phoenix-os/core/memory/practices/architecture/arch-layered.md`, `.phoenix-os/core/memory/practices/architecture/arch-frontend.md`
- Project design set (authoritative for this feature): `.phoenix-os/project/specs/design/lms-1/tech-design.md` and `./adr/ADR-001.md`, `ADR-002.md`, `ADR-003.md`, `ADR-006.md`, `ADR-009.md`

**Best Practices**:
- Coding & testing standards: `.phoenix-os/core/memory/practices/best-practices/tdd.md`, `.phoenix-os/core/memory/practices/best-practices/testing.md` (prefer integration over mocked unit tests; ≥ 80% coverage; Inside-Out TDD default — confirm cadence in Phase 4)

---

## Open Questions (for interview loop)

> Deep-dive questions surfaced beyond the Phase 2 resolved decisions. Each carries a recommended default so Phase 4 can proceed if confirmed.

> **[RESOLVED]**: Source is a foreign key (`source_id`) to a database-backed source master, for referential integrity and future source-wise reporting.
> **[RESOLVED]**: Consume the existing Phase-1 vehicle/model master via `model_id` FK on Lead (not a denormalized label).
> **[RESOLVED]**: This Story introduces a minimal owner-scoped Lead list/queue endpoint, since none exists from prior work.
> **[RESOLVED]**: The internal unique `lead_id` is sufficient for AC3; a human-readable lead reference/display number is deferred.

---

**Status**: ❄️ Frozen (Source of Truth)

*This specification was generated during Phase 3 (Prepare) and is frozen as a source of truth after user approval. It will not be modified after approval.*
