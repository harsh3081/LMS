# GitLab Commit Operations

This document defines commit, branch, and push operations for GitLab in Phoenix OS.

**Memory Type**: Long-term memory (LT) - Provides implementation patterns for agents.

**Note**: Commit and branch operations are git-native and identical across platforms. This file covers the GitLab-specific parts: pushing branches, setting upstream, and push conventions for the `git.nagarro.com` remote.

**Memory Path**: `${config.memory.tools.gitlab.commit-operations}`

## Commit Guidelines

Follow the same conventional commit format as defined in:
`${config.memory.tools.git.commit-guidelines}`

Commit format is platform-agnostic. The same rules apply on GitLab.

## Pushing Branches to GitLab

### Push Current Branch (First Time)

```bash
# Push and set upstream tracking
git push -u origin {branch-name}

# Example: push a story branch
git push -u origin story/{number}-{slug}
```

### Push Subsequent Commits

```bash
git push
# or
git push origin {branch-name}
```

### Force Push (After Rebase — Use with Caution)

```bash
# Safe force push — fails if someone else pushed
git push --force-with-lease origin {branch-name}

# Never use --force on shared/target branches
```

## Branch Naming Convention

Same as GitHub — derived from issue type and number:

```
story/{number}-{title-slug}       e.g. story/172-user-profile
feature/{number}-{title-slug}     e.g. feature/19-kpi-dashboard
bug/{number}-{title-slug}         e.g. bug/121-login-timeout
task/{number}-{title-slug}        e.g. task/99-update-dependencies
```

## Worktree Creation for GitLab

```bash
# Create worktree from current branch (CRITICAL: always from current branch)
git worktree add -b {branch-name} {worktree-path}/issue-{number}

# Push the new branch to GitLab origin
cd {worktree-path}/issue-{number}
git push -u origin {branch-name}
```

**CRITICAL**: Always cut the worktree branch from the **current checked-out branch**, never from `main` or `origin/main` directly.

## Verifying Remote After Push

```bash
# Confirm branch exists on GitLab remote
git ls-remote origin {branch-name}

# View remote branches
git branch -r | grep origin/{branch-name}
```

## Checking Push Status

```bash
# Check if local is ahead of remote
git status

# See commits not yet pushed
git log origin/{branch-name}..HEAD --oneline

# Confirm remote tracking
git branch -vv
```

## Common Workflows

### Workflow: Commit and Push Story Branch

```bash
# Stage specific files
git add {file1} {file2}

# Commit with conventional message
git commit -m "$(cat <<'EOF'
feat(story-{number}): {description}

{optional body}

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"

# Push to GitLab
git push origin {branch-name}
```

### Workflow: Create Worktree and Push

```bash
# From current feature branch
git worktree add -b story/{number}-{slug} {worktree-path}/issue-{number}
cd {worktree-path}/issue-{number}
git push -u origin story/{number}-{slug}
echo "Worktree ready and branch pushed to GitLab"
```

## Error Handling

### Remote Rejected (Protected Branch)

```
❌ Error: remote: GitLab: You are not allowed to push code to protected branches

To fix:
- Never push directly to main, develop, or other long-lived/protected branches
- Always work on a dedicated story/bug/task branch
- Create an MR to merge into the target branch
```

### Authentication Error on Push

```
❌ Error: Permission denied (publickey)

To fix:
- Ensure SSH key is added to GitLab: Settings → SSH Keys
- Test: ssh -T git@git.nagarro.com
- Alternative: Switch to HTTPS remote and use token
  git remote set-url origin https://git.nagarro.com/{namespace}/{project}.git
```

### Push Rejected (Non-Fast-Forward)

```
❌ Error: Updates were rejected because the remote contains work you do not have locally

To fix:
git fetch origin {branch-name}
git rebase origin/{branch-name}
git push origin {branch-name}
```

## GitLab-Specific Notes

- **MR Auto-Creation**: After pushing, GitLab prints an MR creation URL in the terminal — use it to quickly open an MR
- **Pipeline Trigger**: Every push to a branch triggers GitLab CI pipelines (if `.gitlab-ci.yml` exists)
- **Branch Protection**: `main` and other long-lived branches are typically protected — always work on dedicated story/bug/task branches

---

**Version**: 1.1.0
**Last Updated**: 2026-04-27
**Status**: Active
**Platform**: GitLab (self-hosted: git.nagarro.com)
