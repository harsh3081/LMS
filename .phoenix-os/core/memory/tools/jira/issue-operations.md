# JIRA Issue Operations

This document defines the implementation methods (HOW) for JIRA issue operations in Phoenix OS.

**Memory Type**: Long-term memory (LT) - Provides implementation patterns for agents.

**Role**: Agents read this memory to understand HOW to execute JIRA operations. Commands do NOT pass this to agents; agents discover and read it independently.

**Memory Path**: `${config.memory.tools.jira.issue-operations}`

**CRITICAL REQUIREMENT**: JIRA exposes **native issue types** (`fields.issuetype.name`). Always read the native issue type from the issue; never infer the type from the title or summary.

> **Note on acli commands**: The `acli jira` subcommand/flag shapes shown here are representative. Verify exact flags against your installed `acli` version.

---

## JIRA Native Issue Types

### Available Native Types

JIRA Cloud commonly exposes the following native issue types:

- **Epic**: A large body of work that spans multiple sprints; the top-level parent in the hierarchy.
- **Feature**: A deliverable capability that groups related stories; sits below Epic in the hierarchy.
- **Story**: A user-facing piece of functionality deliverable within a sprint.
- **Task**: A specific, self-contained piece of work (technical or non-technical).
- **Bug**: An unexpected defect or behavior that needs to be fixed.
- **Sub-task**: A granular work item that is always a child of another issue (Story, Task, or Bug).

Issue type schemes are configured per-project, so this set is a default — not a guarantee. Discover the types actually available in the target project before relying on them:

```bash
# acli: list the issue types configured for the project
acli jira project view PHX --json | jq -r '.issueTypes[].name'
```

### Phoenix → JIRA Issue Type Mapping

| Phoenix Type | JIRA Issue Type | Notes |
|--------------|-----------------|-------|
| Epic | Epic | Direct 1:1 mapping |
| Story | Story | Direct 1:1 mapping |
| Task | Task | Direct 1:1 mapping |
| Bug | Bug | Direct 1:1 mapping |
| Sub-task | Sub-task | Direct 1:1 mapping (requires a parent) |
| Feature | Feature | JIRA provides a Feature type; map 1:1 when present in the project |
| Chore | Chore → Task | Use a custom `Chore` type if the project defines one; otherwise fall back to `Task` |

Phoenix `Feature` maps directly to the JIRA `Feature` type. Phoenix `Chore` maps to a `Chore` type when the project defines one (it is not part of the standard JIRA type set); when no `Chore` type is available, fall back to `Task` as the closest semantic equivalent.

> **Note**: This table maps to the *standard* JIRA type names. Before creating an issue, confirm the resolved target type exists in the project's available issue types (see [Available Native Types](#available-native-types)). If it is missing — e.g. a team-managed project without `Sub-task`, or one that renames `Epic` — fall back to the closest available type and tell the user.

### Reading the Native Issue Type

Always read the type from the issue — never guess from the title or summary.

```bash
# acli: read the native type field
acli jira issue view PHX-123 --json | jq -r '.fields.issuetype.name'
```

---

## Issue Key Format Validation

### Key Format

JIRA issue keys follow the pattern: an **uppercase project prefix** (one or more uppercase letters, optionally followed by digits), a **hyphen**, then **one or more digits**. Unlike GitHub, GitLab, and Azure DevOps — which use bare integer issue numbers — JIRA uses alphanumeric keys. Agents **MUST NOT** pass a bare integer as a JIRA key.

- Valid regex: `^[A-Z][A-Z0-9]+-[0-9]+$`
- Example match: `PHX-123`
- Example rejects: `123` (bare integer), `phx-1` (lowercase prefix), `PHX1` (missing hyphen)

### Bash Validation Snippet

```bash
key="$1"
if ! printf '%s' "$key" | grep -Eq '^[A-Z][A-Z0-9]+-[0-9]+$'; then
  echo "❌ Invalid JIRA key: '$key' (expected e.g. PHX-123, pattern ^[A-Z][A-Z0-9]+-[0-9]+\$)"
  exit 1
fi
# Self-check: matches PHX-123 ; rejects 123, phx-1, PHX1
```

---

## Finding Issues (JQL)

JQL (JIRA Query Language) is the primary discovery mechanism for finding issues.

### Ready JQL Patterns

```
# Filter by type
issuetype = Story

# Filter by status
status = "In Progress"

# Filter by project
project = PHX

# Filter by assignee (current user)
assignee = currentUser()

# Filter by assignee (specific user)
assignee = "user@your-domain.com"

# Combined example
project = PHX AND issuetype = Story AND status = "To Do" AND assignee = currentUser()
```

### Commands

```bash
# acli: pass a JQL string directly
acli jira issue search --jql 'project = PHX AND issuetype = Story AND status = "To Do" AND assignee = currentUser()'
```

---

## Fetching a Single Issue

```bash
# acli: view an issue by key
acli jira issue view PHX-123

# acli --json + jq map to Phoenix's normalized shape
acli jira issue view PHX-123 --json | jq '{
    key:      .key,
    title:    .fields.summary,
    state:    .fields.status.name,
    type:     .fields.issuetype.name,
    priority: (.fields.priority.name // "None"),
    assignee: (.fields.assignee.emailAddress // "Unassigned"),
    parent:   (.fields.parent.key // null)
  }'
```

The `jq` projection maps JIRA fields to the normalized Phoenix shape:

| Normalized (Phoenix) | JIRA Source Field |
|----------------------|-------------------|
| `key` | issue `key` |
| `title` | `fields.summary` |
| `state` | `fields.status.name` |
| `type` | `fields.issuetype.name` |
| `priority` | `fields.priority.name` |
| `assignee` (read) | `fields.assignee.emailAddress` |
| `parent` | `fields.parent.key` |

---

## Create / Update Issues with Field Mappings

### Field Mapping Table

| Normalized Field | JIRA Field | Notes |
|------------------|------------|-------|
| title | `fields.summary` | Direct |
| body / description | `fields.description` | Formatted plain text |
| type | `fields.issuetype.name` | Use the mapped JIRA type from the mapping table above, confirmed against the project's available issue types |
| priority | `fields.priority.name` | One of the project's priority names (commonly `Highest`, `High`, `Medium`, `Low`, `Lowest`) |
| project | `fields.project.key` | e.g. `PHX` |
| assignee | `fields.assignee` | Set with `acli jira issue assign` |
| parent | `fields.parent.key` | See Issue Hierarchy section |

### Create Issue

```bash
# acli (plain-text description)
acli jira issue create \
  --project PHX \
  --type Story \
  --summary "Add JIRA memory library" \
  --description "Author issue-operations.md and authentication.md under core/memory/tools/jira/"
```

### Description Format (plain text)

`fields.description` uses readable, formatted plain text.

```bash
acli jira issue create \
  --project PHX \
  --type Story \
  --summary "Add JIRA memory library" \
  --description "Overview

Author the JIRA memory files under core/memory/tools/jira/.

Scope
- issue-operations.md: issue CRUD, JQL discovery, hierarchy, transitions
- authentication.md: acli pre-flight and required project permissions"
```

### Update Issue

```bash
# acli
acli jira issue edit PHX-123 --summary "Updated summary"
```

### Assign Issue

```bash
# acli
acli jira issue assign PHX-123 --assignee "user@your-domain.com"
```

### Set / Read Priority

JIRA exposes a native **priority** field (`fields.priority.name`). The default scheme uses `Highest`, `High`, `Medium`, `Low`, `Lowest`, but projects may define custom priority schemes — read the available values from the issue's edit metadata rather than assuming the defaults.

```bash
# acli: set priority on create
acli jira issue create \
  --project PHX \
  --type Bug \
  --summary "Login fails on expired token" \
  --priority High

# acli: update priority on an existing issue
acli jira issue edit PHX-123 --priority Highest

# acli --json: read the current priority
acli jira issue view PHX-123 --json | jq -r '.fields.priority.name // "None"'
```

If the priority value is rejected, it is not part of the project's priority scheme. List the legal values from the create/edit metadata and pick a valid one:

```bash
# acli: list allowed priority values for the project/issue type
acli jira issue view PHX-123 --json | jq -r '.fields.priority.name'
```

---

## Adding Comments

```bash
# acli (mirrors the simplicity of `glab issue note`)
acli jira issue comment PHX-123 --body "Implementation complete; ready for review."
```

---

## Issue Hierarchy via Unified `parent` Field

### Hierarchy Model

JIRA Cloud (team-managed / next-gen projects) uses a single unified `parent` field for all parent-child relationships:

```
Epic
 └── Story  (fields.parent.key = {epic-key})
      └── Sub-task  (fields.parent.key = {story-key})
```

Hierarchy is established by setting `fields.parent` to the parent issue's key on the child. There is **no separate link type** for this relationship:

- **NOT** the GitLab `relates_to` link model.
- **NOT** the classic `Epic Link` custom field — the unified `parent` field supersedes it on Cloud.

### Set Parent

```bash
# acli
acli jira issue edit PHX-123 --parent PHX-100
```

### Read Children of a Parent

```bash
# acli: JQL on parent
acli jira issue search --jql 'parent = PHX-100'
```

### Read a Child's Parent

The child's parent key is available in the `fields.parent.key` field returned by the fetch operation (see Fetching a Single Issue):

```bash
# acli --json
acli jira issue view PHX-123 --json | jq -r '.fields.parent.key // "none"'
```

---

## Transition / Status Update

`acli` transitions an issue by target status name directly:

```bash
# acli: transition by status name
acli jira issue transition PHX-123 --transition "In Progress"
```

If the requested status is not a legal transition from the issue's current state, list the available transitions and pick a valid one:

```bash
# acli: list available transitions for the issue
acli jira issue transitions PHX-123
```

---

## Error Handling

```
❌ Error: Issue not found

PHX-123 does not exist or you lack access.

To fix:
- Verify the key format: ^[A-Z][A-Z0-9]+-[0-9]+$ (e.g. PHX-123) — see Issue Key Format Validation above
- Verify project access (Browse Projects permission on PHX)
- Confirm authentication — run the pre-flight in authentication.md (`acli jira auth status`)
```

```
❌ Error: Authentication failed

acli is not authenticated for the JIRA site.

To fix:
- See authentication.md and ensure `acli` is authenticated, then re-run the pre-flight (`acli jira auth status`)
```

```
❌ Error: Invalid transition

'<status>' is not a legal transition from the issue's current state.

To fix:
- List valid transitions: acli jira issue transitions PHX-123
- Pick a transition from that list and retry
```

```
(optional) ❌ Error: Permission denied

The authenticated account lacks permission for this operation on PHX.

To fix:
- Ensure the account has the required project permission (e.g. Transition Issues, Edit Issues)
- See authentication.md for the required project permissions
```

---

## See Also

- [authentication.md](authentication.md) — JIRA Cloud credentials, login flow, and pre-flight verification.

---

**Version**: 1.0.0
**Last Updated**: 2026-06-17
**Status**: Active
**Platform**: JIRA (Cloud)
