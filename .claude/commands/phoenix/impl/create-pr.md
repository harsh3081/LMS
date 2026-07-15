---
name: phoenix:impl:create-pr
description: Create pull/merge request after issue implementation is complete
argument-hint: "[target-branch]"
---

## Role
You are a workflow orchestrator responsible for creating pull/merge requests following Phoenix OS standards. You analyze commits and issue details to generate comprehensive descriptions. You define WHAT needs to be done, not HOW to do it.

## Inputs
- **Working Directory**: Issue worktree from Phase 2 (`/impl:start-work`)
- **Branch**: Current branch must follow naming convention
- **$1**: Target branch (optional) - defaults to "main"
- **Example**: `/impl:create-pr`
- **Example**: `/impl:create-pr develop`
- **Example**: `/impl:create-pr main`

## Guidelines

### Orchestration
- You **MUST** validate prerequisites before proceeding
- You **MUST** request user approval for generated content
- You **MUST** use platform operations from memory (`${config.memory.tools}`)
- You **NEVER** hardcode platform-specific commands
- You **NEVER** create PR/MR without clean working tree

### User Interaction
- Present MR/PR description for review
- Request explicit approval before creating
- Provide clear instructions for **Approve**, **Revise**, or **Stop** decisions
- Show MR/PR URL after successful creation

## Pre-flight Checks

**Environment Validation**:
1. Verify current directory is a git repository
2. Verify working tree is clean (no uncommitted changes)
3. Verify branch follows naming convention
4. Extract issue identifier from branch name (see Step 1)
5. Determine target branch from $1 or default to "main"
6. Verify target branch exists (locally or remotely)
7. Verify commits exist on current branch

**Tool Operations**:
1. Resolve the PM platform per `${config.memory.tools.platform-detection}`
2. Load PM platform's issue operations from memory
3. Load code platform's PR/MR operations from memory (`${config.memory.tools.{platform}.pr-operations}`)

## Steps

### 1. Validate Environment
Execute pre-flight checks and extract issue information.

- Verify git repository exists
- Check working tree is clean (no uncommitted changes)
- Get current branch name (source branch)
- **Extract the issue identifier from the branch name** using the generic form `{type}/{number}-{slug}`.
  Parse the leading integer after the `{type}/` segment.
  If extraction fails, STOP with a clear error message.
- **Validate the recovered issue number** is a positive integer. If invalid, prompt user to re-enter.
- Determine target branch from $1 or default to "main"
- Verify target branch exists: `git rev-parse --verify <target-branch>` or `git ls-remote --heads origin <target-branch>`
- **STOP** if validation fails with clear error message
- **STOP** if issue identifier cannot be extracted
- **STOP** if target branch does not exist

### 2. Fetch Issue Details
Retrieve comprehensive issue information using PM platform's operations.

**Implementation**: Delegate to resolved PM platform operations
- Use methods from PM platform's issue operations memory (loaded via `${config.memory.tools.platform-detection}`)
- Extract: title, description, labels, assignees, milestone

**Expected data:**
- Issue identifier and title
- Issue description
- Current state
- Labels and assignees

**Error Context:**
- What: "Cannot fetch issue details"
- Why: "Issue not found or PM platform access unavailable"
- Fix: "Verify issue identifier and authentication"
- Alternative: "Provide issue information manually"

### 3. Analyze Commits
Understand all changes included in the MR/PR.

**Get commit list and changes:**
- List commits on current branch since divergence from target branch
- Compare against target: `git log <target-branch>..HEAD`
- Get diff statistics: `git diff <target-branch>...HEAD --stat`
- Get file changes with modification status

**Analysis requirements:**
- Group files by logical component/feature
- Identify commit patterns (RED → GREEN → REFACTOR)
- Summarize overall purpose of changes
- Note any breaking changes or migrations

### 4. Generate Description
Create comprehensive MR/PR description following template.

**Format:**
```markdown
## Summary
- Link the issue per the 'Issue Linkage in Pull / Merge Requests' rule in `${config.memory.tools.platform-detection}`.

<2-3 sentence overview of changes>

## Changes
### <Component/Feature 1>
- <file-1>: <reason for change>
- <file-2>: <reason for change>

### <Component/Feature 2>
- <file-3>: <reason for change>

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests pass
- [ ] Manual testing completed

## Quality Gates
- [ ] Linting passes
- [ ] Type checking passes
- [ ] Test coverage maintained

## Notes
<Any additional context, breaking changes, or deployment notes>
```

**Guidelines:**
- Group files logically by component/feature
- Explain WHY each file changed, not just WHAT changed
- Keep explanations concise (1 line per file group)
- Link issue per the 'Issue Linkage in Pull / Merge Requests' rule in `${config.memory.tools.platform-detection}`.

### 5. Present for Review
Show MR/PR details to user for approval.

**Display:**
- Issue identifier and title
- Target branch (from $1 or default: main)
- Source branch (current branch)
- Commits to be included: `<source> → <target>`
- Complete MR/PR description
- File change summary

**Request explicit decision:**
- **Approve**: Create MR/PR and push to origin
- **Revise**: Modify description based on feedback
- **Stop**: Cancel creation

**MUST** wait for user approval before proceeding.

### 6. Handle User Decision

**On Approve:**
- Push current branch to origin (if not already pushed)
- Create merge/pull request
- Show URL
- Proceed to Step 7

**On Revise:**
- Collect user feedback on description
- Regenerate description based on feedback
- Re-present for approval
- Loop until approved or stopped

**On Stop:**
- Confirm cancellation
- Provide next steps if user wants to continue later

### 7. Create Merge/Pull Request
Execute creation using code platform's PR operations from memory.

**Implementation**: Delegate to code platform-specific operations
- Use methods from code platform's PR/MR operations memory:
  `${config.memory.tools.{platform}.pr-operations}` resolved from `platform` via
  `${config.memory.tools.platform-detection}` (PR ops are code platform's operations)
- Specify title, description
- Specify target branch (from $1 or "main")
- Specify source branch (current branch)
- Configure options (remove source branch, assign reviewers, etc.)

**Capture MR/PR number and URL from output.**

**Error Context:**
- What: "MR/PR creation failed"
- Why: "Branch not pushed or code platform permissions issue"
- Fix: "Push branch manually or check repository access"
- Alternative: "Create via web interface"

### 8. Update Issue Status
Move issue to "In Review" status.

**Implementation**: Delegate to PM platform's operations
- Use methods from PM platform's issue operations memory
  (loaded via `${config.memory.tools.platform-detection}`)
- Update issue labels/status to "In Review"
- Add comment linking to MR/PR
- Notify assignees if configured

**Error Context:**
- What: "Cannot update issue status"
- Why: "Label doesn't exist or no permissions"
- Fix: "Update status manually in web interface"
- Alternative: "Skip status update and notify team"

### 9. Report Completion
Display creation summary.

**Success Summary:**
- ✅ MR/PR created: `<url>`
- ✅ Number: `<number>`
- ✅ Issue linked: `{issue-identifier}`
- ✅ Status updated: "In Review"
- ✅ Branch pushed: `<branch-name>`

**Next Steps:**
- MR/PR is ready for review: Run `/impl:review-pr` or notify reviewers
- Address any review feedback if requested
- Monitor CI/CD pipeline status
- After approval, run `/impl:merge-pr` to merge and cleanup

## Error Handling

### Working Tree Not Clean
```
Error: Uncommitted changes detected
```
**Resolution:** Commit or stash changes first using `/impl:commit`

### Invalid Branch Name
```
Error: Cannot extract issue identifier from branch
```
**Resolution:** Branch must follow naming convention:
- `<type>/<issue-number>-<description>`

### Target Branch Not Found
```
Error: Target branch '<branch-name>' does not exist
```
**Resolution:** Verify target branch name is correct, or fetch from remote: `git fetch origin <branch-name>`

### Issue Not Found
```
Error: Issue not found
```
**Resolution:** Verify issue exists and is accessible in the configured PM platform

### No Commits
```
Error: No commits found since target branch
```
**Resolution:** Ensure changes have been committed to current branch

### Authentication Failed
```
Error: Platform authentication required
```
**Resolution:** Authenticate using platform-specific method (see tool operations in memory)

### MR/PR Already Exists
```
Error: MR/PR already exists for this branch
```
**Resolution:** Update existing or close it before creating new one

## Quality Checklist

Before creating MR/PR, verify:
- [ ] All changes committed
- [ ] Working tree clean
- [ ] Branch follows naming convention
- [ ] Tests pass locally
- [ ] Linting passes
- [ ] Description is comprehensive
- [ ] Issue linked per 'Issue Linkage' rule in platform-detection

## See Also

- **Memory** (platform operations loaded from config):
  - PM platform's issue operations via `${config.memory.tools.platform-detection}`
  - Code platform's PR/MR operations via `${config.memory.tools.{platform}.pr-operations}` (resolved from `platform`)
  - Commit guidelines via `${config.memory.tools}`

- **Related Commands**:
  - `/impl:start-work` - Phase 2: Initialize issue workflow
  - `/impl:prepare` - Phase 3: Create spec.md and Level 1 todo.md
  - `/impl:design` - Phase 4: Create tech-design.md and detailed todo.md
  - `/impl:eval` - Phase 5: Create eval-criteria.md and Playwright test files
  - `/impl:code` - Phase 6: Implementation workflow
  - `/impl:validate` - Phase 7: Execute evals and validate against specs
  - `/impl:commit` - Phase 8: Create conventional commits
  - `/impl:review-pr` - Phase 10: Review MR/PR
  - `/impl:merge-pr` - Phase 11: Merge approved MR/PR and cleanup

---

**Version**: 2.0.0
**Last Updated**: 2026-06-18
**Status**: Active
**Changelog**: F4 — Add branch→identifier parsing (generic integer form); simplify identifier validation to positive integer; delegate issue linkage to platform-detection rule; route PM operations through platform-detection; use code platform's PR ops
