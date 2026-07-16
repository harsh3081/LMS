# Technical Design

**Issue**: #24
**Title**: [Story] Create a New Lead
**Parent Feature**: #7 — Lead & Enquiry Creation and Duplicate Management
**Traces To**: FR-01
**Created**: 2026-07-16

---

## Overview

### Technical Objective
Deliver a thin vertical slice that lets a DSE create a Lead: a `POST /api/v1/leads` endpoint (validated, RBAC- and tenant-scoped, transactional persist + audit), the `leads` table + reversible migration, three supporting reads (`lead-sources`, `vehicle-models`, owner-scoped `GET /api/v1/leads`), and a React "New Lead" form with inline validation that inserts the created Lead into the DSE's queue on success.

### Architecture Context
Layered, API-first per lms-1: React (Vite) SPA → NestJS/TypeScript Backend API → PostgreSQL 16. Backend API is the single enforcement point for authN (server-side session, ADR-004), RBAC, and row-level tenant scoping on `location_id`/`dealer_group_id` (ADR-003). Endpoint is published on the OpenAPI 3.1 contract (ADR-006); the SPA consumes it with no privileged path. Owner, tenant, status "New", and audit metadata are derived server-side from the session, never from the client (ADR-003/009). **This Story is the first application code in the repo** — no NestJS/React scaffold, ORM, or migration tooling exists yet (see Clarifications).

---

## Technical Approach

### Technology Stack
**Languages**: TypeScript (frontend + backend).

**Frameworks/Libraries**:
- Backend: NestJS, `@nestjs/swagger` (OpenAPI 3.1), `class-validator` + `class-transformer` (DTO validation).
- Frontend: React 18 + Vite, React Router, React Hook Form (inline validation), React Query (server state / list refresh), typed `fetch` client.
- Persistence/ORM: **TypeORM** (resolved). Migrations authored via TypeORM migrations (mandatory, ADR-002).

**Tools**: PostgreSQL 16; Jest + Supertest (backend integration); Vitest + React Testing Library (frontend).

**Infrastructure**: Containerized per ADR-005 — not in scope for this Story.

---

## Component Design

### Component 1: `leads` migration (Data)
**Purpose**: Introduce the Lead schema (no prior Lead table).
**Responsibilities**: Create `leads` table with tenant/owner/audit/status columns, FKs, reserved JSONB, and the owner-queue index; provide a reversible down-migration that drops the index and table.
**Dependencies**: Referenced masters (`lead_sources`, `vehicle_models`, `users`, `locations`, `dealer_groups`, `audit_log`) do not exist in the repo yet — this Story creates minimal versions of each as foundational work (resolved).
**Interfaces**: Schema in Data Design below.

### Component 2: Lead & Enquiry module — create path (Backend API)
**Purpose**: Create-Lead contract.
**Responsibilities**: `LeadsController.create` (`POST /api/v1/leads`) → `CreateLeadDto` boundary validation (presence, India mobile format, referential validity of `sourceId`/`modelId`) → deny-by-default RBAC guard (DSE create-Lead capability) → derive `ownerId`/`location_id`/`dealer_group_id`/`status="New"`/`created_by`/`created_at` from session → single DB transaction inserting the `leads` row **and** an `audit_log` row → return `LeadResponseDto`. `@nestjs/swagger` decorators publish the contract. **No duplicate/mobile-uniqueness check (deferred to FR-06).**
**Dependencies**: Session/auth context (ADR-004); tenant-scope choke-point (ADR-003); source & model masters.
**Interfaces**: `POST /api/v1/leads` — see Integration Points.

### Component 3: Read paths (Backend API)
**Purpose**: Feed the form and the queue.
**Responsibilities**:
- `GET /api/v1/lead-sources` → active source list for the dropdown (AC5).
- `GET /api/v1/vehicle-models` → model master for the dropdown.
- `GET /api/v1/leads` → owner-scoped queue: caller's own leads within their `location_id`, newest first (AC6). Introduced by this Story.
**Dependencies**: Same tenant-scope choke-point; masters.

### Component 4: "New Lead" form (Frontend SPA)
**Purpose**: Capture + submit the four mandatory fields.
**Responsibilities**: `NewLeadForm` (React Hook Form) with fields `customerName`, `mobile`, `sourceId` (select from `useLeadSources`), `modelId` (select from `useVehicleModels`); inline field-level errors mirroring server rules (presence + India mobile regex) (AC2/AC4); submit via `createLead`; on success invalidate/prepend to the `useLeads` queue so the new Lead appears immediately (AC6); surface server 400/403 mapped to field/form errors.
**Dependencies**: Read paths; API client; session cookie.
**Interfaces**: Rendered at a `/leads/new` route; entry point gated by a simple config/env feature-toggle flag (resolved).

---

## Data Design

### Data Models
**New — `leads` table** (plural snake_case per ADR-002/003):

| Column | Type | Notes |
| --- | --- | --- |
| `lead_id` | `UUID` PK (resolved) | Internal unique id; satisfies AC3. Avoids exposing sequential/guessable IDs. |
| `customer_name` | `TEXT NOT NULL` | Client-supplied. |
| `mobile` | `VARCHAR(10) NOT NULL` | India 10-digit; **no unique constraint** (FR-06 owns dedupe). `CHECK (mobile ~ '^[6-9][0-9]{9}$')` as defense-in-depth. |
| `source_id` | `NOT NULL REFERENCES lead_sources(source_id)` | FK, referential validity (AC5). |
| `model_id` | `NOT NULL REFERENCES vehicle_models(model_id)` | FK to a separate, location-agnostic `vehicle_models` master (resolved) — deliberately not the location-scoped demo-fleet `Vehicle` table, to avoid coupling lead capture to demo availability. |
| `owner_id` | `NOT NULL REFERENCES users(user_id)` | Creating DSE, session-derived. |
| `location_id` | `NOT NULL REFERENCES locations(location_id)` | Tenant scope, session-derived. |
| `dealer_group_id` | `NOT NULL REFERENCES dealer_groups(dealer_group_id)` | Tenant scope, session-derived. |
| `status` | `VARCHAR NOT NULL DEFAULT 'New'` | Server-set; not client-accepted. |
| `custom_fields` | `JSONB NOT NULL DEFAULT '{}'` | Reserved for FR-04; provisioned, unused this Story (ADR-002). |
| `created_by` | `NOT NULL REFERENCES users(user_id)` | = owner this Story. |
| `created_at` | `TIMESTAMPTZ NOT NULL DEFAULT now()` | |
| `updated_at` | `TIMESTAMPTZ NOT NULL DEFAULT now()` | |

**Index**: `idx_leads_owner_location_created ON leads(owner_id, location_id, created_at DESC)` — serves the owner-scoped queue (AC6).

**Created as minimal foundational tables in this Story (resolved)**: `lead_sources`, `vehicle_models`, `users`, `locations`, `dealer_groups`, `audit_log` (append-only, ADR-009) — none exist yet; each is scoped to just what Create-Lead needs, not full feature sets.

**DTOs (Backend)**:
- `CreateLeadDto` (client-supplied ONLY): `customerName: string` (non-empty), `mobile: string` (`@Matches(/^[6-9]\d{9}$/)`), `sourceId`, `modelId`. Owner/tenant/status/audit are **not** accepted — reject/ignore if present.
- `LeadResponseDto`: `leadId`, `customerName`, `mobile` (full, unmasked — resolved; role-based masking is a separate cross-cutting concern out of scope here), `sourceId`, `modelId`, `status`, `ownerId`, `locationId`, `createdAt`.

### Data Flow
Form submit → `POST /api/v1/leads` → guard (session + RBAC) → validate DTO → referential check `sourceId`/`modelId` → open tx → insert `leads` (server-derived fields) + insert `audit_log` (`action=LEAD_CREATED`, actor, entity_id, after-state, `location_id`/`dealer_group_id`) → commit → 201 `LeadResponseDto` → SPA prepends to queue.

### Storage Strategy
Single PostgreSQL 16, shared schema, row-level scoping (ADR-002/003). One transaction spans lead + audit insert (ADR-009). No cache.

---

## Integration Points

### Internal Systems (all within LMS Backend API)
- **`POST /api/v1/leads`** — Create. Body `CreateLeadDto`. `201` → `LeadResponseDto`; `400` validation errors as a simple `{ field, message }[]` array (resolved — no elaborate error envelope this Story) for missing field / bad mobile / unknown source or model; `401` unauthenticated; `403` insufficient capability (minimal `create-lead` DSE capability, defined in this Story — resolved).
- **`GET /api/v1/leads`** — Owner-scoped queue (caller's own, their location, newest first, simple limit — no full pagination this Story, resolved). `200` → `LeadResponseDto[]`.
- **`GET /api/v1/lead-sources`** — `200` → `{ sourceId, name }[]` (active only).
- **`GET /api/v1/vehicle-models`** — `200` → `{ modelId, name/variant }[]`.

### External Systems
- **Auth/Session (ADR-004)**: supplies `user_id`, `role`, `location_id`, `dealer_group_id`. Sole source of server-derived fields. Reused, not built here.
- **Reference masters**: `lead_sources`, `vehicle_models` — read-only consumers.

### Mocking strategy
Prefer integration tests over mocks (best-practices). Seed real `lead_sources`, `vehicle_models`, `users` (multiple DSEs across two `location_id`s), `locations`, `dealer_groups` fixtures against a test PostgreSQL. Mock only the session/auth context to inject the acting principal per test.

---

## Technical Constraints

### Performance
- Owner-queue query served by `idx_leads_owner_location_created`; key page < 3 s (NFR-01).

### Security
- Deny-by-default RBAC guard on every route (ADR-003, threat model: Browser→API CRITICAL).
- Tenant scope enforced at the single data-access choke-point, not per-endpoint (ADR-003); asserted by cross-location tests.
- Owner/tenant/status/audit server-derived only — client-supplied values for these are rejected/ignored.
- Mobile is PII: no logging of raw mobile in structured logs; parameterized queries only.
- CSRF protection required for the state-changing POST (cookie-based session, ADR-004).

### Scalability
- Additive schema; multi-outlet-ready via `location_id`/`dealer_group_id` (ADR-003). No change to existing tables.

### Browser/Platform Compatibility
- Latest 2 versions Chrome/Edge/Firefox/Safari (NFR-04).

---

## Implementation Strategy

### Phased Approach
Phase 1 — Backend: migration → DTOs/validation → RBAC guard + tenant scope → create service (tx persist + audit) → read endpoints → OpenAPI annotations → integration tests.
Phase 2 — Frontend: API client + hooks → `NewLeadForm` + inline validation → queue insert on success → UI tests.

### Dependencies and Prerequisites
- NestJS + React/Vite scaffold — this Story bootstraps the minimal skeleton (resolved).
- ORM/migration tool — TypeORM (resolved).
- Masters (`lead_sources`, `vehicle_models`, `users`, `locations`, `dealer_groups`) and `audit_log` — this Story creates minimal versions and seeds them (resolved).
- Session/auth middleware available to supply the principal — minimal version built as part of this Story's greenfield scaffold.

### Migration Strategy
Forward: create `leads` + index + CHECK + FKs. Down: drop index then table. No backfill.

---

## Testing Strategy

### Unit Testing
- `CreateLeadDto` validation: each missing mandatory field; India mobile boundaries (9 digits, 11 digits, leading 0–5, non-numeric); valid case.
- Mobile regex `/^[6-9]\d{9}$/`.

### Integration Testing (preferred; ≥80% line / ≥75% branch)
Happy-path create (201, unique `lead_id`, status "New"); each of 4 missing-field cases (400); invalid mobile (400); `sourceId` not in master (400); `modelId` not in master (400); unauthenticated (401); wrong role (403); server-derived owner/`location_id`/`dealer_group_id` (client cannot override); duplicate mobile accepted (guards against premature FR-06 coupling); `audit_log` row written in same tx; owner-scoped queue returns only caller's leads within their location (two-DSE / two-location fixture); OpenAPI exposes the endpoint. Each AC → ≥1 test.

### Frontend
Inline error per missing field + invalid mobile; source & model dropdowns render from reads; successful submit; created Lead appears in queue (AC6); 400/403 mapped to form errors.

---

## Monitoring and Observability

### Logging
Structured JSON (ADR-009) with correlation id on create; log `lead_id`, actor, source/model ids, outcome. **Never** log raw mobile / customer name (PII).

### Metrics
Create success/failure count; validation-rejection rate; create latency.

### Alerts
None new this Story (dealership-scale, ADR-009). Elevated 4xx/5xx on the endpoint falls under existing API alerting.

---

## Clarifications required
**Must** resolve before implementation. These are genuinely ambiguous or blocked on missing artifacts — not re-litigating frozen decisions.

> **[RESOLVED]**: This Story bootstraps the minimal NestJS/React-Vite app scaffold (project structure, config, DB connection, auth middleware, migration setup) — no separate bootstrap Story.
> **[RESOLVED]**: ORM/migration tool is TypeORM.
> **[RESOLVED]**: This Story creates minimal versions of the missing masters (`lead_sources`, `vehicle_models`, `users`, `locations`, `dealer_groups`, `audit_log`) as foundational work, scoped to what Create-Lead needs.
> **[RESOLVED]**: "Model of interest" FKs to a separate, location-agnostic `vehicle_models` master (not the location-scoped demo-fleet `Vehicle` table).
> **[RESOLVED]**: `lead_id` PK type is `UUID`.
> **[RESOLVED]**: A minimal deny-by-default `create-lead` capability/guard for the DSE role is defined in this Story (no prior RBAC model exists to reuse).
> **[RESOLVED]**: A minimal `audit_log` write contract is defined in this Story — append-only, `action=LEAD_CREATED`, actor/entity/after-state/timestamp — written in the same transaction as the Lead insert.
> **[RESOLVED]**: `GET /api/v1/leads` and the create response return the full (unmasked) mobile number; role-based masking is a separate cross-cutting concern, out of scope here.
> **[RESOLVED]**: Feature-toggle mechanism is a simple config/env flag gating the "New Lead" entry point.

---

## References

### Documentation
- `.phoenix-os/project/specs/24/spec.md`, `analysis.md`
- `.phoenix-os/project/specs/design/lms-1/tech-design.md`; ADR-001/002/003/004/006/009

### Best Practices
- `.phoenix-os/core/memory/practices/tech-stack/{react,nodejs,postgresql}.md`
- `.phoenix-os/core/memory/practices/architecture/principal-guidelines.md`
- `.phoenix-os/core/memory/practices/best-practices/{tdd,testing}.md`

### Related Issues/PRs
- Feature #7; siblings FR-02, FR-04, FR-06 (consume this schema)

### Reference Code
- `.phoenix-os/project/specs/24/ref-code.md` (validation, transactional persist+audit, tenant-scope patterns)

---

**Status**: ❄️ Frozen (Source of Truth)

*This technical design was generated during Phase 4 (Design) workflow. Please review and approve before proceeding to Phase 5 (Test Design).*
