# Gitleaks Configuration

**Intent**: Prevent secrets from entering version control through automated scanning.

**Context**: Platform-specific patterns for Gitleaks integration across CI/CD platforms.

---
**Memory Type**: Long-Term (LT)
**Category**: Platform patterns (tools/devxops)
**Update Authority**: High-order agents or manual PR
---

## Intent & Outcomes

### What Problem Does This Solve?
Prevents hardcoded secrets (API keys, passwords, tokens, private keys) from being committed to version control, which poses severe security, compliance, and financial risks.

### Why It Matters
- **Security**: Leaked credentials enable unauthorized access to systems and data
- **Compliance**: GDPR, SOC2, PCI-DSS, HIPAA require secret protection and detection
- **Financial**: Public exposure leads to resource abuse, API quota exhaustion, potential data breaches
- **Reputation**: Security incidents damage trust and brand reputation

### Expected Outcomes
- **Primary**: Zero secrets in repository history (100% detection rate)
- **Secondary**: Early developer feedback via pre-commit hooks (shift-left security)
- **Tertiary**: Audit trail of scan results for compliance reporting
- **Continuous**: Reduced alert fatigue through intelligent allowlisting

---

## Context-Aware Decision Making

### Scan Strategy by Environment

| Context | Scan Type | Tool Method | Blocking Behavior | Rationale |
|---------|-----------|-------------|-------------------|-----------|
| Local Development | Pre-commit hook, staged files only | `gitleaks protect --staged` | Warn only (don't break flow) | Fast feedback, educate developers |
| Pull Request Review | Diff scan (base..head) | `gitleaks detect --log-opts` | Block merge | Catch before integration |
| CI/CD Pipeline | Full repository scan | `gitleaks detect --source .` | Block build | Security gate enforcement |
| Scheduled Audit | Historical full scan | `gitleaks detect --no-git` | Report only | Compliance tracking, trend analysis |
| Emergency Hotfix | Skip or warn only | Manual override | Warn but allow | Balance security with urgency |

### Tool Selection by Constraints

**Primary Method**: Gitleaks CLI (v8.18.2+)
- **Pros**: Free and open-source, fast, extensive rule database, no license required
- **Cons**: Requires CLI installation on runner
- **Use When**: CI/CD pipelines, local development, any environment with shell access
- **Best For**: All team sizes, all project types

**Alternative Method**: Git-secrets (AWS)
- **Pros**: AWS-native patterns, simple pre-commit integration
- **Cons**: Limited to AWS patterns unless heavily customized
- **Use When**: AWS-focused projects, existing git-secrets users
- **Best For**: AWS-heavy stacks, teams already using AWS tooling

**Alternative Method**: TruffleHog
- **Pros**: Entropy-based detection (catches unknown secret formats)
- **Cons**: Higher false positive rate, slower on large repos
- **Use When**: Need to catch custom secret formats
- **Best For**: Projects with proprietary secret patterns

**Not Recommended**: Gitleaks GitHub Action (`gitleaks/gitleaks-action@v2`)
- **Why**: Requires paid license for organizational use
- **Trade-off**: Convenience vs cost
- **Prefer Instead**: Self-hosted CLI provides identical capabilities for free

**Fallback Method**: Custom Pre-commit Hooks with Regex
- **Pros**: No external dependencies, full control
- **Cons**: Limited pattern library, manual maintenance burden
- **Use When**: Restricted environments (no internet, no binary install permissions)
- **Best For**: Air-gapped environments, high-security isolated networks

---

## Basic Configuration

```toml
# .devxops/gitleaks.toml
title = "Gitleaks Configuration"

[extend]
useDefault = true

[[rules]]
id = "generic-api-key"
description = "Generic API Key"
regex = '''(?i)(api[_-]?key|apikey)['":\s]*[=:]\s*['"][0-9a-zA-Z]{32,45}['"]'''

[[rules]]
id = "aws-access-key"
description = "AWS Access Key"
regex = '''AKIA[0-9A-Z]{16}'''

[[rules]]
id = "private-key"
description = "Private Key"
regex = '''-----BEGIN (RSA|OPENSSH|DSA|EC|PGP) PRIVATE KEY-----'''

[[rules]]
id = "github-token"
description = "GitHub Token"
regex = '''gh[pousr]_[0-9a-zA-Z]{36}'''

[allowlist]
paths = [
  '''\.env\.example$''',
  '''\.env\.template$''',
  '''.*_test\.go$''',
  '''.*\.md$'''
]

regexes = [
  '''example\.com''',
  '''localhost'''
]
```

## CI/CD Integration

### GitHub Actions (Self-Hosted CLI - Free & Open-Source)

**RECOMMENDED**: Use the free, self-hosted Gitleaks CLI instead of the paid action.

```yaml
name: Secret Scan
on: [push, pull_request]

jobs:
  gitleaks:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Install Gitleaks (Free CLI)
        run: |
          wget https://github.com/gitleaks/gitleaks/releases/download/v8.18.2/gitleaks_8.18.2_linux_x64.tar.gz
          tar -xzf gitleaks_8.18.2_linux_x64.tar.gz
          sudo mv gitleaks /usr/local/bin/
          gitleaks version

      - name: Run Gitleaks scan (full repository)
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

      - name: Run Gitleaks scan on PR diff (if PR)
        if: github.event_name == 'pull_request'
        continue-on-error: true
        run: |
          gitleaks detect \
            --source . \
            --config .devxops/gitleaks.toml \
            --log-opts "${{ github.event.pull_request.base.sha }}..${{ github.sha }}" \
            --report-path gitleaks-pr-diff.json \
            --report-format json \
            --verbose \
            --exit-code 1

      - name: Generate HTML report
        if: always()
        run: |
          if [ -f gitleaks-report.json ]; then
            python scripts/devxops/gitleaks-html-generator.py gitleaks-report.json gitleaks-report.html
          fi

      - name: Upload reports
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: gitleaks-reports
          path: |
            gitleaks-report.json
            gitleaks-report.html
          retention-days: 30
```

**Why Self-Hosted CLI?**
- ✅ No license required for organizational use (100% free & open-source)
- ✅ Same scanning capabilities as the official action
- ✅ Full control over CLI flags and configuration
- ✅ No dependency on third-party GitHub Action licensing
- ✅ Direct JSON output for HTML conversion

**Prefer self-hosted CLI over official action**: The official action (`gitleaks/gitleaks-action@v2`) requires a paid license for organizational use, while the self-hosted CLI provides identical capabilities for free. Use the official action only if you have an enterprise license or for personal/educational projects.

### GitLab CI

```yaml
gitleaks:
  image: zricethezav/gitleaks:latest
  script:
    - gitleaks detect --source . --config .devxops/gitleaks.toml --verbose
      --no-git --report-path gitleaks-report.json --report-format json
  artifacts:
    paths:
      - gitleaks-report.json
    expire_in: 30 days
```

### Azure DevOps

```yaml
steps:
  - task: CmdLine@2
    displayName: 'Install Gitleaks'
    inputs:
      script: |
        wget https://github.com/gitleaks/gitleaks/releases/download/v8.18.2/gitleaks_8.18.2_linux_x64.tar.gz
        tar -xzf gitleaks_8.18.2_linux_x64.tar.gz
        sudo mv gitleaks /usr/local/bin/

  - task: CmdLine@2
    displayName: 'Run Gitleaks Scan'
    inputs:
      script: |
        gitleaks detect \
          --source . \
          --config .devxops/gitleaks.toml \
          --report-path gitleaks-report.json \
          --report-format json \
          --verbose \
          --no-git

  - task: PublishPipelineArtifact@1
    displayName: 'Publish Gitleaks Report'
    inputs:
      targetPath: gitleaks-report.json
      artifactName: gitleaks-report
```

### Jenkins

```groovy
stage('Gitleaks Scan') {
  steps {
    sh '''
      wget https://github.com/gitleaks/gitleaks/releases/download/v8.18.2/gitleaks_8.18.2_linux_x64.tar.gz
      tar -xzf gitleaks_8.18.2_linux_x64.tar.gz
      sudo mv gitleaks /usr/local/bin/
      
      gitleaks detect \
        --source . \
        --config .devxops/gitleaks.toml \
        --report-path gitleaks-report.json \
        --report-format json \
        --verbose \
        --no-git
    '''
    archiveArtifacts artifacts: 'gitleaks-report.json', allowEmptyArchive: true
  }
}
```

## Pre-commit Hook

```bash
#!/bin/bash
# .git/hooks/pre-commit

gitleaks protect --staged --config .devxops/gitleaks.toml
if [ $? -eq 1 ]; then
  echo "Warning: Gitleaks detected secrets!"
  exit 1
fi
```

## Configuration Options

### Scan Types

**Full Repository Scan**:
```bash
gitleaks detect \
  --source . \
  --config .devxops/gitleaks.toml \
  --report-path gitleaks-report.json \
  --report-format json \
  --verbose \
  --no-git
```

**PR Diff Scan** (GitHub):
```bash
gitleaks detect \
  --source . \
  --config .devxops/gitleaks.toml \
  --log-opts "$BASE_SHA..$HEAD_SHA" \
  --report-path gitleaks-pr-diff.json \
  --report-format json \
  --verbose
```

**Staged Files Scan** (Pre-commit):
```bash
gitleaks protect \
  --staged \
  --config .devxops/gitleaks.toml \
  --verbose
```

### Output Formats

- `--report-format json` - JSON output (recommended for CI)
- `--report-format csv` - CSV output
- `--report-format sarif` - SARIF format (GitHub Security tab)

## Allowlisting

### By File Path

```toml
[allowlist]
paths = [
  '''\.env\.example$''',        # Environment templates
  '''\.env\.template$''',
  '''test/fixtures/.*''',       # Test fixtures
  '''docs/examples/.*'''        # Documentation examples
]
```

### By Regex Pattern

```toml
[allowlist]
regexes = [
  '''example\.com''',           # Example domains
  '''localhost''',              # Local development
  '''127\.0\.0\.1''',
  '''INSERT_.*_HERE'''          # Placeholder patterns
]
```

### By Commit

```toml
[allowlist]
commits = [
  "abcdef1234567890"            # Known safe commits
]
```

## Custom Rules

### API Key Pattern

```toml
[[rules]]
id = "custom-api-key"
description = "Custom API Key Pattern"
regex = '''api_key_[0-9a-f]{32}'''
tags = ["api", "key"]
```

### Database Connection String

```toml
[[rules]]
id = "database-connection"
description = "Database Connection String"
regex = '''(postgres|mysql|mongodb)://[^:]+:[^@]+@[^/]+'''
tags = ["database", "credentials"]
```

### AWS ARN

```toml
[[rules]]
id = "aws-arn"
description = "AWS ARN"
regex = '''arn:aws:[a-z0-9-]+:[a-z0-9-]*:[0-9]{12}:[a-zA-Z0-9/_-]+'''
tags = ["aws", "arn"]
```

## Best Practices

1. **Always use the free CLI** - No license needed for organizations
2. **Scan full repository** in CI pipelines
3. **Scan PR diffs** for faster feedback on pull requests
4. **Use pre-commit hooks** for local development
5. **Configure allowlists carefully** - Be specific, avoid overly broad patterns
6. **Generate HTML reports** for easy viewing and archival
7. **Set retention policy** for report artifacts (30 days recommended)
8. **Block PRs/commits** if secrets are detected (set exit-code 1)
9. **Review false positives** and update allowlists accordingly
10. **Keep Gitleaks updated** - Check for latest version regularly

## Error Context (Following Phoenix Standard)

### Error: Too Many False Positives

**What Failed**: Gitleaks reporting 50+ alerts, most are test fixtures or example code (false positives causing alert fatigue)

**Why It Fails**:
- Test data contains dummy credentials (e.g., "test_api_key_12345") that match generic patterns
- Documentation examples include placeholder secrets (e.g., "INSERT_API_KEY_HERE")
- Template files (.env.example) contain example values
- Generic regex patterns (e.g., `api[_-]?key.*[0-9a-zA-Z]{32}`) match non-secret strings

**How to Fix**:
1. Add test/example paths to allowlist in `.devxops/gitleaks.toml`:
   ```toml
   [allowlist]
   paths = [
     '''\.env\.example$''',      # Environment templates
     '''\.env\.template$''',
     '''test/fixtures/.*''',     # Test fixtures
     '''docs/examples/.*''',     # Documentation examples
     '''.*_test\.go$''',         # Test files
     '''.*\.spec\.ts$'''         # Spec files
   ]
   ```
2. OR add specific dummy value patterns to regex allowlist:
   ```toml
   [allowlist]
   regexes = [
     '''test_api_key_.*''',     # Test keys
     '''mock_.*''',             # Mock values
     '''example\.com''',        # Example domains
     '''INSERT_.*_HERE'''       # Placeholder patterns
   ]
   ```

**Alternative Path**:
- Use `--allowlist-path` to maintain separate allowlist file (better for large projects with many exceptions)
- Create custom rules with higher entropy thresholds to reduce false positives
- Use commit-level allowlist for one-time historical exceptions (sparingly)

**Impact Without Fix**:
- Developers experience alert fatigue and may bypass scans entirely
- Real secrets missed among false positives (security risk)
- CI pipeline noise reduces trust in security tooling
- Manual triage time wasted on false alarms

---

### Error: Scan Taking Too Long

**What Failed**: Gitleaks scan timing out after 5+ minutes or hitting CI timeout (e.g., 10-minute job limit)

**Why It Fails**:
- Full repository history scan on large repos (10,000+ commits, 100MB+ .git folder)
- Scanning through all Git objects and commits sequentially
- Large binary files in Git history slowing down analysis
- Network latency if scanning remote repository

**How to Fix**:
1. Use `--no-git` flag to skip Git history and scan files directly (much faster):
   ```bash
   gitleaks detect --source . --config .devxops/gitleaks.toml --no-git
   ```
2. For PR scans, scan only the diff (not full history):
   ```bash
   gitleaks detect --log-opts="$BASE_SHA..$HEAD_SHA"
   ```
3. Scan only recent commits for scheduled audits:
   ```bash
   gitleaks detect --log-opts="HEAD~50..HEAD"  # Last 50 commits
   ```

**Alternative Path**:
- Run full repository scan on schedule (nightly/weekly) with longer timeout
- Use PR diff scans only (fast feedback, catches 99% of issues)
- Increase CI timeout limit (if allowed by platform)
- Split scan into chunks for monorepos (per workspace/package)

**Impact Without Fix**:
- CI pipeline timeouts block all PRs
- Slow feedback loop frustrates developers
- Increased build costs (longer CI runner time)
- May disable scans entirely (security gap)

---

### Error: Need to Scan Only Recent Commits

**What Failed**: Need targeted scan of specific commit range (e.g., last 10 commits or feature branch only) instead of full history

**Why This Matters**:
- Debugging a specific suspected leak in recent commits
- Historical leaks already remediated but still in Git history
- Want to verify fix without re-scanning entire repository
- Performance optimization for large repositories

**How to Fix**:
Use `--log-opts` with Git revision range:

1. **Last N commits**:
   ```bash
   gitleaks detect --log-opts="HEAD~10..HEAD"  # Last 10 commits
   ```
2. **Specific branch range**:
   ```bash
   gitleaks detect --log-opts="main..feature-branch"  # All commits in feature branch
   ```
3. **Between two commits**:
   ```bash
   gitleaks detect --log-opts="abc123..def456"  # Specific commit range
   ```
4. **Since specific date**:
   ```bash
   gitleaks detect --log-opts="--since='2024-01-01'"
   ```

**Alternative Path**:
- Use GitHub API to get PR diff and scan that directly (for PR-only scans)
- Scan specific files: `gitleaks detect --source path/to/file.js`
- Use `--commits` flag with comma-separated commit SHAs

**Impact Without Fix**:
- Inefficient scanning of entire history repeatedly
- Cannot isolate specific leaks for investigation
- Wasted CI resources on unnecessary scans

---

### Error: Gitleaks Not Found After Installation

**What Failed**: CI job fails with "gitleaks: command not found" or "No such file or directory" after wget/install steps

**Why It Fails**:
- Binary not moved to directory in system PATH
- Insufficient permissions to write to `/usr/local/bin/`
- Binary downloaded but not marked as executable (`chmod +x` not run)
- Architecture mismatch (trying to run x64 binary on arm64, or vice versa)
- Binary name mismatch (extracted as `gitleaks_linux_x64` but referenced as `gitleaks`)

**How to Fix**:
1. Verify installation path and permissions:
   ```bash
   which gitleaks                        # Check if in PATH
   gitleaks version                      # Verify it runs
   sudo chmod +x /usr/local/bin/gitleaks # Make executable
   echo $PATH                            # Verify /usr/local/bin in PATH
   ```
2. Ensure proper installation steps:
   ```bash
   wget https://github.com/gitleaks/gitleaks/releases/download/v8.18.2/gitleaks_8.18.2_linux_x64.tar.gz
   tar -xzf gitleaks_8.18.2_linux_x64.tar.gz
   sudo mv gitleaks /usr/local/bin/      # Move to PATH
   sudo chmod +x /usr/local/bin/gitleaks # Make executable
   gitleaks version                       # Verify
   ```
3. Check architecture compatibility:
   ```bash
   uname -m  # Should match binary arch (x86_64 for x64, aarch64 for arm64)
   ```

**Alternative Path**:
- Use Docker image (no local install needed):
  ```bash
  docker run -v $(pwd):/path zricethezav/gitleaks:latest detect --source /path
  ```
- Install via package manager if available:
  ```bash
  # macOS
  brew install gitleaks
  # Debian/Ubuntu
  apt-get install gitleaks
  ```
- Use GitHub Action (if enterprise license available)

**Impact Without Fix**:
- CI pipeline fails entirely
- All PRs blocked
- No secret scanning until resolved
- Manual workaround needed (security gap)

---

## Integration with HTML Report Generator

Generate HTML reports from JSON output:

```bash
# Run Gitleaks scan
gitleaks detect \
  --source . \
  --config .devxops/gitleaks.toml \
  --report-path gitleaks-report.json \
  --report-format json

# Generate HTML report
python scripts/devxops/gitleaks-html-generator.py \
  gitleaks-report.json \
  gitleaks-report.html
```

The HTML report provides:
- Visual summary of findings
- Grouped by severity
- File locations and line numbers
- Secret types and descriptions
- Easy sharing with team members

---

## See Also

**Philosophy**:
- [Phoenix OS Philosophy](../../../../philo_docs/Philosophy.md) - Fluidic SDLC principles
- [Design Principles](../../../../philo_docs/Philosophy-Design-Principles.md) - Memory guidelines

**Related Memory**:
- [CI/CD Patterns](../../practices/devops/ci-cd-patterns.md)
- [Secret Management](../../practices/devops/secret-management.md)

**Configuration**:
- Referenced in: `${config.memory.tools.devxops.gitleaks-config}`

---

**Version**: 4.0.0  
**Last Updated**: 2024-12-03  
**Status**: Production-Ready