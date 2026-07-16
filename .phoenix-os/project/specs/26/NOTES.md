# Issue #26 — Create a Direct Enquiry (Walk-in/Referred)

Fast-track implementation notes (no analysis.md/spec.md/tech-design.md/eval-criteria.md chain for this Story — see the issue for the full intent/AC text). Built directly on top of the existing #24 (Create a New Lead) and #25 (Convert a Lead into an Enquiry) codebase.

## What was built

**Backend** (extends `backend/src/enquiries/`, reuses the Enquiry module rather than creating a new one):

- `src/migrations/1700000000005-DirectEnquiry.ts` — new, additive migration (does **not** edit the frozen #25 `1700000000003-CreateEnquiries.ts`). Makes `enquiries.lead_id` nullable, and adds `entry_type` (`'DIRECT' | 'CONVERTED'`, default `'CONVERTED'` so #25 rows backfill for free) plus the Lead-equivalent nullable columns (`customer_name`, `mobile`, `source_id`, `model_id`) needed because a Direct Enquiry has no Lead row to hold that data. Registered in `src/data-source.ts`.
- `src/enquiries/entities/enquiry.entity.ts` — updated to match (nullable `leadId`, new `entryType`/`customerName`/`mobile`/`sourceId`/`modelId` columns, `ENQUIRY_ENTRY_TYPE_DIRECT`/`ENQUIRY_ENTRY_TYPE_CONVERTED` constants).
- `src/enquiries/dto/create-direct-enquiry.dto.ts` — new DTO merging CreateLeadDto's 4 mandatory fields + ConvertLeadDto's 4 qualifying fields into one payload (AC2), with identical validation rules to both.
- `src/enquiries/enquiries.service.ts` — new `createDirect()` method (referential validation of sourceId/modelId first, fail-fast; then a single transaction: Enquiry insert + `audit_log` write, action `ENQUIRY_CREATED_DIRECT`) and `findOwnQueue()`. `assertSourceExists`/`assertModelExists` are duplicated from `LeadsService` (2-line checks) rather than extracted into a shared helper, to avoid touching the #24/#25 `LeadsService` at all.
- `src/enquiries/enquiries.repository.ts` — added `findOwnQueue()` (owner/tenant-scoped, mirrors `LeadsRepository`).
- `src/enquiries/dto/enquiry-response.dto.ts` + new `src/enquiries/enquiries.mapper.ts` — response shape extended with `entryType` and the (nullable) Lead-equivalent fields; the entity→DTO mapping was extracted into a shared `toEnquiryResponse()` so both controllers stay in lock-step.
- `src/enquiries/direct-enquiry.controller.ts` — **new** controller, `POST /api/v1/enquiries` (create) + `GET /api/v1/enquiries` (own-queue list), deliberately a separate top-level resource from the `/leads/:id/convert` sub-resource path (#25), since a Direct Enquiry has no parent Lead.
- `src/config/feature-flags.service.ts` + `config.controller.ts` — added `DIRECT_ENQUIRY_ENABLED` / `directEnquiryEnabled`, mirroring `NEW_LEAD_ENABLED`/`CONVERT_LEAD_ENABLED` precedent exactly.
- `src/app.module.ts` — registered `DirectEnquiryController`.

**Frontend** (`frontend/src/`):

- `components/NewEnquiryForm.tsx` — new form combining `NewLeadForm`'s 4 fields (customer name, mobile, source, model dropdowns) with `ConvertLeadForm`'s 4 qualifying fields (budget, variant, exchange/finance interest) in one step, identical client-side validation to both.
- `components/EnquiryQueue.tsx` — new "My Enquiries" list showing an Entry Type column (`Direct Entry` / `Converted from Lead`) — satisfies AC5.
- `pages/NewEnquiryPage.tsx` — new, rendered at `/enquiries/new`.
- `hooks/useEnquiries.ts` — added `useCreateDirectEnquiry()` and `useEnquiries()` (+ exported `ENQUIRIES_QUERY_KEY`), mirroring `useCreateLead`'s synchronous cache-prepend convention.
- `api/client.ts` — added `CreateDirectEnquiryInput`, extended `Enquiry` (nullable `leadId`, `entryType`, nullable Lead-equivalent fields), `api.createDirectEnquiry`, `api.getMyEnquiries`, extended `getConfig`'s return type.
- `App.tsx` — added route `/enquiries/new`.
- `pages/LandingPage.tsx` — added a "New Enquiry" entry point next to "New Lead", gated by `config.directEnquiryEnabled`.

## Key decisions

1. **Schema**: `lead_id` nullable + explicit `entry_type` column (rather than inferring Direct from `lead_id IS NULL`) — the explicit column is self-documenting for any future reporting query. Lead-equivalent fields live directly on `enquiries` (nullable, populated only for `DIRECT` rows) since a Direct Enquiry has no Lead row to source them from. Full reasoning is in the migration file's docblock.
2. **RBAC**: reused the existing `create-lead` capability instead of introducing `create-enquiry`. This keeps the RBAC surface minimal and avoids touching the frozen `.phoenix-os/project/specs/24/tests/fixtures/test-users.json` fixture — `dseA/dseB/dseC` already carry `create-lead` (can create Direct Enquiries in tests with zero fixture changes) and `noCapabilityUser` still proves deny-by-default RBAC for this endpoint too.
3. **API surface**: a genuinely new top-level resource, `POST /api/v1/enquiries` (+ `GET` for the own-queue list), not a variant of the `/leads/:id/convert` path — a Direct Enquiry has no Lead to hang off of.
4. **Feature flag**: `DIRECT_ENQUIRY_ENABLED` (defaults enabled), mirroring the `NEW_LEAD_ENABLED`/`CONVERT_LEAD_ENABLED` precedent exactly.

## Test results

- **Backend (Jest)**: `npx jest --runInBand` → **177/177 passed**, 19 suites, zero regressions on #24/#25 tests. New backend test files: `direct-enquiry-migration.spec.ts` (6), `create-direct-enquiry.dto.spec.ts` (16), `direct-enquiry.service.spec.ts` (9), `direct-enquiry.controller.spec.ts` (18). `tsc -p tsconfig.json --noEmit` and `eslint --max-warnings=0` both clean.
  - Touched (not frozen — plain test code, not under `specs/24`/`specs/25`) but necessarily updated for the additive schema change: `test/integration/migration.spec.ts`'s enquiries-table column-list assertion and both down-migration "undo N times" counts (one more migration now sits on top). `test/integration/config.controller.spec.ts` got 2 new cases for `directEnquiryEnabled`.
- **Frontend (Vitest)**: `npx vitest run` → **48/48 passed**, 10 files, zero regressions on #24/#25 tests. New: `NewEnquiryForm.spec.tsx` (5), `NewEnquiryPage.spec.tsx` (1), `useEnquiries-direct.spec.tsx` (2), plus additions to `api-client.spec.ts`, `LandingPage.spec.tsx`. Existing mocks in `LeadQueue.spec.tsx`, `ConvertLeadForm.spec.tsx`, `useEnquiries.spec.tsx` were updated to include the new required `Enquiry`/config fields (TS shape change, not behavior change) — confirmed via `tsc -b` (clean) and `eslint --max-warnings=0` (clean).

## Known gaps / follow-ups

- No dedicated Playwright/E2E suite was written for this fast-track Story (none of analysis.md/eval-criteria.md exist for #26) — coverage is Jest (backend, incl. real-migration-execution via pg-mem) + Vitest (frontend) only, both integration-style rather than mocked where practical.
- `pg_attribute`/`information_schema` metadata quirks in `pg-mem` meant the "lead_id is nullable" migration assertion had to be proven functionally (a NULL insert succeeding) rather than via schema introspection — documented inline in `direct-enquiry-migration.spec.ts`.
- No duplicate-detection or search/filter on the new `GET /api/v1/enquiries` endpoint — it is a plain owner/tenant-scoped list, same minimalism as `GET /api/v1/leads`.
- OpenAPI/Swagger doc title still says "Create a New Lead (Issue #24)" (`app.factory.ts`) — untouched, pre-existing, out of scope for this Story.
