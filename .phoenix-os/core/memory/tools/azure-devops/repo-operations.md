# Azure Repos Operations

This document defines the implementation methods for Azure Repos Git operations in Phoenix OS.

## Prerequisites

### Authentication Setup
```bash
# Same authentication as work-item-operations.md
az login
az devops configure --defaults organization=https://dev.azure.com/{organization} project={project}

# Verify Git credential helper is configured
git config --global credential.helper
# Should show: manager-core (Windows) or osxkeychain (macOS) or cache (Linux)
```

### Git Remote URL Format
```bash
# Azure Repos HTTPS URL format
https://dev.azure.com/{organization}/{project}/_git/{repository}

# Example
https://dev.azure.com/contoso/MyProject/_git/phoenix-os

# SSH URL format (alternative)
git@ssh.dev.azure.com:v3/{organization}/{project}/{repository}
```

## Repository Information

### Get Repository Details
```bash
# List all repositories in project
az repos list --output table

# Get specific repository details
az repos show --repository {repo-name} --output json

# Get repository ID
az repos show --repository {repo-name} --query id --output tsv

# Get default branch
az repos show --repository {repo-name} --query defaultBranch --output tsv

# Example: Get phoenix-os repository details
az repos show --repository phoenix-os
```

### Get Repository URL
```bash
# Get clone URL (HTTPS)
az repos show --repository {repo-name} --query webUrl --output tsv

# Get remote URL from local git config
git config --get remote.origin.url
```

## Branch Operations

### List Branches
```bash
# List all branches in repository
az repos ref list --repository {repo-name} --filter heads

# List only branch names
az repos ref list --repository {repo-name} --filter heads --query "[].name" --output tsv

# Get current branch locally
git branch --show-current

# Example: List branches in phoenix-os
az repos ref list --repository phoenix-os --filter heads
```

### Create Branch
```bash
# Create branch from main
az repos ref create \
  --name refs/heads/feature/azure-devops-support \
  --repository {repo-name} \
  --object-id $(az repos ref list --repository {repo-name} --filter heads/main --query "[0].objectId" --output tsv)

# Simplified: Create branch locally and push
git checkout -b issue-{number}
git push -u origin issue-{number}

# Phoenix OS pattern: Create issue branch
ISSUE_NUMBER=290
BRANCH_NAME="issue-$ISSUE_NUMBER"
git checkout -b $BRANCH_NAME
git push -u origin $BRANCH_NAME

# Example: Create branch for work item #290
git checkout -b issue-290
git push -u origin issue-290
```

### Get Branch Information
```bash
# Get specific branch details
az repos ref list --repository {repo-name} --filter heads/{branch-name}

# Get branch commit SHA
az repos ref list --repository {repo-name} --filter heads/{branch-name} --query "[0].objectId" --output tsv

# Check if branch exists
az repos ref list --repository {repo-name} --filter heads/{branch-name} --query "[].name" --output tsv
```

### Delete Branch
```bash
# Delete remote branch
az repos ref delete \
  --name refs/heads/{branch-name} \
  --repository {repo-name} \
  --object-id $(az repos ref list --repository {repo-name} --filter heads/{branch-name} --query "[0].objectId" --output tsv)

# Simplified: Delete via git
git push origin --delete {branch-name}

# Delete local branch
git branch -d {branch-name}
```

## Commit Operations

### View Commits
```bash
# List recent commits
az repos ref list --repository {repo-name} --filter heads/main --query "[0].objectId" --output tsv | xargs -I {} az devops invoke --area git --resource commits --route-parameters project={project} repositoryId={repo-name} --query-parameters searchCriteria.itemVersion.version={}

# Simplified: Use git log
git log --oneline -10

# Get commit details by SHA
git show {commit-sha}

# Get commit message
git log -1 --pretty=%B {commit-sha}
```

### Commit Changes (Local)
```bash
# Stage changes
git add .

# Create commit (Phoenix OS pattern with co-author)
git commit -m "$(cat <<'EOF'
feat: add Azure DevOps platform support

Implement platform abstraction layer for Azure DevOps.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
EOF
)"

# Push commits to Azure Repos
git push origin {branch-name}

# Push with upstream tracking
git push -u origin {branch-name}
```

### Phoenix OS Commit Pattern
```bash
# Create structured commit for Phoenix OS
COMMIT_MESSAGE="feat: implement Azure DevOps work item operations

Add work-item-operations.md memory file with CLI patterns.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"

git add core/memory/tools/azure-devops/work-item-operations.md
git commit -m "$COMMIT_MESSAGE"
git push origin issue-290
```

## Push Operations

### Push to Azure Repos
```bash
# Push current branch
git push origin $(git branch --show-current)

# Push with upstream tracking (first time)
git push -u origin {branch-name}

# Force push (use with caution)
git push --force-with-lease origin {branch-name}

# Verify push succeeded
git status
```

### Authentication for Push
```bash
# Azure Repos uses Git Credential Manager
# Credentials are cached after first push

# If authentication fails, re-login
az login

# Verify cached credentials
git credential-manager-core get <<EOF
protocol=https
host=dev.azure.com
path={organization}/{project}/_git/{repository}
EOF
```

## Worktree Integration (Phoenix OS Pattern)

### Create Worktree for Issue
```bash
# Phoenix OS uses worktrees for issue isolation
# Worktree base path: ../worktrees/phoenix-os/issue-{number}

ISSUE_NUMBER=290
WORKTREE_PATH="../worktrees/phoenix-os/issue-$ISSUE_NUMBER"
BRANCH_NAME="issue-$ISSUE_NUMBER"

# Create worktree with new branch
git worktree add -b $BRANCH_NAME $WORKTREE_PATH origin/main

# Navigate to worktree
cd $WORKTREE_PATH

# Verify worktree setup
git branch --show-current
# Output: issue-290

# Push worktree branch to Azure Repos
git push -u origin $BRANCH_NAME
```

### Worktree Cleanup
```bash
# After PR merge, clean up worktree
cd {main-repo-path}
git worktree remove issue-{number}
git branch -d issue-{number}
git push origin --delete issue-{number}
```

## Remote Operations

### Configure Azure Repos Remote
```bash
# Add Azure Repos as origin
git remote add origin https://dev.azure.com/{organization}/{project}/_git/{repository}

# Verify remote configuration
git remote -v

# Update remote URL
git remote set-url origin https://dev.azure.com/{organization}/{project}/_git/{repository}

# Fetch from Azure Repos
git fetch origin

# Pull from Azure Repos
git pull origin main
```

### Work with Multiple Remotes
```bash
# Add GitHub as secondary remote
git remote add github https://github.com/{org}/{repo}.git

# Add Azure Repos as primary remote
git remote add origin https://dev.azure.com/{organization}/{project}/_git/{repository}

# Push to specific remote
git push origin main
git push github main

# Set default upstream
git branch --set-upstream-to=origin/main main
```

## File Operations

### Get File from Repository
```bash
# Get file content from specific branch
az repos ref list --repository {repo-name} --filter heads/{branch-name} --query "[0].objectId" --output tsv

# Simplified: Use git commands
git show origin/{branch-name}:path/to/file.md

# Get file from specific commit
git show {commit-sha}:path/to/file.md
```

## Conflict Resolution

### Handle Merge Conflicts
```bash
# Pull latest changes
git pull origin main

# If conflicts occur
git status  # Shows conflicted files

# Resolve conflicts in editor, then:
git add {resolved-file}
git commit -m "chore: resolve merge conflicts"
git push origin {branch-name}
```

### Rebase Branch
```bash
# Update branch with latest main
git fetch origin
git rebase origin/main

# If conflicts during rebase
git rebase --continue  # After resolving conflicts
git rebase --abort     # Cancel rebase

# Force push after rebase
git push --force-with-lease origin {branch-name}
```

## Mapping GitHub to Azure Repos

### Operation Mapping
| GitHub Operation | Azure Repos Equivalent | Notes |
|------------------|------------------------|-------|
| `gh repo clone` | `git clone https://dev.azure.com/{org}/{project}/_git/{repo}` | Standard git clone |
| `gh repo view` | `az repos show --repository {repo}` | Repository details |
| `gh pr create` | See pr-operations.md | Pull request creation |
| `git push origin` | `git push origin` | Identical git commands |
| `git pull origin` | `git pull origin` | Identical git commands |

### Authentication Mapping
| GitHub | Azure Repos | Notes |
|--------|-------------|-------|
| `gh auth login` (keyring) | `az login` (keyring) | Both use secure credential storage |
| Personal Access Token | Not needed with `az login` | CLI handles auth automatically |
| Git Credential Manager | Git Credential Manager | Same tool, different provider |

## Phoenix OS Integration Patterns

### Start Work on Issue
```bash
# Triggered by /impl:start-work command
# 1. Fetch work item details
WORK_ITEM_ID=290
az boards work-item show --id $WORK_ITEM_ID

# 2. Create worktree and branch
WORKTREE_PATH="../worktrees/phoenix-os/issue-$WORK_ITEM_ID"
git worktree add -b issue-$WORK_ITEM_ID $WORKTREE_PATH origin/main

# 3. Push branch to Azure Repos
cd $WORKTREE_PATH
git push -u origin issue-$WORK_ITEM_ID

# 4. Update work item state to Active
az boards work-item update --id $WORK_ITEM_ID --state "Active"
```

### Commit Work
```bash
# Triggered by /impl:commit command
# 1. Stage changes
git add .

# 2. Create structured commit
git commit -m "$(cat <<EOF
feat: implement Azure DevOps support

Add platform abstraction layer and tool memory.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
EOF
)"

# 3. Push to Azure Repos
git push origin issue-$WORK_ITEM_ID

# 4. Trigger PR creation (see pr-operations.md)
```

## Error Handling

### Common Errors and Solutions

**Error: "fatal: Authentication failed"**
```bash
# Solution: Re-authenticate
az login
git push origin {branch-name}
```

**Error: "fatal: refusing to merge unrelated histories"**
```bash
# Solution: Allow unrelated histories (use with caution)
git pull origin main --allow-unrelated-histories
```

**Error: "error: failed to push some refs"**
```bash
# Solution: Pull latest changes first
git pull origin {branch-name} --rebase
git push origin {branch-name}
```

**Error: "TF401019: The Git repository with name or identifier {repo} does not exist"**
```bash
# Solution: Verify repository name and project
az repos list --output table
az devops configure --list
```

## Best Practices

1. **Use worktrees**: Isolate work per issue (Phoenix OS pattern)
2. **Branch naming**: Use `issue-{number}` for consistency
3. **Commit messages**: Follow conventional commits (feat:, fix:, chore:)
4. **Authentication**: Use `az login` for secure keyring auth
5. **Push early**: Push branches immediately after creation
6. **Rebase vs merge**: Prefer rebase for cleaner history
7. **Force push safety**: Use `--force-with-lease` instead of `--force`
8. **Remote tracking**: Always use `-u` flag on first push

## See Also

- [Azure Repos Git Documentation](https://learn.microsoft.com/en-us/azure/devops/repos/git/)
- [Git Credential Manager](https://github.com/git-ecosystem/git-credential-manager)
- [pr-operations.md](pr-operations.md) - Pull request operations
- [work-item-operations.md](work-item-operations.md) - Work item operations
- [pipeline-operations.md](pipeline-operations.md) - Pipeline operations

---

**Version**: 1.0.0
**Last Updated**: 2025-12-24
**Platform**: Azure Repos (Azure DevOps)
**Authentication**: Azure CLI (az login + Git Credential Manager)
