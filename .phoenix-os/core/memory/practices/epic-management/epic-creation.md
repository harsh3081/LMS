# Epic Creation Best Practices

This document defines the implementation methods (HOW) for creating epics from Business Requirement Documents (BRDs) or manual product ideas in Phoenix OS.

**Memory Type**: Long-term memory (LT) - Provides implementation patterns for agents.

**Role**: Agents read this memory to understand HOW to execute epic creation operations. Commands do NOT pass this to agents; agents discover and read it independently.

## Overview

Epic creation is a strategic planning operation that transforms high-level product ideas into structured GitHub epics with proper hierarchy, metadata, and traceability.

## Core Principles

1. **Evidence-Based**: Epics must be derived from concrete inputs (BRD or chat input)
2. **User Approval**: Never create epics without explicit user confirmation
3. **Native Types**: Always use GitHub's native issue type system (type="Epic")
4. **Hierarchical**: Support epic → feature → story → task breakdown
5. **Comprehensive Descriptions**: Epic descriptions must cover ALL aspects of functionalities to be implemented
6. **Epics Only**: /create-epic creates only epic issues, not feature sub-issues

## Epic Definition Criteria

An Epic must have:

- **Core Concept**: Clear purpose and problem statement
- **Key Features**: Features with descriptions (no minimum count required)
- **Target Users**: At least 1 user segment with use cases
- **Tech Stack**: Confirmed or documented technology choices (or "TBD")
- **Success Metrics**: High-level measurable KPIs
- **Dependencies**: Known dependencies or constraints
- **Detailed Functionality**: Comprehensive description organized by feature areas covering all aspects

## Input Sources

### 1. Business Requirement Document (BRD)

**Required BRD Sections**:

- Executive Summary
- Product Vision/Concept
- Target Users/Personas
- Key Features (minimum 3)
- Technical Requirements
- Success Criteria
- Dependencies/Constraints

**BRD Processing**:

```bash
# Extract BRD content (support multiple formats)
# Formats: .md, .txt, .pdf, .docx
cat path/to/brd.md

# Analyze structure
grep -E "^#|^##" path/to/brd.md  # Extract headers
```

### 2. Chat Input (Interactive)

**Support Both Modes**:

- **Structured Prompts**: Ask for each field if missing
- **Free-Form Conversation**: Parse intelligently from narrative text

**Required Information**:

1. **Core Concept** (required): Product idea and purpose
2. **Key Features** (required): Feature names and descriptions (no minimum count)
3. **Target Users** (required, min 1): User segments with use cases
4. **Tech Stack** (required): Technology choices or "TBD"
5. **Assignee** (optional): GitHub username
6. **Labels** (optional): Custom labels or auto-suggested

**Validation Rules**:

- Core concept: Non-empty, min 20 characters
- Features: At least one feature with description (min 10 chars)
- Target users: Minimum 1 persona with use case
- Tech stack: Must be specified or marked as "TBD"

## Epic Suggestion Workflow

### 1. Information Gathering

**From BRD**:

- Parse document structure
- Extract vision, features, users, tech requirements
- Identify dependencies and constraints
- Map to epic template fields

**From Chat Input**:

- Support both structured prompts AND free-form conversation
- If user provides narrative text, parse intelligently
- Ask specific follow-up questions only if critical info missing
- Validate completeness before proceeding
- Store in structured format for processing

### 2. Epic Analysis

**Feature Categorization**:

- Group related features into logical epics
- Consider scope (single epic vs multiple epics)
- Identify dependencies between epics
- Prioritize by business value

**Epic Breakdown Logic**:

```
IF features coherent and single domain:
  → Single Epic
ELSE IF features can be grouped by domain:
  → Multiple Domain Epics (one per domain)
ELSE:
  → Split by user journey or technical layer

Note: No minimum or maximum feature count constraint
Generate as many epics as needed based on logical grouping
```

**Naming Convention**:

- Format: `[Epic] {Domain/Category}: {High-level Goal}`
- Examples:
  - `[Epic] Authentication: Secure Multi-Factor Login System`
  - `[Epic] Dashboard: Real-time Analytics and Reporting`
  - `[Epic] Integration: Third-party Payment Gateway`

### 3. Epic Suggestion Generation

**For Each Suggested Epic, Provide**:

- **Title**: Following naming convention
- **Description** (COMPREHENSIVE and DETAILED):
  - Problem statement
  - Proposed solution
  - Key capabilities (3-5 items)
  - **Detailed Functionality** sections organized by feature areas
    - Specific behaviors and capabilities
    - Edge cases and special scenarios
    - Complete coverage of ALL aspects
  - Success metrics
- **Target Users**: Personas who benefit
- **Technical Approach**: High-level architecture/tech choices
- **Dependencies**: Other epics or external systems
- **Estimated Scope**: T-shirt sizing (S/M/L/XL)
- **Priority**: Business priority (High/Medium/Low)

**Note**: Epic descriptions must be first-level comprehensive. Do NOT create feature sub-issues automatically.

**Example Suggestion Format**:

```markdown
## Epic Suggestion 1: [Epic] User Authentication: Multi-Factor Security

**Description**:
Problem: Current system lacks secure authentication for enterprise users.
Solution: Implement comprehensive multi-factor authentication system.

Key Capabilities:

- Password-based login with complexity rules
- Multi-factor authentication (TOTP, SMS)
- Social login integration (Google, Microsoft)
- Session management and auto-logout
- Password reset and account recovery

**Detailed Functionality**:

**Password Authentication**

- Users can register with email and password
- Password complexity rules: min 12 chars, uppercase, lowercase, numbers, symbols
- Password strength indicator during registration
- Secure password hashing using bcrypt
- Account lockout after 5 failed login attempts
- Password expiration policy (configurable)

**Multi-Factor Authentication**

- TOTP-based MFA using authenticator apps (Google Authenticator, Authy)
- SMS-based OTP as fallback option
- Backup codes for account recovery
- MFA enrollment flow during first login
- Option to remember device for 30 days
- Admin can enforce MFA for specific roles

**Social Login Integration**

- OAuth integration with Google, Microsoft, GitHub
- Account linking for existing users
- Profile data sync from social providers
- Graceful fallback if social provider unavailable

... (continued with complete coverage)

**Target Users**:

- Enterprise Users: Need secure access to sensitive data
- Administrators: Need to manage user access and security policies

**Technical Approach**:

- Frontend: React with NextAuth.js
- Backend: Node.js with JWT tokens
- Database: PostgreSQL for user data
- MFA: TOTP (Time-based One-Time Password)

**Dependencies**:

- User database schema design
- Email service for notifications
- SMS provider for OTP delivery

**Scope**: Large (L)
**Priority**: High
```

### 4. User Review and Approval

**Present to User**:

1. Summary of all suggested epics (count, titles)
2. Full details for each epic
3. Dependency graph if applicable
4. Total estimated scope

**User Actions**:

- **Approve All**: Create all suggested epics
- **Approve Selected**: Create only chosen epics
- **Request Changes**: Modify specific epics
  - Change title, description, features
  - Merge or split epics
  - Adjust priority or scope
- **Decline All**: Cancel operation

**Interactive Review Process**:

```
Presenting 3 suggested epics:

1. [Epic] User Authentication: Multi-Factor Security (High Priority, L)
2. [Epic] Dashboard: Analytics and Reporting (Medium Priority, M)
3. [Epic] Integration: Payment Gateway (High Priority, M)

Actions:
- Type "approve" to create all epics
- Type "approve 1,3" to create selected epics
- Type "edit 2" to modify epic 2
- Type "decline" to cancel
```

## Epic Creation Process

### 1. Label Management

**Check Existing Labels**:

```bash
# List all repository labels
gh label list --json name,description

# Check if specific labels exist
gh label list --json name --jq '.[] | select(.name == "epic")'
```

**Create Labels if Needed**:

```bash
# Standard epic labels
gh label create "epic" --description "Epic-level initiative" --color "8B5CF6"
gh label create "high-priority" --description "High business priority" --color "DC2626"
gh label create "medium-priority" --description "Medium business priority" --color "F59E0B"
gh label create "low-priority" --description "Low business priority" --color "10B981"
```

**Auto-Label Mapping**:

- All epics: `epic`
- By priority: `high-priority`, `medium-priority`, `low-priority`
- By tech stack: Auto-create tech labels (e.g., `react`, `nextjs`, `nodejs`)
- Custom: User-provided labels

**Note**: `needs-grooming` label removed - grooming is now integrated into commands

### 2. Epic Issue Creation

**Create Epic with Metadata**:

```bash
# Create epic issue
epic_number=$(gh issue create \
  --title "{epic_title}" \
  --body "{epic_description}" \
  --label "epic,{priority_label}" \
  --assignee "{assignee}" \
  --json number -q '.number')

# Set native issue type
gh api repos/{owner}/{repo}/issues/$epic_number \
  --method PATCH \
  --field type="Epic"

# Add to project board (if configured)
gh issue edit $epic_number --add-project "{project_name}"

echo "Created Epic #$epic_number"
```

**Epic Description Template**:

```markdown
# {Epic Title}

## Problem Statement

{What problem does this epic solve?}

## Proposed Solution

{High-level approach to solving the problem}

## Detailed Functionality

{Detailed functionality sections organized by feature areas}

**{Feature Area 1}**

- Detailed description of functionalities in this area
- Specific behaviors and capabilities
- Edge cases and special scenarios

**{Feature Area 2}**

- Detailed description of functionalities
- Complete coverage of all aspects
  ...

## Key Capabilities

{Bulleted list of 3-5 main capabilities}

## Target Users

{User personas and their use cases}

## Technical Approach

{High-level architecture and technology choices}

## Dependencies

{Required systems, data, or other epics}

## Success Metrics

{How we measure success}

## Scope

Size: {S/M/L/XL}
Priority: {High/Medium/Low}

## Source

{Generated from BRD: {brd_name} OR Chat Input}

---

_Created via /create-epic command_
```

### 3. Feature Creation (Separate Command)

**After Epic Creation**:

- Epics are created with comprehensive, detailed descriptions
- Feature sub-issues are NOT created automatically
- User can create features using separate command: `/create-feature {epic_number}`
- Feature creation command will:
  - Analyze epic's detailed functionality sections
  - Suggest feature breakdown
  - Create feature issues under epic
  - Set proper hierarchy and types

**Feature Creation Workflow**:

```bash
# Use separate command to create features from epic
/create-feature {epic_number}

# This command will:
# 1. Retrieve epic details
# 2. Analyze detailed functionality
# 3. Suggest features with comprehensive descriptions
# 4. Get user approval
# 5. Create features with proper linking
```

**Grooming Integration**:

- Grooming is now integrated into all hierarchy commands
- `/create-epic` creates epics with comprehensive descriptions
- `/create-feature` uses grooming-keeper internally to create features
- `/create-story` uses grooming-keeper internally to create stories
- No separate grooming command needed

## Summary Report

**After All Epics Created**:

```markdown
✅ Epic Creation Complete

Created {count} epic(s) with comprehensive descriptions:

1. Epic #{number1}: {title1}

   - URL: https://github.com/{owner}/{repo}/issues/{number1}
   - Priority: {priority1}
   - Scope: {scope1}
   - Assignee: {assignee1}

2. Epic #{number2}: {title2}
   - URL: https://github.com/{owner}/{repo}/issues/{number2}
   - Priority: {priority2}
   - Scope: {scope2}
   - Assignee: {assignee2}

Labels Applied: {labels_list}
Project Board: {project_name} (if applicable)

## Next Steps

1. Review epics in GitHub:

   - Epic #{number1}: https://github.com/{owner}/{repo}/issues/{number1}
   - Epic #{number2}: https://github.com/{owner}/{repo}/issues/{number2}

2. Create features for these epics:

   - /create-feature {number1}
   - /create-feature {number2}

3. Start planning:
   - /fetch-issue {number1}
```

## Error Handling

### Invalid BRD Format

- Error: "Unable to parse BRD. Please provide valid format (.md, .txt, .pdf, .docx)"
- Fallback: Prompt for manual input

### Incomplete Chat Input

- Error: "Incomplete input. Missing required information."
- Prompt: Interactive prompt for missing field
- Note: No minimum feature count - at least 1 feature required

### Label Creation Failure

- Warning: "Unable to create label '{label_name}'. Using existing labels only."
- Continue: Proceed with available labels

### Project Board Not Found

- Warning: "Project '{project_name}' not found. Epic created without project assignment."
- Continue: Epic created, manual project assignment needed

### Duplicate Epic Detection

- Check: Search for similar titles before creation
- Warning: "Similar epic exists: #{number} - {title}. Continue? (y/n)"
- Action: User confirms or cancels

## Best Practices

1. **Start Small**: Create epics incrementally, not all at once
2. **Validate Early**: Check BRD quality before processing
3. **User Engagement**: Always involve user in epic definition
4. **Traceability**: Link epics back to source (BRD or chat input)
5. **Consistent Format**: Use templates for consistency
6. **Native Types**: Always set GitHub native type="Epic"
7. **Labels**: Use meaningful, searchable labels
8. **Dependencies**: Document epic dependencies clearly
9. **Scope Control**: Keep epics focused and achievable
10. **Comprehensive Descriptions**: Ensure ALL aspects of functionalities are covered in epic descriptions
11. **Chat Input Flexibility**: Support both structured prompts AND free-form conversation
12. **No Feature Constraints**: Accept any number of features based on logical grouping
13. **Separate Breakdown**: Use /create-feature after epic creation for feature breakdown

## Philosophy Alignment

This memory follows Phoenix OS Fluidic SDLC principles:

- **Memory Abstraction**: Provides HOW for agents to execute
- **Agent Discovery**: Agents find and read this memory autonomously
- **No Command Passing**: Commands do NOT pass this to agents
- **Tool Agnostic**: Patterns work with gh CLI, MCP, or API

**Memory Path**: `${config.memory.practices.epic-management.epic-creation}`

## See Also

- [issue-operations.md](../../tools/github/issue-operations.md) - GitHub issue operations
- [grooming.md](./grooming.md) - Epic grooming workflow
- [estimation.md](../../team/estimation.md) - Epic estimation guidelines
- [Phoenix OS Philosophy](https://github.com/nagarro-digital/phoenix-os/wiki/Philosophy)
