# ADR-NNNN: [Short Imperative Title — describe the decision taken, not the problem]

**Status**: proposed | accepted | deprecated | superseded
**Date**: YYYY-MM-DD
**Author**: [git handle of the recipe author or architecture reviewer]
**Issue**: #[issue number]
**Supersedes**: ADR-NNNN _(if this ADR replaces an earlier one; otherwise remove this line)_
**Superseded By**: ADR-NNNN _(if this ADR has been replaced; otherwise remove this line)_

---

## Context

_Describe the forces at play: the problem to be solved, the competing concerns, and the constraints that shaped the decision space. Write this as an objective statement of reality — not advocacy for any option. Reference the motivating requirements and quality scenarios._

_Cross-references (replace with actual IDs):_
- _Requirements: REQ-NNN, REQ-NNN_
- _Quality scenarios: QAS-NNN_
- _Stakeholder concerns: STK-NNN_
- _Dependent ADRs: ADR-NNN (must be accepted before this one)_

_Example (remove before use): "The system must process 10,000 financial transactions per second (QAS-003, REQ-015). The team has PostgreSQL expertise (see team-skills.md) but no MongoDB experience. The corporate-defaults.md lists both as approved. The BRD constraint REQ-022 requires ACID compliance."_

---

## Decision

_State the decision in one clear, unambiguous sentence: "We will use X because Y." Name the specific technology, pattern, or architectural principle adopted. Reference the option chosen from the alternatives evaluated (record the alternatives inline within this ADR's Context, alongside their rejection rationales)._

_Cross-references (replace with actual IDs):_
- _Components affected: COMP-NNN, COMP-NNN_
- _Interfaces affected: INTF-NNN_

_Example (remove before use): "We will use PostgreSQL 16 as the primary data store for the order-datastore (COMP-003) because it satisfies the ACID compliance constraint (REQ-022), the team holds Proficient skill level (team-skills.md), and it is the recommended default (corporate-defaults.md)."_

---

## Consequences

### Positive

_List the benefits realised by taking this decision. At least one item required._

- _Example: Full ACID compliance satisfies REQ-022 with no additional compensating controls._
- _Example: Existing team skill reduces onboarding cost and time-to-first-release._

### Negative

_List the costs, trade-offs, or risks introduced. At least one item required. An empty Negative section is a defect — reviewers should reject ADRs that omit it._

- _Example: Vertical scaling limit at ~10TB without sharding; must be revisited if data volume projections change._
- _Example: No native document search; requires a companion search index (COMP-006) for full-text queries._

### Neutral

_List side-effects that are neither clearly good nor bad — things that will change but are not a win or loss._

- _Example: All database migrations must be authored in Flyway (replaces ad-hoc SQL scripts)._
- _Example: Backup and restore runbook must be updated to reflect PostgreSQL procedures._

---

## Status

_Repeat the status from the header and add a brief one-sentence rationale for the current status._

_Example: "Accepted — decision recorded on 2026-05-12 during the architecture review pass. Architecture reviewer confirmed no alternative satisfies both REQ-022 and the team skill constraint simultaneously."_

---

## See Also

- _`core/memory/practices/architecture/adr-conventions.md` — ADR authoring rules_
- _`core/memory/practices/tech-stack/corporate-defaults.md` — approved technology list_
- _`core/memory/practices/tech-stack/stack-decision-heuristics.md` — decision heuristics_
- _`core/templates/impl/brd-to-design-traceability.md` — Traceability matrix references ADR IDs_
