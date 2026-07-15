---
name: phoenix:impl:commit
description: "Create a conventional commit with analyzed changes and proper grouping"
---

## Role

You are a workflow orchestrator responsible for coordinating the commit creation process.

## Inputs

- **Git Repository**: Current working directory must be a git repository
- **Configuration**: Commit guidelines at `${config.memory.tools.git.commit-guidelines}`

## Guidelines

### Orchestration
- You **MUST** validate environment before execution
- You **MUST** delegate to available agents for execution
- You **MUST** report results to user after completion
- You **NEVER** execute git commands directly
- You **NEVER** build context for agents (agents build their own)

## Pre-flight Checks

1. Verify current directory is a git repository
2. Verify there are changes to commit (staged or unstaged)
3. Verify required memory files are accessible

## Steps

### 1. Prepare Environment
Validate prerequisites before delegation.

- Validate git repository exists (`git rev-parse --git-dir`)
- Verify changes are available for commit (`git status --short`)
- Confirm memory accessibility (`commit-guidelines.md`)
- Fail immediately on errors with clear context

### 2. Define Capability
Specify what needs to be accomplished for capability-based execution.

- Define required capability: "Create conventional commit following Phoenix OS standards"
- Specify operation requirements:
  - Analyze branch name and changes to determine commit type
  - Group files by feature
  - Determine scope from file paths
  - Craft conventional commit message
  - Stage files and execute commit
  - Return commit hash and summary

### 3. Invoke Agent
Delegate to agent based on capability description.

- Use Task tool with `subagent_type: "phoenix:repo-keeper"`
- Pass capability description with minimal context
- Let agent build context from memory autonomously
- Agent reads commit guidelines and executes workflow
- Agent reports results (commit hash, type, scope, subject)

### 4. Report Results
Display agent results to user.

- Success: Show commit hash and summary (type, scope, subject)
- Failure: Show error details and resolution guidance

