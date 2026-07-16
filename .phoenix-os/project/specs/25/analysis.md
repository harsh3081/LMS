# Implementation Specification — Initial Analysis

> **Instructions**: This document is the initial (shallow) analysis for this Story — problem identification, scope, impacted areas, and high-level risk. It uses the `spec.md` template structure but is intentionally NOT the deep-dive spec: detailed component/data/integration design, exhaustive test matrices, and full blast-radius analysis follow in Phase 3 (Prepare) and Phase 4 (Design). No code samples or concrete tooling decisions here.

**Issue**: #25
**Title**: [Story] Convert a Lead into an Enquiry
**Type**: Story
**Parent Feature**: #7 — Lead & Enquiry Creation and Duplicate Management
**Traces To**: FR-02
**Created**: 2026-07-16

---

## Objective

- **Primary Goal**: Enable a Dealer Sales Executive (DSE) to convert an existing open Lead into an Enquiry by capturing qualifying details (budget, variant, exchange interest, finance interest), creating a new Enquiry record linked back to the originating Lead, marking the source Lead as "Converted", and recording who converted it and when — exposed via a documented REST endpoint.
- **Context**: This is the second functional slice of the Lead & Enquiry lifecycle (FR-02) under Feature #7, building directly on the Lead entity, auth/RBAC, tenant-scoping, and transactional persist+audit conventions established and merged by Story #24 (Create a New Lead). It introduces the **Enquiry** entity and the qualification/conversion transition that moves a genuinely-interested customer from the Lead stage into the active sales pipeline. It fits the established API-first LMS layered architecture — React (Vite) SPA (Frontend) -> NestJS/TypeScript Backend API (Experience/Services; single enforcement point for authN, RBAC, tenant scoping) -> PostgreSQL (Data) — per the project design set `.phoenix-os/project/specs/design/lms-1/` (ADR-001/002/003/006/009).
- **Constraints & Assumptions**:
  - Reuses #24's conventions verbatim: UUID primary keys, `location_id` + `dealer_group_id` tenant scoping, owner/created-by/audit metadata server-derived from the authenticated `Principal` (never from the client DTO — ADR-003/009), transactional persist-plus-`audit_log` write, and the deny-by-default `SessionAuthGuard` + `@RequireCapability` RBAC pattern.
  - Conversion is a state transition on an **existing** Lead: it reads a Lead the caller owns/can access, validates it is eligible (open, not already converted), and creates a linked Enquiry — all in a single atomic transaction with the source-Lead status update and audit entry.
  - Conversion is blocked until all qualifying fields are captured (AC3); validation occurs at the API boundary (and mirrored inline on the SPA form).
  - A new capability (e.g., `convert-lead`) gates the endpoint, mirroring #24's `create-lead` capability wiring.
  - The Lead entity's `status` gains a "Converted" value; the Lead table already exists (introduced by #24), so this Story **alters/extends** existing schema and **adds** the new Enquiry table via a new reversible migration.
  - Duplicate management (FR-06) and configurable mandatory fields (FR-04) remain out of scope; the Enquiry provisions a JSONB custom-fields column for future FR-04 evolution (as the Lead did) without implementing it.

## Solution Outline

- **Approach Overview**: Deliver a thin, well-tested vertical slice that adds the Enquiry entity and the Lead->Enquiry conversion transition through the existing layered architecture. A conversion endpoint on the Backend API loads the target open Lead within the caller's tenant scope, validates presence of all qualifying details, enforces the DSE conversion capability, and — in one transaction — creates a new Enquiry (linked to the originating Lead, stamped with converting DSE + timestamp, owner/tenant metadata server-derived), flips the source Lead's status to "Converted", and writes an `audit_log` entry. The SPA exposes a "Convert to Enquiry" action from the Lead queue/detail, renders the qualifying-details form with inline validation mirroring the server rules, submits, and reflects the Lead's new "Converted" state on success.
- **Key Activities** (high-level; not detailed design):
  1. Introduce the Enquiry persistence schema (new `enquiries` table + reversible migration): FK link to the originating Lead, qualifying fields (budget, variant, exchange interest, finance interest), converting-DSE + conversion-timestamp, owner/tenant scoping, status, and a reserved JSONB custom-fields column.
  2. Extend the Lead lifecycle: introduce the "Converted" status value and the semantics of a Lead no longer being treated as "open" once converted (queue/eligibility impact).
  3. Implement the conversion contract: request DTO (qualifying fields only), boundary validation (all fields present + value rules), RBAC (`convert-lead`) + tenant-scope enforcement, eligibility check (Lead exists, accessible, and not already converted), transactional create-Enquiry + mark-Lead-Converted + audit write, and OpenAPI documentation.
  4. Build the SPA "Convert to Enquiry" action + qualifying-details form with inline validation, submit/success/error handling, and reflection of the Lead's Converted state (behind a feature flag, mirroring #24).
  5. Cover the slice with integration and UI tests traceable to each of the seven acceptance criteria.
- **Success Criteria** (traceable to ACs):
  - AC1: DSE can select an existing open Lead and initiate a "Convert to Enquiry" action.
  - AC2: Conversion form/endpoint requires the qualifying details — budget, variant, exchange interest, finance interest.
  - AC3: Conversion is blocked (rejected with field-level errors) until all qualifying fields are captured — enforced server-side and mirrored on the client.
  - AC4: On success an Enquiry record is created and linked back to the originating Lead.
  - AC5: The original Lead is marked "Converted" and is no longer treated as an open Lead.
  - AC6: Conversion timestamp and converting DSE are recorded on the new Enquiry.
  - AC7: Conversion is exposed via a documented REST endpoint on the OpenAPI contract.
  - Cross-cutting: owner/`location_id`/`dealer_group_id` server-derived on the Enquiry; audit entry written on conversion; >= 80% coverage; each AC maps to at least one test.

## Affected Work Areas

- **Domains / Components** (high-level scope, not detailed design):
  - **Frontend (React SPA)**: "Convert to Enquiry" entry point from the Lead queue/detail (`LeadQueue`/related components); new conversion form for the four qualifying fields with inline validation and submit/success/error states; a conversion API hook (mirroring `useLeads`); reflection of the Lead's "Converted" state; likely a new feature flag consumed via `useFeatureFlags`.
  - **Backend API — new Enquiry / conversion module**: conversion controller/service/repository/DTOs; boundary validation of qualifying fields; `convert-lead` capability guard; tenant-scoped load of the source Lead; eligibility (open / not-already-converted) check; transactional create-Enquiry + mark-Lead-Converted + audit; OpenAPI annotations.
  - **Backend API — Leads module (extended)**: introduce the "Converted" status; adjust the owner-scoped Lead queue/eligibility semantics so a converted Lead is no longer surfaced as open (AC5); a tenant-scoped single-Lead read may be needed to back the conversion action.
  - **Data (PostgreSQL)**: new `enquiries` table + reversible migration (Lead FK, qualifying fields, converting-DSE + timestamp, `location_id`/`dealer_group_id` scoping, owner, status, reserved JSONB); the existing `leads` table participates via the status transition (no destructive change).
  - **Cross-cutting**: boundary input validation; `audit_log` entry on conversion (new action, e.g., `LEAD_CONVERTED`); structured logging.
- **External Dependencies / Interfaces**:
  - Authenticated session context (`Principal`: `userId`, `role`, `locationId`, `dealerGroupId`, `capabilities`) — the sole source of server-derived owner/tenant/converting-DSE fields (ADR-003/004).
  - Existing `leads` table and Lead module (from #24) — the conversion source.
  - Vehicle/model master and any "variant" reference data (representation to confirm — see Open Questions).
  - `audit_log` table (append-only; ADR-009) and the OpenAPI 3.1 contract of record (ADR-006).

## Test Strategy (high-level)

- **Quality Gates**:
  - >= 80% line coverage on the new conversion path, achieved through actual execution (architecture guidance).
  - Each of the seven ACs maps to at least one automated test (traceability); boundary validation, RBAC, tenant-scope, and eligibility behaviors explicitly asserted.
- **Validation Methods**:
  - Backend integration tests (preferred over mocked unit tests): happy-path conversion (Enquiry created, linked, Lead marked Converted, timestamp + DSE recorded); each missing-qualifying-field case (blocked); attempt to convert an already-Converted / non-eligible Lead (rejected); unauthenticated (reject); insufficient-capability (reject); cross-tenant/other-owner Lead not convertible; audit entry written; atomicity (Enquiry + Lead status + audit committed together, rolled back together); OpenAPI exposes the endpoint.
  - Frontend tests: inline error for each missing qualifying field; convert action visible only for eligible/open Leads; successful conversion updates the Lead's displayed state.
- **Data / Scenario Considerations**:
  - Seeded Leads across multiple owners/`location_id`s to prove owner + tenant scoping of the conversion.
  - Boundary/representation cases for the qualifying fields once their types are confirmed (see Open Questions).

## Blast Radius (high-level)

- **Potential Impact Areas**:
  - Shared `leads` schema/behavior — introducing "Converted" status and open/eligibility semantics touches the queue query established in #24; must not regress the create-Lead slice or the DSE queue.
  - New `enquiries` table/migration — foundational shared schema consumed by later Feature #7 stories; shape and reversibility carry downstream weight.
  - OpenAPI contract — additive new endpoint(s) consumed by the SPA and future consumers.
  - `audit_log` — additional append-only writes on conversion.
- **Mitigation Strategies** (high-level; deep analysis deferred to Prepare):
  - Keep the change additive: add the Enquiry table and the status value without destructive changes to the `leads` table; reuse #24's transactional persist+audit and tenant-scope choke-point rather than introducing new patterns.
  - Enforce eligibility and idempotency (no double-conversion) so the transition is safe and repeatable.
  - Feature-flag the SPA conversion entry point so the UI surface can be disabled independently of a code rollback (mirroring #24's `newLeadEnabled`).
- **Rollback / Contingency**:
  - New migration must be reversible (down drops the `enquiries` table; the "Converted" status is additive/data-only). Deep rollback/backfill analysis is deferred to the Prepare phase.

---

## Tech Stack Guidance

> **Instructions**: Pointers only — Tech-Lead reads these in Phase 4 to produce tech-design.md. No implementation detail here. The stack is already fixed by the project design set (ADR-001/002/003/006) and by #24's merged implementation; the tags below keep Phase 4 consistent with those decisions.

**Recommended Tech Stack Tags**:
- Frontend: `.phoenix-os/core/memory/practices/tech-stack/react.md`
- Backend: `.phoenix-os/core/memory/practices/tech-stack/nodejs.md` (NestJS)
- Database: `.phoenix-os/core/memory/practices/tech-stack/postgresql.md`
- Stack defaults / decision context: `.phoenix-os/core/memory/practices/tech-stack/corporate-defaults.md`, `.phoenix-os/core/memory/practices/tech-stack/stack-decision-heuristics.md`

**Architecture Guidance**:
- Principles: `.phoenix-os/core/memory/practices/architecture/principal-guidelines.md` (API-first, validate-at-boundaries, separation of concerns, design-for-unit-testing, least-privilege)
- Layering: `.phoenix-os/core/memory/practices/architecture/arch-layered.md`, `.phoenix-os/core/memory/practices/architecture/arch-frontend.md`
- Project design set (authoritative for this feature): `.phoenix-os/project/specs/design/lms-1/tech-design.md` and `./adr/ADR-001.md`, `ADR-002.md`, `ADR-003.md`, `ADR-006.md`, `ADR-009.md`
- Sibling-story precedent (established conventions to reuse): `.phoenix-os/project/specs/24/spec.md`, `.phoenix-os/project/specs/24/tech-design.md`

**Best Practices**:
- Coding & testing standards: `.phoenix-os/core/memory/practices/best-practices/tdd.md`, `.phoenix-os/core/memory/practices/best-practices/testing.md` (prefer integration over mocked unit tests; >= 80% coverage)

---

## Open Questions (for interview loop)

> Initial-analysis questions to resolve before the Phase 3 deep-dive spec. Each carries a recommended default so Phase 4 can proceed if confirmed.

> **[RESOLVED]**: `budget` = positive integer INR (whole rupees); `exchange interest`/`finance interest` = booleans; `variant` = free-text label (no new variant master this Story).
> **[RESOLVED]**: Conversion endpoint is a sub-resource action: `POST /api/v1/leads/{leadId}/convert`, returning the created Enquiry (201).
> **[RESOLVED]**: Any non-"Converted" Lead is eligible; re-converting an already-Converted Lead is rejected (409); Converted Leads are excluded from the open queue.
> **[RESOLVED]**: This Story delivers the conversion write-path + linkage only; standalone Enquiry list/detail GET is deferred to a later Story.
> **[RESOLVED]**: SPA "Convert to Enquiry" action + qualifying-details form is included, behind a new feature flag (mirroring #24's pattern).

---

**Status**: ❄️ Frozen (Source of Truth)

*This is the initial analysis generated during Phase 2 (Start Work). Deep-dive spec (components, data, integration, detailed test/blast-radius) follows in Phase 3/4. Please review and approve before proceeding; it is frozen as a source of truth after approval.*
