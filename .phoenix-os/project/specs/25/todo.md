# Implementation TODO

> **Instructions**: Detailed Phase 4 (Design) breakdown for Story #25. Every actionable item is ≤ 2h and TDD-phase labelled (Setup, Red, Green, Refactor, Integrate). Cadence is Inside-Out (core/data-first → use case → contract → wiring → frontend → sweep → validation), consistent with #24. Parent-task estimates are rollups of their children; the grand total sums leaf tasks only. Check boxes track completion in Phase 6.

**Issue**: #25
**Title**: [Story] Convert a Lead into an Enquiry
**Created**: 2026-07-16
**Status**: ✅ Implementation Complete — all 40/40 leaf tasks done, all quality gates green (see evidence.md)

---

## Implementation Status Note (at-a-glance for reviewers)

**Completed 2026-07-16.** All 40 leaf tasks verified complete by direct orchestrator execution (the Developer agent stalled on a background watchdog timeout after writing all code+tests but before checking boxes/writing evidence; the orchestrator independently re-ran everything rather than rubber-stamping). Full record in `evidence.md`.

- **Tasks**: 40/40 complete across Steps 0–6.
- **Backend quality gate**: `tsc --noEmit` clean; Jest **126/126 passing** across 15 suites (includes full #24 regression suite — no regressions); coverage **98.32% stmts / 83.33% branch** (gate 80%/75% — exceeded).
- **Frontend quality gate**: `tsc -b` clean; Vitest **34/34 passing** across 7 files; coverage **98.52% stmts / 91.44% branch** (gate 80%/75% — exceeded).
- **Acceptance gate (combined Playwright suite)**: **80 passed, 2 skipped** of 82 (#24's 39 + #25's 43); the 2 skips are documented manual feature-toggle-restart companions that can't run in a single Playwright instance. Was 100% RED for #25 at Story start.
- **Environment caveat (carried forward from #24)**: tests run against `pg-mem` (in-memory Postgres substitute), not real PostgreSQL, as no local Postgres/Docker is available here. The new `enquiries` migration and its `UNIQUE(lead_id)` constraint are written as real TypeORM/Postgres constructs and should be re-verified against real Postgres 16 (`docker-compose.yml` provided) before merge — verification-depth note, not a defect. CC-16 (concurrent double-conversion race against the unique constraint) remains manual/unverified this session for the same reason.
- **One test-authoring bug found & fixed (NOT a product defect)**: a brittle Playwright locator in `convert-lead-form.spec.ts` (EVAL-AC5-03) used `.first()` and re-matched a different still-open Lead in the shared long-lived pg-mem queue after conversion. Fixed by seeding a uniquely-named Lead and targeting its row by customer name; the frozen EVAL-AC5-03 assertion is unchanged. API-level exclusion assertions already passed, confirming the application behavior was correct.

> **Grounded in tech-design.md**: This breakdown is reconciled against `tech-design.md` (Phase 4), which pins the concrete layout: a NEW `backend/src/enquiries/` module (controller/service/repository/entity/DTOs/errors) whose controller keeps the route on `@Controller('api/v1/leads')` `@Post(':leadId/convert')`; `LeadsRepository.findOwnedById` (all statuses, so the service can tell 404 from 409); a NEW `common/enquiry-eligibility.filter.ts`; and the resolved flag `convertLeadEnabled` / `CONVERT_LEAD_ENABLED`. tech-design.md is now ❄️ Frozen and all 7 clarifications are resolved (see decisions.md Phase 4).

---

## Task Breakdown

Step 0: Setup & Context Alignment
[x] 0.1: Reconcile this plan against the frozen spec + tech-design.md (module layout, `findOwnedById` semantics, filter, flag name) - Est: 30m - TDD: Setup
[x] 0.2: Resolve and seed the `convert-lead` capability for RBAC fixtures (Open Question Q8) - Est: 30m - TDD: Setup
    [x] 0.2.1: Decide capability-seeding approach (extend #24 test-users.json vs. new #25 fixture vs. seed override) - Est: 15m - TDD: Setup
    [x] 0.2.2: Apply chosen approach so a DSE principal carries `convert-lead` and a cap-lacking authenticated user exists for the 403 case - Est: 15m - TDD: Setup
[x] 0.3: Re-read the #24 reuse baseline (lead.entity, 1700000000002 migration, leads.service/repository/controller, referential-validation.filter, audit-log.repository, NewLeadForm, useLeads, api/client, feature-flags) - Est: 30m - TDD: Setup

Step 1: Data Layer — Enquiry schema & Lead status extension
[x] 1.1: Add the reversible `enquiries` migration - Est: 2h - TDD: Red/Green
    [x] 1.1.1: Extend migration.spec.ts with up/down assertions for `enquiries` (columns, FKs, unique lead_id, index, `down` drops cleanly under pg-mem) - Est: 45m - TDD: Red
    [x] 1.1.2: Author `1700000000003-CreateEnquiries.ts` in #24 style (`createTable(new Table({...}), true)`, embedded `indices`, raw-SQL `DROP TABLE IF EXISTS "enquiries" CASCADE` down): FKs to leads/users(converted_by, owner_id)/locations/dealer_groups; columns budget int, variant text, exchange_interest/finance_interest bool, converted_by, owner_id, location_id, dealer_group_id, status default 'New', custom_fields jsonb, converted_at/updated_at; UNIQUE(lead_id); index `idx_enquiries_owner_location_created` on (owner_id, location_id, converted_at) - Est: 1h - TDD: Green
    [x] 1.1.3: Run migration up/down against pg-mem harness; fix any driver-guard/reversibility gaps - Est: 15m - TDD: Refactor
[x] 1.2: Add the Enquiry entity - Est: 1.25h - TDD: Green
    [x] 1.2.1: Create `enquiries/entities/enquiry.entity.ts` mirroring LeadEntity (uuid PK, snake_case, `jsonbTransformer`, `converted_at` as `@CreateDateColumn`, `updated_at` as `@UpdateDateColumn`), exporting `ENQUIRY_STATUS_NEW = 'New'` - Est: 1h - TDD: Green
    [x] 1.2.2: Register EnquiryEntity in the entities list of data-source.ts and test-data-source.ts - Est: 15m - TDD: Green
[x] 1.3: Extend the Lead lifecycle with the "Converted" status - Est: 15m - TDD: Green
    [x] 1.3.1: Add `export const LEAD_STATUS_CONVERTED = 'Converted'` to lead.entity.ts (additive, data-only; no schema change) - Est: 15m - TDD: Green

Step 2: Backend — Conversion contract & use case
[x] 2.1: Conversion DTO + boundary validation - Est: 1.5h - TDD: Red/Green
    [x] 2.1.1: Write `convert-lead.dto.spec.ts` covering each qualifying-field rule (budget positive-integer incl. zero/negative/non-integer boundary, variant required non-empty, exchange/finance boolean, whitelist strips extras) - Est: 45m - TDD: Red
    [x] 2.1.2: Implement `enquiries/dto/convert-lead.dto.ts` (budget `@IsInt`+`@IsPositive`, variant `@IsString`+`@IsNotEmpty`, exchangeInterest/financeInterest `@IsBoolean`, `@ApiProperty` examples; leadId from path, never body) - Est: 45m - TDD: Green
[x] 2.2: Eligibility/conflict errors + HTTP mapping - Est: 1.25h - TDD: Red/Green
    [x] 2.2.1: Add `enquiries/enquiries.errors.ts` with `LeadNotFoundError` (→404) and `LeadAlreadyConvertedError` (→409), each carrying `FieldError[]` (reuse `leads/leads.errors.ts` FieldError) - Est: 30m - TDD: Green
    [x] 2.2.2: Add `common/enquiry-eligibility.filter.ts` `@Catch(LeadNotFoundError, LeadAlreadyConvertedError)` → 404/409 with `exception.errors` body; register in `app.factory.ts` `useGlobalFilters` alongside ReferentialValidationExceptionFilter - Est: 45m - TDD: Green
[x] 2.3: Repository extensions (scoped Lead load; Enquiry insert) - Est: 1.75h - TDD: Red/Green
    [x] 2.3.1: Write repository integration tests: `findOwnedById` returns the owner+tenant-scoped Lead across ALL statuses (out-of-scope → null; a Converted Lead is still returned so the service can distinguish 409 from 404); `EnquiriesRepository.insert` persists a linked row - Est: 45m - TDD: Red
    [x] 2.3.2: Add `LeadsRepository.findOwnedById(leadId, actor, manager?)` — `findOne` scoped by ownerId/locationId/dealerGroupId, no status filter - Est: 30m - TDD: Green
    [x] 2.3.3: Create `enquiries/enquiries.repository.ts` with `insert(data, manager?)` following LeadsRepository's `repo(manager)` transactional pattern - Est: 30m - TDD: Green
[x] 2.4: Conversion use case (EnquiriesService) - Est: 2.5h - TDD: Red/Green/Refactor
    [x] 2.4.1: Write service integration tests: happy path (Enquiry created+linked, Lead→Converted, converted_by+converted_at recorded), not-found/out-of-scope→404, already-Converted→409, `LEAD_CONVERTED` audit written, atomic rollback on failure - Est: 1.5h - TDD: Red
    [x] 2.4.2: Implement `EnquiriesService.convert(leadId, dto, actor)`: `findOwnedById` → null ⇒ LeadNotFoundError; `status === LEAD_STATUS_CONVERTED` ⇒ LeadAlreadyConvertedError; else single `dataSource.transaction` { insert Enquiry (owner/tenant/convertedBy/status/customFields server-derived), flip lead.status = Converted + save, audit `LEAD_CONVERTED` with before/after } → return Enquiry - Est: 1.5h - TDD: Green
    [x] 2.4.3: Refactor: extract the eligibility guard and shape the LEAD_CONVERTED before/after audit payload (Open Question Q6) - Est: 30m - TDD: Refactor
[x] 2.5: Controller + response DTO + OpenAPI - Est: 3h - TDD: Red/Green
    [x] 2.5.1: Write `convert.controller.spec.ts` supertest suite: 201 + full Enquiry body (AC1/AC2/AC4/AC6), missing/invalid field → 400 (AC3), already-Converted → 409, non-existent/out-of-scope → 404, unauthenticated → 401, missing `convert-lead` capability → 403 - Est: 1.5h - TDD: Red
    [x] 2.5.2: Implement `enquiries/dto/enquiry-response.dto.ts` + local `toResponse` (enquiryId, leadId, four qualifying fields, convertedBy, convertedAt ISO, status, ownerId, locationId — dealerGroupId intentionally excluded, mirroring LeadResponseDto) - Est: 30m - TDD: Green
    [x] 2.5.3: Implement `enquiries/enquiries.controller.ts` — `@Controller('api/v1/leads')`, `@Post(':leadId/convert')`, SessionAuthGuard, `@RequireCapability('convert-lead')`, `@HttpCode(201)`, `@Param('leadId')` + `@CurrentPrincipal` - Est: 1h - TDD: Green
    [x] 2.5.4: Add OpenAPI annotations (`@ApiTags('enquiries')`, `@ApiParam` leadId, `@ApiCreatedResponse({type: EnquiryResponseDto})`) - Est: 30m - TDD: Green

Step 3: Backend — Queue exclusion & wiring
[x] 3.1: Exclude "Converted" Leads from the owner queue (AC5) - Est: 1.25h - TDD: Red/Green
    [x] 3.1.1: Extend leads-queue.controller.spec.ts: a Converted Lead is absent from the queue; non-Converted still present (regression guard) - Est: 45m - TDD: Red
    [x] 3.1.2: Add `status: Not(LEAD_STATUS_CONVERTED)` (import `Not` from typeorm) to `LeadsRepository.findOwnQueue` without regressing ordering/scoping - Est: 30m - TDD: Green
[x] 3.2: Module wiring, feature flag, OpenAPI presence - Est: 1.5h - TDD: Green/Integrate
    [x] 3.2.1: Register EnquiriesController + EnquiriesService + EnquiriesRepository in `AppModule.forRoot` controllers/providers - Est: 30m - TDD: Green
    [x] 3.2.2: Add `FeatureFlagsService.isConvertLeadEnabled()` (`CONVERT_LEAD_ENABLED !== 'false'`) and return `convertLeadEnabled` from `ConfigController.getConfig` - Est: 30m - TDD: Green
    [x] 3.2.3: Extend openapi.controller.spec.ts to assert the `/api/v1/leads/{leadId}/convert` path is present in the document (AC7) - Est: 30m - TDD: Integrate

Step 4: Frontend — Conversion action, form & flag
[x] 4.1: API client + types - Est: 45m - TDD: Green
    [x] 4.1.1: Add `Enquiry` + `ConvertLeadInput` types, `api.convertLead(leadId, input)` (POST `/api/v1/leads/${leadId}/convert`), and extend `getConfig` return type with `convertLeadEnabled` - Est: 45m - TDD: Green
[x] 4.2: Conversion mutation hook - Est: 1.25h - TDD: Red/Green
    [x] 4.2.1: Write `useConvertLead` test: on success the source Lead is removed (filtered by leadId) from the cached queue - Est: 30m - TDD: Red
    [x] 4.2.2: Implement `hooks/useEnquiries.ts` `useConvertLead()` (TanStack mutation; onSuccess removes the converted Lead from LEADS_QUERY_KEY cache) - Est: 45m - TDD: Green
[x] 4.3: Feature-flag read extension - Est: 15m - TDD: Green
    [x] 4.3.1: Consume `convertLeadEnabled` via `useFeatureFlags` for gating the convert action - Est: 15m - TDD: Green
[x] 4.4: Conversion form component - Est: 3h - TDD: Red/Green
    [x] 4.4.1: Write `ConvertLeadForm` tests: inline required/valid error for each field (budget positive integer, variant non-empty, two booleans), successful submit, server field-errors surfaced back onto the form (mirroring NewLeadForm test pattern) - Est: 1.5h - TDD: Red
    [x] 4.4.2: Implement `components/ConvertLeadForm.tsx` with react-hook-form + UI primitives (TextInput budget, TextInput variant, exchange/finance as Yes/No `Select` per Open Question Q3), inline validation mirroring server rules, submit/success/error + server `setError` handling - Est: 1.5h - TDD: Green
[x] 4.5: Queue row action integration - Est: 3h - TDD: Red/Green/Refactor
    [x] 4.5.1: Write LeadQueue tests: the per-row "Convert to Enquiry" action renders only for non-Converted rows and only when `convertLeadEnabled`; on success the row leaves the displayed queue - Est: 1h - TDD: Red
    [x] 4.5.2: Extend LeadQueue with an "Actions" column, flag-gated per-row Convert button, and inline `ConvertLeadForm` reveal for the selected leadId (no new route; inline-expand per Open Question Q4) - Est: 1.5h - TDD: Green
    [x] 4.5.3: Refactor: extract the row-action + inline-form open/close state for clarity - Est: 30m - TDD: Refactor

Step 5: Testing & Traceability
[x] 5.1: Backend coverage sweep + gap-fill to ≥ 80% on the conversion path - Est: 1.5h - TDD: Integrate
[x] 5.2: Frontend coverage sweep + gap-fill to ≥ 80% lines / 75% branches - Est: 1h - TDD: Integrate
[x] 5.3: Build the AC1–AC7 + cross-cutting → test traceability check (each AC maps to ≥ 1 passing test) - Est: 30m - TDD: Integrate
[x] 5.4: Regression run: existing create-lead, lead.repository, leads-queue, and openapi suites remain green - Est: 30m - TDD: Integrate

Step 6: Validation & Handoff
[x] 6.1: Backend quality gates — lint, type-check, full jest suite, coverage report - Est: 45m - TDD: Integrate
[x] 6.2: Frontend quality gates — lint, type-check, vitest run --coverage - Est: 45m - TDD: Integrate
[x] 6.3: Verify `enquiries` migration up/down reversibility end-to-end - Est: 30m - TDD: Integrate
[x] 6.4: Self-review the diff, confirm AC map + blast-radius mitigations, prep for review/PR - Est: 30m - TDD: Integrate

---

## Blockers and Dependencies

**Blockers**:
- None remaining — tech-design.md is frozen and all 8 clarifications (Q1–Q8) are resolved (see decisions.md Phase 4).

**Dependencies**:
- Story #24 merged code is the reuse baseline: `lead.entity.ts`, `1700000000002-CreateLeads.ts`, `leads.service.ts` / `leads.repository.ts` / `leads.controller.ts`, `referential-validation.filter.ts`, `app.factory.ts` (global filters), `audit-log.repository.ts` + entity, `NewLeadForm.tsx`, `useLeads.ts`, `api/client.ts`, `feature-flags.service.ts` / `config.controller.ts`, and the pg-mem harness (`test/support/test-app.ts`, `test-data-source.ts`, `seeds/test-seed.ts`).
- The `convert-lead` capability must be present on the DSE principal used by tests (task 0.2), and a cap-lacking authenticated user must exist for the 403 assertion.
- Step ordering (Inside-Out): 1 → 2 → 3 before 4 (frontend consumes the finished contract + flag); 5 depends on 1–4; 6 depends on 5.
- Intra-step: 2.1/2.2/2.3 before 2.4 (service); 2.4 before 2.5 (controller); 4.1 before 4.2/4.4; 4.4 before 4.5.

**Open Questions** (all resolved — see decisions.md Phase 4 for full record):
> **[RESOLVED]**: `budget` column is `bigint`, no explicit max.
> **[RESOLVED]**: Add `UNIQUE(lead_id)` on `enquiries` as defense-in-depth (reflected in task 1.1.2).
> **[RESOLVED]**: exchange/finance interest render as Yes/No `Select`, no new Checkbox primitive (reflected in task 4.4.2).
> **[RESOLVED]**: Convert-form is an inline expanding panel under the selected row (reflected in task 4.5.2).
> **[RESOLVED]**: `variant` is a `text` column, non-empty, no max length.
> **[RESOLVED]**: Audit payload is `before:{status:<prev>}`, `after:{status:'Converted', enquiryId:<id>}` (affects task 2.4.3).
> **[RESOLVED]**: `StatusPill` uses default styling for `'Converted'` this Story.
> **[RESOLVED]**: `convert-lead` capability is provisioned by additively editing the #24 `test-users.json` fixture (task 0.2).

---

## Progress Tracking

**Total Leaf Tasks**: 40 (across 6 steps + setup)
**Completed**: 40
**Remaining**: 0
**Estimated Total Time**: ~34.25h (≈ 4.5 dev-days)
**Actual**: single Developer agent session + orchestrator verification/fix pass (see evidence.md)

Per-step rollup:
- Step 0 (Setup): ~1.5h
- Step 1 (Data layer): ~3.5h
- Step 2 (Backend contract & use case): ~10h
- Step 3 (Queue exclusion & wiring): ~2.75h
- Step 4 (Frontend): ~8.25h
- Step 5 (Testing & traceability): ~3.5h
- Step 6 (Validation & handoff): ~2.5h

TDD-phase distribution (leaf tasks): Setup 4 · Red 8 · Green 16 · Refactor 3 · Integrate 9

---

**Status**: ✅ Implementation Complete — all quality gates green (see evidence.md)

*Phase 4 (Design) detailed breakdown expanding the Phase 3 Level 1 flow, reconciled against tech-design.md. Tasks are ≤ 2h, TDD-cadenced (Inside-Out), and grounded in the merged #24 codebase. Resolve Q1–Q8 before/at the tasks they gate. Update checkboxes as work progresses in Phase 6.*
