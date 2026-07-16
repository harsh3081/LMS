# Evaluation Criteria

**Issue**: #24 — [Story] Create a New Lead
**Source**: `spec.md` (frozen, Phase 3), `tech-design.md` (frozen, Phase 4), `ref-code.md` (frozen)
**Generated**: 2026-07-16
**Tool**: Playwright (`@playwright/test` — confirmed installed; `playwright.config.ts` present at worktree root, `testDir: './.phoenix-os/project/specs/24/tests'`)

> **Instructions**: Each criterion below traces to exactly one spec requirement (AC1–AC7) or one cross-cutting rule (CC-01…CC-14) drawn from spec.md / tech-design.md / ref-code.md. Each automatable criterion is implemented as one or more Playwright tests (Red phase — expected to fail until the implementation lands, since this Story is the first application code in the repo). Non-automatable criteria are flagged **MANUAL VERIFICATION REQUIRED** and are out of Playwright's reach by construction (no UI/HTTP surface exposes the underlying fact), not by choice.

---

## Assumptions carried into test design (flagged for implementer confirmation)

These are not spec re-litigations — they are concrete values the frozen artifacts leave to implementation and that the tests must pick *something* to run against. If the implementer's actual values differ, only `tests/helpers/*.ts` need updating, not the eval criteria themselves.

| Assumption | Value used in tests | Why |
|---|---|---|
| API mount point | Same origin as the SPA, i.e. `{baseURL}/api/v1/...` | tech-design gives paths as `/api/v1/leads` etc. without specifying cross-origin; `playwright.config.ts` has a single `baseURL` |
| Login endpoint | `POST /api/v1/auth/login` with `{ email, password }`, sets a session cookie | ADR-004 mandates cookie-based session; no login contract is in the frozen tech-design. `tests/helpers/auth.ts` isolates this assumption |
| OpenAPI JSON path | `GET /api-json` (NestJS `@nestjs/swagger` default `SwaggerModule.setup` convention) | tech-design confirms `@nestjs/swagger`/OpenAPI 3.1 but not the mount path |
| New-Lead entry point | A visible nav control (`getByRole('link'/'button', { name: /new lead/i })`) on a DSE landing/dashboard route `/` | tech-design says "entry point to open the form" without naming the host page |
| Feature-toggle mechanism | Env var `NEW_LEAD_ENABLED` read server-side, reflected in whether the entry point renders | tech-design: "simple config/env flag" (resolved), exact name not specified |

---

## AC1 — DSE can open the "New Lead" form and submit with name, mobile, source, model

| ID | Assertion | Test |
|---|---|---|
| EVAL-AC1-01 | Navigating to `/leads/new` renders a form with 4 visible inputs/selects: customer name, mobile, source, model of interest, plus a submit control | `tests/new-lead-form.spec.ts` |
| EVAL-AC1-02 | Filling all 4 fields with valid data and submitting results in a success indication (toast/redirect/inline confirmation) and a `201` from `POST /api/v1/leads` | `tests/new-lead-form.spec.ts` |

## AC2 — Submission blocked with field-level inline errors when any mandatory field is missing (client AND server)

| ID | Assertion | Test |
|---|---|---|
| EVAL-AC2-01 | Submitting with `customerName` empty shows an inline field error and does **not** fire the create request | `tests/new-lead-form.spec.ts` |
| EVAL-AC2-02 | Submitting with `mobile` empty shows an inline field error and does not fire the create request | `tests/new-lead-form.spec.ts` |
| EVAL-AC2-03 | Submitting with `sourceId` unselected shows an inline field error and does not fire the create request | `tests/new-lead-form.spec.ts` |
| EVAL-AC2-04 | Submitting with `modelId` unselected shows an inline field error and does not fire the create request | `tests/new-lead-form.spec.ts` |
| EVAL-AC2-05 | `POST /api/v1/leads` with `customerName` omitted → `400` with a field-level message referencing `customerName` | `tests/create-lead-api.spec.ts` |
| EVAL-AC2-06 | `POST /api/v1/leads` with `mobile` omitted → `400` referencing `mobile` | `tests/create-lead-api.spec.ts` |
| EVAL-AC2-07 | `POST /api/v1/leads` with `sourceId` omitted → `400` referencing `sourceId` | `tests/create-lead-api.spec.ts` |
| EVAL-AC2-08 | `POST /api/v1/leads` with `modelId` omitted → `400` referencing `modelId` | `tests/create-lead-api.spec.ts` |

## AC3 — On success, a Lead is created with a unique identifier

| ID | Assertion | Test |
|---|---|---|
| EVAL-AC3-01 | `201` response body `leadId` matches UUID v4 shape (`/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i`) | `tests/create-lead-api.spec.ts` |
| EVAL-AC3-02 | Two successive valid creates by the same DSE yield two distinct `leadId` values | `tests/create-lead-api.spec.ts` |

## AC4 — Mobile number validated to the agreed India 10-digit format before persistence (mirrored inline)

| ID | Assertion | Test |
|---|---|---|
| EVAL-AC4-01 | Client: 9-digit mobile → inline error, no request fired | `tests/new-lead-form.spec.ts` |
| EVAL-AC4-02 | Client: 11-digit mobile → inline error, no request fired | `tests/new-lead-form.spec.ts` |
| EVAL-AC4-03 | Client: leading digit 0–5 (e.g. `5876543210`) → inline error, no request fired | `tests/new-lead-form.spec.ts` |
| EVAL-AC4-04 | Client: non-numeric mobile (e.g. `98765abcde`) → inline error, no request fired | `tests/new-lead-form.spec.ts` |
| EVAL-AC4-05 | Client: valid mobile (leading 6–9, 10 digits, e.g. `9876543210`) → no inline error, submit proceeds | `tests/new-lead-form.spec.ts` |
| EVAL-AC4-06 | API: 9-digit mobile → `400` | `tests/create-lead-api.spec.ts` |
| EVAL-AC4-07 | API: 11-digit mobile → `400` | `tests/create-lead-api.spec.ts` |
| EVAL-AC4-08 | API: leading digit 0–5 → `400` | `tests/create-lead-api.spec.ts` |
| EVAL-AC4-09 | API: non-numeric mobile → `400` | `tests/create-lead-api.spec.ts` |
| EVAL-AC4-10 | API: valid mobile → `201` | `tests/create-lead-api.spec.ts` |

## AC5 — Source chosen from the configured lead-source list and validated server-side

| ID | Assertion | Test |
|---|---|---|
| EVAL-AC5-01 | Source `<select>`/combobox options match the seeded active `lead_sources` fixture (Walk-in, Referral, Call, Online) sourced from `GET /api/v1/lead-sources` | `tests/new-lead-form.spec.ts` |
| EVAL-AC5-02 | `POST /api/v1/leads` with a `sourceId` not present in `lead_sources` → `400` | `tests/create-lead-api.spec.ts` |
| EVAL-AC5-03 | Model `<select>`/combobox options are populated from `GET /api/v1/vehicle-models` (supports the AC1 form-completeness requirement) | `tests/new-lead-form.spec.ts` |
| EVAL-AC5-04 | `POST /api/v1/leads` with a `modelId` not present in `vehicle_models` → `400` | `tests/create-lead-api.spec.ts` |

## AC6 — The created Lead appears in the creating DSE's Lead list/queue immediately after creation

| ID | Assertion | Test |
|---|---|---|
| EVAL-AC6-01 | After a successful UI submit, the new Lead appears at the top of the on-screen queue without a full page reload | `tests/new-lead-form.spec.ts` |
| EVAL-AC6-02 | `GET /api/v1/leads` (as the creating DSE) returns the just-created lead immediately after the `201` | `tests/leads-queue-api.spec.ts` |
| EVAL-AC6-03 | `GET /api/v1/leads` is ordered newest-first (`created_at DESC`) | `tests/leads-queue-api.spec.ts` |

## AC7 — Lead creation exposed via a documented REST endpoint on the OpenAPI contract

| ID | Assertion | Test |
|---|---|---|
| EVAL-AC7-01 | The OpenAPI JSON document is reachable and its `paths` include `/api/v1/leads` with a `post` operation | `tests/openapi-contract.spec.ts` |
| EVAL-AC7-02 | The documented `post` operation's request/response schemas reference the `CreateLeadDto` fields (`customerName`, `mobile`, `sourceId`, `modelId`) and a `201` response shaped like `LeadResponseDto` (`leadId`, `status`, `ownerId`, `locationId`, `createdAt`) | `tests/openapi-contract.spec.ts` |

## Cross-Cutting Rules

| ID | Assertion | Test |
|---|---|---|
| EVAL-CC-01 | Attempting to set `ownerId`, `locationId`, `dealerGroupId`, `status`, or `createdBy` in the `POST /api/v1/leads` request body does not change the persisted values — the response reflects the session-derived values, not the client-supplied ones | `tests/create-lead-api.spec.ts` |
| EVAL-CC-02 | Attempting to set `status` to a non-default value (e.g. `"Converted"`) in the create payload results in a persisted `status` of `"New"` | `tests/create-lead-api.spec.ts` |
| EVAL-CC-03 | Duplicate mobile is permitted: two separate `POST /api/v1/leads` with an identical `mobile` both return `201` (guards against premature FR-06 coupling) | `tests/create-lead-api.spec.ts` |
| EVAL-CC-04 | Tenant isolation: DSE in `location_id=1` cannot see a DSE's leads created in `location_id=2` via `GET /api/v1/leads` | `tests/leads-queue-api.spec.ts` |
| EVAL-CC-05 | Owner isolation: two DSEs in the *same* `location_id` each see only their own leads via `GET /api/v1/leads` (owner-scoped, not merely location-scoped) | `tests/leads-queue-api.spec.ts` |
| EVAL-CC-06 | Unauthenticated `POST /api/v1/leads` (no session cookie) → `401` | `tests/create-lead-api.spec.ts` |
| EVAL-CC-07 | Unauthenticated `GET /api/v1/leads` → `401` | `tests/leads-queue-api.spec.ts` |
| EVAL-CC-08 | Authenticated but non-DSE / capability-lacking principal → `403` on `POST /api/v1/leads` | `tests/create-lead-api.spec.ts` |
| EVAL-CC-09 | `leadId` is a UUID, not a sequential/guessable integer (defense-in-depth check, distinct from EVAL-AC3-01's format check — asserts non-sequential across two creates) | `tests/create-lead-api.spec.ts` |
| EVAL-CC-10 | The "New Lead" entry point is visible on the DSE landing page when the feature toggle is enabled (default test env) | `tests/feature-toggle.spec.ts` |
| EVAL-CC-11 | **MANUAL VERIFICATION REQUIRED** — an `audit_log` row (`action=LEAD_CREATED`) is written in the same transaction as the Lead insert. Not automatable via Playwright: no read API exposes `audit_log` to an HTTP/UI consumer. Verify via backend integration test (Jest+Supertest against the test DB) or direct DB inspection. |
| EVAL-CC-12 | **MANUAL VERIFICATION REQUIRED** — raw `mobile` / `customer_name` values never appear in structured application logs. Not automatable via Playwright: requires log-output inspection, not an HTTP/UI surface. Verify via log review during backend integration testing or a manual log audit. |
| EVAL-CC-13 | **MANUAL VERIFICATION REQUIRED** — the `leads` migration's down-migration cleanly drops the index then the table (reversibility). Not automatable via Playwright: this is a DB/migration-tool concern with no HTTP/UI surface. Verify by running `<migration tool> migration:revert` against a disposable test DB as part of backend CI. |
| EVAL-CC-14 | **MANUAL VERIFICATION REQUIRED** — visual/layout conformance of the "New Lead" form (spacing, field order, error placement) against any design mockup. The frozen spec/tech-design describe behavior, not pixel-level layout, and no Figma/visual reference is attached to this Story. Playwright screenshots are captured at defined points (see below) for a human/validation-keeper visual pass, but pass/fail on layout fidelity itself is manual. |

---

## Screenshot / Snapshot Capture Points

Captured to `.phoenix-os/project/specs/24/validation/snapshots/` for the validation-keeper's visual pass against spec.md's behavioral descriptions.

| Screenshot | Spec Requirement | AC/CC | Captured in |
|---|---|---|---|
| `new-lead-form-empty.png` | Form renders with the 4 mandatory fields and submit control | AC1 | `new-lead-form.spec.ts` |
| `new-lead-form-validation-errors.png` | Inline field-level errors shown for all 4 missing fields simultaneously | AC2 | `new-lead-form.spec.ts` |
| `new-lead-form-invalid-mobile.png` | Inline mobile-format error | AC4 | `new-lead-form.spec.ts` |
| `new-lead-form-success.png` | Success state after valid submit | AC1/AC3 | `new-lead-form.spec.ts` |
| `queue-with-new-lead.png` | New Lead appears at top of the DSE's queue | AC6 | `new-lead-form.spec.ts` |
| `dse-landing-entry-point.png` | "New Lead" entry point visible on landing page | CC-10 | `feature-toggle.spec.ts` |

---

## Requirement Coverage Summary

- **7 / 7 acceptance criteria (AC1–AC7)** mapped to at least one automated Playwright test — 100% AC coverage.
- **Cross-cutting rules**: 10 of 14 automated via Playwright (CC-01…CC-10); **4 flagged manual-only** (CC-11 audit log, CC-12 PII-in-logs, CC-13 migration reversibility, CC-14 visual/layout fidelity) — each is out of reach of an HTTP/UI-driven tool by construction, not by gap in test design.
- **Total criteria defined**: 45 (2 AC1 + 8 AC2 + 2 AC3 + 10 AC4 + 4 AC5 + 3 AC6 + 2 AC7 + 14 CC). **41 automated (≈ 91%)**, **4 manual-only (≈ 9%)**.
- All automated criteria are implemented as Playwright tests in `tests/` and are expected to **fail** until the Story's implementation lands (Red phase — no application code exists in the repo yet per tech-design.md's "first application code" note).

---

**Status**: ❄️ Frozen (Source of Truth)
