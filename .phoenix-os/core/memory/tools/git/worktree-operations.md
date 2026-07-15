# Git Worktree Operations

This document defines git worktree command patterns for managing isolated development environments in Phoenix OS.

## Overview

Worktrees enable multiple working directories from a single repository, allowing parallel work on different branches without switching contexts or stashing changes.

## Listing Worktrees

### Show All Worktrees
```bash
git worktree list
```
Shows all worktrees with paths, branches, and commit hashes.

### Porcelain Format
```bash
git worktree list --porcelain
```
Machine-readable output for parsing.

## Creating Worktrees

### Basic Worktree Creation
```bash
# Create worktree with existing branch
git worktree add <path> <branch>

# Example: Create worktree for existing feature branch
git worktree add ../feature-123 feature/123-bug-fix
```

### Create Worktree with New Branch
```bash
# Create new branch and worktree simultaneously
git worktree add -b <new-branch> <path>

# Example: Create new feature branch in worktree
git worktree add -b feature/456-new-feature ../feature-456
```

### Create Worktree from Issue
```bash
# Pattern: Create branch from issue number
issue_number=123
branch_name="bug/fix-${issue_number}"
worktree_path="../issue-${issue_number}"

git worktree add -b "$branch_name" "$worktree_path"
```

### Create Worktree with Base Branch
```bash
# Create new branch from specific base
git worktree add -b <new-branch> <path> <base-branch>

# Example: Branch from main
git worktree add -b feature/789 ../feature-789 main
```

## Worktree Naming Conventions

### Branch Naming by Type
```bash
# Bug fixes
bug/fix-{issue-number}
bug/fix-{issue-number}-{short-description}

# Features
feature/{issue-number}-{short-description}

# Chores
chore/{issue-number}-{short-description}

# Refactoring
refactor/{issue-number}-{short-description}
```

### Worktree Path Conventions
```bash
# Relative to main repository
../issue-{number}           # Generic issue worktree
../bug-{number}             # Bug fix worktree
../feature-{number}         # Feature worktree
../epic-{number}            # Epic worktree

# Absolute paths (when needed)
/path/to/worktrees/phoenix-issue-{number}
```

## Removing Worktrees

### Remove Worktree by Path
```bash
git worktree remove <path>

# Example
git worktree remove ../feature-123
```

### Force Remove (with uncommitted changes)
```bash
git worktree remove --force <path>
```

### Prune Deleted Worktrees
```bash
# Clean up administrative files for manually deleted worktrees
git worktree prune
```

## Working with Worktrees

### Check Current Worktree
```bash
# Get current worktree path
git rev-parse --show-toplevel

# Check if in worktree
git rev-parse --git-common-dir
```

### Push Branch from Worktree
```bash
# First push - set upstream
git push -u origin <branch-name>

# Subsequent pushes
git push
```

### Delete Branch After Worktree Removal
```bash
# Remove worktree first
git worktree remove ../feature-123

# Then delete branch
git branch -d feature/123-bug-fix

# Force delete if needed
git branch -D feature/123-bug-fix
```

## Common Workflows

### Workflow 1: Start Work on Issue
```bash
# 1. Get issue details (assume issue #145)
issue_number=145
branch_name="bug/fix-${issue_number}"
worktree_path="../issue-${issue_number}"

# 2. Create worktree with new branch
git worktree add -b "$branch_name" "$worktree_path" main

# 3. Navigate to worktree
cd "$worktree_path"

# 4. Push branch to origin
git push -u origin "$branch_name"

# 5. Verify setup
git status
git worktree list
```

### Workflow 2: Multiple Parallel Issues
```bash
# Create multiple worktrees for parallel work
git worktree add -b bug/fix-123 ../issue-123 main
git worktree add -b feature/456 ../issue-456 main
git worktree add -b chore/789 ../issue-789 main

# Work on each independently
cd ../issue-123  # Work on bug
cd ../issue-456  # Work on feature
cd ../issue-789  # Work on chore
```

### Workflow 3: Clean Up Completed Work
```bash
# 1. Ensure all changes are committed and pushed
cd ../issue-123
git status
git push

# 2. Return to main repository
cd ../main-repo

# 3. Remove worktree
git worktree remove ../issue-123

# 4. Delete branch (if merged)
git branch -d bug/fix-123

# 5. Clean up any stale references
git worktree prune
```

### Workflow 4: Create Epic Worktree
```bash
# For long-running epic work
epic_number=66
branch_name="epic/${epic_number}-structured-planning"
worktree_path="../epic-${epic_number}"

# Create from main
git worktree add -b "$branch_name" "$worktree_path" main

# Navigate and push
cd "$worktree_path"
git push -u origin "$branch_name"
```

## Worktree Validation

### Check Worktree Status
```bash
# Verify worktree exists
git worktree list | grep -q "<path>" && echo "Exists" || echo "Not found"

# Count active worktrees
git worktree list | wc -l
```

### Verify Branch in Worktree
```bash
# From worktree directory
git branch --show-current

# Verify it's pushed to origin
git rev-parse --abbrev-ref --symbolic-full-name @{u}
```

### Check for Uncommitted Changes
```bash
# From worktree directory
git status --porcelain

# Exit code 0 if clean, 1 if dirty
test -z "$(git status --porcelain)" && echo "Clean" || echo "Dirty"
```

## Error Handling

### Worktree Path Already Exists
```bash
$ git worktree add ../issue-123 feature-branch
# fatal: '../issue-123' already exists
```
**Solution**: Use different path or remove existing directory
**Check**: `ls ../issue-123` to verify contents

### Branch Already Checked Out
```bash
$ git worktree add ../issue-123 main
# fatal: 'main' is already checked out at '/path/to/main-repo'
```
**Solution**: Branches can only be checked out in one worktree at a time
**Action**: Create new branch instead

### Branch Already Exists
```bash
$ git worktree add -b feature/123 ../issue-123
# fatal: a branch named 'feature/123' already exists
```
**Solution**: Use existing branch or choose different name
**Check**: `git branch -a | grep feature/123`

### Cannot Remove Worktree with Changes
```bash
$ git worktree remove ../issue-123
# fatal: '../issue-123' contains modified or untracked files
```
**Solution**: Commit or stash changes first, or use `--force`
**Check**: `cd ../issue-123 && git status`

### Worktree Locked
```bash
$ git worktree remove ../issue-123
# fatal: '../issue-123' is locked
```
**Solution**: Unlock worktree first
**Action**: `git worktree unlock ../issue-123`

## Best Practices

1. **Naming Consistency**: Use issue numbers in both branch and worktree path
2. **Directory Structure**: Keep worktrees in parallel directories to main repo
3. **Branch Tracking**: Always push branch to origin with `-u` on first push
4. **Clean Up**: Remove worktrees when work is complete to avoid clutter
5. **Validation**: Check worktree status before removal
6. **Path Selection**: Use relative paths for flexibility across environments
7. **Issue Linking**: Embed issue number in branch name for traceability
8. **Prune Regularly**: Run `git worktree prune` to clean stale references

## Integration with Phoenix OS Workflows

### Start Work Command
```bash
# Expected behavior for /start-work #123
# 1. Validate issue exists
# 2. Create branch: bug/fix-123 (or appropriate type)
# 3. Create worktree: ../issue-123
# 4. Push branch to origin
# 5. Return worktree path for navigation
```

### End Work Command (Future)
```bash
# Expected behavior for /end-work
# 1. Verify all changes committed
# 2. Verify branch pushed
# 3. Return to main repository
# 4. Remove worktree
# 5. Optionally delete local branch after merge
```

## References

- Git Worktree Documentation: https://git-scm.com/docs/git-worktree
- Commit Operations: `${config.memory.tools.github.path}commit-operations.md`
- Branch Naming: `${config.memory.tools.git.path}commit-guidelines.md`
