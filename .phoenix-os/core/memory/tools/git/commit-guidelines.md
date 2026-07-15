# Commit Guidelines

This document defines commit message standards and guidelines for Phoenix OS projects. These rules are platform-agnostic and apply on GitHub, GitLab, and Azure DevOps alike.

## Commit Message Format

All commit messages MUST follow the Conventional Commits specification:

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Type

The type MUST be one of the following:

- **feat**: New feature for the user
- **fix**: Bug fix for the user
- **docs**: Documentation only changes
- **style**: Code style changes (formatting, missing semi colons, etc)
- **refactor**: Code change that neither fixes a bug nor adds a feature
- **perf**: Code change that improves performance
- **test**: Adding missing tests or correcting existing tests
- **build**: Changes to build system or external dependencies
- **ci**: Changes to CI configuration files and scripts
- **chore**: Other changes that don't modify src or test files
- **revert**: Reverts a previous commit

### Scope (Optional)

The scope provides additional contextual information:

- **Component scope**: `commands`, `agents`, `memory`, `tools`
- **Tool scope**: `github`, `gitlab`, `git`, `cli`
- **Phase scope**: `plan`, `build`, `release`
- **Area scope**: `config`, `docs`, `tests`

Examples:
- `feat(commands): add commit command`
- `fix(gitlab): correct issue operations query`
- `docs(readme): update installation instructions`

### Subject

The subject line MUST:
- Use imperative mood ("add" not "added" or "adds")
- Not capitalize first letter
- Not end with a period
- Be limited to 50 characters or less
- Focus on WHAT changed, not HOW

**Good examples:**
- `add commit command for build phase`
- `fix authentication error in glab CLI`
- `update README with Fluidic SDLC philosophy`

**Bad examples:**
- `Added commit command` (past tense)
- `Add Commit Command` (capitalized)
- `add commit command.` (has period)
- `This commit adds a commit command that allows users to...` (too long, explains how)

### Body (Optional but Recommended)

The body SHOULD:
- Use imperative mood
- Include motivation for the change
- Contrast with previous behavior
- Be wrapped at 72 characters per line
- Be separated from subject by blank line

Example:
```
refactor: reorganize GitHub memory from integrations to tools

Move GitHub integration patterns from core/memory/integrations/github/
to core/memory/tools/github/ for better alignment with Phoenix OS
philosophy and tool-agnostic approach.

This aligns with the updated CLAUDE.md configuration paths.
```

### Footer (Optional)

The footer SHOULD contain:
- Breaking changes (prefixed with `BREAKING CHANGE:`)
- Issue references (e.g., `Fixes #123`, `Closes #456`)
- Co-authors (if applicable)

Example:
```
Fixes #145
```

## File Grouping Strategy

When multiple files are changed, group them **by feature**:

Group files that implement a single feature together:
- Related source and test files
- Configuration and documentation for the same feature
- Memory, commands, and agents that work together

### Single Commit vs Multiple Commits

**Single commit when:**
- Changes are tightly coupled
- Changes implement one logical unit
- Separating would break functionality
- All changes serve the same purpose

**Multiple commits when:**
- Changes are independent
- Different types of changes (feat + docs)
- Changes can be reviewed separately
- Large refactoring with multiple stages

## Commit Message Analysis

### Determining Purpose

The commit type is determined by analyzing the branch name first:

1. **Check branch name pattern**:
   - Branch starts with `feature/` or `feat/` → Use `feat`
   - Branch starts with `bug/` or `fix/` → Use `fix`
   - Branch starts with `refactor/` → Use `refactor`
   - Branch starts with `docs/` → Use `docs`
   - Branch starts with `perf/` → Use `perf`
   - Branch starts with `test/` → Use `test`
   - Branch starts with `chore/` → Use `chore`

2. **If branch name doesn't map to a type**, analyze the changes:
   - **New functionality**: Use `feat`
   - **Bug correction**: Use `fix`
   - **Code restructure**: Use `refactor`
   - **Documentation update**: Use `docs`
   - **Performance improvement**: Use `perf`
   - **Test addition/update**: Use `test`

### Determining Scope

Analyze file paths and content to determine scope based on the four main categories and their children:

**Component scope:**
- Files in `core/commands/` → scope: `commands`
- Files in `core/agents/` → scope: `agents`
- Files in `core/memory/` → scope: `memory`
- Files in `core/memory/tools/` → scope: `tools`

**Tool scope (children of tools):**
- Files in `core/memory/tools/github/` → scope: `github`
- Files in `core/memory/tools/gitlab/` → scope: `gitlab`
- Files in `core/memory/tools/git/` → scope: `git`
- Files in `core/memory/tools/cli/` → scope: `cli`

**Phase scope:**
- Files in `core/commands/plan/` → scope: `plan`
- Files in `core/commands/build/` → scope: `build`
- Files in `core/commands/release/` → scope: `release`

**Area scope:**
- Files in `docs/` → scope: `docs`
- Configuration files (CLAUDE.md, README.md) → scope: `config`
- Test files → scope: `tests`

**Multiple components:**
- If changes span multiple categories → omit scope or use high-level scope

## Pre-commit Review Criteria

A commit SHOULD be reviewed if:
- Modifying core architecture files
- Changing multiple components
- Large refactoring (10+ files)
- Breaking changes
- Performance-critical code
- Security-related changes

A commit MAY skip review if:
- Documentation-only changes
- Simple typo fixes
- Small scoped changes (1-3 files)
- Test additions without logic changes

## Examples

### Example 1: Single Feature Addition
```
feat(commands): add commit command for build phase

Implement commit command following Issue #145 requirements:
- Review modifications for staging
- Create file groupings
- Analyze purpose, scope, and nature
- Craft conventional commit message
- Support pre-commit review option

The command follows Fluidic SDLC principles with adaptive
execution and context-aware decision making.

Fixes #145
```

### Example 2: Documentation Update
```
docs: enhance CLAUDE.md and README.md with Phoenix OS structure

- Update CLAUDE.md with Fluidic SDLC philosophy
- Add project configuration with memory paths
- Restructure README with comprehensive sections
- Include maintainers and MIT license
```

### Example 3: Refactoring
```
refactor: reorganize GitHub memory from integrations to tools

Move GitHub integration patterns for better alignment with
Phoenix OS philosophy and tool-agnostic approach.

Files moved:
- issue-operations.md
- pr-operations.md
- preflight-checks.md
- worktree-operations.md
```

### Example 4: Multiple File Groups
```
feat(memory): add commit guidelines and update documentation

Create comprehensive commit guidelines following Conventional
Commits specification with Phoenix OS adaptations.

Update related documentation to reference new guidelines.
```

## Common Mistakes to Avoid

1. **Mixing types**: Don't combine feat and fix in same commit
2. **Vague subjects**: "update files" → "add commit command"
3. **Past tense**: "added" → "add"
4. **Capitalization**: "Add" → "add"
5. **Too detailed**: Focus on what, not how
6. **Missing context**: Explain why in body
7. **Giant commits**: Break into logical units

## References

- [Conventional Commits](https://www.conventionalcommits.org/)
- Phoenix OS Philosophy: `docs/philosophy/index.md`
- Design Principles: `docs/philosophy/design-principles.md`

---

**Version**: 1.0.0
**Last Updated**: 2026-04-23
**Status**: Active
**Platforms**: GitHub, Azure DevOps, GitLab
