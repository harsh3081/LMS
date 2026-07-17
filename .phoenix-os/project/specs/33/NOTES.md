# Issue #33 — Update Enquiry Status as Part of a Follow-up

Fast-track implementation (no separate spec.md/tech-design.md/todo.md for
this Story — direct TDD implementation, per orchestrator instruction). TDD
approach: Inside-Out (DESIGN -> RED -> GREEN), mirroring #30/#31/#32's
existing test structure exactly. As the orchestrator's brief anticipated,
this Story's real scope was narrow: #31 and #32 had already pulled forward
the terminal-status (Lost/Booked) plumbing (persistence, audit, timeline
rendering) needed for their own ACs. This Story's job was to widen that to
the full status vocabulary (Hot/Warm/Cold/Lost/Booked) and fix the one
resulting logic bug.

## What was built

### Backend

- **`backend/src/enquiries/entities/enquiry.entity.ts`** — added
  `ENQUIRY_STATUS_HOT`/`ENQUIRY_STATUS_WARM`/`ENQUIRY_STATUS_COLD` and a new
  `ENQUIRY_ALL_LOGGABLE_STATUSES = [Hot, Warm, Cold, Lost, Booked]` array.
  `ENQUIRY_TERMINAL_STATUSES` (Lost/Booked only, from #31) is **unchanged** —
  it continues to mean "waives the Next Follow-up Date requirement" (AC4),
  which is a strict subset of the loggable set.
- **`backend/src/followups/dto/log-followup.dto.ts`** — `enquiryStatus`'s
  `@IsIn` widened from `ENQUIRY_TERMINAL_STATUSES` to
  `ENQUIRY_ALL_LOGGABLE_STATUSES` (AC1/AC5). Docblock/`@ApiProperty`
  description updated to spell out that only Lost/Booked are terminal.
- **`backend/src/followups/followups.service.ts`** —
  **the one real bug fix**: `assertNextFollowUpOrTerminalStatus`'s
  `isTerminal` check changed from `dto.enquiryStatus !== undefined` (true for
  *any* non-empty status, which was correct back when only Lost/Booked were
  legal values) to
  `dto.enquiryStatus !== undefined && ENQUIRY_TERMINAL_STATUSES.includes(dto.enquiryStatus)`.
  Without this fix, setting `enquiryStatus: 'Hot'` would have incorrectly
  waived the Next Follow-up Date requirement (AC4 violation) the moment the
  DTO's `@IsIn` was widened.
- **`EnquiriesRepository.updateStatus`** — read, not modified. Confirmed
  value-agnostic (`enquiry.status = status; return repository.save(enquiry)`,
  no allow-list, no transition check) — it already accepts any string,
  including the three new values, with no code change needed.

### Frontend

- **`frontend/src/api/client.ts`** — `LogFollowupInput.enquiryStatus`
  widened from `'Lost' | 'Booked'` to
  `'Hot' | 'Warm' | 'Cold' | 'Lost' | 'Booked'`.
- **`frontend/src/components/LogFollowupForm.tsx`** — added a second local
  array, `ENQUIRY_ALL_LOGGABLE_STATUSES` (mirrors the backend's new export),
  used to populate the "Enquiry Outcome" `<select>` options. The pre-existing
  `ENQUIRY_TERMINAL_STATUSES` array is kept, now used **only** by the
  `nextFollowUpAt` field's `validate` function to decide whether the
  Next-Follow-up-Date requirement is waived — mirroring the backend fix
  exactly, so Hot/Warm/Cold selections still require a date client-side too.

## Design decisions

### `ENQUIRY_ALL_LOGGABLE_STATUSES` vs. a general Enquiry status enum

Named "loggable" (not e.g. `ENQUIRY_ALL_STATUSES`) because it deliberately
excludes `ENQUIRY_STATUS_NEW` — `New` is the server-assigned default at
Enquiry creation and is not one of the values a DSE can set via
`LogFollowupDto.enquiryStatus`. This endpoint remains scoped to "the 5
outcomes a DSE can record via a Follow-up" (AC1), not a general
status-reset/status-enum surface. If a future Story needs to enumerate every
possible Enquiry status (e.g. for a status filter/dashboard), that is a
distinct concept from this array and should not casually reuse it.

### Terminal vs. loggable: two separate arrays, not one with a `terminal: boolean` flag

Kept `ENQUIRY_TERMINAL_STATUSES` (2 values) and `ENQUIRY_ALL_LOGGABLE_STATUSES`
(5 values, superset) as two flat arrays rather than refactoring into a single
list of `{ value, terminal }` objects. This matches the existing codebase
convention (#31 already established `ENQUIRY_TERMINAL_STATUSES` as a flat
`as const` tuple consumed directly by `@IsIn`) and keeps the diff minimal —
`@IsIn` and `.includes()` both want flat arrays, and introducing an object
shape would have required touching every existing call site for no
behavioral gain.

### Frontend mirrors backend arrays independently (no shared package)

Consistent with #31's own precedent (`LogFollowupForm.tsx`'s
`FOLLOWUP_TYPES`/`ENQUIRY_TERMINAL_STATUSES` already duplicated
backend constants by hand, documented as deliberate since there is no
shared-code boundary between `backend/` and `frontend/` in this repo). The
same pattern was used here for `ENQUIRY_ALL_LOGGABLE_STATUSES` — each side's
array carries a comment cross-referencing the other.

### AC5 (invalid/case/whitespace handling)

`@IsIn` performs a strict `===` membership check, so:
- An unrecognized value (`'Bogus'`, `'Won'`) → 400 (AC5, core requirement).
- Case mismatch (`'hot'` vs `'Hot'`) → 400. No case-insensitive matching was
  added; the codebase's existing `@IsIn` usages (e.g. `FOLLOWUP_TYPES`) are
  all case-sensitive exact-match, and introducing normalization for just this
  field would be an inconsistent, undiscussed behavior change.
- Surrounding whitespace (`' Hot '`) → 400. No trimming was added, for the
  same consistency reason (`LogFollowupDto.remarks` is the only field in this
  DTO that does whitespace-aware validation, and that's because AC2/AC3
  specifically calls out "meaningful free text", not because of a general
  trimming convention).

Both are pragmatic "leave it strict, document it" decisions rather than
silent scope creep.

## Test results

### Backend (Jest) — full regression

```
Test Suites: 32 passed, 32 total
Tests:       383 passed, 383 total
```
(+21 over #32's 362: 8 in `log-followup.dto.spec.ts`, 8 in
`followups.service.spec.ts`, 5 in `followups.controller.spec.ts`.)

New/changed coverage for this Story:
- `backend/test/unit/log-followup.dto.spec.ts` — `enquiryStatus` widened
  describe block: passes for all 5 loggable values (Hot/Warm/Cold/Lost/
  Booked, replacing the old 2-value loop), fails for out-of-set ("New",
  "Won"), fails for case-mismatch ("hot"), fails for whitespace-padded
  (" Hot ") — AC1/AC5.
- `backend/test/integration/followups.service.spec.ts` — new
  `describe('issue #33: ...')` block: Hot/Warm/Cold **without**
  `nextFollowUpAt` → `NextFollowUpRequiredError` (the AC4 negative case that
  proves the bug fix), Hot/Warm/Cold **with** `nextFollowUpAt` → succeeds,
  persists `resultingStatus`, updates `Enquiry.status`; a regression
  `it.each` re-confirming Lost/Booked without `nextFollowUpAt` still succeed
  (proves the fix didn't regress the pre-existing terminal-status exception).
- `backend/test/integration/followups.controller.spec.ts` — new
  `describe('issue #33: ...')` block: HTTP-level 201 for Hot/Warm/Cold with a
  date, 400 for Hot/Warm/Cold without one (asserting the response body
  mentions `nextFollowUpAt`), `Enquiry.status` visible via
  `GET /api/v1/enquiries` after a "Hot" Follow-up, and a 400 for an
  unrecognized `enquiryStatus` value (AC5) through the real ValidationPipe.

`npx tsc --noEmit` — clean. `npm run lint` (`eslint src/**/*.ts
--max-warnings=0`) — clean, 0 warnings.

### Frontend (Vitest) — full regression

```
Test Files: 17 passed (17)
Tests:      113 passed (113)
```
(+7 over #32's 106, all in `LogFollowupForm.spec.tsx`.)

New coverage: the "Enquiry Outcome" selector now offers all 5 options
(assertion added); `it.each(['Hot','Warm','Cold'])` selecting a non-terminal
outcome without a next-follow-up-date still shows the required-field error
and does not call the API (AC4, mirrors the backend fix client-side);
`it.each(['Hot','Warm','Cold'])` selecting one WITH a date submits
successfully and calls `logFollowup` with the expected payload shape.

`npx tsc -b --force` (forced full rebuild, not relying on the incremental
cache, per the orchestrator's explicit instruction after #32's
self-report/independent-verification mismatch) — **clean, exit 0**.
`npm run lint` (`eslint src/**/*.{ts,tsx} --max-warnings=0`) — clean, 0
warnings.

## Files touched

Backend:
- `backend/src/enquiries/entities/enquiry.entity.ts`
- `backend/src/followups/dto/log-followup.dto.ts`
- `backend/src/followups/followups.service.ts`
- `backend/test/unit/log-followup.dto.spec.ts`
- `backend/test/integration/followups.service.spec.ts`
- `backend/test/integration/followups.controller.spec.ts`

Frontend:
- `frontend/src/api/client.ts`
- `frontend/src/components/LogFollowupForm.tsx`
- `frontend/tests/unit/LogFollowupForm.spec.tsx`

No migration was needed (the `enquiries.status` column has no CHECK
constraint — confirmed in #31's own NOTES.md and unchanged since). No other
files required changes: `FollowupHistoryTimeline.tsx` (#32) already renders
`resultingStatus` generically for any string value, satisfying AC3 with zero
changes; `EnquiriesRepository.updateStatus` (#31) was already value-agnostic.

## Known gaps / follow-ups

- **No way to browse/filter Enquiries by status** — there is still no
  Enquiry list/dashboard view anywhere in the frontend that lets a DSE/TL/
  SM-GM see "all my Hot enquiries" or similar. `GET /api/v1/enquiries`
  returns status in the payload (confirmed via this Story's own controller
  test), so the data is available; only a status-filtered browsing UI is
  missing. This is a good candidate for a first Story under a **new Epic**
  (this is the final Story of Epic #1), since it's a cross-cutting
  reporting/dashboard concern rather than a Follow-up-module extension.
- **No status-transition rules** — `EnquiriesRepository.updateStatus` still
  allows any transition (e.g. `Booked` → `Hot` → `Lost` → `Booked` again,
  repeatedly), a gap explicitly flagged since #31. Out of this Story's scope
  per the orchestrator's brief (ACs 1-5 say nothing about transition
  validity), but worth a product decision if the business wants a one-way
  funnel (e.g. `Lost`/`Booked` should be terminal in the stronger sense of
  "cannot be changed after being set").
- **No dedicated `PATCH /api/v1/enquiries/:id/status` endpoint** — status can
  only be changed as a side effect of logging a Follow-up (this Story's and
  #31's scope). If product wants a DSE to correct a status without adding a
  Follow-up entry, that would need a new endpoint; `EnquiriesRepository
  .updateStatus` is already a reusable primitive for it.
- No Playwright/E2E suite was written for this fast-tracked Story (mirrors
  #30/#31/#32's own precedent and this repo's other fast-tracked Stories).
