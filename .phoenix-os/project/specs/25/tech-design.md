# Technical Design

**Issue**: #25
**Title**: [Story] Convert a Lead into an Enquiry
**Created**: 2026-07-16

---

## Overview

### Technical Objective
Add a `POST /api/v1/leads/{leadId}/convert` write-path that, in one transaction, creates a new `enquiries` row linked to the source Lead, flips that Lead's status to `Converted`, and writes a `LEAD_CONVERTED` audit entry. Introduce a new **Enquiry** NestJS module (controller/service/repository/entity/DTOs) and a reversible `enquiries` migration. Exclude `Converted` Leads from the owner queue. Add a feature-flagged SPA "Convert to Enquiry" action + qualifying-details form. All owner/tenant/converting-DSE/status fields server-derived from `Principal`.

### Architecture Context
Reuses #24's choke-points verbatim: `SessionAuthGuard` + `@RequireCapability` (deny-by-default RBAC), `Principal`-derived owner/tenant scoping, transactional persist-plus-`audit_log` via `AuditLogRepository`, global `ValidationPipe({ whitelist: true })`, and the `{field,message}[]` error convention. No new patterns are introduced; the Enquiry module mirrors the Leads module's structure exactly. Route stays on the Leads path (sub-resource action) while the handler lives in the new Enquiry module (resolved in spec).

---

## Technical Approach

### Technology Stack
**Languages**: TypeScript (backend + frontend)
**Frameworks/Libraries**: NestJS 10, TypeORM (`DataSource`-token pattern, no `@InjectRepository`), `class-validator`/`class-transformer`, `@nestjs/swagger`; React 18 + Vite, `react-hook-form`, TanStack Query, Tailwind
**Tools**: Jest + Supertest + pg-mem integration harness (backend); Vitest + Testing Library (frontend)
**Infrastructure**: PostgreSQL 16 (real); pg-mem substitute for tests

---

## Component Design

### Component 1: Enquiry module (NEW) — `backend/src/enquiries/`
**Purpose**: Host the conversion write-path and Enquiry persistence.
**Files** (mirror `leads/`):
- `enquiries.controller.ts` — `@Controller('api/v1/leads')`, `@ApiTags('enquiries')`, `@UseGuards(SessionAuthGuard)`. Single route `@Post(':leadId/convert')` `@HttpCode(201)` `@RequireCapability('convert-lead')` `@ApiCreatedResponse({ type: EnquiryResponseDto })`. Signature: `convert(@Param('leadId') leadId: string, @Body() dto: ConvertLeadDto, @CurrentPrincipal() actor: Principal)`. Maps entity → `EnquiryResponseDto` via a local `toResponse` (mirrors `leads.controller.ts`).
- `enquiries.service.ts` — `convert(leadId, dto, actor)`: (1) load Lead scoped to actor via `LeadsRepository.findOwnedById` → `null` ⇒ throw `LeadNotFoundError` (404); (2) if `lead.status === LEAD_STATUS_CONVERTED` ⇒ throw `LeadAlreadyConvertedError` (409); (3) `dataSource.transaction`: insert Enquiry (owner/location/dealerGroup/convertedBy = `actor.*`, `status = ENQUIRY_STATUS_NEW`, `customFields = {}`, `leadId`, four qualifying fields), flip `lead.status = LEAD_STATUS_CONVERTED` + save, `auditLogRepository.record({ action:'LEAD_CONVERTED', entityType:'lead', entityId: leadId, before:{status:prev}, after:{status:'Converted', enquiryId} }, manager)`. Returns the saved Enquiry.
- `enquiries.repository.ts` — `insert(data, manager?)` following `leads.repository.ts` `repo(manager)` pattern.
- `entities/enquiry.entity.ts` — see Data Design; exports `ENQUIRY_STATUS_NEW = 'New'`.
- `dto/convert-lead.dto.ts`, `dto/enquiry-response.dto.ts` — see Data Design.
- `enquiries.errors.ts` — `LeadNotFoundError`, `LeadAlreadyConvertedError` (each carrying `FieldError[]` reusing `leads/leads.errors.ts` `FieldError`).
**Dependencies**: `DataSource`, `LeadsRepository`, `AuditLogRepository`, `LeadEntity`/`LEAD_STATUS_CONVERTED`.

### Component 2: Leads module (EXTENDED)
- `entities/lead.entity.ts` — add `export const LEAD_STATUS_CONVERTED = 'Converted';` (data-only value; no schema change).
- `leads.repository.ts` — (a) NEW `findOwnedById(leadId, actor, manager?)`: `findOne` where `leadId` + `ownerId`/`locationId`/`dealerGroupId` = actor scope, **all statuses** (must return `Converted` leads so the service can distinguish 409 from 404). (b) modify `findOwnQueue` `where` to add `status: Not(LEAD_STATUS_CONVERTED)` (import `Not` from `typeorm`) — AC5.

### Component 3: Eligibility error filter (NEW) — `backend/src/common/enquiry-eligibility.filter.ts`
**Purpose**: Map the two eligibility errors to HTTP, analogous to `referential-validation.filter.ts`.
`@Catch(LeadNotFoundError, LeadAlreadyConvertedError)` → `404`/`409` respectively, body = `exception.errors` (`{field,message}[]`). Registered in `app.factory.ts` `useGlobalFilters(...)` alongside `ReferentialValidationExceptionFilter`.

### Component 4: Feature flag (EXTENDED)
- `config/feature-flags.service.ts` — add `isConvertLeadEnabled(): boolean { return process.env.CONVERT_LEAD_ENABLED !== 'false'; }` (mirrors `NEW_LEAD_ENABLED`).
- `config/config.controller.ts` — `getConfig()` returns `{ newLeadEnabled, convertLeadEnabled }`.

### Component 5: Module wiring — `backend/src/app.module.ts`
Add `EnquiriesController` to `controllers`; add `EnquiriesService`, `EnquiriesRepository` to `providers` (LeadsRepository/AuditLogRepository already provided).

### Component 6: Frontend (React SPA)
- `api/client.ts` — add `ConvertLeadInput` (`{ budget:number; variant:string; exchangeInterest:boolean; financeInterest:boolean }`), `Enquiry` type (matches `EnquiryResponseDto`), `api.convertLead(leadId, input)` → `POST /api/v1/leads/${leadId}/convert`; extend `getConfig` return type with `convertLeadEnabled`.
- `hooks/useEnquiries.ts` (NEW) — `useConvertLead()` mutation; `onSuccess` removes the converted Lead from the `LEADS_QUERY_KEY` cache (filter by `leadId`) so it leaves the open queue (AC5), mirroring `useCreateLead`'s cache update.
- `components/ConvertLeadForm.tsx` (NEW) — `react-hook-form`, reuses `FormField`/`TextInput`/`Select`/`Button`. Fields: budget (numeric TextInput), variant (TextInput), exchangeInterest + financeInterest (Yes/No `Select`). Inline validation mirrors server rules (budget positive integer; variant non-empty; booleans required). Maps server `fieldErrors` back onto fields via `setError` (same pattern as `NewLeadForm.tsx`).
- `components/LeadQueue.tsx` (EXTENDED) — add an "Actions" column; for each row with `status !== 'Converted'`, render a "Convert to Enquiry" `Button` **only when `convertLeadEnabled`** (`useFeatureFlags`). Clicking reveals `ConvertLeadForm` inline for that `leadId` (no new route).

---

## Data Design

### Data Models
**NEW `enquiries` table / `EnquiryEntity`** (mirrors `LeadEntity` conventions — uuid PK, snake_case columns, `jsonbTransformer`, `CreateDateColumn`/`UpdateDateColumn`):

| Column | Type | Notes |
|---|---|---|
| `enquiry_id` | uuid PK `uuid_generate_v4()` | `@PrimaryGeneratedColumn('uuid')` |
| `lead_id` | uuid, FK → `leads(lead_id)` | source Lead (AC4) |
| `budget` | int | positive INR whole rupees (see Clarification Q1) |
| `variant` | text | free-text label |
| `exchange_interest` | boolean | |
| `finance_interest` | boolean | |
| `converted_by` | uuid, FK → `users(user_id)` | = `actor.userId` (AC6) |
| `owner_id` | uuid, FK → `users(user_id)` | server-derived |
| `location_id` | uuid, FK → `locations(location_id)` | tenant scope |
| `dealer_group_id` | uuid, FK → `dealer_groups(dealer_group_id)` | tenant scope |
| `status` | varchar default `'New'` | `ENQUIRY_STATUS_NEW` |
| `custom_fields` | jsonb default `'{}'` | reserved for FR-04 |
| `converted_at` | timestamptz default `now()` | `@CreateDateColumn` = conversion timestamp (AC6) |
| `updated_at` | timestamptz default `now()` | `@UpdateDateColumn` |
- Index `idx_enquiries_owner_location_created` on `(owner_id, location_id, converted_at)`, declared inside `CREATE TABLE` `indices:[]` (pg-mem-safe, per #24).
- Unique constraint on `lead_id` — DB-level defense-in-depth for one-Enquiry-per-Lead (see Clarification Q2).

**ConvertLeadDto** (client-supplied only; `whitelist:true` strips the rest):
- `budget` — `@IsInt` `@IsPositive` (messages e.g. `'budget must be a positive integer'`)
- `variant` — `@IsString` `@IsNotEmpty({ message:'variant is required' })`
- `exchangeInterest` — `@IsBoolean`
- `financeInterest` — `@IsBoolean`
- Each `@ApiProperty(...)`. `leadId` comes from the path param, never the body.

**EnquiryResponseDto** (unmasked, mirrors `LeadResponseDto`): `enquiryId`, `leadId`, `budget`, `variant`, `exchangeInterest`, `financeInterest`, `convertedBy`, `convertedAt` (ISO string), `status`, `ownerId`, `locationId`. (Per resolved spec — `dealerGroupId` intentionally excluded from the response.)

### Data Flow
SPA form → `POST /api/v1/leads/{leadId}/convert` (cookie session) → guard (authn + `convert-lead`) → `ValidationPipe` → service load+eligibility → transaction (Enquiry insert + Lead status flip + audit) → `201` `EnquiryResponseDto` → hook removes Lead from cached queue.

### Storage Strategy
PostgreSQL. **NEW migration `backend/src/migrations/1700000000003-CreateEnquiries.ts`** — follow `1700000000002` style exactly: `queryRunner.createTable(new Table({...}), true)` with `foreignKeys` to `leads`/`users`/`locations`/`dealer_groups`, embedded `indices`, and unique on `lead_id`; `down()` = `await queryRunner.query('DROP TABLE IF EXISTS "enquiries" CASCADE')`. The `Converted` Lead status is additive/data-only — **no** migration for it.

---

## Integration Points

### Internal Systems (all REUSE unless marked NEW)
- `SessionAuthGuard` + `@RequireCapability('convert-lead')` (NEW capability value; wiring reused) — the DSE principal/fixtures must carry `convert-lead`.
- `AuditLogRepository.record` — REUSE; NEW action value `LEAD_CONVERTED`.
- `LeadsRepository` — REUSE + NEW `findOwnedById`; modified `findOwnQueue`.
- Global `ValidationPipe` + `validation-exception.factory.ts` `{field,message}[]` — REUSE.
- `app.factory.ts` global filters — REUSE + register NEW eligibility filter.
- OpenAPI doc at `/api` / `/api-json` — REUSE; additive endpoint (AC7).

### Mocking strategy for Integration Points
None. Backend uses real execution against the pg-mem harness (`test/support/test-app.ts`, `test-data-source.ts`); frontend mocks only the `api` client per existing UI-test convention.

---

## Technical Constraints

### Security
- All ownership/tenant/converting-DSE/status fields server-derived from `Principal`; client cannot set them (`whitelist:true`).
- Tenant + owner scoping enforced at `findOwnedById`; out-of-scope/other-owner Lead ⇒ 404 (indistinguishable from non-existent — no cross-tenant leakage).
- Deny-by-default: missing session ⇒ 401; missing `convert-lead` ⇒ 403.

### Performance / Scalability
Single indexed PK/FK lookups + one transaction. Negligible; no new hot paths.

### Browser/Platform Compatibility
Same as #24 (modern evergreen SPA). No new constraints.

---

## Implementation Strategy

### Phased Approach
Phase 1 (backend): entity + migration `1700000000003` → DTOs/errors → repository (`findOwnedById`, queue exclusion) → service → controller → eligibility filter + app wiring + config flag → integration tests.
Phase 2 (frontend): api client + types → `useEnquiries` → `ConvertLeadForm` → `LeadQueue` action behind flag → UI tests.

### Dependencies and Prerequisites
Merged #24 codebase (present). `convert-lead` capability seeded on the DSE test principal. `CONVERT_LEAD_ENABLED` env recognized (default on).

### Migration Strategy
New reversible `enquiries` migration only; no data backfill; existing Leads unchanged (remain in current statuses).

---

## Testing Strategy

### Integration Testing (backend, ≥80% on new path, each AC ≥1 test)
Happy path (201, Enquiry linked to Lead, Lead ⇒ Converted, `convertedBy`/`convertedAt` set, audit `LEAD_CONVERTED`); each missing/invalid qualifying field ⇒ 400 `{field,message}[]`; non-positive/non-integer budget ⇒ 400; non-existent or other-owner/out-of-scope Lead ⇒ 404; re-convert Converted Lead ⇒ 409; 401 unauth; 403 missing capability; atomicity (all-or-nothing rollback on failure); converted Lead absent from `findOwnQueue` (AC5); `/convert` present in OpenAPI doc (AC7). Regression: existing create-Lead + queue specs stay green.

### Unit / Frontend Testing
Convert action renders only for non-Converted rows and only when flag on; inline error per missing/invalid field; successful convert removes Lead from displayed queue; server field errors surfaced back onto the form.

### Performance Testing
Not required this Story.

---

## Monitoring and Observability

### Logging
Structured log on conversion (leadId, enquiryId, actor) reusing #24's logging approach; no PII beyond existing precedent.

### Metrics / Alerts
None new this Story (append-only `audit_log` is the record of conversions).

---

## Clarifications required
**Must** document any open questions. **DO NOT** proceed unless resolved.

> **[RESOLVED]**: `budget` column is `bigint` (no `int4` overflow risk); no explicit upper-bound max.
> **[RESOLVED]**: Add a `UNIQUE(lead_id)` constraint on `enquiries` as defense-in-depth behind the app-level 409 check.
> **[RESOLVED]**: `exchangeInterest`/`financeInterest` render as Yes/No `Select` (reuses existing primitive; no new Checkbox).
> **[RESOLVED]**: Convert form is an inline-expanding panel under the queue row (no modal primitive built).
> **[RESOLVED]**: `variant` is non-empty free text, no max length.
> **[RESOLVED]**: Audit payload is `before:{status:<prev>}`, `after:{status:'Converted', enquiryId:<id>}` — sufficient as-is.
> **[RESOLVED]**: `StatusPill` uses default styling for `'Converted'` this Story — no explicit new visual variant.
> **[RESOLVED]**: `convert-lead` capability is provisioned by additively editing the #24 `test-users.json` fixture (DSE accounts gain `convert-lead` alongside `create-lead`; `noCapabilityUser` still proves the 403 case).

---

## References

### Documentation
- Spec: `.phoenix-os/project/specs/25/spec.md`
- Analysis: `.phoenix-os/project/specs/25/analysis.md`
- Sibling precedent: `.phoenix-os/project/specs/24/tech-design.md`
- Ref code: `.phoenix-os/project/specs/25/ref-code.md`

### Best Practices
- `.phoenix-os/core/memory/practices/best-practices/testing.md`, `.../tdd.md`
- ADR-003/004/006/009 (`.phoenix-os/project/specs/design/lms-1/adr/`)

### Related Issues/PRs
- #24 (Create a New Lead — merged), Feature #7, FR-02

---

**Status**: ❄️ Frozen (Source of Truth)

*This technical design was generated during Phase 4 (Design) workflow. Please review and approve before proceeding to Phase 5 (Test Design).*
