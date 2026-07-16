# Evaluation Criteria

**Issue**: #25 — [Story] Convert a Lead into an Enquiry
**Source**: `spec.md` (frozen, Phase 3), `tech-design.md` (frozen, Phase 4), `ref-code.md` (frozen)
**Generated**: 2026-07-16
**Tool**: Playwright (`@playwright/test` — confirmed installed; `playwright.config.ts` present at worktree root with `testDir: './.phoenix-os/project/specs'` and `testMatch: '**/tests/**/*.spec.ts'`, so it discovers this Story's tests alongside #24's)

> **Instructions**: Each criterion below traces to exactly one spec requirement (AC1–AC7) or one cross-cutting rule (CC-01…CC-18) drawn from spec.md / tech-design.md / ref-code.md. Each automatable criterion is implemented as one or more Playwright tests (Red phase — expected to fail until the implementation lands, since no application code exists yet for this Story). Non-automatable criteria are flagged **MANUAL VERIFICATION REQUIRED** and are out of Playwright's reach by construction (no UI/HTTP surface exposes the underlying fact), not by choice.

---

## Assumptions carried into test design (flagged for implementer confirmation)

These are not spec re-litigations — they are concrete values the frozen artifacts leave to implementation and that the tests must pick *something* to run against. If the implementer's actual values differ, only `tests/helpers/*.ts` need updating, not the eval criteria themselves.

| Assumption | Value used in tests | Why |
|---|---|---|
| Convert route | `POST /api/v1/leads/{leadId}/convert` | Fixed literally by tech-design.md (resolved) |
| Login endpoint | `POST /api/v1/auth/login` with `{ email, password }`, sets a session cookie | Reused unchanged from #24's `tests/helpers/auth.ts` (ADR-004 cookie session) |
| OpenAPI JSON path | `GET /api-json` (NestJS `@nestjs/swagger` default) | Same assumption as #24's `openapi-contract.spec.ts` |
| "Convert to Enquiry" entry point host page | The DSE landing/queue route (`/`), same page as #24's owner-scoped Lead queue | tech-design.md: "Actions" column added to `LeadQueue.tsx`, inline-expand panel, "no new route" (resolved) |
| Feature-toggle mechanism | Env var `CONVERT_LEAD_ENABLED`, reflected in `GET /api/v1/config`'s `convertLeadEnabled` field | tech-design.md Component 4, mirrors #24's `NEW_LEAD_ENABLED` / `newLeadEnabled` exactly |
| Yes/No boolean fields | Rendered as `<select>` with options labeled "Yes" / "No" | tech-design.md Clarification: "exchangeInterest/financeInterest render as Yes/No Select (reuses existing primitive; no new Checkbox)" |

---

## AC1 — A DSE can select one of their existing open Leads and initiate a "Convert to Enquiry" action

| ID | Assertion | Test |
|---|---|---|
| EVAL-AC1-01 | The "Convert to Enquiry" action is visible on an eligible (non-Converted) queue row | `tests/convert-lead-form.spec.ts` |
| EVAL-AC1-02 | Clicking the action reveals the qualifying-details form inline under the row, without navigating to a new route (URL unchanged) | `tests/convert-lead-form.spec.ts` |
| EVAL-AC1-03 | The inline form renders all 4 qualifying fields (budget, variant, exchange interest, finance interest) plus a submit control | `tests/convert-lead-form.spec.ts` |

## AC2 — The conversion form/endpoint requires the qualifying details — budget, variant, exchange interest, finance interest

| ID | Assertion | Test |
|---|---|---|
| EVAL-AC2-01 | `POST /api/v1/leads/{leadId}/convert` with `budget` omitted → `400` with a field-level message referencing `budget` | `tests/convert-lead-api.spec.ts` |
| EVAL-AC2-02 | `POST /api/v1/leads/{leadId}/convert` with `variant` omitted → `400` referencing `variant` | `tests/convert-lead-api.spec.ts` |
| EVAL-AC2-03 | `POST /api/v1/leads/{leadId}/convert` with `exchangeInterest` omitted → `400` referencing `exchangeInterest` (not silently defaulted to `false`) | `tests/convert-lead-api.spec.ts` |
| EVAL-AC2-04 | `POST /api/v1/leads/{leadId}/convert` with `financeInterest` omitted → `400` referencing `financeInterest` (not silently defaulted to `false`) | `tests/convert-lead-api.spec.ts` |

## AC3 — Conversion is blocked (rejected with field-level errors) until all qualifying fields are captured — server-side, mirrored inline on the client

| ID | Assertion | Test |
|---|---|---|
| EVAL-AC3-01..04 | Client: submitting the inline form with all 4 fields empty shows an inline error for each of the 4 fields simultaneously and does **not** fire the convert request | `tests/convert-lead-form.spec.ts` |
| EVAL-AC3 client: rejects invalid budget — {zero / negative / decimal} | Client: each invalid numeric `budget` boundary case shows an inline error and fires no request | `tests/convert-lead-form.spec.ts` (loop, 3 cases) |
| EVAL-AC3 server: rejects invalid budget — {zero / negative / decimal / non-numeric string} | Server: each invalid `budget` boundary case → `400` | `tests/convert-lead-api.spec.ts` (loop, 4 cases) |
| EVAL-AC3-05 | Server: a large-but-valid `budget` (no artificial upper bound, per tech-design Clarification Q1) is accepted (`201`) | `tests/convert-lead-api.spec.ts` |
| EVAL-AC3 server: rejects invalid variant — empty string | Server: empty-string `variant` → `400` (`@IsNotEmpty`) | `tests/convert-lead-api.spec.ts` |
| EVAL-AC3-06 | Server: a fully valid conversion payload is accepted (`201`) — positive control for the boundary-case loops above | `tests/convert-lead-api.spec.ts` |
| EVAL-AC3-07 | A server-returned `400` field error (`{field,message}[]`) is surfaced back onto the corresponding form field (mirrors `NewLeadForm.tsx`'s `setError` pattern) | `tests/convert-lead-form.spec.ts` |

## AC4 — On success, an Enquiry record is created and linked back to the originating Lead

| ID | Assertion | Test |
|---|---|---|
| EVAL-AC4-01 | Happy-path conversion returns `201` with an `enquiryId` (UUID) and `leadId` equal to the source Lead's id | `tests/convert-lead-api.spec.ts` |
| EVAL-AC4-02 | The Enquiry response echoes the submitted `budget`, `variant`, `exchangeInterest`, `financeInterest` values exactly | `tests/convert-lead-api.spec.ts` |
| EVAL-AC4-03 | Two separate conversions (of two different Leads) yield two distinct, UUID-shaped `enquiryId`s | `tests/convert-lead-api.spec.ts` |

## AC5 — The original Lead is marked "Converted" and is no longer treated as an open Lead (excluded from the DSE's open queue)

| ID | Assertion | Test |
|---|---|---|
| EVAL-AC5-01 | After conversion, `GET /api/v1/leads` (as the owning DSE) no longer includes the converted Lead's `leadId` (present beforehand, absent afterward) | `tests/leads-queue-conversion.spec.ts` |
| EVAL-AC5-02 | Regression guard: converting one Lead does not remove a sibling non-Converted Lead from the same DSE's queue (over-broad-exclusion guard) | `tests/leads-queue-conversion.spec.ts` |
| EVAL-AC5-03 | Frontend: after a successful UI conversion, a success state is shown and the row's "Convert to Enquiry" action / queue membership disappears without a full page reload | `tests/convert-lead-form.spec.ts` |

## AC6 — The conversion timestamp and the converting DSE are recorded on the new Enquiry

| ID | Assertion | Test |
|---|---|---|
| EVAL-AC6-01 | `convertedBy` on the Enquiry response identifies the converting DSE and differs between two different converting DSEs (proves server-derivation, not a hardcoded/shared value) | `tests/convert-lead-api.spec.ts` |
| EVAL-AC6-02 | `convertedAt` is a valid ISO timestamp within a few seconds of the actual conversion request | `tests/convert-lead-api.spec.ts` |

## AC7 — Conversion is exposed via a documented REST endpoint on the OpenAPI contract

| ID | Assertion | Test |
|---|---|---|
| EVAL-AC7-01 | The OpenAPI JSON document is reachable and its `paths` include `/api/v1/leads/{leadId}/convert` with a `post` operation | `tests/convert-lead-openapi.spec.ts` |
| EVAL-AC7-02 | The documented `post` operation's schemas reference the `ConvertLeadDto` fields (`budget`, `variant`, `exchangeInterest`, `financeInterest`) and a `201` response shaped like `EnquiryResponseDto` (`enquiryId`, `leadId`, `convertedBy`, `convertedAt`, `status`, `ownerId`, `locationId`) | `tests/convert-lead-openapi.spec.ts` |
| EVAL-AC7 supporting | The new `/convert` path is documented additively alongside the existing `/api/v1/leads` endpoint (proves this is an additive contract change) | `tests/convert-lead-openapi.spec.ts` |

## Cross-Cutting Rules

| ID | Assertion | Test |
|---|---|---|
| EVAL-CC-01 | Attempting to set `ownerId`, `locationId`, `dealerGroupId`, `convertedBy`, or `status` in the convert request body does not change the persisted/response values — they reflect the session-derived `Principal`, not the client-supplied ones (`whitelist:true`) | `tests/convert-lead-api.spec.ts` |
| EVAL-CC-02 | Converting a non-existent `leadId` → `404` | `tests/convert-lead-api.spec.ts` |
| EVAL-CC-03 | Converting another owner's Lead in the *same* location → `404` (not `403`) — no signal distinguishing "exists but not yours" from "doesn't exist", preventing cross-tenant leakage | `tests/convert-lead-api.spec.ts` |
| EVAL-CC-04 | Converting a Lead belonging to a different `location_id` → `404` | `tests/convert-lead-api.spec.ts` |
| EVAL-CC-05 | Re-converting an already-"Converted" Lead → `409` | `tests/convert-lead-api.spec.ts` |
| EVAL-CC-06 | Unauthenticated `POST /api/v1/leads/{leadId}/convert` (no session cookie) → `401` | `tests/convert-lead-api.spec.ts` |
| EVAL-CC-07 | Authenticated but capability-lacking principal (`noCapabilityUser`, no `convert-lead`) → `403` | `tests/convert-lead-api.spec.ts` |
| EVAL-CC-08 | Atomicity proxy: a rejected (`400`, e.g. invalid budget) conversion attempt does not partially convert the Lead — a subsequent valid attempt on the same Lead still succeeds exactly once, and a further attempt correctly `409`s (proves no half-converted state was left behind) | `tests/convert-lead-api.spec.ts` |
| EVAL-CC-09 | `EnquiryResponseDto` omits `dealerGroupId` (per tech-design's resolved exclusion — `dealerGroupId` intentionally not in the response shape) | `tests/convert-lead-api.spec.ts` |
| EVAL-CC-10 | `enquiryId` is UUID-shaped and unique per conversion (defense-in-depth check, distinct from EVAL-AC4-03's linkage check) | `tests/convert-lead-api.spec.ts` |
| EVAL-CC-11 | The "Convert to Enquiry" entry point is visible on the DSE landing/queue page when `CONVERT_LEAD_ENABLED` is at its default (enabled) test-environment state | `tests/convert-feature-toggle.spec.ts` |
| EVAL-CC-12 | Regression: `POST /api/v1/leads` (the #24 create-Lead flow) still succeeds unaffected by this Story's changes | `tests/convert-lead-api.spec.ts` |
| EVAL-CC-13 | Regression: newest-first queue ordering among the *remaining* open Leads still holds after a conversion (the queue-exclusion change from AC5 doesn't disturb ordering) | `tests/leads-queue-conversion.spec.ts` |
| EVAL-CC-14 | **MANUAL VERIFICATION REQUIRED** — an `audit_log` row (`action=LEAD_CONVERTED`, `before:{status:<prev>}`, `after:{status:'Converted', enquiryId:<id>}`) is written in the same transaction as the Enquiry insert + Lead status flip. Not automatable via Playwright: no read API exposes `audit_log` to an HTTP/UI consumer. Verify via backend integration test (Jest+Supertest against the test DB) or direct DB inspection. |
| EVAL-CC-15 | **MANUAL VERIFICATION REQUIRED** — the `enquiries` migration's down-migration (`1700000000003-CreateEnquiries.ts`) cleanly drops the table, its FKs, index, and unique constraint (reversibility). Not automatable via Playwright: this is a DB/migration-tool concern with no HTTP/UI surface. Verify by running the migration tool's revert command against a disposable test DB as part of backend CI. |
| EVAL-CC-16 | **MANUAL VERIFICATION REQUIRED** — the DB-level `UNIQUE(lead_id)` constraint on `enquiries` (defense-in-depth behind the app-level `409` check exercised by EVAL-CC-05) actually rejects a concurrent duplicate insert. Not automatable via a single-instance Playwright run: requires a true race/concurrent-transaction scenario or direct DB access, not an HTTP/UI surface. Verify via a backend integration test that opens two overlapping transactions or a direct SQL `INSERT` against the test DB. |
| EVAL-CC-17 | **MANUAL VERIFICATION REQUIRED** — the structured conversion log (`leadId`, `enquiryId`, `actor`) contains no PII beyond the existing #24 precedent. Not automatable via Playwright: requires log-output inspection, not an HTTP/UI surface. Verify via log review during backend integration testing or a manual log audit. |
| EVAL-CC-18 | **MANUAL VERIFICATION REQUIRED** — visual/layout conformance of the inline-expanding `ConvertLeadForm` (Yes/No selects, field order, error placement, spacing) against any design mockup. The frozen spec/tech-design describe behavior, not pixel-level layout, and no Figma/visual reference is attached to this Story. Playwright screenshots are captured at defined points (see below) for a human/validation-keeper visual pass, but pass/fail on layout fidelity itself is manual. |

---

## Screenshot / Snapshot Capture Points

Captured to `.phoenix-os/project/specs/25/validation/snapshots/` for the validation-keeper's visual pass against spec.md's behavioral descriptions.

| Screenshot | Spec Requirement | AC/CC | Captured in |
|---|---|---|---|
| `convert-action-visible.png` | "Convert to Enquiry" action visible on an eligible queue row | AC1 | `convert-lead-form.spec.ts` |
| `convert-lead-form-inline.png` | Qualifying-details form expands inline under the row (no new route) | AC1 | `convert-lead-form.spec.ts` |
| `convert-lead-form-validation-errors.png` | Inline field-level errors shown for all 4 missing fields simultaneously | AC3 | `convert-lead-form.spec.ts` |
| `convert-lead-form-success.png` | Success state after a valid conversion submit | AC4/AC5 | `convert-lead-form.spec.ts` |
| `convert-entry-point-enabled.png` | "Convert to Enquiry" entry point visible when the feature toggle is enabled | CC-11 | `convert-feature-toggle.spec.ts` |

---

## Requirement Coverage Summary

- **7 / 7 acceptance criteria (AC1–AC7)** mapped to at least one automated Playwright test — 100% AC coverage.
- **Cross-cutting rules**: 13 of 18 automated via Playwright (CC-01…CC-13); **5 flagged manual-only** (CC-14 audit log, CC-15 migration reversibility, CC-16 DB-level unique-constraint race condition, CC-17 PII-in-logs, CC-18 visual/layout fidelity) — each is out of reach of an HTTP/UI-driven tool by construction, not by gap in test design.
- **Total criteria defined**: 51 (3 AC1 + 4 AC2 + 15 AC3 + 3 AC4 + 3 AC5 + 2 AC6 + 3 AC7 + 18 CC). **46 automated (≈ 90%)**, **5 manual-only (≈ 10%)**.
- All automated criteria are implemented as Playwright tests in `tests/` and are expected to **fail** until this Story's implementation lands (Red phase — no application code exists yet for the Enquiry module, conversion endpoint, or `ConvertLeadForm`).
- Regression coverage (EVAL-CC-12, EVAL-CC-13) guards that this Story's changes to the shared `leads` schema/queue query do not break #24's create-Lead / open-queue behavior, per tech-design.md's Blast Radius mitigation.

---

**Status**: ❄️ Frozen (Source of Truth)
