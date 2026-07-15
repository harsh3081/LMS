---
name: phoenix:impl:eval
description: Generate evaluation criteria and E2E test cases from frozen specifications using framework-appropriate tooling
---

## Role
You are a workflow orchestrator responsible for Phase 5 (Test Design). You coordinate the Eval-Keeper agent to generate evaluation criteria and E2E test cases from frozen specifications using the appropriate testing tool for the detected project framework. You define WHAT needs to be done, not HOW to do it.

## Inputs
- **Working Directory**: Issue worktree initialized during Phase 2
- **Required Artifacts** (FROZEN source of truth):
  - `${config.specs.base-path}${config.specs.naming}/spec.md` - Tech-agnostic spec (Phase 3, frozen)
  - `${config.specs.base-path}${config.specs.naming}/tech-design.md` - Technical design (Phase 4, frozen)
  - `${config.specs.base-path}${config.specs.naming}/todo.md` - Detailed task breakdown (Phase 4)
- **Example**: `/impl:eval`

## Guidelines

### Orchestration
- You **MUST** delegate execution to Eval-Keeper agent
- You **NEVER** generate evaluation criteria yourself
- You **NEVER** write test cases yourself
- You **NEVER** access templates directly (agent does this)
- You **NEVER** load memory files yourself (agent does this)
- You **NEVER** generate documents yourself (agent does this)

### User Interaction
- Present agent-generated artifacts for review
- Request explicit approval before proceeding
- Provide clear instructions for **Approve**, **Revise**, or **Stop** decisions
- Reinvoke workflow on revisions

## Pre-flight Checks

**Required Artifacts**:
1. Verify current directory is within the issue worktree
2. Confirm `${config.specs.base-path}${config.specs.naming}/spec.md` exists (Phase 3, frozen)
3. Confirm `${config.specs.base-path}${config.specs.naming}/tech-design.md` exists (Phase 4, frozen)

**Required Agents**:
1. Verify Eval-Keeper agent exists and is accessible
2. If agent does not exist, **STOP** the flow with error message

**Framework Detection** (MUST run before any E2E tool check):
1. Detect the project framework/runtime by inspecting the project root:
   - Check `package.json` for `next`, `vite`, `react`, `express`, `fastify`, `koa` dependencies
   - Check for `requirements.txt`, `pyproject.toml`, or `setup.py` (Python service)
   - Check for `go.mod` or `go.sum` (Go service)
   - Check `tech-design.md` for explicit tech-stack declarations as a supplementary signal
2. Apply the framework-to-E2E-tool mapping (see `${config.memory.tools.e2e.tool-detection}`):
   - **Next.js / React + Vite** → Playwright
   - **Pure REST / Node API** (Express, Fastify, Koa, no front-end) → Supertest
   - **Python service** → pytest + requests
   - **Go service** → net/http/httptest or testify
3. Determine the **recommended E2E tool** and its install command from the mapping
4. Present recommendation to the user:
   > "Detected framework: **{framework}**. Recommended E2E tool: **{tool}**. Install command: `{install-command}`. Approve / Edit / Decline?"
5. Wait for user decision:
   - **Approve**: proceed with recommended tool
   - **Edit**: accept user-provided alternative tool/command, then proceed
   - **Decline**: **STOP** the flow cleanly with a summary of what was detected
6. After approval, verify the chosen tool is installed; if not, run the install command automatically

**E2E Tool Environment Verification** (after framework detection and approval):
1. If tool is Playwright:
   - Verify: `npx playwright --version`
   - Verify `playwright.config.ts` exists in project root
   - If missing after auto-install: **STOP** and display error
2. If tool is Supertest:
   - Verify `supertest` is in `package.json` devDependencies
3. If tool is pytest + requests:
   - Verify `pytest` is available: `python -m pytest --version`
4. If tool is Go test:
   - Verify `go test ./...` runs without a build error

## Steps

### 1. Prepare Environment
Validate prerequisites before delegation.

- Execute pre-flight checks for required artifacts
- Verify Eval-Keeper agent exists and is accessible
- Verify frozen artifacts (spec.md and tech-design.md) are present
- Run framework detection to determine the appropriate E2E tool (see Pre-flight Checks)
- Present recommended E2E tool to user and obtain Approve / Edit / Decline decision
- **STOP** immediately if agent or artifacts are missing with clear error message
- **STOP** cleanly if user declines the E2E tool recommendation
- Fail immediately on other errors with clear context

### 2. Define Capability - Evaluation Criteria and Test Cases
Specify what needs to be accomplished by Eval-Keeper.

**Capability Required**: "Generate evaluation criteria from frozen specifications and create {e2e-tool} test cases that validate the implementation against the spec"

Pass the approved E2E tool name and its configuration to the agent as part of the capability context.

**Expected Outputs**:
- `${config.specs.base-path}${config.specs.naming}/eval-criteria.md` - Evaluation criteria mapping spec requirements to testable assertions
- `${config.specs.base-path}${config.specs.naming}/tests/` - E2E test files in the format appropriate for the selected tool:
  - Playwright → `.spec.ts`
  - Supertest → `.test.ts` or `.test.js`
  - pytest → `test_*.py`
  - Go testify → `*_test.go`

**Agent Behavior**:
- Reads frozen spec.md for functional requirements and acceptance criteria
- Reads frozen tech-design.md for technical implementation details
- Reads the E2E tool detection memory for tool-specific configuration and patterns
- Maps each spec requirement to one or more testable assertions
- Creates eval-criteria.md with structured requirement-to-assertion mapping
- Generates test files that implement the eval criteria using the approved E2E tool
- Tests are written to FAIL initially (Red phase -- no implementation yet)
- Includes snapshot or response-capture points for validation where applicable

### 3. Invoke Eval-Keeper Agent
Delegate evaluation criteria and test case generation to agent.

- Use Task tool with `subagent_type: "phoenix:eval-keeper"`
- Pass capability description
- Pass **absolute specs output path**: `<absolute-worktree-path>/${config.specs.base-path}${config.specs.naming}/`
- Pass **approved E2E tool name** (e.g., `playwright`, `supertest`, `pytest`, `go-test`) so the agent uses the correct tooling
- Agent builds own context from memory, including `${config.memory.tools.e2e.tool-detection}`
- Agent reads frozen spec.md and tech-design.md
- Agent creates eval-criteria.md and test files using the approved E2E tool
- Agent reports results

**CRITICAL — Write Location Verification**:
- After the agent completes, **verify** test files exist at `${config.specs.base-path}${config.specs.naming}/tests/`
- If test files were written to the worktree root `tests/` instead, move them to the correct location and warn the user

**Test Fixture Requirement** (applies to all flows):

- Eval-Keeper MUST produce test data setup alongside test files
- This can be seed scripts, fixture files, or setup instructions — agent decides the form
- Test fixtures MUST be co-located with tests at `<absolute-worktree-path>/${config.specs.base-path}${config.specs.naming}/tests/fixtures/`
- Fixtures MUST document: required test users, their passwords, expected database state
- Fixtures MAY contain test-only credentials; production credentials MUST NOT be placed here
- This ensures the validate phase (Phase 7) can seed the database before running tests

### 4. Present Artifacts for Review
Display agent-generated artifacts to user.

**Artifacts**:
1. `${config.specs.base-path}${config.specs.naming}/eval-criteria.md` - Evaluation criteria
2. `${config.specs.base-path}${config.specs.naming}/tests/` - E2E test files (format depends on the approved tool)

**Display**:
- Show complete contents of eval-criteria.md
- Show list of generated test files with summaries, including which E2E tool was used
- Highlight requirement-to-test mapping coverage
- Note any spec requirements flagged as manual-only

**Request explicit decision**:
- **Approve**: Eval criteria becomes FROZEN, proceed to Phase 6 (Implementation)
- **Revise**: Make changes based on feedback
- **Stop**: Terminate workflow (provide cleanup guidance)

**MUST** wait for user approval before proceeding.

### 5. Handle User Decision

**On Approve**:
- **IMMEDIATELY** edit `eval-criteria.md` to change `**Status**:` field to `**Status**: ❄️ Frozen (Source of Truth)` — this is a **FILE WRITE**, not a verbal acknowledgment
- Verify the status field was updated by reading the file back
- **FREEZE** `eval-criteria.md` as source of truth
- Summarize artifact locations
- Report count of eval criteria and test files generated
- Report spec requirement coverage (% of spec requirements with test assertions)
- Next steps: Run `/impl:code` for Phase 6 (Implementation)

**On Revise**:
- Collect user feedback on specific artifacts
- Identify which artifacts need revision:
  - Eval criteria issues -> reinvoke Eval-Keeper with criteria focus
  - Test case issues -> reinvoke Eval-Keeper with test focus
  - Both -> reinvoke Eval-Keeper with full scope
- Re-present artifacts for approval
- Loop until approved or stopped

**On Stop**:
- Provide cleanup instructions:
  - Remove generated test files
  - Remove eval-criteria.md
  - Worktree remains (previous phases' artifacts preserved)
- Summarize completed work (frozen artifacts from previous phases)

### 6. Report Completion

**Success Summary**:
- Detected framework: `{framework}`
- Approved E2E tool: `{e2e-tool}`
- Eval criteria generated: `eval-criteria.md`
- E2E test files: `{count} tests in ${config.specs.base-path}${config.specs.naming}/tests/`
- Spec requirement coverage: `{percentage}%`
- Snapshot / response-capture points: `{count}`

**Next Steps**:
1. Run `/impl:code` for Phase 6 (Implementation)
2. Developer will implement code to satisfy these evals (Red -> Green)

## Frozen Artifacts Cascade

After Phase 5 approval, these artifacts are FROZEN:

**From Phase 2** (already frozen):
- `analysis.md` - Initial root cause analysis

**From Phase 3** (already frozen):
- `spec.md` - Tech-agnostic spec with tech stack tags

**From Phase 4** (already frozen):
- `tech-design.md` - Technical design (stack-specific)
- `ref-code.md` - Reference code (stack-specific, optional)

**From Phase 5** (newly frozen):
- `eval-criteria.md` - Evaluation criteria with requirement-to-assertion mapping

**NOT Frozen**:
- `todo.md` - Detailed task breakdown (Scrum Master updates during implementation)
- `${config.specs.base-path}${config.specs.naming}/tests/` - E2E test files (implementation of eval criteria, may need minor adjustments)

**IMPORTANT**: Frozen `eval-criteria.md` defines the acceptance contract. E2E test files implement this contract and may need minor adjustments during implementation, but must continue to implement the frozen eval criteria faithfully.

## Error Scenarios

**Frozen Artifacts Missing**:
- What: Required frozen artifacts not found
- Why: Previous phases not completed
- Fix: Run `/impl:design` if tech-design.md is missing, `/impl:prepare` if spec.md is missing
- Alternative: Cannot proceed without frozen artifacts
- Impact: Blocks eval generation entirely

**Agent Not Found**:
- What: Eval-Keeper agent not found
- Why: Agent not configured or missing from expected path
- Fix: Verify agent exists and is accessible
- Alternative: None -- agent is required
- Impact: Cannot generate evals

**Framework Not Detected**:
- What: Project framework/runtime cannot be determined from inspection signals
- Why: Missing `package.json`, `go.mod`, `requirements.txt`, or other marker files; or tech-design.md does not declare a stack
- Fix: Manually specify the framework in `tech-design.md` under a `## Tech Stack` section, then re-run `/impl:eval`
- Alternative: Agent prompts user to select framework manually from the supported list
- Impact: Blocks framework-to-tool mapping; Phase 5 cannot proceed until framework is known

**E2E Tool Not Installed**:
- What: Approved E2E tool is not installed in the project
- Why: Dependency missing from the project
- Fix: Agent auto-runs the install command after user approval; if auto-install fails, display the install command for the user to run manually
- Alternative: User may select an already-installed alternative tool via the Edit option at the approval prompt
- Impact: Blocks test generation; must be resolved before the agent can proceed

**User Declined E2E Tool Recommendation**:
- What: User selected Decline at the E2E tool approval prompt
- Why: User does not want to proceed with the recommended or an alternative tool
- Fix: **STOP** the flow cleanly; no artifacts are generated
- Alternative: User may re-run `/impl:eval` after updating `tech-design.md` to influence detection
- Impact: Phase 5 is halted by user intent; no side-effects on previous frozen artifacts

**Spec Requirements Not Testable**:
- What: Some spec requirements cannot be automated
- Why: Requirements may be subjective or require manual verification
- Fix: Agent flags these as "manual verification required" in eval-criteria.md
- Alternative: Proceed with automatable requirements
- Impact: Partial automation -- manual testing needed for flagged items

## See Also

- **Philosophy**:
  - `docs/philosophy/components/commands.md` - Command orchestration principles
  - `docs/philosophy/design-principles.md` - Separation of concerns

- **Agents**:
  - Eval-Keeper agent - Evaluation criteria and test case generation

- **Memory** (accessed by Eval-Keeper):
  - `${config.memory.tools.e2e.tool-detection}` - Framework detection and E2E tool mapping (all runtimes)
  - `${config.memory.tools.playwright}` - Playwright-specific commands, configuration, test operations, screenshot operations
  - `${config.memory.tech-stack}` - Tech stack guidance
  - `${config.memory.practices.testing}` - Testing practices and patterns
  - `${config.memory.best-practices}` - Best practices

- **Related Commands**:
  - `/impl:start-work` - Phase 2: Creates initial analysis.md (frozen)
  - `/impl:prepare` - Phase 3: Creates spec.md (frozen) and Level 1 todo.md
  - `/impl:design` - Phase 4: Creates tech-design.md (frozen) and detailed todo.md
  - `/impl:code` - Phase 6: Implementation workflow (Developer satisfies eval criteria)
  - `/impl:validate` - Phase 7: Execute evals and validate against specs
  - `/impl:commit` - Phase 8: Create conventional commits

---

**Version**: 1.1.0
**Last Updated**: 2026-05-04
**Status**: Active
**Changes**: Added framework detection pre-flight step; replaced hardcoded Playwright requirement with framework-to-E2E-tool mapping; added human-in-the-loop approval for tool selection; added Decline flow; updated all Playwright-specific references to be tool-agnostic
