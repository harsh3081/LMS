# Git Commit Operations

This document defines git command patterns for commit, worktree, and branch operations in Phoenix OS.

## Reviewing Changes

### Check Repository Status
```bash
git status
```
Shows modified, staged, untracked files and current branch.

### View Unstaged Changes
```bash
git diff
```
Shows line-by-line changes for unstaged files.

### View Staged Changes
```bash
git diff --staged
```
Shows line-by-line changes for staged files.

### List Modified Files Only
```bash
git diff --name-only
git diff --staged --name-only
```
Returns only file paths without content diff.

### List Files with Status
```bash
git status --short
```
Compact format showing M (modified), A (added), D (deleted), ?? (untracked).

## Branch Information

### Get Current Branch Name
```bash
git branch --show-current
```
Returns the current branch name.

### List All Branches
```bash
git branch -a
```
Shows local and remote branches.

### List Local Branches Only
```bash
git branch
```
Shows only local branches.

## Staging Changes

### Stage Specific Files
```bash
git add <file1> <file2> <file3>
```
Stages specified files for commit.

### Stage All Changes
```bash
git add -A
```
Stages all modified, deleted, and untracked files.

### Stage by Pattern
```bash
git add '*.md'
git add 'core/commands/**'
```
Stages files matching glob patterns.

### Interactive Staging
```bash
git add -p
```
Interactively stage hunks of changes.

### Unstage Files
```bash
git restore --staged <file>
```
Removes files from staging area.

## Creating Commits

### Basic Commit
```bash
git commit -m "commit message"
```
Creates commit with single-line message.

### Commit with Body
```bash
git commit -m "subject line" -m "body paragraph 1" -m "body paragraph 2"
```
Creates commit with subject and body.

### Commit Using Heredoc (Recommended for Multi-line)
```bash
git commit -m "$(cat <<'EOF'
feat(commands): add commit command

Implement commit command following Issue #145 requirements.
The command follows Fluidic SDLC principles with adaptive
execution and context-aware decision making.

Fixes #145
EOF
)"
```
Allows properly formatted multi-line commit messages.

### Commit Staged Changes
```bash
git commit
```
Opens editor for commit message (use when $EDITOR is configured).

### Amend Last Commit
```bash
git commit --amend
```
Modifies the most recent commit. Use with caution.

## Commit Verification

### View Last Commit
```bash
git log -1
```
Shows the most recent commit details.

### View Commit with Changes
```bash
git show
git show HEAD
```
Displays commit details with diff.

### Get Commit Hash
```bash
git rev-parse HEAD
```
Returns the full commit hash.

### Get Short Commit Hash
```bash
git rev-parse --short HEAD
```
Returns abbreviated commit hash.

## Branch Operations

### Create New Branch
```bash
git branch <branch-name>
```
Creates a new branch without switching to it.

### Create and Switch to Branch
```bash
git checkout -b <branch-name>
# or
git switch -c <branch-name>
```
Creates a new branch and switches to it.

### Switch to Existing Branch
```bash
git checkout <branch-name>
# or
git switch <branch-name>
```
Switches to an existing branch.

### Delete Local Branch
```bash
git branch -d <branch-name>
```
Deletes a branch (safe - prevents deletion if unmerged).

### Force Delete Local Branch
```bash
git branch -D <branch-name>
```
Forces deletion of a branch.

### Rename Current Branch
```bash
git branch -m <new-name>
```
Renames the current branch.

## Worktree Operations

### List Worktrees
```bash
git worktree list
```
Shows all worktrees with their paths and branches.

### Add New Worktree
```bash
git worktree add <path> <branch>
```
Creates a new worktree at the specified path with the given branch.

### Add Worktree with New Branch
```bash
git worktree add -b <new-branch> <path>
```
Creates a new branch and worktree simultaneously.

### Remove Worktree
```bash
git worktree remove <path>
```
Removes a worktree at the specified path.

### Prune Worktrees
```bash
git worktree prune
```
Removes worktree administrative files for deleted worktrees.

## Common Workflows

### Workflow 1: Stage and Commit All Changes
```bash
git add -A
git commit -m "$(cat <<'EOF'
type(scope): subject

Body explaining the changes.

Fixes #123
EOF
)"
```

### Workflow 2: Stage Specific Files
```bash
git add file1.md file2.md file3.md
git commit -m "docs: update documentation files"
```

### Workflow 3: Review Before Commit
```bash
# Check what will be committed
git diff --staged

# If acceptable, commit
git commit -m "commit message"
```

### Workflow 4: Group Commits by Feature
```bash
# First commit: Core functionality
git add core/commands/build/commit.md core/agents/git-operations.md
git commit -m "feat(commands): add commit command and git operations agent"

# Second commit: Documentation
git add docs/commit-guide.md README.md
git commit -m "docs: add commit command documentation"

# Third commit: Memory
git add core/memory/tools/git/commit-operations.md
git commit -m "feat(memory): add git commit operations reference"
```

### Workflow 5: Create Feature Worktree
```bash
# Create new worktree for feature branch
git worktree add ../feature-123 -b feature/123-new-feature

# Work in the new worktree
cd ../feature-123

# When done, remove worktree
cd ../main-worktree
git worktree remove ../feature-123
```

### Workflow 6: Branch Creation and Switching
```bash
# Create and switch to new feature branch
git switch -c feature/new-feature

# Make changes and commit
git add .
git commit -m "feat: implement new feature"

# Switch back to main
git switch main
```

## Error Handling

### Nothing to Commit
```bash
$ git commit -m "message"
# Error: nothing to commit, working tree clean
```
**Solution**: Stage changes first with `git add`

### Empty Commit Message
```bash
$ git commit -m ""
# Error: Aborting commit due to empty commit message
```
**Solution**: Provide a non-empty message

### Not a Git Repository
```bash
$ git status
# fatal: not a git repository
```
**Solution**: Verify you're in correct directory or initialize with `git init`

### Merge Conflicts
```bash
$ git commit
# Error: Committing is not possible because you have unmerged files
```
**Solution**: Resolve conflicts first, then stage and commit

### Branch Already Exists
```bash
$ git branch feature-123
# fatal: A branch named 'feature-123' already exists
```
**Solution**: Use a different name or delete the existing branch

### Worktree Path Already Exists
```bash
$ git worktree add ../feature-123 feature-branch
# fatal: '../feature-123' already exists
```
**Solution**: Use a different path or remove the existing directory

### Cannot Delete Current Branch
```bash
$ git branch -d main
# error: Cannot delete branch 'main' checked out at '...'
```
**Solution**: Switch to a different branch first

## Best Practices

1. **Review Before Committing**: Always check `git status` and `git diff --staged`
2. **Atomic Commits**: One logical change per commit
3. **Stage Selectively**: Use `git add <specific-files>` rather than `git add -A` when mixing changes
4. **Message Format**: Follow conventional commit format from commit-guidelines
5. **Verify After Commit**: Check `git log -1` to confirm commit details
6. **Worktree Organization**: Keep worktrees in parallel directories for easy navigation
7. **Branch Naming**: Use descriptive names with prefixes (feature/, bug/, refactor/)
8. **Clean Up**: Remove unused worktrees and branches regularly

## References

- Git Documentation: https://git-scm.com/docs
- Commit Guidelines: `${config.memory.tools.git.path}commit-guidelines.md`
