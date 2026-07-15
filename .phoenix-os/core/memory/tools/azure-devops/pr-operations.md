# Azure DevOps Pull Request Operations

This document defines the implementation methods for Azure DevOps Pull Request operations in Phoenix OS.

## Prerequisites

### Authentication Setup
```bash
# Same authentication as other Azure DevOps operations
az login
az devops configure --defaults organization=https://dev.azure.com/{organization} project={project}
```

## Pull Request Basics

### List Pull Requests
```bash
# List all PRs in repository
az repos pr list --repository {repo-name} --output table

# List active PRs
az repos pr list --repository {repo-name} --status active

# List PRs by creator
az repos pr list --repository {repo-name} --creator {user-email}

# List PRs targeting specific branch
az repos pr list --repository {repo-name} --target-branch main

# Example: List active PRs in phoenix-os
az repos pr list --repository phoenix-os --status active
```

### Get Pull Request Details
```bash
# Get PR by ID
az repos pr show --id {pr-id}

# Get PR with specific fields
az repos pr show --id {pr-id} --query "{id: pullRequestId, title: title, status: status, sourceRef: sourceRefName, targetRef: targetRefName}"

# Get PR reviewers
az repos pr show --id {pr-id} --query "reviewers[].displayName"

# Example: Get details for PR #123
az repos pr show --id 123
```

## Create Pull Request

### Basic PR Creation
```bash
# Create PR from current branch to main
az repos pr create \
  --repository {repo-name} \
  --source-branch $(git branch --show-current) \
  --target-branch main \
  --title "feat: Add Azure DevOps support" \
  --description "Implement platform abstraction layer for Azure DevOps."

# Create PR with work item linking
az repos pr create \
  --repository {repo-name} \
  --source-branch issue-290 \
  --target-branch main \
  --title "feat: Enable Azure DevOps for Phoenix" \
  --description "$(cat <<EOF
## Summary
- Implement platform abstraction layer
- Add Azure DevOps tool memory patterns
- Update agents for platform selection

## Work Item
Closes #290

## Test Plan
- Created work-item-operations.md
- Created repo-operations.md
- Created pr-operations.md
- Updated CLAUDE.md configuration

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)" \
  --work-items 290

# Simplified: Create PR interactively
az repos pr create --repository {repo-name}
# CLI will prompt for title, description, reviewers
```

### Phoenix OS PR Creation Pattern
```bash
# Pattern used by /impl:commit command
WORK_ITEM_ID=290
BRANCH_NAME="issue-$WORK_ITEM_ID"
REPO_NAME="phoenix-os"

# Get work item title for PR title
WORK_ITEM_TITLE=$(az boards work-item show --id $WORK_ITEM_ID --query "fields.\"System.Title\"" --output tsv)

# Create PR with structured body
PR_BODY="## Summary
Implement Azure DevOps platform support for Phoenix OS.

Key Changes:
- Platform configuration schema in CLAUDE.md
- Azure DevOps tool memory files (work-item, repo, pr, pipeline operations)
- Agent updates for platform-aware tool selection

## Work Item
Closes AB#$WORK_ITEM_ID

## Test Plan
- ✅ Created all required memory files
- ✅ Updated CLAUDE.md configuration
- ✅ Validated Azure CLI authentication flow
- ⏳ Integration testing pending Azure DevOps organization access

🤖 Generated with [Claude Code](https://claude.com/claude-code)"

az repos pr create \
  --repository $REPO_NAME \
  --source-branch $BRANCH_NAME \
  --target-branch main \
  --title "$WORK_ITEM_TITLE" \
  --description "$PR_BODY" \
  --work-items $WORK_ITEM_ID \
  --auto-complete true \
  --delete-source-branch true

# Get PR URL
PR_ID=$(az repos pr list --repository $REPO_NAME --source-branch $BRANCH_NAME --status active --query "[0].pullRequestId" --output tsv)
PR_URL="https://dev.azure.com/{organization}/{project}/_git/$REPO_NAME/pullrequest/$PR_ID"
echo "PR created: $PR_URL"
```

## Update Pull Request

### Update PR Fields
```bash
# Update PR title
az repos pr update --id {pr-id} --title "Updated PR title"

# Update PR description
az repos pr update --id {pr-id} --description "Updated description with more details"

# Add reviewers
az repos pr reviewer add --id {pr-id} --reviewers user1@example.com user2@example.com

# Set auto-complete
az repos pr update --id {pr-id} --auto-complete true --delete-source-branch true

# Example: Update PR #123
az repos pr update --id 123 --title "feat: Enhanced Azure DevOps support"
```

### Add Work Item Links
```bash
# Link work item to existing PR
az repos pr work-item add --id {pr-id} --work-items {work-item-id}

# Remove work item link
az repos pr work-item remove --id {pr-id} --work-items {work-item-id}

# List linked work items
az repos pr show --id {pr-id} --query "workItemRefs[].id"

# Example: Link work item #290 to PR #123
az repos pr work-item add --id 123 --work-items 290
```

## PR Review Operations

### Add Reviewers
```bash
# Add required reviewer
az repos pr reviewer add \
  --id {pr-id} \
  --reviewers user@example.com \
  --required

# Add optional reviewer
az repos pr reviewer add \
  --id {pr-id} \
  --reviewers user@example.com

# Remove reviewer
az repos pr reviewer remove --id {pr-id} --reviewers user@example.com
```

### Set Policy Requirements
```bash
# Enable auto-complete (merge when policies pass)
az repos pr update \
  --id {pr-id} \
  --auto-complete true \
  --merge-commit-message "Merged PR {pr-id}: {title}" \
  --delete-source-branch true

# Disable auto-complete
az repos pr update --id {pr-id} --auto-complete false
```

## PR Status and State

### PR Status Values
- **active**: PR is open and under review
- **completed**: PR has been merged
- **abandoned**: PR was closed without merging

### Update PR Status
```bash
# Complete/Merge PR
az repos pr update --id {pr-id} --status completed

# Abandon PR
az repos pr update --id {pr-id} --status abandoned

# Reactivate abandoned PR
az repos pr update --id {pr-id} --status active
```

### Check PR Build Status
```bash
# Get PR policy evaluations (including builds)
az repos pr policy list --id {pr-id} --output table

# Check if all policies passed
az repos pr show --id {pr-id} --query "mergeStatus"
# Output: succeeded, conflicts, failure, queued
```

## Work Item Linking in PRs

### Link Format in Description
```markdown
## Work Item References

# Close single work item
Closes AB#{work-item-id}
Closes #290

# Close multiple work items
Closes AB#290, AB#291, AB#292

# Related work items (doesn't close)
Related to AB#289
```

### Automatic Linking
```bash
# Azure DevOps automatically links work items mentioned in PR:
# - Title containing AB#{id} or #{id}
# - Description containing AB#{id} or #{id}
# - Commits in PR containing AB#{id} or #{id}

# Example PR title with auto-linking
az repos pr create \
  --title "feat: Enable Azure DevOps for Phoenix (#290)" \
  --description "Implement platform abstraction. Closes AB#290" \
  --work-items 290
```

## PR Comments and Discussions

### Add PR Comment
```bash
# Add comment to PR
az repos pr create-comment \
  --id {pr-id} \
  --content "LGTM! Approving this PR."

# Add comment to specific file (review comment)
# Note: File-level comments require REST API
# See Azure DevOps REST API documentation for advanced commenting
```

### List PR Comments
```bash
# Get PR threads (discussions)
az repos pr show --id {pr-id} --query "threads"
```

## Merge Strategies

### Available Merge Types
Azure DevOps supports multiple merge strategies:

1. **Merge (no fast-forward)**: Creates merge commit
2. **Squash**: Squashes all commits into one
3. **Rebase**: Rebases source onto target
4. **Semi-linear**: Rebase then merge

### Configure Merge Strategy
```bash
# Set merge strategy for PR
az repos pr update \
  --id {pr-id} \
  --merge-strategy squash

# Available values:
# - noFastForward (default merge commit)
# - squash (squash commits)
# - rebase (rebase and fast-forward)
# - rebaseMerge (rebase then merge)
```

## PR Policies and Branch Protection

### Common Branch Policies
Azure DevOps branch policies (configured at repository level):
- Require minimum number of reviewers
- Check for linked work items
- Require build validation (Azure Pipelines)
- Require comment resolution
- Limit merge types

### Check Policy Status
```bash
# List policies for PR
az repos pr policy list --id {pr-id}

# Check if policies are satisfied
az repos pr show --id {pr-id} --query "mergeStatus"
# Output: succeeded = all policies passed
```

## GitHub to Azure DevOps PR Mapping

### Operation Mapping
| GitHub (`gh pr`) | Azure DevOps (`az repos pr`) | Notes |
|------------------|------------------------------|-------|
| `gh pr create` | `az repos pr create` | PR creation |
| `gh pr list` | `az repos pr list` | List PRs |
| `gh pr view {number}` | `az repos pr show --id {number}` | View PR details |
| `gh pr merge {number}` | `az repos pr update --id {number} --status completed` | Merge PR |
| `gh pr close {number}` | `az repos pr update --id {number} --status abandoned` | Close PR |
| `gh pr review --approve` | `az repos pr set-vote --id {pr-id} --vote approve` | Approve PR |

### Field Mapping
| GitHub Field | Azure DevOps Field | Notes |
|--------------|-------------------|-------|
| PR number | pullRequestId | Unique PR identifier |
| title | title | Direct mapping |
| body | description | Supports markdown |
| state (open/closed) | status (active/completed/abandoned) | State mapping |
| labels | N/A | Azure DevOps uses tags on work items |
| reviewers | reviewers array | Direct mapping |
| assignees | N/A | Azure DevOps uses reviewers instead |

## Phoenix OS Integration Patterns

### Create PR After Implementation
```bash
# Triggered by /impl:commit command after pushing commits

WORK_ITEM_ID=290
BRANCH_NAME="issue-$WORK_ITEM_ID"
REPO_NAME="phoenix-os"

# 1. Verify branch is pushed
git push origin $BRANCH_NAME

# 2. Get work item details
TITLE=$(az boards work-item show --id $WORK_ITEM_ID --query "fields.\"System.Title\"" --output tsv)

# 3. Create PR with template
PR_BODY="## Summary
[Brief description of changes]

## Work Item
Closes AB#$WORK_ITEM_ID

## Test Plan
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Manual testing completed

🤖 Generated with [Claude Code](https://claude.com/claude-code)"

az repos pr create \
  --repository $REPO_NAME \
  --source-branch $BRANCH_NAME \
  --target-branch main \
  --title "$TITLE" \
  --description "$PR_BODY" \
  --work-items $WORK_ITEM_ID \
  --auto-complete true \
  --delete-source-branch true

# 4. Get PR URL for user
PR_ID=$(az repos pr list --repository $REPO_NAME --source-branch $BRANCH_NAME --status active --query "[0].pullRequestId" --output tsv)
echo "Pull Request created: https://dev.azure.com/{organization}/{project}/_git/$REPO_NAME/pullrequest/$PR_ID"
```

### PR Template Structure
```markdown
## Summary
[1-3 bullet points describing key changes]

## Work Item
Closes AB#{work-item-id}

## Technical Details
[Optional: Architecture decisions, implementation notes]

## Test Plan
- [ ] Unit tests added/updated
- [ ] Integration tests pass
- [ ] Manual testing completed
- [ ] Documentation updated

## Screenshots
[Optional: For UI changes]

🤖 Generated with [Claude Code](https://claude.com/claude-code)
```

## Error Handling

### Common Errors and Solutions

**Error: "TF401027: You need the Git 'PullRequestContribute' permission"**
```bash
# Solution: Request "Contributor" role from project admin
az devops security permission show --id {project-id}
```

**Error: "The source and target branches are the same"**
```bash
# Solution: Verify branch names
git branch --show-current
az repos pr create --source-branch {correct-branch} --target-branch main
```

**Error: "VS403427: The pull request cannot be completed because policies are not met"**
```bash
# Solution: Check policy status and resolve issues
az repos pr policy list --id {pr-id}
az repos pr show --id {pr-id} --query "mergeStatus"
```

**Error: "No work item found with id {work-item-id}"**
```bash
# Solution: Verify work item exists
az boards work-item show --id {work-item-id}
```

## Best Practices

1. **Link work items**: Always use `--work-items` flag for traceability
2. **Structured descriptions**: Use markdown template for consistency
3. **Auto-complete**: Enable for faster merges when policies pass
4. **Delete source branch**: Clean up after merge (`--delete-source-branch true`)
5. **Meaningful titles**: Start with conventional commit prefix (feat:, fix:, etc.)
6. **Comprehensive test plan**: Document all validation steps
7. **Work item closure**: Use "Closes AB#{id}" to auto-close work items
8. **Policy compliance**: Ensure all required policies are met before requesting review

## See Also

- [Azure Repos Pull Request Documentation](https://learn.microsoft.com/en-us/azure/devops/repos/git/pull-requests)
- [Branch Policies](https://learn.microsoft.com/en-us/azure/devops/repos/git/branch-policies)
- [work-item-operations.md](work-item-operations.md) - Work item linking
- [repo-operations.md](repo-operations.md) - Repository operations
- [pipeline-operations.md](pipeline-operations.md) - Pipeline integration

---

**Version**: 1.0.0
**Last Updated**: 2025-12-24
**Platform**: Azure DevOps Pull Requests
**Authentication**: Azure CLI (az login + keyring)
