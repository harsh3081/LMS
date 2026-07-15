# BRD Analysis and Epic Extraction

This document defines methods (HOW) for analyzing Business Requirement Documents (BRDs) and extracting epic-level information.

**Memory Type**: Long-term memory (LT) - Provides implementation patterns for agents.

**Role**: Agents read this memory to understand HOW to parse and analyze BRDs. Commands do NOT pass this to agents; agents discover and read it independently.

**Memory Path**: `${config.memory.practices.epic-management.brd-analysis}`

## BRD Document Types

### Supported Formats

- **Markdown (.md)**: Native support, best format
- **Text (.txt)**: Plain text, basic parsing
- **PDF (.pdf)**: Requires text extraction
- **Word (.docx)**: Requires conversion

### Format Detection

```bash
# Detect file type
file_type="${brd_path##*.}"

case "$file_type" in
  md) cat "$brd_path" ;;
  txt) cat "$brd_path" ;;
  pdf) pdftotext "$brd_path" - ;;
  docx) pandoc "$brd_path" -t markdown ;;
  *) echo "Unsupported format: $file_type" ;;
esac
```

## BRD Structure Analysis

### Standard BRD Sections

**Level 1 Headers (Must Have)**:

- Executive Summary / Overview
- Product Vision / Concept
- Target Users / Personas
- Features / Requirements
- Technical Requirements
- Success Criteria / KPIs

**Level 2 Headers (Optional)**:

- Dependencies
- Constraints
- Timeline
- Budget
- Risks
- Assumptions

### Section Extraction

**Markdown BRD**:

```bash
# Extract all headers
grep -E "^#+ " brd.md

# Extract specific section
awk '/^# Product Vision/,/^# [^#]/' brd.md

# Extract features section
awk '/^## Features/,/^## [^#]/' brd.md | grep -E "^- |^[0-9]+\."
```

**Structure Validation**:

```bash
# Check for required sections
required_sections=("Product Vision" "Target Users" "Features" "Technical")
for section in "${required_sections[@]}"; do
  if ! grep -qi "^#.*$section" brd.md; then
    echo "❌ Missing required section: $section"
    missing=true
  fi
done

if [ "$missing" = true ]; then
  echo "⚠️  BRD incomplete. Consider manual input mode."
fi
```

## Epic Extraction Logic

### 1. Identify Epic Candidates

**From Features Section**:

```bash
# Extract feature list
features=$(awk '/^## Features/,/^## [^#]/' brd.md | grep -E "^- |^[0-9]+\.")

# Group by domain/category
# Look for sub-headers like "### Authentication Features"
domains=$(awk '/^## Features/,/^## [^#]/' brd.md | grep -E "^### ")

# If domains exist, create one epic per domain
# If not, analyze feature similarity
```

**From Product Vision**:

```bash
# Extract vision statement
vision=$(awk '/^# Product Vision/,/^# [^#]/' brd.md)

# Identify key themes/domains from vision
# Common patterns: "authentication", "analytics", "integration", "reporting"
themes=$(echo "$vision" | grep -oiE "(auth|analytic|dashboard|integration|payment|report|user management)")
```

### 2. Feature Categorization

**Domain-Based Grouping**:

```yaml
# Example categorization
Authentication:
  - Login system
  - Multi-factor authentication
  - Password reset
  - Social login

Analytics:
  - Dashboard creation
  - Report generation
  - Data visualization
  - Export capabilities

Integration:
  - API connectivity
  - Third-party services
  - Webhooks
  - Data sync
```

**Grouping Algorithm**:

```
1. Extract all features from BRD
2. Identify domain keywords in each feature
3. Group features with same domain
4. If feature has multiple domains, assign to primary
5. Features without clear domain → "Core" or "General" epic
6. If total features < 5, create single epic
7. If total features > 20, consider splitting by user journey
```

### 3. Epic Metadata Extraction

**For Each Epic Domain**:

**Title Generation**:

```
Format: [Epic] {Domain}: {Goal from Vision}

Examples:
- Features: ["Login", "MFA", "SSO"]
  → [Epic] Authentication: Secure Multi-Factor Access System

- Features: ["Dashboard", "Reports", "Charts"]
  → [Epic] Analytics: Real-time Reporting Dashboard

- Features: ["Payment API", "Stripe", "PayPal"]
  → [Epic] Integration: Multi-Provider Payment Gateway
```

**Description Assembly**:

```markdown
# {Epic Title}

## Problem Statement

{Extract from "Challenges" or "Current State" section}

## Proposed Solution

{Extract from "Product Vision" + domain-specific features}

## Key Capabilities

{List features in this domain}

## Target Users

{Extract from "Target Users" section, filter relevant personas}

## Technical Approach

{Extract from "Technical Requirements" section}

## Dependencies

{Extract from "Dependencies" section}

## Success Metrics

{Extract from "Success Criteria" section, filter domain-relevant KPIs}
```

**Priority Assignment**:

```bash
# Extract priority indicators from BRD
high_priority_keywords="critical|must-have|required|essential|MVP"
medium_priority_keywords="should-have|important|desired"
low_priority_keywords="nice-to-have|optional|future|enhancement"

# Check feature descriptions for keywords
if echo "$features" | grep -qiE "$high_priority_keywords"; then
  priority="High"
elif echo "$features" | grep -qiE "$medium_priority_keywords"; then
  priority="Medium"
else
  priority="Low"
fi
```

**Scope Estimation**:

```
Feature Count → Scope:
- 1-3 features: Small (S)
- 4-7 features: Medium (M)
- 8-12 features: Large (L)
- 13+ features: Extra Large (XL)

Complexity Factors:
- External integrations: +1 size
- Real-time requirements: +1 size
- Complex algorithms: +1 size
- Multi-platform: +1 size
```

## Natural Language Processing

### Keyword Extraction

**Domain Keywords**:

```python
domain_keywords = {
    "authentication": ["login", "auth", "password", "mfa", "sso", "session", "token"],
    "analytics": ["dashboard", "report", "chart", "visualization", "metrics", "kpi"],
    "integration": ["api", "webhook", "third-party", "sync", "connect", "import", "export"],
    "payment": ["payment", "billing", "subscription", "invoice", "transaction", "checkout"],
    "user-management": ["user", "profile", "role", "permission", "access", "account"],
    "communication": ["email", "notification", "alert", "message", "chat"],
}

def categorize_feature(feature_text):
    scores = {}
    for domain, keywords in domain_keywords.items():
        score = sum(1 for kw in keywords if kw in feature_text.lower())
        scores[domain] = score
    return max(scores, key=scores.get) if max(scores.values()) > 0 else "general"
```

### User Persona Extraction

**From Target Users Section**:

```bash
# Extract persona definitions
personas=$(awk '/^## Target Users/,/^## [^#]/' brd.md | grep -E "^### |^- \*\*")

# Parse persona format:
# ### Enterprise Administrator
# - **Role**: System admin managing user access
# - **Needs**: Centralized user management, audit logs
# - **Pain Points**: Manual user provisioning

# Extract for each persona:
persona_name=$(echo "$persona" | grep "^###" | sed 's/### //')
persona_needs=$(echo "$persona" | grep "Needs:" | sed 's/.*Needs: //')
```

### Technical Stack Extraction

**From Technical Requirements**:

```bash
# Common tech stack patterns
frontend_keywords="react|vue|angular|nextjs|svelte"
backend_keywords="nodejs|express|nestjs|django|flask|rails|spring"
database_keywords="postgresql|mysql|mongodb|redis|elasticsearch"
cloud_keywords="aws|azure|gcp|kubernetes|docker"

# Extract tech mentions
tech_stack=$(awk '/^## Technical Requirements/,/^## [^#]/' brd.md)
frontend=$(echo "$tech_stack" | grep -oiE "$frontend_keywords" | head -1)
backend=$(echo "$tech_stack" | grep -oiE "$backend_keywords" | head -1)
database=$(echo "$tech_stack" | grep -oiE "$database_keywords" | head -1)

# Construct tech stack summary
echo "Frontend: ${frontend:-Not specified}"
echo "Backend: ${backend:-Not specified}"
echo "Database: ${database:-Not specified}"
```

## Manual Input Validation

When BRD is incomplete or unavailable, validate manual input:

### Required Fields Validation

```yaml
validation_rules:
  core_concept:
    min_length: 20
    required: true
    example: "A platform for managing customer support tickets with AI-powered suggestions"

  key_features:
    min_count: 1
    required: true
    each_min_length: 10
    note: "No minimum count - accept any number based on logical grouping"
    example:
      - "AI-powered ticket categorization and routing"
      - "Real-time collaboration workspace"
      - "Customer satisfaction tracking and analytics"

  target_users:
    min_count: 1
    required: true
    must_have: ["role", "use_case"]
    example:
      - role: "Support Agent"
        use_case: "Quickly resolve customer issues with AI assistance"

  tech_stack:
    required: true
    can_be_tbd: true
    example: "Next.js, Node.js, PostgreSQL, OpenAI API"

  assignee:
    required: false
    format: "github_username"

  labels:
    required: false
    type: "array"
```

### Interactive Prompts

```bash
# Collect core concept
read -p "📋 Core Concept (what is this product?): " core_concept
if [ ${#core_concept} -lt 20 ]; then
  echo "❌ Core concept too short. Please provide more detail (min 20 chars)."
  # Re-prompt
fi

# Collect features (at least 1 required)
features=()
echo "🎯 Key Features (at least 1 required):"
for i in {1..20}; do
  read -p "Feature $i (empty to finish): " feature
  [ -z "$feature" ] && break
  features+=("$feature")
done

if [ ${#features[@]} -lt 1 ]; then
  echo "❌ At least 1 feature required. Please add a feature."
  # Re-prompt
fi

# Collect target users
users=()
echo "👥 Target Users (minimum 1 required):"
while true; do
  read -p "User role: " role
  [ -z "$role" ] && break
  read -p "Use case for $role: " use_case
  users+=("$role: $use_case")
done

# Confirm tech stack
read -p "💻 Tech Stack (or 'TBD' if not decided): " tech_stack
```

## Epic Suggestion Quality Metrics

### Completeness Score

```
Required Fields Present: /8
- Title: ✅
- Description: ✅
- Problem Statement: ✅
- Key Capabilities: ✅
- Target Users: ✅
- Technical Approach: ⚠️ (partial)
- Dependencies: ❌
- Success Metrics: ✅

Score: 6/8 (75%) - Good quality
```

### Clarity Score

```
Description Quality:
- Length adequate: ✅ (>100 chars)
- Specific vs vague: ✅ (concrete terms used)
- Actionable: ✅ (clear what to build)

Features Quality:
- Count adequate: ✅ (5 features)
- Well-defined: ⚠️ (2/5 need more detail)
- Non-overlapping: ✅

Overall Clarity: 80% - Good
```

## Example BRD Processing

**Input BRD**:

```markdown
# Product Vision: Customer Support Platform

Build an AI-powered customer support platform for SaaS companies.

## Target Users

- **Support Agents**: Need to resolve tickets quickly
- **Team Leads**: Need to monitor team performance
- **Customers**: Need quick, accurate support

## Features

### Core Support Features

- Ticket creation and management
- AI-powered ticket categorization
- Smart ticket routing based on agent expertise
- Canned responses library

### Analytics Features

- Team performance dashboard
- Customer satisfaction tracking
- Response time analytics
- Ticket volume trends

### Integration Features

- Email integration (Gmail, Outlook)
- Slack integration for notifications
- Webhook support for custom integrations

## Technical Requirements

- Frontend: Next.js with TypeScript
- Backend: Node.js with Express
- Database: PostgreSQL
- AI: OpenAI API for categorization
```

**Processing Output**:

```yaml
extracted_epics:
  - title: "[Epic] Support Management: AI-Powered Ticket System"
    features:
      - Ticket creation and management
      - AI-powered ticket categorization
      - Smart ticket routing
      - Canned responses library
    target_users:
      - Support Agents
    priority: High
    scope: Medium (4 features)

  - title: "[Epic] Analytics: Performance and Satisfaction Tracking"
    features:
      - Team performance dashboard
      - Customer satisfaction tracking
      - Response time analytics
      - Ticket volume trends
    target_users:
      - Team Leads
    priority: Medium
    scope: Medium (4 features)

  - title: "[Epic] Integration: Multi-Channel Communication Hub"
    features:
      - Email integration
      - Slack integration
      - Webhook support
    target_users:
      - Support Agents
      - Customers
    priority: Medium
    scope: Small (3 features)

tech_stack:
  frontend: Next.js with TypeScript
  backend: Node.js with Express
  database: PostgreSQL
  ai: OpenAI API
```

## Philosophy Alignment

This memory follows Phoenix OS Fluidic SDLC principles:

- **Memory Abstraction**: Provides HOW for BRD parsing and analysis
- **Agent Discovery**: Agents find and read this memory autonomously
- **No Command Passing**: Commands do NOT pass this to agents
- **Explicit via Abstraction**: WHAT (parse BRD) is explicit, HOW comes from this memory

## See Also

- [epic-creation.md](./epic-creation.md) - Epic creation workflow
- [grooming.md](./grooming.md) - Epic grooming process
- [issue-operations.md](../../tools/github/issue-operations.md) - GitHub operations
- [Phoenix OS Philosophy](https://github.com/nagarro-digital/phoenix-os/wiki/Philosophy)
