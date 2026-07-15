# Vitest Test Operations

This document defines test execution and validation operations for Vitest in Phoenix OS.

## Test Execution

### Run All Tests
```bash
# Non-interactive (CI) mode
npx vitest run

# Using npm script (preferred when configured)
npm run test

# With verbose output
npx vitest run --reporter=verbose

# With dot reporter (compact)
npx vitest run --reporter=dot
```

### Run Specific Test Files
```bash
# Run a specific test file
npx vitest run src/calculator/calculator.test.ts

# Run tests matching file pattern
npx vitest run "src/components/**"

# Run tests matching name pattern
npx vitest run -t "should add numbers"

# Run tests in a directory
npx vitest run src/utils/
```

### Run Tests for Specific Components
```bash
# Match by test name (regex)
npx vitest run -t "Calculator"

# Match by file pattern
npx vitest run --testPathPattern="Calculator"

# Filter tests
npx vitest run --filter "src/calculator"
```

## Test Output Parsing

### JSON Output Format
```bash
# Generate JSON output
npx vitest run --reporter=json --outputFile=test-results.json

# JSON structure
{
  "numFailedTests": 0,
  "numPassedTests": 45,
  "numTotalTests": 45,
  "testResults": [
    {
      "testFilePath": "src/calculator/calculator.test.ts",
      "assertionResults": [
        {
          "ancestorTitles": ["Calculator"],
          "title": "should add two numbers",
          "status": "passed",
          "duration": 3
        }
      ]
    }
  ]
}
```

### Parse Test Results
```bash
# Get failed test count
cat test-results.json | jq '.numFailedTests'

# List failed tests
cat test-results.json | jq '.testResults[] | .assertionResults[] | select(.status == "failed") | .title'

# Get test durations
cat test-results.json | jq '.testResults[] | {file: .testFilePath, duration: .duration}'
```

## Test Discovery

### List All Test Files
```bash
# Vitest list mode (shows test files and test names)
npx vitest list

# List with specific pattern
npx vitest list "src/components/**"

# List via reporter
npx vitest run --reporter=verbose 2>&1 | grep "✓\|×\|○"
```

### Discovery Conventions
- Test files: `**/*.{test,spec}.{ts,tsx,js,jsx}` (Vitest default)
- Test functions: `it()`, `test()`, `describe()` (Jest-compatible API)
- Also discovers: `*.bench.ts` (benchmark files)
- `globals: true` in config enables `describe`/`it`/`expect` without imports
- Supports TypeScript natively (no transpilation step needed)

```typescript
// Test file conventions (same as Jest)
describe('Calculator', () => {
  it('should add two numbers', () => {
    expect(add(2, 3)).toBe(5);
  });

  test('should throw on divide by zero', () => {
    expect(() => divide(10, 0)).toThrow();
  });
});
```

## Test Isolation

### Run Tests in Isolation
```bash
# Bail on first failure
npx vitest run --bail=1

# Run without cache
npx vitest run --clearCache

# Single-thread execution (debugging)
npx vitest run --single-thread

# Run specific test in isolation
npx vitest run --single-thread src/calculator/calculator.test.ts
```

### Isolate Problematic Tests
```bash
# Run specific failing test
npx vitest run -t "exact test name" --reporter=verbose

# Run with pool=forks for process isolation
npx vitest run --pool=forks

# Disable parallelism
npx vitest run --maxWorkers=1
```

## Test Debugging

### Debug Mode
```bash
# Run with Node inspector
node --inspect-brk node_modules/.bin/vitest run --single-thread

# Vitest UI mode (browser-based interactive runner)
npx vitest --ui

# Detect open handles
npx vitest run --detectOpenHandles

# Verbose output
npx vitest run --reporter=verbose
```

### Verbose Error Output
```bash
# Show full error details
npx vitest run --reporter=verbose

# Show with stack traces
npx vitest run --reporter=verbose 2>&1 | grep -A20 "FAIL"
```

## Snapshot Operations

### Update Snapshots
```bash
# Update all snapshots
npx vitest run --update

# Update snapshots for specific file
npx vitest run --update src/components/__tests__/Button.test.tsx

# Interactive snapshot update (in watch mode)
npx vitest
# Then press 'u' to update failing snapshots
```

## Parallel Execution

### Configure Workers
```bash
# Set max workers
npx vitest run --maxWorkers=4

# Use percentage of CPUs
npx vitest run --maxWorkers=50%

# Single worker (debugging)
npx vitest run --single-thread

# Use forks pool (process-based, more isolated)
npx vitest run --pool=forks --maxForks=4
```

### Concurrent Tests
```typescript
// Mark test as concurrent within describe block
describe.concurrent('async operations', () => {
  it('test 1', async () => { ... });
  it('test 2', async () => { ... }); // Runs concurrently with test 1
});

// Concurrent test via it.concurrent
it.concurrent('runs in parallel', async () => { ... });
```

### Workspace Support (Vitest v1+)
```typescript
// vitest.workspace.ts — run tests across multiple projects
export default [
  './packages/utils',
  './packages/components',
  {
    test: {
      name: 'unit',
      environment: 'node',
    },
  },
];
```

## Test Reporting

### Generate Reports
```bash
# JUnit XML (CI/CD)
npx vitest run --reporter=junit --outputFile=test-results.xml

# HTML report
npx vitest run --reporter=html --outputFile=test-report.html

# JSON report
npx vitest run --reporter=json --outputFile=test-results.json

# Multiple reporters simultaneously
npx vitest run \
  --reporter=default \
  --reporter=junit \
  --outputFile.junit=test-results.xml
```

### CI/CD Integration
```bash
# CI mode (no watch, JUnit output, with coverage)
npx vitest run \
  --reporter=junit \
  --outputFile=test-results.xml \
  --coverage \
  --coverage.reporter=json-summary

# With color disabled for CI logs
npx vitest run --reporter=verbose --color=false --ci
```

## Vitest vs Jest API Differences

Key differences from Jest (for migration reference):

```typescript
// Vitest mock functions — same API as Jest but via 'vi' object
import { vi } from 'vitest';

// jest.fn() → vi.fn()
const mockFn = vi.fn();
mockFn.mockReturnValue('mocked');

// jest.mock() → vi.mock()
vi.mock('./api', () => ({
  fetchData: vi.fn().mockResolvedValue({ data: 'test' }),
}));

// jest.spyOn() → vi.spyOn()
const spy = vi.spyOn(object, 'method');

// jest.useFakeTimers() → vi.useFakeTimers()
vi.useFakeTimers();
vi.runAllTimers();
vi.useRealTimers();

// jest.clearAllMocks() → vi.clearAllMocks()
vi.clearAllMocks();

// Timers reset between tests (no manual beforeEach needed)
beforeEach(() => {
  vi.clearAllMocks();
});
```

## Method Selection Priority

1. **Primary**: `npm run test` (uses project scripts)
2. **Secondary**: `npx vitest run` (direct execution, CI mode)
3. **Fallback**: `npx vitest` (watch mode for interactive development)

## Error Scenarios

### Test Execution Failures
- Check Vitest is installed: `npm list vitest`
- Verify config file: `ls vitest.config.ts vite.config.ts`
- Check test file patterns in config `include` setting
- Run `npx vitest --reporter=verbose` for detailed output

### Module Resolution Failures
- Check `resolve.alias` in `vitest.config.ts` / `vite.config.ts`
- Verify TypeScript path aliases match Vite aliases
- Check `moduleNameMapper` equivalent: `resolve.alias` in Vite config

### Timeout Failures
```typescript
// Increase timeout in test
it('slow test', async () => { ... }, 30000); // 30 second timeout

// Global timeout in vitest.config.ts
test: {
  testTimeout: 30000,
}
```

### Environment Errors
```bash
# Use jsdom for browser-like tests
npx vitest run --environment jsdom

# Use node for Node.js-specific tests
npx vitest run --environment node

# Per-file environment via comment
// @vitest-environment jsdom
```

---

**Version**: 1.0.0
**Last Updated**: 2026-03-17
**Status**: Active
