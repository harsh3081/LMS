# GitLab Merge Request Operations

This document defines the implementation methods for GitLab Merge Request (MR) operations in Phoenix OS.

**Memory Type**: Long-term memory (LT) - Provides implementation patterns for agents.

**Note**: GitLab calls them **Merge Requests (MRs)**, not Pull Requests. The concepts are equivalent.

**Memory Path**: `${config.memory.tools.gitlab.pr-operations}`

## Creating a Merge Request

### Implementation

```bash
# Create MR interactively
glab mr create

# Create MR with all details
glab mr create \
  --title "{title}" \
  --description "{description}" \
  --source-branch {source-branch} \
  --target-branch {target-branch} \
  --label "{label1},{label2}" \
  --assignee {username}

# Create MR targeting a specific branch (e.g. release/next)
glab mr create \
  --title "feat(story-{number}): {title}" \
  --description "{description}" \
  --target-branch {long-lived-branch} \
  --remove-source-branch

# Create as draft
glab mr create --draft --title "Draft: {title}"
```

## Listing Merge Requests

### Implementation

```bash
# List open MRs
glab mr list

# List MRs for current branch
glab mr list --source-branch $(git branch --show-current)

# List with JSON output
glab mr list --output json | jq '.[] | {iid: .iid, title: .title, state: .state, source: .source_branch}'

# List MRs targeting a specific branch
glab mr list --target-branch {long-lived-branch}
```

## Viewing an MR

### Implementation

```bash
# View MR details
glab mr view {mr-number}

# View as JSON
glab mr view {mr-number} --output json

# View diff
glab mr diff {mr-number}

# Check MR status (CI pipelines, approvals)
glab mr view {mr-number} --output json | jq '{
  number: .iid,
  title: .title,
  state: .state,
  source: .source_branch,
  target: .target_branch,
  mergeable: .merge_status,
  approved: .approved,
  pipeline: .head_pipeline.status
}'
```

## Reviewing an MR (Approve / Request Changes)

### Implementation

```bash
# Approve an MR
glab mr approve {mr-number}

# Revoke approval
glab mr revoke {mr-number}

# Add a comment/review note
glab mr note {mr-number} -m "{comment}"
```

## Merging an MR

### Implementation

```bash
# Merge when pipeline succeeds
glab mr merge {mr-number}

# Merge immediately (skip pipeline wait)
glab mr merge {mr-number} --when-pipeline-succeeds=false

# Squash and merge
glab mr merge {mr-number} --squash

# Merge with custom commit message
glab mr merge {mr-number} --squash-message "{commit-message}"

# Delete source branch after merge
glab mr merge {mr-number} --remove-source-branch
```

## Analyzing MR Changes

### Implementation

```bash
# Get diff statistics against target branch
git diff --stat {target-branch}...HEAD

# List changed files
git diff --name-status {target-branch}...HEAD

# Show commits in this MR
git log --oneline {target-branch}..HEAD

# View full diff of an MR
glab mr diff {mr-number}
```

## Closing Related Issues

GitLab automatically closes issues when an MR is merged if the MR description contains:

```
Closes #{issue-number}
Fixes #{issue-number}
Resolves #{issue-number}
```

Include this in every MR description:

```markdown
## Summary
{description of changes}

Closes #{issue-number}
```

## MR Description Template

Follow this structure for all MRs in Phoenix OS:

```markdown
## Summary
- {bullet 1}
- {bullet 2}
- {bullet 3}

## Changes
### Backend
- {change description}

### Frontend
- {change description}

## Test Plan
- [ ] Unit tests pass (`npm test`)
- [ ] Integration tests pass
- [ ] Manual testing completed

Closes #{issue-number}
```

## Checking CI Pipeline Status

```bash
# View pipeline status for current branch
glab pipeline status

# View pipeline for specific MR
glab mr view {mr-number} --output json | jq '.head_pipeline | {id, status, web_url}'

# List recent pipelines
glab pipeline list
```

## Authentication

```bash
glab auth login --hostname git.nagarro.com
glab auth status
```

**Required scopes**: `api`, `read_user`, `write_repository`
**Create token at**: `https://git.nagarro.com/-/user_settings/personal_access_tokens`

## Error Handling

### MR Already Exists

```
❌ Error: Merge request already exists for this source branch

To fix:
glab mr list --source-branch {branch} to find the existing MR
Update existing MR: glab mr update {mr-number} --description "{new-description}"
```

### Cannot Merge (Conflicts)

```
❌ Error: Merge conflicts detected

To fix:
git fetch origin {target-branch}
git rebase origin/{target-branch}
Resolve conflicts, then: git push --force-with-lease
```

### Cannot Merge (Pipeline Failed)

```
❌ Error: Pipeline must succeed before merge

To fix:
Check pipeline: glab pipeline status
View failures: glab pipeline view {pipeline-id}
Fix failing tests and push new commit
```

### Authentication Failed

```
❌ Error: 401 Unauthorized

To fix:
glab auth login --hostname git.nagarro.com
glab auth status

Ensure token has api + read_user + write_repository scopes.
Create at: https://git.nagarro.com/-/user_settings/personal_access_tokens
```

---

**Version**: 1.1.0
**Last Updated**: 2026-04-27
**Status**: Active
**Platform**: GitLab (self-hosted: git.nagarro.com)
