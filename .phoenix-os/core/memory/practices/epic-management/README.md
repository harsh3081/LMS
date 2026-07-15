# Epic Management System

Complete documentation for Phoenix OS epic creation and grooming workflows.

## Overview

The Epic Management System provides a structured approach to creating and refining GitHub epics from Business Requirement Documents (BRDs) or manual product ideas. It follows Phoenix OS philosophy with proper separation of concerns, capability-based orchestration, and user approval workflows.

## System Components

### Commands

1. **[/create-epic](.claude/commands/phoenix/plan/create-epic.md)**
   - Creates epics from BRD or manual input
   - Analyzes requirements and suggests epic breakdown
   - Gets user approval before creating
   - Supports assignee and custom labels
   - Usage: `/create-epic {brd-path|manual} [@assignee] [labels]`

2. **[/groom-epic](.claude/commands/phoenix/plan/groom-epic.md)**
   - Grooms issues based on native type (Epic/Feature/Story/Task)
   - Validates completeness
   - Creates sub-issue breakdown
   - Estimates complexity
   - Usage: `/groom-epic {issue-number}`

### Agents

1. **[epic-keeper](.claude/agents/plan/epic-keeper.md)**
   - Analyzes BRDs and product ideas
   - Suggests epic breakdowns
   - Creates epics in GitHub with proper metadata
   - Manages labels and project board assignment
   - Type: Steward agent following memory abstraction

2. **[grooming-keeper](.claude/agents/plan/grooming-keeper.md)**
   - Refines issues based on type
   - Validates completeness criteria
   - Creates sub-issues (Features, Stories, Tasks)
   - Estimates complexity
   - Type: Steward agent following memory abstraction

### Memory

1. **[epic-creation.md](./epic-creation.md)**
   - Best practices for epic creation
   - Input sources (BRD, manual)
   - Epic suggestion workflow
   - GitHub operations guide
   - Error handling patterns

2. **[brd-analysis.md](./brd-analysis.md)**
   - BRD document formats
   - Structure analysis methods
   - Epic extraction logic
   - Feature categorization
   - Natural language processing patterns

### Templates

1. **[epic-details.md](.phoenix-os/core/templates/plan/epic-details.md)**
   - Epic issue body template
   - Template variables
   - Formatting rules
   - Validation checklist
   - Complete examples

## Quick Start

### 1. Create Epics from BRD

```bash
# Create epics from a Business Requirement Document
/create-epic docs/requirements/platform-brd.md

# With assignee
/create-epic docs/brd.md @alice

# With custom labels
/create-epic docs/brd.md @alice "mvp,q1-2024"
```

**What happens**:
1. BRD file is parsed and analyzed
2. Features are categorized into epic domains
3. Epic suggestions are presented to user
4. User approves/edits/declines
5. Approved epics are created in GitHub
6. Summary report with next steps

### 2. Create Epics from Manual Input

```bash
# Interactive mode for manual input
/create-epic manual

# With assignee
/create-epic manual @johndoe
```

**What happens**:
1. System prompts for Core Concept
2. Prompts for Key Features (min 3)
3. Prompts for Target Users (min 1)
4. Prompts for Tech Stack
5. Analyzes input and suggests epics
6. User approves/edits/declines
7. Approved epics are created

### 3. Groom Epic to Create Features

```bash
# Groom an epic created previously
/groom-epic 120
```

**What happens**:
1. Retrieves epic with native type
2. Validates completeness
3. Presents missing fields and suggested features
4. User chooses: complete / breakdown / both / skip
5. Creates feature sub-issues if requested
6. Estimates complexity
7. Updates labels (groomed, size-l)

### 4. Groom Feature to Create Stories

```bash
# Groom a feature issue
/groom-epic 125
```

**What happens**:
1. Retrieves feature with native type
2. Validates completeness
3. Suggests user stories
4. Creates story sub-issues if approved
5. Links to parent feature
6. Estimates complexity

## Complete Workflow Example

### Scenario: Building a Customer Support Platform

**Step 1: Create Epics from BRD**

```bash
/create-epic docs/support-platform-brd.md @product-owner
```

**BRD Content**:
```markdown
# Customer Support Platform

## Product Vision
Build an AI-powered customer support platform for SaaS companies...

## Key Features
- Ticket management with AI categorization
- Team performance analytics
- Multi-channel integrations
...
```

**System Output**:
```markdown
## Epic Creation Analysis

Based on support-platform-brd.md, I've identified 3 epic(s):

---

## Epic Suggestion 1: [Epic] Support Management: AI-Powered Ticket System

**Priority**: High | **Scope**: Medium (M) | **Features**: 4

### Features (will be created as sub-issues)
1. Ticket creation and management
2. AI-powered categorization
3. Smart routing
4. Canned responses

---

## Epic Suggestion 2: [Epic] Analytics: Performance Tracking Dashboard

**Priority**: Medium | **Scope**: Medium (M) | **Features**: 4
...

---

## Epic Suggestion 3: [Epic] Integration: Multi-Channel Hub

**Priority**: Medium | **Scope**: Small (S) | **Features**: 3
...

---

What would you like to do? (approve / approve 1,3 / edit 2 / decline)
```

**User Action**: `approve`

**Result**:
```markdown
✅ Epic Creation Complete

Created 3 epic(s):

1. Epic #120: [Epic] Support Management: AI-Powered Ticket System
   - URL: https://github.com/org/repo/issues/120
   - Priority: High
   - Scope: Medium (M)
   - Features: 4 (to be created during grooming)

2. Epic #121: [Epic] Analytics: Performance Tracking Dashboard
   ...

3. Epic #122: [Epic] Integration: Multi-Channel Hub
   ...

## Next Steps

1. Review epics in GitHub
2. Groom epics: /groom-epic 120
```

**Step 2: Groom Epic #120**

```bash
/groom-epic 120
```

**System Output**:
```markdown
## Grooming Analysis: Issue #120

**Title**: [Epic] Support Management: AI-Powered Ticket System
**Type**: Epic
**State**: OPEN

### Completeness Check

✅ Problem Statement present
✅ Proposed Solution present
✅ Key Capabilities present
✅ Target Users present
⚠️  Missing: Success Metrics
ℹ️  No features defined. Breakdown recommended.

### Recommended Actions

1. Add missing field: Success Metrics
2. Break down into Features (suggested: 4)

---

Would you like me to:
- Type "complete" to add missing fields
- Type "breakdown" to create sub-issues
- Type "both" to do both
- Type "skip" to skip
```

**User Action**: `both`

**System Prompts**:
```
📊 Success Metrics (how we measure success):
Metric 1: 100% of tickets properly categorized by AI
Metric 2: Average response time under 2 hours
Metric 3: Customer satisfaction > 90%
...

Based on epic capabilities, suggested features:
1. [Feature] Ticket creation and management
2. [Feature] AI-powered categorization
3. [Feature] Smart routing based on expertise
4. [Feature] Canned responses library

Create these features under Epic #120? (yes/edit/no)
```

**User Action**: `yes`

**Result**:
```markdown
✅ Grooming Complete: Issue #120

## Changes Made

✅ Added missing field: Success Metrics

✅ Created 4 sub-issues:
- #125: [Feature] Ticket creation and management
- #126: [Feature] AI-powered categorization
- #127: [Feature] Smart routing based on expertise
- #128: [Feature] Canned responses library

✅ Estimated complexity: Medium (M)

## Labels Updated
- Removed: needs-grooming
- Added: groomed, size-m

## Next Steps

1. Review: https://github.com/org/repo/issues/120
2. Groom features:
   - /groom-epic 125
   - /groom-epic 126
   - /groom-epic 127
   - /groom-epic 128
```

**Step 3: Groom Feature #125**

```bash
/groom-epic 125
```

**System analyzes feature and suggests stories...**

**Step 4: Continue until Task level**

Continue grooming Features → Stories → Tasks until reaching implementable task level.

## Architecture

### Command → Agent Flow

```
User
  ↓
  /create-epic {brd-path}
  ↓
Command (Orchestrator)
  - Validates inputs
  - Defines capability
  - No context provided
  ↓
  Task tool → epic-keeper agent
  ↓
epic-keeper Agent
  - Builds own context from memory
  - Reads BRD analysis memory
  - Reads epic creation memory
  - Reads issue operations memory
  - Parses BRD
  - Suggests epics
  - Gets user approval
  - Creates epics via gh CLI
  - Returns summary
  ↓
Command (Orchestrator)
  - Displays summary to user
  - Suggests next steps
```

### Separation of Concerns

**Commands**:
- Orchestrate workflow
- Validate inputs
- Define WHAT needs to be done
- Display results to user
- Never execute GitHub operations

**Agents**:
- Build own context from memory
- Determine HOW to accomplish capability
- Execute GitHub operations
- Handle errors gracefully
- Return structured results

**Memory**:
- Document best practices
- Define operation patterns
- Provide implementation guidance
- Independent of commands/agents

**Templates**:
- Define output formats
- Ensure consistency
- Validation criteria
- Examples

## GitHub Native Types

**CRITICAL**: This system uses GitHub's native issue type system, not inferred types from titles or labels.

### Always Query Native Type

```bash
# Correct: Query native type via REST API
gh api repos/{owner}/{repo}/issues/{number} --jq '.type.name'

# Wrong: Infer from title
# Never do: if title contains "[Epic]" then type="Epic"
```

### Available Native Types

- **Epic**: Large initiative spanning multiple sprints
- **Feature**: Specific capability or functionality
- **Story**: User-facing functionality for single sprint
- **Task**: Implementation work item
- **Bug**: Unexpected problem or behavior
- **Chore**: Maintenance task

### Setting Types

```bash
# Set epic type during creation
gh api repos/{owner}/{repo}/issues/{number} \
  --method PATCH \
  --field type="Epic"

# Set feature type
gh api repos/{owner}/{repo}/issues/{number} \
  --method PATCH \
  --field type="Feature"
```

## Label Management

### Standard Labels

The system automatically creates and manages these labels:

**Epic System**:
- `epic` - Epic-level initiative
- `needs-grooming` - Requires grooming
- `groomed` - Issue has been groomed

**Priority**:
- `high-priority` - High business priority
- `medium-priority` - Medium business priority
- `low-priority` - Low business priority

**Size**:
- `size-s` - Small (1-3 features/stories/tasks)
- `size-m` - Medium (4-7)
- `size-l` - Large (8-12)
- `size-xl` - Extra Large (13+)

### Custom Labels

Users can provide custom labels:

```bash
/create-epic docs/brd.md @alice "mvp,authentication,security"
```

These are added in addition to standard labels.

## Sub-Issue Hierarchy

### Standard Pattern

```
Epic (type="Epic")
├── Feature 1 (type="Feature")
│   ├── Story 1.1 (type="Story")
│   │   ├── Task 1.1.1 (type="Task")
│   │   └── Task 1.1.2 (type="Task")
│   └── Story 1.2 (type="Story")
│       └── Task 1.2.1 (type="Task")
└── Feature 2 (type="Feature")
    └── Story 2.1 (type="Story")
```

### Creating Sub-Issues

```bash
# Get parent node ID
parent_node=$(gh api repos/{owner}/{repo}/issues/{parent_number} --jq '.node_id')
child_node=$(gh api repos/{owner}/{repo}/issues/{child_number} --jq '.node_id')

# Link child to parent
gh api graphql -f query='
mutation {
  addSubIssue(input: {
    issueId: "'"$parent_node"'",
    subIssueId: "'"$child_node"'"
  }) {
    issue { title }
  }
}'
```

### Querying Hierarchy

```bash
# Get sub-issues summary
gh api repos/{owner}/{repo}/issues/{number} --jq '.sub_issues_summary'
# Returns: {"total": 4, "completed": 1, "percent_completed": 25}

# Get full hierarchy (GraphQL)
gh api graphql -f query='
{
  repository(owner: "{owner}", name: "{repo}") {
    issue(number: {number}) {
      title
      subIssues(first: 100) {
        nodes {
          ... on Issue {
            number
            title
            state
          }
        }
      }
    }
  }
}'
```

## Error Handling

### Common Errors

**BRD File Not Found**:
```
❌ Error: BRD file not found at path: docs/brd.md

Please check the file path, or use manual mode:
/create-epic manual
```

**Issue Type Not Set**:
```
❌ Error: Issue #120 does not have native type set

Set type in GitHub before grooming:
1. Open: https://github.com/org/repo/issues/120
2. Click ... → Type → Epic
3. Then: /groom-epic 120
```

**No Write Permission**:
```
❌ Error: Insufficient permissions to create issues

You need write access to the repository.
```

### Graceful Degradation

The system continues with warnings when possible:

```
⚠️  Warning: Unable to create label 'custom-label': Already exists
Continuing with existing labels...

⚠️  Warning: Project 'Platform' not found
Epic created without project assignment
```

## Best Practices

### 1. BRD Quality

**Good BRD Structure**:
```markdown
# Product Vision
Clear problem statement and solution approach

## Target Users
Specific personas with use cases

## Key Features
Categorized features with descriptions

## Technical Requirements
Tech stack and architecture decisions

## Success Criteria
Measurable KPIs and metrics
```

### 2. Epic Naming

**Pattern**: `[Epic] {Domain}: {High-level Goal}`

**Good Examples**:
- `[Epic] Authentication: Secure Multi-Factor Login System`
- `[Epic] Analytics: Real-time Performance Dashboard`
- `[Epic] Integration: Multi-Provider Payment Gateway`

**Bad Examples**:
- `Epic 1` (no domain or goal)
- `Build authentication` (no epic prefix)
- `[Epic] Stuff` (vague, no specifics)

### 3. Incremental Grooming

Groom one level at a time:

```bash
# Step 1: Epic → Features
/groom-epic 120

# Step 2: Feature → Stories
/groom-epic 125
/groom-epic 126

# Step 3: Story → Tasks
/groom-epic 130
/groom-epic 131
```

Don't skip levels (Epic → Task directly).

### 4. User Collaboration

Always involve team in:
- Epic approval before creation
- Feature breakdown definition
- Story writing (user perspective)
- Task decomposition (implementation)

### 5. Completeness Before Breakdown

Complete missing fields before creating sub-issues:

```
User action: both  ✅ (complete then breakdown)

vs

User action: breakdown  ⚠️  (creates incomplete sub-issues)
```

## Integration with Other Phoenix OS Commands

### After Epic Creation

```bash
# 1. Create epics
/create-epic docs/brd.md

# 2. Groom epics
/groom-epic 120

# 3. Fetch for planning
/fetch-issue 120

# 4. Start implementation
/phoenix:impl:prepare 125  # Feature from Epic
```

### With Project Management

```bash
# Epics automatically added to project board (if configured)
# View in GitHub Projects
# Filter by: type:Epic label:high-priority
```

## Troubleshooting

### Epic Creation Fails

**Check**:
1. GitHub CLI authenticated: `gh auth status`
2. Write permissions: `gh repo view --json viewerPermission`
3. BRD file readable: `cat {brd-path}`

### Grooming Fails

**Check**:
1. Issue exists: `gh issue view {number}`
2. Issue has type set: `gh api repos/{owner}/{repo}/issues/{number} --jq '.type.name'`
3. Not null/empty type

### Sub-Issues Not Linked

**Check**:
1. Both issues exist
2. GraphQL mutation succeeded
3. View in GitHub UI: Issue → Development → Sub-issues

## Reference

### Files Created

```
.claude/
├── agents/
│   └── plan/
│       ├── epic-keeper.md           # Epic creation agent
│       └── grooming-keeper.md       # Issue grooming agent
└── commands/
    └── phoenix/
        └── plan/
            ├── create-epic.md        # Epic creation command
            └── groom-epic.md         # Issue grooming command

.phoenix-os/
└── core/
    ├── memory/
    │   └── practices/
    │       └── epic-management/
    │           ├── README.md         # This file
    │           ├── epic-creation.md  # Creation best practices
    │           └── brd-analysis.md   # BRD parsing methods
    └── templates/
        └── plan/
            └── epic-details.md       # Epic issue template
```

### Configuration Updated

```yaml
# CLAUDE.md additions:

memory:
  practices:
    epic-management:
      path: ./.phoenix-os/core/memory/practices/epic-management/
      epic-creation: epic-creation.md
      brd-analysis: brd-analysis.md

templates:
  epic-details: epic-details.md
```

## See Also

- [GitHub Issue Operations](../../tools/github/issue-operations.md)
- [Project Keeper Agent](../../../../.claude/agents/plan/project-keeper.md)
- [Scrum Master Agent](../../../../.claude/agents/plan/scrum-master.md)
- Phoenix OS Philosophy (link to wiki when available)

---

**Version**: 1.0.0
**Last Updated**: 2024-12-10
**Status**: Active
