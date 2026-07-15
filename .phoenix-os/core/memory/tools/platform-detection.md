# Platform Detection Rules

How Phoenix OS resolves the code-repo platform (`platform`) and the project-management platform (`pm-platform`).

## Overview

Phoenix OS resolves two separate platform settings:

- **`platform`** — the code-repo platform (GitHub, Azure DevOps, or GitLab). Detected from the git remote URL.
- **`pm-platform`** — the project-management platform (e.g. JIRA). Read from config; falls back to `platform` when unset.

This memory file defines how each is resolved. See the Two-Platform Model below.

## Two-Platform Model

The two settings are resolved independently:

| Setting | Possible values | Source | Governs |
|---------|-----------------|--------|---------|
| `platform` | `github` \| `azure-devops` \| `gitlab` | Git remote URL (see Detection Rules below) | Repo, branch, PR, and commit operations |
| `pm-platform` | `github` \| `azure-devops` \| `gitlab` \| `jira` | Config | Issue and project-management operations |

JIRA is a PM-only platform: it has no git-remote signature and is never returned by code-platform detection. `jira` is only ever a value of `pm-platform`, never of `platform`.

## Detection Rules

### URL Pattern Matching

**GitHub Detection**:
```yaml
platform: github
url-patterns:
  - "github.com"
  - "ssh://git@github.com"
  - "git@github.com:"

detection-logic: |
  IF remote_url CONTAINS ANY(url-patterns)
    THEN platform = "github"
```

**Azure DevOps Detection**:
```yaml
platform: azure-devops
url-patterns:
  - "dev.azure.com"
  - "visualstudio.com"
  - "ssh.dev.azure.com"

detection-logic: |
  IF remote_url CONTAINS ANY(url-patterns)
    THEN platform = "azure-devops"
```

**GitLab Detection**:
```yaml
platform: gitlab
url-patterns:
  - "gitlab.com"
  - "git@gitlab.com:"
  - "ssh://git@gitlab.com"
  - "git.nagarro.com"          # Self-hosted GitLab for this project

detection-logic: |
  IF remote_url CONTAINS ANY(url-patterns)
    THEN platform = "gitlab"
```

**Unknown Platform**:
```yaml
platform: unknown
detection-logic: |
  IF remote_url DOES NOT MATCH ANY(github.url-patterns, azure-devops.url-patterns, gitlab.url-patterns)
    THEN platform = "unknown"
```

## Self-Hosted GitLab Fallback Detection

When the remote URL does not match any known GitLab host pattern, check for self-hosted GitLab indicators:

```yaml
self-hosted-gitlab-indicators:
  - file: ".gitlab-ci.yml"        # CI configuration file unique to GitLab
  - config-key: "config.gitlab.host"  # Explicit host in CLAUDE.md / .cursorrules

fallback-logic: |
  IF platform == "unknown":
    IF file ".gitlab-ci.yml" EXISTS in repository root:
      THEN host = remote_url domain
      THEN prompt user: "Detected GitLab via .gitlab-ci.yml at {host}; confirm? (Y/n)"
      IF confirmed: platform = "gitlab"
      IF declined: platform = "unknown"
    ELSE IF config.gitlab.host IS SET AND remote_url CONTAINS config.gitlab.host:
      THEN prompt user: "Detected GitLab via config.gitlab.host ({host}); confirm? (Y/n)"
      IF confirmed: platform = "gitlab"
      IF declined: platform = "unknown"
```

**Example**: If remote URL is `git@mygitlab.company.com:org/repo.git` and `.gitlab-ci.yml` exists, platform is `gitlab` with host `mygitlab.company.com`.

## Platform-Type Label Mapping

Issue type labels differ across platforms. Use this table when creating or querying issues by type:

| Phoenix Type | GitHub (native type) | Azure DevOps (type field) | GitLab (scoped label) | JIRA (issue type) |
|--------------|----------------------|---------------------------|-----------------------|-------------------|
| Epic         | `type="Epic"`        | type = "Epic"             | `type::epic`          | `Epic`            |
| Feature      | `type="Feature"`     | type = "Feature"          | `type::feature`       | `Feature`         |
| Story        | `type="Story"`       | type = "User Story"       | `type::story`         | `Story`           |
| Task         | `type="Task"`        | type = "Task"             | `type::task`          | `Task`            |
| Bug          | `type="Bug"`         | type = "Bug"              | `type::bug`           | `Bug`             |
| Chore        | (label: `chore`)     | type = "Task" + tag       | `type::chore`         | `Chore` (custom)  |
| Sub-task     | `type="Sub-task"`    | type = "Task"             | `type::subtask`       | `Sub-task`        |

**Notes**:
- GitHub uses native issue types set via API (`--field type="..."`)
- Azure DevOps uses the built-in work item type field
- GitLab uses scoped labels (`type::*`) since it lacks native sub-types; ensure the `type::*` label group exists in the project
- JIRA uses native issue types (`fields.issuetype.name`); `Chore` should be treated as custom work type which can fallback to `Task` when not available; Sub-task requires a parent.
- JIRA `Sub-task` / Azure DevOps `type = "Task"` (child) / GitLab `type::subtask` each model the child relationship per each platform's own convention.

## Detection Workflow

### Step 1: Retrieve Git Remote URL

**Command**:
```bash
git config --get remote.origin.url
```

**Expected Output**:
- GitHub: `https://github.com/org/repo.git` or `git@github.com:org/repo.git`
- Azure DevOps: `https://dev.azure.com/org/project/_git/repo` or `https://org.visualstudio.com/project/_git/repo`
- GitLab: `git@git.nagarro.com:namespace/project.git` or `https://git.nagarro.com/namespace/project.git`

### Step 2: Apply Detection Rules

**Algorithm**:
```
1. Get remote URL from git config
2. FOR EACH platform IN [github, azure-devops, gitlab]:
     FOR EACH pattern IN platform.url-patterns:
       IF remote_url CONTAINS pattern:
         RETURN platform
3. IF no match found:
     RETURN "unknown"
```

### Step 2b: Resolve PM Platform

After detecting the code platform, resolve the PM platform from config — the git remote is **not** consulted:

```
pm_platform = config.pm-platform ?? config.platform
```

`jira` is valid only here, never a code-platform (Step 2) result. See [PM Platform Resolution](#pm-platform-resolution) for the full rule and worked examples.

### Step 3: User Confirmation

**Intent**: Verify auto-detected platform with user before proceeding

**Prompt Format**:
```
Detected platform: {platform}
Git remote: {remote-url}

Continue with {platform} operations? (Y/n)
```

**User Response Handling**:
- `Y`, `y`, `yes`, `Yes`, `YES`, or empty (Enter) → Confirmed
- `n`, `N`, `no`, `No`, `NO` → Declined
- Other → Prompt again

### Step 4: Load Platform-Specific Memory

**Code platform memory (by detected code platform)**:

**GitHub**:
```yaml
memory-files:
  - ${config.memory.tools.github.issue-operations}
  - ${config.memory.tools.github.repo-operations}
  - ${config.memory.tools.github.pr-operations}
  - ${config.memory.tools.github.commit-operations}
```

**Azure DevOps**:
```yaml
memory-files:
  - ${config.memory.tools.azure-devops.work-item-operations}
  - ${config.memory.tools.azure-devops.repo-operations}
  - ${config.memory.tools.azure-devops.pr-operations}
  - ${config.memory.tools.azure-devops.pipeline-operations}
```

**GitLab**:
```yaml
memory-files:
  - ${config.memory.tools.gitlab.issue-operations}
  - ${config.memory.tools.gitlab.pr-operations}
  - ${config.memory.tools.gitlab.commit-operations}
  - ${config.memory.tools.gitlab.pipeline-operations}
```

**PM platform memory (by resolved PM platform)**:

```yaml
IF pm_platform == "jira":
  memory-files:
    - ${config.memory.tools.jira.issue-operations}
ELSE:  # pm_platform fell back to the code platform
  load the code platform's issue/PM memory:
    - github       -> ${config.memory.tools.github.issue-operations}
    - gitlab       -> ${config.memory.tools.gitlab.issue-operations}
    - azure-devops -> ${config.memory.tools.azure-devops.work-item-operations}
```

## PM Platform Resolution

The PM platform is resolved by the following rule:

```
resolved_pm = pm-platform ?? platform
```

When `pm-platform` is set, it is used directly. When unset, it falls back to `platform` (the code-platform result from Step 2) — reproducing current single-platform behavior with no regression for existing projects.

### Worked Examples

| Code repo (git remote) | `pm-platform` (config) | Resolved code ops | Resolved PM ops |
|--------------------------------|------------------------|-------------------|-----------------|
| github                         | jira                   | github            | jira            |
| gitlab (incl. self-hosted `git.nagarro.com`) | jira     | gitlab            | jira            |
| azure-devops                   | jira                   | azure-devops      | jira            |
| (any)                          | *unset*                | (detected)        | = code platform |

## Issue Linkage in Pull / Merge Requests

A pull/merge request belongs to the **code platform** (`platform`), while the issue it references lives on the **PM platform** (`resolved_pm`). The two may differ (e.g. `pm-platform: jira` with code on `gitlab`). How a PR/MR links to its issue is governed by this single generic rule — recipes reference it and never restate per-platform auto-close keywords or ticket-URL formats inline:

```
IF resolved_pm == platform:
  # Same platform — merging the PR/MR can close the issue on the host.
  Use the code platform's native auto-close keyword in the PR/MR body
  (e.g. "Closes #<id>" / "Fixes #<id>") per ${config.memory.tools.{platform}.pr-operations}.

ELSE:
  # Different platforms — a merge on the code platform CANNOT close an issue
  # hosted on a different PM platform.
  - Do NOT emit any auto-close keyword.
  - Reference the issue by its ticket URL in the PR/MR body. Obtain the
    ticket-URL format from the resolved PM platform's memory (see
    "Step 4: Load Platform-Specific Memory").
  - Do NOT add a separate PM transition step.
```

The recovered issue identifier likewise comes from the branch generically (`{type}/{identifier}-{slug}`); its format is validated per the resolved PM platform's memory, not by any rule restated in the recipe.

## Error Handling

### Error: No Git Remote

**Error Context**:
- **What**: Git remote URL not found
- **Why**: Repository not connected to remote platform or not in git repository
- **Fix**: Run `git remote add origin <url>` to add remote
- **Alternative**: Initialize new git repository with `git init && git remote add origin <url>`
- **Impact**: Cannot detect platform, blocks all issue/PR operations

**Error Message**:
```
❌ Error: No git remote configured

Phoenix OS requires a git remote URL to detect platform.

To fix:
git remote add origin <repository-url>

Examples:
- GitHub: https://github.com/org/repo.git
- Azure DevOps: https://dev.azure.com/org/project/_git/repo

Impact: Cannot fetch issues or create PRs without platform connection
```

### Error: Unknown Platform

**Error Context**:
- **What**: Git remote URL doesn't match any supported platform patterns
- **Why**: Repository hosted on unsupported platform (Bitbucket, etc.)
- **Fix**: Update remote to a supported platform URL
- **Alternative**: Add detection pattern for the platform to this memory file
- **Impact**: Cannot use Phoenix OS with current platform

**Error Message**:
```
❌ Error: Unknown platform detected

Git remote URL: {remote-url}

Supported platforms:
- GitHub (github.com)
- Azure DevOps (dev.azure.com, visualstudio.com)
- GitLab (gitlab.com, git.nagarro.com)

To fix:
Update git remote to a supported platform:
git remote set-url origin <correct-url>

Impact: Phoenix OS commands unavailable for this platform
```

### Error: User Declined Platform

**Error Context**:
- **What**: User declined platform confirmation
- **Why**: Detected platform incorrect or user wants different platform
- **Fix**: Update git remote URL to correct platform
- **Alternative**: Verify current remote with `git config --get remote.origin.url`
- **Impact**: Operation cancelled, no changes made

**Error Message**:
```
❌ Operation cancelled

You declined the platform confirmation.

Detected platform: {platform}
Git remote: {remote-url}

If this is incorrect:
1. Update git remote: git remote set-url origin <correct-url>
2. Verify: git config --get remote.origin.url
3. Retry command

Impact: Current operation stopped, repository unchanged
```

## Platform-Specific Authentication

### GitHub Authentication

**Method**: GitHub CLI (gh) with OAuth
**Storage**: System keyring
**Verification Command**: Referenced from `${config.memory.tools.github.authentication}`

### Azure DevOps Authentication

**Method**: Azure CLI (az) with OAuth
**Storage**: System keyring
**Verification Command**: Referenced from `${config.memory.tools.azure-devops.authentication}`

### GitLab Authentication

```bash
glab auth login --hostname git.nagarro.com
# Verify:
glab auth status
```

**Token Scopes Required**: `api`, `read_user`, `write_repository`
**Create token at**: `https://git.nagarro.com/-/user_settings/personal_access_tokens`

## Usage by Agents

Agents reference this memory file for platform detection:

```markdown
## Steps

### 1. Detect Platform
**Intent**: Determine which platform hosts the repository
**Why**: Operations differ between GitHub, Azure DevOps, and GitLab
**Outcome**: Confirmed platform selection (github, azure-devops, or gitlab)

- Read detection rules: `${config.memory.tools.platform-detection}`
- Execute platform detection workflow from memory
- Apply URL pattern matching rules
- Confirm detected platform with user
- Load platform-specific memory based on result
```

## See Also

- **GitHub Memory**: `${config.memory.tools.github.issue-operations}`
- **Azure DevOps Memory**: `${config.memory.tools.azure-devops.work-item-operations}`
- **GitLab Memory**: `${config.memory.tools.gitlab.issue-operations}`
- **JIRA (PM) Memory**: `${config.memory.tools.jira.issue-operations}`
- **Philosophy**: [design-principles.md](../../../Philosophy/Philosophy-Design-Principles.md) - Explicit via Abstraction

---

**Version**: 1.3.0
**Last Updated**: 2026-06-18
**Status**: Active
**Platforms**: GitHub, Azure DevOps, GitLab (code); JIRA (PM)
