# GitLab CI/CD Pipeline Operations

This document defines the implementation methods for GitLab CI/CD pipeline operations in Phoenix OS.

**Memory Type**: Long-term memory (LT) - Provides implementation patterns for agents.

**Memory Path**: `${config.memory.tools.gitlab.pipeline-operations}`

## Prerequisites

### Authentication Setup
```bash
glab auth login --hostname git.nagarro.com
# Verify:
glab auth status
```

**Required scopes**: `api`, `read_user`, `write_repository`
**Create token at**: `https://git.nagarro.com/-/user_settings/personal_access_tokens`

## Listing Pipelines

### Implementation

```bash
# List recent pipelines for current branch
glab ci list

# List pipelines for a specific branch
glab ci list --branch {branch-name}

# List pipelines for the repository
glab ci list --per-page 20

# List with JSON output
glab ci list --output json | jq '.[] | {id: .id, status: .status, ref: .ref, web_url: .web_url}'
```

## Viewing Pipeline Status

### Implementation

```bash
# View status of latest pipeline on current branch
glab ci status

# View status of a specific pipeline
glab ci view {pipeline-id}

# View pipeline with job details
glab ci view {pipeline-id} --jobs

# Get pipeline status summary
glab ci status --branch {branch-name}
```

## Listing and Viewing Jobs

### Implementation

```bash
# List jobs for the latest pipeline
glab ci list

# View a specific job
glab ci view --job {job-name}

# Get job status and logs
glab ci trace {job-id}

# View job artifacts
glab ci artifact {job-id}
```

## Reading Job Logs

### Implementation

```bash
# Trace/stream a running or completed job's log
glab ci trace {job-id}

# Trace the latest failing job
glab ci list --output json \
  | jq '.[] | select(.status == "failed") | .id' \
  | head -1 \
  | xargs glab ci trace
```

## Triggering Pipelines

### Implementation

```bash
# Trigger pipeline on current branch
glab ci run

# Trigger pipeline on a specific branch
glab ci run --branch {branch-name}

# Trigger with variables
glab ci run --branch {branch-name} \
  --variable "DEPLOY_ENV=staging" \
  --variable "RUN_INTEGRATION=true"
```

## Retrying Failed Jobs

### Implementation

```bash
# Retry a specific failed job
glab ci retry {job-id}

# Retry all failed jobs in a pipeline
glab ci retry --pipeline {pipeline-id}
```

## Cancelling Pipelines

### Implementation

```bash
# Cancel a running pipeline
glab ci cancel {pipeline-id}
```

## Checking Pipeline Status for MR

```bash
# Check pipeline status linked to an MR
glab mr view {mr-number} --output json \
  | jq '.head_pipeline | {id, status, web_url}'

# List recent pipelines for MR source branch
MR_BRANCH=$(glab mr view {mr-number} --output json | jq -r '.source_branch')
glab ci list --branch "$MR_BRANCH"
```

## Pipeline Configuration

### GitLab CI YAML Location

Pipelines are defined in `.gitlab-ci.yml` at the root of the repository:

```yaml
# Example: .gitlab-ci.yml for Phoenix OS
stages:
  - build
  - test
  - deploy

variables:
  NODE_VERSION: "18"

build:
  stage: build
  image: node:${NODE_VERSION}
  script:
    - npm install
    - npm run build
  artifacts:
    paths:
      - dist/

test:
  stage: test
  image: node:${NODE_VERSION}
  script:
    - npm test
  coverage: '/Lines\s*:\s*(\d+\.?\d*)%/'

deploy-staging:
  stage: deploy
  script:
    - echo "Deploying to staging..."
  environment:
    name: staging
  only:
    - main
```

## Error Handling

### Pipeline Not Found

```
❌ Error: Pipeline not found

To fix:
glab ci list to see available pipelines
Verify pipeline ID is correct
Check branch name: glab ci list --branch {branch-name}
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

### Cannot Retry (Pipeline Not Failed)

```
❌ Error: Cannot retry pipeline — status is not 'failed'

To fix:
glab ci view {pipeline-id} to check current status
Only failed or canceled pipelines/jobs can be retried
```

## Common Workflows

### Workflow 1: Check Build Status Before PR

```bash
# 1. Push commits
git push origin {branch-name}

# 2. Check pipeline status
glab ci status --branch {branch-name}

# 3. If pipeline is running, wait and recheck
# 4. If pipeline failed, view job logs
glab ci list --output json | jq '.[] | select(.status == "failed") | .id' \
  | head -1 | xargs glab ci trace

# 5. If pipeline passed, create MR
glab mr create --title "..." --target-branch {long-lived-branch}
```

### Workflow 2: Retry Failed Pipeline

```bash
# 1. List failed pipelines
glab ci list --output json | jq '.[] | select(.status == "failed") | {id, ref}'

# 2. View failing job
glab ci view {pipeline-id} --jobs

# 3. Read job log
glab ci trace {job-id}

# 4. Fix issue, push, and retry OR retry directly
glab ci retry --pipeline {pipeline-id}
```

## Best Practices

1. **Check before PR**: Verify pipeline passes before creating MR
2. **Read logs first**: Use `glab ci trace` to understand failures before retrying
3. **Trace not poll**: Use `glab ci trace` to stream logs instead of polling status
4. **Branch pipelines**: Always reference branch name when listing pipelines
5. **Cancel stale runs**: Cancel long-running pipelines from previous pushes before triggering new ones

## References

- [GitLab CI/CD Documentation](https://docs.gitlab.com/ee/ci/)
- [glab ci reference](https://gitlab.com/gitlab-org/cli/-/blob/main/docs/source/ci/index.md)
- [pr-operations.md](pr-operations.md) - Link pipelines to MRs
- [issue-operations.md](issue-operations.md) - Issue operations

---

**Version**: 1.1.0
**Last Updated**: 2026-04-27
**Status**: Active
**Platform**: GitLab (self-hosted: git.nagarro.com)
**Authentication**: glab CLI only
