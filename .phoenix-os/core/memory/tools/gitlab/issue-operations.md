# GitLab Issue Operations

This document defines the implementation methods (HOW) for GitLab issue operations in Phoenix OS.

**Memory Type**: Long-term memory (LT) - Provides implementation patterns for agents.

**Role**: Agents read this memory to understand HOW to execute GitLab operations. Commands do NOT pass this to agents; agents discover and read it independently.

**Memory Path**: `${config.memory.tools.gitlab.issue-operations}`

**CRITICAL REQUIREMENT**: GitLab does not have native issue types like GitHub. Issue types are represented by **labels** (e.g., `type::story`, `type::bug`, `type::epic`). Always read labels to determine type. Never infer type from title alone.

## GitLab Issue Types (via Labels)

### Convention for This Project

Issue types are tracked using scoped labels with the `type::` prefix:

- **type::epic** — Large initiative spanning multiple sprints
- **type::feature** — Specific capability or functionality
- **type::story** — User perspective functionality for single sprint
- **type::task** — A specific piece of implementation work
- **type::bug** — An unexpected problem or behavior
- **type::chore** — Maintenance task (refactoring, dependencies, tooling)

### Reading Issue Type from Labels

```bash
# Get issue with labels
glab issue view {issue-number} --output json | jq '.labels'

# Extract type label specifically
glab issue view {issue-number} --output json | jq '.labels[] | select(startswith("type::"))'
```

**Mapping label to type name**:
```
"type::epic"    → "Epic"
"type::feature" → "Feature"
"type::story"   → "Story"
"type::task"    → "Task"
"type::bug"     → "Bug"
"type::chore"   → "Chore"
```

If no `type::` label is found → display as "Not Set". Never guess from title.

## Getting Project ID

Many GitLab API calls require a numeric project ID or URL-encoded namespace path.

```bash
# Get project ID via glab api (URL-encode namespace/project path with %2F)
glab api projects/{namespace}%2F{project} | jq '.id'

# Derive the namespace/project path from the remote URL
git config --get remote.origin.url
# Output: git@git.nagarro.com:{namespace}/{project}.git
# Replace each / with %2F to form the URL-encoded path
```

## Fetching a Single Issue

```bash
# View issue details
glab issue view {issue-number}

# View as JSON
glab issue view {issue-number} --output json

# Get specific fields
glab issue view {issue-number} --output json | jq '{
  number: .iid,
  title: .title,
  state: .state,
  description: .description,
  labels: .labels,
  assignees: [.assignees[].username],
  type: (.labels[] | select(startswith("type::")) | ltrimstr("type::") | ascii_upcase) // "Not Set"
}'
```

## Listing Issues

```bash
# List all open issues
glab issue list

# List issues with a specific label
glab issue list --label "type::story"

# List issues assigned to me
glab issue list --assignee @me

# List with JSON output
glab issue list --output json | jq '.[] | {number: .iid, title: .title, labels: .labels}'
```

## Updating Issue Labels (Setting Type)

```bash
# Add a type label to an issue
glab issue update {issue-number} --label "type::story"

# Replace all labels (careful — removes existing labels too)
glab issue update {issue-number} --label "type::story,in-progress"
```

## Adding Comments to Issues

```bash
glab issue note {issue-number} -m "{comment}"
```

## Issue Hierarchy

### Project Hierarchy Model

This project uses the following structure in GitLab:

```
Epic
 ├── Feature (relates_to link + description: "Parent Epic: #{epic-iid}")
 └── Feature (relates_to link + description: "Parent Epic: #{epic-iid}")

Feature
 ├── Story (relates_to link + description: "Parent Feature: #{feature-iid}")
 └── Story (relates_to link + description: "Parent Feature: #{feature-iid}")
```

**Key rule**: BOTH Epic→Feature AND Feature→Story edges are tracked via `relates_to` issue links. Tree reconstruction reads link data AND parses `Parent Epic:` / `Parent Feature:` description lines — both must agree.

### Fetching Features Linked to an Epic

```bash
# Get all issues linked to an epic
glab api projects/{project-id}/issues/{epic-iid}/links \
  | jq '.[] | {iid: .iid, title: .title, labels: .labels, state: .state}'

# Filter only feature-type linked issues
glab api projects/{project-id}/issues/{epic-iid}/links \
  | jq '.[] | select(.labels[] | contains("type::feature")) | {iid, title, state}'
```

### Fetching Stories Linked to a Feature

```bash
# Get all issues linked to a feature
glab api projects/{project-id}/issues/{feature-iid}/links \
  | jq '.[] | {iid: .iid, title: .title, labels: .labels, state: .state}'

# Filter only story-type linked issues
glab api projects/{project-id}/issues/{feature-iid}/links \
  | jq '.[] | select(.labels[] | contains("type::story")) | {iid, title, state}'
```

### Linking a Feature to an Epic

```bash
# Link feature as related to epic (establishes Epic→Feature relationship)
glab api projects/{project-id}/issues/{epic-iid}/links \
  --method POST \
  --field target_project_id={project-id} \
  --field target_issue_iid={feature-iid}

# Then update the feature description to include the parent reference
EXISTING=$(glab issue view {feature-iid} --output json | jq -r '.description')
glab issue update {feature-iid} --description "${EXISTING}

Parent Epic: #{epic-iid}"
```

### Linking a Story to a Feature

```bash
# Link story as related to feature (establishes Feature→Story relationship)
glab api projects/{project-id}/issues/{feature-iid}/links \
  --method POST \
  --field target_project_id={project-id} \
  --field target_issue_iid={story-iid}

# Then update the story description to include the parent reference
EXISTING=$(glab issue view {story-iid} --output json | jq -r '.description')
glab issue update {story-iid} --description "${EXISTING}

Parent Feature: #{feature-iid}"
```

### Hierarchy Conventions

- **Epic issues**: Use label `type::epic`. Link Features via `relates_to` issue links.
- **Feature issues**: Use label `type::feature`. Link Stories via `relates_to` issue links. Include `Parent Epic: #{epic-iid}` in description.
- **Story issues**: Use label `type::story`. Include `Parent Feature: #{feature-iid}` in description.

### Checking Feature Completion

```bash
# Get all linked stories and their states
glab api projects/{project-id}/issues/{feature-iid}/links \
  | jq '{
      total: length,
      open: [.[] | select(.state == "opened")] | length,
      closed: [.[] | select(.state == "closed")] | length
    }'
```

## Authentication

```bash
# One-time login
glab auth login --hostname git.nagarro.com

# Verify
glab auth status
```

**Create token at**: `https://git.nagarro.com/-/user_settings/personal_access_tokens`
**Required scopes**: `api`, `read_user`, `write_repository`

## Error Handling

### Issue Not Found

```
❌ Error: Issue not found

Issue #{number} does not exist or you lack access.

To fix:
- Verify issue number: glab issue list
- Check repository access permissions
- Ensure you are authenticated: glab auth status
```

### Authentication Failed

```
❌ Error: Authentication failed / 401 Unauthorized

To fix:
glab auth login --hostname git.nagarro.com
glab auth status

Ensure token has api + read_user + write_repository scopes.
Create at: https://git.nagarro.com/-/user_settings/personal_access_tokens
```

### Label Not Found

```
❌ Error: Label type::story does not exist

To fix:
Create label in GitLab project → Labels → New label
Name: type::story, Color: any
```

---

**Version**: 1.1.0
**Last Updated**: 2026-04-27
**Status**: Active
**Platform**: GitLab (self-hosted: git.nagarro.com)
