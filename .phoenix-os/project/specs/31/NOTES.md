# Issue #31 — Schedule Next Follow-up and Auto-Generate Reminder

Fast-track implementation (no separate spec.md/tech-design.md/todo.md for this Story — direct TDD implementation extending the existing #30 Follow-up module, per orchestrator instruction). This document records the design decisions, test results, and known gaps.

## What was built

**Backend** (extends `backend/src/followups/`, does not replace it):
- `backend/src/migrations/1700000000011-AddNextFollowUpAt.ts` — new nullable `next_follow_up_at timestamptz` column on `followups`, exactly as anticipated by #30's own migration comment.
- `backend/src/followups/entities/followup.entity.ts` — added `nextFollowUpAt: Date | null`.
- `backend/src/enquiries/entities/enquiry.entity.ts` — added `ENQUIRY_STATUS_LOST`, `ENQUIRY_STATUS_BOOKED`, `ENQUIRY_TERMINAL_STATUSES`.
- `backend/src/followups/dto/log-followup.dto.ts` — added optional `nextFollowUpAt` (ISO 8601, format-only check) and `enquiryStatus` (`@IsIn` restricted to `Lost`/`Booked` only).
- `backend/src/followups/dto/followup-response.dto.ts` / `followups.mapper.ts` — added `nextFollowUpAt` to the response shape.
- `backend/src/followups/followups.errors.ts` / `followups.filters.ts` — new `NextFollowUpRequiredError` → 400, registered in `app.factory.ts`.
- `backend/src/followups/followups.service.ts` — `logFollowup` now: (1) runs `assertNextFollowUpOrTerminalStatus` (AC2's cross-field rule) before any DB call, (2) persists `nextFollowUpAt`, (3) when `enquiryStatus` is set, updates the Enquiry's status and writes an `ENQUIRY_STATUS_UPDATED` audit row, all inside the same transaction as the Follow-up insert. New `findUpcoming(actor)` for AC4.
- `backend/src/enquiries/enquiries.repository.ts` — new `updateStatus(enquiryId, status, manager)`, deliberately minimal (no transitions/reasons).
- `backend/src/followups/followups.repository.ts` — new `findUpcomingForActor` (tenant + `loggedBy` scoped, `nextFollowUpAt IS NOT NULL`, ascending sort).
- `backend/src/followups/upcoming-followups.controller.ts` — new controller, `GET /api/v1/follow-ups/upcoming`, wired into `app.module.ts`.

**Frontend**:
- `frontend/src/api/client.ts` — `LogFollowupInput.nextFollowUpAt`/`.enquiryStatus`, `Followup.nextFollowUpAt`, `api.getUpcomingFollowups()`.
- `frontend/src/hooks/useFollowups.ts` — new `useUpcomingFollowups()`; `useLogFollowup` now invalidates the upcoming-list cache on success.
- `frontend/src/components/LogFollowupForm.tsx` — new "Next Follow-up Date" (`<input type="date">`) and "Enquiry Outcome (optional)" (`Lost`/`Booked`) fields; client-side cross-field validation mirrors the backend rule.
- `frontend/src/components/UpcomingFollowupsList.tsx`, `frontend/src/pages/UpcomingFollowupsPage.tsx` — new AC4 list surface, route `/follow-ups/upcoming` (`App.tsx`).
- `frontend/src/pages/LandingPage.tsx` — new "My Upcoming Follow-ups" entry point, badged with the current count.

## Design decisions

### "Closing a Follow-up" = submitting the same log-a-follow-up request (#30's flow), not a new lifecycle

The issue body says "when closing a follow-up, DSE is prompted...". #30 built `followups` as an immutable, append-only log with no status field on the Followup entity itself (see `followup.entity.ts`'s own comment: "a Follow-up is an immutable, append-only log entry once created"). Introducing an open/closed state machine on top of that would contradict #30's explicit design. The natural reading — confirmed by the orchestrator's brief — is that "closing" means the DSE's *submission* of the current follow-up entry (the `POST /api/v1/enquiries/:enquiryId/follow-ups` call #30 already built), which now additionally captures the next scheduled action. `LogFollowupDto`/`FollowupsService`/`LogFollowupForm` were extended in place; no new lifecycle, status field, or endpoint was added to the Followup entity itself.

### Terminal-status boundary with #33

The parent issue's AC2 exception ("unless Enquiry status is set to a terminal state (Lost/Booked)") requires the *concept* of a terminal Enquiry status to exist, but issue #33 ("Update Enquiry Status as Part of a Follow-up") is explicitly the Story that owns the full status-update workflow (transitions, reasons, permissions nuance, audit trail beyond a single row). To keep this Story's scope minimal and correct:
- Added only `ENQUIRY_STATUS_LOST`/`ENQUIRY_STATUS_BOOKED` constants (the existing `status` column has no CHECK constraint — see `1700000000003-CreateEnquiries.ts` — so no migration was needed for this part).
- `LogFollowupDto.enquiryStatus` is restricted via `@IsIn(ENQUIRY_TERMINAL_STATUSES)` to **only** these two values — this endpoint deliberately does not become a general status-update surface (e.g. it cannot set `New` or any future #33 status back).
- `FollowupsService.logFollowup` updates the Enquiry's status (via the new, deliberately minimal `EnquiriesRepository.updateStatus`) and writes one `ENQUIRY_STATUS_UPDATED` audit row, in the same transaction as the Follow-up insert (ADR-009) — no transition rules, no reason capture, no permission nuance beyond the existing `create-lead` capability gate already on this endpoint.
- Every new file/comment touching this explicitly flags the boundary ("#33 owns the fuller version") so a future implementer knows this is a deliberate narrow slice, not an oversight. If #33 needs a different status-update shape (e.g. a dedicated `PATCH /api/v1/enquiries/:id/status` endpoint with reason capture), it can be added alongside this without conflict — `EnquiriesRepository.updateStatus` is a thin, reusable primitive that #33's fuller service logic can call or extend.

### AC5 ("shared scheduled job/notification service") — deferred, not built

There is no cron runner, job queue, or email/SMS/push notification service anywhere in this codebase (verified: no such infrastructure exists in `backend/src` or `package.json` dependencies). Building one from scratch is far outside this Story's fast-tracked scope and was explicitly called out as out-of-bounds. Instead:
- **AC3 ("auto-generates a reminder/task")**: the persisted `followups.next_follow_up_at` value *is* the reminder — no separate `Reminder`/`Task` entity. It is written atomically with the Follow-up row in the same transaction, which is the practical equivalent of "auto-generated" in a codebase with no async job infrastructure.
- **AC4 ("visible to the DSE ahead of the due date")**: a new `GET /api/v1/follow-ups/upcoming` endpoint (tenant + `loggedBy`-scoped, sorted most-overdue-first) plus a frontend list page (`UpcomingFollowupsPage`) reachable from a new "My Upcoming Follow-ups" entry point (badged with count) on `LandingPage`. This satisfies "visible to the DSE ahead of the due date" via a pull-based UI surface rather than a push notification.
- **AC5 itself is explicitly deferred/N/A** — there is nothing to "integrate with." If a future Story introduces a real scheduled-job/notification service, `next_follow_up_at` is already the exact data source it would need to query (no schema change required).

### Scope of `findUpcoming` (AC4)

Scoped by `loggedBy = actor.userId` (not `enquiries.owner_id`) — the DSE who scheduled the next action is the one who should see the reminder, mirroring `followups.logged_by`'s existing "who performed this action" semantics rather than Enquiry ownership. A known limitation (see Gaps below): if a *later* Follow-up on the same Enquiry closes it to a terminal status, an *earlier* Follow-up's `next_follow_up_at` (already surfaced as "upcoming") is not retroactively cleared — the list is a simple per-row query, not an Enquiry-state-aware view. Given #33 will build the fuller Enquiry-status workflow and #32 will build the fuller history/timeline, this was accepted as an explicit gap rather than adding cross-row invalidation logic to this fast-tracked Story.

### UI: single "Enquiry Outcome" selector vs. two separate controls

Considered a separate "Close Enquiry" checkbox plus a status dropdown; chose a single `<select>` ("Keep enquiry open" / `Lost` / `Booked`) for simplicity — one control fully determines both "is the next-follow-up-date requirement waived" and "what status to set," with no risk of an inconsistent checkbox+dropdown combination. The date input uses a plain `<input type="date">` wrapped in the existing `TextInput` atom rather than introducing a new date-picker component, keeping this Story's new UI surface minimal (mirrors #30's own precedent of reusing `TextInput`/adding only `Textarea` where a genuinely new control shape was needed).

## Test results

**Backend (Jest)** — `npm test` (backend/):
- Full regression suite: **330/330 passing**, 32 suites.
- New/extended in this Story: migration tests (`next-follow-up-at-migration.spec.ts`, 4 new tests), DTO unit tests (`log-followup.dto.spec.ts`, +11 tests), service tests (`followups.service.spec.ts`, +13 tests: nextFollowUpAt persistence, AC2 required-error, terminal-status exception, Enquiry status update + audit row, `findUpcoming` scoping/ordering), controller tests (`followups.controller.spec.ts`, +10 tests: 400/201 paths, `GET /api/v1/follow-ups/upcoming`, 401).
- Fixed 5 pre-existing migration-count tests (`migration.spec.ts` ×2 blocks, `direct-enquiry-migration.spec.ts`, `field-config-migration.spec.ts`, `owner-updated-at-migration.spec.ts`) plus #30's own `followups-migration.spec.ts` — each needed one more `undoLastMigration()` call to account for the new `AddNextFollowUpAt1700000000011` migration now being the last one, following the exact pattern #30 itself established for #24-#29's migrations.
- Updated #30's original happy-path test helpers (`validFollowupDto`/`validFollowupPayload` in `followups.service.spec.ts`/`followups.controller.spec.ts`) to include `nextFollowUpAt`, since AC2 now makes it conditionally mandatory on the same endpoint those tests exercise — all originally-passing #30 assertions remain intact and green.
- `npx tsc --noEmit` — clean. `npm run lint` — clean, 0 warnings.

**Frontend (Vitest)** — `npm test` (frontend/):
- Full regression suite: **98/98 passing**, 16 files.
- New in this Story: `UpcomingFollowupsList.spec.tsx` (4 tests), `UpcomingFollowupsPage.spec.tsx` (1 test), plus additions to `LogFollowupForm.spec.tsx` (+4 tests: required-error, terminal-status bypass ×2, server nextFollowUpAt field-error mapping), `LogFollowupPage.spec.tsx` (updated), `LandingPage.spec.tsx` (+2 tests: entry point + badge count), `api-client.spec.ts` (+4 tests).
- Updated #30's original `LogFollowupForm`/`LogFollowupPage` happy-path tests to fill in the new Next Follow-up Date field (same reasoning as the backend helper updates above).
- `npx tsc -b` — clean. `npm run lint` — clean, 0 warnings.

## Known gaps / follow-ups for future Stories

- No shared scheduled-job/notification service (AC5) — explicitly deferred; no such infrastructure exists in this codebase (see "AC5" design decision above).
- `findUpcoming`'s per-row scan does not retroactively hide an earlier Follow-up's `next_follow_up_at` if a *later* Follow-up on the same Enquiry closes it to Lost/Booked (see "Scope of findUpcoming" above) — acceptable at this Story's scope since #33 owns the fuller Enquiry-status workflow.
- `EnquiriesRepository.updateStatus` is deliberately minimal (no transition validation, e.g. nothing stops re-setting `Lost` → `Booked` → `Lost` repeatedly, no reason capture) — #33 owns the fuller version.
- No Playwright/E2E suite was written for this fast-tracked Story (mirrors #30's own precedent and this repo's other fast-tracked Stories).
- The "My Upcoming Follow-ups" list has no pagination/date-range filtering — acceptable at current expected data volumes; a future Story could add it if the list grows large.
