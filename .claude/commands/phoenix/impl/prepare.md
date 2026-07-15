---
name: phoenix:impl:prepare
description: Orchestrate detailed analysis, spec creation, and high-level task planning
---

## Role
You are a workflow orchestrator responsible for Phase 3 (Detailed Analysis). You delegate to Engineering Manager to create detailed tech-agnostic specification and high-level implementation steps. You define WHAT needs to be done, not HOW to do it.

## Inputs
- **Working Directory**: Issue worktree initialized during Phase 2
- **Required Artifacts**:
  - `${config.specs.base-path}${config.specs.naming}/analysis.md` - From `/impl:start-work`
- **Example**: `/prepare`

## Guidelines

### Orchestration
- You **MUST** delegate execution to Engineering Manager agent
- You **NEVER** execute detailed analysis yourself
- You **NEVER** access templates directly (agent does this)
- You **NEVER** load memory yourself (agent does this)
- You **NEVER** generate documents yourself (agent does this)

### User Interaction
- Present agent-generated artifacts for review
- Request explicit approval before proceeding
- Provide clear instructions for **Approve**, **Revise**, or **Stop** decisions
- Reinvoke workflow on revisions

## Pre-flight Checks

**Required Artifacts**:
1. Verify current directory is within the issue worktree
2. Confirm `${config.specs.base-path}${config.specs.naming}/analysis.md` exists

**Required Agents**:
1. Verify Engineering Manager agent exists and is accessible
2. If agent does not exist, **STOP** the flow with error message


## Steps

### 1. Prepare Environment
Validate prerequisites before delegation.

- Execute pre-flight checks for required artifacts
- Verify Engineering Manager agent exists and is accessible
- Verify required artifacts are accessible
- **STOP** immediately if agent does not exist with clear error message
- Fail immediately on other errors with clear context


### 2. Define Capability - Detailed Analysis
Specify what needs to be accomplished by Engineering Manager.

**Capability Required**: "Perform detailed analysis and create tech-agnostic specification with high-level implementation steps"

**Expected Outputs**:
- `${config.specs.base-path}${config.specs.naming}/spec.md` - Tech-agnostic spec with tech stack tags ❄️ FROZEN
- `${config.specs.base-path}${config.specs.naming}/todo.md` - Level 1 steps only (high-level execution flow, NOT detailed breakdown)

**Agent Behavior**:
- Reads frozen `analysis.md` from Phase 2
- Reads `${config.memory.architecture}` for architectural guidance
- Performs deep dive analysis (not shallow like Phase 2)
- Creates spec.md with tech stack tags/pointers
- Creates todo.md with ONLY Level 1 steps (e.g., "Step 1: Setup", "Step 2: Implement Core Logic")
- Does NOT create detailed task breakdown

### 3. Invoke Engineering Manager Agent
Delegate detailed analysis to agent.

- Invoke Engineering Manager agent
- Pass capability description
- Agent builds own context from memory
- Agent reads frozen analysis.md
- Agent creates spec.md and todo.md (Level 1 only)
- Agent reports results

### 3b. Resolve Open Questions
Run the standard interview loop on the generated spec.md and todo.md.

- Follow the interview loop behavior at `${config.behaviors.implementation.interview-loop}`
- Input: The combined structured question list returned by the engineering manager agent (covering both spec.md and todo.md, each question tagged with source artifact)
- Target artifacts: spec.md, todo.md
- Target decisions file: decisions.md (Phase 3 section — append to existing file from Phase 2)
- If agent returned no question list → skip loop, proceed to Step 4
- If questions exist → present one by one, record decisions, update source artifacts inline, append to decisions.md
- After loop completes → proceed to Step 4 (Present Artifacts for Review)

### 4. Present Artifacts for Review
Display agent-generated artifacts to user.

**Artifacts**:
1. `${config.specs.base-path}${config.specs.naming}/spec.md` - Tech-agnostic specification with tech stack tags
2. `${config.specs.base-path}${config.specs.naming}/todo.md` - Level 1 steps only (high-level execution flow)

**Request explicit decision**:
- **Approve**: spec.md becomes FROZEN, proceed to Phase 4 (Design)
- **Revise**: Make changes based on feedback
- **Stop**: Terminate workflow (provide cleanup guidance)

**IMPORTANT**: `todo.md` at this stage has ONLY Level 1 steps. Detailed breakdown happens in Phase 4 (`/impl:design`).

**MUST** wait for user approval before proceeding.

### 5. Handle User Decision

**On Approve**:
- **IMMEDIATELY** edit `spec.md` to change `**Status**:` field to `**Status**: ❄️ Frozen (Source of Truth)` — this is a **FILE WRITE**, not a verbal acknowledgment
- Verify the status field was updated by reading the file back
- **FREEZE** `spec.md` as source of truth ❄️
- Summarize artifact locations
- Note: `todo.md` has only Level 1 steps at this stage
- Next steps: Run `/impl:design` for Phase 4 (Technical Design with detailed TODO)

**On Revise**:
- Collect user feedback
- Reinvoke Engineering Manager with revision requirements
- Re-present artifacts for approval
- Loop until approved or stopped

**On Stop**:
- Provide cleanup instructions (remove worktree, delete branch if needed)
- Summarize completed work

## Frozen Artifacts After This Phase

- ❄️ `analysis.md` - From Phase 2 (already frozen)
- ❄️ `spec.md` - Tech-agnostic spec with tech stack tags (frozen after approval)
- `todo.md` - Level 1 steps only (will be expanded in Phase 4, NOT frozen)

## See Also

- **Philosophy**:
  - `docs/philosophy/components/commands.md` - Command orchestration principles
  - `docs/philosophy/design-principles.md` - Separation of concerns

- **Templates** (accessed by Engineering Manager):
  - `${config.templates.impl.spec}` - Specification template
  - `${config.templates.impl.todo}` - TODO template (Level 1 steps only)

- **Memory** (accessed by Engineering Manager):
  - `${config.memory.architecture}` - Architectural principles
  - `${config.memory.tech-stack}` - Tech stack guidance (for tag references)
  - `${config.memory.best-practices}` - Best practices

- **Related Commands**:
  - `/impl:start-work` - Phase 2: Creates initial analysis.md (frozen)
  - `/impl:design` - Phase 4: Creates tech-design.md (frozen) and detailed todo.md
  - `/impl:eval` - Phase 5: Creates eval-criteria.md (frozen) and Playwright test files
  - `/impl:code` - Phase 6: Implementation workflow
  - `/impl:validate` - Phase 7: Execute evals and validate against specs
  - `/impl:commit` - Phase 8: Create conventional commits

---

**Version**: 1.0.0
**Last Updated**: 2025-10-09
**Status**: Active
