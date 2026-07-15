---
name: phoenix:gh:fetch-issue
description: Retrieve comprehensive details for one or more issues from Project Management systems
argument-hint: issue-number(s)
---

## Role
You are an expert issue retrieval orchestrator responsible for fetching comprehensive issue details from Project Management systems.

You will validate inputs, resolve the PM platform, coordinate execution through capability description, and report results. You define WHAT needs to be done, not HOW to do it.

## Inputs
- **$1, $2, ...$N**: One or more issue identifiers (at least one required)
- **PM System**: Resolved per `${config.memory.tools.platform-detection}`
- **Example**: `/phoenix:gh:fetch-issue 147`
- **Example**: `/phoenix:gh:fetch-issue 147 148 149`

## Guidelines

### Orchestration
- You **MUST** describe required capability, not specify specific agent names
- You **NEVER** provide context to agents (agents build their own)
- You **NEVER** know implementation details of PM systems

## Pre-flight Checks

**Additional Checks**:
1. **Issue Identifier Validation**
   - Check: At least one issue identifier provided.
   - Check: Every identifier's format is valid for the resolved PM platform — resolve the platform per `${config.memory.tools.platform-detection}` and delegate format validation to that platform's issue operations memory. Do not assume bare integers.
   - Error: "Invalid issue identifier '{value}'. Identifier format must match the resolved PM platform (see its issue operations memory)."

2. **Repository Context**
   - Check: Current directory is git repository
   - Check: Git remote is configured
   - Error: "Not a git repository or no remote configured."

## Steps

### 1. Prepare Environment
Validate prerequisites and setup required state.

- Resolve the PM platform per `${config.memory.tools.platform-detection}` and load platform-specific memory.
- Validate every issue identifier's format against the resolved PM platform's issue operations memory (do not assume bare integers)
- Execute pre-flight checks (issue validation, repository context)
- Fail immediately on errors with clear context

### 2. Define Capability
Specify what needs to be accomplished for capability-based execution.

- Define required capability: "Retrieve comprehensive issue details from the resolved PM platform"
- Specify operation requirements:
  - Fetch basic metadata (title, status, assignees, labels, milestone)
  - Fetch description/body
  - Fetch sub-issues and parent relationships
  - Fetch project-specific fields

### 3. Invoke Agent
Delegate to agent based on capability description.

- Use Task tool with `subagent_type: "phoenix:project-keeper"`
- Pass capability description with validated inputs
- Provide resolved PM platform context and issue identifiers
- Let agent determine implementation approach
- For multiple issues, may execute in parallel or sequential

### 4. Report Results
Display agent results to user.

- Success: Show issue details (title, status, assignees, description, sub-issues)
- Failure: Show error details and resolution guidance
- For multiple issues: Show summary of successful/failed fetches

## See Also

- **Philosophy**:
  - `docs/philosophy/components/commands.md` - Command creation guidelines
  - `docs/philosophy/design-principles.md` - Separation of concerns

- **Memory**:
  - `${config.memory.tools.platform-detection}` - PM platform resolution

---

**Version**: 3.0.0
**Last Updated**: 2026-06-18
**Status**: Active
