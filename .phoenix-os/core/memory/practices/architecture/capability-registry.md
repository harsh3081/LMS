# Capability Registry Pattern

**Category**: Architecture > Agent Extension
**Applies to**: Phoenix OS agent files (`core/agents/**/*.md`)
**Status**: Active

---

## Purpose

The capability registry pattern enables **additive, backward-compatible extension** of
existing Phoenix OS agent files. New capabilities required by a specific recipe are
declared under a `## Capabilities` section appended to the target agent file. The base
agent role, principles, and existing behaviour remain untouched.

This pattern satisfies the Phoenix OS Agent-First Principle: new recipe-specific
behaviour is added through registered capability keys, not through new agent variant
files or invocation flags.

---

## When to Use

Use the capability registry pattern when:
- A new recipe requires an existing agent to perform additional, recipe-specific actions.
- The new actions consume or produce typed IR files not used by the existing recipe set.
- The base agent must continue to serve all existing recipes without modification.

Do NOT use this pattern to:
- Replace or override an agent's existing role or behaviour.
- Add shared cross-recipe capabilities (those belong in the agent's base section).
- Create routing logic that depends on runtime conditional flags.

---

## Block Format

Append a `## Capabilities` section to the target agent file. Each capability is one
fenced YAML block. Multiple capabilities under a single `## Capabilities` heading are
allowed and expected.

```markdown
## Capabilities

> Existing capabilities of this agent remain unchanged. The following blocks register
> additive capabilities used by specific recipes. Other recipes invoking this agent
> receive base behaviour.

```yaml
capability: <capability-key>
version: <positive-integer>
recipe: <recipe-name>          # e.g. phoenix:design:brd-to-design
stage: <pipeline-stage-number>
trigger: "<trigger-phrase>"    # exact phrase the orchestrator uses to activate this cap
inputs:
  - ir: <ir-filename>          # IR file the capability reads
    schemaVersion: <int>
memory:
  - <path/to/memory-file.md>   # LTM files this capability loads
outputs:
  - ir: <ir-filename>          # IR file the capability produces
    schemaVersion: <int>
    schema: <path/to/schema.json>
backward-compat: additive      # assertion enforced by backward-compatibility gate
```
```

---

## Field Reference

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `capability` | string | yes | Unique key within the agent file. Snake-case. |
| `version` | positive integer | yes | Capability version. Increment on any breaking change. |
| `recipe` | string | yes | The recipe that owns this capability (namespaced, e.g. `phoenix:design:brd-to-design`). |
| `stage` | integer | yes | Pipeline stage number this capability is invoked at. |
| `trigger` | string | yes | Exact trigger phrase the recipe orchestrator emits to activate the capability. |
| `inputs` | list | no | IR files consumed by this capability. Each entry carries `ir` (filename) and `schemaVersion` (expected integer version). |
| `memory` | list | no | LTM file paths the capability loads. Scoped to what this capability needs; does not affect the agent's base memory loads. |
| `outputs` | list | no | IR files produced by this capability. Each entry carries `ir`, `schemaVersion`, and `schema` (path to the JSON Schema). |
| `backward-compat` | string | yes | Must be `additive`. Authors and reviewers self-apply this rule: any capability change that breaks existing recipe invocations is forbidden. |

---

## Discovery Rule

The recipe orchestrator command addresses a capability by the combination of `recipe`
**and** `trigger` (not the capability key alone). This prevents name collisions if two
recipes register capabilities with the same key on the same agent.

```
# Orchestrator lookup (pseudocode)
capability = agent.capabilities.find(
    c => c.recipe == invoking_recipe AND c.trigger == emitted_trigger
)
```

If no matching block is found the agent executes its base behaviour — existing recipe
invocations are unaffected.

---

## Lifecycle

**v1 (current)**: Purely declarative metadata. The LLM reads the YAML block at
invocation time, scopes its memory loads to the listed files, and produces the listed
outputs. No dispatcher script is involved — the orchestrator matches by recipe +
trigger and the agent self-applies the contract.

**Future**: If programmatic dispatch is introduced in a later version, the `version`
field on each block will be used to drive compatibility routing. Increment
`version` on any breaking change to the capability contract.

---

## Backward Compatibility Enforcement

The `backward-compat: additive` field on every capability block is a declarative
contract authored by the recipe owner and verified by reviewers during PR review.
Any capability change that would alter the base agent's behaviour or break an
existing recipe invocation is forbidden — the agent's prior behaviour must remain
intact when no matching `recipe` / `trigger` pair is supplied.

There is no runtime enforcement gate; the contract is enforced socially through the
review process and by the discovery rule above (unmatched invocations fall through
to base behaviour).

---

## Example Capability Block Shape

A capability block appended to a host agent looks like the following. Inputs and outputs
should reflect what the recipe actually hands to the agent and what the agent returns —
artifact paths, in-memory sections, or (only when the recipe genuinely uses IR files)
schema-validated IR documents.

```yaml
capability: <kebab-case-key>
version: 1
recipe: phoenix:<recipe-namespace>:<recipe-name>
stage: <integer>
trigger: "<exact-trigger-phrase-the-orchestrator-emits>"
inputs:
  - artifact: <path-or-in-memory-handle>
memory:
  - core/memory/practices/<domain>/<file>.md
outputs:
  - artifact: <path-the-agent-writes>
backward-compat: additive
notes: |
  Short prose describing what the capability does and how it differs from the
  agent's base behaviour.
```

> **Note**: the `phoenix:design:brd-to-design` recipe (introduced in MR !443) does
> **not** add any capability blocks. It invokes existing agents (`phoenix:tech-lead`,
> `phoenix:brd-analyzer`, etc.) through standard delegation with in-memory context.
> The recipe's "What Is Not Required" section explicitly prohibits typed IR files —
> any new capability block on a host agent for that recipe must therefore use
> `artifact:` entries pointing at the file paths the recipe step actually writes,
> not `ir: *.json` entries.

---

## See Also

- `core/memory/practices/architecture/principal-guidelines.md` — SOLID, KISS, YAGNI principles that motivate the additive-only constraint
- `core/agents/impl/engineering-manager.md` — extended by `phoenix:design:brd-to-design`
- `core/agents/impl/tech-lead.md` — extended by `phoenix:design:brd-to-design`
