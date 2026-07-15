# npm Test Scripts

This document defines test-related npm script patterns for Phoenix OS.

## Standard Test Script Names

### Test Execution Scripts
- `test` - Run all tests
- `test:unit` - Run unit tests only
- `test:integration` - Run integration tests
- `test:e2e` - Run end-to-end tests

### Coverage Scripts
- `test:coverage` - Run tests with coverage
- `coverage` - Alternative coverage script name
- `test:ci` - CI-specific test execution

### Watch Scripts
- `test:watch` - Run tests in watch mode
- `test:watchAll` - Watch all tests

## Script Detection

### Find Test Scripts
```bash
# Get all test-related scripts
cat package.json | jq -r '.scripts | to_entries[] | select(.key | test("^test")) | .key'

# Get coverage script specifically
cat package.json | jq -r '.scripts["test:coverage"] // .scripts.coverage // empty'
```

### Detect Test Framework
```bash
# Check for Jest in scripts
cat package.json | jq -r '.scripts.test' | grep -q "jest" && echo "Jest detected"

# Check for Jest in dependencies
cat package.json | jq -e '.devDependencies.jest or .dependencies.jest' > /dev/null && echo "Jest installed"

# Check for React Testing Library
cat package.json | jq -e '.devDependencies["@testing-library/react"]' > /dev/null && echo "React Testing Library installed"
```

## Script Execution Patterns

### Run Coverage Collection
```bash
# Use project coverage script
npm run test:coverage

# Fallback with flag
npm run test -- --coverage

# Direct Jest if no script
npx jest --coverage
```

### Run Specific Tests
```bash
# Pass pattern to test script
npm run test -- --testPathPattern="ComponentName"

# Run single file
npm run test -- path/to/test.test.ts
```

### CI Mode Execution
```bash
# CI with coverage
CI=true npm run test:coverage

# CI with specific config
npm run test:ci
```

## Environment Variables

### Common Test Variables
```bash
# Set CI mode (disables watch, interactive)
CI=true npm run test

# Set timezone for consistent tests
TZ=UTC npm run test

# Increase memory for large suites
NODE_OPTIONS="--max-old-space-size=4096" npm run test
```

## Output Handling

### Capture Results
```bash
# Save output to file
npm run test:coverage 2>&1 | tee test-output.log

# Get exit code
npm run test:coverage
TEST_EXIT_CODE=$?
```

### Parse Test Results
```bash
# Check if tests passed
npm run test:coverage && echo "Tests passed" || echo "Tests failed"
```

## Method Selection Priority

1. **Primary**: `npm run test:coverage` (project script)
2. **Secondary**: `npm run test -- --coverage` (with flag)
3. **Fallback**: `npx jest --coverage` (direct execution)

## Error Scenarios

### Missing Test Script
- Verify package.json has test script
- Check for typos in script name
- Use npx jest as fallback

### Script Execution Errors
- Run npm install first
- Check Jest configuration
- Verify test files exist

### Coverage Script Missing
- Use test script with --coverage flag
- Create test:coverage script
- Use direct Jest command

---

**Version**: 1.0.0
**Last Updated**: 2025-11-25
**Status**: Active
