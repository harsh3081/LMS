# Artifact Question Decisions

**Issue**: #25
**Created**: 2026-07-16T00:00:00Z

---

## Phase 2: Start Work (analysis.md)

### Decision 1
- **Timestamp**: 2026-07-16T00:00:00Z
- **Artifact**: analysis.md
- **Question**: Qualifying-field data types & representation — how should budget, variant, exchange interest, and finance interest be modelled?
- **Options Presented**:
  1. Budget=integer INR, exchange/finance=booleans, variant=free-text [Recommended]
  2. Use a controlled variant master / budget banding
  3. Defer / Ignore
- **Decision**: Budget=integer INR, exchange/finance=booleans, variant=free-text
- **Status**: Resolved

### Decision 2
- **Timestamp**: 2026-07-16T00:00:00Z
- **Artifact**: analysis.md
- **Question**: Conversion endpoint shape — sub-resource action or separate resource with leadId in body?
- **Options Presented**:
  1. POST /api/v1/leads/{leadId}/convert [Recommended]
  2. POST /api/v1/enquiries with leadId in body
  3. Defer / Ignore
- **Decision**: POST /api/v1/leads/{leadId}/convert
- **Status**: Resolved

### Decision 3
- **Timestamp**: 2026-07-16T00:00:00Z
- **Artifact**: analysis.md
- **Question**: Open-lead eligibility & idempotency (AC5) — what happens on re-conversion attempts and queue visibility?
- **Options Presented**:
  1. Any non-Converted Lead eligible; re-convert rejected 409; excluded from open queue [Recommended]
  2. Different eligibility/idempotency rule
  3. Defer / Ignore
- **Decision**: Any non-Converted Lead eligible; re-convert rejected 409; excluded from open queue
- **Status**: Resolved

### Decision 4
- **Timestamp**: 2026-07-16T00:00:00Z
- **Artifact**: analysis.md
- **Question**: Enquiry read/visibility scope — does this Story need a standalone Enquiry list/detail GET endpoint?
- **Options Presented**:
  1. Conversion write-path only; defer Enquiry GET to a later Story [Recommended]
  2. Include a basic Enquiry list/detail GET now
  3. Defer / Ignore
- **Decision**: Conversion write-path only; defer Enquiry GET to a later Story
- **Status**: Resolved

### Decision 5
- **Timestamp**: 2026-07-16T00:00:00Z
- **Artifact**: analysis.md
- **Question**: Frontend scope — include the SPA "Convert to Enquiry" action + form, or backend API only?
- **Options Presented**:
  1. Include frontend, behind a feature flag [Recommended]
  2. Backend API only this Story
  3. Defer / Ignore
- **Decision**: Include frontend, behind a feature flag
- **Status**: Resolved

---

## Phase 3: Prepare (spec.md, todo.md)

### Decision 1
- **Timestamp**: 2026-07-16T00:00:00Z
- **Artifact**: spec.md
- **Question**: Enquiry initial status default value?
- **Options Presented**:
  1. "New"/"Open", reserved for a later Story [Recommended]
  2. Different default status
  3. Defer / Ignore
- **Decision**: "New"/"Open", reserved for a later Story
- **Status**: Resolved

### Decision 2
- **Timestamp**: 2026-07-16T00:00:00Z
- **Artifact**: spec.md
- **Question**: Do converted Leads need any "history" visibility now?
- **Options Presented**:
  1. No — exclude entirely from open queue [Recommended]
  2. Yes, add some visibility now
  3. Defer / Ignore
- **Decision**: No — exclude entirely from open queue
- **Status**: Resolved

### Decision 3
- **Timestamp**: 2026-07-16T00:00:00Z
- **Artifact**: spec.md
- **Question**: Convert-action placement in the SPA: inline per queue row, or a dedicated conversion page?
- **Options Presented**:
  1. Inline in the queue row + inline/modal form [Recommended]
  2. Dedicated conversion page
  3. Defer / Ignore
- **Decision**: Inline in the queue row + inline/modal form
- **Status**: Resolved

### Decision 4
- **Timestamp**: 2026-07-16T00:00:00Z
- **Artifact**: spec.md
- **Question**: Exact Enquiry 201 response field set?
- **Options Presented**:
  1. enquiryId, leadId, qualifying fields, converting DSE, timestamp, status, owner/location [Recommended]
  2. Different/leaner response shape
  3. Defer / Ignore
- **Decision**: enquiryId, leadId, qualifying fields, converting DSE, timestamp, status, owner/location
- **Status**: Resolved

### Decision 5
- **Timestamp**: 2026-07-16T00:00:00Z
- **Artifact**: spec.md
- **Question**: Backend module placement for the Enquiry write path: new Enquiry module, or host on the Leads controller?
- **Options Presented**:
  1. New Enquiry module with its own repository [Recommended]
  2. Host on the existing Leads controller/module
  3. Defer / Ignore
- **Decision**: New Enquiry module with its own repository
- **Status**: Resolved

---

## Phase 4: Design (tech-design.md, todo.md)

### Decision 1
- **Timestamp**: 2026-07-16T00:00:00Z
- **Artifact**: tech-design.md
- **Question**: budget column type/range — int overflows at ~21.4 crore INR. bigint instead, with any explicit max?
- **Options Presented**:
  1. bigint, no explicit max [Recommended]
  2. Keep int, add an explicit max validation
  3. Defer / Ignore
- **Decision**: bigint, no explicit max
- **Status**: Resolved

### Decision 2
- **Timestamp**: 2026-07-16T00:00:00Z
- **Artifact**: tech-design.md
- **Question**: One-Enquiry-per-Lead — add DB-level UNIQUE(lead_id), or rely on app-level 409 alone?
- **Options Presented**:
  1. Add UNIQUE(lead_id) constraint [Recommended]
  2. Rely on app-level 409 check alone
  3. Defer / Ignore
- **Decision**: Add UNIQUE(lead_id) constraint
- **Status**: Resolved

### Decision 3
- **Timestamp**: 2026-07-16T00:00:00Z
- **Artifact**: tech-design.md
- **Question**: Boolean input control for exchange/finance interest — Yes/No Select, or a new Checkbox primitive?
- **Options Presented**:
  1. Yes/No Select dropdown [Recommended]
  2. Add a new Checkbox primitive
  3. Defer / Ignore
- **Decision**: Yes/No Select dropdown
- **Status**: Resolved

### Decision 4
- **Timestamp**: 2026-07-16T00:00:00Z
- **Artifact**: tech-design.md
- **Question**: Convert-form placement — inline-expand panel, or a new modal component?
- **Options Presented**:
  1. Inline-expand panel [Recommended]
  2. Build a new modal component
  3. Defer / Ignore
- **Decision**: Inline-expand panel
- **Status**: Resolved

### Decision 5
- **Timestamp**: 2026-07-16T00:00:00Z
- **Artifact**: tech-design.md
- **Question**: variant field constraints — any max length/character rules beyond non-empty free text?
- **Options Presented**:
  1. Non-empty free text, no max length [Recommended]
  2. Add a reasonable max length
  3. Defer / Ignore
- **Decision**: Non-empty free text, no max length
- **Status**: Resolved

### Decision 6
- **Timestamp**: 2026-07-16T00:00:00Z
- **Artifact**: tech-design.md
- **Question**: Audit before/after payload shape for LEAD_CONVERTED — is {status}→{status, enquiryId} sufficient?
- **Options Presented**:
  1. {status}→{status, enquiryId} is sufficient [Recommended]
  2. Richer snapshot (include qualifying fields too)
  3. Defer / Ignore
- **Decision**: {status}→{status, enquiryId} is sufficient
- **Status**: Resolved

### Decision 7
- **Timestamp**: 2026-07-16T00:00:00Z
- **Artifact**: tech-design.md
- **Question**: StatusPill styling for 'Converted' — explicit visual variant needed, or default styling acceptable?
- **Options Presented**:
  1. Default styling is acceptable this Story [Recommended]
  2. Add an explicit visual variant for Converted
  3. Defer / Ignore
- **Decision**: Default styling is acceptable this Story
- **Status**: Resolved

### Decision 8
- **Timestamp**: 2026-07-16T00:00:00Z
- **Artifact**: todo.md
- **Question**: convert-lead capability seeding — how should it be provisioned for RBAC tests given the frozen #24 fixture only grants create-lead?
- **Options Presented**:
  1. Additively edit the #24 fixture to add convert-lead [Recommended]
  2. Create a new #25-specific fixture file
  3. Defer / Ignore
- **Decision**: Additively edit the #24 fixture to add convert-lead
- **Status**: Resolved
