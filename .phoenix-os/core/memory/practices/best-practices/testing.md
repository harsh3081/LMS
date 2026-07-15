# Testing Standards and Best Practices across all phases

This document defines testing standards and best practices for development projects. this file will include all the different phases.

## Unit Testing

### Unit Testing Approach:
Project team is **required** to follow a rigorous unit testing strategy that ensures high-quality, reliable software through comprehensive component-level validation.

Unit Testing Focus should be on component-level testing of business logic with proper isolation. **Consider** mocking if there are hard dependencies, or if unit test execution may take time.
If you can spin a database or cache and keep test data then setup tear-up and tear-down and **DO NOT* use mocking.


### Unit Testing Principles
- Test individual components
- Focus on business logic, calculations, and decision-making code
- Use the `Four-Phase` Setup-Exercise-Verify-Teardown pattern for clarity and consistency
- Test public interfaces rather. **DO NOT** use implementation details for writing tests
- **Must** cover edge cases
- **Should** cover error conditions if coverage is <80%
- **Consider** boundary values as the last set of test cases

### Test Naming Conventions:
Pattern: `methodName_scenario_expectedResult`
- Examples: `authenticate_ValidCredentials_ReturnsSuccessResult`
- Examples: `authenticate_InvalidPassword_ThrowsAuthenticationException`
- Examples: `calculateTotal_EmptyCart_ReturnsZero`

### Best Practices
**MUST** follow the architectural principles.

- One test should validate one specific behavior
- Realistic Test Data: Use meaningful data that represents real-world usage patterns
- Line Coverage: Minimum 80% line coverage through unit test execution
- Branch Coverage: Minimum 75% branch coverage for conditional logic
- Method Coverage: Every public method must have corresponding unit tests. You are **required** to over the getters and setters too if they are public

- Test directories should mirror implementation structure
- Group unit test cases with respect to the base interface. 
- Create reusable test utilities and helper methods for unit tests


### Testing Anti-Patterns to Avoid

- Focus on behavior, not internal mechanics
- **DO NOT** test private methods. These methods are tested indirectly
- Use of mocks sparingly. 
- Data-Driven Tests: Use parameterized tests for multiple similar scenarios


### Unit Test Structure Standards:
```
// Setup
- Set up test data and dependencies
- Prepare the system under test
- Initialize test environment and resources

// Exercise
- Execute the method or operation being tested
- Perform the actual business operation
- Trigger the behavior under test

// Verify
- Verify the expected outcome occurred
- Check return values, state changes, or side effects
- Validate error conditions if applicable
- Assert business rules and invariants

// Teardown
- Clean up test data and resources
- Restore system state
- Release database connections or external resources
```

### Unit Test Validation
You **must** validate all the test by running the test suite, and not trying to access via pattern matching. Steps you will **ALWAYS** take:
1. Run complete unit test suite across all components
2. Generate coverage reports using project tooling
3. Verify minimum coverage thresholds are met
4. Identify gaps in test coverage
5. Document coverage results in project `${config.project.specs-locations.test-logs}`

