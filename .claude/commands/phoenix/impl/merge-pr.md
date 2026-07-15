---
name: phoenix:impl:merge-pr
description: Merge approved pull/merge request and perform cleanup
argument-hint: "[mr-number] [strategy]"
---

## Role
You are a workflow orchestrator responsible for merging approved MRs/PRs and performing systematic cleanup following Phoenix OS standards. You coordinate merge execution, branch cleanup, and issue closure. You define WHAT needs to be done, not HOW to do it.

## Inputs
- **$1**: MR/PR number (optional) - If not provided, detect from current branch or prompt user
- **$2**: Merge strategy (optional) - squash|merge|rebase (defaults to "squash")
- **Example**: `/impl:merge-pr`
- **Example**: `/impl:merge-pr 145`
- **Example**: `/impl:merge-pr 145 squash`
- **Example**: `/impl:merge-pr 145 rebase`

## Guidelines

### Orchestration
- You **MUST** validate approval status before merging
- You **MUST** verify CI/CD pipeline status
- You **MUST** check for merge conflicts
- You **MUST** request user confirmation before merge
- You **MUST** use platform operations from memory
- You **NEVER** merge without approval
- You **NEVER** merge with failing CI/CD
- You **NEVER** merge with conflicts
- You **NEVER** hardcode platform-specific commands

### User Interaction
- Present merge plan for approval
- Request explicit confirmation before merging
- Provide clear instructions for **Confirm**, **Abort**, or **Defer** decisions
- Show merge result and cleanup summary

### Safety Checks
Apply multiple validation layers:
- Approval status verification
- CI/CD pipeline status check
- Merge conflict detection
- User permission validation
- Protected branch rules

## Pre-flight Checks

**Environment Validation**:
1. Verify git repository exists
2. Determine MR/PR number from $1, branch name, or user input
3. Verify MR/PR exists and is open
4. Verify user has merge permissions

**Approval & Quality Gates**:
1. Verify MR/PR is approved (not in draft)
2. Verify CI/CD pipeline passed (if configured)
3. Verify no merge conflicts exist
4. Verify all required approvals received

**Tool Operations**:
1. Resolve the PM platform per `${config.memory.tools.platform-detection}`
2. Load code platform's PR/MR operations from memory (`${config.memory.tools.{platform}.pr-operations}`)
3. Load PM platform's issue operations from memory (via `${config.memory.tools.platform-detection}`)
4. Load worktree operations from memory (`${config.memory.tools.git.worktree-operations}`)

## Steps

### 1. Determine MR/PR Number
Identify which MR/PR to merge.

**If $1 provided:**
- Use provided MR/PR number directly
- Skip to Step 2

**If $1 not provided:**
- Check if current branch is linked to an MR/PR
- **Extract the issue identifier from the branch name** using the generic form `{type}/{number}-{slug}`.
  Parse the leading integer after the `{type}/` segment.
  Validate the recovered issue number is a positive integer.
  If extraction fails, STOP and prompt user to provide the MR/PR number directly.
- If still not found, list recent MRs/PRs for user selection and request user input

**Implementation**: Delegate to code platform operations
- Use methods from code platform's PR/MR operations memory
  (`${config.memory.tools.{platform}.pr-operations}` resolved from `platform`)
- Parse branch name for issue identifier
- Query code platform for associated MR/PR

**Error Context:**
- What: "Cannot determine MR/PR to merge"
- Why: "No MR/PR number provided and cannot detect from context"
- Fix: "Provide MR/PR number explicitly"
- Alternative: "List open MRs/PRs and select one"

### 2. Fetch MR/PR Details
Retrieve comprehensive MR/PR information.

**Implementation**: Delegate to code platform operations
- Use methods from code platform's PR/MR operations memory
- Extract: number, title, state, source branch, target branch
- Extract: approval status, CI status, conflict status
- Extract: related issue identifier

**Expected data:**
- MR/PR number and title
- Source branch → Target branch (merge FROM source INTO target)
- Approval status and reviewers
- CI/CD pipeline status
- Merge conflict status
- Related issue identifier

**IMPORTANT**: The target branch is determined by the MR/PR, NOT hardcoded to "main"
- If PR targets "develop", merge goes to "develop"
- If PR targets "main", merge goes to "main"
- If PR targets "feature/parent", merge goes to "feature/parent"

**Error Context:**
- What: "Cannot fetch MR/PR details"
- Why: "MR/PR not found or code platform access unavailable"
- Fix: "Verify MR/PR number and authentication"
- Alternative: "Check MR/PR exists via web interface"

### 3. Validate Merge Readiness
Verify MR/PR meets all requirements for merge.

**Validation checks:**
- **Approval Status**: Must be approved (not draft, not changes-requested)
- **CI/CD Status**: Pipeline must pass (if configured)
- **Conflict Status**: No merge conflicts
- **User Permissions**: User has merge access to target branch
- **Protected Branch**: Target branch rules satisfied

**Implementation**: Delegate to code platform operations
- Check approval status via platform API
- Check pipeline status via platform API
- Check conflict status via platform API
- Verify user permissions

**If any check fails:**
- **STOP** immediately with clear error message
- Display which check failed and why
- Provide resolution steps
- Do NOT proceed to merge

**Error Context:**
- What: "MR/PR not ready to merge"
- Why: "One or more validation checks failed"
- Fix: "Address the specific failure (approval, CI, conflicts, etc.)"
- Alternative: "Defer merge until ready"

### 4. Determine Merge Strategy
Decide how to merge the MR/PR.

**Strategy from $2 or use default:**
- `squash` (default): Squash all commits into one
- `merge`: Create merge commit preserving history
- `rebase`: Rebase and fast-forward

**Implementation**: Use platform-specific merge methods
- Different platforms may have different strategy names
- Map generic strategy to platform-specific option
- Validate strategy is supported by platform

**Error Context:**
- What: "Invalid merge strategy"
- Why: "Strategy not supported by platform or repository"
- Fix: "Use supported strategy: squash, merge, or rebase"
- Alternative: "Use default (squash)"

### 5. Present Merge Plan
Show merge details to user for confirmation.

**Display:**
- MR/PR title and number
- Source branch → Target branch
- Merge strategy to be used
- Approval status (who approved)
- CI/CD pipeline status
- Commits to be merged
- Related issue identifier and how the merge will handle issue linkage (per 'Issue Linkage in Pull / Merge Requests' rule in `${config.memory.tools.platform-detection}`)

**Request explicit decision:**
- **Confirm**: Proceed with merge
- **Abort**: Cancel merge operation
- **Defer**: Exit without merging (come back later)

**MUST** wait for user confirmation before proceeding.

### 6. Handle User Decision

**On Confirm:**
- Proceed to Step 7 (Execute Merge)

**On Abort:**
- Cancel operation
- Provide reason for cancellation
- Exit cleanly

**On Defer:**
- Exit without changes
- MR/PR remains open
- Provide instructions to resume later

### 7. Execute Merge
Perform the actual merge operation.

**Implementation**: Delegate to code platform operations
- Use methods from code platform's PR/MR operations memory
- Execute merge with specified strategy
- Wait for merge completion
- Capture merge result (success, commit SHA, etc.)

**Merge operation:**
```
Code Platform CLI/API:
- Merge MR/PR with strategy
- Optionally remove source branch
- Update MR/PR status to merged
```

**Error Context:**
- What: "Merge operation failed"
- Why: "Platform API error or permission denied"
- Fix: "Check permissions or retry"
- Alternative: "Merge via web interface"

### 8. Update Issue Status

**Issue linkage**: Handle issue closure per the 'Issue Linkage in Pull / Merge Requests' rule in `${config.memory.tools.platform-detection}`.

- When the PM platform matches the code platform, the merged PR/MR's native auto-close keyword resolves the issue.
- When the PM platform differs from the code platform (e.g. `pm-platform: jira` with code on GitLab), there is no native auto-close. You **MUST** post the linking comment on the PM issue (merged PR/MR URL plus ticket reference) and transition/close it per the resolved PM platform's issue operations memory, exactly as the linkage rule prescribes.

**Implementation**: Delegate to PM platform's issue operations memory (loaded via `${config.memory.tools.platform-detection}`)
- Find related issue from MR/PR
- Confirm issue status and add comment linking to merged MR/PR (required on the cross-platform path)

**Error Context:**
- What: "Cannot confirm issue closure"
- Why: "Issue not found or no permissions"
- Fix: "Verify issue closure manually"
- Alternative: "Skip issue update and continue"

### 9. Cleanup Branches and Worktrees
Remove temporary branches and worktrees systematically.

**Cleanup tasks:**
1. Delete remote source branch (if not already removed)
2. Delete local source branch (if exists)
3. Remove associated worktree (if exists)
4. Return to target branch (the branch PR was merged INTO)
5. Pull latest changes from origin for target branch

**Implementation**: Delegate to platform and git operations
- Use methods from code platform's PR/MR operations for remote cleanup
- Use methods from `${config.memory.tools.git.worktree-operations}` for local cleanup

**Error Context:**
- What: "Cleanup failed"
- Why: "Branch protected or worktree in use"
- Fix: "Manual cleanup required"
- Alternative: "Skip cleanup and warn user"

### 10. Report Completion
Display merge success summary.

**Success Summary:**
- ✅ MR/PR merged: `<url>`
- ✅ Merge strategy used: `<strategy>`
- ✅ Merge commit: `<commit-sha>`
- ✅ Issue {identifier}: closed or referenced per issue linkage rule
- ✅ Branch deleted: `<source-branch>`
- ✅ Worktree removed: `<worktree-path>` (if applicable)
- ✅ Current branch: `<target-branch>`

**Next Steps:**
- Work is complete for this issue
- Branch and worktree cleaned up
- Can start new work with `/impl:start-work`

## Error Handling

### MR/PR Not Found
```
Error: MR/PR #<number> not found
```
**Resolution:** Verify MR/PR number is correct and exists

### Not Approved
```
Error: MR/PR #<number> is not approved
```
**Resolution:** Request approval from reviewers first

### CI/CD Failed
```
Error: CI/CD pipeline failed for MR/PR #<number>
```
**Resolution:** Fix pipeline failures, push fixes, wait for green status

### Merge Conflicts
```
Error: MR/PR #<number> has merge conflicts
```
**Resolution:** Resolve conflicts locally, push resolution, then merge

### No Merge Permission
```
Error: User does not have permission to merge to <target-branch>
```
**Resolution:** Request merge from maintainer or get permissions

### Protected Branch Rules
```
Error: Target branch <branch> has protection rules not satisfied
```
**Resolution:** Satisfy all protection rules (approvals, checks, etc.)

### Branch Already Merged
```
Error: MR/PR #<number> is already merged
```
**Resolution:** Verify MR/PR status, skip if already complete

## Quality Checklist

Before merging, verify:
- [ ] MR/PR is approved by required reviewers
- [ ] CI/CD pipeline passed
- [ ] No merge conflicts
- [ ] User has merge permissions
- [ ] Protected branch rules satisfied
- [ ] Issue linkage handled per 'Issue Linkage' rule in platform-detection
- [ ] Source branch will be deleted

## Safety Features

### Multiple Confirmation Points
1. Pre-flight validation (stops if checks fail)
2. User confirmation (explicit approval required)
3. Platform validation (API checks before merge)

### Rollback Considerations
- Merge commits can be reverted if needed
- Source branch deleted only AFTER successful merge
- Issue closure (if applicable) can be reversed if needed

### Audit Trail
- All operations logged to platform
- Merge commit SHA captured
- Issue closure recorded (if applicable)

## Merge Strategy Guide

### Squash (Default, Recommended)
**When to use:**
- Feature branches with many small commits
- Want clean, linear history
- Single logical change

**Result:** One commit on target branch

### Merge Commit
**When to use:**
- Want to preserve full commit history
- Multiple contributors on branch
- Branch represents significant feature

**Result:** Merge commit + all individual commits

### Rebase
**When to use:**
- Linear history required
- No merge commits allowed
- Fast-forward preferred

**Result:** Commits replayed on target branch

## See Also

- **Memory** (used by this command):
  - Code platform's PR/MR operations via `${config.memory.tools.{platform}.pr-operations}` (resolved from `platform`)
  - PM platform's issue operations via `${config.memory.tools.platform-detection}`
  - Worktree operations via `${config.memory.tools.git.worktree-operations}`

- **Related Commands**:
  - `/impl:start-work` - Phase 2: Initialize issue workflow (start new work after merge)
  - `/impl:prepare` - Phase 3: Create spec.md and Level 1 todo.md
  - `/impl:design` - Phase 4: Create tech-design.md and detailed todo.md
  - `/impl:eval` - Phase 5: Create eval-criteria.md and Playwright test files
  - `/impl:code` - Phase 6: Implementation workflow
  - `/impl:validate` - Phase 7: Execute evals and validate against specs
  - `/impl:commit` - Phase 8: Create conventional commits
  - `/impl:create-pr` - Phase 9: Create MR/PR after implementation
  - `/impl:review-pr` - Phase 10: Review and approve MR/PR

---

**Version**: 2.0.0
**Last Updated**: 2026-06-18
**Status**: Active
**Changelog**: F4 — Add branch→identifier parsing (generic integer form); simplify identifier validation to positive integer; delegate issue linkage to platform-detection rule; route PM operations through platform-detection; use code platform's PR ops; git.worktree-operations intentionally left (non-PM key)
