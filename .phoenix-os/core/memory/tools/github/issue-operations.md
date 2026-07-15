# GitHub Issue Operations

This document defines the implementation methods (HOW) for GitHub issue operations in Phoenix OS.

**Memory Type**: Long-term memory (LT) - Provides implementation patterns for agents.

**Role**: Agents read this memory to understand HOW to execute GitHub operations. Commands do NOT pass this to agents; agents discover and read it independently.

**Memory Path**: `${config.memory.tools.github.issue-operations}`

**CRITICAL REQUIREMENT**: All issue operations MUST use GitHub's native issue type system. Never infer or guess issue types from titles, labels, or context. Always query the `.type.name` field from the GitHub API to get the actual native issue type.

## GitHub Native Issue Types

### Available Issue Types (Organization-Level)

GitHub supports native issue types that are separate from labels or title conventions:

- **Task**: A specific piece of work
- **Bug**: An unexpected problem or behavior
- **Feature**: A request, idea, or new functionality
- **Epic**: Large user story spanning multiple sprints
- **Story**: User perspective functionality for single sprint
- **Chore**: Maintenance task (refactoring, dependencies, tooling)

### Working with Issue Types

#### Get Organization Issue Types

```bash
# List all configured issue types
gh api orgs/{org}/issue-types

# Example for nagarro-digital
gh api orgs/nagarro-digital/issue-types
```

#### Filter Issues by Type

```bash
# Search for features using native type
gh issue list --search "type:feature"

# Search for bugs using native type
gh issue list --search "type:bug"

# Search for chores using native type
gh issue list --search "type:chore"

# Combine with other filters
gh issue list --search "type:feature state:open assignee:@me"
```

#### Update Issue Type

```bash
# Set issue type via API
gh api repos/{owner}/{repo}/issues/{number} --method PATCH --field type="Feature"

# Example: Set issue #55 as Bug
gh api repos/nagarro-digital/phoenix-frontend/issues/55 --method PATCH --field type="Bug"
```

#### Query Issues with Type Information

```bash
# Get issues with their types (REST API - RECOMMENDED)
gh api repos/{owner}/{repo}/issues --paginate --jq '.[] | {number, title, type: .type.name}'

# Get single issue type
gh api repos/{owner}/{repo}/issues/{number} --jq '.type.name'

# Get issue with full type details
gh api repos/{owner}/{repo}/issues/{number} --jq '{number, title, type: .type}'

# Group issues by type
gh api repos/{owner}/{repo}/issues --paginate --jq '.[] | {number, title, type: .type.name // "Not Set"}' | jq -s 'group_by(.type)'

# Get multiple specific issues with types
for issue in 3 102 108 120; do
  echo "Issue #$issue:"
  gh api repos/{owner}/{repo}/issues/$issue --jq '{number, title, type: .type.name // "Not Set"}'
done
```

## Finding Related Issues

### Primary Method: GitHub CLI with Type Support

```bash
# Search by keywords and type
gh issue list --state all --search "{keywords} type:feature" --json number,title,state

# Search by title prefix (legacy)
gh issue list --search "in:title feature"

# Get specific issue with type
gh issue view {issue-number} --json number,title,state,assignees,labels,type
```

### Secondary Method: MCP GitHub Server

```javascript
// Search issues
mcp__github__search_issues({
  q: "{keywords} repo:{owner}/{repo}"
})

// Get specific issue
mcp__github__get_issue({
  owner: {owner},
  repo: {repo},
  issue_number: {issue-number}
})
```

### Fallback Method: Direct API

```bash
curl -H "Authorization: token $GITHUB_TOKEN" \
  "https://api.github.com/search/issues?q={keywords}+repo:{owner}/{repo}"
```

## Updating Issue Status

### Primary Method: GitHub CLI

```bash
# Add to project
gh issue edit {issue-number} --add-project {project-name}

# Add comment
gh issue comment {issue-number} -b {comment}

# Update labels
gh issue edit {issue-number} --add-label "in-review"
```

### Secondary Method: MCP GitHub Server

```javascript
// Add comment
mcp__github__add_issue_comment({
  owner: {owner},
  repo: {repo},
  issue_number: {issue-number},
  body: {comment}
})

// Update issue
mcp__github__update_issue({
  owner: {owner},
  repo: {repo},
  issue_number: {issue-number},
  labels: ["in-review"]
})
```

## Project Board Operations

### Primary Method: GitHub CLI

```bash
# List projects
gh project list --owner {owner} --format json

# Get project fields
gh project field-list {project-number} --owner {owner} --format json

# Update item status (if item ID available)
gh project item-edit --project-id {project-number} --owner {owner} \
  --id {item-id} --field Status --single-select-option-id {option-id}
```

### Secondary Method: GraphQL API

```graphql
query GetProjectFields($org: String!, $number: Int!) {
  organization(login: $org) {
    projectV2(number: $number) {
      fields(first: 20) {
        nodes {
          ... on ProjectV2SingleSelectField {
            id
            name
            options {
              id
              name
            }
          }
        }
      }
    }
  }
}
```

## Linking Issues to PRs

### Primary Method: GitHub Convention

- Include "Fixes #123" or "Closes #123" in PR description
- GitHub automatically links and will close issue on merge

### Secondary Method: Manual Comment

```bash
# Add cross-reference comment
gh issue comment {issue-number} -b "PR #{pr-number} addresses this issue"
gh pr comment {pr-number} -b "This PR addresses issue #{issue-number}"
```

## Bulk Issue Type Operations

### Analyze Issues Without Types

```bash
# Find all issues without native types set
gh api repos/{owner}/{repo}/issues --paginate --jq '.[] | select(.type == null) | {number, title}'

# Count issues by type including "Not Set"
gh api repos/{owner}/{repo}/issues --paginate --jq '.[] | .type.name // "Not Set"' | sort | uniq -c
```

### Batch Update Issue Types

```bash
# Update multiple issues based on title prefix
for issue in $(gh issue list --search "in:title feature" --json number -q '.[].number'); do
  gh api repos/{owner}/{repo}/issues/$issue --method PATCH --field type="Feature"
done

# Update based on labels
gh issue list --label "bug" --json number -q '.[].number' | while read num; do
  gh api repos/{owner}/{repo}/issues/$num --method PATCH --field type="Bug"
done
```

## Querying Issue Hierarchies with Native Types

**CRITICAL**: When querying issue hierarchies, you MUST retrieve native types using REST API, not GraphQL. The GraphQL API does not expose the `type` field for issues.

### Get Hierarchy with Native Types (Correct Method)

```bash
# Step 1: Get hierarchy structure via GraphQL
gh api graphql -f query='
{
  repository(owner: "{owner}", name: "{repo}") {
    issues(first: 100, states: OPEN) {
      nodes {
        number
        title
        state
        assignees(first: 3) {
          nodes {
            login
          }
        }
        subIssues(first: 20) {
          totalCount
          nodes {
            ... on Issue {
              number
              title
              state
              assignees(first: 3) {
                nodes {
                  login
                }
              }
            }
          }
        }
      }
    }
  }
}' > /tmp/hierarchy.json

# Step 2: Get native types for all issues via REST API
issue_numbers=$(jq -r '.data.repository.issues.nodes[].number' /tmp/hierarchy.json)
for num in $issue_numbers; do
  type_name=$(gh api repos/{owner}/{repo}/issues/$num --jq '.type.name // "Not Set"')
  echo "$num:$type_name"
done > /tmp/types.txt

# Step 3: Merge hierarchy with native types in your script/tool
```

### Example: Complete Hierarchy Query Script

```bash
#!/bin/bash
# Script to fetch issue hierarchy with native types

OWNER="nagarro-digital"
REPO="phoenix-frontend"

# Fetch hierarchy structure
gh api graphql -f query="
{
  repository(owner: \"$OWNER\", name: \"$REPO\") {
    issues(first: 100, states: OPEN) {
      nodes {
        number
        title
        state
        assignees(first: 3) { nodes { login } }
        subIssues(first: 20) {
          totalCount
          nodes {
            ... on Issue {
              number
              title
              state
              assignees(first: 3) { nodes { login } }
            }
          }
        }
      }
    }
  }
}" | jq -r '.data.repository.issues.nodes[] | .number' | while read num; do
  # Get native type for each issue
  issue_data=$(gh api repos/$OWNER/$REPO/issues/$num --jq '{
    number: .number,
    title: .title,
    state: .state,
    type: .type.name // "Not Set",
    assignees: [.assignees[].login]
  }')
  echo "$issue_data"
done
```

## GraphQL Queries for Issue Types

**WARNING**: GitHub's GraphQL API does not expose the native `type` field for issues. You must use the REST API to retrieve issue types.

### GraphQL Limitations

```graphql
# THIS WILL NOT WORK - type field doesn't exist in GraphQL
query GetIssuesWithTypes($owner: String!, $repo: String!) {
  repository(owner: $owner, name: $repo) {
    issues(first: 100) {
      nodes {
        number
        title
        type {
          # ❌ This field does not exist
          name
        }
      }
    }
  }
}
```

### Correct Approach: REST API for Types

```bash
# Use REST API to get issue types
gh api repos/{owner}/{repo}/issues/{number} --jq '.type.name'

# Batch query multiple issues
for num in 3 59 66 74 97 102 108 120; do
  type=$(gh api repos/{owner}/{repo}/issues/$num --jq '.type.name // "Not Set"')
  title=$(gh api repos/{owner}/{repo}/issues/$num --jq '.title')
  echo "Issue #$num: $title - Type: $type"
done
```

## Working with Sub-Issues

GitHub supports native parent-child relationships between issues, allowing hierarchical organization following the standard agile hierarchy.

### Standard Hierarchy Pattern

```
Epic (Large initiative spanning multiple sprints)
├── Feature (Specific capability or functionality)
│   ├── Story (User-facing functionality for single sprint)
│   │   ├── Task (Implementation work item)
│   │   └── Test (Validation work item)
```

### Completion Rules (Bottom-Up)

1. **Task/Test Level**: Individual work items marked complete when done
2. **Story Level**: Complete when ALL child tasks and tests are complete
3. **Feature Level**: Complete when ALL child stories are complete
4. **Epic Level**: Complete when ALL child features are complete

**CRITICAL**: A parent issue cannot be truly complete unless all its sub-issues are complete. This ensures proper tracking and prevents premature closure.

### Limitations

- Maximum 100 sub-issues per parent issue
- Maximum 8 levels of nesting depth
- Requires at least triage permissions

### Query Sub-Issues Hierarchy

#### Get Direct Sub-Issues (REST API)

```bash
# Check sub-issues summary
gh api repos/{owner}/{repo}/issues/{number} --jq '.sub_issues_summary'
# Returns: {"total": 2, "completed": 1, "percent_completed": 50}
```

#### Get Full Hierarchy (GraphQL)

```bash
# Query multiple levels of sub-issues
gh api graphql -f query='
{
  repository(owner: {owner}, name: {repo}) {
    issue(number: {number}) {
      number
      title
      state
      subIssues(first: 100) {
        totalCount
        nodes {
          ... on Issue {
            number
            title
            state
            subIssues(first: 10) {  # Nested level
              totalCount
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
      }
    }
  }
}'

# Example: Get Epic #59 hierarchy
gh api graphql -f query='
{
  repository(owner: "nagarro-digital", name: "phoenix-frontend") {
    issue(number: 59) {
      title
      subIssues(first: 10) {
        totalCount
        nodes {
          ... on Issue {
            number
            title
          }
        }
      }
    }
  }
}'
```

### Add Sub-Issues

#### Link Existing Issue as Sub-Issue

```bash
# Get node IDs first
parent_id=$(gh api repos/{owner}/{repo}/issues/{parent-number} --jq '.node_id')
child_id=$(gh api repos/{owner}/{repo}/issues/{child-number} --jq '.node_id')

# Add as sub-issue
gh api graphql -f query='
mutation {
  addSubIssue(input: {
    issueId: \"$parent_id\",
    subIssueId: \"$child_id\"
  }) {
    issue {
      title
      subIssues(first: 10) {
        totalCount
      }
    }
  }
}'
```

### Remove Sub-Issues

```bash
# Remove sub-issue relationship
gh api graphql -f query='
mutation {
  removeSubIssue(input: {
    issueId: \"$parent_id\",
    subIssueId: \"$child_id\"
  }) {
    issue {
      title
      subIssues(first: 10) {
        totalCount
      }
    }
  }
}'
```

### Reorder Sub-Issues

```bash
# Move sub-issue to different position
gh api graphql -f query='
mutation {
  reprioritizeSubIssue(input: {
    issueId: \"$parent_id\",
    subIssueId: \"$child_id\",
    afterSubIssueId: \"$other_child_id\"  # Optional: position after this issue
  }) {
    issue {
      subIssues(first: 10) {
        nodes {
          ... on Issue {
            number
            title
          }
        }
      }
    }
  }
}'
```

### Find Issues with Sub-Issues

```bash
# List all issues that have sub-issues
gh api repos/{owner}/{repo}/issues --paginate --jq '.[] | select(.sub_issues_summary.total > 0) | {number, title, sub_count: .sub_issues_summary.total}'

# Find parent of an issue (if it exists)
gh api graphql -f query='
{
  repository(owner: {owner}, name: {repo}) {
    issues(first: 100) {
      nodes {
        subIssues(first: 100) {
          nodes {
            ... on Issue {
              number
            }
          }
        }
        number
      }
    }
  }
}' | jq '.data.repository.issues.nodes[] | select(.subIssues.nodes[].number == {child-number})'
```

### Epic → Feature → Story → Task/Test Pattern

```bash
# Complete hierarchy for project management
# 1. Create Epic (parent issue) with native type
gh issue create --title "[Epic] Project Initiative" --body "Epic description"
epic_id={epic-number}
gh api repos/{owner}/{repo}/issues/$epic_id --method PATCH --field type="Epic"

# 2. Create Feature under Epic
feature_id=$(gh issue create --title "[Feature] Specific capability" --body "Feature description" --json number -q '.number')
gh api repos/{owner}/{repo}/issues/$feature_id --method PATCH --field type="Feature"

# Link Feature to Epic
epic_node=$(gh api repos/{owner}/{repo}/issues/$epic_id --jq '.node_id')
feature_node=$(gh api repos/{owner}/{repo}/issues/$feature_id --jq '.node_id')
gh api graphql -f query='
mutation {
  addSubIssue(input: {issueId: \"$epic_node\", subIssueId: \"$feature_node\"}) {
    issue { title }
  }
}'

# 3. Create Story under Feature
story_id=$(gh issue create --title "[Story] User functionality" --body "Story description" --json number -q '.number')
gh api repos/{owner}/{repo}/issues/$story_id --method PATCH --field type="Story"

# Link Story to Feature
story_node=$(gh api repos/{owner}/{repo}/issues/$story_id --jq '.node_id')
gh api graphql -f query='
mutation {
  addSubIssue(input: {issueId: \"$feature_node\", subIssueId: \"$story_node\"}) {
    issue { title }
  }
}'

# 4. Create Tasks and Tests under Story
task_id=$(gh issue create --title "[Task] Implement component" --body "Task description" --json number -q '.number')
test_id=$(gh issue create --title "[Test] Validate component" --body "Test description" --json number -q '.number')

# Set native types
gh api repos/{owner}/{repo}/issues/$task_id --method PATCH --field type="Task"
gh api repos/{owner}/{repo}/issues/$test_id --method PATCH --field type="Task"

# Link both to Story
task_node=$(gh api repos/{owner}/{repo}/issues/$task_id --jq '.node_id')
test_node=$(gh api repos/{owner}/{repo}/issues/$test_id --jq '.node_id')

for child_node in $task_node $test_node; do
  gh api graphql -f query='
  mutation {
    addSubIssue(input: {issueId: \"$story_node\", subIssueId: \"$child_node\"}) {
      issue { title }
    }
  }'
done
```

### Check Completion Status

```bash
# Check if all sub-issues are complete (for any parent)
gh api graphql -f query='
{
  repository(owner: {owner}, name: {repo}) {
    issue(number: {parent-number}) {
      title
      state
      subIssues(first: 100) {
        totalCount
        nodes {
          ... on Issue {
            number
            title
            state
          }
        }
      }
      sub_issues_summary: subIssuesSummary {
        total
        completed
        percentCompleted
      }
    }
  }
}'

# Validation: Parent should not be closed if children are open
# This query finds improperly closed parents
gh api repos/{owner}/{repo}/issues --jq '.[] |
  select(.state == "closed" and .sub_issues_summary.completed < .sub_issues_summary.total) |
  {number, title, open_children: (.sub_issues_summary.total - .sub_issues_summary.completed)}'
```

### Hierarchy Management Best Practices

1. **Type Assignment**: Always assign native GitHub issue types matching the hierarchy level

   - Epic → type="Epic"
   - Feature → type="Feature"
   - Story → type="Story"
   - Task/Test → type="Task"

2. **Type Retrieval - CRITICAL RULE**:

   - **NEVER infer issue type from title, labels, or context**
   - **ALWAYS query native type using REST API**: `gh api repos/{owner}/{repo}/issues/{number} --jq '.type.name'`
   - If type is `null`, display as "Not Set" - do not guess
   - GraphQL API does not support the `type` field - use REST API only

3. **Naming Convention**: Use prefixes in titles for clarity (but don't rely on them for type detection)

   - [Epic] for large initiatives
   - [Feature] for capabilities
   - [Story] for user stories
   - [Task] for implementation work
   - [Test] for validation work

4. **Completion Tracking**:

   - Monitor `sub_issues_summary.percentCompleted`
   - Never close parent if `completed < total`
   - Use project boards to visualize hierarchy

5. **Validation Queries**: Regularly check for:
   - Orphaned issues (no parent when expected)
   - Improperly closed parents
   - Missing type assignments (type is null)
   - Broken hierarchy chains
   - Type/title prefix mismatches

### Validate Native Types Are Being Used

```bash
# Verification script: Ensure you're using native types correctly
# This checks if types are being retrieved from API vs inferred

# Example: Check a few known issues
for num in 3 102 108 120; do
  native_type=$(gh api repos/nagarro-digital/phoenix-frontend/issues/$num --jq '.type.name // "Not Set"')
  echo "Issue #$num native type: $native_type"
done

# Expected output:
# Issue #3 native type: Epic
# Issue #102 native type: Not Set
# Issue #108 native type: Chore
# Issue #120 native type: Epic

# Compare with title-based inference (WRONG METHOD - for demonstration only)
echo ""
echo "❌ WRONG: Title-based inference would incorrectly show:"
echo "Issue #3: Epic (if title contains 'Cross-Platform')"
echo "Issue #102: Feature (if title contains 'Framework')"
echo "Issue #108: Feature (if title contains 'Release')"
echo "Issue #120: Feature (if title contains 'Performance')"
```

### Find Issues with Missing Types

```bash
# Find all issues without native type assigned
gh api repos/{owner}/{repo}/issues --paginate --jq '.[] | select(.type == null) | {number, title, state}'

# Example output format:
# {"number":102,"title":"Command Guideline Framework","state":"OPEN"}

# Assign types to these issues:
gh api repos/{owner}/{repo}/issues/102 --method PATCH --field type="Epic"
```

## Error Handling

### Issue Not Found

- Verify issue number is correct
- Check repository access permissions
- May be deleted or moved to different repo

### Issue Type Not Available

- Issue types are configured at organization level
- Check available types: `gh api orgs/{org}/issue-types`
- Types must be enabled before use

### Project Board Access

- Projects may require additional permissions
- Organization projects need org-level access
- Fallback to manual web interface update

### Label/Milestone Permissions

- Requires write access to repository
- Some labels may be protected
- Fallback to comment requesting update

### Type Update Failures

- Ensure type name matches exactly (case-sensitive)
- Valid types: Task, Bug, Feature, Epic, Story, Chore
- Requires repository write permissions

## Philosophy Alignment

This memory follows Phoenix OS Fluidic SDLC principles:

- **Memory Abstraction**: Provides HOW for GitHub issue operations
- **Agent Discovery**: Agents find and read this memory autonomously
- **No Command Passing**: Commands do NOT pass this to agents
- **Tool Agnostic**: Patterns show Primary (gh CLI), Secondary (MCP), Fallback (API)
- **Explicit via Abstraction**: WHAT (create issue) is explicit, HOW comes from this memory

See: [Phoenix OS Philosophy](https://github.com/nagarro-digital/phoenix-os/wiki/Philosophy)
