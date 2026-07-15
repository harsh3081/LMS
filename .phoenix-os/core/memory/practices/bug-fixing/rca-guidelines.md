# Root Cause Analysis (RCA) Guidelines

This document defines the intent-driven methodology and guidelines for performing comprehensive Root Cause Analysis on bugs. Following Phoenix OS philosophy, it focuses on **what** needs to be accomplished in an RCA and **why**, with context-aware guidance that adapts to different scenarios.

## Overview

Root Cause Analysis (RCA) is a systematic process to identify the fundamental cause of a bug, not just its symptoms. A thorough RCA enables targeted fixes that address the underlying issue rather than superficial patches.

**Intent**: Determine the true cause of a bug to enable precise, lasting fixes

**Why**: Fixing symptoms without addressing root causes leads to recurring issues and technical debt

**Outcome**: Clear understanding of why the bug occurred, where it manifests, and what needs to change

---

## RCA Fundamental Questions

Every RCA must answer three fundamental questions with concrete, specific answers:

### 1. Why It Broke

**Intent**: Explain the underlying cause, not the visible symptom

**What to Include**:
- Root cause explanation (not "it crashes" but "why it crashes")
- Contributing factors that created conditions for the bug
- Chain of events or conditions leading to failure
- Underlying assumptions that proved incorrect

**Context Factors**:
- Simple bugs: Single clear cause
- Complex bugs: Multiple contributing factors
- Systemic issues: Pattern across multiple areas

---

### 2. Where It Broke

**Intent**: Pinpoint exact code locations requiring changes

**What to Include**:
- Specific file paths with line numbers
- Function or method names
- Exact line of code causing issue
- Current behavior vs expected behavior at that location

**Precision Levels**:
- **High**: Exact file, line, and expression identified
- **Medium**: File and function identified, specific line unclear
- **Low**: General area identified, requires more investigation

---

### 3. What Needs to Be Fixed

**Intent**: Specify concrete changes required to address root cause

**What to Include**:
- Exact files requiring modification
- Specific code changes (add/modify/remove)
- New validations or checks needed
- Implementation approach and considerations

**Fix Scope**:
- **Minimal**: Address root cause only, no refactoring
- **Moderate**: Root cause plus immediate related issues
- **Extensive**: Root cause plus preventive measures across codebase

---

## Analysis Methodology

### Phase 1: Context Gathering

**Intent**: Collect all available information to understand bug circumstances completely

**Why**: Insufficient context leads to incorrect root cause identification and wasted investigation time

**Outcome**: Complete picture of bug occurrence, environment, reproduction steps, and recent changes

**Information to Collect**:

**From Issue Report**:
- Issue description and title
- Reproduction steps (step-by-step)
- Expected vs actual behavior
- Screenshots or error messages
- Affected environment (OS, browser, Node version, etc.)

**From System**:
- Complete error messages and stack traces
- Log files from time of occurrence
- Console output (browser or server)
- Network requests/responses (if applicable)

**From Codebase**:
- Recent commits in affected area
- Related issues or PRs
- Code history for modified files
- Architecture diagrams or documentation

**Context Factors Affecting Gathering**:
- **Well-Documented Bug**: Complete info provided (5-10 min)
- **Vague Report**: Missing details, requires clarification (30+ min)
- **Production Bug**: Limited debugging access (extended investigation)
- **Intermittent Bug**: Difficult to reproduce (requires monitoring)

**Validation Checklist**:
- [ ] Can the bug be reproduced?
- [ ] Are error messages complete and legible?
- [ ] Is expected vs actual behavior clearly defined?
- [ ] Is environment information sufficient?
- [ ] Are reproduction steps detailed enough?

---

### Phase 2: Code Path Tracing

**Intent**: Follow execution flow from entry point to failure point to understand how bug manifests

**Why**: Understanding execution path reveals how code state evolves and where it diverges from expectations

**Outcome**: Complete trace of code execution with state at each step, identification of divergence point

**Tracing Approach**:

**1. Identify Entry Points**:
- Where does the failing operation begin?
- What user action or system event triggers it?
- Which API endpoint, function, or event handler is called first?

**2. Trace Execution Flow**:
- Follow code execution path step-by-step
- Identify all functions/methods involved
- Track data transformations and state changes
- Note where control flow branches (if/else, switch, loops)
- Document async operations and their timing

**3. Examine State at Each Step**:
- What are variable values at key points?
- Are there unexpected null/undefined values?
- Are data structures in expected format?
- Are function parameters what code expects?
- Is timing/order of operations as expected?

**4. Identify Divergence Point**:
- Where does actual behavior diverge from expected?
- What is the first incorrect state or value?
- What caused that state/value to be incorrect?

**Context Factors**:
- **Familiar Codebase**: Quick tracing (15-30 min)
- **Unfamiliar Code**: Slower tracing, requires reading (1-2 hours)
- **Simple Path**: Linear execution, easy to follow
- **Complex Path**: Multiple branches, async operations, harder to trace

**Tracing Methods**: See `${config.memory.practices.bug-fixing.analysis-methods}`
- Stack Trace Analysis (if error with stack trace)
- Logging and Tracing (add strategic logs)
- Breakpoint Debugging (step through execution)
- State Inspection (track state changes)

---

### Phase 3: Root Cause Identification

**Intent**: Determine the fundamental cause, not just the proximate trigger

**Why**: Fixing proximate causes without addressing root cause leads to recurring or morphing bugs

**Outcome**: Clear identification of underlying issue, validated with evidence

**Root Cause vs Symptom**:
- **Symptom**: "User login fails with 500 error"
- **Proximate Cause**: "Password validation throws exception"
- **Root Cause**: "Regex pattern doesn't escape special characters, causing regex compilation error"

**Common Root Cause Categories**:

---

#### 1. Logic Errors

**Intent**: Identify incorrect conditional logic, calculations, or algorithm implementation

**Characteristics**:
- Wrong operators (>, <, ==, !=, &&, ||)
- Off-by-one errors in loops or array indexing
- Inverted boolean logic (should be true but false)
- Incorrect calculations or formula
- Wrong order of operations

**Indicators**:
- Wrong results from calculations
- Unexpected code branches taken
- Loop iterations wrong count
- Array index out of bounds

**Typical Fix Approach**:
- Correct operators or conditions
- Fix boundary conditions (>= vs >)
- Invert boolean logic
- Correct calculation formula

**Examples**:
```javascript
// Bug: Off-by-one error
for (let i = 0; i <= array.length; i++) { // Should be i < array.length

// Bug: Wrong operator
if (count > 10) { // Should be count >= 10

// Bug: Inverted logic
if (!user.isActive) return processUser(user); // Should be if (user.isActive)
```

---

#### 2. Missing Validations

**Intent**: Identify absent checks that allow invalid data to cause failures

**Characteristics**:
- Null/undefined checks missing
- Type validations absent
- Range/boundary validations missing
- Input sanitization inadequate
- Format validations skipped

**Indicators**:
- TypeError: Cannot read property 'x' of null
- Unexpected data types causing errors
- Out-of-range values causing failures
- Malformed input breaking logic

**Typical Fix Approach**:
- Add null/undefined checks before access
- Add type validations (typeof, instanceof)
- Add range checks (min/max values)
- Add format validations (regex, parsing)
- Add input sanitization

**Examples**:
```javascript
// Bug: Missing null check
function getEmail(user) {
  return user.email; // Fails if user is null
}

// Fix: Add validation
function getEmail(user) {
  if (!user) return null;
  return user.email;
}

// Bug: Missing type check
function add(a, b) {
  return a + b; // String concatenation if a or b is string
}

// Fix: Add type validation
function add(a, b) {
  if (typeof a !== 'number' || typeof b !== 'number') {
    throw new TypeError('Arguments must be numbers');
  }
  return a + b;
}
```

---

#### 3. Incorrect Assumptions

**Intent**: Identify assumptions made by code that don't hold in all cases

**Characteristics**:
- Assuming data is always present
- Assuming specific data format without validation
- Assuming synchronous behavior when async
- Assuming user input is valid
- Assuming external system availability
- Assuming specific execution order

**Indicators**:
- Works in some scenarios, fails in others
- Works in tests, fails in production
- Works with sample data, fails with real data
- Timing-dependent failures

**Typical Fix Approach**:
- Make assumptions explicit (document or validate)
- Add checks for assumed conditions
- Handle cases where assumption doesn't hold
- Convert async code to properly handle promises

**Examples**:
```javascript
// Bug: Assumes data is present
const name = config.user.name; // Fails if config.user is undefined

// Fix: Check assumption
const name = config?.user?.name || 'Unknown';

// Bug: Assumes synchronous
const data = fetchData(); // fetchData() is async
processData(data); // data is Promise, not actual data

// Fix: Handle async properly
const data = await fetchData();
processData(data);
```

---

#### 4. Race Conditions

**Intent**: Identify timing-dependent bugs from concurrent access or async operations

**Characteristics**:
- Concurrent access to shared resources
- Async operations completing in unexpected order
- State changes between check and use (TOCTOU)
- Multiple operations modifying same data simultaneously
- Event handlers firing before initialization

**Indicators**:
- Bug is intermittent (sometimes occurs)
- More frequent under load
- Timing-dependent (happens in production, not dev)
- Different behavior on different hardware

**Typical Fix Approach**:
- Add proper synchronization (locks, mutexes)
- Use atomic operations
- Ensure proper async/await usage
- Add state flags to prevent concurrent modifications
- Use queue or serialization for operations

**Examples**:
```javascript
// Bug: TOCTOU (Time-of-Check-Time-of-Use)
if (cache.has(key)) {
  // Another thread might delete key here
  const value = cache.get(key); // Could be undefined
}

// Fix: Atomic check-and-get
const value = cache.get(key);
if (value !== undefined) {
  // Use value
}

// Bug: Multiple async operations racing
async function updateUser(userId) {
  const user = await getUser(userId);
  user.loginCount++;
  await saveUser(user); // Another request might have updated user
}

// Fix: Use atomic increment
async function updateUser(userId) {
  await incrementLoginCount(userId); // Atomic database operation
}
```

---

#### 5. Configuration Issues

**Intent**: Identify incorrect or missing configuration causing failures

**Characteristics**:
- Wrong environment variables
- Missing configuration values
- Version mismatches in dependencies
- Incorrect connection strings
- Wrong feature flags

**Indicators**:
- Works in one environment, fails in another
- Works locally, fails in staging/production
- Error messages about missing configuration
- Connection failures to external services

**Typical Fix Approach**:
- Add missing configuration
- Correct configuration values
- Update dependencies to compatible versions
- Add validation for required configuration
- Document configuration requirements

**Examples**:
```javascript
// Bug: Missing environment variable
const apiKey = process.env.API_KEY; // Undefined in production
api.authenticate(apiKey); // Fails

// Fix: Validate configuration at startup
if (!process.env.API_KEY) {
  throw new Error('API_KEY environment variable is required');
}
```

---

#### 6. Integration Problems

**Intent**: Identify issues in communication with external systems

**Characteristics**:
- API contract violations (wrong request/response format)
- Incorrect data format from external systems
- Network timeouts or failures
- Authentication/authorization issues
- Version mismatches in protocols

**Indicators**:
- Failures when calling external APIs
- Unexpected response formats
- Timeout errors
- Authentication errors
- Works with mock data, fails with real external system

**Typical Fix Approach**:
- Validate request format against API spec
- Add proper error handling for API failures
- Implement retry logic with backoff
- Add timeout handling
- Validate response format before use

**Analysis Method**: See `${config.memory.practices.bug-fixing.analysis-methods}` - Integration Point Analysis

---

### Phase 4: Impact Analysis

**Intent**: Understand the scope and severity of the bug to prioritize fix and assess risks

**Why**: Impact determines urgency, approach, and scope of fix; high-impact bugs require immediate attention

**Outcome**: Clear understanding of affected features, users, and severity level

**Scope Assessment**:

**Feature Impact**:
- Which features are affected?
- Is core functionality broken or edge case?
- Are there dependencies on affected code?
- Does it affect other code paths?

**User Impact**:
- How many users are affected?
- Which user segments (all, enterprise, free tier)?
- Is there a workaround available?
- What is user friction level?

**System Impact**:
- Does it cause data loss or corruption?
- Does it affect system stability?
- Are there security implications?
- Does it impact performance?

---

**Severity Assessment (Context-Aware)**:

Severity depends on multiple contextual factors, not just symptoms.

#### Critical Severity

**Conditions**:
- Data loss or corruption
- Security breach or vulnerability
- System crash or unavailability
- Affects core business functionality
- No workaround available

**Context Variations**:
- E-commerce: Checkout broken = Critical
- Internal tool: Rare edge case = Lower severity
- Enterprise: Affects key customer = Critical
- Free tier: Affects few users = Lower severity

**Response**: Immediate fix, hotfix deployment

---

#### High Severity

**Conditions**:
- Major feature broken
- No acceptable workaround
- Affects significant user base
- Blocks critical workflows
- Frequent occurrence

**Context Variations**:
- Production: High severity
- Staging only: Medium severity
- Affects 10% users: High severity
- Affects 0.1% users: Lower severity

**Response**: Fix in current sprint, prioritized

---

#### Medium Severity

**Conditions**:
- Feature partially broken
- Workaround exists (acceptable effort)
- Affects moderate user base
- Edge case but not rare
- Degrades experience but not blocking

**Context Variations**:
- Workaround is simple: Medium
- Workaround is complex/unknown to users: Higher
- Affects key customer workflow: Higher
- Affects non-critical feature: Medium

**Response**: Fix in next 1-2 sprints

---

#### Low Severity

**Conditions**:
- Minor inconvenience
- Rare edge case
- Easy workaround
- Cosmetic issues
- Minimal user impact

**Context Variations**:
- Rare edge case in non-critical feature: Low
- Rare but affects accessibility: Higher
- Cosmetic in key workflow: Medium
- Cosmetic in rarely-used feature: Low

**Response**: Fix when convenient, can be backlog

---

**Context Factors Affecting Severity**:
- **User Base**: Enterprise customers vs free tier users
- **Frequency**: Always occurs vs rare edge case
- **Workaround**: Easy vs complex vs none
- **Business Impact**: Revenue-affecting vs convenience
- **Environment**: Production vs staging
- **User Segment**: All users vs specific subset

---

### Phase 5: Fix Recommendation

**Intent**: Specify exact changes required to address root cause with minimal risk

**Why**: Clear fix recommendations enable efficient implementation and reduce back-and-forth

**Outcome**: Detailed specification of files, changes, and approach for fix

**Specification Requirements**:

**File-Level Specificity**:
- Exact file paths that need modification
- Line numbers (if known precisely)
- Functions or methods requiring changes

**Change-Level Specificity**:
- What code needs to be added
- What code needs to be modified
- What code needs to be removed
- What validations need to be introduced
- What error handling needs to be added

**Implementation Guidance**:
- Preferred approach and alternatives
- Potential side effects to watch for
- Related code that may need updates
- Performance considerations

---

**Fix Scope Principles**:

**Keep Fixes Minimal**:
- ✅ Address the root cause directly
- ✅ Add necessary validations
- ✅ Fix related issues in same area (if low risk)
- ❌ Avoid unnecessary refactoring
- ❌ Don't introduce new features
- ❌ Don't change unrelated code
- ❌ Maintain existing code patterns

**Consider Side Effects**:
- Will the fix affect other features?
- Are there performance implications?
- Does it require database migrations?
- Are there backward compatibility concerns?
- Does it change public APIs?
- Will tests need updating?

**Risk Assessment**:
- **Low Risk**: Isolated change, well-tested area
- **Medium Risk**: Affects multiple areas, moderate test coverage
- **High Risk**: Core functionality, limited tests, many dependencies

---

**Context-Aware Fix Strategies**:

**Simple Bug (Low Complexity)**:
- Direct fix at identified location
- Add validation if missing
- Minimal testing required

**Complex Bug (High Complexity)**:
- May require changes in multiple files
- Add comprehensive validations
- Extensive testing required
- Consider incremental rollout

**Systemic Issue (Pattern Across Codebase)**:
- Fix all occurrences of pattern
- Add linting rules to prevent recurrence
- Update documentation/standards
- Consider refactoring if warranted

---

### Phase 6: Test Coverage Requirements

**Intent**: Define test scenarios that verify fix and prevent regression

**Why**: Tests ensure fix works correctly and bug doesn't recur

**Outcome**: Specific test scenarios with assertions that fail before fix and pass after

**Required Test Types**:

**1. Bug Reproduction Test**:
- **Intent**: Verify fix addresses the specific bug
- **Requirement**: Test that reproduces the exact bug scenario
- **Behavior**:
  - Should fail before fix is applied
  - Should pass after fix is applied
- **Example**: If bug is "login fails with special characters in password", test should use special character password

**2. Edge Case Tests**:
- **Intent**: Verify fix handles boundary conditions
- **Coverage**:
  - Null/undefined inputs
  - Empty collections
  - Minimum/maximum values
  - Special characters
  - Large inputs
- **Example**: If fix validates email, test null, empty string, invalid format, very long email

**3. Regression Tests**:
- **Intent**: Ensure fix doesn't break existing functionality
- **Coverage**:
  - Related functionality in same area
  - Common user workflows
  - Integration with other features
- **Example**: If fix modifies authentication, test all auth flows (login, logout, token refresh)

**4. Integration Tests** (if applicable):
- **Intent**: Verify fix works with external systems
- **Coverage**:
  - API interactions
  - Database operations
  - Third-party service calls
- **Example**: If fix modifies API call, test with real/mocked external API

---

**Test Strategy by Complexity**:

**Simple Bug**:
- 1-2 unit tests (reproduction + edge case)
- Manual verification of fix

**Moderate Bug**:
- 3-5 unit tests (reproduction + multiple edge cases)
- Integration test if external dependencies involved
- Manual regression testing of related features

**Complex Bug**:
- Comprehensive unit test suite
- Multiple integration tests
- End-to-end tests for user workflows
- Performance tests if applicable
- Staged rollout with monitoring

---

## Confidence Levels

**Intent**: Communicate certainty in root cause identification to inform fix approach

**Why**: Confidence level determines whether to proceed with fix or investigate further

Assign a confidence level to your RCA based on evidence quality, reproducibility, and clarity of fix path.

---

### High Confidence (90-100%)

**Criteria**:
- Root cause clearly identified with strong evidence
- Can reproduce bug consistently (100% of time)
- Fix path is clear and straightforward
- Evidence directly links cause to effect
- No ambiguity about what needs to change

**Context Factors Supporting High Confidence**:
- Stack trace points to exact line
- Logs clearly show state leading to bug
- Code inspection reveals obvious error
- Fix is localized to single area
- Similar bugs fixed before

**Action**: Proceed with fix implementation

**Example**:
> "High confidence. Stack trace shows NullPointerException at line 45 in validator.ts. Code inspection confirms missing null check. Fix: Add null check before accessing property."

---

### Medium Confidence (60-89%)

**Criteria**:
- Root cause identified but requires validation
- Can reproduce bug frequently (50-90% of time)
- Fix approach needs testing to confirm effectiveness
- Evidence suggests cause but not conclusive
- Multiple possible causes narrowed to most likely

**Context Factors Affecting Confidence**:
- Intermittent bug (not always reproducible)
- Complex interaction between components
- Limited logging or debugging information
- Unfamiliar codebase area
- Fix requires changes in multiple places

**Action**: Implement fix with thorough testing, or investigate further before implementing

**Example**:
> "Medium confidence. Bug appears timing-related. Logs suggest race condition between two async operations. Fix approach: Add synchronization. Requires testing to confirm."

---

### Low Confidence (Below 60%)

**Criteria**:
- Multiple possible root causes
- Cannot consistently reproduce bug (< 50% of time)
- Evidence is indirect or circumstantial
- Requires more investigation or information
- Fix path is unclear

**Context Factors Lowering Confidence**:
- Bug is intermittent and rare
- Minimal logging or error information
- Production-only bug (can't reproduce locally)
- Multiple recent changes in affected area
- Complex distributed system interactions

**Action**: Continue investigation before implementing fix. Document hypotheses to test.

**Example**:
> "Low confidence. Bug occurs only in production, cannot reproduce locally. Possible causes: environment configuration difference, or load-related race condition. Recommend: Add detailed logging in production to gather more data."

---

**Context Factors Affecting Confidence**:

**Increase Confidence**:
- ✅ Clear stack trace with exact location
- ✅ Comprehensive logs showing execution path
- ✅ 100% reproducible
- ✅ Familiar codebase
- ✅ Good test coverage
- ✅ Simple, isolated bug

**Decrease Confidence**:
- ❌ Vague symptoms without clear error
- ❌ Limited or no logging
- ❌ Intermittent or rare bug
- ❌ Unfamiliar/legacy codebase
- ❌ No tests
- ❌ Complex, distributed system

---

## Context Adaptations

### Simple Bug (Low Complexity)

**Characteristics**:
- Single clear root cause
- Isolated to one file or function
- Easy to reproduce
- Obvious fix

**RCA Approach**:
- Concise RCA (1-2 paragraphs)
- Direct root cause statement
- Simple fix recommendation
- Minimal test coverage (1-2 tests)

**Time Investment**: 15-30 minutes for RCA

**Example**:
> Bug: Off-by-one error in loop causing array index out of bounds.
> Fix: Change `i <= array.length` to `i < array.length`.
> Test: Verify loop processes all elements without error.

---

### Complex Bug (High Complexity)

**Characteristics**:
- Multiple contributing factors
- Spans multiple files or components
- Difficult to reproduce
- Non-obvious fix requiring careful consideration

**RCA Approach**:
- Detailed RCA (2-3 pages)
- Explain each contributing factor
- Trace complete execution path
- Multiple fix recommendations with trade-offs
- Comprehensive test plan

**Time Investment**: 2-4 hours for RCA

**Example**:
> Bug: Race condition in distributed cache causing stale data reads.
> Contributing factors: No synchronization, eventual consistency model, high concurrency.
> Fix options: 1) Add locking (performance cost), 2) Use versioning (complexity), 3) Accept eventual consistency with retry logic (best trade-off).
> Detailed test plan with concurrency testing required.

---

### Intermittent Bug

**Characteristics**:
- Doesn't occur consistently
- Timing or load-dependent
- Hard to reproduce

**RCA Approach**:
- Focus on probabilistic analysis
- Document conditions that increase likelihood
- Consider race conditions and timing issues
- Recommend monitoring and logging to gather more data
- May start with "Medium" or "Low" confidence

**Additional Investigation**:
- Add detailed logging
- Increase test iterations
- Test under varying loads
- Analyze timing with profiling tools

**See**: `${config.memory.practices.bug-fixing.analysis-methods}` - Timing and Race Condition Analysis

---

### Production-Only Bug

**Characteristics**:
- Occurs in production but not in dev/staging
- Environment-specific

**RCA Approach**:
- Focus on environment differences
- Check configuration, data, scale, timing
- Document production-specific conditions
- Recommend staging environment improvements
- Fix may require gradual rollout with monitoring

**Investigation Constraints**:
- Limited debugging access
- Cannot pause execution
- Must rely on logging and monitoring
- May need to reproduce conditions in staging

---

### Legacy Codebase Bug

**Characteristics**:
- Unfamiliar code
- Limited documentation
- Possibly no tests
- Unclear original intent

**RCA Approach**:
- More time for code reading and understanding
- Lower initial confidence, increase as understanding grows
- Conservative fix recommendations (minimize changes)
- Recommend adding tests before fixing
- Document findings for future reference

**Additional Steps**:
- Use git blame to understand history
- Find and read related code
- Consult with original authors if available
- Add documentation as you learn

---

## Output Format

**Intent**: Standardize RCA documentation for consistency and completeness

RCA must follow the template at `${config.templates.bug.rca}`:

```markdown
# Root Cause Analysis

## Context
- **Issue**: #123
- **Title**: [Issue title]
- **Severity**: Critical/High/Medium/Low (with context)
- **Confidence**: High/Medium/Low

## Root Cause Analysis

### Why it broke

[Detailed explanation of the root cause - explain the underlying issue, not the symptom]

**Root Cause Category**: Logic Error / Missing Validation / Incorrect Assumption / Race Condition / Configuration Issue / Integration Problem

**Key factors**:
- **Factor 1**: [description]
- **Factor 2**: [description]

**Contributing conditions**:
- [Condition that enabled or triggered the bug]

---

### Where it broke

**File**: `path/to/file.ts:line-number`
- **Function**: `functionName`
- **Issue**: [specific issue at this location]
- **Current behavior**: [what the code does now]
- **Expected behavior**: [what the code should do]

[Repeat for additional locations if applicable]

---

### What needs to be fixed

#### Change 1: [Brief description]
- **File**: `path/to/file.ts`
- **Line**: 45
- **Action**: add / modify / remove
- **Details**: [Specific implementation details]
- **Code example** (if helpful):
  ```javascript
  // Before
  if (count > 10) {

  // After
  if (count >= 10) {
  ```

#### Change 2: [If applicable]
[Same structure as Change 1]

**Side Effects to Consider**:
- [Potential impact on other features]
- [Performance implications]
- [Backward compatibility concerns]

---

### Impact Analysis

**Scope**:
- **Features affected**: [List of features]
- **User impact**: [How many/which users]
- **Workaround**: [Available workaround, if any]

**Severity Justification**:
[Explain why this severity level was assigned, considering context]

---

### Test Coverage Required

#### 1. Bug Reproduction Test
- **Scenario**: [Exact scenario that triggers bug]
- **Type**: unit / integration / e2e
- **Assertion**: [What to verify]
- **Before fix**: Should fail
- **After fix**: Should pass

#### 2. Edge Case Tests
- **Scenario**: [Edge case to test]
- **Type**: unit
- **Assertion**: [What to verify]

#### 3. Regression Tests
- **Scenario**: [Related functionality to verify]
- **Type**: integration
- **Assertion**: [What to verify]

---

### Implementation Notes

**Fix Strategy**: Minimal / Moderate / Extensive

**Risk Level**: Low / Medium / High

**Considerations**:
- [Anything implementer should be aware of]
- [Performance considerations]
- [Alternative approaches considered]

---

### References

- Related issue: #xxx
- Related PR: #xxx
- Documentation: [link]
- External resources: [links]
```

---

## Quality Checklist

**Intent**: Ensure RCA completeness before marking as ready for implementation

Before completing RCA, verify:

**Root Cause**:
- [ ] Root cause clearly identified (not just symptoms)
- [ ] Explanation includes "why" not just "what"
- [ ] Contributing factors documented
- [ ] Category assigned (logic error, missing validation, etc.)

**Location**:
- [ ] Specific file paths and line numbers provided
- [ ] Function/method names included
- [ ] Current vs expected behavior documented

**Fix Recommendation**:
- [ ] Concrete fix recommendations with exact changes
- [ ] Each change has file, action (add/modify/remove), and details
- [ ] Side effects and risks considered
- [ ] Fix scope appropriate (minimal, moderate, extensive)

**Testing**:
- [ ] Bug reproduction test defined
- [ ] Edge case tests defined
- [ ] Regression test scenarios identified
- [ ] Test types specified (unit/integration/e2e)

**Context and Metadata**:
- [ ] Severity assigned with justification
- [ ] Confidence level assigned
- [ ] Impact and scope assessed
- [ ] Related issues or PRs referenced

**Quality**:
- [ ] Code examples included where helpful
- [ ] Clear and readable (someone else can understand)
- [ ] No ambiguous statements
- [ ] Professional tone

---

## Anti-Patterns to Avoid

### ❌ Anti-Pattern 1: Treating Symptoms, Not Root Cause

**Bad Example**:
```markdown
## Why it broke
The login fails.
```

**Problem**: Describes symptom, not cause

**✅ Correct Example**:
```markdown
## Why it broke
The login fails because the password validation logic incorrectly
rejects valid passwords containing special characters. The regex
pattern `/^[a-zA-Z0-9]+$/` used for validation does not include
special characters, causing `test()` to return false for passwords
like "P@ssw0rd!". This violates the password policy which explicitly
allows special characters.

**Root Cause Category**: Missing Validation (regex pattern incomplete)

**Key factors**:
- Regex pattern doesn't match documented password policy
- No test coverage for special character passwords
- Password policy documentation wasn't consulted during implementation
```

---

### ❌ Anti-Pattern 2: Vague Location

**Bad Example**:
```markdown
## Where it broke
Somewhere in the authentication code.
```

**Problem**: Not specific enough for implementation

**✅ Correct Example**:
```markdown
## Where it broke
**File**: `src/auth/validator.ts:45`
- **Function**: `validatePassword(password: string): boolean`
- **Issue**: Regex pattern `/^[a-zA-Z0-9]+$/` excludes special characters
- **Current behavior**: Returns false for passwords with special characters
- **Expected behavior**: Returns true for valid passwords including special characters (!@#$%^&*)
```

---

### ❌ Anti-Pattern 3: Generic Fix Recommendation

**Bad Example**:
```markdown
## What needs to be fixed
Fix the password validation.
```

**Problem**: Implementer doesn't know exactly what to change

**✅ Correct Example**:
```markdown
## What needs to be fixed

#### Change 1: Update password validation regex
- **File**: `src/auth/validator.ts`
- **Line**: 45
- **Action**: modify
- **Details**: Change regex pattern to include special characters allowed by password policy
- **Code example**:
  ```typescript
  // Before
  const passwordRegex = /^[a-zA-Z0-9]+$/;

  // After
  const passwordRegex = /^[a-zA-Z0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]+$/;
  ```

#### Change 2: Add validation for password policy compliance
- **File**: `src/auth/validator.ts`
- **Line**: 42
- **Action**: add
- **Details**: Add comment referencing password policy document
- **Code example**:
  ```typescript
  // Password policy: https://docs.internal/password-policy
  // Must be 8+ chars, include upper, lower, number, special char
  ```
```

---

### ❌ Anti-Pattern 4: Incomplete Impact Analysis

**Bad Example**:
```markdown
## Impact
This is a high severity bug.
```

**Problem**: No justification or context

**✅ Correct Example**:
```markdown
## Impact Analysis

**Scope**:
- **Features affected**: User registration, password reset, password change
- **User impact**: All new users attempting to register with special characters in password (estimated 30% based on password requirements)
- **Workaround**: Users must use passwords without special characters (not acceptable per security policy)

**Severity**: High

**Severity Justification**:
- Blocks user registration for 30% of new users (high user impact)
- No acceptable workaround (security policy requires special characters)
- Affects core functionality (authentication)
- However, not Critical because: existing users unaffected, no data loss, no security breach
```

---

### ❌ Anti-Pattern 5: No Test Scenarios

**Bad Example**:
```markdown
## Test Coverage Required
Add tests for password validation.
```

**Problem**: Not specific enough for test implementation

**✅ Correct Example**:
```markdown
## Test Coverage Required

#### 1. Bug Reproduction Test
- **Scenario**: Validate password with special characters
- **Type**: unit
- **Input**: "P@ssw0rd!123"
- **Assertion**: `validatePassword("P@ssw0rd!123")` returns `true`
- **Before fix**: Returns false (test fails)
- **After fix**: Returns true (test passes)

#### 2. Edge Case Tests
- **Scenario 1**: Password with all allowed special characters
  - **Input**: "Abc123!@#$%^&*()"
  - **Assertion**: Returns true

- **Scenario 2**: Password without special characters (still valid)
  - **Input**: "Password123"
  - **Assertion**: Returns true

- **Scenario 3**: Empty password
  - **Input**: ""
  - **Assertion**: Returns false

#### 3. Regression Tests
- **Scenario**: Verify registration flow with special char password
  - **Type**: integration
  - **Steps**:
    1. Navigate to registration page
    2. Enter email, password "Test@123", confirm password
    3. Submit form
  - **Assertion**: User successfully registered and redirected to dashboard
```

---

## Decision Trees

### When to Proceed with Fix vs Investigate Further

```
Is confidence level High?
├─ YES → Proceed with fix implementation
└─ NO → Can confidence be increased?
    ├─ YES → Continue investigation
    │   └─ What would increase confidence?
    │       ├─ More reproduction attempts
    │       ├─ Additional logging
    │       ├─ Code review with team
    │       └─ Testing hypothesis with temporary fix
    └─ NO → Document hypotheses, implement with extensive testing and monitoring
```

---

### How Much Test Coverage?

```
What is bug severity?
├─ Critical/High
│   ├─ Comprehensive test suite required
│   ├─ Bug reproduction test
│   ├─ Multiple edge case tests
│   ├─ Integration tests
│   ├─ End-to-end test for user workflow
│   └─ Consider staged rollout with monitoring
│
├─ Medium
│   ├─ Good test coverage required
│   ├─ Bug reproduction test
│   ├─ Key edge case tests
│   ├─ Integration test if external dependencies
│   └─ Manual regression testing
│
└─ Low
    ├─ Basic test coverage
    ├─ Bug reproduction test
    ├─ One or two edge case tests
    └─ Manual verification
```

---

### Fix Scope Decision

```
Is bug isolated to single function?
├─ YES → Minimal fix (single file, focused change)
└─ NO → Is it same issue repeated in multiple places?
    ├─ YES → Are they similar enough to fix together?
    │   ├─ YES → Moderate fix (fix all occurrences)
    │   └─ NO → Minimal fix now, file separate issues for others
    └─ NO → Is it a systemic issue/pattern?
        ├─ YES → Consider extensive fix with refactoring
        │   └─ Balance: Risk vs benefit vs timeline
        └─ NO → Moderate fix (related areas only)
```

---

## See Also

- **Templates**: `${config.templates.bug.rca}` - RCA output template
- **Analysis Methods**: `${config.memory.practices.bug-fixing.analysis-methods}` - Techniques for identifying root causes
- **Best Practices**: `${config.memory.practices.best-practices}` - Coding standards and quality guidelines
- **Testing Standards**: `${config.memory.practices.best-practices.testing}` - Testing methodologies and coverage requirements
- **Memory Structure**: `${config.memory}` - Long-Term Memory organization

---

**Version**: 2.0.0
**Last Updated**: 2025-11-25
**Status**: Active
**Changes**: Comprehensive refactor to follow Phoenix OS philosophy - intent-driven, context-aware, with detailed guidance for various scenarios
