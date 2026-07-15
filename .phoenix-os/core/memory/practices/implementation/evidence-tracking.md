# Evidence Tracking for Implementation

Evidence tracking documents implementation progress, validation results, and quality metrics during Phase 6 (Implementation/Code-Away).

## Evidence Document Structure

The `evidence.md` file serves as the single source of truth for implementation progress and validation.

### File Location
`${config.specs.base-path}${config.specs.naming}/evidence.md`

### Document Sections

#### 1. Implementation Summary
High-level overview of implementation progress.

```markdown
# Implementation Evidence

**Issue**: #{issue-number}
**Branch**: {branch-name}
**Started**: {timestamp}
**Completed**: {timestamp or "In Progress"}
**Status**: {Completed/Partial/In Progress}

## Summary
Brief description of what was implemented.

**Total Tasks**: {total-count}
**Completed Tasks**: {completed-count}
**Skipped Tasks**: {skipped-count}
**Time Estimate**: {estimated-hours}h
**Time Actual**: {actual-hours}h
```

#### 2. Task Progress
Detailed task-by-task progress tracking.

```markdown
## Task Progress

### Level 1: {Step Name}
**Status**: {Completed/In Progress/Pending}
**Started**: {timestamp}
**Completed**: {timestamp}

#### Level 2 Tasks:
- [x] Task 2.1: {task-description} - Completed at {timestamp}
- [x] Task 2.2: {task-description} - Completed at {timestamp}
- [~] Task 2.3: {task-description} - In Progress
- [ ] Task 2.4: {task-description} - Pending
- [-] Task 2.5: {task-description} - Skipped (Reason: {reason})
```

#### 3. Quality Gate Results
Results from each quality gate execution.

```markdown
## Quality Gate Results

### {Gate Type}: {Gate Name}
**Timestamp**: {timestamp}
**Status**: {✅ Passed / ❌ Failed}
**Duration**: {duration}

#### Compilation
**Command**: `{compilation-command}`
**Result**: {Success/Failed}
**Output**:
```
{output-summary}
```

#### Tests
**Command**: `{test-command}`
**Result**: {X/Y tests passed}
**Coverage**: {percentage}%
**Output**:
```
{test-output-summary}
```

#### Linting
**Command**: `{lint-command}`
**Result**: {No issues / X issues found}
**Output**:
```
{linting-output-summary}
```

#### Build
**Command**: `{build-command}`
**Result**: {Success/Failed}
**Output**:
```
{build-output-summary}
```

#### Runtime Validation
**Command**: `{runtime-command}`
**Result**: {Success/Failed}
**Server Status**: {Running/Failed}
**Health Checks**: {Passed/Failed}
**Output**:
```
{runtime-output-summary}
```
```

#### 4. Code Changes
Summary of files modified, added, or deleted.

```markdown
## Code Changes

**Total Files Changed**: {count}
**Files Added**: {count}
**Files Modified**: {count}
**Files Deleted**: {count}

### Files Modified
- `{file-path}` - {description}
- `{file-path}` - {description}

### Files Added
- `{file-path}` - {description}
- `{file-path}` - {description}

### Files Deleted
- `{file-path}` - {reason}
```

#### 5. Test Coverage
Detailed test coverage metrics.

```markdown
## Test Coverage

**Overall Coverage**: {percentage}%
**Line Coverage**: {percentage}%
**Branch Coverage**: {percentage}%
**Function Coverage**: {percentage}%

### Coverage by Component
- `{component-name}`: {percentage}%
- `{component-name}`: {percentage}%

### Tests Added/Updated
**Unit Tests**: {count}
**Integration Tests**: {count}
**Test Files Created**: {count}
**Test Files Modified**: {count}

### Test Details
- `{test-file}`: {test-count} tests
  - {test-name} - {status}
  - {test-name} - {status}
```

#### 6. Issues and Resolutions
Problems encountered and how they were resolved.

```markdown
## Issues and Resolutions

### Issue #{number}: {Title}
**Type**: {Test Failure/Build Error/Linting Issue/Runtime Error}
**Severity**: {High/Medium/Low}
**Encountered**: {timestamp}
**Resolved**: {timestamp}

**Description**:
{detailed-description}

**Error Output**:
```
{error-output}
```

**Root Cause**:
{root-cause-analysis}

**Resolution**:
{how-it-was-fixed}

**Prevention**:
{how-to-prevent-in-future}
```

#### 7. Commits
List of commits created during implementation.

```markdown
## Commits

**Total Commits**: {count}

### Commit History
1. `{commit-hash}` - {commit-message}
   - **Timestamp**: {timestamp}
   - **Files Changed**: {count}
   - **Lines Added**: {count}
   - **Lines Deleted**: {count}

2. `{commit-hash}` - {commit-message}
   - **Timestamp**: {timestamp}
   - **Files Changed**: {count}
   - **Lines Added**: {count}
   - **Lines Deleted**: {count}
```

#### 8. TDD Compliance
Evidence of TDD methodology adherence.

```markdown
## TDD Compliance

**TDD Methodology**: {Inside-Out/Story-Level}

### DESIGN Phase Evidence
- Interfaces defined: {count}
- DTOs created: {count}
- Method stubs created: {count}
- Compilation verification: {✅ Passed}

### RED Phase Evidence
- Tests written: {count}
- Initial test failures: {✅ All failed meaningfully}
- Test compilation: {✅ All compiled}

### GREEN Phase Evidence
- Implementations completed: {count}
- Tests passing: {X/Y}
- Minimal implementation: {✅ Verified}

### EXPAND Phase Evidence (if Inside-Out)
- Layers built: {list-of-layers}
- Integration tests added: {count}
- Layer integration verified: {✅ Passed}

### TDD Metrics
- Test-to-Implementation Ratio: {ratio}
- Test Lines vs Implementation Lines: {ratio}
- Test Coverage: {percentage}%
- Public Methods with Tests: {percentage}%
```

#### 9. Blockers and Incomplete Work
Items that blocked progress or remain incomplete.

```markdown
## Blockers

### Blocker #{number}: {Title}
**Status**: {Resolved/Unresolved}
**Impact**: {High/Medium/Low}

**Description**:
{detailed-description}

**Resolution** (if resolved):
{how-it-was-resolved}

**Workaround** (if unresolved):
{temporary-workaround}

## Incomplete Work

### Task: {task-description}
**Reason**: {why-incomplete}
**Estimated Effort**: {hours}
**Dependencies**: {dependencies}
**Next Steps**: {what-needs-to-be-done}
```

#### 10. Performance Metrics
Build time, test execution time, and other metrics.

```markdown
## Performance Metrics

**Total Implementation Time**: {hours}h
**Average Task Time**: {minutes}m
**Build Time**: {seconds}s
**Test Execution Time**: {seconds}s
**Linting Time**: {seconds}s

### Time by Activity
- DESIGN Phase: {time}
- RED Phase: {time}
- GREEN Phase: {time}
- EXPAND Phase: {time}
- Refactoring: {time}
- Debugging: {time}
```

#### 11. Next Steps
Actions required after implementation.

```markdown
## Next Steps

1. **Code Review**
   - Create pull request
   - Assign reviewers
   - Address review comments

2. **Documentation**
   - Update API documentation (if applicable)
   - Update user documentation (if applicable)
   - Update README (if needed)

3. **Deployment**
   - Verify CI/CD pipeline passes
   - Deploy to staging environment
   - Perform smoke tests
   - Deploy to production

4. **Follow-up Issues**
   - Issue #{number}: {description}
   - Issue #{number}: {description}
```

## Evidence Update Guidelines

### When to Update Evidence

**Continuously during implementation**:
- After completing each task
- After each quality gate execution
- When encountering issues
- When resolving issues
- After each commit

**At major milestones**:
- After completing Level 1 step
- After integration quality gates
- After final quality gate

### Update Frequency

**High-frequency updates** (every task):
- Task progress tracking
- Quality gate results
- Code changes

**Medium-frequency updates** (every Level 1 step):
- Test coverage metrics
- Commit summaries
- TDD compliance evidence

**Low-frequency updates** (at completion):
- Implementation summary
- Performance metrics
- Next steps

### Evidence Quality Standards

**Complete**: All sections filled with relevant information
**Accurate**: Information matches actual implementation
**Timely**: Updated in real-time or near real-time
**Detailed**: Sufficient detail for audit and review
**Traceable**: Clear link between tasks, commits, and evidence

## Evidence Review

### Self-Review Checklist
- [ ] All completed tasks documented
- [ ] All quality gates documented with results
- [ ] All code changes listed
- [ ] Test coverage meets threshold
- [ ] All commits listed with messages
- [ ] TDD compliance evidenced
- [ ] Issues and resolutions documented
- [ ] Blockers clearly identified
- [ ] Next steps clearly defined

### Peer Review Checklist
- [ ] Evidence matches code changes
- [ ] Quality gates executed correctly
- [ ] TDD methodology followed
- [ ] Test coverage sufficient
- [ ] Issues properly resolved
- [ ] No undocumented workarounds
- [ ] Next steps actionable

## Artifact Question Decisions (decisions.md)

**Purpose**: `decisions.md` is a separate companion file that captures question decisions from Phases 2, 3, and 4. It is NOT part of evidence.md.

**Location**: `${config.specs.base-path}${config.specs.naming}/decisions.md` (parallel to evidence.md in the same specs folder)

**Which phases write to it**: The three planning phases (Phases 2, 3, and 4).

**When initialized**: Eagerly during the first planning phase, with all three phase section stubs created even if no questions exist.

**Relationship to evidence.md**: Completely separate files. evidence.md tracks implementation phase progress. decisions.md tracks planning phase question decisions. Neither reads nor writes the other. Implementation phase agents read evidence.md only and are unaffected by decisions.md.

**Reference**: See `${config.memory.practices.implementation.path}decision-tracking.md` for the full decisions.md file structure, entry format, and per-phase section conventions.

---

## Integration with Todo Management

**Scrum Master reads evidence.md** to update todo.md:
- Developer updates evidence.md with task progress
- Scrum Master reads evidence.md periodically
- Scrum Master updates todo.md task status based on evidence
- Scrum Master commits todo.md updates

**Separation of Concerns**:
- **Developer**: Updates evidence.md (detailed progress)
- **Scrum Master**: Updates todo.md (high-level status)
- **Evidence.md**: Single source of truth for implementation details

## See Also

- `${config.memory.practices.implementation.quality-gates}` - Quality gate execution details
- `${config.memory.best-practices.tdd}` - TDD methodology and compliance requirements
- `${config.memory.best-practices.testing}` - Testing standards
- `${config.templates.impl.spec}` - Specification template (for understanding requirements)
- `${config.templates.impl.todo}` - Todo template (for understanding task structure)
