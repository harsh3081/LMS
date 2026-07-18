# Issue #114 — Capture additional Customer Details on the New Lead form

Fast-tracked implementation (no full Phoenix OS phase pipeline). Direct user request, tracked via GitHub issue #114 for traceability. This document records the field/column inventory, dropdown option sets, the two new pieces of business logic (assign-to-consultant, consent gate), judgment calls made autonomously, test results, and known gaps.

## Field / column inventory

All new columns live on `leads` (migration `1700000000016-AddLeadCustomerDetails`), entity `backend/src/leads/entities/lead.entity.ts`. 22 columns are nullable; `communication_consent_verified` is `NOT NULL DEFAULT false` at the DB layer only (the app layer rejects anything but explicit `true`, so `false` never actually persists via the normal create path).

| Section | Field | Column | Type | Notes |
|---|---|---|---|---|
| 1. Customer Details | Full Name | `customer_name` | text, nullable | existing, regrouped |
| | Email | `email` | varchar, nullable | `@IsEmail` |
| | Customer Type | `customer_type` | varchar, nullable | closed set, CHECK |
| | Mobile Number | `mobile` | varchar(10), nullable | existing, regrouped |
| | City | `city` | text, nullable | free text |
| | Pin Code | `pin_code` | varchar(6), nullable | India 6-digit regex, CHECK (real Postgres only) |
| | Preferred Language | `preferred_language` | varchar, nullable | closed set, CHECK |
| 2. Vehicle Interest | Model | `model_id` | int, nullable | existing, regrouped |
| | Variant | `variant` | text, nullable | free text |
| | Fuel Type | `fuel_type` | varchar, nullable | closed set, CHECK |
| | Transmission | `transmission` | varchar, nullable | closed set, CHECK |
| | Budget Range | `budget_min`, `budget_max` | bigint, nullable | two independent fields, not a bucketed dropdown |
| | Buying Timeline | `buying_timeline` | varchar, nullable | closed set, CHECK |
| 3. Exchange Vehicle | (gating flag) | `exchange_interest` | boolean, nullable | Lead-level equivalent of `enquiries.exchange_interest`; nullable (NULL = "not stated") |
| | Current Vehicle | `current_vehicle` | text, nullable | free text |
| | KMs Driven | `kms_driven` | int, nullable | non-negative |
| | Registration Number | `registration_number` | text, nullable | free text |
| | Expected Value | `expected_value` | bigint, nullable | INR |
| 4. Finance | Payment Mode | `payment_mode` | varchar, nullable | closed set, CHECK |
| | Preferred Financer | `preferred_financer` | text, nullable | free text |
| | Down Payment Capacity | `down_payment_capacity` | bigint, nullable | INR |
| 5. Source & Assignment | Lead Source | `source_id` | int, nullable | existing, regrouped |
| | Referrer Name | `referrer_name` | text, nullable | free text; UI-only conditional display when source = "Referral" |
| | Assign to Consultant | *(not a column)* | — | `CreateLeadDto.assignedOwnerId` only steers `ownerId` at create time |
| 6. Follow-up & Consent | First Follow-up Date | `first_follow_up_at` | timestamptz, nullable | plain date, no reminder wiring |
| | Remarks | `remarks` | text, nullable | free text |
| | Consent checkbox | `communication_consent_verified` | boolean, **NOT NULL** | hard compliance gate |

Total: 22 nullable + 1 NOT NULL = 23 new columns.

## Dropdown option sets (closed, enforced both `@IsIn()` server-side and `<select>` client-side)

- **Customer Type**: Individual / Corporate / Government / Fleet
- **Preferred Language**: English / Hindi / Marathi / Gujarati / Tamil / Telugu / Kannada / Bengali / Punjabi
- **Fuel Type**: Petrol / Diesel / CNG / Electric / Hybrid
- **Transmission**: Manual / Automatic
- **Buying Timeline**: Immediate / Within 1 Month / 1-3 Months / 3-6 Months / 6+ Months
- **Payment Mode**: Cash / Loan / Lease

Constants are exported once from `backend/src/leads/entities/lead.entity.ts` (`CUSTOMER_TYPES`, `PREFERRED_LANGUAGES`, `FUEL_TYPES`, `TRANSMISSIONS`, `BUYING_TIMELINES`, `PAYMENT_MODES`) and duplicated as literal-tuple constants in `frontend/src/api/client.ts` (same convention as `INDIA_MOBILE_REGEX`'s existing client/server duplication) so the `<select>` options and the DTO validators can never silently drift without both files being touched.

## Assign-to-Consultant logic (`LeadsService.resolveOwnerId`, backend/src/leads/leads.service.ts)

1. `dto.assignedOwnerId` omitted → `ownerId = actor.userId` (issue #28's exact self-assignment default, unchanged).
2. `dto.assignedOwnerId` supplied → look up the target `UserEntity`:
   - Not found → `ReferentialValidationError` (400), reusing the same error type/filter `assertSourceExists`/`assertModelExists` already use (no new error class/filter needed).
   - `role !== 'DSE'` → 400.
   - `locationId`/`dealerGroupId` don't match the caller's own → 400.
   - Else → `ownerId = target.userId`.
3. `createdBy` is **never** affected — always `actor.userId` (the auditable "who actually submitted this" fact, per issue #28's existing `createdBy` vs `ownerId` distinction).

New endpoint `GET /api/v1/consultants` (`backend/src/users/consultants.controller.ts`) backs the dropdown: returns `{userId, displayName}[]` for `role='DSE'` users at the caller's own `locationId` (mirrors `demo-vehicles.controller.ts`'s minimal-controller pattern exactly, issue #34). Frontend hook: `frontend/src/hooks/useConsultants.ts`.

## Consent-gate enforcement

- **DTO** (`CreateLeadDto.communicationConsentVerified`): `@IsBoolean()` + `@Equals(true)` — not `@IsOptional()`. A request omitting the field, or supplying `false`/any non-`true` value, is rejected 400 by the global `ValidationPipe` before `LeadsService.create` ever runs. No new Error class/ExceptionFilter needed — this reuses the existing `validationExceptionFactory` path every other DTO validator already goes through.
- **Frontend** (`NewLeadForm.tsx`): an actual `<input type="checkbox">` (new `Checkbox` UI primitive, `frontend/src/components/ui/Checkbox.tsx`, mirroring `Textarea.tsx`'s "small new atom" precedent from #30), unchecked by default, registered with `required: '...'` so `react-hook-form` blocks `handleSubmit` — and therefore the entire submit flow, including the duplicate-check gate — until checked. Server-side rejection is defense-in-depth behind this.
- Deliberately **not** routed through `FieldConfigService`/`CONFIGURABLE_FIELD_KEYS` — that system is explicitly scoped (see its own code comment) to the 4 shared Lead/Enquiry fields; widening it was out of scope per the orchestrator's brief.

## Judgment calls made (not pre-decided in the brief)

1. **Exchange Vehicle detail fields stay independently enterable even when `exchangeInterest` is unset/false.** The brief said "all new fields are optional" and gave no UI-hide/show instruction for this group (unlike Referrer Name, which explicitly said "relevant only when..."), so the 4 detail fields are always rendered and always postable — no client-side hide/show, no server-side cross-field requirement. Verified explicitly in both backend (`create-lead-details.controller.spec.ts`, "accepts exchange detail fields even when exchangeInterest itself is omitted") and is consistent with the DTO's independent optionality.
2. **`resolveOwnerId`'s error type**: reused `ReferentialValidationError` (already globally registered → 400) rather than minting a new `LeadAssignmentValidationError` + filter, since "assignedOwnerId doesn't reference a valid user" is semantically identical to the existing `sourceId`/`modelId` referential-validity checks in the same method.
3. **`Lead` (frontend) new-field properties are `?:` (optional) rather than `| null` (required-nullable)**, unlike `CreateLeadResponseDto`/`LeadResponseDto` on the backend (which use `T | null`, always present). This was to avoid forcing every pre-existing test-file mock literal of a `Lead` object (in `NewLeadForm.spec.tsx`, `NewLeadPage.spec.tsx`, `LeadQueue.spec.tsx`, etc.) to enumerate all 23 new properties. Runtime data always includes them (the backend always returns the full shape); only the TS type is more permissive than the wire contract.
4. **pg-mem NULL-in-IN-list CHECK bug**: empirically, pg-mem's CHECK evaluator does not implement standard SQL three-valued logic for `col IN (...)` — a NULL value in one closed-set column caused pg-mem to reject inserts citing an unrelated column's CHECK constraint. Fixed by writing every closed-set CHECK as `"col" IS NULL OR "col" IN (...)` instead of a bare `"col" IN (...)`, which is correct and NULL-safe on both engines (no `E2E_DB_DRIVER=pgmem` skip needed, unlike the regex-based `pin_code`/`mobile` CHECKs).
5. **`kms_driven` is a plain `int`, not `bigint`** (unlike the four money fields) — an odometer reading never approaches bigint range; kept consistent with `source_id`/`model_id`'s existing `int` precedent.
6. **First Follow-up Date UI** uses a native `<input type="date">`, converted to an ISO 8601 datetime string (`new Date(value).toISOString()`) on submit to satisfy the DTO's `@IsISO8601` — simplest option consistent with "no reminder/scheduling infrastructure" being out of scope.
7. **Referrer Name conditional display is matched by lead-source NAME** (`'Referral'`), not a hardcoded `sourceId === 2` — more robust if seed data ever renumbers, while still mirroring the exact string from `1700000000004-SeedMasterData.ts`.
8. **Test-environment `IntersectionObserver`/`scrollIntoView` polyfills**: jsdom implements neither. Added a reusable `MockIntersectionObserver` test double (`frontend/tests/support/mock-intersection-observer.ts`, exposing `.trigger(...)` for `LeadFormSectionNav.spec.tsx`'s dedicated assertions) and a no-op `scrollIntoView` stub, both installed globally in `frontend/tests/setup.ts` — necessary because `NewLeadForm` now always renders `LeadFormSectionNav`, so every `NewLeadForm` test needs these to exist even when not asserting on nav behavior.
9. **Removed `aria-labelledby` from each form `<section>` wrapper** (kept the `<h2>` heading itself). React Testing Library's `getByLabelText` also matches `aria-labelledby`-bearing container elements, not just form controls — with it in place, `/source/i` and `/consent/i` (both used pervasively by pre-existing tests) ambiguously matched the "Source & Assignment"/"Follow-up & Consent" section headings' containers as well as the actual field, causing `getMultipleElementsFoundError` across ~9 pre-existing tests. Plain headings avoid the collision while keeping visual/screen-reader-heading-navigation semantics.

## Test results

**Backend** (Jest, `backend/`): 42 suites / 569 tests, all green (confirmed via a full unmocked `npx jest` run after every fixture fix). `npx tsc --noEmit` clean.

New backend test files:
- `test/integration/lead-customer-details-migration.spec.ts` (17 tests) — up/down migration, column list, NULL-safe CHECK constraints, consent default.
- `test/integration/create-lead-details.controller.spec.ts` (35 tests) — HTTP-level: consent gate, optionality, email/pin-code format, closed-set dropdowns, numeric fields, Exchange Vehicle group, assign-to-consultant (all 5 branches).
- `test/integration/leads-service-customer-details.spec.ts` (9 tests) — service-level persistence + assign-to-consultant.
- `test/integration/consultants.controller.spec.ts` (6 tests) — location scoping, role filtering, response shape, 401.
- New assertions added to `test/unit/create-lead.dto.spec.ts` (consent gate, email/pin-code/closed-set/UUID DTO validation).

Pre-existing backend test files updated only to add `communicationConsentVerified: true` to shared "valid Lead payload" builders (consent is now a hard gate — every existing happy-path Lead-creation fixture needed it) and to add one extra `undoLastMigration()` call / update the `leads` column-list assertion in 9 migration-reversibility spec files, since `AddLeadCustomerDetails` is now the newest migration in the chain: `create-lead.controller.spec.ts`, `leads.service.spec.ts`, `leads-queue.controller.spec.ts`, `field-config-enforcement.spec.ts`, `duplicates.controller.spec.ts`, `convert-lead.controller.spec.ts`, `direct-enquiry.controller.spec.ts`, `migration.spec.ts`, `owner-updated-at-migration.spec.ts`, `next-follow-up-at-migration.spec.ts`, `followups-migration.spec.ts`, `field-config-migration.spec.ts`, `direct-enquiry-migration.spec.ts`, `test-drives-migration.spec.ts`. No frozen spec files under `.phoenix-os/project/specs/{24..36}/` were touched.

**Frontend** (Vitest, `frontend/`): 26 files / 178 tests, all green. `npx tsc -b --force` clean.

New frontend test files:
- `tests/unit/LeadFormSectionNav.spec.tsx` (9 tests) — link rendering, default/updated highlight via the mock `IntersectionObserver`, click-to-scroll, disconnect-on-unmount.
- New `describe('customer-details redesign (issue #114)')` block inside `tests/unit/NewLeadForm.spec.tsx` (10 tests) — section headings, side-nav rendering, every new field present, closed-set option lists, consent gate (blocks/unblocks), full-field submission mapping, pin-code validation, referrer-name conditional display, assign-to-consultant dropdown + submission.

Pre-existing frontend test files updated: `NewLeadForm.spec.tsx` (mock `getConsultants`, add consent-checkbox clicks + `communicationConsentVerified: true` to exact-match `createLead` assertions in 4 happy-path tests), `NewLeadPage.spec.tsx` (same), `api-client.spec.ts` (2 `createLead` calls needed the now-required field for `tsc` to compile).

## Known gaps

- **First Follow-up Date has no reminder/scheduling wiring** — it is stored and returned, nothing more (matches the pre-existing gap already documented in #31/#38's NOTES for the *Enquiry*-side follow-up mechanism; this Lead-side field is a separate, simpler concept by design).
- **Exchange Vehicle group has no client-side show/hide interaction** tied to the `exchangeInterest` checkbox — all 4 detail fields are always visible/enterable (see judgment call #1 above). A future Story could add progressive disclosure (hide the 4 fields until the checkbox is checked) as a pure UX polish with no schema/API change.
- **Email format is validated server-side (`@IsEmail`) and via the native `type="email"` input**, but no explicit client-side regex mirrors the server rule the way mobile/pin-code do — a malformed email only surfaces as a mapped server 400, not an inline pre-submit error. Consistent with AC3's wording ("validated ... when provided") which does not mandate client-side pre-validation specifically.
- **`GET /api/v1/consultants` is location-scoped only** (not additionally `dealerGroupId`-scoped) — mirrors `demo-vehicles.controller.ts`'s existing precedent exactly; every fixture location in this codebase maps 1:1 to a single dealer group today, so this is currently equivalent to dealer-group scoping in practice.
- **`CONFIGURABLE_FIELD_KEYS` (issue #27's admin mandatory-field toggle) was intentionally left untouched** — none of the 22 new fields (or the consent gate) are administrator-configurable; this was an explicit brief instruction, not an oversight.
