# Technical Design — Initial Analysis

> **Instructions**: This document captures the initial (shallow) analysis for this Story — problem identification, scope, and impacted areas. It is NOT the detailed technical design; deep component/data/integration design happens in the Prepare/Design phases. No code samples.

**Issue**: #24
**Title**: [Story] Create a New Lead
**Type**: Story
**Parent Feature**: #7 — [Feature] Lead & Enquiry Creation and Duplicate Management
**Traces To**: FR-01
**Created**: 2026-07-16

---

## Overview

### Technical Objective
Enable a Dealer Sales Executive (DSE) to capture a new Lead through a "New Lead" form and a documented REST endpoint, persisting a uniquely-identified Lead record with the four minimum mandatory fields (name, mobile number, source, model of interest), so customer interest is registered immediately and surfaces in the DSE's own Lead list/queue.

This is the foundational create-path for the Lead entity and the first functional slice of the Lead & Enquiry lifecycle (FR-01). It establishes the create contract that later stories (qualification, conversion, duplicate management) build on.

### Architecture Context
- Fits the established LMS layered, API-first architecture: React (Vite) SPA (Frontend) -> NestJS/TypeScript Backend API (Experience/Services) -> PostgreSQL (Data). See project design set `.phoenix-os/project/specs/design/lms-1/` (tech-design.md, ADR-001/002/003/006).
- The Backend API is the single enforcement point for authentication, RBAC, and tenant row-level scoping; every Lead row carries `location_id` (and `dealer_group_id`) per the multi-tenancy decision (ADR-003).
- Lead creation must be exposed on the published OpenAPI 3.1 REST contract (ADR-006); the SPA consumes the same contract as any future API consumer — no privileged path.
- Owner (creating DSE), `location_id`, and created-by/on metadata are auto-captured server-side from the authenticated session, not accepted from the client.
- Configurable mandatory fields are supported at the model level via JSONB (ADR-002); this Story targets the four minimum mandatory fields defined in the ACs.

---

## Problem Identification

### Problem Statement
Today there is no digital create-path for a Lead. Customer interest is captured on manual registers/spreadsheets, causing lead leakage and no unique, queryable record. This Story delivers the minimal, validated capture flow (UI form + REST endpoint) that creates a uniquely-identified, owner-scoped Lead and makes it immediately visible to the DSE.

### In-Scope (this Story)
- "New Lead" form (SPA) capturing the four mandatory fields, with inline validation.
- REST endpoint to create a Lead (documented on the OpenAPI contract).
- Server-side validation of the four mandatory fields + mobile-number format.
- Source field rendered from a configured list of lead sources.
- Persist Lead with a unique identifier and auto-captured owner/tenant/audit metadata.
- New Lead appears in the creating DSE Lead list/queue immediately after creation.

### Out-of-Scope (deferred to sibling/later stories under Feature #7)
- Duplicate detection/merge on mobile number (Feature #7 "Duplicate Management" — separate story; FR-06).
- Lead-to-Enquiry qualification/conversion (FR-02).
- Editing/reassigning/deleting a Lead; TL/SM-GM supervisory views.
- Lead source administration/configuration UI (this Story consumes the source list; managing it is separate).
- Detailed component/data/integration design (Prepare/Design phase).

---

## Impacted Work Areas (high-level scope, not detailed design)

### Frontend (React SPA)
- New Lead form (fields, inline validation, submit/success handling); entry point to open the form; refresh/insert into the DSE Lead list/queue view on success.

### Backend API (NestJS)
- Create-Lead endpoint (controller/service/DTO), request validation, mobile-format rule, RBAC/tenant-scope enforcement, unique-ID generation, persistence, OpenAPI documentation.
- Read path to return the DSE Lead list/queue (may already exist or be introduced here — to confirm).
- Source list retrieval for the form (to confirm existing configuration source).

### Data (PostgreSQL)
- Lead entity persistence with `location_id`/`dealer_group_id` scoping, owner, created-by/on, initial status; unique identifier. Reuses the Lead entity defined in the design data model (Section 3.1 of design tech-design.md) — confirm whether the table/migration already exists or is introduced by this Story.
- Lead source reference data (existing seed/config vs. introduced here — to confirm).

### Cross-cutting
- Input validation at the API boundary; audit_log entry on create; structured logging.

---

## Testing Strategy (high-level)
- Unit + integration coverage on the create endpoint: happy path, each missing-mandatory-field case, invalid mobile format, source from configured list, tenant scoping, unique-ID assignment. Prefer integration tests over mocked unit tests per architecture guidance; target >= 80% coverage.
- Frontend: form validation (inline errors for each missing field, invalid mobile), successful submit, and appearance in the Lead list/queue.
- Traceability: each of the 7 acceptance criteria maps to at least one test.

## Blast Radius (high-level)
- Low-to-moderate: introduces a new create-path on the Lead entity. Primary risk areas are the shared Lead schema/migration, the OpenAPI contract, and the DSE Lead-list view. Additive change; no modification to existing conversion/follow-up flows expected. Deep blast-radius and mitigation analysis is deferred to the Prepare phase.

---

## Clarifications required
> Open questions to resolve before detailed design. Captured for the interview loop.

> **[RESOLVED]**: Existing configured source list; this Story only consumes it (no seeding of default sources required).
> **[RESOLVED]**: India 10-digit mobile number validation.
> **[RESOLVED]**: Duplicate-on-mobile checking is fully deferred to the sibling Duplicate Management story (FR-06); Create-Lead does not perform duplicate detection.
> **[RESOLVED]**: "Model of interest" is selectable from vehicle/model master data (controlled list), not free-text.
> **[RESOLVED]**: Default status on creation is "New"; Lead is auto-owned by the creating DSE with `location_id` derived from the authenticated session.
> **[RESOLVED]**: This Story introduces the Lead table/migration — no prior Lead schema exists.

---

## References
- Design set: `.phoenix-os/project/specs/design/lms-1/tech-design.md`, `./adr/ADR-001.md`, `./adr/ADR-002.md`, `./adr/ADR-003.md`, `./adr/ADR-006.md`
- Architecture principles: `.phoenix-os/core/memory/practices/architecture/principal-guidelines.md`, `arch-layered.md`, `arch-frontend.md`
- Tech-stack tags (for Prepare/Design phase): `react`, `nodejs` (NestJS), `postgresql` under `.phoenix-os/core/memory/practices/tech-stack/`
- Parent Feature: #7 — Lead & Enquiry Creation and Duplicate Management

---

**Status**: ❄️ Frozen (Source of Truth)

*This is the initial analysis generated during Phase 2 (Start Work). Deep-dive design (components, data, integration, detailed test/blast-radius) follows in Phase 3/4. Please review and approve before proceeding.*
