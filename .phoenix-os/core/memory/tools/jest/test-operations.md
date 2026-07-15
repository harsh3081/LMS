# Jest Test Operations

This document defines test execution and validation operations for Jest in Phoenix OS.

## Test Execution

### Run All Tests
```bash
# Using npm script (preferred)
npm run test

# Direct Jest execution
npx jest

# With verbose output
npx jest --verbose
```

### Run Specific Test Files
```bash
# Run single test file
npx jest path/to/file.test.ts

# Run tests matching pattern
npx jest --testPathPattern="ComponentName"

# Run tests in directory
npx jest src/components/

# Run tests matching name
npx jest --testNamePattern="should render correctly"
```

### Run Tests for Specific Components
```bash
# Match by component name
npx jest --testPathPattern="Button"

# Run related tests only
npx jest --findRelatedTests src/components/Button.tsx

# Run tests for changed files
npx jest --onlyChanged
```

## Test Output Parsing

### JSON Output Format
```bash
# Generate JSON output
npx jest --json --outputFile=test-results.json

# JSON structure
{
  "numFailedTests": 0,
  "numPassedTests": 45,
  "numTotalTests": 45,
  "testResults": [
    {
      "assertionResults": [
        {
          "ancestorTitles": ["Button Component"],
          "title": "should render correctly",
          "status": "passed",
          "duration": 50
        }
      ],
      "name": "src/components/__tests__/Button.test.tsx",
      "status": "passed"
    }
  ]
}
```

### Parse Test Results
```bash
# Get failed test count
cat test-results.json | jq '.numFailedTests'

# List failed tests
cat test-results.json | jq '.testResults[] | select(.status == "failed") | .name'

# Get test durations
cat test-results.json | jq '.testResults[] | {file: .name, duration: .duration}'
```

## Test Discovery

### List All Test Files
```bash
# Find test files
npx jest --listTests

# Output as JSON
npx jest --listTests --json

# Match pattern
npx jest --listTests --testPathPattern="components"
```

### Identify Test Structure
```bash
# Show test names without running
npx jest --verbose --testNamePattern=".*" --listTests
```

## Test Validation

### Validate Test Execution
```bash
# Run with bail on first failure
npx jest --bail

# Run with failure exit code
npx jest --passWithNoTests=false

# Force fail on console errors
npx jest --errorOnDeprecated
```

### Detect Flaky Tests
```bash
# Run tests multiple times
for i in {1..5}; do
  npx jest --json --outputFile="run-$i.json"
done

# Compare results for consistency
```

## Watch Mode Operations

### Interactive Watch
```bash
# Watch all tests
npx jest --watch

# Watch only changed files
npx jest --watchAll

# Watch specific pattern
npx jest --watch --testPathPattern="Button"
```

### Watch Commands
```
Press f to run only failed tests.
Press o to only run tests related to changed files.
Press p to filter by a filename regex pattern.
Press t to filter by a test name regex pattern.
Press q to quit watch mode.
Press Enter to trigger a test run.
```

## Test Isolation

### Run Tests in Isolation
```bash
# Run tests sequentially (single worker)
npx jest --runInBand

# Clear cache before run
npx jest --clearCache && npx jest

# Run with fresh module cache
npx jest --clearMocks
```

### Isolate Problematic Tests
```bash
# Skip specific test
npx jest --testPathIgnorePatterns="ProblematicTest"

# Run only specific test
npx jest --testPathPattern="ProblematicTest" --runInBand
```

## Test Debugging

### Debug Single Test
```bash
# Run with Node debugger
node --inspect-brk node_modules/.bin/jest --runInBand {test-file}

# Detect open handles
npx jest --detectOpenHandles

# Detect leaks
npx jest --detectLeaks
```

### Verbose Error Output
```bash
# Show full error details
npx jest --verbose --no-cache

# Expand inline snapshots
npx jest --expand
```

## Snapshot Operations

### Update Snapshots
```bash
# Update all snapshots
npx jest --updateSnapshot

# Update specific snapshots
npx jest --updateSnapshot --testPathPattern="Button"

# Interactive snapshot update
npx jest --watch
# Then press 'i' for interactive mode
```

### Validate Snapshots
```bash
# Check for obsolete snapshots
npx jest --ci

# List snapshot files
find . -name "*.snap" -type f
```

## Parallel Execution

### Configure Workers
```bash
# Set max workers
npx jest --maxWorkers=4

# Use percentage of CPUs
npx jest --maxWorkers=50%

# Sequential execution
npx jest --runInBand
```

### Shard Tests
```bash
# Shard 1 of 3
npx jest --shard=1/3

# Shard 2 of 3
npx jest --shard=2/3

# Shard 3 of 3
npx jest --shard=3/3
```

## Test Reporting

### Generate Reports
```bash
# JUnit XML report
npx jest --reporters=default --reporters=jest-junit

# HTML report
npx jest --reporters=default --reporters=jest-html-reporter

# Custom reporter
npx jest --reporters=./custom-reporter.js
```

### CI/CD Integration
```bash
# CI mode (no watch, no interactive)
npx jest --ci

# CI with coverage and reports
npx jest --ci --coverage --reporters=default --reporters=jest-junit
```

## React Testing Library Integration

### Component Testing Pattern
```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from './Button';

describe('Button Component', () => {
  it('should render correctly', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button')).toHaveTextContent('Click me');
  });

  it('should call onClick when clicked', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
```

### Async Testing Pattern
```typescript
import { render, screen, waitFor } from '@testing-library/react';

it('should load data', async () => {
  render(<AsyncComponent />);

  await waitFor(() => {
    expect(screen.getByText('Loaded')).toBeInTheDocument();
  });
});
```

## Method Selection Priority

1. **Primary**: `npm run test` (uses project scripts)
2. **Secondary**: `npx jest` (direct execution)
3. **Fallback**: `node node_modules/.bin/jest` (explicit path)

## Error Scenarios

### Test Execution Failures
- Check Jest configuration is valid
- Verify test files match testMatch patterns
- Ensure dependencies are installed

### Module Resolution Failures
- Check moduleNameMapper in config
- Verify transform configuration
- Ensure TypeScript config is compatible

### Timeout Failures
- Increase test timeout: `jest.setTimeout(30000)`
- Check for unresolved promises
- Verify async/await usage

---

**Version**: 1.0.0
**Last Updated**: 2025-11-25
**Status**: Active
