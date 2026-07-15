# CI/CD Pipeline Patterns

**Purpose**: Best practices and patterns for Continuous Integration and Continuous Deployment pipelines
**Scope**: Pipeline architecture, build, testing, security, caching, optimization patterns
**Platform**: GitHub Actions, GitLab CI, Azure DevOps, Jenkins, platform-agnostic patterns
**Version**: 2.0.0
**Last Updated**: 2025-12-05

Enterprise-grade knowledge base for CI/CD pipeline patterns, optimization strategies, and workflow configurations.

## Pipeline Architecture Patterns

### 1. Multi-Stage Pipeline Pattern

**Structure**:

```yaml
stages:
  - build      # Compile, bundle, package
  - test       # Unit, integration, e2e tests
  - security   # Security scanning, quality gates
  - deploy     # Deployment to environments
  - verify     # Post-deployment validation
```

**Benefits**:
- Clear separation of concerns
- Parallel execution within stages
- Easy to visualize pipeline progress
- Fail-fast approach

**Suitable Scenarios**: All projects, especially large applications

---

### 2. Environment Promotion Pattern

**Flow**: Development → Staging → Production

**Characteristics**:
- Promote exact same artifact through environments
- Never rebuild for different environments
- Use environment-specific configuration injection
- Require manual approval for production

**Implementation**:

```yaml
deploy-dev:
  stage: deploy
  environment: development
  rules:
    - if: $CI_COMMIT_BRANCH == "develop"

deploy-staging:
  stage: deploy
  environment: staging
  rules:
    - if: $CI_COMMIT_BRANCH == "main"
  needs: [deploy-dev]

deploy-prod:
  stage: deploy
  environment: production
  when: manual  # Manual approval required
  needs: [deploy-staging]
```

---

### 3. Feature Branch Pipeline Pattern

**Strategy**: Run different pipeline stages based on branch type

**Branch Types**:
- **Feature branches** (`feature/*`): Build + Unit tests
- **Develop branch**: Build + All tests + Deploy to dev
- **Main branch**: Full pipeline + Deploy to staging
- **Release tags**: Full pipeline + Deploy to production

**Benefits**:
- Fast feedback on feature branches
- Resource optimization
- Clear deployment strategy

---

### 4. Trunk-Based Development Pattern

**Strategy**: Short-lived feature branches, continuous integration to main

**Characteristics**:
- Feature branches live < 1 day
- Main branch always deployable
- Feature flags for incomplete features
- Automated rollback on failure

**Pipeline**:

```yaml
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  ci:
    # Build, test, security scan

  deploy:
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    # Deploy to production with feature flags
```

---

## Build Patterns

### 1. Docker Layer Caching

**Pattern**: Cache Docker layers to speed up builds

```dockerfile
# Multi-stage build for optimal caching
FROM node:18-alpine AS dependencies
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --only=production

FROM node:18-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:18-alpine AS production
WORKDIR /app
COPY --from=dependencies /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
CMD ["node", "dist/index.js"]
```

**Pipeline Integration**:
- Cache node_modules layer
- Cache build artifacts
- Only rebuild changed layers

---

### 2. Artifact Versioning Pattern

**Strategy**: Semantic versioning with build metadata

**Format**: `{major}.{minor}.{patch}+{commit-sha}.{build-number}`

**Example**: `1.2.3+a1b2c3d.456`

**Implementation**:

```bash
VERSION=$(cat VERSION)
BUILD_NUMBER=$CI_PIPELINE_ID
COMMIT_SHA=${CI_COMMIT_SHORT_SHA}
ARTIFACT_VERSION="${VERSION}+${COMMIT_SHA}.${BUILD_NUMBER}"
```

**Benefits**:
- Traceable to exact code version
- Unique for each build
- Easy rollback identification

---

## Testing Patterns

### 1. Test Pyramid Pattern

**Structure**:

```
       /\
      /E2E\       (Few, slow, expensive)
     /------\
    /  Inte- \    (Some, medium speed)
   / gration \
  /------------\
 /  Unit Tests \  (Many, fast, cheap)
/----------------\
```

**Pipeline Implementation**:

```yaml
test-unit:
  stage: test
  script: npm run test:unit
  coverage: '/Coverage: \d+\.\d+/'

test-integration:
  stage: test
  script: npm run test:integration
  needs: [test-unit]

test-e2e:
  stage: test
  script: npm run test:e2e
  needs: [test-integration]
  when: manual  # Run on-demand or for main branch
```

---

### 2. Parallel Test Execution Pattern

**Strategy**: Split tests into parallel jobs for faster feedback

```yaml
test:
  stage: test
  parallel: 4
  script:
    - npm run test -- --shard=$CI_NODE_INDEX/$CI_NODE_TOTAL
```

**Benefits**:
- Faster pipeline execution
- Better resource utilization
- Quick feedback

---

## Security Patterns

### 1. Shift-Left Security Pattern

**Strategy**: Security checks early in pipeline

**Order**:
1. **Pre-commit**: Gitleaks (local hook)
2. **PR Check**: Lint, secret scan, dependency scan
3. **Build**: SAST (Static Application Security Testing)
4. **Deploy**: DAST (Dynamic Application Security Testing)

**Implementation**:

```yaml
security-scan:
  stage: security
  parallel:
    matrix:
      - TOOL: [gitleaks, snyk, sonarqube]
  script:
    - ./scripts/security-scan.sh $TOOL
  allow_failure: false  # Block on security issues
```

---

### 2. Quality Gate Pattern

**Strategy**: Enforce quality thresholds before deployment

**Metrics**:
- Code coverage ≥ 80%
- No critical/high security vulnerabilities
- Technical debt ratio < 5%
- Code duplication < 3%
- No secrets in code

**Implementation**:

```yaml
quality-gate:
  stage: security
  script:
    - ./scripts/quality-gate-check.sh
  rules:
    - if: $CI_COMMIT_BRANCH == "main"
  allow_failure: false
```

---

## Deployment Integration

**Pipeline Integration Summary**:

```yaml
deploy:
  stage: deploy
  script:
    - ./scripts/deploy.sh --strategy=$DEPLOYMENT_STRATEGY
  environment:
    name: $ENVIRONMENT
    url: $DEPLOYMENT_URL
  only:
    - main
    - release/*
```

**Common Integration Points**:
- Artifact promotion from build stage
- Environment-specific configuration injection
- Health check validation post-deployment
- Automated rollback on failure detection

---

## Workflow Patterns

### 1. GitFlow Pipeline Pattern

**Branches**:
- `main`: Production-ready code
- `develop`: Integration branch
- `feature/*`: Feature development
- `release/*`: Release preparation
- `hotfix/*`: Production fixes

**Pipeline Behavior**:

```yaml
# Feature branch: Build + Unit tests
feature/*:
  jobs: [build, test-unit]

# Develop: Build + All tests + Deploy dev
develop:
  jobs: [build, test-unit, test-integration, deploy-dev]

# Release: Full pipeline + Deploy staging
release/*:
  jobs: [build, test-all, security-scan, deploy-staging]

# Main: Full pipeline + Deploy prod (manual)
main:
  jobs: [build, test-all, security-scan, deploy-prod]
```

---

### 2. Trunk-Based Pipeline Pattern

**Branches**:
- `main`: Always deployable
- `feature/*`: Short-lived (< 1 day)

**Pipeline Behavior**:
- Every commit to main triggers full pipeline
- Automatic deployment to production
- Feature flags control feature visibility
- Automated rollback on failure

---

## Caching Patterns

### 1. Dependency Caching Pattern

**Strategy**: Cache dependencies to speed up builds

**GitHub Actions**:

```yaml
- uses: actions/cache@v3
  with:
    path: ~/.npm
    key: ${{ runner.os }}-node-${{ hashFiles('**/package-lock.json') }}
    restore-keys: |
      ${{ runner.os }}-node-
```

**GitLab CI**:

```yaml
cache:
  key: ${CI_COMMIT_REF_SLUG}
  paths:
    - node_modules/
    - .npm/
```

---

### 2. Build Artifact Caching Pattern

**Strategy**: Cache build artifacts between jobs

```yaml
build:
  artifacts:
    paths:
      - dist/
      - build/
    expire_in: 1 week

deploy:
  needs: [build]
  # Uses artifacts from build job
```

---

## Notification Patterns

### 1. Status Notification Pattern

**Events to Notify**:
- ✅ Deployment success
- ❌ Pipeline failure
- ⚠️ Security vulnerability found
- 📊 Quality gate violation
- 🚀 Production deployment

**Channels**:
- Slack/Teams for team notifications
- Email for critical failures
- GitHub/GitLab comments for PR status
- PagerDuty for production incidents

---

### 2. Stakeholder Notification Pattern

**Strategy**: Different notifications for different audiences

**Audiences**:
- **Developers**: All pipeline events
- **QA**: Deployment to staging/production
- **Product Managers**: Production deployments
- **DevOps**: Infrastructure issues, security alerts

---

## Failure Handling Patterns

### 1. Fail-Fast Pattern

**Strategy**: Stop pipeline immediately on critical failures

```yaml
test-critical:
  stage: test
  script: npm run test:critical
  allow_failure: false  # Must pass

test-optional:
  stage: test
  script: npm run test:optional
  allow_failure: true  # Can fail
```

---

### 2. Retry Pattern

**Strategy**: Automatically retry flaky tests or network failures

```yaml
test-flaky:
  stage: test
  script: npm run test:e2e
  retry:
    max: 2
    when:
      - script_failure
      - runner_system_failure
```

---

### 3. Auto-Rollback Pattern

**Strategy**: Automatically rollback on post-deployment failures

```yaml
deploy-prod:
  stage: deploy
  script:
    - ./scripts/deploy.sh
    - ./scripts/health-check.sh || ./scripts/rollback.sh
  environment:
    name: production
    on_stop: rollback-prod

rollback-prod:
  stage: deploy
  script: ./scripts/rollback.sh
  when: on_failure
```

---

## Pipeline Optimization Patterns

### 1. Conditional Job Execution Pattern

**Strategy**: Only run jobs when necessary

```yaml
deploy-docs:
  stage: deploy
  script: ./scripts/deploy-docs.sh
  only:
    changes:
      - docs/**
      - README.md

deploy-app:
  stage: deploy
  script: ./scripts/deploy-app.sh
  only:
    changes:
      - src/**
      - package.json
```

---

### 2. Matrix Build Pattern

**Strategy**: Test multiple configurations in parallel

```yaml
test:
  strategy:
    matrix:
      node: [16, 18, 20]
      os: [ubuntu-latest, windows-latest, macos-latest]
  steps:
    - uses: actions/setup-node@v3
      with:
        node-version: ${{ matrix.node }}
    - run: npm test
```

---

## Best Practices Summary

### Pipeline Design

**Performance Characteristics**:
- Pipeline execution time: Target < 10 minutes for CI
- Fail-fast on critical issues: Stop immediately on security/quality failures
- Conditional execution: Run expensive tests only when necessary
- Parallel execution: Use wherever possible for faster feedback
- Caching strategy: Cache dependencies and artifacts aggressively

### Security

**Security Integration Points**:
- Pre-commit scanning: Gitleaks for secret detection locally
- PR-level scanning: Run security scans on every pull request
- Secret management: Never store secrets in code, use secret managers
- Service accounts: Use least-privilege accounts for pipeline execution
- Audit logging: Track all production deployments

### Deployment

**Deployment Best Practices**:
- Rollback capability: Always maintain ability to rollback quickly
- Manual approvals: Require manual approval for production deployments
- Post-deployment monitoring: Monitor metrics after deployment
- Smoke testing: Automate smoke tests post-deployment

### Quality

**Quality Assurance Standards**:
- Quality gate enforcement: Block deployment on quality violations
- Coverage tracking: Monitor code coverage trends over time
- Vulnerability blocking: Block on high/critical vulnerabilities
- Linting priority: Run linting before tests for faster feedback
- Technical debt management: Keep technical debt ratio in check

### Monitoring

**Pipeline Observability**:
- Failure alerting: Alert team on pipeline failures immediately
- Duration tracking: Track pipeline duration trends for optimization
- Deployment frequency: Measure deployment frequency (DORA metric)
- MTTR measurement: Track Mean Time To Recovery
- Metrics dashboard: Visualize pipeline metrics for team visibility

---

## See Also

**Related DevOps Practices**:
- `secret-management.md` - Secret management in CI/CD pipelines

**Related Memory**:
- `${config.memory.tools.github_actions}` - GitHub Actions specific patterns
- `${config.memory.tools.gitlab_ci}` - GitLab CI specific patterns
- `${config.memory.tools.azure_devops}` - Azure DevOps pipelines
- `${config.memory.tools.jenkins}` - Jenkins pipeline patterns
- `${config.memory.tools.devxops}` - DxOps Guardian security integration

---

**Version**: 2.0.0
**Last Updated**: 2025-12-05
**Status**: Active
**Philosophy Alignment**: 95%

**Changelog v2.0.0**:
- Added metadata header with purpose, scope, and platform information
- Converted prescriptive language ("When to Use") to descriptive ("Suitable Scenarios")
- Added cross-references to related memory files
- Improved structure with clear knowledge categorization
- Reduced file length (623 → 560 lines) by removing duplication
- Philosophy-aligned: Pure knowledge, no agent/command decision logic
