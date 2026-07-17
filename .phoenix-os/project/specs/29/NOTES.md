# Issue #29 — Detect and Alert on Duplicate Leads/Enquiries

Fast-tracked implementation (no separate spec.md/tech-design.md/todo.md for this Story — this NOTES.md is the single design-decision record, per the orchestrator's instructions). TDD throughout (Inside-Out: RED tests written alongside/just before each layer, run to GREEN before moving to the next layer), mirroring the existing #24-#28 codebase conventions.

## What was built

**Backend**
- `backend/src/common/mobile.util.ts` — added `normalizeIndiaMobile(value)`: strips whitespace/non-digit characters (spaces, dashes, parens). Does not re-validate shape; format validation stays a separate concern (`isValidIndiaMobile`/`INDIA_MOBILE_REGEX`).
- `backend/src/duplicates/` — new module:
  - `duplicates.repository.ts` — `findOpenLeadsByMobile` (excludes `LEAD_STATUS_CONVERTED`, mirrors `LeadsRepository.findOwnQueue`'s status filter) and `findOpenDirectEnquiriesByMobile` (only `entryType = DIRECT`), both scoped by `locationId` only (NOT owner-scoped — see "Design decisions" below).
  - `duplicates.service.ts` — `findMatches(mobile, locationId)`: normalizes the input, queries both tables in parallel, returns a flat `DuplicateMatchDto[]`.
  - `dto/duplicate-query.dto.ts`, `dto/duplicate-match.dto.ts`.
  - `duplicates.controller.ts` — `GET /api/v1/duplicates?mobile={value}`, `SessionAuthGuard` + `create-lead` capability (reuses the same RBAC decision issue #26 made for `DirectEnquiryController`).
  - Wired into `app.module.ts` (`DuplicatesController`/`DuplicatesService`/`DuplicatesRepository` added to the `AppModule.forRoot` controllers/providers arrays).
- `backend/src/leads/dto/create-lead.dto.ts` and `backend/src/enquiries/dto/create-direct-enquiry.dto.ts` — added optional `acknowledgeDuplicate?: boolean`.
- `backend/src/leads/leads.service.ts` (`create`) and `backend/src/enquiries/enquiries.service.ts` (`createDirect`) — both now take `DuplicatesService` as a constructor dependency, look up matches for the submitted mobile (if present) *before* opening the write transaction, and — in the SAME transaction as the Lead/Enquiry + its `*_CREATED` audit row — write a second audit_log row when a match exists:
  - `DUPLICATE_OVERRIDE_ACKNOWLEDGED` if `acknowledgeDuplicate === true`
  - `DUPLICATE_OVERRIDE_UNACKNOWLEDGED` otherwise
  - `after: { mobile, matchedIds: [...] }` on both.
  - No extra row is written when there is no match.

**Frontend**
- `frontend/src/api/client.ts` — added `DuplicateMatch` interface, `api.checkDuplicates(mobile)` (`GET /api/v1/duplicates?mobile=...`), and `acknowledgeDuplicate?: boolean` on both `CreateLeadInput` and `CreateDirectEnquiryInput`.
- `frontend/src/hooks/useDuplicateCheck.ts` — a `useMutation` wrapper (imperative `.mutateAsync`, not a `useQuery` — there's no natural cache key for a one-shot blur-triggered check).
- `frontend/src/components/DuplicateWarning.tsx` — new shared presentational banner (`role="alert"`, `data-testid="duplicate-warning"`) listing each match (`type: label (status)`) with "Proceed anyway" / "Cancel" actions. Purely presentational — the owning form gates submission.
- `frontend/src/components/NewLeadForm.tsx` and `NewEnquiryForm.tsx` — both now:
  - run the duplicate check on **blur** of the mobile field (only once it passes the existing client-side India-mobile regex);
  - clear any existing warning as soon as the mobile field changes again (stale-warning protection);
  - block form submission client-side while a warning is showing and unacknowledged;
  - "Proceed anyway" submits immediately with `acknowledgeDuplicate: true`;
  - "Cancel" just dismisses the banner (no navigation — see "Known gaps").

## Design decisions

**1. Advisory, never blocking, server-side (issue's design choice (b)/simpler option).** `LeadsService.create` / `EnquiriesService.createDirect` never reject a request because of a duplicate mobile — this preserves the pre-existing, intentional "duplicate mobile numbers are permitted" behavior from #24/#25 exactly (those tests still pass unmodified in spirit). The only effect of a duplicate match server-side is which `audit_log` action gets written (`...ACKNOWLEDGED` vs `...UNACKNOWLEDGED`). All blocking happens client-side only, in the two forms, which is what AC3 ("DSE can choose to proceed... or cancel") actually describes — the DSE's choice is a UI interaction, not a server contract. A direct API caller that skips the check entirely still succeeds; the audit trail records it as unacknowledged, which is enough to reconstruct "was this DSE warned" after the fact without ever turning a false positive (AC7's exact-match-only design already minimizes those) into a hard failure.

**2. Tenant-scoped by `locationId`, not owner-scoped.** `DuplicatesRepository` deliberately does NOT filter by `ownerId` the way `LeadsRepository.findOwnQueue` does — the whole point of AC1/AC2 is to catch a customer who already has an open record with a *different* DSE at the same dealership. Verified in `duplicates.controller.spec.ts`: a Lead created by `dseA` is found by `dseB` (same location) but not by `dseC` (different location).

**3. "Open" Leads/Enquiries.** Leads: reuses the `LEAD_STATUS_CONVERTED` exclusion already established in #25 (`status != 'Converted'`). Enquiries: no status filter is applied, because `ENQUIRY_STATUS_NEW` is the only status that exists anywhere in the product today (no "closed"/"lost" lifecycle has been built yet) — every Enquiry is "open" by definition until a future Story introduces a closed state, at which point `DuplicatesRepository.findOpenDirectEnquiriesByMobile` is the one place to add that filter.

**4. Enquiry-mobile coverage — Direct Enquiries only (documented gap, see below).** A Direct Enquiry (`entryType = DIRECT`) carries its own `mobile` column and is matched directly. An Enquiry **converted** from a Lead (`entryType = CONVERTED`) does not store its own `mobile` — it is only reachable via its (now `Converted`, therefore excluded-from-"open") parent Lead. The issue text explicitly offered this as one of two acceptable, pragmatic designs ("either... or... pick whichever is simpler"); this is the one implemented, given the fast-track time budget. See "Known gaps" for the effect and the follow-up.

**5. Client-side debounce simplified to on-blur.** The issue asked for a "debounced" check "as the DSE types/blurs." A timer-based debounce-on-keystroke was deliberately simplified to a single check on the mobile field's `blur` event (i.e., when the DSE finishes entering the number and moves on) — this still satisfies AC1 ("on entering a mobile number... the system checks") and AC5 (real-time, synchronous, not a batch job) without introducing fake-timer-dependent, potentially-flaky component tests under this fast-track's time constraints. The mobile field's `onChange` immediately clears any stale warning so an edited number is never left showing an outdated match.

**6. No record-detail page to navigate to.** AC3 says "navigate to the existing record"; no such detail page/route exists yet anywhere in this product. `DuplicateWarning` instead lists each match inline (type, label, status) — enough for the DSE to recognize the existing record and decide whether to cancel and look it up through the existing Lead/Enquiry queue pages, without inventing a new route this Story doesn't otherwise need.

## Audit trail

Two new `audit_log` actions, written in the same DB transaction as the Lead/Enquiry insert and its `LEAD_CREATED`/`ENQUIRY_CREATED_DIRECT` row:

| Action | Written when |
|---|---|
| `DUPLICATE_OVERRIDE_ACKNOWLEDGED` | A duplicate match exists AND the request's `acknowledgeDuplicate` is `true` (the DSE saw and dismissed the warning) |
| `DUPLICATE_OVERRIDE_UNACKNOWLEDGED` | A duplicate match exists AND `acknowledgeDuplicate` is absent/false (client bypassed the UI check, or the flag was never sent) |

Both rows carry `after: { mobile, matchedIds: [...] }`. No row is written when there is no duplicate match, regardless of the flag's value.

## Test results

**Backend (Jest, `npm run test` / `npx jest --runInBand` from `backend/`)** — confirmed by the orchestrator (independent run, since this agent stalled on its own final verification pass): **27/27 suites, 250/250 tests passing**, including the new `test/integration/duplicates.service.spec.ts` (10 tests: repository + service layer, exact-match/tenant-scoping/open-vs-Converted coverage) and `test/integration/duplicates.controller.spec.ts` (6 tests: HTTP contract, 400/401/403, cross-location isolation), plus new duplicate-audit-note cases added to `leads.service.spec.ts` and `direct-enquiry.service.spec.ts`. `npx tsc --noEmit` clean. All pre-existing tests — including `leads.service.spec.ts`'s "permits a second lead with a duplicate mobile" and `create-lead.controller.spec.ts`'s "EVAL-CC-03: duplicate mobile across two leads is permitted" — still pass with their original assertions unchanged (creation is still never blocked). One pre-existing test (`leads.service.spec.ts`'s EVAL-CC-11) was adjusted to filter its `audit_log` query by `action = 'LEAD_CREATED'` in addition to `entity_id`, because that test's shared fixed mobile number (`'9876543210'`, reused across many tests in the same file) now legitimately also produces a `DUPLICATE_OVERRIDE_UNACKNOWLEDGED` row later in the suite run — the assertion itself ("exactly one LEAD_CREATED row exists") is unchanged, only made precise against the new second action type.

**Frontend (Vitest, `npx vitest run` from `frontend/`)** — **11/11 test files, 68/68 tests passing**. `npx tsc -b` clean. New coverage: 6 duplicate-warning tests in `NewLeadForm.spec.tsx` (blur-triggered check, invalid-mobile no-op, warning rendering, submit-blocked, Cancel, Proceed-anyway, stale-warning-clear) and 4 in `NewEnquiryForm.spec.tsx` (mirrors the same behavior). All pre-existing tests in both files still pass unchanged — `api.checkDuplicates` was added to each file's existing `api` mock (defaulting to `mockResolvedValue([])`) so every pre-existing mobile-blur interaction in those suites remains a no-op, exactly as before.

## Known gaps / follow-ups

1. **Converted-Enquiry mobile not covered.** As documented in decision #4 above: if a Lead with mobile X was already converted into an Enquiry, a *new* duplicate check for mobile X will NOT surface that Enquiry (its parent Lead is `Converted`, excluded from "open Leads"; the Enquiry itself has no `mobile` column for a `CONVERTED`-type row). Follow-up: extend `DuplicatesRepository` with a query joining `enquiries.lead_id -> leads.mobile` for `entryType = CONVERTED` rows, scoped the same way.
2. **No Enquiry "closed" status yet.** `findOpenDirectEnquiriesByMobile` has no status filter because none exists in the product yet. When a closed/lost Enquiry status is introduced, add the equivalent exclusion there (mirrors how `LEAD_STATUS_CONVERTED` is excluded for Leads today).
3. **No record-detail navigation.** "Cancel and navigate to the existing record" (AC3) is satisfied only as "see the existing record's name/status inline" — there is no per-record detail page/route in the product yet to navigate to.
4. **Debounce simplified to blur-only**, not keystroke-debounced — see decision #5. If product feedback wants a true type-ahead check, add a debounced `onChange` trigger (with fake-timer-based tests) on top of the existing blur trigger, which can stay as a fallback.
5. Full atomic-rollback verification of the new duplicate-audit `audit_log` write (like the pre-existing note in `leads.service.spec.ts` about `pg-mem` not implementing real MVCC rollback) still needs a real Postgres run in CI/dev before this ships to production, consistent with the rest of this codebase's existing pg-mem caveat.
