---
name: phoenix:plan:create-feature
description: Create features from Epic with comprehensive descriptions
argument-hint: "[epic-identifier] [assignee] [labels]"
---

## Role

You are an expert feature creation orchestrator responsible for breaking down epics in the configured PM platform into well-structured feature issues with comprehensive descriptions.

You will validate inputs, retrieve epic details, declare intent, and coordinate agent execution. You define WHAT needs to be done, not HOW to do it.

## Inputs

- **$1**: Epic identifier (required) - Issue identifier of the epic to break down
- **$2**: Assignee (optional) - Username to assign features to in the configured PM platform
- **$3**: Labels (optional) - Comma-separated custom labels
- **Example**: `/create-feature 42`
- **Example**: `/create-feature 42 @alice "mvp,backend"`

## Orchestration Type

**Type**: Workflow Orchestrator (Deterministic)

**Characteristics**:

- Agents specified explicitly
- Execution sequence defined
- Deterministic workflow

**Agents Used**:

- `phoenix:grooming-keeper` - Feature breakdown and creation steward

**Execution Pattern**: Single agent invocation

## Guidelines

### Orchestration

- You **MUST** declare intent, not implementation details
- You **MUST** consult user for review before creating features
- You **NEVER** provide context to agents (agents build their own from memory)
- You **NEVER** provide memory references to agents (agents discover from configuration)
- You **NEVER** execute PM platform commands directly

### User Interaction

- **REQUIRED**: Get user approval before creating features in the configured PM platform
- **REQUIRED**: Allow user to approve all, approve selected, edit, or decline
- **REQUIRED**: If user says stop, terminate and clean up pending tasks

### Tool Abstraction

- Agents determine tool selection based on availability and resolved PM platform
- Command does NOT specify which tool to use

## Pre-flight Checks

**Required Checks**:

1. **Epic Identifier Validation**
   - Check: An epic identifier is provided.
   - Check: Its format is valid for the resolved PM platform — resolve the platform per `${config.memory.tools.platform-detection}` and delegate format validation to that platform's issue operations memory. Do not assume a bare integer.
   - Error: "Epic identifier required. Usage: /create-feature {epic_id}"

2. **Epic Existence**

   - Check: Epic issue exists and is accessible (delegate to resolved PM platform's operations memory)
   - Check: Issue has type="Epic" per the resolved PM platform's type conventions
   - Error: "Issue {identifier} not found or is not an Epic"

3. **Repository Context and PM Platform**

   - Check: Current directory is git repository
   - Check: Git remote is configured
   - Resolve the PM platform per `${config.memory.tools.platform-detection}` and load platform-specific memory.
   - Check: PM platform authentication is valid (delegate to resolved PM platform's memory)
   - Error: "Not a git repository or no remote configured." OR "PM platform not authenticated."

4. **Permissions**
   - Check: User has write access to create features (delegate to resolved PM platform's memory)
   - Error: "Insufficient permissions. Requires write access to create issues."

## Steps

### 1. Prepare Environment

Validate prerequisites and retrieve epic details.

- Parse command arguments:
  - Argument 1 (required): Epic identifier
  - Argument 2 (optional): Assignee username
  - Argument 3 (optional): Custom labels (comma-separated)
- Execute pre-flight checks (identifier validation, epic existence, repository context, PM platform resolution, permissions)
- Detect repository owner/name from git remote
- Validate epic has type="Epic" per the resolved PM platform
- Fail immediately on errors with clear context

### 2. Determine Agents

Explicitly specify which agents to invoke for this workflow.

**Agent Selection**:

- `phoenix:grooming-keeper` - Analyzes epic functionality, creates feature issues with comprehensive descriptions in the resolved PM platform

**Execution Sequence**: Single agent invocation

- grooming-keeper analyzes epic and creates features

**Coordination Pattern**:

- Command passes epic number → grooming-keeper
- grooming-keeper returns created feature numbers

### 3. Declare Intent

Specify WHAT needs to be accomplished (agents determine HOW).

**Intent**: Break down epic into structured feature issues in the resolved PM platform

**Why**: Transform epic's detailed functionality into trackable feature-level work items

**Outcome**: Feature issues created in the resolved PM platform with:

- Comprehensive descriptions (detailed but not story-level)
- Issue type set to "Feature" per the resolved PM platform's conventions
- Proper parent-child linking to epic using the resolved PM platform's sub-issue operations
- Appropriate labels and assignee

**Operation Requirements**:

- Retrieve and parse epic details from the resolved PM platform
- Extract "Detailed Functionality" sections from epic body
- Analyze each functional area and group into logical features
- Generate feature suggestions with detailed descriptions
- Present feature suggestions to user with full details
- Allow user to approve all, approve selected, edit, or decline
- Handle user edits and re-present if requested
- Create approved features in the resolved PM platform with:
  - Proper title format: `[Feature] {Feature Name}`
  - Comprehensive description
  - Issue type set to "Feature" per the resolved PM platform
  - **CRITICAL**: Link each feature as sub-issue of parent epic via the resolved PM platform's sub-issue operations
- DO NOT create story sub-issues automatically
- Suggest next step: "/create-story"

### 4. Invoke Grooming-Keeper Agent

Delegate feature breakdown and creation to grooming-keeper steward.

- Use Task tool with `subagent_type: "phoenix:grooming-keeper"`
- **Pass intent only** (agent builds own context from memory):
  - Intent: "Break down epic into features"
  - Issue number: {epic_number}
  - Operation mode: "Epic"
  - Breakdown action: "break-into-features"
  - Assignee: {assignee} OR null
  - Labels: {custom_labels} OR null
- **Agent autonomously**:
  - Builds context from memory (discovers paths from agent configuration)
  - Resolves PM platform per `${config.memory.tools.platform-detection}` and selects appropriate tools
  - Retrieves epic and validates type per the resolved PM platform
  - Parses epic's detailed functionality sections
  - Generates feature suggestions based on functional areas
  - Presents to user for approval
  - Creates approved features in the resolved PM platform
  - **Links EVERY feature to parent epic using the resolved PM platform's sub-issue operations**
  - Verifies sub-issue linking succeeded
  - Returns list of created feature identifiers with linking status

### 5. Report Results

Display agent results to user.

**Success**:

```markdown
✅ Feature Creation Complete

Created {count} feature(s) under Epic {epic_identifier}:

{For each feature:}

1. Feature {identifier}: {title}
   - URL: {feature-url from resolved PM platform}
   - Parent Epic: {epic_identifier}
   - Linked: ✅ (sub-issue of epic)
   - Assignee: {assignee}

**Labels Applied**: {labels_list}

## Next Steps

1. Review features in the configured PM platform:

   - Feature {identifier1}: {feature-url-1 from resolved PM platform}
   - Feature {identifier2}: {feature-url-2 from resolved PM platform}

2. Create stories for these features:

   - /create-story {identifier1}
   - /create-story {identifier2}

3. View epic with features:
   - /fetch-issue {epic_identifier}
```

**Failure**:

```markdown
❌ Feature Creation Failed

**Error Context**:

- What failed: {component} (epic retrieval, validation, feature creation)
- Why it failed: {specific error message}
- How to fix: {resolution steps}
- Alternative: {fallback option}
- Impact: {what this blocks}

Relevant state: {epic details, partially created features, if any}
```

**User Declined**:

```markdown
ℹ️ Feature Creation Cancelled

No features were created. You can run the command again when ready.
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

See: [Phoenix OS Philosophy](https://github.com/nagarro-digital/phoenix-os/wiki/Philosophy)

## Usage Examples

### Example 1: Create Features from Epic

```bash
/create-feature 42
```

**Flow**:

1. Command retrieves Epic #42 details
2. grooming-keeper builds context, parses detailed functionality sections
3. grooming-keeper suggests features: Password Auth, MFA, Social Login, Session Management
4. User reviews and types "approve"
5. grooming-keeper creates features (tool selected based on availability)
6. Features linked to Epic #42 as sub-issues
7. Summary displayed with suggestion to use /create-story

### Example 2: Create with Assignee and Labels

```bash
/create-feature 42 @alice "backend,security"
```

**Flow**:

1. Command retrieves Epic #42
2. grooming-keeper processes with assignee and labels
3. User types "approve"
4. grooming-keeper creates features assigned to alice
5. Features linked to epic
6. Summary displayed

### Example 3: Edit Before Creating

```bash
/create-feature 42
```

**Flow**:

1. grooming-keeper suggests 5 features based on epic
2. User types "edit 3"
3. grooming-keeper prompts for changes to feature 3 description
4. grooming-keeper re-presents all features with changes
5. User types "approve 1,2,4" (skip feature 3 and 5)
6. grooming-keeper creates 3 features
7. Summary displayed

## Error Scenarios

### Epic Not Found

```
❌ Error: Epic #42 not found in {owner}/{repo}

**Error Context**:
- What failed: Epic retrieval
- Why it failed: Issue does not exist
- How to fix: Check the epic number and try again
- Alternative: Use /fetch-issue to find correct epic number
- Impact: Cannot create features without valid epic
```

### Issue Not an Epic

```
❌ Error: Issue #42 is not an Epic (Type: {actual_type})

**Error Context**:
- What failed: Type validation
- Why it failed: Issue has native type "{actual_type}", not "Epic"
- How to fix: Use /create-epic to create epics first
- Alternative: Manually set type to "Epic" in the configured PM platform
- Impact: Only Epic issues can be broken down into features
```

### Epic Has No Detailed Functionality

```
⚠️  Warning: Epic #42 missing "Detailed Functionality" sections

**Error Context**:
- What failed: Content validation
- Why it failed: Epic description lacks detailed functionality areas
- How to fix: Update epic with detailed functionality sections
- Alternative: Provide feature breakdown via chat
- Impact: May result in incomplete feature suggestions

Would you like to:
1. Manually provide feature breakdown via chat
2. Update epic first and try again
```

### No Write Permission

```
❌ Error: Insufficient permissions to create issues in the configured PM platform

**Error Context**:
- What failed: Permission check
- Why it failed: User lacks write access to the PM project
- How to fix: Contact the PM platform admin for access
- Alternative: Use a PM account with write access
- Impact: Cannot create any issues
```

### User Cancellation

```
ℹ️  Feature Creation Cancelled

User declined to create features. No changes made to repository.
```

## Integration with Story Creation Workflow

After feature creation, users can break down features into stories:

```bash
# Create stories from feature
/create-story {feature_number}
```

The story creation workflow will:

- Analyze feature description
- Suggest story breakdown following user story format
- Create story issues under feature
- Set proper hierarchy and types
- Suggest implementation planning

## Best Practices

1. **Epic First**: Always create and refine epics before breaking into features
2. **Logical Grouping**: Features should represent distinct functional areas
3. **Comprehensive Descriptions**: Each feature should have implementation-ready details
4. **Review Carefully**: Always review feature suggestions before approving
5. **Iterative Refinement**: Use edit mode to refine feature descriptions
6. **Consistent Naming**: Use clear, descriptive feature names
7. **Progressive Breakdown**: Use /create-story after features for further breakdown
8. **Assignee Strategy**: Assign features to technical leads or module owners
9. **Label Consistency**: Use consistent labels across features for filtering
10. **Parent Linking**: Ensure all features are properly linked to parent epic

## See Also

- **Related Commands**:

  - `/create-epic [BRD-file]` - Create epics from BRD or chat input
  - `/create-story {feature_number}` - Break down feature into stories
  - `/fetch-issue {number}` - Retrieve issue details

- **Agents**:

  - `phoenix:grooming-keeper` - Issue grooming and breakdown steward
  - `phoenix:project-keeper` - Issue retrieval and project management

- **Philosophy**:
  - [Phoenix OS Philosophy](https://github.com/nagarro-digital/phoenix-os/wiki/Philosophy)
  - [Command Guidelines](https://github.com/nagarro-digital/phoenix-os/wiki/Philosophy-Components-Commands)
  - [Design Principles](https://github.com/nagarro-digital/phoenix-os/wiki/Philosophy-Design-Principles)

---

**Version**: 2.0.0
**Last Updated**: 2025-12-18
**Status**: Active
