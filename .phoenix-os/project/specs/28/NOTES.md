# Issue #28 — Auto-Capture Ownership and Audit Metadata

Fast-tracked implementation (no separate spec.md/tech-design.md/todo.md for
this Story — direct TDD against the existing #24-#27 codebase, per the
orchestrator's instructions). This file is the implementation record.

## Already satisfied by #24-#27 (confirmed by reading the code, then adding a direct test)

| AC | Where | Verification added this Story |
|----|-------|-------------------------------|
| AC1 (created-by/created-on auto-captured) | `LeadEntity.createdBy`/`createdAt`, `EnquiryEntity.convertedBy`/`convertedAt`, both server-derived in `LeadsService.create` / `EnquiriesService.convert` / `EnquiriesService.createDirect` — never accepted from the client DTO (`CreateLeadDto`/`ConvertLeadDto`/`CreateDirectEnquiryDto` don't even declare these fields; the global `ValidationPipe({ whitelist: true })` strips any extra body properties) | Enquiry side already had a direct proof (`convert-lead.controller.spec.ts` "EVAL-AC6-01/02: convertedBy and convertedAt are recorded"). Lead side did NOT have an equivalent response-level proof — added `EVAL-CC-14`/`EVAL-CC-15` to `create-lead.controller.spec.ts` |
| AC2 (current-owner defaults to creating DSE) | `ownerId: actor.userId` set alongside `createdBy`/`convertedBy` in all three create paths | Already covered by `leads.service.spec.ts` ("derives owner/... from the actor") and `EVAL-CC-01` tests in both controller specs |
| AC3 (created-by/created-on read-only) | Not present in any Create*Dto, so structurally un-settable by a client | Already covered by `EVAL-CC-01`/`EVAL-CC-02` (ownerId/status). Added `EVAL-CC-15` to explicitly prove a client-supplied `createdBy` is ignored for Lead (the equivalent `convertedBy` case for Enquiry was already covered by convert-lead's `EVAL-CC-01`) |
| AC5 (metadata visible to DSE/TL/SM-GM) | No TL/SM-GM views exist yet anywhere in this codebase (deferred to Feature #17, Team Lead Oversight) | Interpreted per the orchestrator's scoping: metadata must not be hidden from the owning DSE, and the API/data model must not structurally block a future TL/SM-GM view. No masking exists on any of these fields — confirmed by reading `LeadResponseDto`/`EnquiryResponseDto` and their controllers/mapper. No UI/dashboard work done (out of scope) |
| AC6 (metadata in REST response) | `EnquiryResponseDto` already included `convertedBy`/`convertedAt`/`ownerId`. **`LeadResponseDto` did NOT include `createdBy`** — genuine gap, fixed (see below) |

## Newly built this Story

1. **Lead API response gap (AC1/AC6) — fixed**
   - `backend/src/leads/dto/lead-response.dto.ts`: added `createdBy` (and `ownerUpdatedAt`, see #2) to `LeadResponseDto`.
   - `backend/src/leads/leads.controller.ts`: `toResponse()` now maps `lead.createdBy` (and `lead.ownerUpdatedAt`) into the response.
   - Proven by two new tests in `backend/test/integration/create-lead.controller.spec.ts`: `EVAL-CC-14` (createdBy/createdAt/ownerId present and correct) and `EVAL-CC-15` (client-supplied createdBy is ignored).

2. **AC4 — owner-reassignment audit mechanism (the genuine gap called out up front)**
   No reassignment endpoint/UI exists anywhere in this codebase yet (TL/SM-GM team management is a separate, later Epic/Feature — Feature #7, this Story's parent, is about Lead/Enquiry *creation*). Built the underlying mechanism only, so a future TL-reassignment Story can wire an HTTP surface onto it without further schema/service changes:
   - **Migration** `backend/src/migrations/1700000000009-AddOwnerUpdatedAt.ts` — additive, nullable `owner_updated_at` (timestamptz) column on both `leads` and `enquiries`. No backfill needed (NULL = "never reassigned"). Wired into `backend/src/data-source.ts`.
   - **Entities**: `LeadEntity.ownerUpdatedAt` / `EnquiryEntity.ownerUpdatedAt` (nullable `Date`).
   - **Repository methods**: `LeadsRepository.reassignOwner(leadId, newOwnerId, manager?)` / `EnquiriesRepository.reassignOwner(enquiryId, newOwnerId, manager?)` — update `ownerId` + stamp `ownerUpdatedAt`, return `null` if the target doesn't exist.
   - **Service methods**: `LeadsService.reassignOwner(leadId, newOwnerId, actor)` / `EnquiriesService.reassignOwner(enquiryId, newOwnerId, actor)` — wrap the repository call in a `dataSource.transaction` alongside an `audit_log` write (`LEAD_OWNER_REASSIGNED` / `ENQUIRY_OWNER_REASSIGNED`, with `before`/`after` ownerId), mirroring the existing `LEAD_CREATED`/`LEAD_CONVERTED` audit pattern. Throw a new `LeadReassignTargetNotFoundError` / `EnquiryReassignTargetNotFoundError` (added to the existing `leads.errors.ts` / `enquiries.errors.ts`) when the target doesn't exist.
   - **No controller/route** was added — intentionally deferred, per the orchestrator's scope instructions.
   - **Tests**: new `backend/test/integration/owner-reassignment.spec.ts` (13 tests: repository-level null-on-missing + ownerId/ownerUpdatedAt-set behavior, service-level audit-log content, transactional-atomicity spy, not-found error paths, and a second-reassignment-advances-the-timestamp check, for both Lead and Enquiry) and new `backend/test/integration/owner-updated-at-migration.spec.ts` (4 tests: up-migration adds the column to both tables, defaults to NULL on insert for both, down-migration cleanly drops it from both without touching the tables themselves).
   - `ownerUpdatedAt` was also added to `LeadResponseDto`/`EnquiryResponseDto` (nullable, null until ever reassigned) so the audit trail is visible in the API surface consistent with AC6, even though nothing sets it yet through any live endpoint.

3. **Test-file maintenance for the new additive migration** (not a product-behavior change, required because these tests assert exact column lists / migration-undo counts): updated `backend/test/integration/migration.spec.ts` (added `owner_updated_at` to both the leads and enquiries expected-column lists; bumped both down-migration undo counts by 1), `backend/test/integration/direct-enquiry-migration.spec.ts` (undo count 4→5), and `backend/test/integration/field-config-migration.spec.ts` (undo count 3→4).

## Test results

- Backend (Jest): **25 suites / 222 tests, all passing** (`npx jest --runInBand`), including all pre-existing #24-#27 suites (zero regressions) plus the two new files added this Story.
- Frontend (Vitest): **11 suites / 57 tests, all passing** (`npx vitest run`), unchanged by this Story (no frontend code was touched — additive backend response fields don't affect the existing frontend type usage).
- `tsc --noEmit` on the backend: clean.

## Known gaps / deferred (by design, per this Story's scope)

- **No reassignment endpoint or UI.** `LeadsService.reassignOwner` / `EnquiriesService.reassignOwner` are only exercised directly against the service/repository layer in tests. Wiring an HTTP route (with its own authorization model — who is allowed to reassign whose Lead/Enquiry) is explicitly deferred to a future TL/SM-GM-focused Story (Feature #17, Team Lead Oversight, or similar).
- **No TL/SM-GM dashboard/view.** AC5 is satisfied only in the narrow sense described above (no masking, no structural blocker) — building an actual role-scoped view is out of this Story's scope.
- `ownerUpdatedAt` in the API responses will read `null` for every record until a future Story's endpoint calls the reassignment service methods added here.

## Files touched

- `backend/src/leads/entities/lead.entity.ts`
- `backend/src/enquiries/entities/enquiry.entity.ts`
- `backend/src/migrations/1700000000009-AddOwnerUpdatedAt.ts` (new)
- `backend/src/data-source.ts`
- `backend/src/leads/leads.repository.ts`
- `backend/src/enquiries/enquiries.repository.ts`
- `backend/src/leads/leads.errors.ts`
- `backend/src/enquiries/enquiries.errors.ts`
- `backend/src/leads/leads.service.ts`
- `backend/src/enquiries/enquiries.service.ts`
- `backend/src/leads/dto/lead-response.dto.ts`
- `backend/src/leads/leads.controller.ts`
- `backend/src/enquiries/dto/enquiry-response.dto.ts`
- `backend/src/enquiries/enquiries.mapper.ts`
- `backend/test/integration/owner-reassignment.spec.ts` (new)
- `backend/test/integration/owner-updated-at-migration.spec.ts` (new)
- `backend/test/integration/create-lead.controller.spec.ts` (added EVAL-CC-14/15)
- `backend/test/integration/migration.spec.ts` (column list + undo count updates)
- `backend/test/integration/direct-enquiry-migration.spec.ts` (undo count update)
- `backend/test/integration/field-config-migration.spec.ts` (undo count update)

Frozen specs under `.phoenix-os/project/specs/{24,25,26,27}/` were not modified.
