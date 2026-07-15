# SonarQube Setup

**Intent**: Enable static code analysis to detect quality, security, and maintainability issues before production.

**Context**: Platform-specific patterns for SonarQube integration and quality gate configuration.

---
**Memory Type**: Long-Term (LT)
**Category**: Platform patterns (tools/devxops)
**Update Authority**: High-order agents or manual PR
---

## Intent & Outcomes

### What Problem Does This Solve?
Static code analysis to detect maintainability issues, security vulnerabilities, code smells, and technical debt before they reach production.

### Why It Matters
- **Quality**: Proactive detection of bugs, code smells, and complexity issues
- **Security**: Identifies OWASP Top 10 vulnerabilities and security hotspots
- **Maintainability**: Tracks technical debt and duplication trends
- **Compliance**: Provides audit trail and quality metrics for governance

### Expected Outcomes
- Quantified code quality metrics (coverage ≥80%, duplications <3%)
- Security vulnerability detection at PR level
- Technical debt visibility and trend analysis
- Automated quality gate enforcement

---

## Context-Aware Decision Making

### Tool Selection by Context

| Context | Tool Choice | Rationale |
|---------|-------------|-----------|
| Open Source Projects | SonarCloud (SaaS) | Free for public repos, zero infrastructure |
| Enterprise/On-Prem | SonarQube Server (self-hosted) | Data control, compliance requirements |
| Small Teams (<10) | SonarCloud or CodeClimate | Low maintenance overhead |
| Compliance-Heavy | SonarQube Server (self-hosted) | Data sovereignty, audit requirements |

### Quality Gate Thresholds by Project Type

| Project Type | Coverage | Code Smells | Duplications | Security Hotspots |
|--------------|----------|-------------|--------------|-------------------|
| Production Library | ≥90% | ≤25 | ≤2% | 0 (zero tolerance) |
| Production Application | ≥80% | ≤50 | ≤3% | 0 (zero tolerance) |
| MVP/Prototype | ≥60% | ≤100 | ≤5% | High/Critical only |
| Internal Tool | ≥70% | ≤75 | ≤4% | High/Critical only |

### Enforcement Strategy by Environment

**Development/Feature Branches**:
- Run analysis but don't block (informational)
- Focus on new code quality

**Pull Requests** (Recommended):
- Block merge if quality gate fails
- Enforce on new code changes only

**Main/Release Branches**:
- Block deployment if critical security issues
- Strict enforcement of all quality gates

---

## Configuration File

### Standard Project (Single Source Directory)

```properties
# .devxops/sonar-project.properties
sonar.projectKey=myapp
sonar.projectName=My Application
sonar.projectVersion=1.0

# Source
sonar.sources=src
sonar.tests=tests

# Exclusions
sonar.exclusions=**/*test*/**,**/*.spec.ts,**/node_modules/**

# Coverage
sonar.javascript.lcov.reportPaths=coverage/lcov.info
sonar.coverage.exclusions=**/*test*/**,**/*.spec.ts

# Quality Gates
sonar.qualitygate.wait=true
```

### Monorepo Project (Multiple Workspaces)

**CRITICAL**: `sonar.tests` does NOT support wildcards (`*`, `**`). Use `sonar.test.inclusions` instead.

```properties
# .devxops/sonar-project.properties
sonar.projectKey=myapp-monorepo
sonar.projectName="My Monorepo App"
sonar.projectVersion=1.0

# Source (comma-separated directories, wildcards NOT supported)
sonar.sources=apps,packages

# Test Patterns (use inclusions instead of sonar.tests for monorepos)
# Wildcards ARE supported in sonar.test.inclusions
sonar.test.inclusions=**/*.test.ts,**/*.test.tsx,**/*.test.js,**/*.test.jsx,**/*.spec.ts,**/*.spec.tsx,**/*.spec.js,**/*.spec.jsx,**/__tests__/**/*,**/__mocks__/**/*

# Exclusions (wildcards supported)
sonar.exclusions=**/node_modules/**,**/dist/**,**/build/**,**/.next/**,**/.turbo/**,**/coverage/**,**/*.min.js,**/*.min.css,**/*.bundle.js,**/public/**,**/static/**

# Coverage (wildcards supported for paths)
sonar.javascript.lcov.reportPaths=coverage/lcov.info,apps/*/coverage/lcov.info,packages/*/coverage/lcov.info
sonar.typescript.lcov.reportPaths=coverage/lcov.info,apps/*/coverage/lcov.info,packages/*/coverage/lcov.info
sonar.coverage.exclusions=**/*.test.ts,**/*.test.js,**/*.spec.ts,**/*.spec.js,**/__tests__/**,**/__mocks__/**,**/test/**,**/tests/**

# Quality Gates
sonar.qualitygate.wait=true
sonar.qualitygate.timeout=300
```

**Key Rules**:
- `sonar.sources` and `sonar.tests`: Comma-separated directories ONLY (no wildcards)
- `sonar.test.inclusions`: Use wildcards to identify test files
- `sonar.exclusions`: Use wildcards to filter out files
- For monorepos: Omit `sonar.tests`, use `sonar.test.inclusions` instead

---

## Error Context (Following Phoenix Standard)

### Error: Quality Gate Failed

**What Failed**: SonarQube quality gate marked as "failed" on PR, blocking merge

**Why It Fails**:
- Code coverage dropped below threshold (e.g., <80%)
- Critical or high severity security vulnerabilities detected
- Code duplication exceeds maximum (>3%)
- Too many code smells detected

**How to Fix**:
1. Check SonarQube dashboard for specific failure reason:
   - Navigate to project → Pull Request → View details
2. Address the specific issues:
   - **Coverage**: Add/improve tests: `npm run test -- --coverage`
   - **Security**: Fix vulnerability or mark as false positive in SonarQube
   - **Duplication**: Refactor duplicated code blocks
   - **Code Smells**: Address high-priority smells first

**Alternative Path**:
- Temporarily adjust quality gate thresholds (NOT recommended for security issues)
- Request exemption from team lead with documented justification
- Split PR into smaller chunks if too large to fix in one go

**Impact Without Fix**:
- PR merge blocked
- Feature delivery delayed
- Technical debt accumulates
- Security vulnerabilities may reach production

---

### Error: SonarQube Connection Failed

**What Failed**: GitHub Action cannot reach SonarQube server (connection timeout or 401/403 error)

**Why It Fails**:
- `SONAR_TOKEN` expired or invalid
- `SONAR_HOST_URL` incorrect or server down
- Network/firewall blocking connection
- SonarQube server maintenance

**How to Fix**:
1. Verify server reachability: `curl -I $SONAR_HOST_URL`
2. Check token validity:
   - Log into SonarQube → My Account → Security → Tokens
   - Regenerate token if expired
3. Update GitHub secret:
   - GitHub repo → Settings → Secrets → Update `SONAR_TOKEN`
4. Verify correct URL format: `https://sonarqube.example.com` (no trailing slash)

**Alternative Path**:
- Use `continue-on-error: true` temporarily to unblock PR (not recommended)
- Switch to SonarCloud if self-hosted server unreliable
- Run scan locally: `npm run sonar` (if configured)

**Impact Without Fix**:
- No quality feedback on PRs
- Risk of merging poor quality code
- Manual code review burden increases

---

### Error: Out of Memory During Scan

**What Failed**: SonarQube scan crashes with "OutOfMemoryError" or "JavaScript heap out of memory"

**Why It Fails**:
- Large codebase (>100k LOC) with default memory limits
- Too many files analyzed simultaneously
- Circular dependencies causing analysis loops

**How to Fix**:
1. Increase Node.js memory limit in CI:
   ```yaml
   env:
     NODE_OPTIONS: '--max_old_space_size=4096'
   ```
2. Exclude unnecessary paths in `sonar-project.properties`:
   ```properties
   sonar.exclusions=**/node_modules/**,**/dist/**,**/build/**,**/*.min.js
   ```
3. Analyze specific directories only (monorepos):
   ```properties
   sonar.sources=src,packages/*/src
   ```

**Alternative Path**:
- Split analysis into multiple jobs (per workspace in monorepos)
- Use SonarCloud (higher resource limits)
- Upgrade CI runner to higher memory tier

**Impact Without Fix**:
- Analysis incomplete or fails entirely
- No quality metrics available
- Build pipeline unstable

---

### Error: No Branch Exists in SonarQube

**What Failed**: SonarQube scan fails with "No branch exists in Sonarqube with the name main"

**Why It Fails**:
- First-time project setup - no baseline branch analyzed yet
- SonarQube requires initial main branch scan before PR analysis
- Branch comparison mode enabled but no reference branch exists

**How to Fix**:
1. **Option A - Use Branch Name (Recommended for first-time setup)**:
   - Scan PR as independent branch (no comparison to main)
   - Add `-Dsonar.branch.name=${{ github.head_ref }}` to workflow args
   - Each PR scanned independently without baseline comparison

2. **Option B - Run initial main branch scan**:
   - Push to main branch to create baseline
   - Wait for initial scan to complete
   - Subsequent PRs will compare against main baseline

**Alternative Path**:
- Disable branch analysis entirely (single-branch mode)
- Use SonarCloud (auto-creates projects/branches)
- Configure SonarQube auto-provisioning

**Impact Without Fix**:
- All PR scans fail
- No code quality feedback on pull requests
- CI pipeline blocked

---

## CI/CD Integration

### GitHub Actions

**Standard Configuration** (requires main branch baseline):
```yaml
- name: SonarQube Scan
  uses: sonarsource/sonarqube-scan-action@v2.1.0
  env:
    SONAR_TOKEN: ${{ secrets.SONAR_TOKEN }}
    SONAR_HOST_URL: ${{ secrets.SONAR_HOST_URL }}
  with:
    args: >
      -Dsonar.projectKey=myapp
      -Dsonar.projectName="My App"
      -Dproject.settings=.devxops/sonar-project.properties
```

**First-Time Setup Configuration** (no baseline required):
```yaml
- name: SonarQube Scan
  uses: sonarsource/sonarqube-scan-action@v2.1.0
  continue-on-error: true
  env:
    SONAR_TOKEN: ${{ secrets.SONAR_TOKEN }}
    SONAR_HOST_URL: ${{ secrets.SONAR_HOST_URL }}
  with:
    args: >
      -Dsonar.projectKey=myapp
      -Dsonar.projectName="My App"
      -Dsonar.branch.name=${{ github.head_ref }}
      -Dproject.settings=.devxops/sonar-project.properties
```

**Key Difference**: `-Dsonar.branch.name=${{ github.head_ref }}` enables independent branch scanning without baseline comparison

### Quality Gates

```yaml
# .devxops/quality-gates.yml
code_coverage:
  minimum: 80
  warning: 70

code_smells:
  maximum: 50

duplications:
  maximum: 3

security_hotspots:
  maximum: 0
```

---

## See Also

**Philosophy**:
- [Phoenix OS Philosophy](../../../../philo_docs/Philosophy.md) - Fluidic SDLC principles
- [Design Principles](../../../../philo_docs/Philosophy-Design-Principles.md) - Memory guidelines

**Related Memory**:
- [CI/CD Patterns](../../practices/devops/ci-cd-patterns.md)
- [Quality Gates](../../practices/devops/dxops-guardian-best-practices.md)

**Configuration**:
- Referenced in: `${config.memory.tools.devxops.sonarqube-setup}`

---

**Version**: 3.0.0
**Last Updated**: 2024-12-08
**Status**: Production-Ready
