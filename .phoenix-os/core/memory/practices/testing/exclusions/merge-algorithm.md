# Merge Algorithm

**Version**: 1.0.0
**Last Updated**: 2026-03-19
**Status**: Active

---

## Overview

The merge algorithm combines four exclusion layers into a single resolved exclusion set used for coverage analysis. It is the capstone of the four-layer exclusion resolution system (parent epic #345).

**Purpose**: Produce a deterministic, traceable set of file exclusion patterns by merging stack defaults, heuristic discoveries, config imports, and user overrides — with full audit trail.

### Four-Layer Pipeline Summary

| Layer | Name | Source | Type |
|-------|------|---------|------|
| L1 | Stack Defaults | `exclusions/defaults.md` → stackName section | Additive |
| L2 | Heuristics | STM `heuristicExclusions.flattened` (Step 2.5) | Additive |
| L3 | Config Import | STM `configImportExclusions.flattened` (Step 2.6) | Additive |
| L4 | User Overrides | `file-scope-context.json` → `userOverrides` | Additive or Negation |

Layers L1, L2, and L3 are always additive (set union). Layer L4 supports both additive patterns and negation patterns (prefix `!`).

---

## Algorithm

### Input Contract

| Parameter | Source | Type |
|-----------|--------|------|
| `stackName` | `stackDescriptor.stackName` from test-plan.json | string |
| `heuristicResults` | Step 2.5 STM output (`heuristicExclusions.flattened`) | string[] |
| `configImportResults` | Step 2.6 STM output (`configImportExclusions.flattened`) | string[] |
| `userOverrides` | `file-scope-context.json` → `userOverrides` | string[] |

### Pseudocode

```
FUNCTION resolveExclusions(stackName, heuristicResults, configImportResults, userOverrides):

  # Step 1: Load L1 stack defaults
  defaults = readDefaults(stackName)
  # Read from exclusions/defaults.md, navigate to section matching stackName
  # Flatten all category arrays (test files, type defs, config files, etc.) into a single set

  # Step 2: Additive merge L2 heuristics
  merged = SET(defaults) ∪ SET(heuristicResults)

  # Step 3: Additive merge L3 config import
  merged = merged ∪ SET(configImportResults)

  # Step 4: Apply L4 user overrides
  FOR EACH pattern IN userOverrides:
    IF pattern STARTS WITH "!":
      target = pattern WITHOUT leading "!"   # strip the "!" prefix
      merged = merged - {target}             # exact string match removal; no-op if absent
    ELSE:
      merged = merged ∪ {pattern}            # additive

  # Step 5: Build resolution trace
  RETURN {
    "stackName": stackName,
    "L1_stackDefaults": LIST(defaults),
    "L2_heuristics": LIST(heuristicResults),
    "L3_configImport": LIST(configImportResults),
    "L4_userOverrides": LIST(userOverrides),
    "resolved": LIST(merged)
  }
```

### Step-by-Step Description

**Step 1 — Load L1 Stack Defaults**
Read `exclusions/defaults.md` and navigate to the section that matches `stackName`. Flatten all category sub-arrays (e.g., test file patterns, type definition patterns, config file patterns, generated code patterns) into a single deduplicated set. This forms the baseline from which all other layers build.

**Step 2 — Additive Merge L2 Heuristics**
Take the union of the L1 defaults set and the heuristic exclusion results (collected by the heuristics engine in Step 2.5 of test-planner). Set union ensures no duplicates across layers.

**Step 3 — Additive Merge L3 Config Import**
Take the union of the current merged set and the config import exclusion results (collected by the config import engine in Step 2.6 of test-planner). Again, set union deduplicates.

**Step 4 — Apply L4 User Overrides**
Iterate through each pattern in `userOverrides`. For patterns that begin with `!`, strip the prefix and remove the resulting string from the merged set using exact string matching. For patterns that do not begin with `!`, add them to the merged set. All L4 operations apply to the L1∪L2∪L3 baseline, not incrementally to each other — this means processing order of L4 entries does not affect the final outcome for pure negation entries.

**Step 5 — Build Resolution Trace**
Return the `exclusionResolution` object with all input arrays preserved for auditability, alongside the final `resolved` array.

### Edge Cases

| Scenario | Behavior |
|----------|----------|
| L2, L3, L4 all empty | `resolved` = L1 defaults only (backward compatible) |
| L4 negates all patterns | `resolved` = [] (user intentionally wants no exclusions) |
| Duplicate patterns across layers | Set union deduplicates automatically |
| `userExclusionChoice === "everything"` | Short-circuit: skip all layers, `resolved` = [] |
| `userExclusionChoice === "standard"` | L4 = [] (no overrides); execute L1∪L2∪L3 only |
| `userExclusionChoice === "custom"` | L4 = `userOverrides` array from `file-scope-context.json` |

---

## Negation Syntax

User overrides (L4) support a negation prefix `!` that removes a pattern from the merged L1∪L2∪L3 set. This allows users to force-include files that are normally excluded by a lower layer.

### Rules

| Rule | Description | Example |
|------|-------------|---------|
| Exact match removal | `!X` removes pattern `X` from the merged set if it is present | `!*.stories.{ts,tsx,js,jsx}` removes the Storybook exclusion |
| No-op on missing | `!X` where `X` is not in the merged set → silent no-op, no error | `!nonexistent-pattern` → set unchanged |
| Not an inclusion | `!X` does NOT create an inclusion pattern — it only removes an exclusion | Files matching `X` are no longer excluded, but are not explicitly included |
| Order independence | All negation operations apply to the L1∪L2∪L3 baseline, not to each other incrementally | The relative order of `!` entries in L4 does not affect the result |

> **Important**: Negation uses **exact string match** — the pattern after `!` must exactly match a pattern in the merged set. For example, `!**/generated/**` will only remove `**/generated/**` from the set, not `generated/**` or `src/generated/**`. If unsure of the exact pattern, inspect the `exclusionResolution.L1_stackDefaults` trace in `test-plan.json` to see the exact strings used by the current stack's defaults.

### Examples

**Example 1 — Remove a stack default (Storybook)**
```
userOverrides = ["!*.stories.{ts,tsx,js,jsx}"]
```
Result: `*.stories.{ts,tsx,js,jsx}` is NOT present in `resolved`. Story files are now included in coverage analysis. No error is thrown.

**Example 2 — Silent no-op on absent pattern**
```
userOverrides = ["!nonexistent-pattern"]
```
Result: The merged set is unchanged. `nonexistent-pattern` was never in the set, so there is nothing to remove. No error is thrown.

**Example 3 — Mix of additions and negations**
```
userOverrides = ["**/vendor/**", "!*.stories.{ts,tsx,js,jsx}"]
```
Result: `**/vendor/**` is added to the merged set; `*.stories.{ts,tsx,js,jsx}` is removed. Both operations are independent.

**Example 4 — Negation of an L2 heuristic result**
```
heuristicResults = ["src/generated/api-client.ts"]
userOverrides = ["!src/generated/api-client.ts"]
```
Result: `src/generated/api-client.ts` is NOT present in `resolved`. The heuristic-detected pattern was negated by the user.

**Edge Case — Negation removes, does not invert**
```
userOverrides = ["!src/auth/auth.service.ts"]
```
This removes `src/auth/auth.service.ts` from the exclusion set. It does NOT add an explicit include for `src/auth/auth.service.ts`. The file simply falls through to normal coverage collection rules.

---

## Resolution Trace Schema

The `exclusionResolution` object is written to `test-plan.json` and `file-scope-context.json` after Step 2.7 of test-planner completes. It provides a full audit trail of how the resolved exclusion set was built.

### JSON Schema

```json
{
  "exclusionResolution": {
    "stackName": "string — matches stackDescriptor.stackName",
    "L1_stackDefaults": ["string[]  — patterns loaded from defaults.md for this stack"],
    "L2_heuristics": ["string[]  — patterns detected by heuristics engine (Step 2.5)"],
    "L3_configImport": ["string[]  — patterns imported from project config (Step 2.6)"],
    "L4_userOverrides": ["string[]  — raw patterns from userOverrides (may include ! prefixed)"],
    "resolved": ["string[]  — final deduplicated exclusion set after all layers applied"]
  }
}
```

**Field definitions**:
- `stackName` (required): The stack identifier used to load L1 defaults. Must match `stackDescriptor.stackName`.
- `L1_stackDefaults` (required): All patterns from the `defaults.md` section for this stack, flattened.
- `L2_heuristics` (required): Patterns discovered by the heuristics engine. Empty array if Step 2.5 found no patterns.
- `L3_configImport` (required): Patterns imported from project-level config. Empty array if Step 2.6 found no patterns.
- `L4_userOverrides` (required): Raw user override patterns including any `!`-prefixed negation entries. Empty array if `userExclusionChoice` is `"standard"` or `"everything"`.
- `resolved` (required): The final exclusion set after L1∪L2∪L3 union and L4 application. This array is copied verbatim into the `exclusionPatterns` flat field for backward compatibility.

### Example Trace — Node.js with L2, L3, and L4 Overrides

```json
{
  "exclusionResolution": {
    "stackName": "nodejs",
    "L1_stackDefaults": [
      "*.test.{ts,tsx,js,jsx}",
      "*.spec.{ts,tsx,js,jsx}",
      "__tests__/**",
      "__mocks__/**",
      "*.d.ts",
      "**/build/**",
      "**/dist/**",
      "**/generated/**",
      "**/styleguide/**",
      "**/plugins/**",
      "**/*-config/**",
      "**/api/editing/**",
      "**/api/sitemap/**",
      "*.stories.{ts,tsx,js,jsx}",
      "*.config.{js,ts}",
      "index.{ts,js}"
    ],
    "L2_heuristics": [
      "src/generated/api-client.ts"
    ],
    "L3_configImport": [
      "src/legacy/**"
    ],
    "L4_userOverrides": [
      "**/vendor/**",
      "!*.stories.{ts,tsx,js,jsx}"
    ],
    "resolved": [
      "*.test.{ts,tsx,js,jsx}",
      "*.spec.{ts,tsx,js,jsx}",
      "__tests__/**",
      "__mocks__/**",
      "*.d.ts",
      "**/build/**",
      "**/dist/**",
      "**/generated/**",
      "**/styleguide/**",
      "**/plugins/**",
      "**/*-config/**",
      "**/api/editing/**",
      "**/api/sitemap/**",
      "*.config.{js,ts}",
      "index.{ts,js}",
      "src/generated/api-client.ts",
      "src/legacy/**",
      "**/vendor/**"
    ]
  }
}
```

Note: `*.stories.{ts,tsx,js,jsx}` is present in `L1_stackDefaults` but absent from `resolved` — it was removed by the `!*.stories.{ts,tsx,js,jsx}` negation entry in L4.

### Example Trace — Backward Compatible (No L2/L3/L4)

```json
{
  "exclusionResolution": {
    "stackName": "nodejs",
    "L1_stackDefaults": ["*.test.{ts,tsx,js,jsx}", "..."],
    "L2_heuristics": [],
    "L3_configImport": [],
    "L4_userOverrides": [],
    "resolved": ["*.test.{ts,tsx,js,jsx}", "..."]
  }
}
```

When L2, L3, and L4 are all empty, `resolved` equals `L1_stackDefaults` exactly — producing the same output as the pre-pipeline system.

### Example Trace — Option 2 ("Everything") Short-Circuit

```json
{
  "exclusionResolution": {
    "stackName": "nodejs",
    "L1_stackDefaults": [],
    "L2_heuristics": [],
    "L3_configImport": [],
    "L4_userOverrides": [],
    "resolved": []
  }
}
```

When `userExclusionChoice === "everything"`, the pipeline short-circuits and returns empty arrays for all layers. The `resolved` array is empty, meaning no files are excluded from coverage.

---

## Integration Points

### audit-test.md

**Rule 3 — Two-Phase Validation (Step 1.5)**

The merge algorithm introduces a two-phase split for Rule 3 in `audit-test.md`:

- **Phase A (Universal, pre-detection)**: Checks the target file against 10 universal exclusion patterns that apply to all stacks (`**/build/**`, `**/dist/**`, `**/generated/**`, `**/vendor/**`, `**/node_modules/**`, `**/.venv/**`, `**/venv/**`, `**/bin/**`, `**/obj/**`, `**/target/**`). A match triggers a hard error (exit code 1) before any agent is invoked. These patterns are safe to evaluate without knowing the tech stack.

- **Phase B (Stack-Specific, post-detection)**: After test-planner Step 2.7 resolves the exclusion set, check the target file against the resolved stack-specific patterns. A match emits a warning (not an error) and execution continues, because the user explicitly targeted this file with `--file`.

**Step 2 — Option 1 (Deferred Display)**

Option 1 no longer displays a hardcoded list of Node.js patterns. Instead, it shows a deferred message and writes `userExclusionChoice = "standard"` to `file-scope-context.json`. Actual patterns are displayed in the PLAN phase output after stack detection and exclusion resolution complete.

**Step 2 — Option 3 (L4 Overrides)**

Option 3 prompts the user for patterns including `!pattern` negation syntax. The entered patterns are stored in `file-scope-context.json` under `userOverrides` as an array. These become the L4 input to the merge algorithm in test-planner Step 2.7.

**Step 1.6 — Schema Extension**

`file-scope-context.json` gains three new optional fields:
- `userExclusionChoice`: `"standard" | "everything" | "custom"` — records the user's selection
- `userOverrides`: `string[]` — L4 patterns from Option 3 (empty array for Options 1 and 2)
- `exclusionResolution`: `object | null` — initially null, populated by test-planner Step 2.7

### test-planner.md

**Step 2.7 — Resolve Exclusions (Full Pipeline)**

After Steps 2.5 (Heuristics) and 2.6 (Config Import) populate the STM with their results, Step 2.7 reads this memory file (`merge-algorithm.md`) and executes the full four-layer pipeline. It reads L1 from `defaults.md`, L2 and L3 from STM, and L4 from `file-scope-context.json`. The resulting `exclusionResolution` object is written to `test-plan.json` and the `exclusionPatterns` flat array is updated with `exclusionResolution.resolved` for backward compatibility with test-addresser.

### JSON Schemas

- **`file-scope-context.json`**: Extended with `userExclusionChoice`, `userOverrides`, and `exclusionResolution` fields (all optional/additive, no breaking changes)
- **`test-plan.json`**: Extended with `exclusionResolution` object alongside `stackDescriptor` (optional/additive, no breaking changes)

---

## See Also

- `exclusions/defaults.md` — L1 stack default patterns
- `exclusions/heuristics.md` — L2 heuristic pattern rules (#374)
- `exclusions/config-import.md` — L3 config import rules (#375)
- `core/commands/phoenix/build/audit-test.md` — orchestrator (Rule 3 two-phase, Step 2, Step 1.6)
- `core/agents/testing/test-planner.md` — Step 2.7 pipeline execution
- `core/memory/practices/testing/stack-detection.md` — stackDescriptor contract
