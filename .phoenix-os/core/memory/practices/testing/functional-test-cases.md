# Functional Test Case Practices

This document defines the implementation methods (HOW) for generating functional test cases from user stories in Phoenix OS.

**Memory Type**: Long-term memory (LT) - Provides implementation patterns for agents.

**Role**: Agents read this memory to understand HOW to generate functional test cases. Commands do NOT pass this to agents; agents discover and read it independently.

**Memory Path**: `${config.memory.practices.testing.functional-test-cases}`

## Overview

Functional test cases validate that software meets its specified requirements. In Phoenix OS, functional test cases are derived directly from user story acceptance criteria to ensure complete traceability and coverage.

## Test Case Generation Philosophy

### Traceability-First

Every functional test case MUST trace back to a specific acceptance criterion:

- **AC-{n}**: Acceptance Criterion identifier
- **TC-{story}-{seq}**: Test Case identifier
- **Mapping**: Each AC should have at least 1 positive + 1 negative test case

### Coverage Completeness

Test coverage should address:

1. **Positive Scenarios**: Happy path - expected behavior with valid input
2. **Negative Scenarios**: Error handling - invalid input, missing data
3. **Edge Cases**: Boundary conditions - limits, empty states, max values
4. **Alternative Flows**: Different paths through the same functionality

### Derivation from Acceptance Criteria

**Acceptance Criterion Example**:

```
AC-1: User can successfully login with valid email and password
```

**Derived Test Cases**:
| Test Case | Type | Scenario |
|-----------|------|----------|
| TC-45-1 | Positive | Login with valid email and password |
| TC-45-2 | Negative | Login with invalid email format |
| TC-45-3 | Negative | Login with incorrect password |
| TC-45-4 | Negative | Login with non-existent email |
| TC-45-5 | Edge | Login with email at max length (255 chars) |
| TC-45-6 | Edge | Login with minimum password length |

## Test Case Structure

### Standard Test Case Format

```markdown
### TC-{story_number}-{sequence}: {Descriptive Title}

**Traceability**: AC-{criterion_number}
**Priority**: {High|Medium|Low}
**Type**: {Positive|Negative|Edge|Alternative}
**Category**: {Functional|Validation|UI|Integration|Security}

**Preconditions**:

- {precondition_1}
- {precondition_2}

**Test Steps**:

1. {action_step_1}
2. {action_step_2}
3. {action_step_3}

**Expected Results**:

- {verifiable_outcome_1}
- {verifiable_outcome_2}

**Test Data**:
| Field | Valid Value | Invalid Value | Edge Value |
|-------|-------------|---------------|------------|
| {field_name} | {valid_example} | {invalid_example} | {boundary_example} |

**Notes**:

- {any_special_considerations}
```

### Field Definitions

**Traceability**:

- Links to acceptance criterion being tested
- Format: `AC-{number}` or `AC-{number}.{sub}`
- Required for every test case

**Priority**:

- **High**: Critical path, blocking functionality
- **Medium**: Important feature, business-critical
- **Low**: Nice-to-have, cosmetic, minor scenarios

**Type**:

- **Positive**: Valid input, expected happy path
- **Negative**: Invalid input, error conditions
- **Edge**: Boundary conditions, limits
- **Alternative**: Different valid paths to same goal

**Category**:

- **Functional**: Core business logic validation
- **Validation**: Input validation, form validation
- **UI**: User interface behavior, layout, responsiveness
- **Integration**: Component interaction, API integration
- **Security**: Authentication, authorization, data protection

## Test Case Naming Convention

### Format

```
TC-{story_number}-{sequence}: {Feature} - {Scenario}
```

### Examples

```
TC-45-1: Login - Valid credentials
TC-45-2: Login - Invalid email format
TC-45-3: Login - Incorrect password
TC-45-4: Registration - Email already exists
TC-45-5: Profile - Update with empty required field
```

### Naming Rules

1. **Story Number**: Always include the parent story number
2. **Sequence**: Sequential within the story (1, 2, 3...)
3. **Feature**: Short feature name from story
4. **Scenario**: Brief description of what is being tested
5. **Clarity**: Name should be self-explanatory

## Acceptance Criteria Analysis

### Keywords to Test Case Mapping

| Keyword | Test Type       | Description                         |
| ------- | --------------- | ----------------------------------- |
| MUST    | High Priority   | Required functionality, always test |
| SHALL   | High Priority   | Mandatory behavior, critical tests  |
| SHOULD  | Medium Priority | Expected behavior, important tests  |
| CAN     | Low Priority    | Optional capability, good to test   |
| WHEN    | Positive        | Trigger condition, test the trigger |
| THEN    | Expected        | Outcome to verify                   |
| GIVEN   | Precondition    | Setup state before testing          |
| IF      | Conditional     | Branch, test both paths             |
| UNLESS  | Exception       | Edge case, test the exception       |
| ERROR   | Negative        | Error handling, test failure path   |
| VALID   | Positive        | Successful case                     |
| INVALID | Negative        | Failure case                        |

### Extraction Pattern

1. **Read acceptance criterion**
2. **Identify keywords**
3. **Extract subject** (what is being tested)
4. **Extract action** (what user/system does)
5. **Extract outcome** (expected result)
6. **Generate positive test** (keyword = positive)
7. **Generate negative test** (opposite condition)
8. **Identify boundaries** (generate edge cases)

## Coverage Matrix

### Purpose

The coverage matrix ensures all acceptance criteria have adequate test coverage.

### Format

```markdown
## Coverage Matrix

| AC # | Acceptance Criterion | Test Cases                | Types Covered | Status      |
| ---- | -------------------- | ------------------------- | ------------- | ----------- |
| AC-1 | {criterion_text}     | TC-45-1, TC-45-2, TC-45-3 | P, N, E       | Complete    |
| AC-2 | {criterion_text}     | TC-45-4, TC-45-5          | P, N          | Partial     |
| AC-3 | {criterion_text}     | -                         | -             | Not Started |

**Legend**: P=Positive, N=Negative, E=Edge, A=Alternative
```

### Coverage Requirements

- **Minimum**: 1 Positive + 1 Negative per AC
- **Recommended**: 1 Positive + 2 Negative + 1 Edge per AC
- **Complete**: All types covered where applicable

## Test Data Management

### Test Data Table

```markdown
## Test Data

### User Data

| Field    | Valid         | Invalid                  | Edge       | Empty |
| -------- | ------------- | ------------------------ | ---------- | ----- |
| Email    | user@test.com | invalid-email            | a@b.c      | ""    |
| Password | Password123!  | 123                      | "a" \* 128 | ""    |
| Name     | John Doe      | <script>alert()</script> | "A" \* 255 | ""    |

### Business Data

| Field    | Valid  | Invalid | Edge            | Empty |
| -------- | ------ | ------- | --------------- | ----- |
| Amount   | 100.00 | -50     | 0.01, 999999.99 | null  |
| Quantity | 5      | -1      | 0, 1000         | null  |
```

### Data Categories

1. **Valid Data**: Normal, expected input values
2. **Invalid Data**: Clearly wrong input (format, type)
3. **Edge Data**: Boundary values (min, max, limits)
4. **Empty Data**: Null, empty string, whitespace
5. **Special Data**: Special characters, unicode, scripts (XSS)

## Test Case Templates by Category

### Functional Test Template

```markdown
### TC-{n}: {Feature} - Core Functionality

**Traceability**: AC-{n}
**Priority**: High
**Type**: Positive
**Category**: Functional

**Preconditions**:

- User is authenticated
- Required data exists in system

**Test Steps**:

1. Navigate to {feature_page}
2. Perform {core_action}
3. Submit/confirm action

**Expected Results**:

- Action completes successfully
- System state updated correctly
- User receives confirmation
```

### Validation Test Template

```markdown
### TC-{n}: {Feature} - Input Validation

**Traceability**: AC-{n}
**Priority**: Medium
**Type**: Negative
**Category**: Validation

**Preconditions**:

- Form/input is accessible

**Test Steps**:

1. Navigate to {input_location}
2. Enter invalid value: {invalid_value}
3. Attempt to submit

**Expected Results**:

- Validation error displayed
- Specific error message shown: "{expected_message}"
- Form not submitted
- User can correct and retry
```

### Integration Test Template

```markdown
### TC-{n}: {Feature} - Integration with {External_System}

**Traceability**: AC-{n}
**Priority**: High
**Type**: Positive
**Category**: Integration

**Preconditions**:

- {External_System} is available
- API credentials configured

**Test Steps**:

1. Trigger {integration_action}
2. Verify data sent to external system
3. Verify response handling

**Expected Results**:

- Data successfully transmitted
- External system acknowledges
- Local state updated with response
```

### Security Test Template

```markdown
### TC-{n}: {Feature} - Authorization Check

**Traceability**: AC-{n}
**Priority**: High
**Type**: Negative
**Category**: Security

**Preconditions**:

- User authenticated with {restricted_role}

**Test Steps**:

1. Attempt to access {protected_resource}
2. Attempt to perform {restricted_action}

**Expected Results**:

- Access denied (HTTP 403 or equivalent)
- No data exposed
- Action blocked
- Audit log entry created
```

## Output Formats

### Markdown Document Format

Save to: `${config.specs.base-path}{story-number}/functional-tests.md`

```markdown
# Functional Test Cases: Story #{number}

## Story Information

**Issue**: #{number}
**Title**: {title}
**User Story**: As a {role}, I want {feature}, so that {benefit}
**Generated**: {ISO_timestamp}
**Total Test Cases**: {count}

## Summary

| Metric           | Value |
| ---------------- | ----- |
| Total Test Cases | {n}   |
| Positive Tests   | {n}   |
| Negative Tests   | {n}   |
| Edge Cases       | {n}   |
| Coverage         | {%}   |

## Test Cases

### Group 1: {Functional Area}

{test_cases}

### Group 2: {Functional Area}

{test_cases}

## Coverage Matrix

{coverage_matrix}

## Test Data

{test_data_tables}

## Execution Checklist

- [ ] TC-{n}-1: {title} - {status}
- [ ] TC-{n}-2: {title} - {status}
      ...

## Execution Log

| TC #     | Executed | Result | Notes | Date |
| -------- | -------- | ------ | ----- | ---- |
| TC-{n}-1 | [ ]      | -      | -     | -    |
```

### GitHub Issue Format

When creating test cases as GitHub Task issues:

**Title**: `[Test] TC-{story_number}-{seq}: {title}`

**Body**:

```markdown
## Test Case Information

**Story**: #{story_number}
**Traceability**: AC-{n}
**Priority**: {priority}
**Type**: {type}
**Category**: {category}

## Preconditions

- {precondition_1}
- {precondition_2}

## Test Steps

1. {step_1}
2. {step_2}
3. {step_3}

## Expected Results

- [ ] {expected_result_1}
- [ ] {expected_result_2}

## Test Data

{test_data_table}

## Execution

**Status**: Not Started
**Executed By**: -
**Execution Date**: -
**Result**: -
**Notes**: -
```

**Labels**: `test`, `functional-test`, `TC-{story_number}`

**Type**: Set native type="Task"

**Linking**: Add as sub-issue of parent story

## Quality Criteria

### Test Case Quality Checklist

- [ ] **Traceability**: Links to acceptance criterion
- [ ] **Clarity**: Steps are unambiguous
- [ ] **Completeness**: All AC covered
- [ ] **Independence**: Can run standalone
- [ ] **Repeatability**: Same result each execution
- [ ] **Verifiable**: Clear pass/fail criteria
- [ ] **Prioritized**: Critical tests marked High
- [ ] **Data**: Test data defined

### Coverage Quality

- [ ] Every AC has at least 2 test cases
- [ ] Positive scenarios covered
- [ ] Negative scenarios covered
- [ ] Edge cases identified
- [ ] Security considerations included
- [ ] Integration points tested

## Integration with Phoenix OS Workflow

### Workflow Position

```
Story Created → [Grooming] → [Test Case Generation] → [Implementation] → [Test Execution]
                              ↑ You are here
```

### Input Dependencies

- Story must have native type="Story"
- Story must have acceptance criteria
- Story should be in OPEN or IN_PROGRESS state

### Output Usage

- Test cases guide TDD implementation
- Coverage matrix validates completeness
- Execution checklist tracks progress
- Test task issues integrate with sprint planning

## Philosophy Alignment

This memory follows Phoenix OS Fluidic SDLC principles:

- **Memory Abstraction**: Provides HOW for test case generation
- **Agent Discovery**: Agents find and read this memory autonomously
- **No Command Passing**: Commands do NOT pass this to agents
- **Traceability**: Every test traces to acceptance criteria
- **Evidence-Based**: Test cases derived from documented requirements

See: [Phoenix OS Philosophy](https://github.com/nagarro-digital/phoenix-os/wiki/Philosophy)

---

**Version**: 1.0.0
**Last Updated**: 2025-12-18
**Status**: Active
