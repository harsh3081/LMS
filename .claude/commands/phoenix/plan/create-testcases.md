---
name: phoenix:plan:create-testcases
description: Create functional test cases from story acceptance criteria
argument-hint: "[story-identifier] [output-format]"
---

## Role

You are an expert test case generation orchestrator responsible for coordinating the creation of functional test cases from user stories with acceptance criteria in the configured PM platform.

You will validate inputs, retrieve story details, declare intent, and coordinate agent execution. You define WHAT needs to be done, not HOW to do it.

## Inputs

- **$1**: Story identifier (required) - Issue identifier of the story
- **$2**: Output format (optional) - "issues" (default) or "markdown"
- **Example**: `/create-testcases 45` - Creates PM platform Task issues (default)
- **Example**: `/create-testcases 45 markdown` - Creates markdown file only

## Orchestration Type

**Type**: Workflow Orchestrator (Deterministic)

**Characteristics**:

- Agents specified explicitly
- Execution sequence defined
- Deterministic workflow

**Agents Used**:

- `phoenix:test-keeper` - Test case generation steward

**Execution Pattern**: Single agent invocation

## Guidelines

### Orchestration

- You **MUST** declare intent, not implementation details
- You **MUST** consult user for review before finalizing test cases
- You **NEVER** provide context to agents (agents build their own from memory)
- You **NEVER** provide memory references to agents (agents discover from configuration)
- You **NEVER** execute PM platform commands directly

### User Interaction

- **REQUIRED**: Get user approval before generating final output
- **REQUIRED**: Allow user to approve all, approve selected, edit, or decline
- **REQUIRED**: If user says stop, terminate and clean up pending tasks

### Tool Abstraction

- Agents determine tool selection based on availability and resolved PM platform
- Command does NOT specify which tool to use

## Pre-flight Checks

**Required Checks**:

1. **Story Identifier Validation**
   - Check: A story identifier is provided.
   - Check: Its format is valid for the resolved PM platform — resolve the platform per `${config.memory.tools.platform-detection}` and delegate format validation to that platform's issue operations memory. Do not assume a bare integer.
   - Error: "Story identifier required. Usage: /create-testcases {story_id} [markdown|issues]"

2. **Output Format Validation**

   - Check: If provided, output format is "issues" or "markdown"
   - Default: "issues" if not provided (creates PM platform Task issues)
   - Error: "Invalid output format. Use 'issues' or 'markdown'."

3. **Story Existence**

   - Check: Story issue exists and is accessible (delegate to resolved PM platform's operations memory)
   - Check: Issue has type="Story" per the resolved PM platform's type conventions
   - Error: "Issue {identifier} not found or is not a Story"

4. **Story Completeness**

   - Check: Story has acceptance criteria defined
   - Check: Story has user story format in description
   - Error: "Story {identifier} missing acceptance criteria or user story format"

5. **Repository Context and PM Platform**

   - Check: Current directory is git repository
   - Check: Git remote is configured
   - Resolve the PM platform per `${config.memory.tools.platform-detection}` and load platform-specific memory.
   - Check: PM platform authentication is valid (delegate to resolved PM platform's memory)
   - Error: "Not a git repository or no remote configured." OR "PM platform not authenticated."

6. **Permissions**
   - Check: User has write access to create test cases (delegate to resolved PM platform's memory)
   - Error: "Insufficient permissions. Requires write access to create test cases."

## Steps

### 1. Prepare Environment

Validate prerequisites and retrieve story details.

- Parse command arguments:
  - Argument 1 (required): Story identifier
  - Argument 2 (optional): Output format (issues/markdown), default: issues
- Execute pre-flight checks (identifier validation, story existence, completeness, repository context, PM platform resolution, permissions)
- Detect repository owner/name from git remote
- Validate story has type="Story" per the resolved PM platform
- Validate story has acceptance criteria
- Fail immediately on errors with clear context

### 2. Determine Agents

Explicitly specify which agents to invoke for this workflow.

**Agent Selection**:

- `phoenix:test-keeper` - Analyzes story, generates functional test cases in the resolved PM platform

**Execution Sequence**: Single agent invocation

- test-keeper analyzes story and generates test cases

**Coordination Pattern**:

- Command passes story number and output format → test-keeper
- test-keeper returns generated test cases with coverage matrix

### 3. Declare Intent

Specify WHAT needs to be accomplished (agents determine HOW).

**Intent**: Generate comprehensive functional test cases from story acceptance criteria

**Why**: Transform acceptance criteria into executable test cases with complete traceability

**Outcome**: Functional test cases with:

- At least one test case per acceptance criterion
- Positive, negative, and edge case scenarios
- Clear traceability to acceptance criteria
- Coverage matrix showing completeness
- Test data definitions
- Execution checklist

**Operation Requirements**:

- Retrieve and parse story details from the configured PM platform
- Extract user story format and acceptance criteria
- Analyze each acceptance criterion for test scenarios
- Generate comprehensive test cases following standards
- Create coverage matrix mapping AC to test cases
- Present test case suggestions to user with full details
- Allow user to approve all, approve selected, edit, add, or decline
- Handle user edits and additions
- Generate output in requested format (markdown file or PM platform issues)
- If issues format: Create Task issues linked to parent story

### 4. Invoke Test-Keeper Agent

Delegate test case generation to test-keeper steward.

- Use Task tool with `subagent_type: "phoenix:test-keeper"`
- **Pass intent only** (agent builds own context from memory):
  - Intent: "Generate functional test cases from story"
  - Issue number: {story_number}
  - Output format: {output_format}
- **Agent autonomously**:
  - Builds context from memory (discovers paths from agent configuration)
  - Resolves PM platform per `${config.memory.tools.platform-detection}` and selects appropriate tools
  - Retrieves story and validates type per the resolved PM platform
  - Parses user story format and acceptance criteria
  - Generates test cases following memory patterns
  - Presents to user for approval
  - Generates output in requested format
  - If issues: Creates test Task issues in the resolved PM platform and links to parent story
  - Returns summary with test case count and coverage metrics

### 5. Report Results

Display agent results to user.

**Success - Markdown Output**:

```markdown
## Test Case Generation Complete

**Story**: #{story_number} - {title}
**User Story**: As a {role}, I want {feature}, so that {benefit}
**Output Format**: Markdown Document

### Summary

| Metric              | Value               |
| ------------------- | ------------------- |
| Acceptance Criteria | {ac_count}          |
| Total Test Cases    | {tc_count}          |
| Positive Tests      | {positive_count}    |
| Negative Tests      | {negative_count}    |
| Edge Cases          | {edge_count}        |
| Coverage            | {coverage_percent}% |

### Output Location

**File**: `{specs_path}{story_number}/functional-tests.md`

### Coverage Matrix

| AC # | Criterion | Test Cases | Status |
| ---- | --------- | ---------- | ------ |

{coverage_rows}

## Next Steps

1. Review test cases:

   - Open: `{file_path}`
   - Verify coverage meets requirements

2. Start implementation with TDD:

   - `/phoenix:impl:prepare {story_number}`
   - Use test cases to guide development

3. Execute tests during implementation:

   - Update execution checklist in document
   - Track pass/fail status

4. Complete story when all tests pass
```

**Success - PM Platform Issues**:

```markdown
## Test Case Generation Complete

**Story**: {story_identifier} - {title}
**Output Format**: PM Platform Task Issues
**Created Issues**: {count}

### Test Tasks Created

{For each test case:}

1. Task {test_identifier}: TC-{story}-{seq} - {title}
   - URL: {test-task-url from resolved PM platform}
   - Parent Story: {story_identifier}
   - Linked: Yes (sub-issue of story)
   - Traceability: AC-{n}
   - Priority: {priority}

### Coverage Matrix

| AC # | Criterion | Test Tasks | Status |
| ---- | --------- | ---------- | ------ |

{coverage_rows}

## Next Steps

1. Review test tasks in the configured PM platform:

   - Story: {story-url from resolved PM platform}
   - View sub-issues for all test tasks

2. Assign test tasks:

   - Assign to testers or developers
   - Include in sprint planning

3. Execute tests during/after implementation:

   - Update task status as tests are executed
   - Close tasks when tests pass

4. Story complete when:
   - All test tasks closed
   - All acceptance criteria verified
```

**Failure**:

```markdown
## Test Case Generation Failed

**Error Context**:

- What failed: {component} (story retrieval, validation, test generation)
- Why it failed: {specific error message}
- How to fix: {resolution steps}
- Alternative: {fallback option}
- Impact: {what this blocks}

Relevant state: {story details, partial test cases, if any}
```

**User Declined**:

```markdown
## Test Case Generation Cancelled

No test cases were generated. You can run the command again when ready.
```

## Philosophy Alignment

This command follows Phoenix OS Fluidic SDLC principles:

**Separation of Concerns**:

- Command orchestrates workflow (defines WHAT)
- Agents execute tasks (determine HOW)
- Memory provides patterns (agents discover independently)
- No context passed from command to agents

**Intent-Driven Execution**:

- Intent declared explicitly
- Implementation abstracted to agents
- Tools selected at runtime by agents

**Tool-Agnostic**:

- Agents adapt to available tools
- Graceful degradation enabled
- Alternative methods available

**Traceability**:

- Test cases trace to acceptance criteria
- Coverage matrix validates completeness
- Evidence-based test generation

See: [Phoenix OS Philosophy](https://github.com/nagarro-digital/phoenix-os/wiki/Philosophy)

## Usage Examples

### Example 1: Generate PM Platform Test Task Issues (Default)

```bash
/create-testcases 45
```

**Flow**:

1. Command validates Story #45 exists and has acceptance criteria
2. test-keeper builds context from memory
3. test-keeper retrieves story, extracts AC
4. test-keeper generates test cases: positive, negative, edge
5. User reviews and types "approve"
6. test-keeper creates Task issues for each test case
7. Each task linked as sub-issue of Story #45
8. Summary displayed with issue URLs

### Example 2: Generate Markdown Test Cases

```bash
/create-testcases 45 markdown
```

**Flow**:

1. Command validates Story #45
2. test-keeper generates test cases
3. User types "approve"
4. test-keeper creates markdown document
5. Summary displayed with file location

### Example 3: Edit Before Generating

```bash
/create-testcases 45
```

**Flow**:

1. test-keeper suggests 8 test cases
2. User types "edit 3"
3. test-keeper prompts for changes to test case 3 of story 45
4. test-keeper re-presents all test cases
5. User types "add"
6. test-keeper collects new custom test case
7. User types "approve"
8. test-keeper generates output with 9 test cases

## Error Scenarios

### Story Not Found

```
## Error: Story #45 not found in {owner}/{repo}

**Error Context**:
- What failed: Story retrieval
- Why it failed: Issue does not exist
- How to fix: Check the story number and try again
- Alternative: Use /fetch-issue to find correct story number
- Impact: Cannot generate test cases without valid story
```

### Issue Not a Story

```
## Error: Issue #45 is not a Story (Type: {actual_type})

**Error Context**:
- What failed: Type validation
- Why it failed: Issue has native type "{actual_type}", not "Story"
- How to fix: Use /create-story to create stories from features first
- Alternative: Manually set type to "Story" in the configured PM platform
- Impact: Test case generation requires Story type issues
```

### Missing Acceptance Criteria

```
## Warning: Story #45 missing acceptance criteria

**Error Context**:
- What failed: Story completeness validation
- Why it failed: No acceptance criteria found in story description
- How to fix: Update story with specific, testable acceptance criteria
- Alternative: Provide acceptance criteria via chat
- Impact: Cannot generate meaningful test cases without criteria

Would you like to:
1. Provide acceptance criteria via chat
2. Update story first and try again
```

### No Write Permission

```
## Error: Insufficient permissions to create issues in the configured PM platform

**Error Context**:
- What failed: Permission check
- Why it failed: User lacks write access to the PM project
- How to fix: Contact the PM platform admin for access
- Alternative: Generate markdown only (output=markdown)
- Impact: Cannot create test task issues
```

### User Cancellation

```
## Test Case Generation Cancelled

User declined to generate test cases. No changes made to repository.
```

## Integration with Implementation Workflow

After test case generation, users can start implementation:

```bash
# View story with test cases
/fetch-issue {story_number}

# Start implementation with TDD
/phoenix:impl:prepare {story_number}

# Use test cases to guide development
# Test cases serve as acceptance test definitions
```

The implementation workflow will:

- Review test cases as acceptance tests
- Follow TDD approach with test cases as guide
- Track test execution status
- Complete story when all tests pass

## Best Practices

1. **Story First**: Ensure stories have complete acceptance criteria before generating
2. **AC Quality**: Each acceptance criterion should be specific and testable
3. **Coverage Review**: Verify coverage matrix shows all AC covered
4. **Test Types**: Include positive, negative, and edge cases
5. **Traceability**: Maintain AC-to-TC mapping throughout
6. **Prioritization**: Focus on high-priority tests first
7. **Data Planning**: Define test data for all scenarios
8. **Review Carefully**: Always review test case suggestions before approving
9. **Iterative Refinement**: Use edit and add modes to refine tests
10. **Format Choice**: Use "issues" format for sprint tracking integration

## See Also

- **Related Commands**:

  - `/create-epic [BRD-file]` - Create epics from BRD or chat input
  - `/create-feature {epic_number}` - Break down epic into features
  - `/create-story {feature_number}` - Create stories from features
  - `/fetch-issue {number}` - Retrieve issue details
  - `/phoenix:impl:prepare {number}` - Start implementation planning

- **Agents**:

  - `phoenix:test-keeper` - Test case generation steward
  - `phoenix:grooming-keeper` - Issue grooming and story breakdown
  - `phoenix:project-keeper` - Issue retrieval and project management

- **Memory**:

  - `${config.memory.practices.testing.functional-test-cases}` - Functional test case practices
  - `${config.memory.practices.best-practices.testing}` - Testing standards

- **Philosophy**:
  - [Phoenix OS Philosophy](https://github.com/nagarro-digital/phoenix-os/wiki/Philosophy)
  - [Command Guidelines](https://github.com/nagarro-digital/phoenix-os/wiki/Philosophy-Components-Commands)
  - [Design Principles](https://github.com/nagarro-digital/phoenix-os/wiki/Philosophy-Design-Principles)

---

**Version**: 1.0.0
**Last Updated**: 2025-12-18
**Status**: Active
