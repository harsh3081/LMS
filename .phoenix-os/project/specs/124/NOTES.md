# Issue #124 — Rewrite Convert Lead to Enquiry as a sectioned form

Fast-tracked implementation (direct user request, not BRD-sourced). This document records the schema, dropdown option sets, the SlideOver-vs-dedicated-route decision, the pre-fill mechanism, judgment calls, test results, and known gaps.

## New `enquiries` columns (migration `1700000000017-AddEnquiryConversionDetails`)

33 new columns, all nullable except the 4 Document Checklist booleans (`NOT NULL DEFAULT false`). `model_id` is **reused** from the existing nullable column added by `DirectEnquiry1700000000005` — not duplicated.

| Section | Column | Type | Constraint |
|---|---|---|---|
| 1. Vehicle Information | `fuel_type` | varchar | CHECK IN FUEL_TYPES (reused from `leads.fuel_type`'s vocabulary) |
| | `transmission` | varchar | CHECK IN TRANSMISSIONS (reused) |
| | `color_first_preference` | text | — |
| | `color_second_preference` | text | — |
| | `accessories_interest` | text | — |
| | `competitor_consideration` | text | — |
| 2. Qualification | `contact_verified` | varchar | CHECK IN CONTACT_VERIFIED_OPTIONS |
| | `intent_rating` | varchar | CHECK IN INTENT_RATINGS |
| | `expected_closure_date` | date | — |
| | `showroom_visits` | varchar | CHECK IN SHOWROOM_VISIT_OPTIONS |
| 3. Commercial | `quotation_number` | text | — |
| | `quoted_on_road_price` | bigint | — |
| | `discount_discussed` | text (free text) | — |
| | `insurance_preference` | varchar | CHECK IN INSURANCE_PREFERENCES |
| | `extended_warranty_interest` | varchar | CHECK IN WARRANTY_INTEREST_OPTIONS |
| | `corporate_discount_eligible` | text (free text) | — |
| 4. Finance | `finance_application_status` | varchar | CHECK IN FINANCE_APPLICATION_STATUSES |
| | `financier` | varchar | CHECK IN FINANCIER_OPTIONS |
| | `loan_amount_sought` | bigint | — |
| | `tenure_and_emi_discussed` | text (free text) | — |
| 5. Exchange Evaluation | `exchange_evaluation_status` | varchar | CHECK IN EXCHANGE_EVALUATION_STATUSES |
| | `exchange_evaluated_by` | text | — |
| | `exchange_evaluated_price` | bigint | — |
| | `exchange_customer_expectation` | bigint | — |
| 6. Test Drive & Engagement | `test_drive_status` | varchar | CHECK IN TEST_DRIVE_STATUSES |
| | `test_drive_date_time` | timestamptz | — |
| | `quotation_shared_via` | varchar | CHECK IN QUOTATION_SHARED_VIA_OPTIONS |
| | `next_action_owner_id` | uuid | nullable FK -> `users(user_id)` |
| | `test_drive_feedback` | text | — |
| 7. Document Checklist | `pan_card_verified` | boolean | NOT NULL DEFAULT false |
| | `address_proof_verified` | boolean | NOT NULL DEFAULT false |
| | `income_proof_verified` | boolean | NOT NULL DEFAULT false |
| | `gst_details_verified` | boolean | NOT NULL DEFAULT false |

All CHECK constraints use the `"col" IS NULL OR "col" IN (...)` NULL-safe form (mirrors `AddLeadCustomerDetails1700000000016`'s established pg-mem-safe pattern).

`budget`, `variant`, `exchangeInterest`, `financeInterest` on `ConvertLeadDto` are **unchanged** — still the only required fields.

## Dropdown option sets (exported constants, `backend/src/enquiries/entities/enquiry.entity.ts`, mirrored client-side in `frontend/src/api/client.ts`)

- `CONTACT_VERIFIED_OPTIONS` = Call Connected / OTP Verified / WhatsApp Confirmed / Not Verified
- `INTENT_RATINGS` = Hot / Warm / Cold (**new, distinct** from `ENQUIRY_STATUS_HOT/WARM/COLD` — see below)
- `SHOWROOM_VISIT_OPTIONS` = '0' / '1' / '2' / '3+' (varchar, not int — "3+" isn't a plain integer)
- `INSURANCE_PREFERENCES` = Dealer In-house / Own Arrangement / Undecided
- `WARRANTY_INTEREST_OPTIONS` = Interested / Not Interested / Undecided
- `FINANCE_APPLICATION_STATUSES` = Not Started / Documents Collected / Login Done / Approved / Rejected
- `FINANCIER_OPTIONS` = In-house / HDFC Bank / SBI / ICICI Bank
- `EXCHANGE_EVALUATION_STATUSES` = Not Scheduled / Scheduled / Completed / No Exchange
- `TEST_DRIVE_STATUSES` = Not Scheduled / Scheduled / Completed / Declined
- `QUOTATION_SHARED_VIA_OPTIONS` = WhatsApp / Email / Printed / Not Shared
- `fuelType`/`transmission` reuse `FUEL_TYPES`/`TRANSMISSIONS` **imported directly** from `leads/entities/lead.entity.ts` (an existing intra-backend cross-module import precedent — `enquiries.service.ts` already imports `LeadEntity`/`LEAD_STATUS_CONVERTED` from that file) rather than duplicating the literal arrays a third time. The frontend still duplicates client-side per the established two-independent-packages convention.

**`intentRating` vs `status`**: `EnquiryEntity.status` (issue #33's `ENQUIRY_STATUS_HOT/WARM/COLD`/`ENQUIRY_ALL_LOGGABLE_STATUSES`) is the Enquiry's own lifecycle status, set via a Follow-up. `intentRating` is a brand-new, independent descriptive attribute captured once at conversion time. The string values happen to overlap (Hot/Warm/Cold) but the columns, constants, and semantics are entirely separate — deliberate, not an oversight.

## SlideOver vs. dedicated route — decision: **dedicated route**

`/leads/:leadId/convert` (`ConvertLeadPage.tsx`), not a `SlideOver`. Rationale (documented in `ConvertLeadPage.tsx`'s own header comment too):

- This form is larger than even the New Lead form (issue #114/#120) — 8 sections vs. 6, plus a whole extra read-only display section (Section 0) sourced from a second data source (`useLead`).
- The New Lead form already established the SlideOver-over-Dashboard pattern for a comparably large form; pushing this even-larger form into the same `max-w-3xl`/`max-w-4xl` panel would force either a cramped single-column layout or a claustrophobic scroll region, undermining the "professional card layout" bar the New Lead form set.
- A full page gives the 2-column-grid-per-section + side-nav layout the same room `NewLeadPage`/`LeadDetailPage` already use, and keeps the flow bookmarkable/directly-navigable/back-button-friendly, same as `NewLeadPage`.
- `LeadQueue`'s "Convert to Enquiry" button is now a `Link` to this route instead of inline-expanding the old 4-field panel.

## Pre-fill mechanism

- **Section 0 (Customer Information)** — read-only, sourced from `useLead(leadId)` (existing `GET /api/v1/leads/:leadId`, issue #116) via the `DetailField` primitive (issue #116). **Not** part of the submitted `ConvertLeadInput` payload at all — nothing new to validate or persist for it.
- **Section 1 (Vehicle Information)** — editable, pre-filled as **form defaults** from the same Lead's `modelId`/`variant`/`fuelType`/`transmission` via a one-time `reset()` call inside a `useEffect` once the Lead query resolves. Guarded (`current.field || lead.field`) so it never clobbers something the DSE has already typed if the Lead query happens to re-resolve in the background. The DSE can freely change these before converting (confirmed details may differ from what was captured at Lead stage).

## Judgment calls (not pre-decided in the issue)

1. **Document Checklist booleans are `NOT NULL DEFAULT false`**, not nullable tri-state — a checkbox's natural "unset" state is unchecked/false; there is no gating relationship between them (unlike `leads.exchange_interest`, which gates a detail group and needed NULL to mean "not yet stated").
2. **Column names**: `panCardVerified` / `addressProofVerified` / `incomeProofVerified` / `gstDetailsVerified` — clear, consistent, mirrors the issue's 4 listed checklist items 1:1.
3. **`expectedClosureDate`** is a plain `date` (no time-of-day) vs. **`testDriveDateTime`**, a `timestamptz` (specific slot) — deliberately different types for a calendar date vs. a scheduled moment.
4. **`nextActionOwnerId`** carries a nullable FK to `users(user_id)`, mirroring `ownerId`/`convertedBy`'s existing FK precedent on `enquiries`.
5. **`quotedOnRoadPrice`/`loanAmountSought`/`exchangeEvaluatedPrice`/`exchangeCustomerExpectation`** are `bigint` (mirrors `enquiries.budget`'s existing large-integer precedent), each with `@IsInt`/`@IsPositive` at the DTO layer.
6. Dedicated route over SlideOver — see above.

## Migration-fragility fix (pre-existing, unrelated to this Story's schema)

Several older migration test files assert reversibility via `dataSource.undoLastMigration()` repeated N times, where N was hardcoded to the migration count at the time each test was written. Adding migration `17` shifted "the last migration" for every one of those tests. Fixed by incrementing each affected file's undo-call count by exactly one (`migration.spec.ts`, `test-drives-migration.spec.ts`, `followups-migration.spec.ts`, `direct-enquiry-migration.spec.ts`, `next-follow-up-at-migration.spec.ts`, `field-config-migration.spec.ts`, `owner-updated-at-migration.spec.ts`, `lead-customer-details-migration.spec.ts`) and updating their explanatory comments. `migration.spec.ts`'s "enquiries — up-migration creates the enquiries table with expected columns" test's expected column list was also extended with all 33 new columns (it asserts the table's current full shape, by established convention, not just what the original `CreateEnquiries` migration added).

## Test results

**Backend** (`npm test` — Jest, pg-mem substitute): **624/624 passing**, 45/45 suites. New: `enquiry-conversion-details-migration.spec.ts` (28 tests), `EnquiriesService` issue #124 block (3 tests), `convert-lead.controller.spec.ts` issue #124 block (16 tests). `npx tsc --noEmit`: clean. `npx eslint "src/**/*.ts" --max-warnings=0`: clean.

**Frontend** (`npx vitest run`): **216/216 passing**, 30/30 files. New: `ConvertLeadForm.spec.tsx` (11 tests, rewritten), `ConvertLeadPage.spec.tsx` (3 tests), `LeadQueue.spec.tsx` Convert-to-Enquiry block (rewritten for Link behavior, 3 tests + unchanged professional-table-redesign tests). `npx tsc -b --force` (forced, not incremental cache): clean. `npx eslint "src/**/*.{ts,tsx}" --max-warnings=0`: clean.

## Known gaps

- `expectedClosureDate`/`testDriveDateTime` have no reminder/scheduling infrastructure attached (mirrors `leads.firstFollowUpAt`'s same documented gap from issue #114) — plain captured values only.
- No backend enforcement ties `intentRating`/Qualification-section values into any downstream workflow (e.g. lead-scoring) — this Story only captures and persists them, per AC5.
- `ConvertLeadPage` does not yet surface a duplicate-conversion-in-progress guard beyond the existing 409 (`LeadAlreadyConvertedError`) — unchanged from the pre-existing flow (AC6, no regression).
- The `EnquiryResponseDto`/mapper additions are additive only; no existing Enquiry list/detail read surface groups these new fields into UI sections yet (only the conversion form itself does) — a future Story could add an Enquiry Detail page mirroring `LeadDetailPage`'s section-group convention.
