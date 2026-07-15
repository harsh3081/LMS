# GitHub Pull Request Operations

This document defines the implementation methods for GitHub PR operations in Phoenix OS.

## Listing Pull Requests

### Primary Method: GitHub CLI
```bash
# List all open PRs (for general listing)
gh pr list --state open --json number,title,author,isDraft,reviewDecision,createdAt,headRefName \
  --jq '.[] | select(.isDraft == false) | {number, title, author: .author.login, reviewDecision, created: .createdAt, branch: .headRefName}'

# List PRs that need review (excluding approved or in-review)
gh pr list --state open --json number,title,author,isDraft,reviewDecision,createdAt,headRefName,reviewRequests \
  --jq '.[] | select(.isDraft == false and .reviewDecision != "APPROVED" and (.reviewRequests | length) == 0) | {number, title, author: .author.login, reviewDecision, created: .createdAt, branch: .headRefName}'
```

### Secondary Method: MCP GitHub Server
```javascript
mcp__github__list_pull_requests({
  owner: "{owner}",
  repo: "{repo}",
  state: "open"
})
// Then filter draft PRs programmatically
```

### Fallback Method: Direct API
```bash
curl -H "Authorization: token $GITHUB_TOKEN" \
  "https://api.github.com/repos/{owner}/{repo}/pulls?state=open" \
  | jq '.[] | select(.draft == false)'
```

## Creating Pull Request Reviews

### Primary Method: GitHub CLI
#### Approval
```bash
gh pr review {pr-number} --approve --body "{comment}"
gh pr comment {pr-number} -b "@{author} This PR has been approved! ✅"
```

#### Request Changes
```bash
gh pr review {pr-number} --request-changes --body "{reasons}"
gh pr comment {pr-number} -b "@{author} This PR needs changes. {specifics}"
```

### Secondary Method: MCP GitHub Server
```javascript
// Approval
mcp__github__create_pull_request_review({
  owner: "{owner}",
  repo: "{repo}",
  pull_number: {pr-number},
  event: "APPROVE",
  body: "{comment}"
})

// Request Changes
mcp__github__create_pull_request_review({
  owner: "{owner}",
  repo: "{repo}",
  pull_number: {pr-number},
  event: "REQUEST_CHANGES",
  body: "{reasons}"
})
```

## Analyzing PR Changes

### Primary Method: Git and GitHub CLI
```bash
# Get diff statistics
git diff --stat main...HEAD

# List changed files
git diff --name-status main...HEAD

# Show commits
git log --oneline main..HEAD

# View detailed diff
gh pr diff {pr-number}
```

### Secondary Method: MCP GitHub Server
```javascript
// Get file list
mcp__github__get_pull_request_files({
  owner: "{owner}",
  repo: "{repo}",
  pull_number: {pr-number}
})

// Get PR details
mcp__github__get_pull_request({
  owner: "{owner}",
  repo: "{repo}",
  pull_number: {pr-number}
})
```

## Getting PR Details

### Primary Method: GitHub CLI
```bash
gh pr view {pr-number} --json state,title,author,body,reviews,reviewDecision,mergeable
```

### Secondary Method: MCP GitHub Server
```javascript
mcp__github__get_pull_request({
  owner: "{owner}",
  repo: "{repo}",
  pull_number: {pr-number}
})
```

## Error Handling Patterns

### Authentication Failures
- **CLI**: Check `gh auth status`
- **MCP**: Verify server connection
- **API**: Validate token in environment

### Rate Limiting
- **CLI**: Usually handled automatically with auth
- **API**: Check `X-RateLimit-Remaining` header
- **Recovery**: Wait or authenticate to increase limits

### Network Issues
- **Retry Strategy**: Exponential backoff
- **Timeout**: 30 seconds for most operations
- **Fallback**: Offline mode with cached data if available