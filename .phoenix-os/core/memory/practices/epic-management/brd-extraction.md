# BRD Statement Extraction and Classification

**Category**: epic-management
**Status**: Active
**Version**: 1.0.0
**Created**: 2026-05-12
**See Also**: `brd-analysis.md`, `core/memory/practices/architecture/component-modelling.md`

---

## Purpose

Guide the `brd-analyzer` agent and human analysts in extracting, classifying, and tagging statements from a Business Requirements Document (BRD) before they flow into the design pipeline. Correct extraction is the foundation of all downstream artifact quality.

---

## When to Apply

- At Steps 1–2 of the `phoenix:design:brd-to-design` recipe (BRD ingest and requirements extraction by `phoenix:brd-analyzer`).
- Any time a human analyst reviews a BRD and needs to categorise its content.
- During backlog grooming when BRD-derived requirements feed epic or story creation.

---

## Statement Classification Schema

Every extractable statement from a BRD falls into one of the following categories:

| Class | Description | Examples |
|-------|-------------|---------|
| `FUNCTIONAL` | Describes what the system must do — observable behaviour | "The system shall allow users to reset their password via email." |
| `QUALITY` | Describes a non-functional attribute (arc42/SEI QAS form) | "The API must respond within 200ms at the 99th percentile under peak load." |
| `CONSTRAINT` | An immovable boundary — regulatory, financial, organisational | "The solution must operate within the AWS GovCloud region." |
| `ASSUMPTION` | A condition assumed true; must be validated | "The existing SSO provider supports SAML 2.0." |
| `OUT_OF_SCOPE` | Explicitly excluded by the BRD or signalled by hedging language | "Multi-currency support is deferred to Phase 2." |
| `STAKEHOLDER_CONCERN` | A stakeholder worry, question, or objective (ISO 42010 input) | "The Operations team is concerned about monitoring complexity." |
| `CONTEXT` | Background information — no requirement extracted, used for understanding | "The company was founded in 2018 and operates in 12 countries." |

**Rule**: When in doubt between FUNCTIONAL and QUALITY, ask — "can this be tested without specifying a measurable threshold?" If yes, it is FUNCTIONAL. If the threshold is the whole point, it is QUALITY.

---

## MoSCoW Tagging Rules

Apply MoSCoW labels to `FUNCTIONAL`, `QUALITY`, and `CONSTRAINT` statements only.

| Label | Criteria |
|-------|---------|
| `MUST` | Business-critical; absence causes project failure or regulatory breach |
| `SHOULD` | High value; strong justification required to omit |
| `COULD` | Desirable; included if time and budget allow |
| `WONT` | Explicitly deferred; recorded to prevent scope creep, not lost |

**Rules**:
1. A statement with explicit BRD language ("must", "shall", "is required to") defaults to `MUST` unless context overrides.
2. A statement with hedging language ("ideally", "where possible", "as a stretch goal") defaults to `COULD`.
3. When the BRD is silent on priority, apply MUST/SHOULD conservatively — a `WONT` that later becomes `MUST` is expensive.
4. Every `WONT` must have a rationale note in the `trace` field of the requirements IR.

---

## ID Schema

Requirements are assigned IDs in the format `REQ-NNN` where NNN is a zero-padded integer starting at `001`. IDs are assigned sequentially in the order statements are extracted, not by importance.

- Functional requirements: `REQ-001`, `REQ-002`, …
- The ID is the primary key for downstream traceability (components, interfaces, ADRs, RTM) and must be referenced wherever a downstream artifact (component, interface, ADR, threat entry, RTM row) cites the requirement that motivated it.
- If a BRD is re-extracted (e.g., after a revision), IDs are regenerated; consumers should not cache IDs across BRD versions.

---

## PII Heuristics for BRD Content

The BRD may contain personally identifiable information (PII) embedded in example data, user stories, or organisational context. PII redaction is performed inline by the recipe orchestrator (Step 1) before any BRD content is delivered to `phoenix:brd-analyzer` — the orchestrator scans for the patterns below and replaces matches with marker strings.

**Extraction guidance when working with a redacted BRD**:
- `[REDACTED:EMAIL]`, `[REDACTED:PHONE]`, `[REDACTED:PAN]`, `[REDACTED:AADHAAR]`, `[REDACTED:SSN]`, `[REDACTED:IP]` markers indicate high-confidence redactions.
- `[REDACTED:LOW_CONFIDENCE:NAME]` and `[REDACTED:LOW_CONFIDENCE:ADDRESS]` markers indicate low-confidence redactions that may have introduced false positives (e.g., "User Story" → "User [REDACTED:LOW_CONFIDENCE:NAME]").
- When a low-confidence marker disrupts the logical reading of a statement, use the surrounding context to reconstruct the intended meaning. Do NOT restore the original text.
- Log reconstruction decisions in the redaction log's `notes` field.

**Analyst rule**: If you suspect a statement has been corrupted by a low-confidence redaction, classify it as `ASSUMPTION` and note it for human validation rather than discarding it.

---

## Extraction Workflow

1. Read the full BRD once to build a mental model of scope and stakeholder intent.
2. On second pass, extract all statements using the Classification Schema above.
3. Assign MoSCoW labels per the tagging rules.
4. Assign sequential `REQ-NNN` IDs.
5. Map each requirement to its source line or section in the BRD (populates `source-line` in the IR).
6. Assign an initial `classification` badge (`internal`, `confidential`, or `restricted`) based on the data types the requirement involves (see `data-classification.md`).
7. Return the extraction summary in-memory to the recipe orchestrator (no IR file is written; downstream agents consume the summary directly).

---

## Compatibility with brd-analysis.md

This file augments `brd-analysis.md`, which focuses on BRD quality assessment and completeness checks. The two files are complementary:
- `brd-analysis.md` → answers "Is this BRD good enough to proceed?"
- `brd-extraction.md` → answers "How do I extract structured requirements from a BRD?"

Do not conflate the two. Run `brd-analysis.md` checks before extraction begins.

---

## Common Anti-Patterns

| Anti-Pattern | Correction |
|-------------|-----------|
| Extracting `CONTEXT` statements as `FUNCTIONAL` requirements | Strip context; only behaviour-specifying statements are requirements |
| Assigning `MUST` to everything | Leads to scope inflation; apply MoSCoW criteria strictly |
| Merging two requirements into one ID | Every independent testable statement gets its own ID |
| Skipping `STAKEHOLDER_CONCERN` classification | These feed the stakeholder concerns matrix that `phoenix:tech-lead` records in the technical-design composition pass — do not discard |
| Treating `ASSUMPTION` as `CONSTRAINT` | Assumptions must be validated; constraints are immovable — keep them separate |

---

## See Also

- `core/memory/practices/epic-management/brd-analysis.md` — BRD quality assessment
- `core/memory/practices/architecture-documentation/data-classification.md` — Classification badge assignment
- `core/memory/practices/architecture/c4-strict.md` — Downstream consumer of extracted component names
