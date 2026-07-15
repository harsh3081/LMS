# Azure Pipelines Operations

This document defines the implementation methods for Azure Pipelines operations in Phoenix OS.

## Prerequisites

### Authentication Setup
```bash
# Same authentication as other Azure DevOps operations
az login
az devops configure --defaults organization=https://dev.azure.com/{organization} project={project}
```

### Pipeline Extension
```bash
# Azure Pipelines commands are part of azure-devops extension
az extension show --name azure-devops --query version

# If not installed
az extension add --name azure-devops
```

## Pipeline Basics

### List Pipelines
```bash
# List all pipelines in project
az pipelines list --output table

# List pipeline names only
az pipelines list --query "[].name" --output tsv

# Get pipeline by ID
az pipelines show --id {pipeline-id}

# Get pipeline by name
az pipelines show --name "{pipeline-name}"

# Example: List all pipelines
az pipelines list
```

### Get Pipeline Details
```bash
# Get pipeline definition
az pipelines show --id {pipeline-id} --output json

# Get pipeline folder path
az pipelines show --id {pipeline-id} --query "path" --output tsv

# Get pipeline repository
az pipelines show --id {pipeline-id} --query "repository.name" --output tsv
```

## Pipeline Runs (Build Operations)

### List Pipeline Runs
```bash
# List recent runs for specific pipeline
az pipelines runs list --pipeline-id {pipeline-id} --output table

# List runs for all pipelines
az pipelines runs list --output table

# List runs by branch
az pipelines runs list --branch {branch-name}

# List runs by status
az pipelines runs list --status completed
az pipelines runs list --status inProgress

# Example: List recent runs for pipeline #5
az pipelines runs list --pipeline-id 5 --top 10
```

### Get Run Details
```bash
# Get specific run by ID
az pipelines runs show --id {run-id}

# Get run result
az pipelines runs show --id {run-id} --query "result" --output tsv
# Output: succeeded, failed, canceled

# Get run status
az pipelines runs show --id {run-id} --query "status" --output tsv
# Output: completed, inProgress, notStarted

# Example: Get details for run #12345
az pipelines runs show --id 12345
```

### Trigger Pipeline Run
```bash
# Trigger pipeline on specific branch
az pipelines run \
  --name "{pipeline-name}" \
  --branch {branch-name}

# Trigger with variables
az pipelines run \
  --name "{pipeline-name}" \
  --branch issue-290 \
  --variables workItemId=290 buildReason=Manual

# Example: Trigger CI pipeline on issue-290 branch
az pipelines run --name "Phoenix-CI" --branch issue-290
```

## Pipeline Status for Pull Requests

### Get PR Build Status
```bash
# Get builds associated with a PR
az pipelines runs list --branch refs/pull/{pr-id}/merge

# Check latest build for PR branch
BRANCH_NAME="issue-290"
az pipelines runs list \
  --branch $BRANCH_NAME \
  --top 1 \
  --query "[0].{id:id, status:status, result:result, finishTime:finishTime}"

# Phoenix OS pattern: Check if PR builds are passing
PR_ID=123
BUILD_STATUS=$(az pipelines runs list \
  --branch refs/pull/$PR_ID/merge \
  --top 1 \
  --query "[0].result" \
  --output tsv)

if [ "$BUILD_STATUS" == "succeeded" ]; then
  echo "✅ All PR builds passing"
else
  echo "❌ PR builds failing or incomplete"
fi
```

### Monitor Build Progress
```bash
# Get build logs (streaming)
az pipelines runs show --id {run-id} --open

# Get build timeline
az pipelines runs show --id {run-id} --query "timeline"

# Get build artifacts
az pipelines runs artifact list --run-id {run-id}
```

## Pipeline Configuration

### Pipeline YAML Location
Azure Pipelines are defined in YAML files (typically `azure-pipelines.yml` or `.azure-pipelines/*.yml`):

```yaml
# Example: azure-pipelines.yml for Phoenix OS
trigger:
  branches:
    include:
      - main
      - issue-*

pr:
  branches:
    include:
      - main

pool:
  vmImage: 'ubuntu-latest'

steps:
  - task: NodeTool@0
    inputs:
      versionSpec: '18.x'
    displayName: 'Install Node.js'

  - script: |
      npm install
      npm run build
    displayName: 'Build project'

  - script: |
      npm test
    displayName: 'Run tests'

  - task: PublishTestResults@2
    condition: always()
    inputs:
      testResultsFormat: 'JUnit'
      testResultsFiles: '**/test-results.xml'
      testRunTitle: 'Phoenix OS Tests'
```

### Create Pipeline
```bash
# Create pipeline from YAML file
az pipelines create \
  --name "Phoenix-CI" \
  --repository phoenix-os \
  --repository-type tfsgit \
  --branch main \
  --yml-path azure-pipelines.yml

# Create pipeline interactively (CLI wizard)
az pipelines create
```

### Update Pipeline
```bash
# Pipeline updates are typically done by modifying YAML file and pushing to repo
# Azure DevOps automatically detects changes

git add azure-pipelines.yml
git commit -m "ci: update pipeline configuration"
git push origin main
```

## Pipeline Triggers

### Branch Triggers
```yaml
# Trigger on specific branches
trigger:
  branches:
    include:
      - main
      - release/*
      - feature/*
    exclude:
      - experimental/*

# Trigger on all branches
trigger:
  - '*'

# Disable CI triggers
trigger: none
```

### Pull Request Triggers
```yaml
# Trigger on PRs to main
pr:
  branches:
    include:
      - main

# Trigger on PRs to multiple branches
pr:
  - main
  - develop

# Disable PR triggers
pr: none
```

### Path Triggers
```yaml
# Trigger only when specific files change
trigger:
  branches:
    include:
      - main
  paths:
    include:
      - src/*
      - package.json
    exclude:
      - docs/*
      - README.md
```

## Pipeline Variables

### Set Pipeline Variables
```bash
# Set variable for pipeline
az pipelines variable create \
  --pipeline-id {pipeline-id} \
  --name WorkItemId \
  --value 290

# Set secret variable
az pipelines variable create \
  --pipeline-id {pipeline-id} \
  --name ApiToken \
  --value {secret-value} \
  --secret true

# Update variable
az pipelines variable update \
  --pipeline-id {pipeline-id} \
  --name WorkItemId \
  --value 291
```

### List Pipeline Variables
```bash
# List all variables for pipeline
az pipelines variable list --pipeline-id {pipeline-id}

# Get specific variable
az pipelines variable list \
  --pipeline-id {pipeline-id} \
  --query "[?name=='WorkItemId'].value" \
  --output tsv
```

## Phoenix OS Integration Patterns

### Verify Build Before PR Creation
```bash
# Pattern for /impl:commit command
BRANCH_NAME="issue-290"
REPO_NAME="phoenix-os"

# 1. Push commits
git push origin $BRANCH_NAME

# 2. Wait for CI pipeline to trigger (Azure DevOps auto-triggers on push)
echo "Waiting for CI pipeline to start..."
sleep 10

# 3. Get latest build for branch
BUILD_ID=$(az pipelines runs list \
  --branch $BRANCH_NAME \
  --top 1 \
  --query "[0].id" \
  --output tsv)

if [ -z "$BUILD_ID" ]; then
  echo "⚠️  No build triggered yet. Proceeding with PR creation..."
else
  echo "Build #$BUILD_ID started. Checking status..."

  # 4. Check build result
  BUILD_RESULT=$(az pipelines runs show --id $BUILD_ID --query "result" --output tsv)

  if [ "$BUILD_RESULT" == "succeeded" ]; then
    echo "✅ Build passed. Safe to create PR."
  else
    echo "⚠️  Build status: $BUILD_RESULT. Review before creating PR."
  fi
fi

# 5. Create PR (see pr-operations.md)
az repos pr create --repository $REPO_NAME --source-branch $BRANCH_NAME --target-branch main
```

### Link Build Status to Work Item
```bash
# After PR creation, builds are automatically linked via PR → Work Item relationship
# View builds for work item:
WORK_ITEM_ID=290

# Get PRs linked to work item
az boards work-item relation show --id $WORK_ITEM_ID \
  --query "relations[?attributes.name=='Pull Request'].url"

# Then get builds for those PRs
# (Azure DevOps web UI shows this automatically)
```

## Build Artifacts

### List Build Artifacts
```bash
# List artifacts for specific run
az pipelines runs artifact list --run-id {run-id}

# Download artifact
az pipelines runs artifact download \
  --run-id {run-id} \
  --artifact-name {artifact-name} \
  --path ./downloads
```

### Publish Artifacts in Pipeline
```yaml
# Example pipeline step to publish artifacts
- task: PublishBuildArtifacts@1
  inputs:
    pathToPublish: '$(Build.ArtifactStagingDirectory)'
    artifactName: 'drop'
    publishLocation: 'Container'
```

## Pipeline Quality Gates

### Branch Protection with Build Validation
Azure DevOps branch policies can require successful builds before PR completion:

1. **Configure in Azure DevOps UI**:
   - Project Settings → Repositories → Branches
   - Select branch (e.g., main) → Branch Policies
   - Enable "Build Validation"
   - Select pipeline and set as required

2. **Verify policy programmatically**:
```bash
# Check if PR meets build policy
az repos pr policy list --id {pr-id} --query "[?type.displayName=='Build'].status"
# Output: approved, rejected, queued
```

### Phoenix OS Quality Gate Integration
```yaml
# Example: Run Phoenix OS quality gates in pipeline
steps:
  - script: |
      # Run tests
      npm test

      # Run linter
      npm run lint

      # Check code coverage
      npm run coverage

      # Phoenix OS quality gate: minimum 80% coverage
      COVERAGE=$(cat coverage/coverage-summary.json | jq '.total.lines.pct')
      if (( $(echo "$COVERAGE < 80" | bc -l) )); then
        echo "❌ Code coverage below 80%: $COVERAGE%"
        exit 1
      fi

      echo "✅ All quality gates passed"
    displayName: 'Run Quality Gates'
```

## GitHub Actions to Azure Pipelines Mapping

### Workflow Comparison
| GitHub Actions | Azure Pipelines | Notes |
|----------------|-----------------|-------|
| `.github/workflows/*.yml` | `azure-pipelines.yml` | YAML location |
| `on: push` | `trigger:` | Push trigger |
| `on: pull_request` | `pr:` | PR trigger |
| `runs-on: ubuntu-latest` | `pool: vmImage: ubuntu-latest` | VM image |
| `steps:` | `steps:` | Identical |
| `uses: actions/checkout@v3` | `- checkout: self` | Checkout step |
| GitHub Secrets | Pipeline Variables (secret) | Secret management |

### Example Migration
**GitHub Actions**:
```yaml
name: CI
on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install
      - run: npm test
```

**Azure Pipelines**:
```yaml
trigger:
  branches:
    include: [ main ]

pr:
  branches:
    include: [ main ]

pool:
  vmImage: 'ubuntu-latest'

steps:
  - checkout: self
  - task: NodeTool@0
    inputs:
      versionSpec: '18'
    displayName: 'Setup Node.js'
  - script: npm install
    displayName: 'Install dependencies'
  - script: npm test
    displayName: 'Run tests'
```

## Error Handling

### Common Errors and Solutions

**Error: "No pipelines found in project"**
```bash
# Solution: Create pipeline first
az pipelines create --name "Phoenix-CI" --repository phoenix-os --yml-path azure-pipelines.yml
```

**Error: "Pipeline run failed with result: failed"**
```bash
# Solution: View build logs
az pipelines runs show --id {run-id} --open
# Check logs for specific error details
```

**Error: "Could not find a build definition with name {pipeline-name}"**
```bash
# Solution: List available pipelines
az pipelines list --output table
# Use correct pipeline name or ID
```

## Best Practices

1. **YAML-based pipelines**: Define pipelines as code (not classic editor)
2. **Branch policies**: Require successful builds before PR merge
3. **Fast feedback**: Keep builds under 5 minutes when possible
4. **Artifact caching**: Cache dependencies (npm, pip) for faster builds
5. **Parallel jobs**: Run independent tasks concurrently
6. **Quality gates**: Enforce code coverage, linting, security scans
7. **Build badges**: Display build status in README.md
8. **Pipeline templates**: Reuse common steps across pipelines

## See Also

- [Azure Pipelines Documentation](https://learn.microsoft.com/en-us/azure/devops/pipelines/)
- [YAML Schema Reference](https://learn.microsoft.com/en-us/azure/devops/pipelines/yaml-schema/)
- [pr-operations.md](pr-operations.md) - Link builds to PRs
- [work-item-operations.md](work-item-operations.md) - Link builds to work items
- [repo-operations.md](repo-operations.md) - Repository operations

---

**Version**: 1.0.0
**Last Updated**: 2025-12-24
**Platform**: Azure Pipelines (Azure DevOps)
**Authentication**: Azure CLI (az login + keyring)
