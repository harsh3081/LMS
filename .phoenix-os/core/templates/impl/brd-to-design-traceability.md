# BRD-to-Design Traceability Appendix

**Document**: Technical Design — [System Name]
**Issue**: [Issue Number]
**Version**: 1.0
**Date**: [ISO Date]
**Author**: [Recipe Author]
**Status**: [Draft | Under Review | Approved]

> This traceability appendix is a **standalone template**. It is NOT appended to `core/templates/impl/tech-design.md`. `phoenix:tech-lead` instantiates it as a separate section within the technical design document during the Step 4b composition pass and it corresponds to the Traceability Matrix heading in the mandatory heading inventory in `enterprise-doc-standards.md`.

---

## Traceability Matrix

_Instructions: For each BRD requirement (REQ-NNN), record every artifact — component, interface, ADR, deployment node, and threat — that implements or is driven by that requirement. A requirement with no entries in ANY column is a traceability gap; `phoenix:tech-lead` self-applies this rule and reviewers should reject the document if any unresolved gap remains._

_Completeness rule: Every `REQ-NNN` extracted by `phoenix:brd-analyzer` must appear in at least one row. Every component identified in the design must appear in at least one row. Unused components are design waste candidates._

| BRD Requirement | MoSCoW | Component(s) | Interface(s) | ADR(s) | Deployment Node | Threat(s) | Notes |
|----------------|--------|-------------|-------------|--------|----------------|----------|-------|
| REQ-001: [Statement summary] | MUST | COMP-001, COMP-002 | INTF-001 | ADR-001 | [K8s namespace] | THR-001 | |
| REQ-002: [Statement summary] | SHOULD | COMP-002 | INTF-002 | — | [K8s namespace] | THR-002 | |
| REQ-003: [Statement summary] | COULD | COMP-003 | INTF-003, INTF-004 | ADR-002 | [Managed DB] | THR-003, THR-004 | |
| _[Add one row per REQ-NNN extracted by `phoenix:brd-analyzer`]_ | | | | | | | |

_Column key:_
- _BRD Requirement: REQ-NNN ID and one-line statement summary extracted by `phoenix:brd-analyzer`._
- _MoSCoW: MUST / SHOULD / COULD / WONT recorded for the requirement._
- _Component(s): COMP-NNN IDs identified in the design that implement the requirement._
- _Interface(s): INTF-NNN IDs identified in the design that carry data for the requirement._
- _ADR(s): ADR-NNN IDs of decisions driven by the requirement._
- _Deployment Node: Infrastructure node from the Deployment view where the implementing component runs._
- _Threat(s): THR-NNN IDs for threats relevant to this requirement's implementation._
- _Notes: Any gap, assumption, or deferral (link to `WONT` requirements)._

---

## Coverage Summary

_Instructions: After completing the matrix, fill in coverage counts. `phoenix:tech-lead` self-applies the rules in the Status column; reviewers should reject the document if any row marked "must be 100%" is not._

| Metric | Count | Status |
|--------|-------|--------|
| Total BRD requirements (MUST + SHOULD + COULD) | [N] | |
| Requirements with at least one component mapped | [N] | Must be 100% — every requirement traces to ≥1 component |
| Requirements with at least one ADR | [N] | Informational (not all requirements need ADRs) |
| Requirements with at least one threat assessed | [N] | Security-relevant requirements must be covered |
| Components with at least one requirement mapped | [N] | Informational (identify orphan components) |
| Interfaces with at least one requirement mapped | [N] | Informational |
| WONT requirements (deferred scope) | [N] | All must carry a rationale in the Notes column |

---

## Gap Analysis

_Instructions: List any traceability gaps identified. A gap is a mismatch between the requirements set and the design artifacts. Each gap must have a resolution action._

_Gap categories:_
- **Unmapped requirement**: A REQ-NNN has no corresponding COMP-NNN. Must be resolved before the design is published.
- **Orphan component**: A COMP-NNN has no requirement mapping. May indicate scope creep or a missing requirement. Review with stakeholders.
- **Missing ADR**: A significant technology decision (per `adr-conventions.md`) has no ADR. Must be resolved before the architecture review pass.
- **Missing threat**: A security-relevant component has no STRIDE assessment. Treat as a defect.
- **WONT without rationale**: A WONT requirement has no rationale recorded. Must be documented.

| Gap ID | Type | Description | Affected ID(s) | Resolution Action | Owner | Target Date |
|--------|------|-------------|----------------|-------------------|-------|-------------|
| GAP-001 | Unmapped requirement | REQ-NNN has no component mapped | REQ-NNN | Add COMP-NNN to address this requirement; if out of scope, reclassify as WONT with rationale | [TBD] | [TBD] |
| GAP-002 | Orphan component | COMP-NNN has no requirement mapping | COMP-NNN | Identify the requirement(s) this component satisfies; if none, remove from design | [TBD] | [TBD] |
| _[Add one row per identified gap]_ | | | | | | |

_If no gaps exist, replace this section with: "No traceability gaps identified. All requirements are mapped to at least one component, and no orphan components exist."_

---

## Quality Attribute Traceability

_Instructions: Map quality attribute scenarios (QAS-NNN) to the architecture decisions (ADR-NNN) and components (COMP-NNN) that address them. This satisfies ISO 42010 §5.6 (architecture rationale)._

| QAS ID | Attribute | Stimulus | Measure | Addressed by Component(s) | Addressed by ADR(s) |
|--------|-----------|---------|---------|--------------------------|---------------------|
| QAS-001 | [e.g. Performance] | [e.g. peak load] | [e.g. p99 < 200ms] | COMP-001, COMP-003 | ADR-002 |
| QAS-002 | [e.g. Availability] | [e.g. single-node failure] | [e.g. RTO < 60s] | COMP-001 | ADR-003 |
| _[Add one row per quality attribute scenario identified during design]_ | | | | | |

---

## Standards Compliance Traceability

_Instructions: For formal ARB submission, map each mandatory heading in the technical design document to its source standard. This is the reverse-traceability required by IEEE 1016 §5, ISO 42010 §5, and arc42._

| Section # | Heading | Standard | Standard Section | Notes |
|-----------|---------|----------|-----------------|-------|
| 1 | Introduction and Goals | arc42 | §1 | |
| 2 | Constraints | arc42 | §2 | |
| 3 | Context and Scope | arc42 §3, ISO 42010 §5 | | |
| 4 | Solution Strategy | arc42 §4, TOGAF ADD Phase C/D | | |
| 5 | Building Block View | arc42 §5, C4 L2, IEEE 1016 §5 | | |
| 6 | Runtime View | arc42 §6, C4 Sequence | | |
| 7 | Deployment View | arc42 §7, C4 Deployment, TOGAF ADD | | |
| 8 | Cross-cutting Concepts | arc42 §8 | | |
| 9 | Architecture Decisions | arc42 §9, ISO 42010 §5 ADRs | | |
| 10 | Quality Requirements | arc42 §10, SEI QAS | | |
| 11 | Risks and Technical Debt | arc42 §11 | | |
| 12 | Glossary | arc42 §12 | | |
| 13 | Traceability Matrix | Standalone enterprise pattern | This document | |
| 14 | Sign-off | Enterprise compliance | ARB process | |

---

## See Also

- `core/memory/practices/architecture-documentation/enterprise-doc-standards.md` — mandatory heading inventory
- `core/memory/practices/epic-management/brd-extraction.md` — BRD requirement classification and IDs
