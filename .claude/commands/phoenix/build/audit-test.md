---
name: phoenix:build:audit-test
description: Automated unit testing workflow using 4-phase PLAN-APPROVE-ADDRESS-RECHECK cycle
argument-hint: "[target-coverage] [--branch-diff] [--base <branch>] [--target <pct>] [--mock-framework <name>] [--file <path>] [--force] [--no-cache] [--rescan-patterns] [--help]"
---

## Role
You are an expert workflow orchestrator responsible for automated unit testing. You directly coordinate the 4-phase unit testing workflow by invoking specialized agents in sequence.

You handle orchestration and user interaction. Agents handle autonomous execution.

## Inputs
- **$1**: Target coverage percentage (integer, optional) - defaults to 80
- **Configuration**: `${config.project.testing.coverage-threshold}`
- **Testing Memory**: `${config.memory.testing}`
- **Example**: `/phoenix:build:audit-test 80`
- **Example**: `/phoenix:build:audit-test` (uses default 80%)

**Branch-Diff Mode Flags** (all require `--branch-diff` to be active):
- **`--branch-diff`**: Activates branch-scoped test generation mode. When present, the command resolves a base branch and scopes coverage analysis to files changed between the current branch and the base branch. Boolean flag, no value. Example: `/phoenix:build:audit-test --branch-diff`
- **`--base <branch>`**: Explicit base branch override (string, optional). When supplied, the named branch is used directly as the base for `git diff` without executing auto-detection paths 2, 3, or 4. Requires `--branch-diff`. Example: `/phoenix:build:audit-test --branch-diff --base main`
- **`--target <pct>`**: Coverage target override for branch-diff mode (integer 0-100, optional). Overrides the default coverage target when operating in branch-scoped mode. Requires `--branch-diff` or `--file`. Example: `/phoenix:build:audit-test --branch-diff --target 90`
- **`--force`**: Bypasses the 50-file confirmation prompt in non-interactive/CI mode. When present alongside `--branch-diff` and the delta contains 50+ files, the command logs a warning and proceeds without halting. Does NOT bypass the merge-conflict pre-flight check (merge conflicts are always a hard halt). Example: `/phoenix:build:audit-test --branch-diff --force`

**General Flags** (available in all invocation modes):
- **`--mock-framework <name>`** (optional): Overrides the auto-detected mocking framework for test generation. The value is passed through to agents as `mockFrameworkOverride` in `file-scope-context.json`. Valid values: any framework identifier from `core/memory/practices/testing/mocking-frameworks.md` (e.g., `jest`, `sinon`, `msw`, `pytest-mock`, `mockito`, `gomock`, `testify/mock`, `moq`, `nsubstitute`). If the value is not in the known frameworks list, emit a warning (not an error): "Warning: '{value}' is not a recognized mocking framework for {stackName}. Proceeding with override." Example: `/phoenix:build:audit-test --mock-framework sinon`
- **`--help`, `-h`**: Display usage information and all recognized flags, then exit. Takes absolute precedence over all other flags — no pre-flight checks or workflow steps execute. Example: `/phoenix:build:audit-test --help`
- **`--no-cache`** (optional): Bypasses the runtime stack-detection and preflight cache for this invocation. The cache is still written after a fresh scan completes, so subsequent runs remain cached. Useful when the environment has changed in a way not reflected by the manifest hash (e.g., global tool version change). Available in all invocation modes. Example: `/phoenix:build:audit-test --no-cache`
- **`--rescan-patterns`** (optional): Forces regeneration of `.phoenix-os/project/testing/patterns.md` even if it already exists. Blocked by `locked: true` in the file's YAML frontmatter — the recipe exits with a clear message if blocked. Available in all invocation modes. Example: `/phoenix:build:audit-test --rescan-patterns`

**Single-File Mode Flags**:
- **`--file <path>`**: Activates single-file mode. Scopes all operations — coverage audit, plan creation, test generation, and recheck — to the single source file at `<path>`. The value must be a non-empty string representing a path to an existing source file. Example: `/phoenix:build:audit-test --file src/services/auth.service.ts`
- **Mutual exclusion rule**: `--file` is incompatible with `--branch-diff`. If both flags are supplied, halt with: `"Error: '--file' and '--branch-diff' are mutually exclusive. Use one scoping mode at a time."`
- **`--target <pct>` compatibility**: When `--file` is active, `--target` may be supplied as the per-file coverage threshold. `--base` and `--force` are no-ops in single-file mode (a warning may be emitted if supplied alongside `--file`).

**Flag Dependency Rules**:
- `--base` requires `--branch-diff`. If `--base` is supplied without `--branch-diff`, halt with: `"Error: '--base' requires '--branch-diff' to be active. Add '--branch-diff' to your invocation or remove '--base'."`
- `--target` requires either `--branch-diff` or `--file`. If `--target` is supplied without either, halt with: `"Error: '--target' requires '--branch-diff' or '--file' to be active. Add a scoping mode flag or remove '--target'."`

**Unknown Flag Rule**: Any argument starting with `-` that is not in the recognized list (`--branch-diff`, `--base`, `--target`, `--mock-framework`, `--file`, `--force`, `--no-cache`, `--rescan-patterns`, `--help`, `-h`) is an unknown flag. Halt immediately with an error listing the unknown flag and all valid flags. Do not attempt partial parsing. See Input Parsing section for exact error format.

## Guidelines

### Orchestration
- You **MUST** invoke agents in sequence: test-planner → test-addresser → test-rechecker
- You **NEVER** execute tests or analyze coverage directly
- You **NEVER** provide context to agents (agents build their own)
- You **MUST** read agent results from ST memory to make routing decisions

### User Interaction
- You **MUST** prompt user for exclusion patterns if needed (one-time only)
- You **MUST** run fully autonomously after initial prompt
- APPROVE phase is automatic (display plan, then continue immediately)

### Validation
- You **MUST** validate target coverage is between 0 and 100
- You **SHOULD** use default 80% if no target provided

## Workflow Overview

```
┌─────────────────────────────────────────────────────────┐
│           /phoenix:build:audit-test (Command)            │
│           Orchestrates agents in sequence                │
└────────────────────────┬────────────────────────────────┘
                         │
        ┌────────────────┼────────────────┐
        │                │                │
        ▼                ▼                ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ test-planner │ │test-addresser│ │test-rechecker│
│  (PLAN)      │ │  (ADDRESS)   │ │  (RECHECK)   │
└──────────────┘ └──────────────┘ └──────────────┘
```

## Pre-flight Checks

**Flag Parsing (runs before all other checks)**:

Execute this scan on every invocation, in priority order:

1. **Help check**: If `--help` or `-h` is present anywhere in the argument list, display the Help Output block (see the Help Output section below) and exit immediately. No pre-flight checks, no workflow execution.
2. **Mutual exclusion check**: If both `--file` and `--branch-diff` are present anywhere in the argument list, halt immediately with:
   ```
   Error: '--file' and '--branch-diff' are mutually exclusive. Use one scoping mode at a time.
   ```
   Exit before any pre-flight check or workflow step.
3. **`--file` value validation**: If `--file` is present, extract the value (the next argument after `--file`). If the value is absent or is itself a flag (starts with `-`), halt with:
   ```
   Error: '--file' requires a path argument. Example: --file src/services/auth.service.ts
   ```
   If the value is valid, store it as `targetFilePath` in session context.
4. **Unknown flag check**: Scan every argument that starts with `-`. Any such argument not in the recognized set (`--branch-diff`, `--base`, `--target`, `--mock-framework`, `--file`, `--force`, `--help`, `-h`) is an unknown flag. Halt immediately with:
   ```
   Error: Unknown flag '{flag}'.

   Valid flags:
     --branch-diff    Scope to branch-delta files
     --base <branch>  Set base branch for diff
     --target <pct>   Override coverage target
     --mock-framework <name>  Override mocking framework
     --file <path>    Scope to a single source file
     --force          Bypass 50-file confirmation in CI
     --no-cache       Bypass runtime cache for this invocation
     --rescan-patterns  Force regeneration of project patterns file
     --help, -h       Show help

   Run '/phoenix:build:audit-test --help' for usage details.
   ```
   Do not attempt partial parsing. Exit before any pre-flight check or workflow step.
5. **Default path guard**: If no flags are present (no `--branch-diff`, no `--file`, only an optional bare integer argument), skip all mode-specific checks entirely and fall through to Input Validation unchanged. This preserves byte-for-byte behavioral equivalence with the pre-feature baseline.

**Input Validation**:
1. Target coverage is valid integer (0-100)
2. Default to 80 if not provided
3. If `--base` is supplied without `--branch-diff`, halt with the flag dependency error described in the Inputs section
4. If `--target` is supplied without `--branch-diff` or `--file`, halt with the flag dependency error described in the Inputs section

**Environment Validation**:
1. Verify test-planner agent exists at `${config.agents.core}testing/test-planner.md`
2. Verify test-addresser agent exists at `${config.agents.core}testing/test-addresser.md`
3. Verify test-rechecker agent exists at `${config.agents.core}testing/test-rechecker.md`
4. If any agent file does not exist, **STOP** with error message
5. Verify `git` CLI is available. Run `git --version`. If `git` is not present, **STOP** with: `"Error: 'git' is required but was not found. Install git and retry."`
6. (Branch-diff mode only) Check whether `gh` CLI is available and authenticated by running `gh auth status`. This is an informational check only -- absence or authentication failure is not an error. Record the availability status in session context (`gh_available`). If `gh` is unavailable or unauthenticated, note this silently and proceed; Path 2 of the base branch resolution chain will be skipped automatically.

**Memory Validation**:
1. Verify testing memory files exist:
   - `${config.memory.testing.standards}`
   - `${config.memory.testing.methodology}`
   - `${config.memory.testing.patterns}`
   - `${config.memory.testing.path}/stack-detection.md` (stack detection contract)
   - `${config.memory.testing.path}/command-interface.md` (command interface resolution)

**Branch-Diff Pre-flight Guards** (only active when `--branch-diff` flag is present; default-path invocations skip this block entirely):

**Pre-Flight Step 1: Merge Conflict Detection**

Execute before any file-discovery or git-diff command:

1. Run `git diff --check HEAD` to detect conflict markers in tracked files.
2. If the exit code is non-zero (conflict markers present), halt immediately with:
   ```
   Error: Unresolved merge conflicts detected in the working tree.
   Resolve all conflicts and commit before running branch-diff mode.

   Conflicting files:
     <list of files reported by git diff --check>

   No git diff or coverage commands were executed.
   ```
3. The `--force` flag does NOT bypass this check. Merge conflicts always produce a hard halt.
4. If exit code is zero, proceed to Pre-Flight Step 2.

**Pre-Flight Step 2: Delta Size Guard**

Execute after file discovery produces the delta file list (the list of source files changed between the current branch and the base branch):

1. Count the number of source files in the delta list. Call this `delta_count`.
2. If `delta_count < 50`, proceed silently with no prompt.
3. If `delta_count >= 50`:
   a. **`--force` flag present**: Log warning and proceed without prompting:
      ```
      Warning: {delta_count} files detected in branch delta. Proceeding because --force was passed.
      ```
   b. **Interactive terminal (TTY detected)**: Display the following warning and prompt for explicit confirmation:
      ```
      Warning: Large branch delta detected.

      {delta_count} source files were found in this branch delta.
      The first 10 files are:
        {file_1}
        {file_2}
        ... (up to 10)

      Proceeding will run test generation across all {delta_count} files.
      This may take significant time.

      Continue? (y/N):
      ```
      - If the user responds with `y` or `Y`, proceed with workflow execution.
      - If the user responds with anything else (or presses Enter for the default `N`), halt with: `"Aborted. Narrow the branch delta or pass --force to bypass in CI."`
   c. **Non-interactive environment (no TTY / CI)**: Auto-halt with:
      ```
      Error: 50+ files detected in branch delta ({delta_count} files).
      In non-interactive mode, use --base <branch> with a narrower scope or pass --force to proceed.
      ```

## Steps

### 1. Validate Input
Parse and validate target coverage.

- Parse $1 as target coverage percentage
- If not provided, default to 80
- If provided, validate is integer between 0 and 100
- If invalid, show error and exit

### 2. Resolve Base Branch

**Guard**: Execute this step only when `--branch-diff` is active. If `--branch-diff` is not present, skip this step entirely and proceed directly to Step 3.

**Output contract**: On successful completion this step sets the `baseBranch` context variable to a validated, locally-existing branch name. No agent is invoked until `baseBranch` is set and confirmed.

The following four paths are evaluated in strict priority order. The first path that resolves a value wins; remaining paths are skipped.

---

**Path 1 -- Explicit `--base <branch>` parameter**

Trigger condition: `--base <branch>` was supplied on invocation.

Action:
- Use the supplied value directly as the candidate branch name.
- Skip Paths 2, 3, and 4 entirely.
- Proceed immediately to the Branch Existence Validation gate below.

Failure: There is no fallback from Path 1. If the supplied branch does not pass the existence validation gate, the AC-6 error is raised.

---

**Path 2 -- GitHub PR API detection**

Trigger condition: `--base` was not supplied AND `gh_available` is `true` (set during Pre-flight Checks).

Action:
- Run: `gh pr view --json baseRefName --jq .baseRefName`
- If the command exits successfully and returns a non-empty string, use that string as the candidate branch name.
- Proceed to the Branch Existence Validation gate.

Skip conditions (all trigger a silent skip to Path 3 with no user-visible message):
- `gh` CLI is not installed
- `gh` CLI is installed but not authenticated
- No open PR exists for the current branch
- `gh pr view` returns an error for any reason
- `gh pr view` returns an empty string or malformed output

---

**Path 3 -- Common default branch probe**

Trigger condition: Paths 1 and 2 did not resolve a value.

Action:
- Probe in strict order: `main`, `origin/main`, `master`, `origin/master`, `develop`, `origin/develop`.
- For each name, run: `git rev-parse --verify <name>`
- Use the first branch for which the command exits with code 0.
- Proceed to the Branch Existence Validation gate.

Fall-through: If none of the six refs exist, proceed to Path 4.

---

**Path 4 -- User prompt fallback**

Trigger condition: Paths 1, 2, and 3 did not resolve a value.

Non-interactive guard:
- Before prompting, detect whether a TTY is available (non-interactive / CI environment).
- If no TTY is available, **HALT** with:
  `"Error: Cannot detect base branch in non-interactive mode. Use '--base <branch>' explicitly."`
- Do not prompt and do not proceed.
- Note: The `--force` flag does NOT bypass this halt. CI users must supply `--base <branch>` explicitly.

Interactive prompt:
- Display to the user:
  ```
  No base branch could be detected automatically.

  A base branch is the branch your current branch was created from (commonly 'main', 'master', or 'develop').
  It is used to determine which files have changed on your branch.

  Enter base branch name:
  ```
- Capture user input.

Empty / cancelled input handling:
- If the user provides no input (empty string) or cancels (e.g., Ctrl+C), exit cleanly with:
  `"Base branch detection cancelled. Re-run with '--base <branch>' to specify a base branch explicitly."`
- This is a clean exit, not an unhandled error.

On non-empty input:
- Use the supplied value as the candidate branch name.
- Proceed to the Branch Existence Validation gate.

---

**Branch Existence Validation Gate (AC-6)**

This gate applies uniformly after any resolution path produces a candidate branch name.

- Run: `git rev-parse --verify <resolvedBranch>`
- If the command exits with code 0: the branch exists locally. Store the value in `baseBranch` context variable. Proceed to the Display sub-step below.
- If the command exits with a non-zero code: the branch does not exist locally. **HALT** with:
  `"Error: Branch '<resolvedBranch>' does not exist locally. Run 'git fetch origin <resolvedBranch>' to retrieve it, then retry."`
- No agent invocation proceeds if this gate fails, regardless of which path resolved the branch.

---

**Display Resolved Base Branch (AC-5)**

After the Branch Existence Validation Gate passes, and before invoking any agent or proceeding to the next step, display to the user:

```
Base branch resolved: `<resolvedBranch>` (detected via <detection-method>)
```

Where `<detection-method>` is one of:
- `explicit --base flag` (Path 1)
- `GitHub PR API` (Path 2)
- `default branch probe` (Path 3)
- `user prompt` (Path 4)

Example output: `Base branch resolved: main (detected via GitHub PR API)`

Proceed to Step 3 only after this message is displayed.

### 3. Configure Coverage Scope
One-time user prompt for coverage configuration.

**Single-File Mode Context Write** (executes only when `--file` is present; replaces the Option 1/2/3 prompt for single-file invocations):

If `--file` is present in the argument list (i.e., `targetFilePath` is set in session context from Flag Parsing):
- Resolve `targetCoverageThreshold`:
  - If `--target <pct>` was supplied, use that value.
  - Otherwise, use `${config.project.testing.coverage-threshold}` (default: 80).
- Write `file-scope-context.json` to `${config.stm.base-path}` with:
  ```json
  {
    "mode": "single-file",
    "targetFilePath": "<resolved absolute path from --file>",
    "targetCoverageThreshold": "<resolved threshold>",
    "mockFrameworkOverride": "<value from --mock-framework, or null>",
    "userExclusionChoice": "standard",
    "userOverrides": [],
    "exclusionPatterns": [],
    "noCacheOverride": "<true if --no-cache was passed, else false>",
    "rescanPatterns": "<true if --rescan-patterns was passed, else false>"
  }
  ```
  Note: `exclusionPatterns` is initialized as an empty array. The test-planner populates it via the 4-layer exclusion resolution pipeline during the PLAN phase.
- Display: `"[OK] Single-file mode: scoping all operations to {targetFilePath}"`
- Skip the Option 1/2/3 exclusion prompt entirely (exclusion patterns are not user-configurable in single-file mode; `userExclusionChoice: "standard"` applies).
- Proceed directly to Step 4 (Orchestrate 4-Phase Workflow).

**USER INTERACTION**:
```
Coverage Scope Configuration

What would you like to include in coverage analysis?

  [1] Main code only (exclude library/vendor files) - RECOMMENDED
  [2] Everything (include all files)
  [3] Custom exclusions (specify patterns)

Select option (1/2/3):
```

**On Option 1 (Main code only)**:
- Display: "[OK] Will exclude standard patterns for your detected tech stack"
- Note: Actual exclusion patterns will be resolved by test-planner after stack detection (four-layer pipeline from `${config.memory.testing.exclusions.path}/merge-algorithm.md`) and shown in the PLAN phase output.
- Set `userExclusionChoice = "standard"` in `file-scope-context.json`
- Set `userOverrides = []` (no user overrides)
- Set `noCacheOverride = true` in `file-scope-context.json` if `--no-cache` was passed, else `false`
- Set `rescanPatterns = true` in `file-scope-context.json` if `--rescan-patterns` was passed, else `false`

**On Option 2 (Everything)**:
- No exclusion patterns applied — pipeline short-circuits with `resolved = []`
- Set `userExclusionChoice = "everything"` in `file-scope-context.json`
- Set `userOverrides = []`
- Display: "[WARN] Including ALL files in coverage (may include vendor code)"

**On Option 3 (Custom)**:
- Prompt: "Enter exclusion patterns (comma-separated). Use `!pattern` to force-include a normally-excluded file:"
- Example: `**/legacy/**, **/generated/**, !*.stories.{ts,tsx}`
- Validate patterns are valid glob syntax
- Store patterns in `file-scope-context.json` under `userOverrides` array (these become L4 overrides in the exclusion resolution pipeline)
- Set `userExclusionChoice = "custom"` in `file-scope-context.json`
- Display: "[OK] Custom overrides will be applied as Layer 4 during exclusion resolution"

- Store exclusion configuration for agent use
- **After this prompt, run fully autonomously through all 4 phases**

### 4. Orchestrate 4-Phase Workflow
Execute PLAN → APPROVE → ADDRESS → RECHECK loop directly.

**Initial Setup**:
- Set max_iterations = 5
- Set current_iteration = 1
- Set target_coverage = {parsed from $1}
- Set exclusion_patterns = {from step 3}
- Set baseBranch = {resolved in step 2, if --branch-diff active}

**Loop Control**:
- Repeat phases until: PASS decision OR max iterations reached OR STOP decision
- Read agent decisions from ST memory files
- Route based on decision: PASS (exit), LOOP (continue), FAIL (exit)

**Phase Sequence**:
1. Invoke `/phoenix:testing:test-planner` with target and patterns
   - `test-planner` executes the ordered detection chain per `stack-detection.md`
   - `test-planner` writes the resolved stack descriptor to `test-plan.json` under `stackDescriptor` key
   - All downstream agents read the descriptor from `test-plan.json` (STM)
2. Display plan automatically (APPROVE phase - no user input)
   - Display resolved stack from `stackDescriptor` (e.g., "Stack: nodejs | Test: jest | Coverage: jest --coverage")
3. Invoke `/phoenix:testing:test-addresser` (generates and runs tests)
   - `test-addresser` reads `stackDescriptor` from `test-plan.json` to select stack-appropriate patterns
4. Invoke `/phoenix:testing:test-rechecker` (compares coverage, decides next action)
   - `test-rechecker` reads `stackDescriptor` from `test-plan.json` to select stack-appropriate coverage parsing
5. If decision is LOOP and iterations < 5, go back to step 1

### 5. Monitor Progress
Display status updates during 4-phase execution.

```
Starting Automated Unit Testing Workflow
   Target: 80% coverage
   Max iterations: 5
   Scope: Main code only (excluding vendor/library files)

   Phases: PLAN -> APPROVE -> ADDRESS -> RECHECK

┌─────────────────────────────────────────────────────────┐
│ PHASE 1: PLAN (Iteration 1)                              │
│ Agent: phoenix:test-planner                             │
└─────────────────────────────────────────────────────────┘
   Building context from memory...
   [OK] Read: testing methodology, patterns, standards
   [OK] Read: command-interface.md for operation resolution

   Detecting tech stack (ordered chain per stack-detection.md)...
   [OK] Stack detected: {stackName} | Test: {testFramework} | Mock: {mockingFramework} | Coverage: {coverageTool}

   Auditing coverage (main code only)...
   [OK] Running: {resolved run_coverage command}
   [OK] Current: Lines 45% | Branches 35% | Functions 50%

   Creating smart plan...
   [OK] Prioritized 15 files by coverage gap
   [OK] Estimated 45 new tests needed
   [OK] Saved: test-plan.json

┌─────────────────────────────────────────────────────────┐
│ PHASE 2: APPROVE                                         │
│ Command: Auto-approve (fully autonomous)                │
└─────────────────────────────────────────────────────────┘
   [OK] Plan reviewed and approved automatically
   -> Proceeding to ADDRESS phase...

┌─────────────────────────────────────────────────────────┐
│ PHASE 3: ADDRESS                                         │
│ Agent: phoenix:test-addresser                           │
└─────────────────────────────────────────────────────────┘
   Building context from memory...
   [OK] Read: test-plan.json from ST memory
   [OK] Read: testing patterns & methodology

   Generating tests (batch mode)...
   [OK] Button.tsx -> tests/components/Button.test.tsx (8 tests)
   [OK] Form.tsx -> tests/components/Form.test.tsx (10 tests)
   [OK] Input.tsx -> tests/components/Input.test.tsx (6 tests)
   ... (15 files total)
   [OK] Generated 45 new tests

   Running ALL tests...
   [OK] {testFramework} found 150 tests
   [OK] Results: 145 passed, 5 failed

   Collecting coverage...
   [OK] Lines: 45% -> 72% (+27%)
   [OK] Branches: 35% -> 65% (+30%)
   [OK] Functions: 50% -> 75% (+25%)
   [OK] Saved: address-results.json

┌─────────────────────────────────────────────────────────┐
│ PHASE 4: RECHECK                                         │
│ Agent: phoenix:test-rechecker                           │
└─────────────────────────────────────────────────────────┘
   Building context from memory...
   [OK] Read: test-plan.json (before) & address-results.json (after)

   Comparing before/after...
   Lines:     45% -> 72% (+27%) FAIL Target: 80% (gap: 8%)
   Branches:  35% -> 65% (+30%) FAIL Target: 75% (gap: 10%)
   Functions: 50% -> 75% (+25%) FAIL Target: 80% (gap: 5%)

   Making decision...
   [OK] Coverage improved: Yes (+27% average)
   [OK] Target reached: No (8% gap remaining)
   [OK] Decision: LOOP (continue to iteration 2)
   [OK] Saved: recheck-results.json

┌─────────────────────────────────────────────────────────┐
│ PHASE 1: PLAN (Iteration 2)                              │
│ Agent: phoenix:test-planner                             │
└─────────────────────────────────────────────────────────┘
   ...
```

### 6. Report Results
Display final coverage report based on testing-keeper outcome.

**On Success (PASS from RECHECK)**:
```markdown
## PASS - Unit Testing Workflow Complete

### Final Coverage
| Metric | Start | End | Improvement |
|--------|-------|-----|-------------|
| Lines | 45% | 82% | +37% |
| Branches | 35% | 78% | +43% |
| Functions | 50% | 85% | +35% |
| Statements | 45% | 82% | +37% |

### Iterations: 2
### Total Tests Generated: 45
### Total Tests Passing: 145

Reports: .phoenix-os/project/reports/testing/
```

**On Partial Success (FAIL from RECHECK)**:
```markdown
## PARTIAL - Unit Testing Workflow Incomplete

### Final Coverage
| Metric | Start | End | Improvement |
|--------|-------|-----|-------------|
| Lines | 45% | 72% | +27% |
| Branches | 35% | 65% | +30% |
| Functions | 50% | 75% | +25% |
| Statements | 45% | 72% | +27% |

### Status: Below Target
- Target: 80%
- Achieved: 72%
- Gap: 8%

### Recommendation
- Review complex components manually
- Consider architectural improvements

Reports: .phoenix-os/project/reports/testing/
```

**On User Stop (STOP from APPROVE)**:
```markdown
## STOPPED - Unit Testing Workflow Stopped

### Reason: User requested stop at APPROVE phase

### Partial Results
- Coverage audited: Yes
- Plan created: Yes
- Tests generated: No

Reports: .phoenix-os/project/reports/testing/
```

## Help Output

Displayed when `--help` or `-h` is passed. Output is a literal block; the agent renders it as-is without dynamic formatting.

```
Usage: /phoenix:build:audit-test [target-coverage] [options]

Arguments:
  target-coverage    Optional integer (0-100). Sets the coverage target percentage.
                     Defaults to 80 when omitted.
                     Example: /phoenix:build:audit-test 90

Options:
  --branch-diff          Scope test generation to files changed in the current
                         branch relative to the resolved base branch.
                         Default mode (no flags): full-project analysis.
                         Example: /phoenix:build:audit-test --branch-diff

  --base <branch>        Explicit base branch for diff comparison.
                         Overrides auto-detection. Requires --branch-diff.
                         Default: auto-detected via four-path chain:
                         (1) --base flag, (2) GitHub PR API, (3) probe
                         main/master/develop, (4) interactive prompt.
                         Example: /phoenix:build:audit-test --branch-diff --base main

  --target <pct>         Override coverage target percentage (0-100).
                         Requires --branch-diff or --file.
                         Example: /phoenix:build:audit-test --branch-diff --target 70
                         Example: /phoenix:build:audit-test --file src/auth.ts --target 90

  --mock-framework <name>
                         Override the auto-detected mocking framework for test
                         generation. Value is passed to agents as
                         mockFrameworkOverride. Valid values: jest, sinon, msw,
                         pytest-mock, mockito, gomock, testify/mock, moq,
                         nsubstitute. Unrecognized values emit a warning, not
                         an error.
                         Example: /phoenix:build:audit-test --mock-framework sinon

  --force                Bypass the 50-file confirmation prompt in
                         non-interactive/CI mode. When the branch delta
                         contains 50+ files and no TTY is detected,
                         --force allows the workflow to proceed with a warning
                         instead of halting with an error.
                         Note: --force does NOT bypass merge-conflict detection.
                         Example: /phoenix:build:audit-test --branch-diff --force

  --no-cache             Bypass the runtime stack-detection and exclusion-
                         resolution cache for this invocation. A fresh scan
                         runs and a new cache is written after. Use when
                         the environment changed in a way not captured by
                         the manifest hash (e.g. global tool version bump).
                         Available in all invocation modes.
                         Example: /phoenix:build:audit-test --no-cache

  --rescan-patterns      Force regeneration of the committed project patterns
                         file at .phoenix-os/project/testing/patterns.md.
                         Blocked if the file has locked: true in its YAML
                         frontmatter — recipe exits with a clear message.
                         Available in all invocation modes.
                         Example: /phoenix:build:audit-test --rescan-patterns

  --file <path>          Scope test generation to a single source file.
                         When present, all four phases operate on the
                         specified file only. Mutually exclusive with
                         --branch-diff.
                         Example: /phoenix:build:audit-test --file src/services/auth.service.ts

  --help, -h             Show this help message and exit. Takes precedence
                         over all other flags.
                         Example: /phoenix:build:audit-test --help

Examples:
  /phoenix:build:audit-test
      Full-project mode, 80% coverage target (default).

  /phoenix:build:audit-test 90
      Full-project mode, 90% coverage target.

  /phoenix:build:audit-test --branch-diff
      Branch-scoped mode, auto-detect base branch, 80% target.

  /phoenix:build:audit-test --branch-diff --base main --target 70
      Branch-scoped mode, base=main, 70% target.

  /phoenix:build:audit-test --branch-diff --force
      Branch-scoped mode with --force; bypasses 50-file confirmation in CI.

  /phoenix:build:audit-test --file src/services/auth.service.ts
      Single-file mode, 80% coverage target for the specified file.

  /phoenix:build:audit-test --file src/services/auth.service.ts --target 90
      Single-file mode, 90% coverage target for the specified file.

  /phoenix:build:audit-test --no-cache
      Full-project mode, 80% target, bypass runtime cache this run only.

  /phoenix:build:audit-test --rescan-patterns
      Full-project mode, force regeneration of committed project patterns file.

Notes:
  - The 50-file threshold triggers a confirmation prompt (interactive) or
    auto-halt (CI). Pass --force to bypass in CI.
  - Merge conflicts in the working tree always halt the command before any
    file discovery. Resolve conflicts and retry.
  - --base requires --branch-diff to be present.
  - --target requires --branch-diff or --file to be present.
  - The 50-file gate counts all changed files in the delta (docs, config,
    agent metadata, test files included) — not only source files. The source
    extension filter runs later in PLAN phase. This is intentional: the gate
    is a cost warning, not a source-file filter.
  - --file and --branch-diff are mutually exclusive. Only one scoping mode
    may be active per invocation.
```

## Error Scenarios

### Agent Not Found
- What: Required agent not available
- Why: Agent file missing or misconfigured
- Fix: Verify agent files exist in `${config.agents.core}testing/`
- Impact: Cannot run automated testing workflow

### Test Execution Failure
- What: Tests failed to execute
- Why: Test framework error, configuration issue
- Fix: Review test output, check test framework configuration
- Alternative: Run tests manually with the resolved `run_tests` command from command-interface.md

### No Coverage Improvement
- What: Coverage stuck, no progress
- Why: Complex components, unmockable dependencies
- Fix: Manual test creation for flagged components
- Alternative: Lower target or exclude complex files

### Memory Files Missing
- What: Testing memory not found
- Why: Memory files not created or path incorrect
- Fix: Verify files in core/memory/practices/testing/
- Impact: Agents cannot build context

### Base Branch Not Found (AC-6)
- What: Resolved base branch does not exist locally
- Why: The branch name was resolved (via `--base`, PR API, default probe, or user prompt) but is not present in the local git repository
- Fix: Run `git fetch origin <branch>` to retrieve the remote branch, then retry
- Impact: No agents are invoked; the workflow halts before any test generation begins
- Error message: `"Error: Branch '<resolvedBranch>' does not exist locally. Run 'git fetch origin <resolvedBranch>' to retrieve it, then retry."`

### Non-Interactive Environment Without --base
- What: Base branch cannot be detected and no TTY is available to prompt the user
- Why: Paths 1, 2, and 3 of the resolution chain did not resolve a base branch, and the environment is non-interactive (CI, headless, no TTY)
- Fix: Add `--base <branch>` explicitly to the invocation. Example: `/phoenix:build:audit-test --branch-diff --base main`
- Impact: Workflow halts before any agents are invoked. This is an expected, clean exit in CI environments that do not supply `--base`.
- Error message: `"Error: Cannot detect base branch in non-interactive mode. Use '--base <branch>' explicitly."`

### Invalid --base Value
- What: The branch name supplied via `--base <branch>` does not exist locally
- Why: The supplied branch name is misspelled, has not been fetched, or does not exist in this repository
- Fix: Verify the branch name with `git branch -a`, fetch it with `git fetch origin <branch>` if it is a remote branch, then retry with the corrected name
- Impact: Workflow halts at the Branch Existence Validation Gate before any agents are invoked. No test generation or coverage analysis is performed.
- Error message: `"Error: Branch '<resolvedBranch>' does not exist locally. Run 'git fetch origin <resolvedBranch>' to retrieve it, then retry."`

## User Experience Summary

1. **One Command**: `/phoenix:build:audit-test 80`
2. **One Prompt**: "Exclude library files? (Y/n)"
3. **Fully Autonomous**: All 4 phases run automatically
   - PLAN: Detects stack, audits, creates plan
   - APPROVE: Auto-approved, displays plan and continues
   - ADDRESS: Generates and runs ALL tests
   - RECHECK: Validates coverage, loops if needed (up to 5 iterations)
4. **Final Report**: Comprehensive coverage summary

## 4-Phase Workflow Detail

```
┌─────────────────────────────────────────────────────────┐
│                   START WORKFLOW                         │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│  STEP 2: RESOLVE BASE BRANCH (--branch-diff only)       │
│  • Path 1: explicit --base flag                         │
│  • Path 2: gh pr view (PR API)                          │
│  • Path 3: probe main/master/develop                    │
│  • Path 4: user prompt fallback                         │
│  • Validate branch exists locally (AC-6)                │
│  • Display resolved branch to user (AC-5)               │
└────────────────────┬────────────────────────────────────┘
                     │  (skipped if --branch-diff absent)
                     ▼
┌─────────────────────────────────────────────────────────┐
│  PHASE 1: PLAN (test-planner)                           │
│  • Detect tech stack (ordered chain per stack-detection) │
│  • Emit stack descriptor to test-plan.json              │
│  • Audit coverage                                       │
│  • Create smart plan                                    │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│  PHASE 2: APPROVE (auto-approved)                       │
│  • Display plan to user                                 │
│  • Auto-continue to ADDRESS                             │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│  PHASE 3: ADDRESS (test-addresser)                      │
│  • Generate ALL tests (batch)                           │
│  • Run ALL tests                                        │
│  • Collect coverage                                     │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│  PHASE 4: RECHECK (test-rechecker)                      │
│  • Compare before/after                                 │
│  • Check thresholds                                     │
│  • Decision: PASS / LOOP / FAIL                         │
└────────────────────┬────────────────────────────────────┘
                     │
        ┌────────────┼────────────┐
        │            │            │
        ▼            ▼            ▼
     [PASS]       [LOOP]       [FAIL]
        │            │            │
        ▼            │            ▼
   EXIT SUCCESS      │       EXIT PARTIAL
                     │
                     └──► Back to PHASE 1
```

## See Also

- **Agents** (invoked by this command in sequence):
  - `phoenix:test-planner` - PLAN phase (detects stack, audits coverage, creates plan)
  - `phoenix:test-addresser` - ADDRESS phase (generates tests, runs tests, collects coverage)
  - `phoenix:test-rechecker` - RECHECK phase (compares coverage, decides PASS/LOOP/FAIL)

- **Memory References**:
  - `${config.memory.testing}` - Testing practices
  - `${config.memory.tools.jest}` - Jest operations
  - `${config.memory.tools.npm}` - npm operations
  - `${config.memory.testing.path}/stack-detection.md` - Stack detection contract
  - `${config.memory.testing.path}/command-interface.md` - Command interface resolution (run_tests, run_coverage, parse_coverage, list_tests, coverage_output, test_directory)
  - `${config.memory.testing.path}/audit-test-cache.md` - Runtime cache spec (location, hash formula, invalidation rules, edge cases)
  - `${config.memory.tools.git.history-analysis}` - Git branch probe patterns used in Step 2 (Path 3)
  - `${config.memory.tools.github.issue-operations}` - `gh` CLI invocation patterns used in Step 2 (Path 2)

- **Philosophy**:
  - `docs/philosophy/components/commands.md` - Command guidelines
  - `docs/philosophy/design-principles.md` - Separation of concerns

---

**Version**: 2.2.0
**Last Updated**: 2026-03-18
**Status**: Active
