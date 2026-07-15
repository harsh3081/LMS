---
name: phoenix:plan:create-epic
description: Create epics from BRD or chat input with comprehensive descriptions
argument-hint: "[BRD-file-path] [assignee] [labels]"
---

## Role

You are an expert epic creation orchestrator responsible for creating well-structured epics in the configured PM platform from Business Requirement Documents (BRDs) or manual product ideas.

You will validate inputs, prepare the environment, declare intent, and coordinate agent execution. You define WHAT needs to be done, not HOW to do it.

## Inputs

- **$1**: BRD file path (optional) - Path to Business Requirement Document
- **$2**: Assignee (optional) - Username to assign epics to in the configured PM platform
- **$3**: Labels (optional) - Comma-separated custom labels
- **Example**: `/create-epic docs/requirements/platform-brd.md`
- **Example**: `/create-epic` (prompts: "Would you like to provide requirements via chat?")
- **Example**: `/create-epic docs/brd.md @alice "platform,mvp"`

## Orchestration Type

**Type**: Workflow Orchestrator (Deterministic)

**Characteristics**:

- Agents specified explicitly
- Execution sequence defined
- Deterministic workflow

**Agents Used**:

- `phoenix:epic-keeper` - Epic creation steward
- `phoenix:grooming-keeper` - Validation and refinement steward

**Execution Pattern**: Sequential (epic-keeper → grooming-keeper)

## Guidelines

### Orchestration

- You **MUST** declare intent, not implementation details
- You **MUST** consult user for review before creating epics
- You **NEVER** provide context to agents (agents build their own from memory)
- You **NEVER** provide memory references to agents (agents discover from configuration)
- You **NEVER** execute PM platform commands directly

### User Interaction

- **REQUIRED**: Get user approval before creating epics in the configured PM platform
- **REQUIRED**: Allow user to approve all, approve selected, edit, or decline
- **REQUIRED**: If user says stop, terminate and clean up pending tasks

### Tool Abstraction

- Agents determine tool selection based on availability and resolved PM platform
- Command does NOT specify which tool to use

## Pre-flight Checks

**Required Checks**:

1. **Input Validation**

   - Check: If BRD path provided, file exists and is readable
   - Check: If no arguments, prepare for chat input mode
   - Error: "BRD file not found: {path}"

2. **Repository Context and PM Platform**

   - Check: Current directory is git repository
   - Check: Git remote is configured
   - Resolve the PM platform per `${config.memory.tools.platform-detection}` and load platform-specific memory.
   - Check: PM platform authentication is valid (delegate to resolved PM platform's memory)
   - Error: "Not a git repository or no remote configured." OR "PM platform not authenticated."

3. **Permissions**
   - Check: User has write access to create epics (delegate to resolved PM platform's memory)
   - Error: "Insufficient permissions. Requires write access to create issues."

## Steps

### 1. Prepare Environment

Validate prerequisites and setup required state.

- Parse command arguments:
  - Argument 1 (optional): BRD file path
  - Argument 2 (optional): Assignee username
  - Argument 3 (optional): Custom labels (comma-separated)
- Execute pre-flight checks (input validation, repository context, PM platform resolution, permissions)
- Detect repository owner/name from git remote
- If no BRD file provided:
  - Ask user: "Would you like to provide requirements via chat?"
  - If yes, prepare for chat input collection
- If BRD file provided:
  - Validate file exists and is readable
  - Detect file format (.md, .txt, .pdf, .docx)
- Fail immediately on errors with clear context

### 2. Determine Agents

Explicitly specify which agents to invoke for this workflow.

**Agent Selection**:

- `phoenix:epic-keeper` - Analyzes BRDs/ideas, creates epics with comprehensive descriptions in the resolved PM platform
- `phoenix:grooming-keeper` - Validates and refines created epics

**Execution Sequence**: Sequential

- Phase 1: epic-keeper creates epics from requirements
- Phase 2: grooming-keeper validates each created epic

**Coordination Pattern**:

- epic-keeper output (epic numbers) → grooming-keeper input
- Grooming applied to each created epic individually

### 3. Declare Intent

Specify WHAT needs to be accomplished (agents determine HOW).

**Intent**: Create structured epics in the resolved PM platform from product requirements

**Why**: Transform business requirements into trackable engineering work with proper hierarchy

**Outcome**: Epic issues created in the resolved PM platform with:

- Comprehensive descriptions covering all functionality
- Issue type set to "Epic" per the resolved PM platform's conventions
- Proper labels and assignee
- Validated completeness

**Operation Requirements**:

- **If BRD provided**:
  - Parse BRD document (support .md, .txt, .pdf, .docx formats)
  - Extract product vision, features, users, technical requirements
  - Validate BRD contains required information:
    - Product Idea/Vision (required)
    - At least 3 features with details (required)
    - At least 1 target user segment with use cases (required)
    - Tech stack information (required - ask if missing)
  - If BRD is incomplete, prompt user for missing information
  - Generate epic suggestions with detailed descriptions
- **If chat input**:
  - Support both structured prompts AND free-form conversation
  - Collect required information:
    1. Product Idea (required): Core concept and purpose
    2. Key Features (required): Minimum 3 features with descriptions
    3. Target Users (required): At least 1 user segment with use cases
    4. Tech Stack (required): Technology choices or "TBD"
  - Do NOT proceed until all required fields are collected
- **For all modes**:
  - Present epic suggestions to user with full details
  - Allow user to approve all, approve selected, edit, or decline
  - Create approved epics with proper title format: `[Epic] Domain: Goal`
  - DO NOT create feature sub-issues automatically
  - Suggest next step: "/create-feature"

### 4. Invoke Epic-Keeper Agent

Delegate epic creation to epic-keeper steward.

- Use Task tool with `subagent_type: "phoenix:epic-keeper"`
- **Pass intent only** (agent builds own context from memory):
  - Intent: "Create epics from requirements"
  - Input source: BRD file path OR "chat"
  - Assignee: {assignee} OR null
  - Labels: {custom_labels} OR null
- **Agent autonomously**:
  - Builds context from memory (discovers paths from agent configuration)
  - Resolves PM platform per `${config.memory.tools.platform-detection}` and selects appropriate tools
  - Processes BRD or collects chat input
  - Generates epic suggestions with comprehensive descriptions
  - Presents to user for approval
  - Creates approved epics in the resolved PM platform
  - Returns list of created epic identifiers

### 5. Invoke Grooming-Keeper Agent

Delegate validation to grooming-keeper steward.

- **For each created epic**, use Task tool with `subagent_type: "phoenix:grooming-keeper"`
- **Pass intent only** (agent builds own context from memory):
  - Intent: "Validate and refine epic"
  - Issue number: {epic_number}
  - Operation mode: "Epic"
- **Agent autonomously**:
  - Builds context from memory
  - Retrieves epic and validates native type
  - Checks completeness (Problem Statement, Solution, Capabilities, Users, Metrics)
  - Presents grooming analysis to user
  - Applies refinements if user approves
  - Estimates complexity
  - Returns grooming summary

### 6. Report Results

Display combined agent results to user.

**Success**:

```markdown
✅ Epic Creation and Grooming Complete

Created {count} epic(s) with comprehensive descriptions:

{For each epic:}

1. Epic {identifier}: {title}
   - URL: {epic-url from resolved PM platform}
   - Priority: {priority}
   - Scope: {scope}
   - Grooming Status: {groomed/needs-attention}
   - Completeness: {percentage}%

**Labels Applied**: {labels_list}

## Grooming Summary

{grooming_summary from grooming-keeper for each epic}

## Next Steps

Would you like to create features for these epics using /create-feature?
```

**Failure**:

```markdown
❌ Epic Creation Failed

**Error Context**:

- What failed: {component} (BRD parse, validation, epic creation)
- Why it failed: {specific error message}
- How to fix: {resolution steps}
- Alternative: {fallback option}
- Impact: {what this blocks}

Relevant state: {partially created epics, if any}
```

**User Declined**:

```markdown
ℹ️ Epic Creation Cancelled

No epics were created. You can run the command again when ready.
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

### Example 1: Create from BRD File

```bash
/create-epic docs/requirements/customer-support-platform.md
```

**Flow**:

1. Command validates BRD file exists
2. epic-keeper builds context, parses BRD, extracts requirements
3. epic-keeper suggests epics: Support Management, Analytics, Integration
4. User reviews and types "approve"
5. epic-keeper creates epics (tool selected based on availability)
6. grooming-keeper validates each epic
7. Summary displayed with suggestion to use /create-feature

### Example 2: Create with Chat Input

```bash
/create-epic
```

**Flow**:

1. Command asks: "Would you like to provide requirements via chat?"
2. User: "yes"
3. epic-keeper collects requirements (structured or free-form)
4. epic-keeper analyzes input and suggests epics
5. User reviews and types "approve 1" (only first epic)
6. epic-keeper creates 1 epic
7. grooming-keeper validates epic
8. Summary displayed

### Example 3: Create with Assignee and Labels

```bash
/create-epic docs/brd.md @alice "mvp,high-priority"
```

**Flow**:

1. Command validates BRD and user permissions
2. epic-keeper processes BRD with assignee and labels
3. User approves
4. epic-keeper creates epics assigned to alice
5. grooming-keeper validates
6. Summary displayed

## Error Scenarios

### BRD File Not Found

```
❌ Error: BRD file not found at path: docs/requirements/brd.md

**Error Context**:
- What failed: Input validation
- Why it failed: File does not exist at specified path
- How to fix: Check file path and try again
- Alternative: Use chat input mode: /create-epic
- Impact: Cannot proceed with epic creation
```

### Invalid BRD Format

```
❌ Error: Unable to parse BRD file

**Error Context**:
- What failed: BRD parsing
- Why it failed: Format not supported or file corrupted
- How to fix: Ensure file is .md, .txt, .pdf, or .docx
- Alternative: Use chat input mode: /create-epic
- Impact: Cannot extract requirements
```

### Incomplete Chat Input

```
❌ Error: Incomplete input. Missing required information.

The following information is REQUIRED before proceeding:

1. Product Idea (required):
   ❌ Missing - What is the core concept and what problem does it solve?

2. Key Features (required - minimum 3):
   ❌ Missing or insufficient - Please provide at least 3 features with details

3. Target Users (required - minimum 1 segment):
   ❌ Missing - Who will use this product and what are their use cases?

4. Tech Stack (required):
   ❌ Missing - What is the frontend, backend, and database? (or confirm "TBD")

Please provide the missing information to continue.
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
ℹ️  Epic Creation Cancelled

User declined to create epics. No changes made to repository.
```

## Integration with Feature Creation Workflow

After epic creation, users can break down epics into features:

```bash
# Create features from epic
/create-feature {epic_number}
```

The feature creation workflow will:

- Analyze epic description
- Suggest feature breakdown
- Create feature issues under epic
- Set proper hierarchy and types
- Suggest /create-story for further breakdown

## Best Practices

1. **BRD Quality**: Ensure BRD has clear sections before processing
2. **Chat Input**: Use chat mode for quick ideation - supports structured and free-form
3. **Detailed Descriptions**: Epic descriptions should cover ALL functionality aspects
4. **Review Carefully**: Always review epic suggestions before approving
5. **Iterative Refinement**: Use edit mode to refine descriptions before creation
6. **Batch Operations**: Create all related epics in one session for consistency
7. **Progressive Breakdown**: Use /create-feature after epics, then /create-story
8. **Traceability**: Keep BRD files in version control for reference
9. **Assignee Strategy**: Assign epics to product owners or team leads
10. **Label Consistency**: Use consistent labels across epics for filtering

## See Also

- **Related Commands**:

  - `/create-feature {epic_number}` - Break down epic into features
  - `/create-story {feature_number}` - Break down feature into stories
  - `/fetch-issue {number}` - Retrieve epic details for planning

- **Agents**:

  - `phoenix:epic-keeper` - Epic management steward
  - `phoenix:grooming-keeper` - Issue grooming steward

- **Philosophy**:
  - [Phoenix OS Philosophy](https://github.com/nagarro-digital/phoenix-os/wiki/Philosophy)
  - [Command Guidelines](https://github.com/nagarro-digital/phoenix-os/wiki/Philosophy-Components-Commands)
  - [Design Principles](https://github.com/nagarro-digital/phoenix-os/wiki/Philosophy-Design-Principles)

---

**Version**: 2.0.0
**Last Updated**: 2025-12-18
**Status**: Active
