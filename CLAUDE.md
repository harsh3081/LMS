# CLAUDE.md

Phoenix OS configuration for Claude Code.

## Overview

Phoenix OS is an agentic framework for spec-driven development that transforms AI copilots from non-deterministic to deterministic behavior for enterprise-grade code generation. It orchestrates specialized agents through cognitive flows to deliver quality code following the Fluidic SDLC philosophy.

## Agent Naming Convention

Agents in Phoenix OS are personas with specific responsibilities. Agent names follow a structured naming pattern:

**Pattern**: `{domain}-keeper`

**Rationale**:

- **Persona-based**: Agent names represent roles, not technical functions
- **Keeper suffix**: Emphasizes stewardship, ownership, and continuous responsibility
- **Domain prefix**: Indicates the area of expertise (project, repo, deployment, etc.)

**Examples**:

- `project-keeper` - Steward of project management operations (issues, tracking, metadata)
- `repo-keeper` - Guardian of repository operations (commits, branches, worktrees)
- `bug-analyzer` - Specialist in bug analysis and RCA generation
- `bug-implementer` - Specialist in implementing bug fixes based on RCA
- `devops-keeper` - Steward of CI/CD pipeline setup and DevOps operations
- `deploy-keeper` - Custodian of deployment and release operations
- `epic-keeper` - Steward of epic creation from BRDs and product ideas
- `grooming-keeper` - Guardian of issue refinement and breakdown workflows
- `test-keeper` - Steward of test case generation from stories and acceptance criteria
- `eval-keeper` - Specialist in evaluation criteria and E2E test case generation from specs
- `validation-keeper` - Specialist in test execution and visual validation against specs
- `design-keeper` - Steward of design system generation and token management
- `component-generation-keeper` - Guardian of Figma-to-code component generation

**Critical Decision**: The `-keeper` suffix is intentional and consistent across all agents to reinforce the philosophy that agents are autonomous stewards of their domains, not just executors of commands.

## Agent-First Principle

**CRITICAL RULE**: Always use Phoenix OS agents when they exist for a task.

**When to use agents**:

- **Issue Operations**: ALWAYS use `phoenix:project-keeper` agent for creating, fetching, updating issues
- **Repository Operations**: ALWAYS use `phoenix:repo-keeper` agent for commits, branches, worktrees
- **Bug Analysis**: ALWAYS use `phoenix:bug-analyzer` agent for bug analysis and RCA generation
- **Bug Fix Implementation**: ALWAYS use `phoenix:bug-implementer` agent for implementing fixes based on RCA
- **DevOps Operations**: ALWAYS use `phoenix:devops-keeper` agent for CI/CD pipeline setup
- **Design System Generation**: ALWAYS use `phoenix:design-keeper` agent for design tokens and theme generation from Figma
- **Component Generation**: ALWAYS use `phoenix:component-generation-keeper` agent for Figma-to-code component creation
- **Any domain with a specialized agent**: Delegate to the appropriate agent

**Why**:

- Agents are autonomous stewards with full context from Long-Term Memory (LTM)
- Agents make decisions based on loaded standards and best practices
- Agents ensure consistency across all operations
- Direct tool usage bypasses Phoenix OS cognitive flows and deterministic workflows

**Examples**:

```bash
# ❌ WRONG: Direct tool usage
Use mcp__github__create_issue directly

# ✅ CORRECT: Agent delegation
Use Task tool with subagent_type: "phoenix:project-keeper"
Provide capability description: "Create GitHub issue for KPI metrics"
```

**How this is enforced**:

- This instruction is in CLAUDE.md (read at every session start)
- Commands follow this pattern (see core/commands/)
- Agents are documented in core/agents/

## Configuration

```yaml
configuration:
  project:
    name: Lead_management_1
    type: Application

  # Platform selection: github (default), azure-devops, or gitlab
  platform: github

  # pm-platform: issue platform (e.g. jira); falls back to `platform:` if unset
  # pm-platform: jira

  jira:
    base-url: https://your-domain.atlassian.net
    project-key: PROJ
    transitions:
      on-pr-create: In Review
      on-merge: Done

  github:
    repo: [Your repository URL]

  # GitLab configuration (parallel to github)
  # Requires: glab CLI — Setup: glab auth login --hostname <gitlab-host>
  gitlab:
    host: git.nagarro.com
    namespace: dx_innovations/phoenix
    project: phoenix-os
    repo: git@git.nagarro.com:dx_innovations/phoenix/phoenix-os.git

  # Azure DevOps configuration (parallel to github)
  # Requires: az CLI with azure-devops extension
  # Setup: az login && az devops configure --defaults organization=<org-url> project=<project>
  azure-devops:
    organization: contoso  # Organization name (from https://dev.azure.com/{organization})
    project: MyProject     # Project name within the organization
    repository: phoenix-os # Repository name within the project

  memory:
    core: ./.phoenix-os/core/memory/
    architecture: ./.phoenix-os/core/memory/practices/architecture/
    tech-stack: ./.phoenix-os/core/memory/practices/tech-stack/
    best-practices: ./.phoenix-os/core/memory/practices/best-practices/
    practices:
      implementation:
        path: ./.phoenix-os/core/memory/practices/implementation/
        quality-gates: quality-gates.md
        evidence-tracking: evidence-tracking.md
        decision-tracking: decision-tracking.md
      epic-management:
        path: ./.phoenix-os/core/memory/practices/epic-management/
        epic-creation: epic-creation.md
        brd-analysis: brd-analysis.md
      bug-fixing:
        path: ./.phoenix-os/core/memory/practices/bug-fixing/
        rca-guidelines: rca-guidelines.md
        analysis-methods: analysis-methods.md
      devops:
        path: ./.phoenix-os/core/memory/practices/devops/
        ci-cd-patterns: ci-cd-patterns.md
        secret-management: secret-management.md
      design-system:
        path: ./.phoenix-os/core/memory/practices/design-system/
        framework-integration: framework-integration.md
      component-generation:
        path: ./.phoenix-os/core/memory/practices/component-generation/
        token-mapping: token-mapping.md
        atomic-design: atomic-design.md
        reusability-patterns: reusability-patterns.md
        responsive-design: responsive-design.md
        asset-management: asset-management.md
      testing:
        path: ./.phoenix-os/core/memory/practices/testing/
        functional-test-cases: functional-test-cases.md
        standards: standards.md
        methodology: methodology.md
        prioritization: prioritization.md
        patterns: patterns.md
        preflight-checks: preflight-checks.md
      architecture-documentation:
        path: ./.phoenix-os/core/memory/practices/architecture-documentation/
        drawio-conventions: drawio-conventions.md
        data-classification: data-classification.md
        threat-modelling: threat-modelling.md
        doc-publishing: doc-publishing.md
        enterprise-doc-standards: enterprise-doc-standards.md
    team:
      path: ./.phoenix-os/core/memory/team/
      estimation: estimation.md
    tools:
      platform-detection: ./.phoenix-os/core/memory/tools/platform-detection.md
      git:
        path: ./.phoenix-os/core/memory/tools/git/
        commit-guidelines: commit-guidelines.md
        history-analysis: history-analysis.md
      github:
        path: ./.phoenix-os/core/memory/tools/github/
        commit-operations: commit-operations.md
        pr-operations: pr-operations.md
        issue-operations: issue-operations.md
      azure-devops:
        path: ./.phoenix-os/core/memory/tools/azure-devops/
        work-item-operations: work-item-operations.md
        repo-operations: repo-operations.md
        pr-operations: pr-operations.md
        pipeline-operations: pipeline-operations.md
      gitlab:
        path: ./.phoenix-os/core/memory/tools/gitlab/
        commit-operations: commit-operations.md
        pr-operations: pr-operations.md
        issue-operations: issue-operations.md
        pipeline-operations: pipeline-operations.md
      jira:
        path: ./.phoenix-os/core/memory/tools/jira/
        issue-operations: issue-operations.md
        authentication: authentication.md
      debugging:
        path: ./.phoenix-os/core/memory/tools/debugging/
        breakpoint-debugging: breakpoint-debugging.md
        logging-patterns: logging-patterns.md
        stack-trace-reading: stack-trace-reading.md
      dependencies:
        path: ./.phoenix-os/core/memory/tools/dependencies/
        version-analysis: version-analysis.md
      integration:
        path: ./.phoenix-os/core/memory/tools/integration/
        api-testing: api-testing.md
      logging:
        path: ./.phoenix-os/core/memory/tools/logging/
        patterns: patterns.md
      devxops:
        path: ./.phoenix-os/core/memory/tools/devxops/
        gitleaks-config: gitleaks-config.md
        sonarqube-setup: sonarqube-setup.md
        html-templates:
          path: ./.phoenix-os/core/memory/tools/devxops/html-templates/
          gitleaks: gitleaks-html-template.md
          pr-analysis: pr-analysis-html-template.md
      github-actions:
        path: ./.phoenix-os/core/memory/tools/github-actions/
        workflow-patterns: workflow-patterns.md
        pr-workflow-patterns: pr-workflow-patterns.md
      figma:
        path: ./.phoenix-os/core/memory/tools/figma/
        figma-operations: figma-operations.md
        mcp-integration: mcp-integration.md
        token-extraction: token-extraction.md
      jest:
        path: ./.phoenix-os/core/memory/tools/jest/
        commands: commands.md
        configuration: configuration.md
        coverage-operations: coverage-operations.md
        test-operations: test-operations.md
        mocking-patterns: mocking-patterns.md
      pytest:
        path: ./.phoenix-os/core/memory/tools/pytest/
        commands: commands.md
        configuration: configuration.md
        coverage-operations: coverage-operations.md
        mocking-patterns: mocking-patterns.md
        test-operations: test-operations.md
      junit:
        path: ./.phoenix-os/core/memory/tools/junit/
        commands: commands.md
        configuration: configuration.md
        coverage-operations: coverage-operations.md
        mocking-patterns: mocking-patterns.md
        test-operations: test-operations.md
      go-test:
        path: ./.phoenix-os/core/memory/tools/go-test/
        commands: commands.md
        configuration: configuration.md
        coverage-operations: coverage-operations.md
        mocking-patterns: mocking-patterns.md
        test-operations: test-operations.md
      dotnet-test:
        path: ./.phoenix-os/core/memory/tools/dotnet-test/
        commands: commands.md
        configuration: configuration.md
        coverage-operations: coverage-operations.md
        mocking-patterns: mocking-patterns.md
        test-operations: test-operations.md
      vitest:
        path: ./.phoenix-os/core/memory/tools/vitest/
        commands: commands.md
        configuration: configuration.md
        coverage-operations: coverage-operations.md
        mocking-patterns: mocking-patterns.md
        test-operations: test-operations.md
      playwright:
        path: ./.phoenix-os/core/memory/tools/playwright/
        commands: commands.md
        configuration: configuration.md
        test-operations: test-operations.md
        screenshot-operations: screenshot-operations.md
      e2e:
        path: ./.phoenix-os/core/memory/tools/e2e/
        tool-detection: tool-detection.md
      npm:
        path: ./.phoenix-os/core/memory/tools/npm/
        script-operations: script-operations.md
        test-scripts: test-scripts.md
    testing:
      path: ./.phoenix-os/core/memory/practices/testing/
      standards: standards.md
      methodology: methodology.md
      prioritization: prioritization.md
      patterns: patterns.md
      patterns-python: patterns-python.md
      patterns-java: patterns-java.md
      patterns-go: patterns-go.md
      patterns-dotnet: patterns-dotnet.md
      preflight-checks: preflight-checks.md
      stack-detection: stack-detection.md
      command-interface: command-interface.md
      mocking-frameworks: mocking-frameworks.md
      exclusions:
        path: ./.phoenix-os/core/memory/practices/testing/exclusions/
        config-import: config-import.md
        defaults: defaults.md
        heuristics: heuristics.md
        merge-algorithm: merge-algorithm.md

  commands:
    core: ./.claude/commands/

  behaviors:
    implementation:
      path: ./.claude/commands/phoenix/impl/_shared/
      interview-loop: interview-loop.md

  agents:
    core: ./.claude/agents/

  templates:
    path: ./.phoenix-os/core/templates/plan/
    issue-details: issue-details.md
    epic-details: epic-details.md
    impl:
      path: ./.phoenix-os/core/templates/impl/
      spec: spec.md
      tech-design: tech-design.md
      ref-code: ref-code.md
      todo: todo.md
      bug-fix-analysis: bug-fix-analysis.md
    bug:
      path: ./.phoenix-os/core/templates/bug/
      rca: rca.md
      evidence: evidence.md
      github-comment: github-comment.md
      pr-body: pr-body.md
      pr-link-comment: pr-link-comment.md

  specs:
    base-path: .phoenix-os/project/specs/
    naming: { issue-number }

  stm:
    base-path: .phoenix-os/project/work/
    naming: {issue-number}
    base: ./.phoenix-os/project/stm/
    devops-config: devops-config.json
    devops-summary: devops-summary.md

  worktree:
    base-path: ../worktrees/phoenix-os/
    naming: issue-{number}

  devops:
    workflows:
      base: ./.github/workflows/
      ci-build-test: ci-build_test.yml
      ci-run-dxops: ci-run_dx_ops.yml
      pr-auto-review: pr-auto_review.yml
      pr-auto-documentation: pr-auto_documentation.yml
    devxops:
      base: ./.devxops/
      gitleaks-config: gitleaks.toml
      sonar-config: sonar-project.properties
      snyk-config: .snyk
      quality-gates: quality-gates.yml
    scripts:
      devxops:
        base: ./scripts/devxops/
        gitleaks-html-generator: gitleaks-html-generator.py
        github-pr-analysis: github-pr-analysis.py
      git:
        base: ./scripts/git/
        setup-hooks: setup-hooks.sh
        hooks:
          base: ./scripts/git/hooks/
          pre-commit: pre-commit
          commit-msg: commit-msg
          pre-push: pre-push
        commit: commit.sh
        create-pr: create-pr.sh
    config:
      secrets:
        base: ./config/secrets/
        readme: README.md

  project:
    testing:
      reports: .phoenix-os/project/reports/testing/
      coverage-threshold: 80  # Reference value - actual thresholds defined in memory.testing.standards
```
