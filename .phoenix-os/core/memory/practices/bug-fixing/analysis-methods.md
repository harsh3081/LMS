# Bug Analysis Methods

This document defines intent-driven techniques and methods for analyzing bugs and identifying root causes. Following Phoenix OS philosophy, each method focuses on **what** needs to be accomplished (intent) rather than **how** to accomplish it (implementation).

## Analysis Techniques

### 1. Stack Trace Analysis

**Intent**: Identify the code location where the error occurred and trace back to root cause

**Why**: Stack traces provide direct evidence of execution path leading to failure

**Outcome**: Specific file, line number, and function where error originated, plus calling chain

**When to Use**:
- Error messages include stack traces
- Exceptions or crashes with call stacks
- Runtime errors with execution context

**Context Factors**:
- Stack trace clarity (clear vs obfuscated)
- Framework complexity (simple vs deeply nested)
- Source map availability (production vs development)

**Analysis Approach**:
1. Read stack trace from bottom to top (oldest call to newest)
2. Identify the first frame in your code (ignore library/framework frames initially)
3. Examine the code at that location for null checks, type mismatches, or invalid states
4. Check function parameters and variable values leading to the error
5. Trace back through calling functions to find where invalid data originated

**Example Scenario**:
```
TypeError: Cannot read property 'email' of null
    at validateUserEmail (validator.ts:45)
    at SessionMiddleware.verify (session.ts:120)
    at processRequest (app.ts:89)
```

**Analysis Path**:
- Start at `validator.ts:45` where null is being accessed
- Examine where the user object comes from in that function
- Trace back to `session.ts:120` to see how user was retrieved
- Continue to `app.ts:89` to understand request context
- Identify why user object is null (missing session, invalid token, etc.)

**Implementation**: See `${config.memory.tools.debugging.stack-trace-reading}`

---

### 2. Diff Analysis

**Intent**: Identify code changes that introduced the bug by comparing working and broken versions

**Why**: Recent bugs are often caused by recent changes in code, dependencies, or configuration

**Outcome**: List of commits, changed files, and specific code modifications that correlate with bug appearance

**When to Use**:
- Bug appeared recently
- Known working version exists
- Regression after deployment or update
- Behavior changed unexpectedly

**Context Factors**:
- Repository history clarity (clear commits vs monolithic changes)
- Time window size (yesterday vs months ago)
- Change volume (few commits vs major refactor)
- Team size (single developer vs many contributors)

**Analysis Approach**:
1. Establish version boundary: last known working version → first broken version
2. Retrieve commit history in that range
3. Examine files changed in commits related to bug area
4. Look for:
   - New code that might have introduced the bug
   - Modified logic that changed behavior
   - Removed validations or checks
   - Changed dependencies or configurations
   - Refactored code affecting bug area

**What to Look For**:
- Logic changes in affected components
- Parameter changes to key functions
- Conditional branches added/removed
- Dependency version updates
- Configuration changes
- Database schema modifications

**Implementation**: See `${config.memory.tools.git.history-analysis}`

---

### 3. Binary Search (Bisection)

**Intent**: Systematically find the exact commit that introduced the bug through iterative testing

**Why**: When bug timing is unclear, binary search efficiently narrows down the culprit commit

**Outcome**: Specific commit hash and changes that introduced the bug

**When to Use**:
- Bug exists but unknown when it was introduced
- Large commit range to search
- Bug is consistently reproducible
- Testing each version is feasible

**Context Factors**:
- Commit history size (10 commits vs 1000 commits)
- Test speed (seconds vs hours per test)
- Bug reproducibility (always occurs vs intermittent)
- Build requirements (simple vs complex setup)

**Analysis Approach**:
1. Identify a known good version (bug doesn't exist)
2. Identify a known bad version (bug exists)
3. Start bisection process to check middle commit
4. Test the checked-out version for bug presence
5. Mark version as good or bad
6. Repeat until bug-introducing commit is found
7. Examine that specific commit's changes

**Time Complexity**: O(log n) where n is number of commits
- 100 commits: ~7 tests needed
- 1000 commits: ~10 tests needed

**Automation Opportunity**: If bug detection can be automated (test fails), bisection can run unattended

**Implementation**: See `${config.memory.tools.git.history-analysis}` (Binary Search section)

---

### 4. Rubber Duck Debugging

**Intent**: Articulate problem and logic step-by-step to reveal assumptions and logical errors

**Why**: Explaining forces systematic thinking and often reveals overlooked details or false assumptions

**Outcome**: Clarified understanding of problem, identification of logic errors or invalid assumptions

**When to Use**:
- Root cause is unclear after initial analysis
- Complex logic with multiple conditions
- Assumptions about behavior need validation
- Fresh perspective needed
- Team member unavailable for pair debugging

**Context Factors**:
- Problem complexity (simple vs intricate logic)
- Familiarity with code (own code vs inherited)
- Availability of colleague (pair debug vs solo)

**Analysis Approach**:
1. Prepare to explain the bug to someone (colleague, mentor, or rubber duck)
2. Describe what the code **should** do (expected behavior)
3. Describe what the code **actually** does (observed behavior)
4. Walk through the code step-by-step, line by line
5. Explain assumptions about state, inputs, and flow
6. Often reveals the issue during explanation

**Why It Works**:
- Forces explicit articulation of implicit assumptions
- Slows down thinking to catch overlooked details
- Shifts perspective from author to explainer
- Engages different cognitive processes

**Best Practices**:
- Don't skip "obvious" parts
- Explain assumptions explicitly
- Describe variable values at each step
- Question every conditional and branch

---

### 5. Logging and Tracing

**Intent**: Observe runtime execution flow and variable values to understand actual behavior

**Why**: Runtime inspection reveals what code actually does vs what we think it does

**Outcome**: Execution trace showing function calls, variable values, and decision paths taken

**When to Use**:
- Execution path is unclear
- Complex control flow with many branches
- Async operations with unclear timing
- Production debugging (breakpoints unavailable)
- State changes need tracking

**Context Factors**:
- Environment (development vs production)
- Logging infrastructure (available vs needs setup)
- Performance impact tolerance (local vs high-traffic)
- Log retention (ephemeral vs persisted)

**Analysis Approach**:
1. Identify critical execution points to observe
2. Add strategic logging statements at:
   - Function entry/exit points
   - Variable assignments in suspect areas
   - Conditional branch decisions
   - State changes
   - External call boundaries
3. Run code with logging enabled
4. Analyze log output for unexpected values or paths
5. Refine logging and repeat if needed

**What to Log**:
- Function entry with parameters
- Key variable values at decision points
- Branch decisions (which if/else taken)
- Loop iterations (especially early/late)
- Function exit with return values
- Timestamps for timing analysis

**Context Adaptations**:
- **Development**: Verbose logging acceptable
- **Production**: Minimal, performance-aware logging
- **Debugging Session**: Temporary detailed logs
- **Monitoring**: Permanent strategic logs

**Implementation**: See `${config.memory.tools.debugging.logging-patterns}`

---

### 6. Breakpoint Debugging

**Intent**: Pause execution and inspect runtime state in detail to understand exact behavior

**Why**: Direct observation of live execution state reveals issues invisible in static code

**Outcome**: Understanding of exact variable values, execution path, and state at moment of failure

**When to Use**:
- Detailed inspection of runtime state needed
- Complex logic with many variables
- Timing-sensitive code (step through carefully)
- Need to test multiple scenarios interactively

**Context Factors**:
- Environment (local vs remote vs production)
- Debugger availability (IDE, CLI, remote)
- Performance tolerance (can pause execution)
- System complexity (single process vs distributed)

**Analysis Approach**:
1. Set breakpoint at suspected location (or earlier in call chain)
2. Run code in debugger until breakpoint hits
3. Inspect current variable values and state
4. Step through execution:
   - **Step Over**: Execute current line, don't enter functions
   - **Step Into**: Enter function being called
   - **Step Out**: Execute rest of current function
   - **Continue**: Run until next breakpoint
5. Watch specific expressions for value changes
6. Identify where values become unexpected or logic diverges

**When Not Available**:
- **Production Systems**: Use logging instead
- **Remote Systems**: Use remote debugging protocol if available
- **Performance-Critical**: Use sampling or logging
- **No Debugger Access**: Fall back to logging and tracing

**Context Adaptations**:
- **IDE Available**: Use integrated debugger (VS Code, IntelliJ, etc.)
- **CLI Only**: Use language-specific CLI debuggers
- **Remote System**: Use remote debugging protocols
- **Production**: Avoid; use observability tools instead

**Implementation**: See `${config.memory.tools.debugging.breakpoint-debugging}`

---

### 7. Isolation Testing

**Intent**: Test suspected component independently to determine if issue is in component or integration

**Why**: Isolating variables helps distinguish component bugs from integration bugs

**Outcome**: Determination of whether bug is in component logic or in how components interact

**When to Use**:
- Bug involves multiple components or layers
- Unclear if issue is in component A, component B, or their interaction
- Complex system with many dependencies
- Need to narrow down scope

**Context Factors**:
- Component coupling (loosely coupled vs tightly integrated)
- Test infrastructure (unit tests exist vs need to create)
- Isolation feasibility (easy to isolate vs requires mocking)

**Analysis Approach**:
1. Identify suspected component or layer
2. Create isolated test environment
3. Provide known, controlled inputs
4. Execute component independently
5. Verify outputs match expectations
6. **If isolated component works**: Issue is in integration, input data, or surrounding context
7. **If isolated component fails**: Issue is in component's internal logic

**Isolation Techniques**:
- Unit tests with mock dependencies
- Standalone script calling component directly
- REPL/console session with component
- Minimal reproduction without full system

**Example Scenarios**:
- Test validator function with null input in isolation
- Test API client with mock server responses
- Test calculation logic with hardcoded inputs
- Test parser with known input strings

---

### 8. State Inspection

**Intent**: Track application state changes to find where state becomes invalid or unexpected

**Why**: Many bugs result from state being modified incorrectly or at wrong time

**Outcome**: Understanding of state lifecycle, identification of incorrect state transitions

**When to Use**:
- Bug relates to application state (user session, cache, database)
- Behavior changes over time or after specific actions
- State appears corrupted or inconsistent
- Stateful components involved

**Context Factors**:
- State complexity (simple variable vs complex object graph)
- State persistence (in-memory vs database)
- Concurrency (single-threaded vs multi-threaded/async)
- State visibility (easy to inspect vs opaque)

**Analysis Approach**:
1. Identify all places where relevant state is modified
2. Instrument state changes (logging, debugging, state snapshots)
3. Track state through user workflow or test scenario
4. Compare expected state vs actual state at each step
5. Identify where state diverges from expectations
6. Examine code that causes divergence

**Key Questions**:
- What is the initial state?
- What operations modify this state?
- Is state modified in unexpected places (side effects)?
- Are there concurrent modifications (race conditions)?
- Is state properly synchronized across components?
- Is state validation performed?

**State Types**:
- **UI State**: Form data, component state, view models
- **Session State**: User authentication, shopping cart
- **Application State**: Global stores, caches
- **Persistent State**: Database records, file system

---

### 9. Dependency Analysis

**Intent**: Determine if bug is caused by external dependency version, behavior, or incompatibility

**Why**: Bugs can be introduced by dependency updates, version mismatches, or dependency bugs

**Outcome**: Identification of problematic dependency and specific version causing issue

**When to Use**:
- Bug appeared after dependency update
- Behavior differs across environments with different dependency versions
- Error messages reference external library code
- Suspected bug in third-party code

**Context Factors**:
- Dependency management system (npm, pip, maven, etc.)
- Version locking (exact versions vs ranges)
- Environment differences (dev vs prod)
- Dependency complexity (direct vs transitive)

**Analysis Approach**:
1. Identify dependencies related to bug area
2. Check installed versions in affected environment
3. Review dependency changelogs between versions
4. Search dependency issue tracker for known issues
5. Test with different dependency versions
6. Create minimal reproduction without dependency (if possible)
7. If bug persists without dependency: not dependency issue
8. If bug disappears without dependency: dependency issue confirmed

**What to Check**:
- Direct dependency versions
- Transitive dependency versions (dependencies of dependencies)
- Peer dependency compatibility
- Breaking changes in changelogs
- Security advisories
- Known issues in bug tracker

**Implementation**: See `${config.memory.tools.dependencies.version-analysis}`

---

### 10. Timing and Race Condition Analysis

**Intent**: Identify timing-dependent bugs caused by async operations or concurrent access

**Why**: Race conditions and timing issues are intermittent and difficult to reproduce without systematic analysis

**Outcome**: Understanding of async operation timing, identification of race conditions or timing dependencies

**When to Use**:
- Bug is intermittent (sometimes occurs, sometimes doesn't)
- Bug timing-dependent (happens under load, specific timing)
- Async operations involved (promises, callbacks, events)
- Concurrent access to shared resources
- Bug frequency varies by environment or system speed

**Context Factors**:
- Concurrency model (single-threaded event loop vs multi-threaded)
- System load (affects timing)
- Network latency (affects async operations)
- Hardware speed (affects race condition windows)

**Analysis Approach**:
1. Identify all async operations in suspect code path
2. Map out order of operations and dependencies
3. Look for:
   - Missing `await` keywords (promises not awaited)
   - Callback execution before initialization
   - State read before update applied
   - Multiple operations modifying same resource
   - Unguarded access to shared state
4. Check for proper synchronization mechanisms
5. Add intentional delays to widen race condition windows
6. Use concurrency testing tools

**Common Issues**:
- Promise not awaited before using result
- Callback executed before initialization complete
- State read before async update applied
- Multiple async operations modifying same resource
- Event handler registered after event fired
- Timeout too short for operation to complete

**Detection Techniques**:
- Add artificial delays to expose races
- Increase system load to trigger timing issues
- Use debugging tools with async support
- Add logging with precise timestamps
- Test on different hardware/environments

**Example Detection**:
```javascript
// Add delay to expose potential race condition
await new Promise(resolve => setTimeout(resolve, 100));
// Does bug appear more frequently now?
```

---

### 11. Edge Case Testing

**Intent**: Test boundary conditions and edge cases to find where code fails to handle extremes

**Why**: Many bugs exist at boundaries (null, empty, min/max, special values)

**Outcome**: Discovery of unhandled edge cases, validation gaps, or boundary errors

**When to Use**:
- Always, as part of thorough bug analysis
- Input validation suspected
- Boundary conditions unclear
- Code lacks edge case handling

**Context Factors**:
- Input domain size (limited vs infinite possibilities)
- Validation coverage (comprehensive vs minimal)
- Error handling maturity (robust vs basic)

**Edge Cases to Test**:

**Null and Undefined**:
- What if required input is null?
- What if optional parameter is undefined?
- What if object property doesn't exist?

**Empty Collections**:
- What if array is empty?
- What if string is empty?
- What if object has no properties?

**Boundary Values**:
- What if number is at minimum value?
- What if number is at maximum value?
- What if string is 1 character (minimum)?
- What if string exceeds maximum length?

**Special Characters**:
- What if string contains quotes, apostrophes?
- What if string contains newlines or tabs?
- What if string contains unicode or emoji?
- What if string contains SQL/HTML special chars?

**Large Values**:
- What if input is very large (performance)?
- What if collection has thousands of items?
- What if number exceeds integer limits?

**Negative Values**:
- What if number is negative (when positive expected)?
- What if count/index is negative?

**Type Mismatches**:
- What if string provided instead of number?
- What if wrong object type provided?

**Analysis Approach**:
1. Identify inputs to suspect code
2. Generate edge case test inputs for each
3. Execute code with edge case inputs
4. Observe behavior (crashes, wrong results, exceptions)
5. Identify missing validation or error handling

---

### 12. Integration Point Analysis

**Intent**: Analyze interactions with external systems to find integration bugs

**Why**: Integration issues arise from contract mismatches, network problems, or external system changes

**Outcome**: Understanding of integration contract, identification of mismatch or communication failure

**When to Use**:
- Bug involves external systems (APIs, databases, services)
- Errors occur at system boundaries
- Integration recently changed or updated
- Behavior differs between environments

**Context Factors**:
- Integration complexity (REST API vs message queue vs database)
- Environment differences (dev vs staging vs production)
- Network reliability (local vs remote)
- External system control (owned vs third-party)

**Analysis Approach**:
1. Identify integration points involved in bug
2. Examine integration contract (API spec, schema, protocol)
3. Check each integration aspect:
   - **API Contracts**: Request/response format match
   - **Authentication**: Credentials valid and sent correctly
   - **Timeouts**: Adequate for operation duration
   - **Error Handling**: External errors properly caught and handled
   - **Data Format**: Data transformed correctly between systems
   - **Network**: Connectivity, latency, reliability
4. Test integration point directly (bypass application)
5. Compare direct test vs application behavior
6. Identify where actual behavior diverges from contract

**What to Verify**:
- Request format matches API spec
- Response format handled correctly
- Error responses handled gracefully
- Authentication tokens valid and refreshed
- Timeout values appropriate
- Retry logic implemented correctly
- Data serialization/deserialization correct
- Network connectivity stable

**Testing Techniques**:
- Test API endpoint directly (curl, Postman, etc.)
- Inspect network traffic (browser DevTools, Wireshark)
- Use API mocking to test error scenarios
- Compare API documentation vs actual behavior
- Test with different payload sizes
- Test error responses (4xx, 5xx)

**Implementation**: See `${config.memory.tools.integration.api-testing}`

---

## Analysis Workflow

Follow this systematic workflow for bug analysis. Note that durations are contextual and vary based on complexity, familiarity, and available tools.

### Phase 1: Reproduce Bug

**Intent**: Confirm bug existence and establish reliable reproduction steps

**Activities**:
- Follow reported reproduction steps
- Confirm bug occurs consistently
- Document exact steps, inputs, and environment
- Capture screenshots, logs, or error messages

**Context Factors Affecting Duration**:
- **Reproduction clarity**: Clear steps (5 min) vs vague report (30+ min)
- **Environment setup**: Already configured (immediate) vs requires setup (hours)
- **Bug consistency**: Always occurs (quick) vs intermittent (extended)
- **Access**: Direct access (quick) vs requires permissions (delayed)

**Typical Range**: 5 minutes to several hours

---

### Phase 2: Gather Context

**Intent**: Collect all available information about the bug and surrounding code

**Activities**:
- Read complete error messages and stack traces
- Review recent code changes (commits, PRs)
- Check related issues and bug reports
- Examine code in error location
- Review relevant documentation

**Context Factors Affecting Duration**:
- **Error clarity**: Clear stack trace (5 min) vs vague symptom (30+ min)
- **Code familiarity**: Known area (quick) vs unfamiliar codebase (extended)
- **Documentation**: Well-documented (quick) vs undocumented (slow)
- **History**: Recent change (quick) vs long-standing bug (slow)

**Typical Range**: 10 minutes to 1 hour

---

### Phase 3: Form Hypothesis

**Intent**: Develop testable theories about potential root causes

**Activities**:
- Analyze symptoms and context
- List 2-3 possible root causes
- Prioritize hypotheses by likelihood
- Consider both simple and complex explanations

**Context Factors Affecting Duration**:
- **Bug clarity**: Obvious cause (5 min) vs mysterious symptoms (30+ min)
- **Complexity**: Single component (quick) vs multi-system (extended)
- **Experience**: Seen before (quick) vs novel issue (slow)

**Typical Range**: 10 to 30 minutes

**Best Practices**:
- Start with simplest explanation (Occam's Razor)
- Consider recent changes first
- Don't fixate on first hypothesis
- Generate multiple competing hypotheses

---

### Phase 4: Test Hypothesis

**Intent**: Gather evidence to confirm or reject each hypothesis

**Activities**:
- Select appropriate analysis method(s) from techniques above
- Execute analysis method systematically
- Collect evidence for or against hypothesis
- Refine hypothesis based on evidence
- Reject or confirm hypothesis

**Context Factors Affecting Duration**:
- **Analysis method**: Quick inspection (15 min) vs bisect search (hours)
- **Test speed**: Fast tests (quick iterations) vs slow builds (extended)
- **Hypothesis count**: One obvious (quick) vs many possibilities (extended)
- **Evidence clarity**: Clear evidence (quick) vs ambiguous results (requires more testing)

**Typical Range**: 30 minutes to several hours

**When to Stop**:
- Hypothesis confirmed with clear evidence
- Hypothesis clearly contradicted by evidence
- Need to form new hypothesis with new information

---

### Phase 5: Verify Root Cause

**Intent**: Confirm identified root cause with definitive evidence

**Activities**:
- Validate that root cause explains all symptoms
- Ensure root cause is actual cause, not symptom of deeper issue
- Check for related issues with same root cause
- Confirm understanding is complete

**Context Factors Affecting Duration**:
- **Cause clarity**: Clear single cause (10 min) vs multiple contributing factors (45+ min)
- **Verification method**: Simple test (quick) vs complex validation (extended)

**Typical Range**: 15 to 45 minutes

**Verification Checklist**:
- ✅ Explains all observed symptoms
- ✅ Explains why bug occurs in specific scenarios
- ✅ Explains why bug doesn't occur in other scenarios
- ✅ Supported by concrete evidence
- ✅ Not just a symptom of deeper issue

---

### Phase 6: Document Root Cause Analysis

**Intent**: Create comprehensive RCA document for implementation and future reference

**Activities**:
- Write detailed root cause analysis
- Include all findings and evidence
- Specify exact fix needed
- Document analysis path taken

**Context Factors Affecting Duration**:
- **Complexity**: Simple bug (15 min) vs complex multi-factor issue (60+ min)
- **Documentation standards**: Basic summary (quick) vs detailed RCA (extended)
- **Evidence volume**: Little evidence (quick) vs extensive analysis trail (slow)

**Typical Range**: 20 to 60 minutes

**See**: `${config.memory.practices.bug-fixing.rca-guidelines}` for RCA documentation standards

---

### Total Analysis Time

**Context-Dependent Range**: 1 to 8+ hours

**Factors Affecting Total Duration**:
- Bug complexity (simple logic error vs distributed system race condition)
- Code familiarity (your code vs inherited legacy system)
- Tool availability (full dev environment vs limited access)
- Documentation quality (well-documented vs undocumented)
- Team availability (can ask questions vs solo investigation)
- Bug age (recent regression vs long-standing issue)

---

## Technique Selection Guide

Use this decision tree to select appropriate analysis techniques:

**If error message with stack trace exists**:
→ Start with **Stack Trace Analysis** (#1)

**If bug appeared recently**:
→ Use **Diff Analysis** (#2)

**If bug timing is unknown**:
→ Use **Binary Search** (#3)

**If execution path is unclear**:
→ Use **Logging and Tracing** (#5) or **Breakpoint Debugging** (#6)

**If bug is intermittent**:
→ Use **Timing and Race Condition Analysis** (#10)

**If external system involved**:
→ Use **Integration Point Analysis** (#12)

**If dependency recently updated**:
→ Use **Dependency Analysis** (#9)

**If multiple components involved**:
→ Use **Isolation Testing** (#7)

**If stateful application**:
→ Use **State Inspection** (#8)

**Always include**:
→ **Edge Case Testing** (#11)

**When stuck**:
→ Use **Rubber Duck Debugging** (#4)

---

## Common Pitfalls

### ❌ Jumping to Conclusions
**Problem**: Assuming you know the cause without evidence

**Solution**: Follow systematic analysis, gather evidence, test hypotheses

---

### ❌ Fixing Symptoms
**Problem**: Fixing error message or symptom without addressing root cause

**Solution**: Distinguish symptom from cause, fix the underlying issue

---

### ❌ Incomplete Analysis
**Problem**: Stopping at first plausible cause without verification

**Solution**: Verify root cause explains all symptoms, not just some

---

### ❌ Overcomplicating
**Problem**: Creating elaborate explanations when simple ones exist

**Solution**: Apply Occam's Razor - simplest explanation is usually correct

---

### ❌ Ignoring Edge Cases
**Problem**: Testing only happy path, missing boundary conditions

**Solution**: Always test edge cases (null, empty, boundaries, special values)

---

### ❌ Skipping Reproduction
**Problem**: Attempting analysis without reliable reproduction

**Solution**: Always reproduce first - can't fix what you can't reproduce

---

### ❌ Confirmation Bias
**Problem**: Seeking only evidence that confirms initial hypothesis

**Solution**: Actively look for evidence that contradicts hypothesis

---

## Context Adaptations

### Development Environment
- Full debugger access available
- Verbose logging acceptable
- Can modify code freely
- Fast iteration cycles

**Recommended Techniques**: Breakpoint Debugging, Logging, Isolation Testing

---

### Staging Environment
- Limited debugging capabilities
- Moderate logging acceptable
- Code changes require deployment
- Moderate iteration speed

**Recommended Techniques**: Logging, Stack Trace Analysis, Integration Point Analysis

---

### Production Environment
- No debugging access
- Minimal logging (performance critical)
- Cannot modify code without deployment
- Slow iteration cycles

**Recommended Techniques**: Stack Trace Analysis, Log Analysis, Dependency Analysis

**Constraints**:
- Avoid performance-impacting operations
- Cannot pause execution
- Limited instrumentation
- Use observability tools

---

### Time-Constrained Scenarios
- Quick fix needed
- Limited analysis time
- High-priority issue

**Strategy**:
1. Stack Trace Analysis (if available)
2. Diff Analysis (if recent)
3. Form quick hypothesis
4. Test hypothesis directly
5. Document findings even if incomplete

---

### Complex System Debugging
- Multiple services/components
- Distributed system
- Many integration points

**Strategy**:
1. Integration Point Analysis first
2. Isolation Testing to narrow scope
3. Divide-and-conquer approach
4. Rule out components systematically

---

## Tool and Platform Agnostic Approach

This document focuses on **intent and methodology** rather than specific tools. For tool-specific implementations:

- **Version Control**: See `${config.memory.tools.git}`
- **Debugging Tools**: See `${config.memory.tools.debugging}`
- **Dependency Management**: See `${config.memory.tools.dependencies}`
- **Integration Testing**: See `${config.memory.tools.integration}`
- **Logging Patterns**: See `${config.memory.tools.logging}`

**Phoenix OS Principle**: Define what needs to be done (intent), let tools and environment determine how it's done (implementation).

---

## See Also

- **RCA Guidelines**: `${config.memory.practices.bug-fixing.rca-guidelines}` - Root cause analysis documentation methodology
- **Testing Standards**: `${config.memory.practices.best-practices.testing}` - Testing best practices
- **Best Practices**: `${config.memory.practices.best-practices}` - General coding standards
- **Git Tools**: `${config.memory.tools.git}` - Version control operations
- **Debugging Tools**: `${config.memory.tools.debugging}` - Debugging techniques and tools
- **Memory Structure**: `${config.memory}` - Long-Term Memory organization

---

**Version**: 2.0.0
**Last Updated**: 2025-11-25
**Status**: Active
**Changes**: Refactored to follow Phoenix OS philosophy - intent-driven, tool-agnostic, context-aware
