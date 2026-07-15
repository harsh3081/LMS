# Vitest CLI Commands

This document defines the CLI commands for Vitest test framework operations in Phoenix OS.

## Core Test Execution

### Run All Tests
```bash
# Run all tests (non-interactive, CI mode)
npx vitest run

# With npm script (preferred when configured)
npm run test

# Direct invocation
npx vitest run --reporter=verbose

# With specific reporter
npx vitest run --reporter=dot

# Quiet mode
npx vitest run --reporter=dot --silent
```

### Run Specific Tests
```bash
# Run a specific test file
npx vitest run path/to/test.test.ts

# Run tests matching a name pattern (regex)
npx vitest run -t "should add numbers"

# Run files matching a glob pattern
npx vitest run "src/**/*.test.ts"

# Run tests in a specific directory
npx vitest run src/components/

# Run tests matching file name pattern
npx vitest run --testPathPattern="Calculator"
```

### Watch Mode
```bash
# Default Vitest mode — interactive watch (re-runs on file change)
npx vitest

# Watch all tests
npx vitest --watch

# Watch with specific reporter
npx vitest --watch --reporter=verbose

# Watch specific files
npx vitest --watch src/calculator/
```

**Note**: Vitest's default mode (without `run`) is watch mode. The `run` flag is required for non-interactive/CI execution.

## Coverage Commands

### Generate Coverage Report
```bash
# Run tests with coverage (matches command-interface.md run_coverage)
npx vitest run --coverage

# With explicit provider (istanbul — recommended default)
npx vitest run --coverage --coverage.provider=istanbul

# With V8 provider (alternative — faster, native)
npx vitest run --coverage --coverage.provider=v8

# With specific reporters
npx vitest run --coverage --coverage.reporter=text --coverage.reporter=json-summary --coverage.reporter=lcov

# With output directory
npx vitest run --coverage --coverage.reportsDirectory=coverage
```

### Coverage Thresholds
```bash
# Configure thresholds in vitest.config.ts (preferred)
# CLI threshold configuration
npx vitest run --coverage --coverage.thresholds.lines=80 --coverage.thresholds.branches=75
```

### Coverage Output Formats
```bash
# JSON summary (primary — coverage/coverage-summary.json for istanbul provider)
npx vitest run --coverage --coverage.reporter=json-summary

# Text output (terminal)
npx vitest run --coverage --coverage.reporter=text

# LCOV (for CI coverage tools)
npx vitest run --coverage --coverage.reporter=lcov

# HTML report
npx vitest run --coverage --coverage.reporter=html

# All formats at once
npx vitest run --coverage \
  --coverage.reporter=text \
  --coverage.reporter=json-summary \
  --coverage.reporter=html \
  --coverage.reporter=lcov
```

## Output Formatting

### Reporter Options
```bash
# Default reporter
npx vitest run --reporter=default

# Verbose (show each test)
npx vitest run --reporter=verbose

# Dot reporter (compact)
npx vitest run --reporter=dot

# JUnit XML (CI/CD)
npx vitest run --reporter=junit --outputFile=test-results.xml

# JSON output
npx vitest run --reporter=json --outputFile=test-results.json

# Multiple reporters
npx vitest run --reporter=default --reporter=junit --outputFile.junit=test-results.xml
```

### Silent Mode
```bash
# Suppress console output during tests
npx vitest run --silent

# No color output
npx vitest run --color=false
```

## Configuration

### Config File Usage
```bash
# Use specific config file
npx vitest run --config vitest.config.ts

# Show resolved configuration
npx vitest run --config vitest.config.ts --reporter=verbose
```

### Environment Options
```bash
# Set test environment
npx vitest run --environment jsdom
npx vitest run --environment node
npx vitest run --environment happy-dom

# Set timezone
TZ=UTC npx vitest run

# Pass Node options
NODE_OPTIONS="--max-old-space-size=4096" npx vitest run
```

## Cache Management

### Clear Cache
```bash
# Clear Vitest cache
npx vitest run --clearCache

# Run without cache
npx vitest run --cache=false
```

## Debugging

### Debug Mode
```bash
# Run with Node inspector
node --inspect-brk node_modules/.bin/vitest run --single-thread

# Detect open handles
npx vitest run --detectOpenHandles

# Run in single thread (for debugging)
npx vitest run --single-thread

# UI mode (browser-based test runner)
npx vitest --ui
```

### Error Handling
```bash
# Bail on first failure
npx vitest run --bail=1

# Bail after N failures
npx vitest run --bail=3

# Force exit after tests
npx vitest run --forceExit
```

## Parallel Execution

### Worker Configuration
```bash
# Set number of threads
npx vitest run --maxWorkers=4

# Use percentage of CPUs
npx vitest run --maxWorkers=50%

# Single thread (debugging)
npx vitest run --single-thread

# Use forks pool instead of threads
npx vitest run --pool=forks
```

## Update Snapshots

```bash
# Update all snapshots
npx vitest run --update

# Update snapshots for specific file
npx vitest run path/to/test.test.ts --update
```

## Integration with npm Scripts

### Common package.json Scripts
```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "test:ci": "vitest run --reporter=junit --outputFile=test-results.xml --coverage"
  }
}
```

## Method Selection Priority

1. **Primary**: `npm run test` / `npm run test:coverage` (uses project scripts)
2. **Secondary**: `npx vitest run` / `npx vitest run --coverage` (direct invocation)
3. **Fallback**: `npx vitest` (watch mode for interactive development)

## Error Scenarios

### Test Execution Failures
- Verify Vitest is installed: `npm list vitest`
- Check config file exists: `ls vitest.config.ts vitest.config.js vite.config.ts`
- Ensure test files match patterns in config
- Run `npx vitest --reporter=verbose` for detailed output

### Coverage Collection Failures
- Verify coverage provider is installed:
  - Istanbul: `npm list @vitest/coverage-istanbul`
  - V8: `npm list @vitest/coverage-v8`
- Install if missing: `npm install -D @vitest/coverage-istanbul`
- Check `coverage/` directory permissions

### Memory Issues
- Increase Node memory: `NODE_OPTIONS="--max-old-space-size=4096" npx vitest run`
- Reduce parallelism: `--maxWorkers=2`
- Use forks pool: `--pool=forks`

---

**Version**: 1.0.0
**Last Updated**: 2026-03-17
**Status**: Active
