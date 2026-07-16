# Implementation Specification

> **Instructions**: This specification is technology-agnostic. It captures intent, scope, validation, and blast radius; concrete tooling is deferred to Phase 4 (tech-design.md) and is only pointed to here via tech-stack tags. This is the deep-dive that expands the frozen Phase 2 `analysis.md` — it does not re-open its resolved decisions.

**Issue**: #25
**Title**: [Story] Convert a Lead into an Enquiry
**Parent Feature**: #7 — Lead & Enquiry Creation and Duplicate Management
**Traces To**: FR-02
**Created**: 2026-07-16

---

## Objective

- **Primary Goal**: Enable a Dealer Sales Executive (DSE) to convert one of their existing, non-converted Leads into an Enquiry by capturing the qualifying details (budget, variant, exchange interest, finance interest), creating a new Enquiry record linked back to the originating Lead, marking the source Lead as "Converted" (so it leaves the open queue), and recording who converted it and when — exposed via a documented REST endpoint and a feature-flagged SPA action + form.
- **Context**: This is the second functional slice of the Lead & Enquiry lifecycle (FR-02) under Feature #7. It builds directly on the merged Story #24 (Create a New Lead), reusing its Lead entity, cookie-session auth, deny-by-default RBAC guard, `Principal`-derived tenant scoping, and single-transaction persist-plus-`audit_log` convention. It introduces the **Enquiry** entity and the qualification transition that moves a genuinely interested customer out of the Lead stage into the active sales pipeline. It fits the established API-first LMS layered architecture — React (Vite) SPA (Frontend) → NestJS/TypeScript Backend API (Experience/Services; the single enforcement point for authN, RBAC, and tenant scoping) → PostgreSQL (Data) — per the project design set `.phoenix-os/project/specs/design/lms-1/` (ADR-001/002/003/006/009) and the sibling-story precedent in `.phoenix-os/project/specs/24/`.
- **Constraints & Assumptions**:
  - Conversion is a **state transition on an existing Lead**, not a free-standing create: the endpoint reads a Lead the caller owns and can access under their tenant scope, verifies it is eligible (exists, in-scope, not already "Converted"), and creates the linked Enquiry — all in one atomic transaction with the source-Lead status flip and the audit write.
  - The conversion contract is a sub-resource action on the Lead: `POST /api/v1/leads/{leadId}/convert`, returning the created Enquiry with `201` (resolved in analysis). No standalone Enquiry list/detail (`GET`) is delivered this Story — the read side is deferred to a later Story.
  - The four qualifying fields carry fixed representations (resolved in analysis): `budget` = positive integer INR (whole rupees); `exchangeInterest` and `financeInterest` = booleans; `variant` = free-text label (no new variant master is introduced this Story).
  - Conversion is blocked until all qualifying fields are captured (AC2/AC3); validation occurs at the API boundary and is mirrored inline on the SPA form, exactly as #24 mirrored its field rules on both sides.
  - Owner, `location_id`, `dealer_group_id`, converting-DSE identity, conversion timestamp, unique `enquiry_id`, and initial Enquiry status are all **server-derived from the authenticated `Principal`** and are never accepted from the client DTO (ADR-003/009). The global `ValidationPipe` (`whitelist: true`) strips any extra body properties, so client-supplied ownership/status/linkage fields are silently ignored, never honored.
  - A new capability — `convert-lead` — gates the endpoint, mirroring #24's `create-lead` capability wiring on the same `SessionAuthGuard` + `@RequireCapability` pattern.
  - The Lead entity gains a "Converted" status value; the existing `leads` table (from #24) is **not destructively altered** — the status is a data-only value change. This Story **adds** a new `enquiries` table via a new reversible migration that follows the established numbering/style convention (`1700000000003-...`).
  - A converted Lead is excluded from the DSE's open queue (AC5); re-converting an already-"Converted" Lead is rejected with `409` (resolved in analysis).
  - Duplicate management (FR-06) and configurable mandatory fields (FR-04) remain out of scope; the Enquiry provisions a reserved JSONB custom-fields column for future FR-04 evolution (as the Lead did) without implementing it.

## Solution Outline

- **Approach Overview**: Deliver a thin, well-tested vertical slice that adds the Enquiry entity and the Lead→Enquiry conversion transition through the existing layered architecture, reusing #24's choke-points verbatim rather than inventing new patterns. A conversion endpoint on the Backend API loads the target Lead within the caller's tenant scope, enforces the `convert-lead` capability, validates presence and value rules for the four qualifying fields, checks eligibility (Lead exists, is in-scope, and is not already "Converted"), and — in one transaction — creates a new Enquiry (linked to the originating Lead, stamped with the converting DSE and a conversion timestamp, owner/tenant metadata server-derived, reserved JSONB provisioned), flips the source Lead's status to "Converted", and writes a single `audit_log` entry under a new `LEAD_CONVERTED` action. The existing owner-scoped Lead queue is adjusted to exclude "Converted" Leads so a converted Lead no longer appears as open. The SPA exposes a feature-flagged "Convert to Enquiry" action against each eligible Lead in the queue, renders the qualifying-details form with inline validation mirroring the server rules, submits, and on success reflects the Lead leaving the open queue.
- **Key Activities** (high-level; not detailed design):
  1. Introduce the Enquiry persistence schema (new `enquiries` table + reversible migration): FK link to the originating Lead, the four qualifying fields (budget integer, variant text, exchange/finance booleans), converting-DSE + conversion-timestamp, owner/`location_id`/`dealer_group_id` scoping, status, unique `enquiry_id`, and a reserved JSONB custom-fields column — following #24's migration numbering, column-style, and reversibility (pg-mem-compatible up/down) conventions.
  2. Extend the Lead lifecycle: add the "Converted" status value and adjust the owner-scoped queue/eligibility semantics so a converted Lead is no longer surfaced as open (AC5), without regressing the create-Lead slice.
  3. Implement the conversion contract: request DTO (the four qualifying fields only), boundary validation (presence + value rules), `convert-lead` RBAC + tenant-scope enforcement, tenant-scoped load of the source Lead, eligibility check (exists / in-scope / not already converted → `404`/`409` as appropriate), transactional create-Enquiry + mark-Lead-Converted + audit write, response mapping to an Enquiry response shape, and OpenAPI annotations.
  4. Extend the feature-flag mechanism with a new flag (mirroring #24's `newLeadEnabled` / `NEW_LEAD_ENABLED`) exposed through the existing `GET /api/v1/config` path, and build the SPA "Convert to Enquiry" action + qualifying-details form (inline validation, submit/success/error handling, reflection of the Lead's converted state) behind that flag, reusing the existing UI primitives and query/mutation hook patterns.
  5. Cover the slice with backend integration tests and frontend UI tests, each traceable to one of the seven acceptance criteria, at ≥ 80% coverage.
- **Success Criteria** (traceable to ACs):
  - AC1: A DSE can select one of their existing open Leads and initiate a "Convert to Enquiry" action.
  - AC2: The conversion form/endpoint requires the qualifying details — budget, variant, exchange interest, finance interest.
  - AC3: Conversion is blocked (rejected with field-level errors) until all qualifying fields are captured — enforced server-side and mirrored inline on the client.
  - AC4: On success, an Enquiry record is created and linked back to the originating Lead.
  - AC5: The original Lead is marked "Converted" and is no longer treated as an open Lead (excluded from the DSE's open queue).
  - AC6: The conversion timestamp and the converting DSE are recorded on the new Enquiry.
  - AC7: Conversion is exposed via a documented REST endpoint on the OpenAPI contract.
  - Cross-cutting: owner/`location_id`/`dealer_group_id` server-derived on the Enquiry; an `audit_log` entry is written on conversion; re-conversion is rejected; ≥ 80% coverage; each AC maps to at least one test.

## Affected Work Areas

- **Domains / Components**:
  - **Frontend (React SPA)**: a feature-flagged "Convert to Enquiry" entry point rendered against each eligible Lead in the existing owner queue (the queue currently exposes no per-row action and does not surface `leadId` — both are extended here); a new conversion form for the four qualifying fields (integer budget, free-text variant, two booleans) with inline validation and submit/success/error states, reusing the existing UI primitives (`FormField`, `TextInput`, `Select`/checkbox, `Button`, `Card`) and the `react-hook-form` + TanStack Query patterns; a new conversion mutation hook (mirroring `useCreateLead`) that reflects the source Lead leaving the open queue on success; extension of the feature-flags read (`useFeatureFlags` / `api.getConfig`) with the new flag; a new typed API-client method and Enquiry/Input types.
  - **Backend API — conversion/Enquiry write path**: the `POST /api/v1/leads/{leadId}/convert` handler (whether hosted on the existing Leads controller or a new Enquiry module — a Phase 4 structural decision); a conversion DTO (qualifying fields only); boundary validation of the qualifying fields; `convert-lead` capability guard on the deny-by-default `SessionAuthGuard`; tenant-scoped load of the source Lead; eligibility check (exists / in-scope / not already converted); transactional create-Enquiry + mark-Lead-Converted + `LEAD_CONVERTED` audit write; Enquiry response mapping; OpenAPI annotations.
  - **Backend API — Leads module (extended)**: introduce the "Converted" status constant; adjust the owner-scoped queue read so converted Leads are excluded (AC5); expose the ability to load a single owner/tenant-scoped Lead by id to back the conversion (the repository currently offers only `findOwnQueue`).
  - **Data (PostgreSQL)**: new `enquiries` table + reversible migration (Lead FK, four qualifying fields, converting-DSE + timestamp, `location_id`/`dealer_group_id` scoping, owner, status, unique id, reserved JSONB); the existing `leads` table participates only via the additive status-value transition (no schema-destructive change).
  - **Cross-cutting**: boundary input validation reusing the shared `ValidationPipe` + `{field,message}[]` error convention; a new eligibility/conflict error mapped to `409` (and not-found to `404`), aligned with the existing `ReferentialValidationError`/filter pattern; append-only `audit_log` write under the new `LEAD_CONVERTED` action; structured logging.
- **External Dependencies / Interfaces**:
  - Authenticated session context (`Principal`: `userId`, `role`, `locationId`, `dealerGroupId`, `capabilities`) — the sole source of server-derived owner/tenant/converting-DSE fields (ADR-003/004). Requires the `convert-lead` capability to be present on the DSE principal (seed/fixture consideration for tests).
  - Existing `leads` table and Lead module (from #24) — the conversion source.
  - `audit_log` table (append-only; ADR-009) and the OpenAPI 3.1 contract of record served at `/api` / `/api-json` (ADR-006).
  - No dependency on any variant master (variant is free-text this Story) and no dependency on a standalone Enquiry read path (deferred).

## Test Strategy

- **Quality Gates**:
  - ≥ 80% line coverage on the new conversion path, achieved through actual execution (architecture guidance), using the established pg-mem-backed integration harness (`test/support/test-app.ts`, `test-data-source.ts`).
  - Each of the seven ACs maps to at least one automated test (traceability); boundary validation, RBAC, tenant-scope, eligibility/conflict, and atomicity behaviors explicitly asserted, not assumed.
- **Validation Methods**:
  - Backend integration tests (preferred over mocked unit tests): happy-path conversion (Enquiry created, linked to the source Lead, Lead flipped to "Converted", timestamp + converting DSE recorded, `201` with the Enquiry body); each missing-qualifying-field case (blocked with field-level `400`); invalid budget (non-positive / non-integer) rejected; convert a non-existent or out-of-scope/other-owner Lead (`404`, not convertible); re-convert an already-"Converted" Lead (`409`); unauthenticated (`401`); missing `convert-lead` capability (`403`); audit entry written under `LEAD_CONVERTED`; atomicity (Enquiry + Lead status + audit committed together and rolled back together on failure); converted Lead absent from the owner queue (AC5); the `/convert` endpoint present in the OpenAPI document (AC7).
  - Frontend tests: the convert action renders only for eligible/open Leads and only when the feature flag is on; inline error for each missing qualifying field mirroring the server rules; successful conversion removes the Lead from the displayed open queue; server field errors surfaced back onto the form.
  - Regression guard: the existing create-Lead and owner-queue integration tests remain green after the queue-exclusion change.
- **Data / Scenario Considerations**:
  - Seeded Leads across multiple owners/`location_id`s and a principal with vs. without the `convert-lead` capability, to prove owner + tenant scoping and RBAC of the conversion.
  - Boundary cases for `budget` (zero, negative, non-integer, large value) and explicit `true`/`false` for both boolean flags; variant as arbitrary free text.
  - A pre-"Converted" Lead fixture to exercise the `409` re-conversion path and the queue-exclusion assertion.

## Blast Radius

- **Potential Impact Areas**:
  - Shared `leads` schema/behavior — introducing the "Converted" status value and excluding converted Leads changes the owner-queue query established in #24; must not regress the create-Lead slice or the existing queue tests (`leads-queue.controller.spec.ts`).
  - New `enquiries` table/migration — foundational shared schema consumed by later Feature #7 stories (Enquiry read/list, duplicate management); its shape and reversibility carry downstream weight.
  - OpenAPI contract — an additive new endpoint consumed by the SPA and future consumers.
  - `audit_log` — additional append-only writes under a new action value.
  - Frontend queue component and API-client/type surface — the queue gains a per-row action and must expose `leadId`; the shared `getConfig` response type gains a field, touched by any consumer of `useFeatureFlags`.
- **Mitigation Strategies**:
  - Keep the change additive: add the `enquiries` table and the status **value** without destructive changes to `leads`; reuse #24's transactional persist+audit and tenant-scope choke-point rather than introducing new persistence patterns.
  - Enforce eligibility and non-idempotent-safety (reject double-conversion with `409`) so the transition is safe and cannot create duplicate Enquiries for one Lead.
  - Follow the exact migration authoring conventions from #24 (CREATE-TABLE-embedded index, raw-SQL reversible `down`, pg-mem-driver guard) so the new migration travels through both the real-Postgres and pg-mem paths.
  - Feature-flag the SPA conversion entry point (new flag mirroring `newLeadEnabled`) so the UI surface can be disabled independently of a code rollback.
  - Gate the queue-exclusion behaviour behind explicit regression tests so create-Lead / open-queue behaviour cannot silently break.
- **Rollback / Contingency Notes**:
  - The new migration must be reversible (down drops the `enquiries` table and its constraints/index); the "Converted" status is additive/data-only and needs no down step.
  - The feature is a self-contained additive slice — reverting the endpoint, form, flag, and migration removes the capability cleanly; the only cross-module touch (queue exclusion + `leadId`/`status` exposure) is small and test-guarded.
  - No data backfill is required; existing Leads simply remain in their current statuses.

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
- Sibling-story precedent (established conventions to reuse verbatim): `.phoenix-os/project/specs/24/spec.md`, `.phoenix-os/project/specs/24/tech-design.md`

**Best Practices**:
- Coding & testing standards: `.phoenix-os/core/memory/practices/best-practices/tdd.md`, `.phoenix-os/core/memory/practices/best-practices/testing.md` (prefer integration over mocked unit tests; ≥ 80% coverage; Inside-Out TDD default — confirm cadence in Phase 4)

---

## Open Questions (for interview loop)

> Deep-dive questions surfaced beyond the Phase 2 resolved decisions. Each carries a recommended default so Phase 4 can proceed if confirmed.

> **[RESOLVED]**: Enquiry `status` column defaults to `"New"`, reserved for a later Enquiry-lifecycle Story.
> **[RESOLVED]**: Converted Leads are excluded entirely from the open queue this Story; no converted-history view.
> **[RESOLVED]**: Convert-action is inline per eligible queue row with an inline/modal form (no new route).
> **[RESOLVED]**: Enquiry `201` response includes `enquiryId`, `leadId`, the four qualifying fields, converting-DSE id, conversion timestamp, `status`, owner/`locationId` — unmasked, mirroring `LeadResponseDto`.
> **[RESOLVED]**: Backend hosts the write path in a new Enquiry module/repository; route stays at `api/v1/leads/{leadId}/convert`.

---

**Status**: ❄️ Frozen (Source of Truth)

*This specification was generated during Phase 3 (Prepare) and is frozen as a source of truth after user approval. It will not be modified after approval.*
