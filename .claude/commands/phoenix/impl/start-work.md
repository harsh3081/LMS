---
name: phoenix:impl:start-work
description: Initialize implementation workflow with environment setup and analysis creation
argument-hint: "issue-number"
---

## Role
You are an expert workflow orchestrator responsible for initializing implementation workflows. You coordinate environment setup and initial analysis creation to produce comprehensive analysis documents for any issue type (Story, Task, or Bug).

You will validate inputs, orchestrate agent execution, facilitate analysis creation through root cause analysis, and request user validation. You define WHAT needs to be done, not HOW to do it.

## Inputs
- **$1**: Issue number (integer, required)
- **$2**: Analysis template name (string, optional) - defaults to prompting user
- **Example**: `/start-work 145`
- **Example**: `/start-work 145 bug-fix-analysis`
- **Example**: `/impl:start-work 123`

## Guidelines

### Orchestration
- You **NEVER** enter plan mode — reasoning belongs to agents, not orchestrators
- You **NEVER** provide context to agents (agents build their own)

### User Interaction
- **REQUIRED**: Present analysis for user review and wait for approval
- **REQUIRED**: If user says stop, terminate and provide cleanup instructions

## Pre-flight Checks

**Input Validation**:
1. Issue number is positive integer
2. Issue exists and is accessible

**Required Agents**:
1. Verify an expert project management exists
2. Verify an expert repository operations exists
3. Verify an expert engineering manager exists
4. If any required agent does not exist, **STOP** the flow with error message

**Template Validation** (if $2 provided):
1. Verify that analysis template exists
2. If template does not exist, list available templates and prompt user

## Steps

### 1. Prepare Environment
Validate prerequisites and setup required state.

- Load platform-specific memory per `${config.memory.tools.platform-detection}`.
- Validate issue number argument is positive integer
- Verify all required agents exist and are accessible
- Validate analysis template if provided (or prepare to prompt user)
- Extract repository context (owner, repo from git remote)
- **STOP** immediately if any agent does not exist with clear error message
- Fail immediately on other errors with clear context

### 2. Fetch Issue Details and Detect Type
Retrieve comprehensive issue information and determine workflow path.

- Use Task tool to invoke project management agent
- Delegate capability: "Retrieve issue details from project management system"
- Pass: issue identifier, repository context
- Required data: identifier, title, description, type, state, assignees, labels, milestone
- Agent builds own context for their needs
- **CRITICAL**: Query issue type via the resolved PM platform's operations memory
  (delegate to the resolved PM platform per `${config.memory.tools.platform-detection}`).
  NEVER use a hardcoded platform-specific API call and NEVER infer type from title.
- Issue type is used for template recommendation in Step 4

### 3. Setup Development Environment
Create isolated worktree for the issue.

- Use Task tool to invoke repository operations steward
- Delegate capability: "Create worktree with branch for issue"
- Pass: issue number, issue type
- **Worktree location** (MUST resolve to absolute path before passing to agent):
  - Resolve `${config.worktree.base-path}` to an **absolute path** from the project root
    (e.g., if project root is `/home/user/project` and base-path is `../worktrees/phoenix-os/`,
    resolve to `/home/user/worktrees/phoenix-os/`)
  - Worktree path: `<absolute-base-path>/${config.worktree.naming}`
- **Branch naming**: `{type}/{number}-{issue-title-slug}`
- Worktree/branch creation against the git remote uses the code repository platform; unchanged.
- Expected: branch creation, worktree creation, push to origin
- Agent builds own context for their needs
- Change working directory to worktree using: `cd <absolute-worktree-path>`

### 4. Create Initial Analysis
Perform initial analysis (scope varies by issue type).

- **Template Selection Prompt** — present the following prompt to the user before invoking the engineering manager:

  - Auto-detect the recommended template based on issue type (from Step 2):
    - Bug → `bug-fix-analysis.md` [Recommended]
    - Story / Task → `spec.md` [Recommended]
  - If `$2` was provided and is a valid template name → skip the prompt, confirm the selection in the output summary, and proceed
  - If `$2` was provided but is not a valid template name → show an error ("Unknown template: {$2}"), then fall through to the prompt below
  - If no `$2` was provided → display the following prompt and **wait for explicit user input** before proceeding:

```
Select template for {type} Issue #{number}:

  1. spec.md                 — Implementation specification  [Recommended for Story/Task]
  2. bug-fix-analysis.md     — Root cause analysis  [Recommended for Bug]
  3. tech-design.md          — Technical design
  4. todo.md                 — Task breakdown
  5. ref-code.md             — Reference code samples

Your choice (or press Enter for Recommended):
```

  - Accept a number (1–5) or pressing Enter (selects the Recommended template for the detected issue type)
  - Do **not** proceed until the user has made a selection

- Use Task tool to invoke engineering manager
- **BUG FLOW**: Delegate capability: "Create initial root cause analysis for bug"
  - Pass: issue details, analysis template (user-selected from prompt), **absolute worktree path** from Step 3
- **STORY/TASK FLOW**: Delegate capability: "Create initial implementation analysis"
  - Pass: issue details, analysis template (user-selected from prompt), **absolute worktree path** from Step 3
- Expected output:
  - `<absolute-worktree-path>/${config.specs.base-path}${config.specs.naming}/analysis.md`
- Agent builds own context for their needs
- Analysis scope: Problem identification and implementation scope (NOT detailed implementation planning)

**CRITICAL — Write Location Verification**:
- The engineering-manager agent MUST write `analysis.md` using the **absolute worktree path**, not a relative path
- Pass the absolute worktree path explicitly: `<absolute-worktree-path>/${config.specs.base-path}${config.specs.naming}/analysis.md`
- After the agent completes, **verify** the file exists at the correct worktree location
- If the file was written to the main repo instead of the worktree, move it to the correct location and warn the user

### 4b. Initialize decisions.md
Create the decisions file for tracking question resolutions across all planning phases.

- Create `<absolute-worktree-path>/${config.specs.base-path}${config.specs.naming}/decisions.md` using the initialization template from `${config.memory.practices.implementation.decision-tracking}`
- Include the issue number and title in the file header
- Create all three phase section stubs (Phase 2, Phase 3, Phase 4) even if no questions exist for Phase 2
- This file is separate from evidence.md and will be appended to in subsequent phases

### 4c. Resolve Open Questions
Run the standard interview loop on the generated analysis.md.

- Follow the interview loop behavior at `${config.behaviors.implementation.interview-loop}`
- Input: The structured question list returned by the engineering manager agent alongside analysis.md
- Target artifact: analysis.md
- Target decisions file: decisions.md (Phase 2 section)
- If agent returned no question list → skip loop, proceed to Step 5
- If questions exist → present one by one, record decisions, update analysis.md inline, append to decisions.md
- After loop completes → proceed to Step 5 (Request Validation)

### 5. Request Validation
Present initial analysis to user for approval.

- Display `analysis.md` contents to user
- Request explicit decision before proceeding
- Provide clear instructions:
  - **Approve** - Analysis becomes FROZEN source of truth, proceed to reporting
  - **Revise** - Make changes to analysis based on feedback
  - **Stop** - Terminate workflow and provide cleanup instructions
- **MUST** wait for user approval before proceeding

### 6. Handle User Decision

**On Approve**:
- **IMMEDIATELY** edit `analysis.md` to change `**Status**:` field to `**Status**: ❄️ Frozen (Source of Truth)` — this is a **FILE WRITE**, not a verbal acknowledgment
- Verify the status field was updated by reading the file back
- **FREEZE** `analysis.md` as source of truth ❄️
- Proceed to Step 7 (Report Results)

**On Revise**:
- Collect user feedback on analysis
- Reinvoke engineering manager with revision requirements
- Re-present analysis for approval
- Loop until approved or stopped

**On Stop**:
- Execute cleanup procedure (see Step 8)
- Terminate workflow

### 7. Report Results
Display completion status to user.

**On Success**:
- Show worktree path (absolute, as resolved in Step 3): `<absolute-base-path>/${config.worktree.naming}`
- Show branch name: `{type}/{number}-{issue-title-slug}`
- Show analysis location: `${config.specs.base-path}${config.specs.naming}/analysis.md`
- Show decisions log: `${config.specs.base-path}${config.specs.naming}/decisions.md`
- Confirm `analysis.md` is ❄️ FROZEN as source of truth
- Next steps: Run `/impl:prepare` for Phase 3 (Detailed Analysis)

**On Failure**:
- Show error details with context
- Provide resolution guidance
- Execute cleanup if needed (see Step 8)

### 8. Cleanup Procedure
Handle environment cleanup when stopping or on failure.

**Cleanup Commands**:
1. Change to repository root: `cd <repo-root>`
2. Remove worktree: `git worktree remove ${config.worktree.base-path}${config.worktree.naming}`
3. Delete local branch: `git branch -D <branch-name>`
4. Delete remote branch (if pushed): `git push origin --delete <branch-name>`
5. Remove specs directory: `rm -rf <absolute-worktree-path>/${config.specs.base-path}${config.specs.naming}`

**Cleanup Summary**:
- List what was cleaned up
- Confirm environment is restored
- Provide summary of completed work before cleanup

## Frozen Artifacts After This Phase

- ❄️ `analysis.md` - Initial root cause analysis (frozen after approval)

**Next Phase**: Run `/impl:prepare` for Phase 3 (Detailed Analysis)

## Error Scenarios

**Issue Not Found**:
- Verify issue identifier is correct and matches the expected format for the resolved PM platform
- Check network connectivity to the configured PM platform
- Verify PM platform authentication via the resolved platform's authentication memory

**Worktree Already Exists**:
- Check existing worktrees: `git worktree list`
- Remove existing worktree if safe: `git worktree remove <path>`
- Or use existing worktree and skip to analysis creation

**Branch Already Exists**:
- Check local branches: `git branch -a`
- Delete if safe: `git branch -D <branch-name>`
- Or checkout existing branch and skip worktree creation

**Issue Closed/Invalid State**:
- Confirm with user if they want to proceed
- If yes, continue workflow
- If no, abort without creating worktree

**Agent Not Found**:
- Verify required agents are available in the system
- Check agent configuration and naming
- Provide details about missing agent for debugging

## See Also

- **Philosophy**:
  - `docs/philosophy/components/commands.md` - Command orchestration principles
  - `docs/philosophy/design-principles.md` - Separation of concerns

- **Agents** (invoked by this command):
  - Project management steward - Issue retrieval operations
  - Repository operations steward - Worktree and branch management
  - Engineering manager - Analysis creation

- **Templates** (accessed by agents):
  - Bug fix analysis template
  - All available analysis templates

- **Related Commands**:
  - `/impl:prepare` - Phase 3: Creates spec.md (frozen) and Level 1 todo.md
  - `/impl:design` - Phase 4: Creates tech-design.md (frozen) and detailed todo.md
  - `/impl:eval` - Phase 5: Creates eval-criteria.md (frozen) and Playwright test files
  - `/impl:code` - Phase 6: Implementation workflow
  - `/impl:validate` - Phase 7: Execute evals and validate against specs
  - `/impl:commit` - Phase 8: Create conventional commits

---

**Version**: 1.1.0
**Last Updated**: 2026-05-12
**Status**: Active
