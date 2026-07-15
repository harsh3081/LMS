# GitHub Actions Workflow Patterns

Practical patterns for GitHub Actions CI/CD pipelines with DxOps Guardian integration.

**Version**: 3.6.0
**Last Updated**: 2024-12-04
**Status**: Production-Ready

---

## Basic Workflow Structure

```yaml
name: CI/CD Pipeline
on:
  pull_request:
    branches: [main, develop]
    types: [opened, synchronize, reopened]

permissions:
  contents: read
  pull-requests: write

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Build
        run: npm run build
```

## Trigger Patterns

### Pull Request Triggers (RECOMMENDED)

```yaml
on:
  pull_request:
    types: [opened, synchronize, reopened]
    branches:
      - main
      - develop
      - 'release/**'
      - 'hotfix/**'
```

### Pull Request Review Triggers (for PR approval)

```yaml
on:
  pull_request_review:
    types: [submitted]
    branches: [main, develop]

jobs:
  on-approval:
    if: github.event.review.state == 'approved'
    runs-on: ubuntu-latest
    steps:
      - run: echo "PR was approved"
```

### Push to Branches (NOT RECOMMENDED for CI - use PR triggers)

```yaml
on:
  push:
    branches:
      - main
      - develop
    paths:
      - 'src/**'
      - 'package.json'
```

### Scheduled Triggers

```yaml
on:
  schedule:
    - cron: '0 2 * * *' # Daily at 2 AM UTC
```

### Manual Workflow Dispatch

```yaml
on:
  workflow_dispatch:
    inputs:
      environment:
        description: 'Deployment environment'
        required: true
        default: 'staging'
        type: choice
        options:
          - development
          - staging
          - production
```

## Job Patterns

### Conditional Jobs

```yaml
jobs:
  deploy:
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    runs-on: ubuntu-latest
    steps:
      - run: ./deploy.sh
```

### Job Dependencies

```yaml
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - run: npm run build

  test:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - run: npm test

  deploy:
    needs: [build, test]
    runs-on: ubuntu-latest
    steps:
      - run: ./deploy.sh
```

### Matrix Builds

```yaml
jobs:
  test:
    strategy:
      matrix:
        node: [16, 18, 20]
        os: [ubuntu-latest, windows-latest, macos-latest]
    runs-on: ${{ matrix.os }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node }}
      - run: npm test
```

## Secret Management

```yaml
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Deploy
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
          API_KEY: ${{ secrets.API_KEY }}
        run: ./deploy.sh
```

## Artifacts

```yaml
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - run: npm run build
      - uses: actions/upload-artifact@v4
        with:
          name: build
          path: dist/
          retention-days: 1

  deploy:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - uses: actions/download-artifact@v4
        with:
          name: build
          path: dist/
      - run: ./deploy.sh
```

## Environment Protection

```yaml
jobs:
  deploy-production:
    runs-on: ubuntu-latest
    environment:
      name: production
      url: https://prod.example.com
    steps:
      - run: ./deploy.sh
```

## Action Version Pinning (CRITICAL)

**ALWAYS pin actions to specific versions - NEVER use @master or @main**

```yaml
# ✅ CORRECT - Pinned versions
- uses: actions/checkout@v4
- uses: actions/setup-node@v4
- uses: actions/upload-artifact@v4
- uses: actions/download-artifact@v4
- uses: sonarsource/sonarqube-scan-action@v2.1.0
- uses: sonarsource/sonarqube-quality-gate-action@v1.1.0
- uses: snyk/actions/node@0.4.0
- uses: actions/github-script@v7
- uses: actions/setup-python@v5

# ❌ WRONG - Unstable versions
- uses: sonarsource/sonarqube-scan-action@master
- uses: snyk/actions/node@main
```

## Common Patterns

### Node.js CI with Conditional Script Execution

```yaml
jobs:
  ci:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - run: npm ci

      # Check if lint script exists before running
      - name: Check if lint exists
        id: check_lint
        run: |
          if grep -q '"lint"' package.json; then
            echo "exists=true" >> $GITHUB_OUTPUT
          else
            echo "exists=false" >> $GITHUB_OUTPUT
            echo "⚠️ lint script not found in package.json - skipping"
          fi

      - name: Run linting
        if: steps.check_lint.outputs.exists == 'true'
        run: npm run lint

      - run: npm run build
```

### Turbo Monorepo CI with Conditional Task Execution

```yaml
jobs:
  ci:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - run: npm ci

      # Check if task exists in turbo.json before running
      - name: Check if test task exists in turbo
        id: check_test
        run: |
          if grep -q '"test"' turbo.json 2>/dev/null; then
            echo "exists=true" >> $GITHUB_OUTPUT
          else
            echo "exists=false" >> $GITHUB_OUTPUT
            echo "⚠️ test task not configured in turbo.json - skipping"
          fi

      - name: Run tests
        if: steps.check_test.outputs.exists == 'true'
        run: npm run test

      - run: npm run build
```

### Native Dependencies (Tailwind v4/LightningCSS) - CRITICAL

**Problem**: LightningCSS (used by Tailwind v4) requires native `.node` binaries that may not match the CI runner's platform (linux-x64-gnu vs musl).

**Symptoms**:
- `Cannot find module 'lightningcss'`
- `Node can't locate the native .node binary`
- Build fails after `npm ci` succeeds

**Root Causes**:
1. Prebuilt binary download failed (network, registry, race conditions)
2. Runner architecture/libc differs from binary (musl vs gnu)
3. postinstall scripts suppressed or failed silently
4. Permission or cache issues

**Solution - Robust Native Module Handling**:

```yaml
jobs:
  build:
    runs-on: ubuntu-latest
    timeout-minutes: 30
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      # Enable Corepack for monorepos using pnpm/yarn
      - name: Enable Corepack
        run: corepack enable

      - name: Install dependencies
        run: |
          npm ci
          # Explicitly rebuild lightningcss native module for current platform
          # This fixes the "Cannot find module" error in CI
          npm rebuild lightningcss --workspace=@myapp/web || true
          npm rebuild lightningcss --workspace=@myapp/admin || true
          npm rebuild lightningcss --workspace=@myapp/docs || true

      # Pre-download Next.js SWC binaries to avoid race conditions
      - name: Pre-download Next.js SWC binaries
        run: |
          cd apps/web && npx next info && cd ../..
        continue-on-error: true

      - name: Build application
        run: npm run build
```

**Fallback - Build From Source** (if prebuilt fails):

```yaml
- name: Install dependencies with native rebuild
  run: |
    # Set environment to build from source if prebuilt fails
    export npm_config_build_from_source=true
    npm ci

    # Force rebuild with fallback options
    npm rebuild lightningcss --workspace=@myapp/web --update-binary || \
    npm rebuild lightningcss --workspace=@myapp/web --build-from-source || true

- name: Install build tools (if building from source)
  run: |
    sudo apt-get update
    sudo apt-get install -y build-essential python3 make g++ || true
```

**Verification Step** (add after install):

```yaml
- name: Verify native modules
  run: |
    # Check lightningcss node folder exists
    ls -la apps/web/node_modules/lightningcss/node || echo "⚠️ lightningcss node folder missing"

    # Verify Node can require the package
    node -e "try{require('./apps/web/node_modules/lightningcss'); console.log('✅ lightningcss OK')}catch(e){console.error('❌ lightningcss failed:', e.message)}"
```

**Emergency Workaround** (if all else fails):

```yaml
- name: Build application (with Tailwind workaround)
  run: |
    # Temporarily remove Tailwind CSS v4 if LightningCSS fails
    if ! node -e "require('./apps/web/node_modules/lightningcss')" 2>/dev/null; then
      echo "⚠️ LightningCSS native module issue - applying workaround"
      cd apps/web && npm uninstall @tailwindcss/postcss tailwindcss && cd ../..
    fi
    npm run build
  continue-on-error: true
```

**Disable Turbopack** (alternative workaround):

```yaml
- name: Build without Turbopack
  env:
    TURBOPACK: '0'
    NEXT_DISABLE_TURBOPACK: '1'
  run: npm run build
```

### Docker Build & Push

```yaml
jobs:
  docker:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - uses: docker/login-action@v3
        with:
          username: ${{ secrets.DOCKER_USERNAME }}
          password: ${{ secrets.DOCKER_PASSWORD }}
      
      - uses: docker/build-push-action@v5
        with:
          push: true
          tags: myapp:${{ github.sha }}
```

## DxOps Guardian Integration

### Gitleaks Secret Scanning (Free CLI - CRITICAL)

**IMPORTANT**: Use the free, self-hosted CLI - NOT the paid action.

```yaml
jobs:
  security-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      # ✅ CORRECT - Free CLI installation
      - name: Install Gitleaks (Free CLI)
        run: |
          wget https://github.com/gitleaks/gitleaks/releases/download/v8.18.2/gitleaks_8.18.2_linux_x64.tar.gz
          tar -xzf gitleaks_8.18.2_linux_x64.tar.gz
          sudo mv gitleaks /usr/local/bin/
          gitleaks version

      - name: Run Gitleaks secret scan
        id: run-gitleaks
        continue-on-error: true
        run: |
          gitleaks detect \
            --source . \
            --config .devxops/gitleaks.toml \
            --report-path gitleaks-report.json \
            --report-format json \
            --verbose \
            --no-git \
            --exit-code 1

      - name: Generate HTML report
        if: always()
        run: |
          if [ -f gitleaks-report.json ]; then
            python scripts/devxops/gitleaks-html-generator.py gitleaks-report.json gitleaks-report.html
          fi

      # ❌ WRONG - Requires paid license for organizations
      # - uses: gitleaks/gitleaks-action@v2
      #   env:
      #     GITLEAKS_LICENSE: ${{ secrets.GITLEAKS_LICENSE }}
```

### SonarQube Code Quality (With Quoted Project Names)

```yaml
- name: Setup Python for report generators
  uses: actions/setup-python@v5
  with:
    python-version: '3.11'

- name: Install Python dependencies
  run: |
    python -m pip install --upgrade pip
    pip install jinja2 pygments markdown pyyaml requests

- name: SonarQube Scan
  uses: sonarsource/sonarqube-scan-action@v2.1.0
  continue-on-error: true
  env:
    SONAR_TOKEN: ${{ secrets.SONAR_TOKEN }}
    SONAR_HOST_URL: ${{ secrets.SONAR_HOST_URL }}
  with:
    args: >
      -Dsonar.projectKey=myapp
      -Dsonar.projectName="My Application Name"
      -Dsonar.sources=.
      -Dproject.settings=.devxops/sonar-project.properties

- name: SonarQube Quality Gate
  uses: sonarsource/sonarqube-quality-gate-action@v1.1.0
  continue-on-error: true
  timeout-minutes: 5
  env:
    SONAR_TOKEN: ${{ secrets.SONAR_TOKEN }}
```

### Snyk Dependency Scanning

```yaml
- name: Run Snyk dependency scan
  uses: snyk/actions/node@0.4.0
  continue-on-error: true
  env:
    SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
  with:
    args: --severity-threshold=high --json-file-output=snyk-report.json
```

### Report Verification Before Upload (CRITICAL - Include File Sizes)

```yaml
- name: Verify reports exist
  if: always()
  run: |
    echo "🔍 Verifying report files..."
    missing_files=()

    # List of expected report files with their paths
    REPORT_FILES=(
      "Reports/Gitleaks/gitleaks-report.html"
      "Reports/Gitleaks/gitleaks-report.json"
      "Reports/Snyk/snyk-report.html"
      "Reports/Snyk/snyk-report.json"
      "Reports/PRAnalysis/pr-analysis-report.html"
    )

    for file in "${REPORT_FILES[@]}"; do
      if [[ ! -f "$file" ]]; then
        echo "❌ Missing: $file"
        missing_files+=("$file")
      else
        # CRITICAL: Show file size using stat for verification
        FILE_SIZE=$(stat -c%s "$file" 2>/dev/null || stat -f%z "$file" 2>/dev/null || echo "unknown")
        echo "✅ Found: $file (${FILE_SIZE} bytes)"
      fi
    done

    if [[ ${#missing_files[@]} -gt 0 ]]; then
      echo "::warning::Missing ${#missing_files[@]} report file(s): ${missing_files[*]}"
    fi

- name: Upload reports
  if: always()
  uses: actions/upload-artifact@v4
  with:
    name: dxops-reports
    path: |
      gitleaks-report.html
      pr-analysis-report.html
    retention-days: 30
```

### Enhanced Quality Gate Checking

```yaml
- name: Check quality gates
  if: always()
  run: |
    echo "🔍 Checking Quality Gates..."
    
    FAILED=0
    
    # Check Gitleaks
    if [ "${{ steps.run-gitleaks.outcome }}" == "failure" ]; then
      echo "❌ FAILURE: Secrets detected by Gitleaks"
      FAILED=1
    else
      echo "✅ No secrets detected"
    fi
    
    # Check SonarQube
    if [ ! -f ".scannerwork/report-task.txt" ]; then
      echo "⚠️ WARNING: SonarQube report not found"
    elif [ "${{ steps.sonarqube-scan.outcome }}" == "failure" ]; then
      echo "❌ FAILURE: SonarQube scan failed"
      FAILED=1
    else
      echo "✅ SonarQube scan passed"
    fi
    
    # Check Snyk
    if [ "${{ steps.run-snyk.outcome }}" == "failure" ]; then
      echo "❌ FAILURE: High/critical vulnerabilities found"
      FAILED=1
    else
      echo "✅ No critical vulnerabilities"
    fi
    
    if [ $FAILED -eq 1 ]; then
      echo ""
      echo "❌ Quality gates FAILED"
      exit 1
    fi
```

### Dynamic PR Comments with Real Status

```yaml
- name: Post PR comment
  if: github.event_name == 'pull_request' && always()
  uses: actions/github-script@v7
  with:
    script: |
      // Get actual step outcomes
      const gitleaksOutcome = '${{ steps.run-gitleaks.outcome }}' || 'skipped';
      const sonarqubeOutcome = '${{ steps.sonarqube-scan.outcome }}' || 'skipped';
      const snykOutcome = '${{ steps.run-snyk.outcome }}' || 'skipped';

      // Map outcomes to emoji
      const outcomeEmoji = {
        'success': '✅',
        'failure': '❌',
        'skipped': '⏭️',
        'cancelled': '🚫'
      };

      // Determine overall status
      const allSuccess = [gitleaksOutcome, sonarqubeOutcome, snykOutcome]
        .every(o => o === 'success' || o === 'skipped');
      const overallEmoji = allSuccess ? '✅' : '⚠️';
      const overallStatus = allSuccess ? 'PASSED' : 'NEEDS ATTENTION';

      let message = `${overallEmoji} **DxOps Guardian Scan** - ${overallStatus}\n\n`;
      message += '### 🔍 Scan Results\n\n';
      message += `| Tool | Status | Result |\n`;
      message += `|------|--------|--------|\n`;
      message += `| 🔒 Gitleaks | ${outcomeEmoji[gitleaksOutcome] || '❓'} | Secret Scanning |\n`;
      message += `| 🎯 SonarQube | ${outcomeEmoji[sonarqubeOutcome] || '❓'} | Code Quality |\n`;
      message += `| 🔍 Snyk | ${outcomeEmoji[snykOutcome] || '❓'} | Dependency Scan |\n\n`;
      message += `⏱️ Scan completed at: ${new Date().toUTCString()}`;

      await github.rest.issues.createComment({
        issue_number: context.issue.number,
        owner: context.repo.owner,
        repo: context.repo.repo,
        body: message
      });
```

### Safe Multi-Line String Handling

```yaml
- name: Generate report with multi-line content
  id: generate_report
  run: |
    echo "content<<EOF" >> $GITHUB_OUTPUT
    cat report.txt >> $GITHUB_OUTPUT
    echo "EOF" >> $GITHUB_OUTPUT

- name: Post comment safely
  uses: actions/github-script@v7
  with:
    script: |
      // Store multi-line output in const first
      const reportContent = `${{ steps.generate_report.outputs.content }}`.trim();
      
      let message = '## Report\n\n';
      
      // Wrap in code blocks for safe rendering
      if (reportContent) {
        message += '```\n' + reportContent + '\n```\n\n';
      } else {
        message += '*No content generated*\n\n';
      }
      
      await github.rest.issues.createComment({
        issue_number: context.issue.number,
        owner: context.repo.owner,
        repo: context.repo.repo,
        body: message
      });
```

## Monorepo Patterns (Turbo/Nx)

### Turbo Monorepo with Workspace-Specific Commands

```yaml
jobs:
  build:
    runs-on: ubuntu-latest
    timeout-minutes: 30
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Enable Corepack
        run: corepack enable

      - name: Install dependencies
        run: npm ci

      # Workspace-specific rebuild for native modules
      - name: Rebuild native modules per workspace
        run: |
          # Get list of workspaces with native dependencies
          for workspace in web admin docs; do
            if [ -d "apps/$workspace" ]; then
              npm rebuild lightningcss --workspace=@myorg/$workspace || true
            fi
          done

      # Check turbo tasks exist before running
      - name: Check if lint task exists
        id: check_lint
        run: |
          if grep -q '"lint"' turbo.json 2>/dev/null; then
            echo "exists=true" >> $GITHUB_OUTPUT
          else
            echo "exists=false" >> $GITHUB_OUTPUT
          fi

      - name: Run lint
        if: steps.check_lint.outputs.exists == 'true'
        run: npm run lint

      - name: Check if test:unit task exists
        id: check_test
        run: |
          if grep -q '"test:unit"' turbo.json 2>/dev/null || grep -q '"test"' turbo.json 2>/dev/null; then
            echo "exists=true" >> $GITHUB_OUTPUT
          else
            echo "exists=false" >> $GITHUB_OUTPUT
          fi

      - name: Run tests
        if: steps.check_test.outputs.exists == 'true'
        run: npm run test:unit || npm run test

      - name: Build
        run: npm run build
```

### Detecting Workspace Names Dynamically

```yaml
- name: Detect workspaces with native deps
  id: detect_workspaces
  run: |
    # Find workspaces that have lightningcss as dependency
    WORKSPACES=""
    for pkg in apps/*/package.json packages/*/package.json; do
      if [ -f "$pkg" ] && grep -q "lightningcss\|tailwindcss" "$pkg" 2>/dev/null; then
        DIR=$(dirname "$pkg")
        NAME=$(jq -r '.name' "$pkg")
        WORKSPACES="$WORKSPACES $NAME"
      fi
    done
    echo "workspaces=$WORKSPACES" >> $GITHUB_OUTPUT

- name: Rebuild native modules
  run: |
    for ws in ${{ steps.detect_workspaces.outputs.workspaces }}; do
      npm rebuild lightningcss --workspace=$ws || true
    done
```

## Next.js Specific Patterns

### Pre-download SWC Binaries (Avoid Race Conditions)

```yaml
- name: Pre-download Next.js SWC binaries
  run: |
    # Pre-download SWC to avoid parallel download race conditions
    # This is especially important in monorepos with multiple Next.js apps
    for app in apps/*/; do
      if [ -f "$app/next.config.js" ] || [ -f "$app/next.config.mjs" ] || [ -f "$app/next.config.ts" ]; then
        echo "Pre-downloading SWC for $app"
        cd "$app" && npx next info && cd ../..
      fi
    done
  continue-on-error: true
```

### Build with Turbopack Disabled (Fallback)

```yaml
- name: Build application
  env:
    # Disable Turbopack if experiencing native module issues
    TURBOPACK: '0'
    NEXT_DISABLE_TURBOPACK: '1'
    # Increase memory for large builds
    NODE_OPTIONS: '--max_old_space_size=4096'
  run: npm run build
```

## Best Practices Summary

### Triggers
- ✅ Use PR triggers for CI workflows
- ✅ Use PR review triggers for documentation
- ❌ Avoid push triggers for routine CI

### Actions
- ✅ Always pin to specific versions
- ❌ Never use @master or @main
- ✅ Update versions periodically

### DxOps Guardian
- ✅ Use free Gitleaks CLI (not paid action)
- ✅ Quote SonarQube project names
- ✅ Verify reports before upload
- ✅ Dynamic PR comments with real status

### Scripts
- ✅ Check if scripts/tasks exist before running
- ✅ Support both regular and monorepo projects
- ✅ Show clear warnings for missing scripts

### Native Modules (CRITICAL)
- ✅ Enable Corepack for monorepos
- ✅ Rebuild lightningcss per workspace after npm ci
- ✅ Pre-download Next.js SWC binaries
- ✅ Add verification step for native modules
- ✅ Use `|| true` to prevent rebuild failures from blocking CI
- ✅ Have emergency workaround ready (disable Tailwind/Turbopack)

### Performance
- ✅ Use artifact caching
- ✅ Single checkout pattern for large repos
- ✅ Conditional execution for optional tasks
- ✅ Set appropriate timeout-minutes (30 for builds)

---

## Step ID Naming Convention (CRITICAL)

**All step IDs MUST use `run_` prefix for consistency and output reference reliability.**

```yaml
# ✅ CORRECT - Using run_ prefix
- name: Run lint
  id: run_lint
  run: npm run lint

- name: Run tests
  id: run_test
  run: npm test

- name: Run build
  id: run_build
  run: npm run build

- name: Run Gitleaks secret scan
  id: run_gitleaks
  continue-on-error: true
  run: gitleaks detect --source . --exit-code 1

- name: SonarQube Scan
  id: run_sonarqube
  uses: sonarsource/sonarqube-scan-action@v2.1.0

- name: Run Snyk dependency scan
  id: run_snyk
  uses: snyk/actions/node@0.4.0

- name: Run PR analysis
  id: run_pr_analysis
  run: python scripts/devxops/pr-analysis.py

# ❌ WRONG - Inconsistent or missing prefixes
- name: Run lint
  id: lint_check    # Wrong: no run_ prefix
  run: npm run lint

- name: Run tests
  id: test          # Wrong: no run_ prefix
  run: npm test
```

**Why This Matters**:
1. **Consistency**: All step outputs follow same pattern `${{ steps.run_*.outputs.* }}`
2. **Readability**: Immediately clear which steps produce outputs
3. **Debugging**: Easier to trace step failures in workflow logs
4. **Refactoring**: Search/replace works reliably

---

## File Counting Pattern (CRITICAL - grep exit code issue)

**NEVER use `grep -c` for counting in GitHub Actions. It returns exit code 1 when no matches are found, which breaks workflow output handling.**

### Problem: grep -c Returns Exit Code 1 on Zero Matches

```yaml
# ❌ BROKEN - grep -c returns exit code 1 when count is 0
- name: Count files
  id: run_count
  run: |
    # This FAILS when no .js files exist - grep -c returns exit code 1
    JS_COUNT=$(echo "$FILES" | grep -c '\.js$' || echo 0)
    echo "js_count=$JS_COUNT" >> $GITHUB_OUTPUT
    # ERROR: Unable to process file command 'output' successfully
    # ERROR: Invalid format '0'
```

**Why This Fails**:
1. `grep -c` outputs the count (e.g., `0`) to stdout
2. When count is 0, `grep -c` returns exit code 1 (failure)
3. The `|| echo 0` fallback still runs, but `grep` already output `0`
4. GitHub Actions sees exit code 1 AND malformed output → workflow fails

### Solution: Use grep | wc -l Instead

```yaml
# ✅ CORRECT - wc -l always succeeds, even with zero matches
- name: Count files
  id: run_count
  run: |
    FILES=$(git diff --name-only origin/main...HEAD)

    # Use grep (without -c) piped to wc -l - always succeeds
    JS_COUNT=$(echo "$FILES" | grep '\.js$\|\.ts$\|\.jsx$\|\.tsx$' | wc -l | tr -d ' ')
    CSS_COUNT=$(echo "$FILES" | grep '\.css$\|\.scss$' | wc -l | tr -d ' ')
    TEST_COUNT=$(echo "$FILES" | grep '\.test\.\|\.spec\.\|__tests__' | wc -l | tr -d ' ')
    MD_COUNT=$(echo "$FILES" | grep '\.md$' | wc -l | tr -d ' ')

    # Ensure values are valid integers (default to 0 if empty)
    JS_COUNT=${JS_COUNT:-0}
    CSS_COUNT=${CSS_COUNT:-0}
    TEST_COUNT=${TEST_COUNT:-0}
    MD_COUNT=${MD_COUNT:-0}

    echo "js_files=$JS_COUNT" >> $GITHUB_OUTPUT
    echo "css_files=$CSS_COUNT" >> $GITHUB_OUTPUT
    echo "test_files=$TEST_COUNT" >> $GITHUB_OUTPUT
    echo "md_files=$MD_COUNT" >> $GITHUB_OUTPUT
```

**Why This Works**:
1. `grep` (without -c) outputs matching lines (or nothing)
2. `wc -l` counts lines - returns `0` for empty input, never fails
3. `tr -d ' '` removes any whitespace padding
4. Default value `${VAR:-0}` ensures valid integer

### Alternative: grep -c with Subshell Capture

```yaml
# ✅ ALSO CORRECT - Capture exit code separately
- name: Count files
  id: run_count
  run: |
    FILES=$(git diff --name-only origin/main...HEAD)

    # Subshell approach - captures output even on failure
    JS_COUNT=$(echo "$FILES" | grep -c '\.js$' 2>/dev/null) || JS_COUNT=0

    echo "js_files=$JS_COUNT" >> $GITHUB_OUTPUT
```

**Key Rule**: When counting matches in GitHub Actions, ALWAYS use `grep | wc -l` pattern, NEVER use `grep -c` directly.

---

## Turbo-First Task Detection (CRITICAL for Monorepos)

**ALWAYS check turbo.json FIRST, then fall back to package.json. This is critical for monorepos.**

### Turbo-First Pattern

```yaml
# ✅ CORRECT - Check turbo.json FIRST, then package.json fallback
- name: Check if lint task exists
  id: run_check_lint
  run: |
    # TURBO FIRST: Check turbo.json for pipeline task
    if [ -f "turbo.json" ] && grep -q '"lint"' turbo.json 2>/dev/null; then
      echo "exists=true" >> $GITHUB_OUTPUT
      echo "source=turbo" >> $GITHUB_OUTPUT
      echo "✅ lint task found in turbo.json"
    # FALLBACK: Check package.json scripts
    elif grep -q '"lint"' package.json 2>/dev/null; then
      echo "exists=true" >> $GITHUB_OUTPUT
      echo "source=package" >> $GITHUB_OUTPUT
      echo "✅ lint script found in package.json"
    else
      echo "exists=false" >> $GITHUB_OUTPUT
      echo "⚠️ lint task not found in turbo.json or package.json - skipping"
    fi

- name: Run lint
  id: run_lint
  if: steps.run_check_lint.outputs.exists == 'true'
  run: npm run lint
```

### Complete Turbo-First Build Job Pattern

```yaml
jobs:
  build:
    runs-on: ubuntu-latest
    timeout-minutes: 30
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Enable Corepack
        run: corepack enable

      - name: Install dependencies
        id: run_install
        run: npm ci

      # === LINT CHECK (Turbo-First) ===
      - name: Check if lint task exists
        id: run_check_lint
        run: |
          if [ -f "turbo.json" ] && grep -q '"lint"' turbo.json 2>/dev/null; then
            echo "exists=true" >> $GITHUB_OUTPUT
          elif grep -q '"lint"' package.json 2>/dev/null; then
            echo "exists=true" >> $GITHUB_OUTPUT
          else
            echo "exists=false" >> $GITHUB_OUTPUT
            echo "⚠️ lint task not configured - skipping"
          fi

      - name: Run lint
        id: run_lint
        if: steps.run_check_lint.outputs.exists == 'true'
        run: npm run lint

      # === TYPE CHECK (Turbo-First) ===
      - name: Check if type-check task exists
        id: run_check_typecheck
        run: |
          if [ -f "turbo.json" ] && grep -q '"check-types"\|"type-check"\|"typecheck"' turbo.json 2>/dev/null; then
            echo "exists=true" >> $GITHUB_OUTPUT
          elif grep -q '"check-types"\|"type-check"\|"typecheck"' package.json 2>/dev/null; then
            echo "exists=true" >> $GITHUB_OUTPUT
          else
            echo "exists=false" >> $GITHUB_OUTPUT
            echo "⚠️ type-check task not configured - skipping"
          fi

      - name: Run type check
        id: run_typecheck
        if: steps.run_check_typecheck.outputs.exists == 'true'
        run: npm run check-types || npm run type-check || npm run typecheck

      # === TEST CHECK (Turbo-First) ===
      - name: Check if test task exists
        id: run_check_test
        run: |
          if [ -f "turbo.json" ] && grep -q '"test"\|"test:unit"' turbo.json 2>/dev/null; then
            echo "exists=true" >> $GITHUB_OUTPUT
          elif grep -q '"test"\|"test:unit"' package.json 2>/dev/null; then
            echo "exists=true" >> $GITHUB_OUTPUT
          else
            echo "exists=false" >> $GITHUB_OUTPUT
            echo "⚠️ test task not configured - skipping"
          fi

      - name: Run tests
        id: run_test
        if: steps.run_check_test.outputs.exists == 'true'
        run: npm run test:unit || npm run test

      # === BUILD (Always required) ===
      - name: Run build
        id: run_build
        run: npm run build
```

### Why Turbo-First Matters

1. **Monorepo Reality**: In Turbo monorepos, tasks are defined in `turbo.json` pipeline, not necessarily in root `package.json`
2. **Pipeline Dependencies**: Turbo tracks task dependencies (e.g., `build` depends on `lint`)
3. **Workspace Filtering**: Turbo runs tasks across all workspaces automatically
4. **Cache Behavior**: Turbo uses its own caching based on `turbo.json` configuration

```yaml
# ❌ WRONG - Only checks package.json (misses turbo tasks)
- name: Check if lint exists
  run: |
    if grep -q '"lint"' package.json; then
      echo "exists=true" >> $GITHUB_OUTPUT
    fi

# ✅ CORRECT - Checks turbo.json FIRST
- name: Check if lint exists
  run: |
    if [ -f "turbo.json" ] && grep -q '"lint"' turbo.json 2>/dev/null; then
      echo "exists=true" >> $GITHUB_OUTPUT
    elif grep -q '"lint"' package.json 2>/dev/null; then
      echo "exists=true" >> $GITHUB_OUTPUT
    fi
```

---

## Report Directory Organization (CRITICAL)

**All reports MUST be organized in subdirectories under `Reports/` folder.**

### Directory Structure

```
Reports/
├── Gitleaks/
│   ├── gitleaks-report.json
│   └── gitleaks-report.html
├── Snyk/
│   ├── snyk-report.json
│   └── snyk-report.html
├── SonarQube/
│   └── sonar-report.html
├── PRAnalysis/
│   └── pr-analysis-report.html
└── Documentation/
    ├── changelog-update.md
    └── pr-documentation.md
```

### Creating Report Directories

```yaml
- name: Create report directories
  run: |
    mkdir -p Reports/Gitleaks
    mkdir -p Reports/Snyk
    mkdir -p Reports/SonarQube
    mkdir -p Reports/PRAnalysis
    mkdir -p Reports/Documentation

- name: Run Gitleaks secret scan
  id: run_gitleaks
  continue-on-error: true
  run: |
    gitleaks detect \
      --source . \
      --config .devxops/gitleaks.toml \
      --report-path Reports/Gitleaks/gitleaks-report.json \
      --report-format json \
      --verbose \
      --no-git \
      --exit-code 1

- name: Generate Gitleaks HTML report
  if: always()
  run: |
    if [ -f Reports/Gitleaks/gitleaks-report.json ]; then
      python scripts/devxops/gitleaks-html-generator.py \
        Reports/Gitleaks/gitleaks-report.json \
        Reports/Gitleaks/gitleaks-report.html
    fi

- name: Run Snyk dependency scan
  id: run_snyk
  uses: snyk/actions/node@0.4.0
  continue-on-error: true
  env:
    SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
  with:
    args: --severity-threshold=high --json-file-output=Reports/Snyk/snyk-report.json
```

### Upload Reports with Structure

```yaml
- name: Upload DxOps Reports
  if: always()
  uses: actions/upload-artifact@v4
  with:
    name: dxops-reports-${{ github.run_number }}
    path: Reports/
    retention-days: 30
```

---

## Quality Gate Logic (Failures vs Warnings)

**Separate FAILURES (must block) from WARNINGS (inform only).**

### Quality Gate Pattern

```yaml
- name: Evaluate quality gates
  id: run_quality_gates
  if: always()
  run: |
    echo "🔍 Evaluating Quality Gates..."
    echo ""

    FAILURES=0
    WARNINGS=0

    # === CRITICAL FAILURES (Block PR) ===

    # Gitleaks - Secrets detected is CRITICAL
    if [ "${{ steps.run_gitleaks.outcome }}" == "failure" ]; then
      echo "❌ FAILURE: Secrets detected by Gitleaks - BLOCKING"
      FAILURES=$((FAILURES + 1))
    else
      echo "✅ PASSED: No secrets detected"
    fi

    # Snyk - High/Critical vulnerabilities are CRITICAL
    if [ "${{ steps.run_snyk.outcome }}" == "failure" ]; then
      echo "❌ FAILURE: High/critical vulnerabilities found - BLOCKING"
      FAILURES=$((FAILURES + 1))
    else
      echo "✅ PASSED: No critical vulnerabilities"
    fi

    # === WARNINGS (Inform but don't block) ===

    # SonarQube - Quality gate failure is WARNING (configurable)
    if [ "${{ steps.run_sonarqube.outcome }}" == "failure" ]; then
      echo "⚠️ WARNING: SonarQube quality gate failed"
      WARNINGS=$((WARNINGS + 1))
    elif [ "${{ steps.run_sonarqube.outcome }}" == "skipped" ]; then
      echo "⏭️ SKIPPED: SonarQube scan was skipped"
    else
      echo "✅ PASSED: SonarQube quality gate"
    fi

    # Lint failures are WARNINGS (don't block security scans)
    if [ "${{ steps.run_lint.outcome }}" == "failure" ]; then
      echo "⚠️ WARNING: Lint check failed"
      WARNINGS=$((WARNINGS + 1))
    fi

    # === SUMMARY ===
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "📊 Quality Gate Summary"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "   Failures: $FAILURES"
    echo "   Warnings: $WARNINGS"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

    # Set outputs
    echo "failures=$FAILURES" >> $GITHUB_OUTPUT
    echo "warnings=$WARNINGS" >> $GITHUB_OUTPUT

    if [ $FAILURES -gt 0 ]; then
      echo ""
      echo "❌ Quality gates FAILED with $FAILURES critical issue(s)"
      exit 1
    elif [ $WARNINGS -gt 0 ]; then
      echo ""
      echo "⚠️ Quality gates PASSED with $WARNINGS warning(s)"
      exit 0
    else
      echo ""
      echo "✅ All quality gates PASSED"
      exit 0
    fi
```

---

## Sensitive File Detection Pattern

**Detect and warn about sensitive files in PRs.**

```yaml
- name: Check for sensitive files
  id: run_sensitive_check
  run: |
    echo "🔍 Checking for sensitive file patterns..."

    SENSITIVE_PATTERNS=(
      ".env"
      ".env.*"
      "*.pem"
      "*.key"
      "*.p12"
      "*.pfx"
      "credentials.json"
      "secrets.json"
      "*.secrets"
      "id_rsa*"
      "*.keystore"
      "serviceAccountKey.json"
    )

    FOUND_FILES=()

    for pattern in "${SENSITIVE_PATTERNS[@]}"; do
      # Check staged/changed files in PR
      while IFS= read -r file; do
        if [[ -n "$file" ]]; then
          FOUND_FILES+=("$file")
        fi
      done < <(git diff --name-only origin/${{ github.base_ref }}...HEAD | grep -E "$pattern" 2>/dev/null || true)
    done

    if [ ${#FOUND_FILES[@]} -gt 0 ]; then
      echo "⚠️ WARNING: Potentially sensitive files detected:"
      printf '  - %s\n' "${FOUND_FILES[@]}"
      echo "sensitive_found=true" >> $GITHUB_OUTPUT
      echo "sensitive_files=${FOUND_FILES[*]}" >> $GITHUB_OUTPUT
    else
      echo "✅ No sensitive file patterns detected"
      echo "sensitive_found=false" >> $GITHUB_OUTPUT
    fi
```

---

**Version**: 3.6.0
**Last Updated**: 2024-12-04
**Status**: Production-Ready

**Changelog v3.6.0**:
- CRITICAL: Added "File Counting Pattern" section explaining grep -c exit code issue
- Added `grep | wc -l` pattern as the ONLY correct way to count matches
- Documented why `grep -c || echo 0` fails (outputs before exit code check)
- Added alternative subshell capture approach for edge cases

**Changelog v3.5.0**:
- Enhanced report verification pattern to include file sizes using `stat -c%s`
- Updated report file list to use organized paths (Reports/Gitleaks/, Reports/Snyk/, etc.)
- Added cross-platform stat fallback (Linux -c%s, macOS -f%z)

**Changelog v3.4.0**:
- Added Step ID Naming Convention section (run_ prefix)
- Added Turbo-First Task Detection section (critical for monorepos)
- Added Report Directory Organization section
- Added Quality Gate Logic section (FAILURES vs WARNINGS)
- Added Sensitive File Detection pattern