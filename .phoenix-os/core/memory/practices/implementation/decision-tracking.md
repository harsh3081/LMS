# Decision Tracking (decisions.md)

Defines the structure, lifecycle, and entry format for `decisions.md` — the persistent, timestamped record of all open question decisions made during the planning phases of the implementation workflow.

---

## Purpose

`decisions.md` provides a traceable, ordered record of every question decision made when resolving open questions in phase artifacts (analysis.md, spec.md, tech-design.md, todo.md). It answers:

- What questions were surfaced in each phase?
- What options were presented to the user?
- What decision was made and when?
- Was the question resolved by the user or deferred (recommendation auto-applied)?

This file is completely separate from `evidence.md`. It is not read during the implementation phase. It serves planning traceability only.

---

## Location

```
${config.specs.base-path}${config.specs.naming}/decisions.md
```

For example, for Issue #402:

```
.phoenix-os/project/specs/402/decisions.md
```

The file lives in the same specs folder as `spec.md`, `tech-design.md`, `todo.md`, and `evidence.md`.

---

## Lifecycle

| Phase | Action |
|-------|--------|
| First planning phase | **Creates** the file with the full header and all planning phase section stubs — even if zero questions exist. Eager initialization ensures a single, ordered file for all subsequent phases to append to. |
| Subsequent planning phases | **Append** decision entries under the appropriate phase section. Never overwrite existing content. |
| Implementation phase onward | **Not read or modified**. Implementation reads `evidence.md` only. |

**Initialization rule**: The first planning phase always creates this file with the full structure, including section stubs for all planning phases, so that subsequent phases append to a pre-existing consistent structure. Lazy creation is not used.

---

## File Structure

```markdown
# Artifact Question Decisions

**Issue**: #{issue-number}
**Created**: {ISO 8601 timestamp — Phase 2 initialization time}

---

## Phase 2: Start Work (analysis.md)

### Decision 1
- **Timestamp**: {ISO 8601}
- **Artifact**: analysis.md
- **Question**: {question text}
- **Options Presented**:
  1. {option text} [Recommended]
  2. {option text}
  N. Defer / Ignore
- **Decision**: {chosen option text}
- **Status**: Resolved

---

## Phase 3: Prepare (spec.md, todo.md)

### Decision 1
- **Timestamp**: {ISO 8601}
- **Artifact**: {spec.md or todo.md}
- **Question**: {question text}
- **Options Presented**:
  1. {option text} [Recommended]
  2. {option text}
  N. Defer / Ignore
- **Decision**: {recommended option text — auto-applied}
- **Status**: Ignored (used recommendation)

---

## Phase 4: Design (tech-design.md, todo.md)

### Decision 1
(same entry format)
```

**Section headers are always written** — even if a phase has zero decisions — to maintain consistent file structure and to make it immediately clear which phases have been completed.

**Decisions are numbered sequentially within each phase section** (Decision 1, Decision 2, …). Numbering resets per phase.

---

## Individual Decision Entry Format

Each entry records one question decision:

```markdown
### Decision {n}
- **Timestamp**: {ISO 8601 — when the decision was recorded}
- **Artifact**: {filename — e.g., analysis.md, spec.md, tech-design.md, todo.md}
- **Question**: {the open question text as it appeared in the artifact}
- **Options Presented**:
  1. {option text} [Recommended]
  2. {option text}
  N. Defer / Ignore
- **Decision**: {the chosen option text, or the recommended option text if deferred}
- **Status**: {Resolved | Ignored (used recommendation)}
```

### Entry Fields

| Field | Type | Description |
|-------|------|-------------|
| Timestamp | ISO 8601 string | When the decision was recorded |
| Artifact | filename | Which artifact contained the open question marker |
| Question | text | The question text from the `[OPEN QUESTION]` marker |
| Options Presented | numbered list | All options shown to the user, with Recommended labeled |
| Decision | text | The chosen option text (or the recommended option if deferred) |
| Status | enum | `Resolved` — user picked an option; `Ignored (used recommendation)` — user deferred |

---

## Concrete Examples

### Resolved Question

```markdown
### Decision 1
- **Timestamp**: 2026-03-26T10:14:22Z
- **Artifact**: analysis.md
- **Question**: Should this bug fix include a regression test for the affected API endpoint?
- **Options Presented**:
  1. Yes — add a regression test covering the failing input [Recommended]
  2. No — document in Known Issues only
  3. Defer / Ignore
- **Decision**: Yes — add a regression test covering the failing input
- **Status**: Resolved
```

### Deferred Question (Recommendation Auto-Applied)

```markdown
### Decision 2
- **Timestamp**: 2026-03-26T10:15:47Z
- **Artifact**: analysis.md
- **Question**: Which logging level should the new error path use?
- **Options Presented**:
  1. ERROR — surfaced in production monitoring [Recommended]
  2. WARN — lower noise in non-critical environments
  3. Defer / Ignore
- **Decision**: ERROR — surfaced in production monitoring
- **Status**: Ignored (used recommendation)
```

---

## Initialization Template

When the first planning phase creates the file, it writes this skeleton (with the actual issue number and timestamp substituted):

```markdown
# Artifact Question Decisions

**Issue**: #{issue-number}
**Created**: {ISO 8601 timestamp}

---

## Phase 2: Start Work (analysis.md)

*(No decisions recorded for this phase.)*

---

## Phase 3: Prepare (spec.md, todo.md)

*(No decisions recorded for this phase.)*

---

## Phase 4: Design (tech-design.md, todo.md)

*(No decisions recorded for this phase.)*
```

When a phase has decisions, the `*(No decisions recorded for this phase.)*` placeholder is replaced by the first `### Decision 1` entry. Subsequent decisions are appended below.

---

## Relationship to evidence.md

`decisions.md` and `evidence.md` are completely separate files with non-overlapping responsibilities:

| Attribute | decisions.md | evidence.md |
|-----------|-------------|-------------|
| Purpose | Planning phase question decisions | Implementation phase progress |
| Written by | Planning phases | Implementation phase agents |
| Read by | Human reviewers, traceability audits | Implementation phase agents |
| Lifecycle | Created in first planning phase, appended in subsequent planning phases | Created and written during implementation only |
| Location | `specs/{issue}/decisions.md` | `specs/{issue}/evidence.md` |
| Interaction | None — these files do not reference each other | None |

There is no `decisions.md` section inside `evidence.md` and no `evidence.md` section inside `decisions.md`. They co-exist in the same specs folder without interaction.

---

## See Also

- Planning phase orchestrators write entries to this file during the interview loop
- `core/memory/practices/implementation/evidence-tracking.md` — evidence.md structure (implementation phase only, separate from this file)
