# Git History Analysis

Tool-specific implementation details for analyzing Git commit history to identify bug-introducing changes.

## Overview

This document provides Git-specific commands and techniques for **Diff Analysis** and **Binary Search** bug analysis methods. It complements the intent-driven methodology defined in `${config.memory.practices.bug-fixing.analysis-methods}`.

---

## Method 1: Diff Analysis

**Intent**: Compare code changes between working and broken versions to identify bug introduction

### Find Commits That Changed Specific File

**Git CLI**:
```bash
# List commits that modified a file
git log --oneline -- path/to/file.ts

# With commit dates
git log --oneline --date=short --format="%h %ad %s" -- path/to/file.ts

# Last 10 commits only
git log --oneline -10 -- path/to/file.ts
```

**GitHub CLI**:
```bash
# View commits for a file via API
gh api repos/{owner}/{repo}/commits?path=path/to/file.ts
```

**Context Adaptation**:
- **Large Files**: Add `--follow` to track file renames: `git log --follow -- old-name.ts`
- **Specific Time Range**: Add date filters: `git log --since="2023-01-01" --until="2023-12-31"`
- **Specific Author**: Add author filter: `git log --author="John Doe"`

---

### Show Changes in Specific Commit

**Git CLI**:
```bash
# Show full commit details with diff
git show <commit-hash>

# Show only file names changed
git show --name-only <commit-hash>

# Show stats (additions/deletions)
git show --stat <commit-hash>

# Show specific file in commit
git show <commit-hash>:path/to/file.ts
```

**Context Adaptation**:
- **Large Diffs**: Use `--word-diff` for inline changes: `git show --word-diff <commit-hash>`
- **Ignore Whitespace**: Add `-w` to ignore whitespace changes: `git show -w <commit-hash>`

---

### Compare Two Versions

**Git CLI**:
```bash
# Compare two commits for specific file
git diff <old-commit> <new-commit> -- path/to/file.ts

# Compare two commits for all files
git diff <old-commit> <new-commit>

# Show only changed file names
git diff --name-only <old-commit> <new-commit>

# Show stats
git diff --stat <old-commit> <new-commit>

# Compare current working tree to commit
git diff <commit-hash>

# Compare staging area to commit
git diff --cached <commit-hash>
```

**Context Adaptation**:
- **Ignore Whitespace**: Add `-w`: `git diff -w <old> <new>`
- **Function Context**: Add `-W` to show whole function: `git diff -W <old> <new>`
- **Specific Lines**: Add `-U<n>` for n lines of context: `git diff -U10 <old> <new>`

---

### Find All Changes in Time Range

**Git CLI**:
```bash
# Commits in date range
git log --oneline --since="2023-01-01" --until="2023-01-31"

# With diff stats
git log --stat --since="2023-01-01"

# Only affecting specific directory
git log --oneline --since="2023-01-01" -- src/components/

# By specific author
git log --author="John" --since="2023-01-01"
```

---

### Find Commits Matching Pattern

**Git CLI**:
```bash
# Find commits with message containing text
git log --grep="authentication"

# Case-insensitive search
git log --grep="auth" -i

# Find commits that added/removed specific code
git log -S"validateUser" --source --all

# Find commits that changed specific function
git log -G"function validateUser" --source --all
```

**Useful Patterns**:
- `-S"text"`: Pickaxe search - find commits that added or removed "text"
- `-G"pattern"`: Regex search - find commits where diff matches regex pattern

---

### View File at Specific Commit

**Git CLI**:
```bash
# Show file contents at commit
git show <commit-hash>:path/to/file.ts

# Save file from specific commit
git show <commit-hash>:path/to/file.ts > old-version.ts

# Compare current file to version from commit
git diff <commit-hash> -- path/to/file.ts
```

---

### Blame Analysis

**Intent**: Identify who last modified each line and when

**Git CLI**:
```bash
# Show line-by-line authorship
git blame path/to/file.ts

# Show blame for specific line range
git blame -L 10,20 path/to/file.ts

# Ignore whitespace changes
git blame -w path/to/file.ts

# Show commit hash only (shorter output)
git blame -s path/to/file.ts

# Show email instead of name
git blame -e path/to/file.ts
```

**GitHub UI**:
- Navigate to file → Click "Blame" button
- Visual interface showing commit per line

**Context Adaptation**:
- **Large Files**: Use `-L start,end` to focus on specific lines
- **Refactored Code**: Use `-C` to detect copied lines: `git blame -C file.ts`
- **Moved Code**: Use `-M` to detect moved lines: `git blame -M file.ts`

---

## Method 2: Binary Search (Git Bisect)

**Intent**: Systematically find the commit that introduced a bug through binary search

### Manual Bisect Workflow

**Git CLI**:
```bash
# 1. Start bisect session
git bisect start

# 2. Mark current version as bad (bug exists)
git bisect bad

# 3. Mark known good version (bug doesn't exist)
git bisect good <commit-hash>

# Git checks out middle commit
# Test for bug presence

# 4. Mark commit as good or bad based on testing
git bisect good   # if bug doesn't exist in this version
# OR
git bisect bad    # if bug exists in this version

# Git checks out next commit to test
# Repeat marking good/bad until Git identifies the culprit commit

# 5. When done, Git will display the first bad commit
# View details:
git show <identified-commit-hash>

# 6. Return to original branch
git bisect reset
```

---

### Automated Bisect with Test Script

**Intent**: Automate bisect when bug can be detected programmatically

**Git CLI**:
```bash
# 1. Start bisect
git bisect start <bad-commit> <good-commit>

# 2. Run bisect with test command
# Test command should exit 0 (success) if version is good
# Test command should exit non-zero (failure) if version is bad
git bisect run ./test-for-bug.sh

# Git automatically tests each commit and finds culprit

# 3. When complete, view result and reset
git bisect reset
```

**Example Test Script** (`test-for-bug.sh`):
```bash
#!/bin/bash

# Build/compile if needed
npm install --silent
npm run build --silent

# Run test that fails when bug exists
npm test -- --grep="specific failing test"

# Exit code 0 = good (test passes)
# Exit code non-zero = bad (test fails)
```

**Make script executable**:
```bash
chmod +x test-for-bug.sh
```

---

### Bisect with Skip

**Intent**: Skip commits that can't be tested (build failures, etc.)

**Git CLI**:
```bash
# During bisect, if commit can't be tested:
git bisect skip

# Git will skip this commit and choose another

# Skip range of commits:
git bisect skip <commit1> <commit2>
```

---

### Bisect Visualization

**Git CLI**:
```bash
# View bisect log (what's been marked)
git bisect log

# View current bisect status
git bisect view --oneline

# Replay bisect from log
git bisect replay <log-file>
```

---

### Bisect Best Practices

1. **Identify Good Commit**: Find a commit where bug definitely doesn't exist
   ```bash
   # Test old commits to confirm they're good
   git checkout <old-commit>
   # Test for bug
   # If bug doesn't exist, this is a good starting point
   ```

2. **Ensure Reproducible Build**: Each commit must build successfully
   - Skip commits that don't build
   - Or fix build before bisecting

3. **Reliable Test**: Bug detection must be consistent
   - Flaky tests will produce wrong results
   - Ensure test doesn't depend on external state

4. **Commit Granularity**: Works best with small, focused commits
   - Large commits make it harder to identify exact change
   - Still finds the commit, but less precise

---

## Advanced Techniques

### Find When Line Was Added

**Git CLI**:
```bash
# Find commit that added specific line
git log -S"specific line of code" --source --all

# With patches showing actual changes
git log -p -S"specific line of code"
```

---

### Find Merge Commits

**Intent**: Identify merges that may have introduced bugs

**Git CLI**:
```bash
# List all merge commits
git log --merges --oneline

# Merge commits in date range
git log --merges --since="2023-01-01"

# Show first-parent only (main branch merges)
git log --first-parent --merges

# Find merge that brought in specific commit
git log --merges --ancestry-path <commit>..<branch>
```

---

### Compare Branches

**Git CLI**:
```bash
# Commits in branch A not in branch B
git log branch-a ^branch-b --oneline

# Commits in branch B not in branch A
git log branch-b ^branch-a --oneline

# Diff between branch tips
git diff branch-a..branch-b

# Diff between common ancestor and branch
git diff branch-a...branch-b
```

---

## Integration with GitHub

### Using GitHub CLI (`gh`)

**View Commit Details**:
```bash
# View commit via API
gh api repos/{owner}/{repo}/commits/{sha}

# View PR that introduced commit
gh api repos/{owner}/{repo}/commits/{sha}/pulls
```

**Search Commits**:
```bash
# Search commits in repo
gh api /search/commits?q=repo:{owner}/{repo}+author:{author}
```

---

### Using GitHub Web UI

**Blame View**:
1. Navigate to file on GitHub
2. Click "Blame" button
3. Visual line-by-line commit history
4. Click commit hash to view full commit

**Compare View**:
1. Go to repository → "Compare" button
2. Select base and compare branches/commits
3. Visual diff of all changes

**Network Graph**:
1. Go to repository → Insights → Network
2. Visual branch/merge history
3. Identify when branches merged

---

## Context Adaptations

### Large Repositories

**Challenges**:
- Long history (thousands of commits)
- Large files (slow diffs)
- Many contributors

**Solutions**:
```bash
# Limit search scope
git log --since="2023-01-01" -- specific/path/

# Shallow clone for faster operations
git clone --depth 100 <repo-url>

# Use --first-parent to focus on main branch
git log --first-parent --oneline
```

---

### Monorepos

**Challenges**:
- Multiple projects in one repo
- Changes unrelated to bug

**Solutions**:
```bash
# Filter by specific directory
git log --oneline -- path/to/specific/project/

# Exclude directories
git log --oneline -- . ':(exclude)other-project/'

# Focus on files related to bug
git log --oneline -- "**/*auth*"
```

---

### When File Was Renamed

**Challenges**:
- Git log doesn't show history before rename

**Solutions**:
```bash
# Follow file through renames
git log --follow --oneline -- current-name.ts

# Show renames explicitly
git log --follow --find-renames --oneline -- file.ts
```

---

## Performance Optimization

### Speed Up Log Commands

```bash
# Limit number of commits searched
git log -100 --oneline

# Search only main branch
git log --first-parent --oneline

# Skip merges for cleaner history
git log --no-merges --oneline

# Limit to specific paths
git log --oneline -- path/to/area/
```

---

### Speed Up Diff Commands

```bash
# Ignore whitespace for faster comparison
git diff -w <old> <new>

# Show only file names (fastest)
git diff --name-only <old> <new>

# Show stats instead of full diff
git diff --stat <old> <new>
```

---

## Troubleshooting

### Bisect Gets Stuck

**Problem**: Bisect keeps choosing un-testable commits

**Solution**:
```bash
# Skip bad commits
git bisect skip

# Or skip range
git bisect skip <commit1>..<commit2>

# Reset and try different bounds
git bisect reset
git bisect start <different-bad> <different-good>
```

---

### Can't Find Commit

**Problem**: git log doesn't show expected commit

**Solution**:
```bash
# Search all branches
git log --all --oneline --grep="search term"

# Include reflog (even deleted commits)
git reflog

# Search by date
git log --all --since="2023-01-01" --until="2023-01-31"
```

---

### Diff Shows Too Much

**Problem**: Diff includes unrelated changes

**Solution**:
```bash
# Ignore whitespace
git diff -w <old> <new>

# Focus on specific file
git diff <old> <new> -- specific-file.ts

# Show function context only
git diff -W <old> <new>

# Limit context lines
git diff -U3 <old> <new>
```

---

## See Also

- **Bug Analysis Methods**: `${config.memory.practices.bug-fixing.analysis-methods}` - Intent-driven analysis methodology
- **Git Bisect Workflow**: `${config.memory.tools.git.bisect-workflow}` - Additional bisect details
- **Commit Guidelines**: `${config.memory.tools.git.commit-guidelines}` - Commit message standards
- **GitHub Operations**: `${config.memory.tools.github}` - GitHub-specific operations

---

**Version**: 1.0.0
**Last Updated**: 2025-11-25
**Status**: Active
**Purpose**: Tool-specific implementations for Git-based bug analysis
