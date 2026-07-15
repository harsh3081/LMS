# PR Workflow Patterns

Patterns for GitHub Actions PR review, auto-documentation, and PR metadata management.

**Version**: 1.1.0
**Last Updated**: 2024-12-04
**Status**: Production-Ready

---

## CRITICAL PATTERNS (Must Follow Exactly)

The following patterns MUST be used exactly as shown:

1. **Keep-a-Changelog Format** - CHANGELOG.md must have header with Keep-a-Changelog link
2. **Coverage Badge** - Must update badge in README.md if coverage report exists
3. **Commit with [skip ci]** - All auto-documentation commits must include `[skip ci]`
4. **PR Metadata via github-script** - Never use env vars, always use github-script API
5. **Step ID naming** - All step IDs must use `run_` prefix

---

## PR Metadata via github-script (CRITICAL)

**ALWAYS use github-script to fetch PR metadata. This is more reliable than environment variables.**

### Fetch Complete PR Metadata

```yaml
- name: Get PR metadata
  id: run_pr_metadata
  uses: actions/github-script@v7
  with:
    script: |
      const pr = await github.rest.pulls.get({
        owner: context.repo.owner,
        repo: context.repo.repo,
        pull_number: context.issue.number
      });

      // Set outputs for use in later steps
      core.setOutput('pr_number', pr.data.number);
      core.setOutput('pr_title', pr.data.title);
      core.setOutput('pr_author', pr.data.user.login);
      core.setOutput('pr_branch', pr.data.head.ref);
      core.setOutput('base_branch', pr.data.base.ref);
      core.setOutput('pr_body', pr.data.body || '');
      core.setOutput('pr_url', pr.data.html_url);
      core.setOutput('draft', pr.data.draft);
      core.setOutput('mergeable', pr.data.mergeable);
      core.setOutput('changed_files', pr.data.changed_files);
      core.setOutput('additions', pr.data.additions);
      core.setOutput('deletions', pr.data.deletions);

      // Log for debugging
      console.log(`PR #${pr.data.number}: ${pr.data.title}`);
      console.log(`Author: ${pr.data.user.login}`);
      console.log(`Branch: ${pr.data.head.ref} -> ${pr.data.base.ref}`);
      console.log(`Changes: +${pr.data.additions} -${pr.data.deletions} in ${pr.data.changed_files} files`);
```

### Use PR Metadata in Later Steps

```yaml
- name: Use PR metadata
  run: |
    echo "PR #${{ steps.run_pr_metadata.outputs.pr_number }}"
    echo "Title: ${{ steps.run_pr_metadata.outputs.pr_title }}"
    echo "Author: ${{ steps.run_pr_metadata.outputs.pr_author }}"
    echo "Branch: ${{ steps.run_pr_metadata.outputs.pr_branch }}"
```

---

## Dynamic Label Management

**Automatically add/remove labels based on PR state and analysis results.**

### Add Labels Based on Analysis

```yaml
- name: Add PR labels
  id: run_add_labels
  uses: actions/github-script@v7
  with:
    script: |
      const prNumber = context.issue.number;
      const labelsToAdd = [];

      // Add labels based on file changes
      const files = await github.rest.pulls.listFiles({
        owner: context.repo.owner,
        repo: context.repo.repo,
        pull_number: prNumber
      });

      const fileNames = files.data.map(f => f.filename);

      // Detect change types
      if (fileNames.some(f => f.startsWith('docs/'))) {
        labelsToAdd.push('documentation');
      }
      if (fileNames.some(f => f.includes('test'))) {
        labelsToAdd.push('tests');
      }
      if (fileNames.some(f => f.endsWith('.yml') || f.endsWith('.yaml'))) {
        labelsToAdd.push('ci/cd');
      }
      if (fileNames.some(f => f.includes('security') || f.includes('auth'))) {
        labelsToAdd.push('security');
      }

      // Add size labels based on changes
      const additions = ${{ steps.run_pr_metadata.outputs.additions }};
      const deletions = ${{ steps.run_pr_metadata.outputs.deletions }};
      const totalChanges = additions + deletions;

      if (totalChanges < 50) {
        labelsToAdd.push('size/S');
      } else if (totalChanges < 200) {
        labelsToAdd.push('size/M');
      } else if (totalChanges < 500) {
        labelsToAdd.push('size/L');
      } else {
        labelsToAdd.push('size/XL');
      }

      // Add labels based on scan results
      const gitleaksOutcome = '${{ steps.run_gitleaks.outcome }}';
      const snykOutcome = '${{ steps.run_snyk.outcome }}';

      if (gitleaksOutcome === 'failure') {
        labelsToAdd.push('security-issue');
      }
      if (snykOutcome === 'failure') {
        labelsToAdd.push('vulnerability');
      }

      // Apply labels
      if (labelsToAdd.length > 0) {
        await github.rest.issues.addLabels({
          owner: context.repo.owner,
          repo: context.repo.repo,
          issue_number: prNumber,
          labels: labelsToAdd
        });
        console.log(`Added labels: ${labelsToAdd.join(', ')}`);
      }

      core.setOutput('labels_added', labelsToAdd.join(','));
```

### Remove Labels on State Change

```yaml
- name: Remove stale labels
  id: run_remove_labels
  uses: actions/github-script@v7
  with:
    script: |
      const prNumber = context.issue.number;

      // If security scan passes, remove security-issue label
      const gitleaksOutcome = '${{ steps.run_gitleaks.outcome }}';
      if (gitleaksOutcome === 'success') {
        try {
          await github.rest.issues.removeLabel({
            owner: context.repo.owner,
            repo: context.repo.repo,
            issue_number: prNumber,
            name: 'security-issue'
          });
          console.log('Removed security-issue label');
        } catch (e) {
          // Label might not exist, ignore
        }
      }

      // If vulnerability scan passes, remove vulnerability label
      const snykOutcome = '${{ steps.run_snyk.outcome }}';
      if (snykOutcome === 'success') {
        try {
          await github.rest.issues.removeLabel({
            owner: context.repo.owner,
            repo: context.repo.repo,
            issue_number: prNumber,
            name: 'vulnerability'
          });
          console.log('Removed vulnerability label');
        } catch (e) {
          // Label might not exist, ignore
        }
      }
```

---

## PR Review Workflow Pattern

### Complete PR Auto-Review Workflow

```yaml
name: PR Auto Review

on:
  pull_request:
    types: [opened, synchronize, reopened]
    branches: [main, develop]

permissions:
  contents: read
  pull-requests: write
  issues: write

jobs:
  pr-review:
    runs-on: ubuntu-latest
    timeout-minutes: 15
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Get PR metadata
        id: run_pr_metadata
        uses: actions/github-script@v7
        with:
          script: |
            const pr = await github.rest.pulls.get({
              owner: context.repo.owner,
              repo: context.repo.repo,
              pull_number: context.issue.number
            });
            core.setOutput('pr_number', pr.data.number);
            core.setOutput('pr_title', pr.data.title);
            core.setOutput('pr_author', pr.data.user.login);
            core.setOutput('pr_branch', pr.data.head.ref);
            core.setOutput('base_branch', pr.data.base.ref);
            core.setOutput('additions', pr.data.additions);
            core.setOutput('deletions', pr.data.deletions);
            core.setOutput('changed_files', pr.data.changed_files);

      - name: Get changed files
        id: run_changed_files
        run: |
          FILES=$(git diff --name-only origin/${{ steps.run_pr_metadata.outputs.base_branch }}...HEAD | head -100)
          echo "files<<EOF" >> $GITHUB_OUTPUT
          echo "$FILES" >> $GITHUB_OUTPUT
          echo "EOF" >> $GITHUB_OUTPUT

          # Count by type
          JS_COUNT=$(echo "$FILES" | grep -c '\.js$\|\.ts$\|\.jsx$\|\.tsx$' || echo 0)
          CSS_COUNT=$(echo "$FILES" | grep -c '\.css$\|\.scss$' || echo 0)
          TEST_COUNT=$(echo "$FILES" | grep -c '\.test\.\|\.spec\.\|__tests__' || echo 0)

          echo "js_files=$JS_COUNT" >> $GITHUB_OUTPUT
          echo "css_files=$CSS_COUNT" >> $GITHUB_OUTPUT
          echo "test_files=$TEST_COUNT" >> $GITHUB_OUTPUT

      - uses: actions/setup-python@v5
        with:
          python-version: '3.11'

      - name: Install analysis dependencies
        run: pip install jinja2 pygments markdown pyyaml

      - name: Run PR analysis
        id: run_pr_analysis
        run: |
          mkdir -p Reports/PRAnalysis
          python scripts/devxops/pr-analysis.py \
            --pr-number ${{ steps.run_pr_metadata.outputs.pr_number }} \
            --output Reports/PRAnalysis/pr-analysis-report.html

      - name: Post PR comment
        id: run_post_comment
        uses: actions/github-script@v7
        with:
          script: |
            const prNumber = ${{ steps.run_pr_metadata.outputs.pr_number }};
            const prTitle = `${{ steps.run_pr_metadata.outputs.pr_title }}`;
            const author = '${{ steps.run_pr_metadata.outputs.pr_author }}';
            const additions = ${{ steps.run_pr_metadata.outputs.additions }};
            const deletions = ${{ steps.run_pr_metadata.outputs.deletions }};
            const changedFiles = ${{ steps.run_pr_metadata.outputs.changed_files }};

            let message = `## 🔍 PR Analysis Report\n\n`;
            message += `### PR Details\n`;
            message += `| Metric | Value |\n`;
            message += `|--------|-------|\n`;
            message += `| PR Number | #${prNumber} |\n`;
            message += `| Author | @${author} |\n`;
            message += `| Files Changed | ${changedFiles} |\n`;
            message += `| Additions | +${additions} |\n`;
            message += `| Deletions | -${deletions} |\n\n`;

            message += `### File Types Changed\n`;
            message += `- JS/TS Files: ${{ steps.run_changed_files.outputs.js_files }}\n`;
            message += `- CSS Files: ${{ steps.run_changed_files.outputs.css_files }}\n`;
            message += `- Test Files: ${{ steps.run_changed_files.outputs.test_files }}\n\n`;

            message += `---\n`;
            message += `⏱️ Analysis completed at: ${new Date().toUTCString()}`;

            await github.rest.issues.createComment({
              issue_number: prNumber,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: message
            });

      - name: Upload PR analysis report
        uses: actions/upload-artifact@v4
        with:
          name: pr-analysis-${{ github.run_number }}
          path: Reports/PRAnalysis/
          retention-days: 30
```

---

## PR Documentation Workflow (On Approval)

### Trigger on PR Approval

```yaml
name: PR Auto Documentation

on:
  pull_request_review:
    types: [submitted]
    branches: [main, develop]

permissions:
  contents: write
  pull-requests: write

jobs:
  generate-docs:
    if: github.event.review.state == 'approved'
    runs-on: ubuntu-latest
    timeout-minutes: 15
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
          ref: ${{ github.event.pull_request.head.ref }}
          token: ${{ secrets.GITHUB_TOKEN }}

      - name: Get PR metadata
        id: run_pr_metadata
        uses: actions/github-script@v7
        with:
          script: |
            const pr = await github.rest.pulls.get({
              owner: context.repo.owner,
              repo: context.repo.repo,
              pull_number: context.issue.number
            });
            core.setOutput('pr_number', pr.data.number);
            core.setOutput('pr_title', pr.data.title);
            core.setOutput('pr_author', pr.data.user.login);
            core.setOutput('pr_branch', pr.data.head.ref);

      - name: Generate CHANGELOG entry
        id: run_changelog
        run: |
          mkdir -p Reports/Documentation

          PR_NUMBER="${{ steps.run_pr_metadata.outputs.pr_number }}"
          PR_TITLE="${{ steps.run_pr_metadata.outputs.pr_title }}"
          PR_AUTHOR="${{ steps.run_pr_metadata.outputs.pr_author }}"
          DATE=$(date +%Y-%m-%d)

          # Determine change type from PR title (conventional commit style)
          if [[ "$PR_TITLE" =~ ^feat ]]; then
            SECTION="Added"
          elif [[ "$PR_TITLE" =~ ^fix ]]; then
            SECTION="Fixed"
          elif [[ "$PR_TITLE" =~ ^docs ]]; then
            SECTION="Documentation"
          elif [[ "$PR_TITLE" =~ ^refactor ]]; then
            SECTION="Changed"
          elif [[ "$PR_TITLE" =~ ^perf ]]; then
            SECTION="Performance"
          elif [[ "$PR_TITLE" =~ ^security ]]; then
            SECTION="Security"
          elif [[ "$PR_TITLE" =~ ^deprecate ]]; then
            SECTION="Deprecated"
          elif [[ "$PR_TITLE" =~ ^remove ]]; then
            SECTION="Removed"
          else
            SECTION="Changed"
          fi

          # Generate changelog entry
          ENTRY="- ${PR_TITLE} ([#${PR_NUMBER}](../../pull/${PR_NUMBER})) by @${PR_AUTHOR}"

          echo "section=$SECTION" >> $GITHUB_OUTPUT
          echo "entry=$ENTRY" >> $GITHUB_OUTPUT
          echo "date=$DATE" >> $GITHUB_OUTPUT

          # Save to file for later use
          echo "$ENTRY" > Reports/Documentation/changelog-entry.txt

      - name: Update CHANGELOG.md (Keep-a-Changelog format)
        id: run_update_changelog
        run: |
          SECTION="${{ steps.run_changelog.outputs.section }}"
          ENTRY="${{ steps.run_changelog.outputs.entry }}"
          DATE="${{ steps.run_changelog.outputs.date }}"

          # Check if CHANGELOG.md exists
          if [ ! -f CHANGELOG.md ]; then
            echo "Creating new CHANGELOG.md"
            cat > CHANGELOG.md << 'HEADER'
          # Changelog

          All notable changes to this project will be documented in this file.

          The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
          and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

          ## [Unreleased]

          HEADER
          fi

          # Check if [Unreleased] section exists
          if ! grep -q "\[Unreleased\]" CHANGELOG.md; then
            # Add Unreleased section after header
            sed -i '/^# Changelog/a \\n## [Unreleased]\n' CHANGELOG.md
          fi

          # Check if section (Added/Fixed/etc) exists under Unreleased
          if grep -A 50 "\[Unreleased\]" CHANGELOG.md | grep -q "### $SECTION"; then
            # Add entry under existing section
            sed -i "/### $SECTION/a $ENTRY" CHANGELOG.md
          else
            # Add new section with entry
            sed -i "/\[Unreleased\]/a \\n### $SECTION\\n$ENTRY" CHANGELOG.md
          fi

          echo "Updated CHANGELOG.md with entry under $SECTION"

      - name: Update coverage badge in README
        id: run_update_badge
        continue-on-error: true
        run: |
          # Check if coverage report exists
          if [ -f coverage/coverage-summary.json ]; then
            COVERAGE=$(jq '.total.lines.pct' coverage/coverage-summary.json)

            # Determine badge color
            if (( $(echo "$COVERAGE >= 80" | bc -l) )); then
              COLOR="brightgreen"
            elif (( $(echo "$COVERAGE >= 60" | bc -l) )); then
              COLOR="yellow"
            else
              COLOR="red"
            fi

            # Update badge in README
            BADGE_URL="https://img.shields.io/badge/coverage-${COVERAGE}%25-${COLOR}"

            if grep -q "coverage-.*-" README.md; then
              sed -i "s|https://img.shields.io/badge/coverage-[^)]*|$BADGE_URL|g" README.md
              echo "Updated coverage badge to ${COVERAGE}%"
            fi
          else
            echo "No coverage report found, skipping badge update"
          fi

      - name: Commit documentation changes
        id: run_commit_docs
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"

          # Check for changes
          if git diff --quiet CHANGELOG.md README.md 2>/dev/null; then
            echo "No documentation changes to commit"
            echo "committed=false" >> $GITHUB_OUTPUT
          else
            git add CHANGELOG.md README.md || true
            git commit -m "docs: auto-update documentation for PR #${{ steps.run_pr_metadata.outputs.pr_number }}

          - Updated CHANGELOG.md with PR entry
          - Updated coverage badge (if applicable)

          [skip ci]" || true

            git push origin ${{ steps.run_pr_metadata.outputs.pr_branch }}
            echo "committed=true" >> $GITHUB_OUTPUT
            echo "Documentation changes committed to PR branch"
          fi

      - name: Post documentation comment
        if: steps.run_commit_docs.outputs.committed == 'true'
        uses: actions/github-script@v7
        with:
          script: |
            await github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: `## 📝 Documentation Updated

            The following documentation has been automatically updated for this PR:

            - ✅ CHANGELOG.md - Added entry under **${{ steps.run_changelog.outputs.section }}**
            - ✅ README.md - Updated coverage badge (if applicable)

            These changes have been committed to the PR branch.

            ---
            🤖 *Auto-generated by PR Documentation workflow*`
            });
```

---

## CHANGELOG Keep-a-Changelog Format

**Always use Keep-a-Changelog format for CHANGELOG.md.**

### Template Structure

```markdown
# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- New feature description ([#123](../../pull/123)) by @author

### Changed
- Change description ([#124](../../pull/124)) by @author

### Deprecated
- Deprecated feature ([#125](../../pull/125)) by @author

### Removed
- Removed feature ([#126](../../pull/126)) by @author

### Fixed
- Bug fix description ([#127](../../pull/127)) by @author

### Security
- Security fix description ([#128](../../pull/128)) by @author

## [1.0.0] - 2024-01-15

### Added
- Initial release features
```

### Section Mapping from Conventional Commits

| Commit Type | Changelog Section |
|-------------|-------------------|
| `feat:` | Added |
| `fix:` | Fixed |
| `docs:` | Documentation |
| `refactor:` | Changed |
| `perf:` | Performance |
| `security:` | Security |
| `deprecate:` | Deprecated |
| `remove:` | Removed |
| `chore:` | Changed |
| `style:` | Changed |
| `test:` | (usually not logged) |
| `ci:` | (usually not logged) |

---

## Coverage Badge Pattern

### Generate and Update Badge

```yaml
- name: Generate coverage badge
  id: run_coverage_badge
  run: |
    # Extract coverage from report
    if [ -f coverage/coverage-summary.json ]; then
      COVERAGE=$(jq '.total.lines.pct' coverage/coverage-summary.json)
    elif [ -f coverage/lcov-report/index.html ]; then
      COVERAGE=$(grep -oP 'Lines[^<]*<[^>]*>\K[\d.]+' coverage/lcov-report/index.html | head -1)
    else
      COVERAGE="unknown"
    fi

    # Determine color
    if [ "$COVERAGE" != "unknown" ]; then
      if (( $(echo "$COVERAGE >= 80" | bc -l) )); then
        COLOR="brightgreen"
      elif (( $(echo "$COVERAGE >= 60" | bc -l) )); then
        COLOR="yellow"
      elif (( $(echo "$COVERAGE >= 40" | bc -l) )); then
        COLOR="orange"
      else
        COLOR="red"
      fi
    else
      COLOR="lightgrey"
    fi

    echo "coverage=$COVERAGE" >> $GITHUB_OUTPUT
    echo "color=$COLOR" >> $GITHUB_OUTPUT
    echo "badge_url=https://img.shields.io/badge/coverage-${COVERAGE}%25-${COLOR}" >> $GITHUB_OUTPUT
```

### README Badge Markdown

```markdown
![Coverage](https://img.shields.io/badge/coverage-85%25-brightgreen)
```

---

## DxOps Guardian PR Comment Pattern

### Comprehensive Status Comment

```yaml
- name: Post DxOps Guardian summary
  id: run_dxops_comment
  if: always()
  uses: actions/github-script@v7
  with:
    script: |
      // Collect all step outcomes
      const results = {
        gitleaks: {
          outcome: '${{ steps.run_gitleaks.outcome }}' || 'skipped',
          name: 'Gitleaks',
          icon: '🔒',
          description: 'Secret Detection'
        },
        sonarqube: {
          outcome: '${{ steps.run_sonarqube.outcome }}' || 'skipped',
          name: 'SonarQube',
          icon: '🎯',
          description: 'Code Quality'
        },
        snyk: {
          outcome: '${{ steps.run_snyk.outcome }}' || 'skipped',
          name: 'Snyk',
          icon: '🔍',
          description: 'Dependency Scan'
        },
        prAnalysis: {
          outcome: '${{ steps.run_pr_analysis.outcome }}' || 'skipped',
          name: 'PR Analysis',
          icon: '📊',
          description: 'Code Review Metrics'
        }
      };

      // Map outcomes to display
      const outcomeMap = {
        'success': { emoji: '✅', text: 'Passed' },
        'failure': { emoji: '❌', text: 'Failed' },
        'skipped': { emoji: '⏭️', text: 'Skipped' },
        'cancelled': { emoji: '🚫', text: 'Cancelled' }
      };

      // Calculate summary
      const failed = Object.values(results).filter(r => r.outcome === 'failure').length;
      const passed = Object.values(results).filter(r => r.outcome === 'success').length;
      const skipped = Object.values(results).filter(r => r.outcome === 'skipped').length;

      const overallStatus = failed > 0 ? '⚠️ NEEDS ATTENTION' : '✅ ALL CHECKS PASSED';

      // Build message
      let message = `## 🛡️ DxOps Guardian Report\n\n`;
      message += `**Overall Status:** ${overallStatus}\n\n`;
      message += `### Scan Results\n\n`;
      message += `| Tool | Status | Description |\n`;
      message += `|------|--------|-------------|\n`;

      for (const [key, tool] of Object.entries(results)) {
        const display = outcomeMap[tool.outcome] || { emoji: '❓', text: 'Unknown' };
        message += `| ${tool.icon} ${tool.name} | ${display.emoji} ${display.text} | ${tool.description} |\n`;
      }

      message += `\n### Summary\n`;
      message += `- ✅ Passed: ${passed}\n`;
      message += `- ❌ Failed: ${failed}\n`;
      message += `- ⏭️ Skipped: ${skipped}\n\n`;

      if (failed > 0) {
        message += `### ⚠️ Action Required\n`;
        message += `Please review the failed checks above and address any issues before merging.\n\n`;
      }

      message += `---\n`;
      message += `📦 [Download Reports](../actions/runs/${{ github.run_id }})\n`;
      message += `⏱️ Scan completed: ${new Date().toUTCString()}`;

      // Find and update existing comment or create new
      const comments = await github.rest.issues.listComments({
        owner: context.repo.owner,
        repo: context.repo.repo,
        issue_number: context.issue.number
      });

      const botComment = comments.data.find(c =>
        c.user.type === 'Bot' &&
        c.body.includes('DxOps Guardian Report')
      );

      if (botComment) {
        await github.rest.issues.updateComment({
          owner: context.repo.owner,
          repo: context.repo.repo,
          comment_id: botComment.id,
          body: message
        });
      } else {
        await github.rest.issues.createComment({
          owner: context.repo.owner,
          repo: context.repo.repo,
          issue_number: context.issue.number,
          body: message
        });
      }
```

---

## Best Practices Summary

### PR Metadata
- Always use github-script for reliable PR data
- Use `run_` prefix for all step IDs
- Store metadata in outputs for later steps

### Labels
- Add labels based on file analysis
- Add size labels (S/M/L/XL)
- Remove stale labels when state changes

### Documentation
- Use Keep-a-Changelog format
- Map conventional commits to changelog sections
- Commit docs back to PR branch with `[skip ci]`

### Comments
- Update existing bot comments instead of creating new
- Include actionable information
- Link to artifacts and reports

---

**Version**: 1.1.0
**Last Updated**: 2024-12-04
**Status**: Production-Ready

**Changelog v1.1.0**:
- Added CRITICAL PATTERNS section at top for quick reference
- Emphasized Keep-a-Changelog header requirement
- Emphasized coverage badge update requirement
- Emphasized [skip ci] commit message requirement
