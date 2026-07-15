# Epic Details Template

This template defines the structured format for epic issue creation and display.

## Template Variables

- `{epic_title}`: Epic title (with [Epic] prefix)
- `{problem_statement}`: What problem does this epic solve
- `{proposed_solution}`: High-level approach to solving the problem
- `{detailed_functionality_sections}`: Comprehensive detailed functionality organized by feature areas
- `{key_capabilities}`: Bulleted list of 3-5 main capabilities
- `{target_users}`: User personas and their use cases
- `{technical_approach}`: High-level architecture and technology choices
- `{dependencies}`: Required systems, data, or other epics
- `{success_metrics}`: How we measure success
- `{scope_size}`: T-shirt size (S/M/L/XL)
- `{estimated_features}`: Number of features/sub-issues (no minimum/maximum)
- `{priority}`: Business priority (High/Medium/Low)
- `{source}`: Source of epic (BRD name or "Chat Input")
- `{assignee}`: GitHub username (or "Unassigned")
- `{labels}`: Comma-separated list of labels

## Epic Issue Body Format

```markdown
# {epic_title}

## Problem Statement

{problem_statement}

## Proposed Solution

{proposed_solution}

## Detailed Functionality

{detailed_functionality_sections}

## Key Capabilities

{key_capabilities}

## Target Users

{target_users}

## Technical Approach

{technical_approach}

## Dependencies

{dependencies}

## Success Metrics

{success_metrics}

## Scope

**Size**: {scope_size}
**Estimated Features**: {estimated_features}
**Priority**: {priority}

## Source

{source}

---

*Created via /create-epic command*
```

## Formatting Rules

### Epic Title
- Format: `[Epic] {Domain}: {High-level Goal}`
- Examples:
  - `[Epic] Authentication: Secure Multi-Factor Login System`
  - `[Epic] Analytics: Real-time Performance Dashboard`
  - `[Epic] Integration: Multi-Provider Payment Gateway`

### Problem Statement
- 2-4 sentences describing current pain points
- Focus on "what" not "how"
- Example:
  ```
  Current authentication system lacks enterprise-grade security features.
  Users cannot enable multi-factor authentication, and password policies
  are insufficient for compliance requirements. This creates security
  risks and prevents enterprise adoption.
  ```

### Proposed Solution
- 2-3 sentences describing high-level approach
- Focus on capabilities, not implementation
- Example:
  ```
  Implement comprehensive authentication system with multiple security
  layers including MFA, strong password policies, and session management.
  Support both traditional login and social authentication providers.
  ```

### Detailed Functionality
- **CRITICAL**: This section must cover ALL aspects of functionalities to be implemented
- Organized by feature areas for clarity
- Each area includes:
  - Detailed description of functionalities
  - Specific behaviors and capabilities
  - Edge cases and special scenarios
- Format:
  ```
  **{Feature Area 1}**
  - Detailed functionality point 1
  - Detailed functionality point 2
  - Edge case handling
  - Special scenario considerations

  **{Feature Area 2}**
  - Complete description of capabilities
  - Specific implementation behaviors
  - All relevant details
  ```
- Example:
  ```
  **Password Authentication**
  - Users can register with email and password
  - Password complexity rules: min 12 chars, uppercase, lowercase, numbers, symbols
  - Password strength indicator during registration
  - Secure password hashing using bcrypt
  - Account lockout after 5 failed login attempts
  - Password expiration policy (configurable, default 90 days)
  - Password history to prevent reuse of last 5 passwords

  **Multi-Factor Authentication**
  - TOTP-based MFA using authenticator apps (Google Authenticator, Authy)
  - SMS-based OTP as fallback option
  - Backup codes generation (10 single-use codes)
  - MFA enrollment flow during first login or optional opt-in
  - Option to remember device for 30 days via secure cookie
  - Admin can enforce MFA for specific roles or all users
  - QR code display for easy authenticator app setup

  **Social Login Integration**
  - OAuth 2.0 integration with Google, Microsoft, GitHub
  - Account linking for existing users with email match
  - Profile data sync from social providers (name, email, avatar)
  - Graceful error handling if social provider unavailable
  - Option to disconnect social login and set password
  ```

### Key Capabilities
- Bulleted list of 3-5 main features/capabilities
- Each bullet is action-oriented
- Format:
  ```
  - Password-based authentication with complexity rules
  - Multi-factor authentication (TOTP, SMS)
  - Social login integration (Google, Microsoft)
  - Session management with auto-logout
  - Password reset and account recovery
  ```

### Target Users
- List of personas with specific use cases
- Format each as: `{Role}: {What they need}`
- Example:
  ```
  **Enterprise Users**: Need secure access to sensitive company data with
  compliance-approved authentication methods.

  **Administrators**: Need to manage user access, enforce security policies,
  and monitor authentication events for audit purposes.

  **End Users**: Need quick, seamless login experience with optional MFA
  for enhanced security without sacrificing usability.
  ```

### Technical Approach
- High-level architecture decisions
- Key technologies to be used
- Not detailed implementation
- Example:
  ```
  **Frontend**: React with NextAuth.js for authentication flows
  **Backend**: Node.js API with JWT token management
  **Database**: PostgreSQL for user credentials and session data
  **Security**: bcrypt for password hashing, TOTP for MFA
  **External**: OAuth providers for social login (Google, Microsoft)
  ```

### Dependencies
- External systems required
- Other epics that must be complete first
- Data or infrastructure needs
- Format:
  ```
  - User database schema and migration (must be complete first)
  - Email service for password reset and notifications
  - SMS provider for OTP delivery (Twilio or similar)
  - SSL certificates for secure authentication endpoints
  - Epic #XX: User Profile Management (for profile data access)
  ```
- If none: "None identified at this time"

### Success Metrics
- Measurable KPIs for epic success
- 3-5 specific metrics
- Example:
  ```
  - 100% of users can successfully authenticate via password + MFA
  - MFA adoption rate reaches 60% within 3 months
  - Password reset flow completes in under 2 minutes
  - Zero authentication-related security incidents
  - Support ticket volume for login issues decreases by 40%
  ```

### Scope
- **Size**: S/M/L/XL based on feature count and complexity
  - S: 1-3 features, low complexity
  - M: 4-7 features, moderate complexity
  - L: 8-12 features, high complexity
  - XL: 13+ features or extremely complex
  - Note: No minimum or maximum constraints - size based on logical assessment

- **Estimated Features**: Number of feature-level sub-issues (flexible count)
- **Priority**: High/Medium/Low based on business value

- Example:
  ```
  **Size**: Large (L)
  **Estimated Features**: 8
  **Priority**: High
  ```

### Source
- Where the epic originated from
- Examples:
  - `Generated from BRD: customer-support-platform.md`
  - `Chat Input: Product team workshop 2024-03-15`
  - `Strategic Initiative: Q2 2024 Roadmap`

### Assignee
- GitHub username without @ symbol
- If unassigned: "Unassigned"

### Labels
- Standard: `epic`
- Priority: `high-priority`, `medium-priority`, `low-priority`
- Domain: `authentication`, `analytics`, `integration`, etc.
- Tech: `react`, `nodejs`, `api`, etc.
- Example: `epic, high-priority, authentication, security`
- Note: `needs-grooming` label removed - grooming is now integrated into commands

## Epic Suggestion Display Format

When presenting epic suggestions to user for approval:

```markdown
## Epic Suggestion {number}: {epic_title}

**Priority**: {priority} | **Scope**: {scope_size} | **Features**: {estimated_features}

### Description
{2-3 sentence summary of problem and solution}

### Key Capabilities
{bulleted list of 3-5 capabilities}

### Detailed Functionality
{Comprehensive sections organized by feature areas}

### Target Users
{persona list with use cases}

### Technical Approach
{high-level tech stack}

### Dependencies
{dependencies or "None"}

### Success Metrics
{measurable KPIs}

---

Note: Epic will be created with comprehensive description. Features can be created separately using /create-feature command.
```

## Validation Checklist

Before creating epic, verify:
- [ ] Title follows `[Epic] Domain: Goal` format
- [ ] Problem statement is 2-4 sentences, clear and specific
- [ ] Proposed solution describes approach, not implementation
- [ ] **Detailed Functionality sections cover ALL aspects comprehensively**
- [ ] 3-5 key capabilities listed
- [ ] At least 1 target user persona with use case
- [ ] Technical approach includes high-level tech stack
- [ ] Dependencies listed or marked as "None"
- [ ] 3-5 success metrics defined
- [ ] Scope size assigned (S/M/L/XL) - no minimum/maximum constraints
- [ ] Priority assigned (High/Medium/Low)
- [ ] Source documented (BRD or Chat Input)
- [ ] Labels include at minimum: `epic`

## Complete Example

```markdown
# [Epic] Authentication: Secure Multi-Factor Login System

## Problem Statement

Current authentication system lacks enterprise-grade security features required
for compliance and enterprise adoption. Users cannot enable multi-factor
authentication, password policies are insufficient, and session management is
basic. This creates security risks and prevents the platform from being used
by enterprise customers with strict security requirements.

## Proposed Solution

Implement comprehensive authentication system with multiple security layers
including MFA, strong password policies, and secure session management. Support
both traditional password-based login and social authentication providers for
flexibility. Provide administrators with tools to enforce security policies and
monitor authentication events.

## Detailed Functionality

**Password Authentication**
- Users can register with email and password
- Password complexity rules: min 12 chars, uppercase, lowercase, numbers, symbols
- Password strength indicator during registration
- Secure password hashing using bcrypt with salt
- Account lockout after 5 failed login attempts (15-minute lockout)
- Password expiration policy (configurable, default 90 days)
- Password history to prevent reuse of last 5 passwords
- "Remember me" option with secure persistent tokens

**Multi-Factor Authentication**
- TOTP-based MFA using authenticator apps (Google Authenticator, Authy, 1Password)
- SMS-based OTP as fallback option
- Backup codes generation (10 single-use codes)
- MFA enrollment flow during first login or optional opt-in
- Option to remember device for 30 days via secure cookie
- Admin can enforce MFA for specific roles or all users
- QR code display for easy authenticator app setup
- Support for multiple MFA devices per user

**Social Login Integration**
- OAuth 2.0 integration with Google, Microsoft, GitHub
- Account linking for existing users with email match
- Profile data sync from social providers (name, email, avatar)
- Graceful error handling if social provider unavailable
- Option to disconnect social login and set password
- Auto-account creation on first social login
- Admin can enable/disable specific social providers

**Session Management**
- JWT-based session tokens with configurable expiration
- Refresh token rotation for enhanced security
- Concurrent session limit (configurable, default 5)
- View active sessions in user profile
- Ability to revoke individual sessions or all sessions
- Auto-logout on inactivity (configurable timeout)
- Session activity logging for audit

**Password Reset and Recovery**
- Email-based password reset with secure token
- Reset link expiration (configurable, default 1 hour)
- Security questions as additional recovery option
- Admin-initiated password reset capability
- Password reset notification emails
- Prevention of common password reset attacks

**Security and Audit**
- Failed login attempt logging
- Successful authentication event logging
- IP-based rate limiting
- Suspicious activity detection and alerting
- Admin dashboard for security events
- Export audit logs for compliance
- GDPR-compliant data handling

## Key Capabilities

- Password-based authentication with configurable complexity rules
- Multi-factor authentication using TOTP and SMS
- Social login integration (Google, Microsoft, GitHub)
- Secure session management with configurable timeouts and auto-logout
- Self-service password reset and account recovery workflows
- Admin dashboard for security policy management and audit logs

## Target Users

**Enterprise Users**: Need secure access to sensitive company data using
authentication methods that meet compliance requirements (SOC2, HIPAA, etc.).
Require seamless login experience with MFA option.

**System Administrators**: Need to enforce security policies across organization,
manage user access, monitor authentication events, and maintain audit logs for
compliance reporting.

**Individual Users**: Need quick, easy login with optional enhanced security.
Want ability to connect using existing Google/Microsoft accounts without
creating new passwords.

## Technical Approach

**Frontend**: Next.js with NextAuth.js for authentication flows and session management
**Backend**: Node.js Express API with JWT token generation and validation
**Database**: PostgreSQL for user credentials, sessions, and audit logs
**Security**: bcrypt for password hashing, TOTP libraries for MFA, rate limiting
**External Services**: OAuth providers (Google, Microsoft), Twilio for SMS OTP
**Infrastructure**: Redis for session store, SSL/TLS for all auth endpoints

## Dependencies

- User database schema design and migration (Epic #102)
- Email service integration for notifications (SendGrid or similar)
- SMS provider setup for OTP delivery (Twilio)
- SSL certificate configuration for production
- Admin dashboard framework (can be built in parallel)

## Success Metrics

- 100% of users can successfully authenticate using password + optional MFA
- MFA adoption rate reaches 60% within 3 months of launch
- Average password reset flow completes in under 90 seconds
- Zero critical authentication-related security incidents
- Login failure rate below 2% (excluding incorrect passwords)
- Support tickets for login issues decrease by 50%

## Scope

**Size**: Large (L)
**Estimated Features**: 8
**Priority**: High

## Source

Chat Input: Enterprise security requirements discussion

---

*Created via /create-epic command*
```

## Implementation Notes

1. **Variable Substitution**: Agent must replace all `{variable}` with actual values
2. **Markdown Formatting**: Preserve proper markdown for GitHub rendering
3. **Completeness**: Never skip sections - use "None" or "TBD" if data unavailable
4. **Consistency**: Use same format for all epics in a batch
5. **Validation**: Check all fields against validation checklist before creation

## See Also

- [epic-creation.md](../../practices/epic-management/epic-creation.md) - Epic creation workflow
- [issue-operations.md](../../tools/github/issue-operations.md) - GitHub issue operations
