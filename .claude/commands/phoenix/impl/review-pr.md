---
name: phoenix:impl:review-pr
description: Review pull/merge request with comprehensive analysis
argument-hint: "[pr-number]"
---

## Role
You are a workflow orchestrator responsible for conducting thorough MR/PR reviews following Phoenix OS standards. You coordinate worktree setup, code analysis, and review submission. You define WHAT needs to be done, not HOW to do it.

## Inputs
- **$1**: MR/PR number (optional) - If not provided, list open MRs/PRs for selection
- **Example**: `/impl:review-pr 73`
- **Example**: `/impl:review-pr` (lists open MRs/PRs)

## Guidelines

### Orchestration
- You **MUST** create isolated worktree for each review
- You **MUST** consult user for approval/rejection decisions
- You **MUST** use platform operations from memory
- You **MUST** clean up worktrees after completion
- You **MAY** invoke record-issues command for defect creation during review
- You **NEVER** merge MRs/PRs (only approve/reject)
- You **NEVER** hardcode platform-specific commands

### User Interaction
- Present analysis findings for user review
- Request explicit decision before submitting review
- Get user approval for generated review comments
- Use fun cleanup confirmation phrase (10 chars max)

### Review Standards
Apply Phoenix OS standards from memory:
- Architecture patterns from `${config.memory.architecture}`
- Best practices from `${config.memory.best-practices}`
- Tech stack guidelines from `${config.memory.tech-stack}`

## Pre-flight Checks

**Environment Validation**:
1. Verify git repository exists
2. Check for uncommitted changes (warn if present)
3. Verify platform access (CLI authentication)

**Tool Operations**:
1. Load MR/PR operations from memory
2. Load issue operations from memory
3. Load worktree operations from memory

## Steps

### 1. Select MR/PR
Get list of MRs/PRs requiring review.

**If $1 provided:**
- Use provided MR/PR number directly
- Skip to Step 2

**If $1 not provided:**
- List open MRs/PRs that need review
- Exclude: approved, draft, or already in-review
- Show: number, title, author, branch
- Request user selection

**Implementation**: Delegate to platform operations
- Use methods from MR/PR operations memory
- Filter for reviewable items only

**Error Context:**
- What: "Failed to list MRs/PRs"
- Why: "Platform access unavailable or authentication failed"
- Fix: "Check authentication and network connection"
- Alternative: "Provide MR/PR number manually"

### 2. Setup Worktree
Create isolated environment for review.

**Worktree creation:**
- Path: `../review-pr-<number>`
- Branch: MR/PR source branch
- Fetch from origin if needed

**Implementation**: Delegate to worktree operations
- Use methods from worktree operations memory
- Handle existing worktrees appropriately
- Switch to worktree directory

**Error Context:**
- What: "Worktree creation failed"
- Why: "Branch doesn't exist or worktree already exists"
- Fix: "Remove existing worktree or fetch branch"
- Alternative: "Use traditional checkout method"

### 3. Update Issue Status
Mark associated issue as "In Review".

**Implementation**: Delegate to issue operations
- Use methods from issue operations memory
- Find related issue from MR/PR
- Update status to "In Review"
- Add comment about review in progress

**Error Context:**
- What: "Cannot update issue status"
- Why: "Issue not found or no permissions"
- Fix: "Update manually or check permissions"
- Alternative: "Skip status update and continue"

### 4. Analyze Changes
Examine all modifications in the MR/PR.

**Analysis tasks:**
- Get diff statistics and file list
- Show commit history
- Generate 3-line summary per file
- Identify patterns (tests → implementation → refactor)

**Implementation**: Use git operations
- Diff against base branch
- List modified files with status
- Extract commit messages

**Error Context:**
- What: "Cannot analyze changes"
- Why: "Base branch unavailable or diff too large"
- Fix: "Fetch base branch or review specific files"
- Alternative: "Review via web interface"

### 5. Conduct Review
Perform comprehensive code quality analysis.

**Review dimensions:**
- **Code Quality**: Maintainability, readability, design patterns
- **Functionality**: Logic correctness, edge cases, performance
- **Compliance**: Phoenix OS standards, project conventions
- **Security**: Vulnerability checks, sensitive data handling
- **Testing**: Coverage, test quality, TDD compliance
- **Documentation**: Comments, README updates, API docs

**Apply standards from memory:**
- Architecture patterns
- Best practices
- Tech stack guidelines

**Analysis output:**
- Summary of findings
- Specific line references for issues
- Suggested improvements
- Breaking changes or risks

### 6. Make Corrections (Optional)
Apply minor fixes discovered during review.

**Guidelines:**
- Only minor, non-controversial fixes
- Clear commit messages
- Document all changes

**Note:** Larger changes should be requested from author

**Error Context:**
- What: "Cannot commit changes"
- Why: "No write access to branch"
- Fix: "Request changes from author"
- Alternative: "Provide detailed fix instructions"

### 7. Final Verdict
Provide review decision with user consultation.

**Process:**
1. **Present findings**: Display comprehensive analysis with categorization
   - **Blocking issues**: Must be fixed before merge (bugs, security, breaking changes)
   - **Non-blocking issues**: Should be addressed but don't block merge (style, optimization, documentation)

2. **Get user decision**: APPROVE / APPROVE_WITH_COMMENTS / REQUEST_CHANGES / DISCUSS
   - **APPROVE**: No issues found, approve without comments
   - **APPROVE_WITH_COMMENTS**: Non-blocking issues found, approve but add comments
   - **REQUEST_CHANGES**: Blocking issues found, require fixes before merge
   - **DISCUSS**: Need clarification or architectural discussion

3. **Handle decision path**:

   **If APPROVE:**
   - Generate approval comment (optional, brief)
   - Skip to Step 3.5 (Generate comment)

   **If APPROVE_WITH_COMMENTS:**
   - Show list of non-blocking findings with line references
   - Ask user: "Create defects to track these findings? (yes/no)"

   **If user says YES to defect creation:**
   a. Group findings by logical issue
   b. For each finding group:
      - Auto-generate defect description in format:
        ```
        [Code Review] <Finding Title>

        **Source**: Code review of MR/PR #<number>
        **File**: <file-path>:<line-number>

        **Description**:
        <Detailed finding from review>

        **Recommendation**:
        <Suggested fix>

        **Priority**: Low (non-blocking)
        ```
      - Show preview to user: title + description + suggested assignee (PR author)
      - Ask: "Create this defect? (yes/no/edit/skip)"
      - If YES:
        * Use SlashCommand tool to invoke: `/phoenix:gh:plan:record-issues`
        * Pass: defect description + PR author as assignee
        * Capture defect number/URL from result
      - If NO/SKIP: Continue to next finding
   c. Collect all created defect references

   **If user says NO to defect creation OR after defects created:**
   - Proceed to Step 3.5 (Generate comment)
   - Include defect references in comment if any were created

   **If REQUEST_CHANGES:**
   - Generate comment with blocking issues and line references
   - Skip to Step 3.5 (Generate comment)

   **If DISCUSS:**
   - Generate comment with questions/discussion points
   - Skip to Step 3.5 (Generate comment)

3.5. **Generate comment**: Based on decision and findings
   - Use appropriate template for decision type
   - Include defect references if created (APPROVE_WITH_COMMENTS path)

4. **Get comment approval**: USE AS IS / MODIFY / SIMPLIFY

5. **Submit review**: Using platform operations
   - APPROVE → Status: APPROVED
   - APPROVE_WITH_COMMENTS → Status: APPROVED (with comment)
   - REQUEST_CHANGES → Status: CHANGES_REQUESTED
   - DISCUSS → Status: COMMENT

**Review comment template:**
```markdown
## Review Summary
**Decision**: [APPROVED / APPROVED_WITH_COMMENTS / CHANGES_REQUESTED / COMMENT]

### Findings
[Summary of analysis with specific line references]

### Recommendations
[Actionable feedback]

### Related Defects (if APPROVE_WITH_COMMENTS and defects created)
Non-blocking issues have been tracked in the following defects:
- #<defect-number> - [Defect title]: Brief description ([file:line])
- #<defect-number> - [Defect title]: Brief description ([file:line])

**Note**: These issues don't block the merge but should be addressed in future work.

### Quality Assessment
- Code Quality: [rating/notes]
- Test Coverage: [rating/notes]
- Compliance: [rating/notes]

### Next Steps
[For APPROVE_WITH_COMMENTS: Mention PR can merge, defects tracked for follow-up]
[For REQUEST_CHANGES: List required fixes before merge]
[For DISCUSS: List questions/clarifications needed]
```

**Implementation**: Delegate to MR/PR operations
- Use methods from MR/PR operations memory
- Submit approval or request changes
- Add notification comment to author
- Update related issue if applicable

**Error Context:**
- What: "Review submission failed"
- Why: "No permissions or API error"
- Fix: "Check repository permissions"
- Alternative: "Post review as comment"

### 8. Cleanup
Remove temporary worktree and return to main branch.

**Cleanup checklist:**
1. Display summary of review actions
2. Request fun confirmation (10 chars max, e.g., "Cayde-6")
3. Execute cleanup commands

**Implementation**: Delegate to worktree operations
- Return to main repository directory
- Remove review worktree
- Verify cleanup success

**Error Context:**
- What: "Cleanup failed"
- Why: "Uncommitted changes in worktree"
- Fix: "Commit or stash changes first"
- Alternative: "Manual cleanup if needed"

## Error Handling

### Authentication Failures
```
Error: Platform authentication required
```
**Resolution:** Authenticate using platform-specific method (see tool operations)

### MR/PR Not Found
```
Error: MR/PR #<number> not found
```
**Resolution:** Verify number is correct and MR/PR exists

### Worktree Already Exists
```
Error: Worktree path already exists
```
**Resolution:** Remove existing worktree: `git worktree remove ../review-pr-<number>`

### No Write Access
```
Error: Cannot push changes to branch
```
**Resolution:** Request changes from author instead of making fixes

### Issue Not Found
```
Error: Cannot find related issue
```
**Resolution:** Skip issue status update and continue with review

## Review Output Template

```markdown
## MR/PR #<number> Review

**Title**: <title>
**Author**: @<author>
**Branch**: <source> → <target>
**Status**: [APPROVED / APPROVED_WITH_COMMENTS / CHANGES_REQUESTED / COMMENT]

### Changes Overview
- **<file-1>**: <3-line-summary>
- **<file-2>**: <3-line-summary>

### Review Findings
<detailed-analysis-with-line-refs>

### Recommendation
<verdict-with-rationale>

### Related Defects (if applicable)
- #<defect-number> - <defect-title>

### Next Steps
<actionable-items-for-author>
```

## Quality Checklist

Before submitting review, verify:
- [ ] All files analyzed
- [ ] Phoenix OS standards applied
- [ ] Specific line references provided
- [ ] Constructive feedback given
- [ ] Breaking changes identified
- [ ] Test coverage assessed
- [ ] User approved review decision

## See Also

- **Memory** (used by this command):
  - MR/PR operations via `${config.memory.tools}`
  - Issue operations via `${config.memory.tools}`
  - Worktree operations via `${config.memory.tools.git.worktree-operations}`
  - Architecture standards via `${config.memory.architecture}`
  - Best practices via `${config.memory.best-practices}`
  - Tech stack guidelines via `${config.memory.tech-stack}`

- **Related Commands**:
  - `/impl:start-work` - Phase 2: Initialize issue workflow
  - `/impl:prepare` - Phase 3: Create spec.md and Level 1 todo.md
  - `/impl:design` - Phase 4: Create tech-design.md and detailed todo.md
  - `/impl:eval` - Phase 5: Create eval-criteria.md and Playwright test files
  - `/impl:code` - Phase 6: Implementation workflow
  - `/impl:validate` - Phase 7: Execute evals and validate against specs
  - `/impl:commit` - Phase 8: Create conventional commits
  - `/impl:create-pr` - Phase 9: Create MR/PR after implementation
  - `/impl:merge-pr` - Phase 11: Merge approved MR/PR and cleanup
  - `/plan:record-issues` - Create defects for non-blocking review findings

---

**Version**: 2.0.0
**Last Updated**: 2025-10-15
**Status**: Active
**Changelog**: Added APPROVE_WITH_COMMENTS decision with optional defect creation via record-issues integration
