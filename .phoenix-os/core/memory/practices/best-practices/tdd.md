# Test-Driven Development (TDD) Methodology

If project has selected to do TDD, then you **must** default to Inside-Out Pattern. Architect can chose to change this. 

If asked for, the following are the tradeoffs:
1. Story-level TDD
 - Phases: Red (all story tests) -> Green (implement all) -> Refactory
 - Scope: Complete story at once
 - Trade-offs:
    - ✅ Better feature cohesion, less over-engineering
    - ❌ Longer feedback cycles, generation takes time

2 Inside-Out TDD
 - Phases: Start with core and build outward towards UI / API
 - Scope: Core logic first and then build towards systems
 - Trade-offs:
    - ✅ Single domain model, no mocking as the dependencies always are built
    - ❌ Integration challenges


## Inside-Out Implementation Pattern

### Inside-Out TDD Cycle (Core-First Approach)
0. **DESIGN Phase**: Define domain entities and core business interfaces first
1. **RED Phase**: Write failing tests for core domain logic without external dependencies
2. **GREEN Phase**: Implement core domain functionality with minimal code
3. **EXPAND Phase**: Build outward layers iteratively. Refer to the architecture for layer-level details and **must** follow the layers

### Inside-Out Development Flow
These are guidelines for diffrent types of layers. You are **required** to use the guideliens as per the layers in the architecture. These layers are listed Inside-Out.
1. Infrastructure Layer: Repositories, external service adapters
2. Core Domain Layer: Entities, value objects, domain services
3. Service Layer: Use cases, application services
4. Experience: endpoints and APIs to create orchestation
5. Presentation Layer: Controllers, API endpoints, UI components

As you identify utility methods, build test cases and implementations using TDD. Do not over build. If needed, you are **required** to refactor utility methods.

### Inside-Out Requirements (MANDATORY)
- Infrastructure layer can use mocks, but **only if** connecting to dependency is not possible.
- Domain logic **must** be testable without external dependencies
- Core entities **must** have complete business rule validation
- Build dependencies incrementally as core expands outward
- Maintain dependency direction (outer depends on inner). Also, **must** follow architecture design


## Story-Level Implementation Pattern

### Story-Level TDD Cycle (Interface-First Approach):
0. **DESIGN Phase**: Define all interfaces, DTOs, and API contracts for the complete story
1. **RED Phase**: Write all failing tests for the complete story using predefined interfaces
2. **GREEN Phase**: Implement all interfaces with minimal code to make all tests pass

### Story-Level vs Test-Level TDD:
**Story-Level TDD** (Phoenix OS Approach):
- Design complete story interfaces upfront
- Write all tests for story at once (against stubs)
- Implement complete story functionality
- Optimized for Claude Code's comprehensive processing capabilities

**Test-Level TDD** (Traditional Approach):
- Write one test → implement → write next test → implement
- Higher coordination overhead
- More context switching

## TDD Interface-First Requirements

### Before Writing Any Tests:
1. **Define all interfaces first** (services, repositories, DTOs)
2. **Document method signatures** with exact parameter and return types
3. **Specify exception types** that will be thrown
4. **Create method stubs** that compile but throw UnsupportedOperationException
5. **THEN write tests** against these predefined interfaces

### Interface-First Requirements (MANDATORY):
- **All tests MUST compile** even without full implementations
- **Use method stubs** for missing functionality during RED phase
- **Never assume methods exist** that aren't in interface definitions
- **Consistent API contracts** across all components

#### Compilation Validation Gates:
- [ ] **Phase 0 Gate**: All interfaces and stubs compile before any testing begins
- [ ] **Phase 1 Gate**: All tests compile successfully using method stubs
- [ ] **Phase 2 Gate**: All tests pass with minimal implementations
- [ ] **NEVER proceed** to next phase with compilation errors present

#### Interface-First Development Requirements:
- [ ] Complete API contracts must exist before testing begins
- [ ] All method signatures must have exact parameter and return types
- [ ] All custom exception types and error codes must be defined
- [ ] Compilable stubs must exist for ALL interfaces before testing
- [ ] Method stubs must throw UnsupportedOperationException with "TDD RED phase" message
- [ ] Interface signatures must never change during implementation
- [ ] Tests must use ONLY pre-existing interfaces and methods
- [ ] All tests must compile before writing test logic
- [ ] Testing frameworks must be consistent (AssertJ only, no Hamcrest)
- [ ] Tests must never be written before interfaces and stubs are created


## TDD Story-Level RED-GREEN Cycle Process

### Story-Level Cycle Methodology

#### Cycle Overview:
Each complete story follows a story-level RED-GREEN cycle:

1. **DESIGN Phase**: Define all interfaces for the complete story
2. **RED Phase**: Write all failing tests for the story at once
3. **GREEN Phase**: Implement all functionality to make all tests pass

#### Detailed Story-Level TDD Steps:

##### DESIGN Phase (Interface Definition):
1. Analyze requirements for the complete story
2. Define all service interfaces with method signatures
3. Create all DTO/record classes and exception types
4. Create compilable method stubs for all interfaces
5. Verify all interfaces and stubs compile successfully

##### RED Phase (Write All Failing Tests):
1. Write comprehensive unit tests for ALL story functionality
2. Use ONLY the predefined interfaces and method stubs
3. Ensure all tests compile successfully using method stubs
4. Run all tests and confirm they fail meaningfully
5. Verify test coverage addresses all business logic

##### GREEN Phase (Complete Story Implementation):
1. Replace ALL method stubs with functional implementations
2. Implement ALL functionality required to make ALL tests pass
3. Run all tests and confirm they pass
4. Verify >80% coverage through actual test execution
5. Ensure no interface signature changes during implementation

### Story-Level TDD Cycle Validation

#### Story-Level Process Validation:
- Verify each story phase is completed before moving to the next
- Ensure ALL story tests fail meaningfully in RED phase
- Confirm complete story implementation in GREEN phase
- Validate story delivers complete vertical slice functionality

#### Story-Level TDD Quality Gates:
- [ ] All test method names clearly describe expected behavior
- [ ] All tests use arrange-act-assert pattern
- [ ] All tests initially failed with clear error messages in RED phase
- [ ] Complete story implementation covers all test requirements
- [ ] Story delivers complete working functionality end-to-end

## Coverage Requirements

### Quantitative TDD Compliance:
- **Test-to-Implementation Ratio**: ≥ 1:1 (equal or more test files than implementation)
- **Code Line Ratio**: Test lines ≥ Implementation lines (tests are first-class code)
- **Coverage Threshold**: >80% achieved through actual test execution
- **Method Coverage**: Every public method must have corresponding test

### Coverage Validation Process:
1. Run complete test suite
2. Generate coverage report using project tooling
3. Verify >80% line coverage
4. Verify >75% branch coverage
5. Validate coverage quality and effectiveness


## TDD Anti-Patterns (Technology Agnostic)

### Follow These Patterns:
- **Test behavior, not implementation**: Focus on what the code does, not how
- **Test public interfaces only**: Private methods tested through public API
- **Focused, single-responsibility tests**: Each test validates one specific behavior
- **Realistic test data**: Use meaningful data that represents real usage
- **Clear test names**: Name explains what is being tested and expected outcome

## TDD Metrics and Validation

### File Ratio Validation:
- Count test files vs implementation files (should be ≥ 1:1)
- Verify test directories mirror implementation structure
- Ensure complete test coverage for all public components

### Line Count Validation:
- Test code lines should equal or exceed implementation code lines
- Measure actual lines of test logic (excluding boilerplate)
- Track ratio trends over time

### TDD Process Validation:
1. Validate RED phase: test failures with meaningful messages
2. Validate GREEN phase: minimal implementation passes tests
3. Ensure proper TDD cycle progression
4. Verify adherence to TDD principles

## TDD Compliance Validation

### Story-Level Validation:
- Complete story follows story-level RED-GREEN cycle
- All tests for story written in single RED phase
- All implementations completed in single GREEN phase
- Test coverage >80% achieved through actual execution
- Test-to-implementation ratios meet standards
- TDD principles consistently applied at story level

### Project-Level Validation:
- Consistent TDD methodology applied across all features
- Coverage trends maintained over time
- TDD anti-patterns actively prevented
- Development velocity and quality maintained

### Behavioral Constraints (MANDATORY)

#### Interface Design Validation:
- [ ] All service interfaces defined with complete method signatures
- [ ] All DTO/record classes created with required fields
- [ ] All custom exception classes defined
- [ ] All repository interfaces specified
- [ ] All method stubs implemented and compiling
- [ ] Zero compilation errors in entire codebase

#### Test Compilation Validation:
- [ ] All tests compile successfully using existing interfaces
- [ ] No missing method references in test code
- [ ] Consistent testing framework usage (AssertJ only)
- [ ] All test dependencies properly imported
- [ ] All mock objects use existing interface signatures

#### Implementation Validation:
- [ ] All method stubs replaced with functional implementations
- [ ] All tests pass with minimal implementations
- [ ] No interface signature changes during implementation
- [ ] All expected return types and exception types match specifications

#### Quality Enforcement:
- [ ] Every public method has corresponding unit test
- [ ] Test method names follow `methodName_scenario_expectedResult` pattern
- [ ] All tests use arrange-act-assert structure
- [ ] Test coverage >80% through actual execution
- [ ] No TODO comments or stub implementations in final code

This document provides the technology-agnostic TDD methodology with comprehensive validation requirements. Refer to technology-specific guides for implementation details and tooling.