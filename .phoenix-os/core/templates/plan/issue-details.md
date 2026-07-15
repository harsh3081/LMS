# Issue Output Template

This template defines the structured format for displaying GitHub issue details.

## Template Variables

- `{number}`: Issue number
- `{title}`: Issue title
- `{state}`: Issue state (OPEN/CLOSED)
- `{assignees}`: Comma-separated list of assignee logins
- `{labels}`: Comma-separated list of label names
- `{milestone}`: Milestone title (or "None")
- `{milestone_due}`: Milestone due date (or "N/A")
- `{created_at}`: ISO 8601 creation timestamp
- `{updated_at}`: ISO 8601 update timestamp
- `{author}`: Issue author login
- `{url}`: Issue URL
- `{body}`: Issue description/body
- `{sub_issues_count}`: Number of sub-issues
- `{sub_issues_list}`: Formatted list of sub-issues
- `{parent_issue}`: Parent issue reference (or "None")
- `{project_fields}`: Project-specific fields

## Output Format

```markdown
# Issue #{number}: {title}

**URL**: {url}
**Status**: {state}
**Author**: {author}
**Assignees**: {assignees}
**Labels**: {labels}
**Milestone**: {milestone} (Due: {milestone_due})
**Created**: {created_at}
**Updated**: {updated_at}

## Description

{body}

## Hierarchy

**Parent Issue**: {parent_issue}
**Sub-Issues**: {sub_issues_count} sub-issue(s)

{sub_issues_list}

## Project Information

{project_fields}
```

## Formatting Rules

### Assignees
- Empty: "None"
- Single: "@username"
- Multiple: "@user1, @user2, @user3"

### Labels
- Empty: "None"
- Single: "label1"
- Multiple: "label1, label2, label3"

### Milestone
- No milestone: "None (Due: N/A)"
- With milestone: "Milestone Title (Due: YYYY-MM-DD)"

### Sub-Issues List
- No sub-issues: "None"
- With sub-issues (hierarchical tree format):
  ```
  ├── #123 - Sub-issue title (OPEN)
  │   ├── #126 - Nested sub-issue (OPEN)
  │   └── #127 - Another nested sub-issue (CLOSED)
  ├── #124 - Another sub-issue (CLOSED)
  └── #125 - Third sub-issue (OPEN)
      └── #128 - Deeply nested sub-issue (OPEN)
  ```

### Parent Issue
- No parent: "None"
- With parent: "#456 - Parent issue title"

### Project Fields
- No project fields: "Not assigned to any project"
- With fields:
  ```
  **Project**: Project Name
  **Status**: In Progress
  **Priority**: High
  **Sprint**: Sprint 5
  ```

## Implementation Notes

1. **Variable Substitution**: Agent should replace all `{variable}` placeholders with actual values
2. **Optional Sections**: If data not available, use default values from formatting rules
3. **Markdown Formatting**: Preserve markdown syntax for proper rendering
4. **Line Breaks**: Use single blank line between sections for readability
5. **URL Formatting**: Use full GitHub URLs for clickable links
