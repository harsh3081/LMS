# Artifact Question Decisions

**Issue**: #24
**Created**: 2026-07-16T00:00:00Z

---

## Phase 2: Start Work (analysis.md)

### Decision 1
- **Timestamp**: 2026-07-16T00:00:00Z
- **Artifact**: analysis.md
- **Question**: Lead source list origin (AC5): Is there an existing configured source list / seed data, or must this Story introduce/seed the default sources? Is source per-tenant configurable?
- **Options Presented**:
  1. Existing list; Story just consumes it [Recommended]
  2. Story must seed default sources
  3. Defer / Ignore
- **Decision**: Existing list; Story just consumes it (no seeding needed)
- **Status**: Resolved

### Decision 2
- **Timestamp**: 2026-07-16T00:00:00Z
- **Artifact**: analysis.md
- **Question**: Mobile number format (AC4): India 10-digit mobile, or international E.164?
- **Options Presented**:
  1. India 10-digit mobile [Recommended]
  2. International E.164 format
  3. Defer / Ignore
- **Decision**: India 10-digit mobile
- **Status**: Resolved

### Decision 3
- **Timestamp**: 2026-07-16T00:00:00Z
- **Artifact**: analysis.md
- **Question**: Duplicate handling on create: should Create-Lead check for duplicate mobile numbers now, or defer to FR-06?
- **Options Presented**:
  1. Fully defer to sibling story FR-06 [Recommended]
  2. Invoke duplicate check now
  3. Defer / Ignore
- **Decision**: Fully defer to sibling story FR-06
- **Status**: Resolved

### Decision 4
- **Timestamp**: 2026-07-16T00:00:00Z
- **Artifact**: analysis.md
- **Question**: "Model of interest" field type: free-text, or selectable from a vehicle/model master?
- **Options Presented**:
  1. Selectable from vehicle/model master [Recommended]
  2. Free-text entry
  3. Defer / Ignore
- **Decision**: Selectable from vehicle/model master
- **Status**: Resolved

### Decision 5
- **Timestamp**: 2026-07-16T00:00:00Z
- **Artifact**: analysis.md
- **Question**: Initial Lead status & ownership: confirm the default status and ownership rule on creation.
- **Options Presented**:
  1. Status "New"; auto-owned by creating DSE; location_id from session [Recommended]
  2. Different default status/ownership rule
  3. Defer / Ignore
- **Decision**: Status "New"; auto-owned by creating DSE; location_id from session
- **Status**: Resolved

### Decision 6
- **Timestamp**: 2026-07-16T00:00:00Z
- **Artifact**: analysis.md
- **Question**: Lead entity/migration existence: does the Lead table already exist, or does this Story introduce it?
- **Options Presented**:
  1. This Story introduces the Lead table/migration [Recommended]
  2. Lead table already exists from prior work
  3. Defer / Ignore
- **Decision**: This Story introduces the Lead table/migration
- **Status**: Resolved

---

## Phase 3: Prepare (spec.md, todo.md)

### Decision 1
- **Timestamp**: 2026-07-16T00:00:00Z
- **Artifact**: spec.md
- **Question**: Source representation: is the configured lead-source list a database-backed master with stable IDs (FK), or a static config/enumeration?
- **Options Presented**:
  1. FK to source master, source_id [Recommended]
  2. Static config/enum
  3. Defer / Ignore
- **Decision**: FK to source master, source_id
- **Status**: Resolved

### Decision 2
- **Timestamp**: 2026-07-16T00:00:00Z
- **Artifact**: spec.md
- **Question**: Model-of-interest master in Phase 1: is a model master already populated and queryable, and should Lead store model_id FK vs a denormalized label?
- **Options Presented**:
  1. Consume existing Phase-1 master via model_id FK [Recommended]
  2. No master seeded yet — use denormalized label
  3. Defer / Ignore
- **Decision**: Consume existing Phase-1 master via model_id FK
- **Status**: Resolved

### Decision 3
- **Timestamp**: 2026-07-16T00:00:00Z
- **Artifact**: spec.md
- **Question**: DSE Lead list/queue read path (AC6): does an owner-scoped list endpoint already exist, or does this Story introduce it?
- **Options Presented**:
  1. Introduce a minimal owner-scoped list endpoint here [Recommended]
  2. Assume it already exists elsewhere
  3. Defer / Ignore
- **Decision**: Introduce a minimal owner-scoped list endpoint here
- **Status**: Resolved

### Decision 4
- **Timestamp**: 2026-07-16T00:00:00Z
- **Artifact**: spec.md
- **Question**: Unique identifier surfacing (AC3): is the internal lead_id sufficient, or is a human-readable lead reference number required?
- **Options Presented**:
  1. Internal ID sufficient; defer display code [Recommended]
  2. Require a human-readable reference number now
  3. Defer / Ignore
- **Decision**: Internal ID sufficient; defer display code
- **Status**: Resolved

### Decision 5
- **Timestamp**: 2026-07-16T00:00:00Z
- **Artifact**: todo.md
- **Question**: TDD cadence: proceed with the Inside-Out default (core-first, integration-preferred), or a different Story-level cadence?
- **Options Presented**:
  1. Inside-Out default [Recommended]
  2. Different cadence
  3. Defer / Ignore
- **Decision**: Inside-Out default
- **Status**: Resolved

---

## Phase 4: Design (tech-design.md, todo.md)

### Decision 1
- **Timestamp**: 2026-07-16T00:00:00Z
- **Artifact**: tech-design.md
- **Question**: Greenfield scaffold: should this Story bootstrap the minimal app scaffold, or is a separate bootstrap story expected first?
- **Options Presented**:
  1. This Story bootstraps the minimal scaffold [Recommended]
  2. Stop and create a separate bootstrap story first
  3. Defer / Ignore
- **Decision**: This Story bootstraps the minimal scaffold
- **Status**: Resolved

### Decision 2
- **Timestamp**: 2026-07-16T00:00:00Z
- **Artifact**: tech-design.md
- **Question**: ORM & migration tool: which should the backend use?
- **Options Presented**:
  1. TypeORM [Recommended]
  2. Prisma
  3. Defer / Ignore
- **Decision**: TypeORM
- **Status**: Resolved

### Decision 3
- **Timestamp**: 2026-07-16T00:00:00Z
- **Artifact**: tech-design.md
- **Question**: Missing reference/master tables (users, locations, dealer_groups, lead_sources, vehicle_models, audit_log) don't exist yet. Should this Story create them as foundational work?
- **Options Presented**:
  1. Create minimal versions as part of this Story's foundation [Recommended]
  2. Assume a separate foundational story/migration set owns them
  3. Defer / Ignore
- **Decision**: Create minimal versions as part of this Story's foundation
- **Status**: Resolved

### Decision 4
- **Timestamp**: 2026-07-16T00:00:00Z
- **Artifact**: tech-design.md
- **Question**: Model master identity: FK to the location-scoped demo-fleet Vehicle table, or a separate location-agnostic vehicle_models master?
- **Options Presented**:
  1. Separate location-agnostic vehicle_models master [Recommended]
  2. FK to the existing demo-fleet Vehicle table
  3. Defer / Ignore
- **Decision**: Separate location-agnostic vehicle_models master
- **Status**: Resolved

### Decision 5
- **Timestamp**: 2026-07-16T00:00:00Z
- **Artifact**: tech-design.md
- **Question**: lead_id type: BIGSERIAL or UUID?
- **Options Presented**:
  1. UUID [Recommended]
  2. BIGSERIAL
  3. Defer / Ignore
- **Decision**: UUID
- **Status**: Resolved

### Decision 6
- **Timestamp**: 2026-07-16T00:00:00Z
- **Artifact**: tech-design.md
- **Question**: RBAC capability mechanism: reuse an existing guard/capability model, or define a "create-lead" capability now?
- **Options Presented**:
  1. Define a minimal capability/guard now [Recommended]
  2. Assume a capability model already exists to reuse
  3. Defer / Ignore
- **Decision**: Define a minimal capability/guard now
- **Status**: Resolved

### Decision 7
- **Timestamp**: 2026-07-16T00:00:00Z
- **Artifact**: tech-design.md
- **Question**: audit_log write contract: define the columns/shape now, or assume an existing audit service handles it?
- **Options Presented**:
  1. Define a minimal audit_log write now [Recommended]
  2. Assume an existing audit service/interceptor handles it
  3. Defer / Ignore
- **Decision**: Define a minimal audit_log write now
- **Status**: Resolved

### Decision 8
- **Timestamp**: 2026-07-16T00:00:00Z
- **Artifact**: tech-design.md
- **Question**: Mobile masking on read: masked or full mobile number in responses?
- **Options Presented**:
  1. Full mobile number for now [Recommended]
  2. Masked mobile number in this Story
  3. Defer / Ignore
- **Decision**: Full mobile number for now
- **Status**: Resolved

### Decision 9
- **Timestamp**: 2026-07-16T00:00:00Z
- **Artifact**: tech-design.md
- **Question**: Feature-toggle mechanism for the "New Lead" UI entry point: what should gate it?
- **Options Presented**:
  1. Simple config/env flag [Recommended]
  2. No toggle for MVP — always-on
  3. Defer / Ignore
- **Decision**: Simple config/env flag
- **Status**: Resolved

### Decision 10
- **Timestamp**: 2026-07-16T00:00:00Z
- **Artifact**: tech-design.md
- **Question**: Error-response envelope: standard project-wide shape, or simple ad-hoc field-level format?
- **Options Presented**:
  1. Simple field-level error format [Recommended]
  2. Design a more elaborate standard envelope now
  3. Defer / Ignore
- **Decision**: Simple field-level error format
- **Status**: Resolved

### Decision 11
- **Timestamp**: 2026-07-16T00:00:00Z
- **Artifact**: todo.md
- **Question**: Pagination for the owner-scoped Lead list (AC6): simple newest-first with a limit, or full pagination now?
- **Options Presented**:
  1. Simple newest-first + limit [Recommended]
  2. Full pagination now (page/pageSize/total)
  3. Defer / Ignore
- **Decision**: Simple newest-first + limit
- **Status**: Resolved

### Decision 12
- **Timestamp**: 2026-07-16T00:00:00Z
- **Artifact**: todo.md
- **Question**: configurable_fields JSONB default and dealer_group_id nullability: confirm both defaults together.
- **Options Presented**:
  1. JSONB defaults to {}; dealer_group_id required (NOT NULL) [Recommended]
  2. JSONB defaults to NULL; dealer_group_id nullable
  3. Defer / Ignore
- **Decision**: JSONB defaults to {}; dealer_group_id required (NOT NULL)
- **Status**: Resolved
