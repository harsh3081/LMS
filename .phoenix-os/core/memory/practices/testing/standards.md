# Testing Standards

This document defines coverage thresholds and quality gates for unit testing in Phoenix OS.

## Test Quality Scoring Model

The test-addresser agent scores each generated test file out of 100 points using six dimensions. The minimum passing score is 70/100.

### Dimensions and Weights

| Dimension | Max Points | Description |
|-----------|-----------|-------------|
| Assertion Coverage | 10 | Quality and presence of meaningful assertions in test cases |
| Edge Case Coverage | 20 | Coverage of null/undefined, boundary values, empty values, and error conditions |
| Four-Phase Pattern Compliance | 15 | Adherence to the Four-Phase pattern (Setup-Exercise-Verify-Teardown) |
| Project Pattern Conformance | 20 | Adherence to `projectPatterns` detected by test-planner (file extension, location, imports, assertions, naming, setup); full score when `projectPatterns` absent or source = "defaults" |
| Behavior Focus | 15 | Testing behavior (WHAT) rather than implementation details (HOW) |
| Mocking Correctness | 20 | Correct mocking framework API usage, proper cleanup, and absence of mocking anti-patterns |
| **Total** | **100** | |

### Mocking Correctness Dimension (20 points)

Scores the correctness of mocking API usage against the resolved mock framework for the project stack:

- **20 pts**: Correct framework API used throughout; mocks properly reset/cleaned up; no mocking anti-patterns
- **15 pts**: Correct framework API used but minor issues present (missing cleanup in one case, or one unnecessary matcher)
- **10 pts**: One mocking anti-pattern detected, or mocking present with no resolved framework and one generic issue found
- **5 pts**: Multiple mocking anti-patterns detected or mixed framework API usage
- **0 pts**: Entirely wrong framework API used throughout, or mocking absent when source clearly requires dependency isolation

When `resolvedMockFramework` is absent from the plan, generic anti-pattern detection applies. If no mocking is present in the test and source requires no dependencies, score full marks (20/20).

### Minimum Passing Score

**70/100** — Tests scoring below 70 trigger self-correction and regeneration (up to 2 attempts).

---

## Coverage Thresholds

### Enterprise Standard Thresholds
```yaml
coverage:
  lines: 80        # Minimum 80% line coverage
  branches: 75     # Minimum 75% branch coverage
  functions: 80    # Minimum 80% function coverage
  statements: 80   # Minimum 80% statement coverage
```

### Threshold Levels

**Enterprise (Default)**:
- Lines: 80%
- Branches: 75%
- Functions: 80%
- Statements: 80%

**Critical Systems**:
- Lines: 90%
- Branches: 85%
- Functions: 90%
- Statements: 90%

**MVP/Prototype**:
- Lines: 60%
- Branches: 50%
- Functions: 60%
- Statements: 60%

## Quality Gates

### Gate 1: Test Execution
- All tests MUST pass
- No skipped tests without documented reason
- No pending tests in final validation

### Gate 2: Coverage Thresholds
- Line coverage >= threshold
- Branch coverage >= threshold
- Function coverage >= threshold
- Statement coverage >= threshold

### Gate 3: Test Quality
- Tests follow naming conventions
- Tests use Setup-Exercise-Verify-Teardown pattern
- No implementation detail testing
- Edge cases covered

## Project Pattern Conformance

### Detection-First Principle
When a target project has **3 or more existing test files**, the testing agents MUST detect and follow the project's established conventions rather than applying hardcoded defaults. This ensures generated tests are consistent with the project's existing test suite.

### Conformance Requirements
Generated tests MUST conform to the following detected patterns when available:

1. **File Placement**: Match the project's test file structure (`co-located`, `centralized`, or `mixed`)
2. **File Extension**: Use the project's test file extension (`.spec.tsx`, `.test.ts`, etc.)
3. **Imports**: Use the project's test framework, render library, mocking library, and assertion library
4. **Assertions**: Match the project's assertion style (`expect`, `should`, `assert`) and matcher patterns
5. **Naming**: Follow the project's test naming convention (`methodName_scenario_expectedResult`, `should_description`, `descriptive`)
6. **Setup/Teardown**: Use the project's setup and teardown patterns (`beforeEach`, `constructor`, etc.)

### Greenfield Projects

A project is considered **greenfield** when it has **0-2 test files** (inclusive). This threshold is the single authoritative reference for all agents that interact with the testing layer. Agents MUST NOT hardcode this value — they MUST reference this section as the source of truth.

When the greenfield threshold is met, the following rules apply:

1. **MUST use stack-specific defaults**: The agent MUST load fallback patterns from the appropriate memory file based on the detected tech stack:
   - JavaScript or TypeScript: `core/memory/practices/testing/patterns.md`
   - Python: `core/memory/practices/testing/patterns-python.md`
   - Java: `core/memory/practices/testing/patterns-java.md`
   - Go: `core/memory/practices/testing/patterns-go.md`
   - .NET: `core/memory/practices/testing/patterns-dotnet.md`

2. **MUST set mandatory metadata**: The resulting `projectPatterns` object MUST have these metadata values set regardless of stack:
   - `source` = `"defaults"`
   - `confidence` = `"low"`
   - `sampleSize` = `0`
   - `sampledFiles` = `[]`

3. **MUST NOT block execution**: The greenfield fallback path MUST NOT emit errors or warnings that interrupt the workflow. An informational advisory note is permitted and recommended (e.g., "Greenfield project detected — stack defaults applied from {source-file}"), but it MUST be advisory only.

4. **MUST produce structurally complete output**: The `projectPatterns` object MUST be structurally identical (same field names and types) to one produced by the scan path, so downstream agents (`test-addresser`) require no conditional logic based on `source`. Fields not applicable to the detected stack MUST be set to `null` rather than omitted.

### Confidence Levels
- **High** (8+ samples, >80% agreement): Strict conformance expected
- **Medium** (3-7 samples or 60-80% agreement): Conformance recommended, minor deviations acceptable
- **Low** (0-2 samples or <60% agreement): Defaults used, conformance advisory only

### Conformance Anti-Patterns

Pattern Conformance Failures (PCF) are warning-level deductions detected during quality validation (Step 4.1 of `test-addresser`). They never alone cause a test file to score zero.

| ID | Deviation Type | Description |
|----|---------------|-------------|
| PCF-01 | File Extension Mismatch | Generated test uses different extension than `projectPatterns.naming.fileExtension` |
| PCF-02 | File Location Mismatch | Test placed in wrong directory vs `projectPatterns.fileStructure.strategy` |
| PCF-03 | Import Style Mismatch | Imports deviate from `projectPatterns.imports` (framework, render library, mocking library) |
| PCF-04 | Assertion Style Mismatch | Uses different assertion style than `projectPatterns.assertions.style` |
| PCF-05 | Naming Convention Mismatch | Test naming deviates from `projectPatterns.naming.testNameConvention` |
| PCF-06 | Setup Pattern Mismatch | Setup/teardown pattern differs from `projectPatterns.setupTeardown.setupPattern` |

### Deduction Weights

The scoring ladder for the **Project Pattern Conformance** dimension (20 points total) in quality validation:

| Failure Count | Score Awarded |
|---------------|--------------|
| 0 failures | 20 pts (full score) |
| 1 failure | 13 pts |
| 2 failures | 8 pts |
| 3 failures | 4 pts |
| 4+ failures | 0 pts |

**Backward-Compatibility Rule**: When `projectPatterns` is absent from `test-plan.json`, award full 20 pts automatically. No PCF checks are run.

**Greenfield Rule**: When `projectPatterns.source = "defaults"`, award full 20 pts if the generated tests follow the detected stack defaults consistently. Greenfield projects have no established convention to deviate from.

## Test File Requirements

### File Naming
- Pattern: `{ComponentName}.test.{ts,tsx}`
- Alternative: `{ComponentName}.spec.{ts,tsx}`
- Location: **CENTRALIZED in `tests/` directory** (mirrors source structure)

### Test Directory Structure (REQUIRED)
```
tests/                          ← All tests here
├── components/
│   ├── Button.test.tsx
│   └── Form.test.tsx
├── lib/
│   └── utils.test.ts
└── pages/
    └── index.test.tsx

src/                            ← No test files here
├── components/
│   ├── Button.tsx
│   └── Form.tsx
├── lib/
│   └── utils.ts
└── pages/
    └── index.tsx
```

**Mapping Rule**: `src/components/Button.tsx` → `tests/components/Button.test.tsx`

### Test Structure
```typescript
describe('ComponentName', () => {
  // Setup (beforeEach/beforeAll if needed)

  describe('methodName', () => {
    it('should_scenario_expectedResult', () => {
      // Setup
      // Exercise
      // Verify
      // Teardown (if needed)
    });
  });
});
```

## Normalised Coverage Schema

All coverage data consumed by agents in the test audit workflow MUST conform to this normalised schema. Each stack's `coverage-operations.md` file defines how to transform native coverage output into this shape. Agents depend only on this schema -- never on stack-specific field names or file formats.

### Schema Definition

```json
{
  "total": {
    "lines":      { "pct": <number|"N/A">, "covered": <int|"N/A">, "total": <int|"N/A"> },
    "branches":   { "pct": <number|"N/A">, "covered": <int|"N/A">, "total": <int|"N/A"> },
    "functions":  { "pct": <number|"N/A">, "covered": <int|"N/A">, "total": <int|"N/A"> },
    "statements": { "pct": <number|"N/A">, "covered": <int|"N/A">, "total": <int|"N/A"> }
  },
  "files": [
    {
      "path": "<string>",
      "lines":      { "pct": <number|"N/A">, "covered": <int|"N/A">, "total": <int|"N/A"> },
      "branches":   { "pct": <number|"N/A">, "covered": <int|"N/A">, "total": <int|"N/A"> },
      "functions":  { "pct": <number|"N/A">, "covered": <int|"N/A">, "total": <int|"N/A"> },
      "statements": { "pct": <number|"N/A">, "covered": <int|"N/A">, "total": <int|"N/A"> }
    }
  ]
}
```

### Field Contracts

| Field | Type | Description |
|-------|------|-------------|
| `pct` | number (0-100) OR `"N/A"` | Coverage percentage. `"N/A"` when the coverage tool does not report that dimension. |
| `covered` | integer OR `"N/A"` | Count of covered items. `"N/A"` when the coverage tool does not report that dimension. |
| `total` | integer OR `"N/A"` | Total count of items. `"N/A"` when the coverage tool does not report that dimension. |

**Constraints**:
- All three fields within a dimension (`pct`, `covered`, `total`) are either all numeric or all `"N/A"`. Mixed is invalid.
- The `files` array is optional. If the tool only reports aggregate data, `files` may be empty `[]`.
- Field names (`pct`, `covered`, `total`) match Jest's native `coverage-summary.json` field names for backward compatibility.
- The schema contains coverage data only. Metadata (tool name, stack name, schema version) belongs in the stack descriptor, not here.

### "N/A" Sentinel Contract

The string `"N/A"` is the required representation for a metric dimension that a coverage tool does not report.

**Rules**:
- The value MUST be the string `"N/A"` -- not `null`, not `0`, not `undefined`, not an empty string.
- All three fields within a dimension are set to `"N/A"` together. You cannot have `pct: "N/A"` with `covered: 5`.
- Threshold validation MUST skip dimensions where `pct` is `"N/A"` -- they neither pass nor fail.
- A project can pass all coverage gates even if one or more dimensions are `"N/A"`, provided all numeric dimensions meet their thresholds.
- In reporting/display, `"N/A"` dimensions show `N/A` in the value columns and `--` in the status column.

### Per-Stack Dimension Availability

| Stack | lines | branches | functions | statements |
|-------|-------|----------|-----------|------------|
| nodejs (Jest) | numeric | numeric | numeric | numeric |
| python (pytest-cov) | numeric | numeric | **N/A** | numeric |
| java (JaCoCo) | numeric | numeric | numeric | numeric |
| go (go cover) | numeric | **N/A** | **N/A** | numeric |
| dotnet (Coverlet/Cobertura) | numeric | numeric | **N/A** | numeric |

## Coverage Validation

### Validation Procedure

Coverage validation operates on the normalised schema. The coverage file path is resolved via `coverage_output` from `command-interface.md`, and parsing is performed per the `parse_coverage` pointer for the detected stack.

```
For each dimension in [lines, branches, functions, statements]:
  IF normalised.total.{dimension}.pct == "N/A":
    SKIP (dimension not reported by this stack's tool)
  ELSE IF normalised.total.{dimension}.pct >= threshold.{dimension}:
    PASS
  ELSE:
    FAIL
```

**Result**: All thresholds met means all numeric dimensions meet their threshold AND no numeric dimension fails. `"N/A"` dimensions are excluded from the check entirely.

### Check Coverage Against Thresholds

```
Given: normalised coverage object and threshold configuration

For each dimension in [lines, branches, functions, statements]:
  value = normalised.total.{dimension}.pct
  target = threshold.{dimension}

  IF value == "N/A":
    result = "SKIP"
  ELSE IF value >= target:
    result = "PASS"
  ELSE:
    result = "FAIL"

all_pass = no dimension has result "FAIL"
```

### Identify Failing Thresholds

```
failures = []
For each dimension in [lines, branches, functions, statements]:
  value = normalised.total.{dimension}.pct
  target = threshold.{dimension}

  IF value != "N/A" AND value < target:
    append "{dimension}: {value}% (need {target}%)" to failures

IF failures is empty:
  "All thresholds met"
ELSE:
  "Failing thresholds: {failures}"
```

## Worked Normalisation Examples

One example per supported stack showing the native fixture input and resulting normalised JSON output.

### Example 1: Node.js (Jest)

**Native fixture** (`coverage/coverage-summary.json`):
```json
{
  "total": {
    "lines": { "total": 1000, "covered": 850, "skipped": 0, "pct": 85 },
    "statements": { "total": 1200, "covered": 1000, "skipped": 0, "pct": 83.33 },
    "functions": { "total": 200, "covered": 170, "skipped": 0, "pct": 85 },
    "branches": { "total": 300, "covered": 230, "skipped": 0, "pct": 76.67 }
  },
  "path/to/file.ts": {
    "lines": { "total": 50, "covered": 45, "skipped": 0, "pct": 90 },
    "statements": { "total": 60, "covered": 55, "skipped": 0, "pct": 91.67 },
    "functions": { "total": 10, "covered": 9, "skipped": 0, "pct": 90 },
    "branches": { "total": 15, "covered": 12, "skipped": 0, "pct": 80 }
  }
}
```

**Normalised output**:
```json
{
  "total": {
    "lines":      { "pct": 85,    "covered": 850,  "total": 1000 },
    "statements": { "pct": 83.33, "covered": 1000, "total": 1200 },
    "functions":  { "pct": 85,    "covered": 170,  "total": 200 },
    "branches":   { "pct": 76.67, "covered": 230,  "total": 300 }
  },
  "files": [
    {
      "path": "path/to/file.ts",
      "lines":      { "pct": 90,    "covered": 45, "total": 50 },
      "statements": { "pct": 91.67, "covered": 55, "total": 60 },
      "functions":  { "pct": 90,    "covered": 9,  "total": 10 },
      "branches":   { "pct": 80,    "covered": 12, "total": 15 }
    }
  ]
}
```

**Transform notes**: Drop the `skipped` field from each dimension. Restructure per-file entries from keyed-object to `files` array with `path` field. The `total` block field names (`pct`, `covered`, `total`) are identical -- near-identity transform.

### Example 2: Python (pytest-cov)

**Native fixture** (`coverage.json` from `pytest --cov=. --cov-report=json`):
```json
{
  "meta": {
    "format": 2,
    "version": "7.4.0"
  },
  "totals": {
    "covered_lines": 340,
    "num_statements": 400,
    "percent_covered": 85.0,
    "missing_lines": 60,
    "num_branches": 120,
    "num_partial_branches": 10,
    "covered_branches": 100,
    "missing_branches": 20
  },
  "files": {
    "src/main.py": {
      "summary": {
        "covered_lines": 170,
        "num_statements": 200,
        "percent_covered": 85.0,
        "missing_lines": 30,
        "num_branches": 60,
        "num_partial_branches": 5,
        "covered_branches": 50,
        "missing_branches": 10
      }
    }
  }
}
```

**Normalised output**:
```json
{
  "total": {
    "lines":      { "pct": 85.0,  "covered": 340, "total": 400 },
    "branches":   { "pct": 83.33, "covered": 100, "total": 120 },
    "functions":  { "pct": "N/A", "covered": "N/A", "total": "N/A" },
    "statements": { "pct": 85.0,  "covered": 340, "total": 400 }
  },
  "files": [
    {
      "path": "src/main.py",
      "lines":      { "pct": 85.0,  "covered": 170, "total": 200 },
      "branches":   { "pct": 83.33, "covered": 50,  "total": 60 },
      "functions":  { "pct": "N/A", "covered": "N/A", "total": "N/A" },
      "statements": { "pct": 85.0,  "covered": 170, "total": 200 }
    }
  ]
}
```

**Transform notes**: Map `covered_lines` to `lines.covered` and `num_statements` to `lines.total`/`statements.total`. Compute `branches.pct` as `covered_branches / num_branches * 100`. `functions` is `"N/A"` because pytest-cov does not report function-level coverage. `statements` mirrors `lines` (pytest-cov treats statements and lines equivalently).

### Example 3: Java (JaCoCo)

**Native fixture** (`target/site/jacoco/jacoco.xml`, relevant counters from `<report>` element):
```xml
<report name="my-project">
  <counter type="INSTRUCTION" missed="180" covered="820"/>
  <counter type="BRANCH" missed="45" covered="155"/>
  <counter type="LINE" missed="60" covered="340"/>
  <counter type="METHOD" missed="15" covered="85"/>
  <counter type="CLASS" missed="2" covered="18"/>
  <package name="com/example">
    <class name="com/example/Main" sourcefilename="Main.java">
      <counter type="INSTRUCTION" missed="90" covered="410"/>
      <counter type="BRANCH" missed="20" covered="80"/>
      <counter type="LINE" missed="30" covered="170"/>
      <counter type="METHOD" missed="8" covered="42"/>
    </class>
  </package>
</report>
```

**Normalised output**:
```json
{
  "total": {
    "lines":      { "pct": 85.0,  "covered": 340, "total": 400 },
    "branches":   { "pct": 77.5,  "covered": 155, "total": 200 },
    "functions":  { "pct": 85.0,  "covered": 85,  "total": 100 },
    "statements": { "pct": 82.0,  "covered": 820, "total": 1000 }
  },
  "files": [
    {
      "path": "com/example/Main.java",
      "lines":      { "pct": 85.0,  "covered": 170, "total": 200 },
      "branches":   { "pct": 80.0,  "covered": 80,  "total": 100 },
      "functions":  { "pct": 84.0,  "covered": 42,  "total": 50 },
      "statements": { "pct": 82.0,  "covered": 410, "total": 500 }
    }
  ]
}
```

**Transform notes**: For each `<counter>` element, compute `total = missed + covered` and `pct = covered / total * 100`. Map `INSTRUCTION` to `statements`, `LINE` to `lines`, `BRANCH` to `branches`, `METHOD` to `functions`. Per-file data is extracted from `<class>` elements using `sourcefilename` as `path`. If METHOD counters are absent, set `functions` to `"N/A"`.

### Example 4: Go (go cover)

**Native fixture** (`coverage.out` from `go test -cover -coverprofile=coverage.out ./...`):
```
mode: set
github.com/example/main.go:10.20,12.2 1 1
github.com/example/main.go:14.30,18.2 3 1
github.com/example/main.go:20.15,25.2 4 0
github.com/example/main.go:27.10,30.2 2 1
github.com/example/util.go:5.20,8.2 2 1
github.com/example/util.go:10.15,15.2 3 0
```

**Normalised output**:
```json
{
  "total": {
    "lines":      { "pct": 66.67, "covered": 10, "total": 15 },
    "branches":   { "pct": "N/A", "covered": "N/A", "total": "N/A" },
    "functions":  { "pct": "N/A", "covered": "N/A", "total": "N/A" },
    "statements": { "pct": 66.67, "covered": 10, "total": 15 }
  },
  "files": [
    {
      "path": "github.com/example/main.go",
      "lines":      { "pct": 70.0, "covered": 7,  "total": 10 },
      "branches":   { "pct": "N/A", "covered": "N/A", "total": "N/A" },
      "functions":  { "pct": "N/A", "covered": "N/A", "total": "N/A" },
      "statements": { "pct": 70.0, "covered": 7,  "total": 10 }
    },
    {
      "path": "github.com/example/util.go",
      "lines":      { "pct": 60.0, "covered": 3,  "total": 5 },
      "branches":   { "pct": "N/A", "covered": "N/A", "total": "N/A" },
      "functions":  { "pct": "N/A", "covered": "N/A", "total": "N/A" },
      "statements": { "pct": 60.0, "covered": 3,  "total": 5 }
    }
  ]
}
```

**Transform notes**: Parse each line after the `mode:` header. The format is `file:startLine.startCol,endLine.endCol numStatements count`. A block is covered when `count > 0`. Sum `numStatements` for `total`; sum `numStatements` where `count > 0` for `covered`. Compute `pct = covered / total * 100`. `lines` and `statements` carry the same values (Go cover reports statement blocks, not individual lines). `branches` and `functions` are always `"N/A"` because `go test -cover` does not report branch or function coverage.

### Example 5: .NET (Coverlet / Cobertura XML)

**Native fixture** (`TestResults/*/coverage.cobertura.xml`):
```xml
<?xml version="1.0" encoding="utf-8"?>
<coverage line-rate="0.85" branch-rate="0.78" version="1.0"
          timestamp="1234567890" lines-covered="340" lines-valid="400"
          branches-covered="156" branches-valid="200">
  <packages>
    <package name="MyApp" line-rate="0.85" branch-rate="0.78">
      <classes>
        <class name="MyApp.Services.UserService" filename="Services/UserService.cs"
               line-rate="0.90" branch-rate="0.80">
          <lines>
            <line number="10" hits="1" branch="False"/>
            <line number="11" hits="1" branch="False"/>
            <line number="15" hits="0" branch="False"/>
            <line number="20" hits="1" branch="True" condition-coverage="80% (4/5)"/>
          </lines>
        </class>
      </classes>
    </package>
  </packages>
</coverage>
```

**Normalised output**:
```json
{
  "total": {
    "lines":      { "pct": 85.0,  "covered": 340, "total": 400 },
    "branches":   { "pct": 78.0,  "covered": 156, "total": 200 },
    "functions":  { "pct": "N/A", "covered": "N/A", "total": "N/A" },
    "statements": { "pct": 85.0,  "covered": 340, "total": 400 }
  },
  "files": [
    {
      "path": "Services/UserService.cs",
      "lines":      { "pct": 90.0, "covered": 3, "total": 4 },
      "branches":   { "pct": 80.0, "covered": 4, "total": 5 },
      "functions":  { "pct": "N/A", "covered": "N/A", "total": "N/A" },
      "statements": { "pct": 90.0, "covered": 3, "total": 4 }
    }
  ]
}
```

**Transform notes**: Multiply `line-rate` and `branch-rate` by 100 for `pct`. Use `lines-covered`/`lines-valid` and `branches-covered`/`branches-valid` attributes for `covered`/`total`. `functions` is `"N/A"` because Cobertura XML does not report method-level coverage. `statements` mirrors `lines` (Cobertura does not distinguish statements from lines). Per-file data is extracted from `<class>` elements using the `filename` attribute as `path`.

## Exclusion Patterns

> Stack-aware exclusion patterns are defined in
> `core/memory/practices/testing/exclusions/defaults.md`.
>
> Agents resolve patterns by looking up `stackDescriptor.stackName`
> in the defaults file. Each stack section contains four pattern
> categories: test-files, type-definitions, infrastructure, framework.
>
> For the four-layer merge algorithm and user overrides, see
> `core/memory/practices/testing/exclusions/merge-algorithm.md` (#376).

## Reporting Requirements

### Coverage Report Contents
- Overall coverage percentages
- Per-file coverage breakdown
- Uncovered files list
- Files below threshold

### Report Format
```markdown
## Coverage Report

### Summary
- Lines: {pct}% ({covered}/{total})
- Branches: {pct}% ({covered}/{total})
- Functions: {pct}% ({covered}/{total})
- Statements: {pct}% ({covered}/{total})

### Threshold Status
- [x] Lines >= 80%
- [x] Branches >= 75%
- [x] Functions >= 80%
- [x] Statements >= 80%

### Files Below Threshold
1. {file}: {pct}% lines
2. {file}: {pct}% lines
```

---

**Version**: 2.1.0
**Last Updated**: 2026-03-18
**Status**: Active
