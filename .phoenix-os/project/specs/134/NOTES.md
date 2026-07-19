# Issue #134 — Redesign New Enquiry form to match Convert-to-Enquiry's 8-section structure

Fast-tracked implementation (no separate spec/tech-design/todo — the GitHub issue body served as
the spec). TDD approach: Inside-Out, layer-by-layer (migration → entity → DTO → service → mapper
→ frontend form → frontend page), each layer left green before moving to the next, per the
orchestrator's explicit instruction. Autonomous design calls below are documented per the
"proceed autonomously, document and move on" authorization.

## 1. New migration — `1700000000018-AddEnquiryCustomerDetails`

Adds 5 nullable columns to `enquiries` (registered in `backend/src/data-source.ts`, after
`AddEnquiryConversionDetails1700000000017`):

| Column | Type | Constraint |
|---|---|---|
| `email` | `varchar` | none (mirrors `leads.email`) |
| `customer_type` | `varchar` | `CHK_enquiries_customer_type`: NULL-safe `IN ('Individual','Corporate','Government','Fleet')` |
| `city` | `text` | none |
| `pin_code` | `varchar(6)` | `CHK_enquiries_pin_code`: `~ '^[1-9][0-9]{5}$'`, skipped under `E2E_DB_DRIVER=pgmem` (pg-mem has no `~` operator) — same precedent as `leads.pin_code`'s CHECK |
| `preferred_language` | `varchar` | `CHK_enquiries_preferred_language`: NULL-safe `IN (...)` (9 languages, same list as `leads.preferred_language`) |

These 5 fields already existed on `leads` (issue #114, migration `1700000000016`) but were never
added to `enquiries` — Direct Enquiry (issue #26) predates that Story. `down()` reverses cleanly
(drops constraints then columns, in reverse order).

**9 pre-existing migration-reversibility specs** each got exactly one more `undoLastMigration()`
call added (their `down-migration reverses cleanly` tests revert every migration after the one
under test, in reverse order, before reaching the target migration itself — adding migration #18
means one more revert everywhere):
`migration.spec.ts` (both the `leads` and `enquiries` down-tests), `direct-enquiry-migration.spec.ts`,
`field-config-migration.spec.ts`, `followups-migration.spec.ts` (both its down-tests),
`lead-customer-details-migration.spec.ts`, `next-follow-up-at-migration.spec.ts`,
`owner-updated-at-migration.spec.ts`, `test-drives-migration.spec.ts` (all three of its down-tests),
`enquiry-conversion-details-migration.spec.ts`. `migration.spec.ts`'s enquiries full-column-list
assertion was also updated to include the 5 new column names.

A new dedicated migration spec was added: `backend/test/integration/enquiry-customer-details-migration.spec.ts`
(mirrors `lead-customer-details-migration.spec.ts` / `enquiry-conversion-details-migration.spec.ts`
exactly — column presence, nullability, CHECK accept/reject cases, pin-code-under-pgmem note,
down-migration reversal).

## 2. Entity — `backend/src/enquiries/entities/enquiry.entity.ts`

Added `email`/`customerType`/`city`/`pinCode`/`preferredLanguage` columns (all `string | null`).
`CUSTOMER_TYPES`/`PREFERRED_LANGUAGES` are imported from `leads/entities/lead.entity.ts` and
re-exported from `enquiry.entity.ts` (NOT redeclared) — mirrors the existing `FUEL_TYPES`/
`TRANSMISSIONS` reuse precedent set by issue #124 exactly, so `CreateDirectEnquiryDto` can import
every closed-set vocabulary it needs from one module.

## 3. DTO — `backend/src/enquiries/dto/create-direct-enquiry.dto.ts`

Extended with two field groups, both `@IsOptional()`:

- **5 Customer Details fields** (`email`/`customerType`/`city`/`pinCode`/`preferredLanguage`) —
  verbatim mirror of `CreateLeadDto`'s own Customer Details decorators (`@IsEmail`,
  `@IsIn(CUSTOMER_TYPES)`, `@IsString` + `@Matches(INDIA_PIN_CODE_REGEX)`,
  `@IsIn(PREFERRED_LANGUAGES)`).
- **The full Section 1-7 field set** (fuelType, transmission, colorFirstPreference,
  colorSecondPreference, accessoriesInterest, competitorConsideration, contactVerified,
  intentRating, expectedClosureDate, showroomVisits, quotationNumber, quotedOnRoadPrice,
  discountDiscussed, insurancePreference, extendedWarrantyInterest, corporateDiscountEligible,
  financeApplicationStatus, financier, loanAmountSought, tenureAndEmiDiscussed,
  exchangeEvaluationStatus, exchangeEvaluatedBy, exchangeEvaluatedPrice,
  exchangeCustomerExpectation, testDriveStatus, testDriveDateTime, quotationSharedVia,
  nextActionOwnerId, testDriveFeedback, panCardVerified, addressProofVerified,
  incomeProofVerified, gstDetailsVerified) — **verbatim mirror of `ConvertLeadDto`'s own optional
  field set**, same names/decorators/imported constants. Note: `ConvertLeadDto`'s own `modelId` field
  (its Section 1 "Vehicle Information") is NOT duplicated here — `CreateDirectEnquiryDto` already
  carries `modelId` as one of the 4 Lead-equivalent config-driven fields.

`budget`/`variant`/`exchangeInterest`/`financeInterest` and the 4 config-driven Lead-equivalent
fields (`customerName`/`mobile`/`sourceId`/`modelId`) keep their exact prior required-ness —
untouched.

## 4. Service — `backend/src/enquiries/enquiries.service.ts`

`createDirect()`'s insert block now persists every new field, using the identical
`dto.field ?? null` pattern `convert()` already uses (Document Checklist booleans default to
`false`, `testDriveDateTime` is parsed into a `Date`). No change to the referential-validity
checks, duplicate-audit block, or transaction structure.

## 5. Response surface — `EnquiryResponseDto` / `enquiries.mapper.ts`

Added the 5 new Customer Details fields to both. The Section 1-7 fields were **already present**
from issue #124 — verified (not assumed) via `Read`, no changes needed there.

## 6. Customer Details: editable-vs-read-only + Source placement (design decision)

Per the issue's explicit instruction: Convert-to-Enquiry's Section 0 ("Customer Information") is
**read-only**, pre-filled from the Lead (`DetailField`, `useLead`) — there is no Lead to pre-fill
from for a Direct Enquiry, so `NewEnquiryForm`'s Section 0 ("Customer Details") is **fully
editable**, mirroring `NewLeadForm`'s own Customer Details section field-for-field (Full Name,
Email, Customer Type, Mobile, City, Pin Code, Preferred Language — same components, same dropdown
constants).

**Source placement**: Convert-to-Enquiry has no Source section at all (the Lead already captured
it at Lead-creation time). A Direct Enquiry still needs to capture Source somewhere, and per the
issue's explicit instruction it is grouped into Customer Details for this form only (NOT into its
own "Source & Assignment" section the way `NewLeadForm` does it) — `NewLeadForm`'s own "Assign to
Consultant" field was deliberately NOT carried over (Direct Enquiry has no equivalent
concept/field on `CreateDirectEnquiryDto`).

`Model of Interest` (`modelId`) moved out of the old single-column form's flat field list into
Section 1 "Vehicle Information", grouped alongside `variant`/`budget`/`exchangeInterest`/
`financeInterest` — this exactly mirrors how `ConvertLeadForm`'s own Section 1 groups its
pre-filled Vehicle Information fields together with the same 4 original required fields.

## 7. Frontend types — `frontend/src/api/client.ts`

`Enquiry` interface: added 5 optional nullable Customer Details fields (mirrors
`EnquiryResponseDto`). `CreateDirectEnquiryInput`: extended with the same two field groups as the
backend DTO (5 Customer Details + full Section 1-7 set), verbatim mirror of `ConvertLeadInput`'s
own optional fields, all still duplicated client-side per this codebase's established
frontend/backend-are-independent-packages convention (not shared code).

## 8. `NewEnquiryForm.tsx` — full rewrite

Structurally mirrors `ConvertLeadForm.tsx` exactly: `LeadFormSectionNav` side-nav + one
`<section>` per entry in a `SECTIONS` array, 2-column grid layout
(`grid grid-cols-1 gap-x-4 gap-y-1 md:grid-cols-2`). 8 sections: Customer Details (editable, see
§6), Vehicle Information, Qualification, Commercial, Finance, Exchange Evaluation, Test Drive &
Engagement, Document Checklist. Sections 1-7 are a field-for-field, dropdown-for-dropdown mirror
of `ConvertLeadForm.tsx`'s own Sections 1-7 — same labels, same imported closed-set constants, same
`FormField`/`Select`/`TextInput`/`Textarea`/`Checkbox` primitives. `useConsultants()` was newly
wired in (for the Next Action Owner dropdown in Test Drive & Engagement) — the old flat form never
needed it.

Preserved unchanged from the pre-rewrite form: config-driven mandatory-ness
(`customerName`/`mobile`/`sourceId`/`modelId` via `useFieldConfig`/`isFieldMandatory`), the
mobile-duplicate-check-on-blur flow (`useDuplicateCheck`, `DuplicateWarning`, "Proceed anyway"),
and the `onSuccess` delayed-auto-close mechanism (`SUCCESS_AUTO_CLOSE_MS`, re-exported from
`NewLeadForm`, unchanged).

## 9. `EnquiryManagementPage.tsx`

`SlideOver`'s `maxWidthClassName` widened from `max-w-2xl` to `max-w-4xl`, matching `LeadQueue`'s
Convert-to-Enquiry panel width (issue #132) — the redesigned 8-section form is far larger than the
original single-column 8-field form.

## Files changed

**Backend**
- `backend/src/migrations/1700000000018-AddEnquiryCustomerDetails.ts` (new)
- `backend/src/data-source.ts`
- `backend/src/enquiries/entities/enquiry.entity.ts`
- `backend/src/enquiries/dto/create-direct-enquiry.dto.ts`
- `backend/src/enquiries/enquiries.service.ts`
- `backend/src/enquiries/dto/enquiry-response.dto.ts`
- `backend/src/enquiries/enquiries.mapper.ts`
- `backend/test/integration/enquiry-customer-details-migration.spec.ts` (new)
- `backend/test/integration/migration.spec.ts`
- `backend/test/integration/direct-enquiry-migration.spec.ts`
- `backend/test/integration/field-config-migration.spec.ts`
- `backend/test/integration/followups-migration.spec.ts`
- `backend/test/integration/lead-customer-details-migration.spec.ts`
- `backend/test/integration/next-follow-up-at-migration.spec.ts`
- `backend/test/integration/owner-updated-at-migration.spec.ts`
- `backend/test/integration/test-drives-migration.spec.ts`
- `backend/test/integration/enquiry-conversion-details-migration.spec.ts`
- `backend/test/integration/direct-enquiry.service.spec.ts` (new `issue #134: extended field set` describe block)
- `backend/test/integration/direct-enquiry.controller.spec.ts` (new issue #134 tests)
- `backend/test/unit/create-direct-enquiry.dto.spec.ts` (new Customer Details + Sections 1-7 describe blocks)

**Frontend**
- `frontend/src/api/client.ts` (`Enquiry`, `CreateDirectEnquiryInput`)
- `frontend/src/components/NewEnquiryForm.tsx` (full rewrite)
- `frontend/src/pages/EnquiryManagementPage.tsx` (SlideOver width)
- `frontend/tests/unit/NewEnquiryForm.spec.tsx` (full rewrite)

`EnquiryManagementPage.spec.tsx` was audited (read in full) and needed **no changes** — its own
field-fill helper only touches the 8 original fields, which are unaffected in name/behavior; it
passed unmodified against the rewritten form.

## Test results

**Backend** (`npx jest`, real pg-mem-backed TypeORM DataSource, no mocking):
- **661 / 661 passed**, 46 suites — includes all pre-existing suites (unaffected/still green) plus
  the new migration spec and the extended DTO/service/controller specs.
- `npx tsc --noEmit` — clean, no errors.
- `npx eslint . --max-warnings=0` — 2 pre-existing issues (`jest.config.js` tsconfig-parsing error,
  one unused-var warning in `enquiries.repository.spec.ts`), confirmed via `git stash` to exist
  identically on the unmodified branch — **zero new lint issues** introduced by this Story.

**Frontend** (`npx vitest run`):
- **238 / 238 passed**, 30 files — run twice consecutively to confirm stability (no flakiness).
- Two tests initially failed **only under full-suite parallel CPU contention** (passed in
  isolation): a ~23-field-fill test hit vitest's default 5000ms test timeout, and a ~7-field-fill
  test's `findByText` hit Testing Library's default 1000ms assertion timeout. Both are legitimately
  slow tests (many sequential `userEvent` interactions), not functional bugs — fixed by widening
  those two tests' timeouts explicitly (`it(..., 15000)` / `it(..., 10000)` +
  `findByText(..., {}, { timeout: 5000 })`), verified stable across two full-suite reruns after the
  fix.
- Forced `npx tsc -b --force` — clean, no errors (not the incremental cache).
- `npx eslint . --max-warnings=0` — clean, zero warnings.

## Known gaps / follow-ups

- No dedicated Playwright/E2E test was added for the redesigned form (this Story's test scope was
  Jest + Vitest per the orchestrator's instructions); the existing E2E suite (if any covers
  `/enquiries`) was not audited beyond the unit/integration layers above.
- `email` has no server-side uniqueness/verification requirement (mirrors `leads.email` — informational
  only, same as issue #114 left it).
- The 5 new Customer Details columns are added only to `enquiries`; Converted Enquiries (from a
  Lead) still read Customer Information via the `leadId` join to `leads`, not from these new
  columns — this migration/DTO change is scoped to Direct Enquiries only, per the issue.
