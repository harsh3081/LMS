# ADR Conventions (Michael-Nygard Form)

**Category**: architecture
**Status**: Active
**Version**: 1.0.0
**Created**: 2026-05-12
**See Also**: `capability-registry.md`, `core/templates/impl/adr-template.md`, `core/memory/practices/architecture-documentation/enterprise-doc-standards.md`

---

## Purpose

Define the authoring conventions, status workflow, and cross-referencing rules for Architecture Decision Records (ADRs) produced by the `adr-keeper` agent in Step 4b of the `phoenix:design:brd-to-design` recipe. `adr-keeper` self-applies these conventions when writing each ADR; reviewers should treat missing sections or empty sub-blocks as defects.

---

## When to Apply

- Step 4b of `phoenix:design:brd-to-design` (ADR authoring by `adr-keeper`).
- Any architectural decision point during design reviews, even outside the pipeline.
- When reviewing an existing ADR set for structural completeness.
- When a previously accepted ADR must be revised (superseding workflow).

---

## Michael-Nygard Template Fields

Every ADR must contain exactly these five sections. `adr-keeper` self-applies the presence check before writing the file:

### 1. Title
One line: `ADR-NNN: <Short imperative phrase>`. The phrase should describe the decision taken, not the problem: "Use PostgreSQL for the primary data store" not "Decide on a database".

### 2. Status
One of four states from the `adrs.schema.json` enum:

| Status | Meaning |
|--------|---------|
| `proposed` | Under discussion; not yet binding |
| `accepted` | Binding; teams must follow this decision |
| `deprecated` | Was accepted; now superseded or no longer applies |
| `superseded` | Replaced by a newer ADR (link via `superseded-by` field) |

**Workflow rule**: A new ADR starts as `proposed`. The recipe's standard human review pass (which gates the final design merge) is where the transition to `accepted` is recorded. ADRs are never deleted — deprecated or superseded ADRs remain in the document for audit purposes.

### 3. Context
Describes the forces at play: the problem to be solved, any competing concerns, and the constraints that shaped the decision space. Should read as an objective statement of reality, not advocacy. 2–6 sentences.

### 4. Decision
States the decision: "We will use X because Y." One clear, unambiguous statement. Must reference the option chosen from the alternatives considered (captured in the ADR's own prose alongside the rationale). Should name the specific technology, pattern, or principle adopted.

### 5. Consequences
Split into three sub-blocks:
- **Positive**: Benefits realised by taking this decision.
- **Negative**: Costs, trade-offs, or risks introduced.
- **Neutral**: Side-effects that are neither good nor bad — things that will change but aren't a win or loss.

At least one item in each sub-block is required. An ADR with empty `Negative` consequences is a red flag and should be rejected during review.

---

## ID Schema

- Format: `ADR-NNN` where NNN is a zero-padded three-digit integer.
- IDs are assigned sequentially by the `adr-keeper` agent; the first ADR is `ADR-001`.
- IDs are stable once assigned — a superseded ADR retains its original ID.
- The `superseded-by` field on a deprecated ADR must reference the new `ADR-NNN` ID.

---

## Cross-Reference Conventions

ADRs should cross-reference:
- **Requirements**: Cite the `REQ-NNN` IDs that motivated the decision in the Context section.
- **Components**: Name the `COMP-NNN` IDs affected by the decision in the Decision section.
- **Other ADRs**: If this ADR supersedes another, populate `superseded-by`. If it depends on another ADR being accepted first, note it in Context.
- **Quality Attribute Scenarios**: If a QAS (`QAS-NNN`) drove the decision (e.g., a performance scenario mandating a cache), cite it.

**Format for cross-references in prose**: Use the ID in parentheses: "We chose PostgreSQL (REQ-007, COMP-003) due to the team's existing skill set (see `team-skills.md`)."

---

## One ADR Per Significant Decision

A "significant" decision meets at least one of these criteria:
1. It is difficult to reverse later (high reversal cost).
2. It affects multiple components or stakeholders.
3. It was disputed — there were real competing options considered.
4. A future architect reading the codebase would wonder "why was this done this way?"

**Anti-pattern**: One ADR per technology choice regardless of significance. Minor choices (e.g., a logging library version) do not need ADRs.

**Anti-pattern**: One mega-ADR covering all technology choices. Each significant decision gets its own ADR.

---

## Status Transition Rules

```
proposed → accepted      (recorded during the human review pass that gates merge)
accepted → deprecated    (when decision is no longer relevant; no replacement)
accepted → superseded    (when a new ADR replaces this one; populate superseded-by)
proposed → withdrawn     (decision abandoned; keep the ADR, mark status as deprecated)
```

A superseding ADR must note the superseded ADR in its Context: "This decision supersedes ADR-005 (PostgreSQL → Aurora migration)."

---

## See Also

- `core/templates/impl/adr-template.md` — the Markdown template to fill in
- `core/memory/practices/tech-stack/stack-decision-heuristics.md` — guidance on what deserves an ADR
- `core/memory/practices/architecture-documentation/enterprise-doc-standards.md` — document formatting
