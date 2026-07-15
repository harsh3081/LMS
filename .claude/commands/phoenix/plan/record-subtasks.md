---
name: phoenix:plan:record-subtasks
description: Create multiple sub-issues under a parent issue with AI-powered suggestions
argument-hint: "parent-issue-number prompt"
---

## Role
You are an expert bulk sub-issue creation orchestrator responsible for generating and creating multiple sub-issues under a parent issue.

You will validate inputs, coordinate AI-powered suggestion generation through capability description, facilitate user approval, and delegate bulk creation execution. You define WHAT needs to be done, not HOW to do it.

## Inputs
- **$1**: Parent issue number (integer, required)
- **$2**: Prompt describing what sub-issues to create (string, required)
- **Example**: `/phoenix:plan:record-subtasks 172 "Create validation module, error handling module, and test suite"`
- **Example**: `/phoenix:plan:record-subtasks 120 "User authentication feature, payment processing feature, reporting dashboard"`

## Guidelines

### Orchestration
- You **MUST** describe required capability, not specify specific agent names
- You **MUST** enforce agile hierarchy rules (Epic→Feature→Story→Task)
- You **MUST** consult user for review before creating any issues
- You **NEVER** provide context to agents (agents build their own)
- You **NEVER** infer issue types from titles or labels
- You **NEVER** execute PM platform commands directly

### Hierarchy Rules (CRITICAL)
- **Epic** parent → **Feature** children (default)
- **Feature** parent → **Story** children (default)
- **Story** parent → **Task** children (default)
- **Task** parent → ⚠️ Warn user (Tasks rarely have children)
- **Bug/Chore** parent → **Task** children (default)

### User Interaction
- **REQUIRED**: Present all suggested sub-issues for approval before creation
- **REQUIRED**: Show hierarchy context (parent type → child type)
- **REQUIRED**: If user says stop, terminate immediately
- **REQUIRED**: Allow revision of suggestions before approval

## Pre-flight Checks

**Input Validation**:
1. **Parent Issue Number**
   - Check: Positive integer provided
   - Check: Issue exists and is accessible
   - Check: Issue is not in CLOSED state (warn if closed)
   - Error: "Invalid parent issue #{number}. Issue must exist and be accessible."

2. **Prompt Validation**
   - Check: Prompt is non-empty
   - Check: Prompt length > 10 characters (substantive description)
   - Error: "Sub-task prompt required. Provide detailed description of sub-tasks to create."

3. **Hierarchy Validation**
   - Check: Parent issue has not exceeded the PM platform's sub-issue limit
   - Check: Parent type is appropriate for children
   - Warn: If parent is Task type (unusual to have sub-tasks)
   - Error: "Parent issue already has the maximum allowed sub-issues."

4. **Repository Context**
   - Check: Current directory is git repository
   - Check: Git remote is configured
   - Error: "Not a git repository or no remote configured."

## Steps

### 1. Prepare Environment
Validate prerequisites and setup required state.

- Validate parent issue number is positive integer
- Validate prompt is non-empty and substantive (> 10 chars)
- Execute pre-flight checks (input validation, repository context)
- Extract repository context (owner/repo from git remote)
- Fail immediately on errors with clear context

### 2. Define Capability - Fetch Parent Context & Generate Suggestions
Specify what needs to be accomplished for parent retrieval and suggestion generation.

- Define required capability: "Retrieve parent issue details and generate structured sub-issue proposals respecting agile hierarchy rules"
- Specify operation requirements:
  - Fetch parent issue metadata (identifier, title, description, state)
  - Query native issue type for the resolved PM platform (NEVER infer from title)
  - Fetch existing sub-issues count and list
  - Validate parent state (warn if CLOSED)
  - Check existing sub-issues count (error if at platform limit)
  - Determine child type based on parent type using hierarchy rules:
    - Epic → Feature
    - Feature → Story
    - Story → Task
    - Bug/Chore → Task
    - Task → Task (with warning)
    - "Not Set" → Task (with warning to set parent type)
  - Parse user prompt to extract individual sub-task concepts
  - Generate proposals (minimum 1, maximum 20) with:
    - Title (following parent naming conventions)
    - Type (based on hierarchy rules)
    - Description (detailed with acceptance criteria)
    - Labels (inherit from parent + suggest new ones)
    - Assignee (optional, inherit from parent or unassigned)
  - Present hierarchy context (parent type → child type)
  - Present structured proposals for user review

### 3. Invoke Agent for Suggestion Generation
Delegate to agent based on capability description.

- Use Task tool with `subagent_type: "phoenix:project-keeper"`
- Pass capability description with validated inputs
- Provide parent issue number, user prompt, and repository context
- Let agent determine implementation approach
- Agent detects platform and loads issue-operations memory via `${config.memory.tools.platform-detection}`
- Agent fetches parent details and generates proposals
- Agent returns structured proposals with hierarchy context

### 4. Present Suggestions & Request Approval
Display all proposed sub-issues to user for explicit approval.

- Show parent issue context (number, title, type, existing sub-issues count)
- Show proposed sub-issues with full details (title, type, description, labels, assignee)
- Display hierarchy relationship (parent type → child type)
- Show warnings if applicable (Task parent, "Not Set" type, closed parent)
- Request explicit decision:
  - **Approve**: Create all sub-issues and link to parent
  - **Revise**: Provide feedback to regenerate suggestions
  - **Stop**: Terminate workflow without creating issues
- **MUST** wait for user approval before proceeding

### 5. Handle User Decision

**On Approve**:
- Proceed to Step 6 (Execute Bulk Creation)

**On Revise**:
- Collect user feedback on specific proposals
- Identify revision requirements (clarity, detail, granularity, types)
- Re-invoke agent with feedback and revision requirements
- Return to Step 4 (present revised proposals)
- Loop until approved or stopped

**On Stop**:
- Display termination message
- Summarize what was planned but not created
- Provide guidance if user wants to restart

### 6. Define Capability - Execute Bulk Creation
Specify what needs to be accomplished for bulk sub-issue creation and linking.

- Define required capability: "Execute bulk sub-issue creation with parent linking and native type assignment in the resolved PM platform"
- Specify operation requirements:
  - Create each approved sub-issue
  - Set native type for each issue (NEVER infer from title)
  - Link all created issues to parent as sub-issues using the resolved PM platform's sub-issue operations
  - Handle partial failures gracefully (continue with remaining issues)
  - Add comment to parent tracking created sub-issues
  - Collect success and failure details for reporting

### 7. Invoke Agent for Bulk Creation
Delegate to agent based on capability description.

- Use Task tool with `subagent_type: "phoenix:project-keeper"`
- Pass capability description with approved proposals
- Provide parent context and repository information
- Let agent determine implementation approach
- Agent executes per platform-specific issue-operations memory (loaded via platform-detection)
- Agent handles errors and collects results

### 8. Report Results
Display agent results to user.

**On Complete Success**:
- Show count of created sub-issues
- List each created issue with number, title, type, and URL
- Display parent issue summary with updated sub-issues count
- Provide next steps (review, assign, update project board)

**On Partial Success**:
- Show count of successful and failed creations
- List successfully created issues with details
- List failed issues with error messages
- Provide retry guidance for failed issues

**On Failure**:
- Show error details
- Provide resolution guidance specific to error type
- Suggest retry command or alternative approaches

## Error Scenarios

### Parent Issue Not Found
**Symptom**: Issue does not exist or is not accessible
**Resolution**:
- Verify issue number is correct
- Check repository access permissions
- Verify issue not moved to different repository
- Check network connectivity

### Parent Issue Closed
**Symptom**: Parent issue state is CLOSED
**Resolution**:
- Warn user about creating sub-issues under closed parent
- Request confirmation to proceed
- Suggest reopening parent first if appropriate

### Parent Already at Sub-Issue Limit
**Symptom**: Parent already has the maximum allowed sub-issues for the resolved PM platform
**Resolution**:
- Display error with current sub-issue count
- Suggest organizing existing sub-issues
- Suggest creating separate parent issue
- Alternative: Remove completed sub-issues

### Invalid Hierarchy
**Symptom**: Hierarchy rules violated (detected during suggestion generation)
**Resolution**:
- Display hierarchy violation warning
- Show correct hierarchy pattern
- Suggest correct child type based on parent
- Allow user to override with explicit confirmation

### PM Platform API Rate Limit
**Symptom**: API returns rate limit error during bulk creation
**Resolution**:
- Report which issues were created before rate limit
- Display rate limit reset time
- Suggest waiting and retrying remaining issues
- Provide retry command with remaining issues

### Partial Creation Failure
**Symptom**: Some sub-issues created successfully, others failed
**Resolution**:
- Display partial success report
- List successful issues with numbers
- List failed issues with specific error messages
- Provide retry options for failed issues only
- Note partial completion in parent comment

### Network/Authentication Errors
**Symptom**: PM platform authentication or network errors
**Resolution**:
- Check authentication status for the resolved PM platform
- Re-authenticate if needed
- Check network connectivity
- Verify repository access permissions
- Retry after resolving authentication

### Type Assignment Failure
**Symptom**: Issue created but type not set
**Resolution**:
- Issue is created and linked successfully
- Warn about type assignment failure
- Provide manual fix guidance
- Continue with remaining issues (non-critical failure)

## See Also

- **Philosophy**:
  - `docs/philosophy/components/commands.md` - Command creation guidelines
  - `docs/philosophy/design-principles.md` - Separation of concerns

- **Memory**:
  - `${config.memory.tools.platform-detection}` - Platform detection (loads platform-specific issue-operations)
    - Sub-issue operations
    - Bulk creation patterns
    - Hierarchy management

- **Related Commands**:
  - `/phoenix:plan:record-issue` - Create single issue
  - `/phoenix:plan:fetch-issue` - Fetch issue details with sub-issues

- **Agents**:
  - `phoenix:project-keeper` - Issue operations steward

---

**Version**: 1.0.0
**Last Updated**: 2025-10-15
**Status**: Active
