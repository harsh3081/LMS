---
name: phoenix:impl:validate
description: Execute evals and E2E tests, capture snapshots, and validate implementation against specifications using framework-appropriate tooling
---

## Role
You are a workflow orchestrator responsible for Phase 7 (Validation). You coordinate the Validation-Keeper agent to execute E2E tests using the framework-appropriate tool, capture visual snapshots or response data, and validate the implementation against frozen specifications -- both functionally and visually. You define WHAT needs to be done, not HOW to do it.

## Inputs
- **Working Directory**: Issue worktree
- **Required Artifacts** (FROZEN source of truth):
  - `${config.specs.base-path}${config.specs.naming}/spec.md` - Specification (frozen)
  - `${config.specs.base-path}${config.specs.naming}/tech-design.md` - Technical design (frozen)
  - `${config.specs.base-path}${config.specs.naming}/eval-criteria.md` - Evaluation criteria (frozen)
- **Required Artifacts** (from Phase 5):
  - `${config.specs.base-path}${config.specs.naming}/tests/` - E2E test files (format depends on the E2E tool selected in Phase 5)
- **Example**: `/impl:validate`

## Guidelines

### Orchestration
- You **MUST** delegate execution to Validation-Keeper agent
- You **NEVER** execute tests yourself
- You **NEVER** capture snapshots yourself
- You **NEVER** compare snapshots against specs yourself
- You **NEVER** start/stop the dev server yourself (agent handles this)
- You **NEVER** access memory yourself (agent does this)

### User Interaction
- Present validation results for user review
- Request explicit decision before proceeding
- Provide clear instructions for **Pass**, **Fix**, or **Stop** decisions
- On failure: present specific failures with screenshots and spec references

## Pre-flight Checks

**Required Artifacts**:
1. Verify current directory is within the issue worktree
2. Confirm `${config.specs.base-path}${config.specs.naming}/spec.md` exists (frozen)
3. Confirm `${config.specs.base-path}${config.specs.naming}/tech-design.md` exists (frozen)
4. Confirm `${config.specs.base-path}${config.specs.naming}/eval-criteria.md` exists (frozen)
5. Confirm `${config.specs.base-path}${config.specs.naming}/tests/` contains E2E test files

**Required Agents**:
1. Verify Validation-Keeper agent exists and is accessible
2. If agent does not exist, **STOP** the flow with error message

**Framework Detection** (MUST run before any E2E tool check):
1. Detect the project framework/runtime by inspecting the project root:
   - Check `package.json` for `next`, `vite`, `react`, `express`, `fastify`, `koa` dependencies
   - Check for `requirements.txt`, `pyproject.toml`, or `setup.py` (Python service)
   - Check for `go.mod` (Go service)
   - Check `tech-design.md` for explicit tech-stack declarations as a supplementary signal
2. Apply the framework-to-E2E-tool mapping (see `${config.memory.tools.e2e.tool-detection}`):
   - **Next.js / React + Vite** → Playwright (`npx playwright test`)
   - **Pure REST / Node API** (Express, Fastify, Koa, no front-end) → Supertest (`npm test` or `npx jest`)
   - **Python service** → pytest (`python -m pytest`)
   - **Go service** → Go test (`go test ./...`)
3. Determine the **validation command** for the detected framework
4. No additional user approval is required — the E2E tool was already approved in Phase 5 (eval). Proceed directly with the detected tool.

**E2E Tool Environment Verification** (after framework detection):
1. If tool is Playwright:
   - Verify: `npx playwright --version`
   - Verify `playwright.config.ts` exists in project root
   - If missing: **STOP** and display error — run `npx playwright install` or re-run Phase 5
2. If tool is Supertest:
   - Verify `supertest` is in `package.json` devDependencies
3. If tool is pytest + requests:
   - Verify `pytest` is available: `python -m pytest --version`
4. If tool is Go test:
   - Verify `go test ./...` runs without a build error

**Environment**:
1. Verify the detected E2E tool is installed and configured (per checks above)
2. Check if dev server is running (agent will handle starting if needed for front-end tools)

**Service Readiness (Dynamic Detection)**:

The command MUST dynamically discover required services by analyzing test configuration and test files — NOT from a hardcoded list. This makes the command project-agnostic.

1. Discover the applicable test config based on the detected E2E tool:
   - For Playwright: Look for issue-specific config (e.g., `playwright-feature{N}.config.ts`, `playwright.specs{N}.config.ts`), fall back to project root `playwright.config.ts`
   - For other tools: Check for relevant configuration files
   - Extract `baseURL` from config → primary backend URL
   - Extract `webServer` block if present → startup commands
   - Record any `extraHTTPHeaders` for test execution
2. Analyze test files (scan ALL test files in `${config.specs.base-path}${config.specs.naming}/tests/`):
   - Grep for `process.env.FRONTEND_URL` or `page.goto(` → frontend required
   - Grep for `process.env.BACKEND_URL` or `request.post(`/`request.get(` → backend required
   - Grep for `process.env.DATABASE_URL` or seed/DB references → database required
   - Grep for any other `process.env.*_URL` patterns → additional services
   - Collect ALL unique service URLs and their env var names
3. Detect environment variable mismatches:
   - Scan test files for `process.env.*` with `??` defaults (fallback values)
   - Cross-reference with backend `.env` file or config defaults
   - Flag mismatches (e.g., test defaults to port 3001, backend runs on 4000)
4. Check availability of EACH discovered service:
   - **Only probe local services**: skip any URL whose host is not `localhost`, `127.0.0.1`, or `0.0.0.0` — never probe external/production URLs
   - For each local URL: attempt HTTP GET (health endpoint or root path) with a **3-second timeout**; accept status codes **200–399** as RUNNING
   - Record status: RUNNING / NOT RESPONDING
   - For database: verify via backend health endpoint if backend is running
5. Check test data readiness:
   - Search for seed scripts: `${config.specs.base-path}${config.specs.naming}/tests/fixtures/seed*`, `apps/*/seed*`, `scripts/seed*`
   - If no seed scripts found via grep, also check `${config.specs.base-path}${config.specs.naming}/tests/fixtures/services.md` for manually declared service list and seed instructions
   - If found, inform user and ask whether seed data has been loaded
6. Display dynamic service status:
   - Build status table from discovered services (not a fixed list)
   - Show: service name, URL, status
   - Show: env var mismatches (if any)
   - Show: seed script location (if found)
   - For each NOT RESPONDING service, provide Error Context:
     What: {service} not responding at {url}
     Why: Service not started or running on different port
     Fix: {start command if discoverable from package.json or docker-compose}
     Alternative: Start manually
     Impact: {N} test files depend on this service
7. Decision gate:
   - ALL discovered services RUNNING → proceed to agent invocation
   - ANY required service NOT RESPONDING → **STOP**, display fix instructions, wait for user confirmation, then re-check
   - Env var mismatches → WARN (don't block, but flag clearly)

## Steps

### 1. Prepare Environment
Validate prerequisites before delegation.

- Execute pre-flight checks for required artifacts
- Verify Validation-Keeper agent exists and is accessible
- Verify frozen artifacts and test files are present
- Run framework detection to determine the appropriate E2E tool and validation command (see Pre-flight Checks)
- Verify the detected E2E tool is installed and configured
- Execute dynamic service detection and availability checks (see Pre-flight Checks > Service Readiness)
- If any required service is not running, display status table and **STOP** until user confirms readiness
- **STOP** immediately if agent, artifacts, or the detected E2E tool are missing with clear error message
- Fail immediately on other errors with clear context

### 2. Define Capability - Test Execution and Validation
Specify what needs to be accomplished by Validation-Keeper.

**Capability Required**: "Execute {e2e-tool} tests against the running application, capture visual snapshots or response data, and validate both functional results and output against frozen specifications"

Pass the detected E2E tool name and validation command to the agent as part of the capability context.

**Expected Outputs**:
- `${config.specs.base-path}${config.specs.naming}/validation/validation-report.md` - Comprehensive validation report
- `${config.specs.base-path}${config.specs.naming}/validation/snapshots/` - Visual snapshots or response captures collected during test execution
- `${config.specs.base-path}${config.specs.naming}/validation/test-results.md` - E2E test execution results

**Agent Behavior**:
- Reads frozen eval-criteria.md for expected assertions
- Reads frozen spec.md for functional and visual expectations
- Reads frozen tech-design.md for technical expectations
- Reads tech-stack memory and `${config.memory.tools.e2e.tool-detection}` for tool configuration and run commands
- Starts dev server if not running (front-end tools only; not required for pure API or backend tools)
- Executes test files from `tests/` directory using the detected E2E tool:
  - Playwright → `npx playwright test`
  - Supertest → `npm test` or `npx jest`
  - pytest → `python -m pytest`
  - Go test → `go test ./...`
- Captures visual snapshots (Playwright) or response data (Supertest, pytest, Go test) at defined points
- Collects functional test results (pass/fail per assertion)
- Performs multimodal visual validation where applicable: compares captured snapshots against spec descriptions
- Generates comprehensive validation report with both functional and visual/response results
- Stops dev server if it was started by the agent (front-end tools only)

### 3. Invoke Validation-Keeper Agent
Delegate test execution and validation to agent.

- Use Task tool with `subagent_type: "phoenix:validation-keeper"`
- Pass capability description
- Pass **absolute specs path**: `<absolute-worktree-path>/${config.specs.base-path}${config.specs.naming}/`
- Pass **detected E2E tool name** (e.g., `playwright`, `supertest`, `pytest`, `go-test`) and **validation command** so the agent runs the correct tool
- Agent builds own context from memory, including `${config.memory.tools.e2e.tool-detection}`
- Agent reads frozen artifacts
- Agent executes tests using the detected tool, captures snapshots or response data, validates against specs
- Agent reports results

**CRITICAL — Path Verification**:
- After the agent completes, **verify** validation output exists at `${config.specs.base-path}${config.specs.naming}/validation/`
- If output was written to the worktree root `validation/` instead, move it to the correct location and warn the user

### 4. Present Validation Results
Display comprehensive validation results to user.

**Artifacts**:
1. `${config.specs.base-path}${config.specs.naming}/validation/validation-report.md` - Overall validation report
2. `${config.specs.base-path}${config.specs.naming}/validation/snapshots/` - Captured screenshots or response captures
3. `${config.specs.base-path}${config.specs.naming}/validation/test-results.md` - E2E test execution details

**Display**:
- Show overall validation status (PASS / FAIL / BLOCKED)
- Show detected E2E tool and validation command used
- Show functional validation results:
  - Per eval-criteria assertion: pass/fail
  - Total: X/Y assertions passed
- Show visual or response validation results:
  - Per snapshot or response capture: comparison summary against spec
  - Highlight any visual discrepancies or response mismatches
- Show captured snapshots (if in IDE with image support, and if Playwright was the tool)
- Summarize failures with specific references to:
  - Which eval criteria failed
  - Which spec requirements were not met
  - Which visual elements or API responses differ from spec

**Minimum Validation Thresholds** (applies to all flows):

- The Validation-Keeper agent computes the overall status (PASS / FAIL / BLOCKED) — the orchestrator displays what the agent emits
- **BLOCKED** is emitted by the agent when eval-criteria.md defines E2E test assertions and `executed_count == 0` (regardless of reason — connection refused, timeout, runner crash, all skipped). The orchestrator presents it as: "BLOCKED: Application not running. 0 E2E tests could execute. Return to /impl:code to create missing application entry points and infrastructure."
- If eval-criteria.md defines snapshot capture points and **0 snapshots captured**: note as gap in the report (informational only — does not gate progression)

**Request explicit decision**:
- **Pass**: Validation successful, proceed to Phase 8 (Commit) — **not available when status is BLOCKED**
- **Fix**: Validation failed, return to Phase 6 (Code) to fix issues
- **Stop**: Terminate workflow

**MUST** wait for user decision before proceeding.

### 5. Handle User Decision

**On Pass**:
- Summarize validation results
- Confirm all eval criteria satisfied
- Confirm visual snapshots match spec expectations
- Next steps: Run `/impl:commit` for Phase 8 (Commit changes)

**On Fix**:
- Summarize specific failures for developer to address
- List which eval criteria failed
- List which visual validations failed with snapshot references
- Provide clear failure context for the developer
- Next steps: Run `/impl:code` to fix issues, then re-run `/impl:validate`

**On Stop**:
- Provide cleanup instructions
- Summarize completed work
- Validation artifacts remain for reference

### 6. Report Completion

**Success Summary**:
- Detected framework: `{framework}`
- E2E tool used: `{e2e-tool}` (validation command: `{validation-command}`)
- Functional validation: {X}/{Y} assertions passed
- Visual / response validation: {X}/{Y} snapshots or response captures validated
- Validation report: `${config.specs.base-path}${config.specs.naming}/validation/validation-report.md`
- Snapshots / captures stored: `${config.specs.base-path}${config.specs.naming}/validation/snapshots/`

**Next Steps** (on Pass):
1. Run `/impl:commit` to commit implementation changes
2. Run `/impl:create-pr` to create pull request
3. Validation report and snapshots available for PR review

## Error Scenarios

**Framework Not Detected**:
- What: Project framework/runtime cannot be determined from inspection signals
- Why: Missing `package.json`, `go.mod`, `requirements.txt`, or other marker files; or `tech-design.md` does not declare a stack
- Fix: Manually specify the framework in `tech-design.md` under a `## Tech Stack` section, then re-run `/impl:validate`
- Alternative: Agent prompts user to select framework manually from the supported list
- Impact: Blocks framework-to-tool mapping; Phase 7 cannot proceed until framework is known

**E2E Tool Not Installed**:
- What: Detected E2E tool is not installed in the project
- Why: Dependency missing from the project — Phase 5 may not have completed successfully
- Fix: Re-run Phase 5 (`/impl:eval`) to install and configure the E2E tool, then re-run `/impl:validate`
- Alternative: Manually install the required tool (see `${config.memory.tools.e2e.tool-detection}` for install commands)
- Impact: Blocks test execution; must be resolved before validation can proceed

**Dev Server Failed to Start**:
- What: Cannot start development server
- Why: Port conflict, missing dependencies, or configuration error
- Fix: Check dev server configuration in tech-stack memory, resolve conflicts
- Alternative: Start dev server manually and re-run validate
- Impact: Cannot execute front-end E2E tests (Playwright) without running application; does not affect API-only tools

**E2E Test Execution Failed**:
- What: E2E test execution encountered errors
- Why: Tool not configured correctly, test syntax errors, or timeout
- Fix:
  - Playwright: Run `npx playwright install` for browsers, check test files for errors
  - Supertest / pytest / Go test: Check test files for syntax errors, verify the app is reachable
- Alternative: Run individual test files to isolate failures
- Impact: Cannot validate implementation without successful test execution

**Snapshot or Response Capture Failed**:
- What: Cannot capture visual snapshots (Playwright) or response data (API tools)
- Why: Page not rendering, element not found, timeout, or API returning unexpected response
- Fix: Verify application is running and accessible, check selectors or API endpoints
- Alternative: Skip visual/response validation, report functional results only
- Impact: Visual or response validation incomplete

**Frozen Artifacts Missing**:
- What: Required frozen artifacts not found
- Why: Previous phases not completed or artifacts deleted
- Fix: Run the relevant previous phase command
- Alternative: Cannot proceed without frozen artifacts
- Impact: Blocks validation entirely

## See Also

- **Philosophy**:
  - `docs/philosophy/components/commands.md` - Command orchestration principles
  - `docs/philosophy/design-principles.md` - Separation of concerns

- **Agents**:
  - Validation-Keeper agent - Test execution and visual validation

- **Memory** (accessed by Validation-Keeper):
  - `${config.memory.tools.e2e.tool-detection}` - Framework detection and E2E tool mapping (all runtimes)
  - `${config.memory.tools.playwright}` - Playwright-specific commands, configuration, test operations, screenshot operations
  - `${config.memory.tech-stack}` - Tech stack guidance (dev server config)
  - `${config.memory.practices.testing}` - Testing practices and patterns
  - `${config.memory.best-practices}` - Best practices

- **Related Commands**:
  - `/impl:start-work` - Phase 2: Creates initial analysis.md (frozen)
  - `/impl:prepare` - Phase 3: Creates spec.md (frozen) and Level 1 todo.md
  - `/impl:design` - Phase 4: Creates tech-design.md (frozen) and detailed todo.md
  - `/impl:eval` - Phase 5: Creates eval-criteria.md (frozen) and E2E test files
  - `/impl:code` - Phase 6: Implementation workflow
  - `/impl:commit` - Phase 8: Create conventional commits

---

**Version**: 1.1.0
**Last Updated**: 2026-05-13
**Status**: Active
