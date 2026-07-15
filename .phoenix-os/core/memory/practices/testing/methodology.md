# Testing Methodology

This document defines the testing methodology for unit test generation in Phoenix OS.

## Core Principles

### 1. Behavior-Focused Testing
- Test WHAT the component does, not HOW it does it
- Test public interfaces only
- Avoid testing implementation details
- Tests should survive refactoring

### 2. Four-Phase Test Pattern
```
Setup    → Prepare test data and dependencies
Exercise → Execute the method or operation
Verify   → Assert expected outcomes
Teardown → Clean up (if needed)
```

### 3. Single Responsibility
- One test validates one specific behavior
- Each test is independent
- No dependencies between tests

## Test Categories

### Unit Tests
- Test individual components in isolation
- Mock external dependencies
- Fast execution (< 100ms per test)
- No network or database calls

### Component Tests (React)
- Test component rendering and behavior
- Use React Testing Library
- Test user interactions
- Verify accessibility

## Test Naming Convention (Default — Overridable by Detection)

### Pattern
```
methodName_scenario_expectedResult
```

> **Note**: This is the default naming convention. When `projectPatterns` are detected with a different `testNameConvention` (e.g., `should_description` or `descriptive`), the detected convention takes precedence.

### Examples
```typescript
// Function tests
calculateTotal_emptyCart_returnsZero
validateEmail_invalidFormat_throwsError
fetchUser_validId_returnsUserObject

// Component tests
Button_clicked_callsOnClick
Form_submitted_validatesFields
Modal_opened_focusesTrapsFocus
```

## Test File Placement

> **Detection-First Override**: When an approved test plan contains a `projectPatterns` object, its values take precedence over the defaults documented in this section. The defaults remain valid as fallback when `projectPatterns` is absent.

### Centralized Test Directory (Recommended)
Phoenix OS uses a centralized test directory structure for consistency and easier test discovery.

**Standard Locations**:
```
project-root/
├── src/
│   ├── components/
│   │   ├── Button.tsx
│   │   └── Form.tsx
│   └── utils/
│       └── helpers.ts
├── __tests__/              # ✅ Recommended
│   ├── components/
│   │   ├── Button.test.tsx
│   │   └── Form.test.tsx
│   └── utils/
│       └── helpers.test.ts
└── tests/                  # ✅ Alternative
    ├── components/
    │   ├── Button.test.tsx
    │   └── Form.test.tsx
    └── utils/
        └── helpers.test.ts
```

**Naming Convention**:
- Test files mirror source file paths
- Use `.test.{ts,tsx,js,jsx}` extension
- Example: `src/components/Button.tsx` → `__tests__/components/Button.test.tsx`

### Alternative: Co-located Tests
Some projects place tests alongside source files:

```
src/
├── components/
│   ├── Button.tsx
│   ├── Button.test.tsx      # Co-located
│   ├── Form.tsx
│   └── Form.test.tsx         # Co-located
└── utils/
    ├── helpers.ts
    └── helpers.test.ts       # Co-located
```

**Note**: Phoenix OS Audit Testing system detects the target project's existing test file structure first. If 3+ test files exist, the detected pattern (co-located, centralized, or mixed) is used. For greenfield projects (0-2 test files), centralized directories (`__tests__/` or `tests/`) are used as the default.

### Directory Structure Best Practices
1. **Mirror source structure**: Test directory structure should match source directory structure
2. **Consistent naming**: Always use `.test.{ts,tsx}` or `.spec.{ts,tsx}` extensions
3. **Separate unit/integration**: Consider separate directories for different test types:
   ```
   __tests__/
   ├── unit/           # Unit tests
   ├── integration/    # Integration tests
   └── e2e/            # End-to-end tests
   ```

## Test Structure

### Standard Test Template
```typescript
describe('ComponentName', () => {
  describe('methodName', () => {
    it('should_scenario_expectedResult', () => {
      // Setup: Prepare test data
      const input = createTestData();

      // Exercise: Execute the method
      const result = methodUnderTest(input);

      // Verify: Assert expected outcome
      expect(result).toEqual(expectedOutput);

      // Teardown: Clean up (if needed)
    });
  });
});
```

### React Component Template
```typescript
import { render, screen, fireEvent } from '@testing-library/react';

describe('ComponentName', () => {
  it('should render correctly', () => {
    // Setup
    render(<Component />);

    // Verify
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('should handle user interaction', () => {
    // Setup
    const handleClick = jest.fn();
    render(<Component onClick={handleClick} />);

    // Exercise
    fireEvent.click(screen.getByRole('button'));

    // Verify
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
```

## Edge Cases to Cover

### 1. Boundary Values
- Empty inputs (null, undefined, empty string, empty array)
- Minimum and maximum values
- Off-by-one scenarios

### 2. Error Conditions
- Invalid inputs
- Missing required fields
- Network failures (for async code)

### 3. State Transitions
- Initial state
- Loading state
- Error state
- Success state

## Mocking Guidelines

### Mocking Framework Selection

Mocking framework resolution follows a three-tier priority system:

1. **Tier 1 — User Override**: The `--mock-framework` flag on the `audit-test` command sets `mockFrameworkOverride` in `file-scope-context.json`. If non-null, use it directly — skip Tiers 2 and 3.
2. **Tier 2 — Manifest Auto-Detection**: Scan the project manifest for known mocking dependencies using the canonical lookup table in `core/memory/practices/testing/mocking-frameworks.md`. First match wins.
3. **Tier 3 — Stack Default Fallback**: If no mocking dependency is found, use the built-in default for the detected stack (from `stack-detection.md`). If no built-in default exists, prompt the user.

See `mocking-frameworks.md` for the full per-stack dependency-to-framework mapping.

### 10 Pattern Categories

Every mocking-patterns reference file covers these 10 categories to ensure comprehensive mock usage:

1. **Function/Method Mocking** — Creating mock functions and mocking class methods
2. **Spy/Observation** — Observing calls without changing implementation
3. **Stub with Return Values** — Static, sequential, and computed return values
4. **Stub with Exceptions** — Synchronous and asynchronous error simulation
5. **Argument Matching** — Flexible matchers for call verification
6. **Call Verification** — Asserting call count, order, and arguments
7. **Module/Import Mocking** — Auto-mocking, partial mocking, and factory patterns
8. **HTTP/API Mocking** — Network request interception and response simulation
9. **Timer/Date Mocking** — Fake timers, frozen dates, and clock injection
10. **Partial Mocking** — Mocking specific methods while keeping others real

Per-tool pattern files:
- Node.js (Jest): `core/memory/tools/jest/mocking-patterns.md`
- Node.js (Vitest): `core/memory/tools/vitest/mocking-patterns.md`
- Python: `core/memory/tools/pytest/mocking-patterns.md`
- Java: `core/memory/tools/junit/mocking-patterns.md`
- Go: `core/memory/tools/go-test/mocking-patterns.md`
- .NET: `core/memory/tools/dotnet-test/mocking-patterns.md`

### When to Mock
- External API calls
- Database operations
- Third-party libraries
- Time-dependent operations
- Random values

### When NOT to Mock — Anti-Pattern Catalog
- **The system under test (SUT)** — Mocking the SUT means you're not testing it at all
- **Simple utility functions** — Pure functions with no side effects should use real implementations
- **State management within component** — Test real state transitions, not mocked ones
- **Value objects / DTOs** — Simple data containers don't need mocking; use real instances
- **Language/framework built-ins** — Don't mock `Array.map()`, `String.trim()`, etc.
- **Over-mocking** — If >50% of test setup is mocking, consider integration testing instead
- **Asserting mock internals** — Don't verify how mocks were configured; verify observable behavior
- **Missing mock reset/cleanup** — Leaked mock state between tests causes flaky failures
- **Mixed framework calls** — Don't use `jest.fn()` in a vitest project or vice versa

### HTTP Mocking vs General Mocking

HTTP/API mocking frameworks (msw, nock, WireMock, httpmock, responses) are **complementary** to general mocking frameworks (jest, mockito, moq, etc.). They serve different purposes:

- **General mocking**: Replaces function/method calls at the code level (unit isolation)
- **HTTP mocking**: Intercepts network requests at the HTTP layer (integration isolation)

When both are needed in the same test:
- Use the general framework for internal dependency mocking
- Use the HTTP framework for external API call simulation
- Both frameworks should be cleaned up in `afterEach`/teardown

### Mock Patterns
```typescript
// Mock function
const mockCallback = jest.fn();

// Mock module
jest.mock('./api', () => ({
  fetchData: jest.fn()
}));

// Mock return value
mockFn.mockReturnValue(expectedValue);

// Mock resolved value (async)
mockFn.mockResolvedValue(asyncResult);
```

> **Note**: The patterns above are Jest-specific examples. For framework-specific patterns, consult the per-tool mocking-patterns files listed in the "10 Pattern Categories" section above.

## React Testing Library Best Practices

### Query Priority (Preferred to Least)
1. `getByRole` - Accessibility-first
2. `getByLabelText` - Form elements
3. `getByPlaceholderText` - Input elements
4. `getByText` - Non-interactive elements
5. `getByTestId` - Last resort

### User Event Simulation
```typescript
import userEvent from '@testing-library/user-event';

// Prefer userEvent over fireEvent
await userEvent.click(button);
await userEvent.type(input, 'text');
```

### Async Testing
```typescript
// Wait for element
await screen.findByText('Loaded');

// Wait for condition
await waitFor(() => {
  expect(screen.getByText('Done')).toBeInTheDocument();
});
```

## Test Data Management

### Test Data Factories
```typescript
// Create reusable test data factories
const createUser = (overrides = {}) => ({
  id: 1,
  name: 'Test User',
  email: 'test@example.com',
  ...overrides
});

// Usage
const user = createUser({ name: 'Custom Name' });
```

### Avoiding Test Data Coupling
- Generate unique IDs for each test
- Use realistic but not production data
- Clean up after tests

## Coverage Focus

### Priority Order
1. Business logic functions
2. Component rendering
3. User interactions
4. Edge cases
5. Error handling

### Skip Coverage For
- Type definitions
- Re-export files
- Configuration files
- Generated code

---

**Version**: 2.0.0
**Last Updated**: 2026-03-17
**Status**: Active
