# Jest CLI Commands

This document defines the CLI commands for Jest test framework operations in Phoenix OS.

## Core Test Execution

### Run All Tests
```bash
# Standard execution
npx jest

# With npm script (preferred)
npm run test

# With verbose output
npx jest --verbose
```

### Run Specific Tests
```bash
# Run tests matching pattern
npx jest --testPathPattern="{pattern}"

# Run specific test file
npx jest {path/to/test.test.ts}

# Run tests matching name pattern
npx jest --testNamePattern="{test-name}"

# Run tests in specific directory
npx jest {directory-path}
```

### Watch Mode
```bash
# Watch all tests
npx jest --watch

# Watch specific files
npx jest --watch --testPathPattern="{pattern}"

# Watch only changed files
npx jest --watchAll
```

## Coverage Commands

### Generate Coverage Report
```bash
# With coverage collection
npx jest --coverage

# Coverage with specific reporters
npx jest --coverage --coverageReporters=text --coverageReporters=lcov --coverageReporters=json-summary

# Coverage for specific files
npx jest --coverage --collectCoverageFrom="{pattern}"
```

### Coverage Thresholds
```bash
# Run with threshold enforcement
npx jest --coverage --coverageThreshold='{"global":{"branches":75,"functions":80,"lines":80,"statements":80}}'
```

## Output Formatting

### Reporter Options
```bash
# JSON output
npx jest --json --outputFile="{output-path}"

# JUnit format (CI/CD)
npx jest --reporters=default --reporters=jest-junit

# Custom reporter
npx jest --reporters="{reporter-path}"
```

### Silent Mode
```bash
# Suppress console output during tests
npx jest --silent

# Show only summary
npx jest --silent --verbose=false
```

## Configuration

### Config File Usage
```bash
# Use specific config
npx jest --config={config-path}

# Show current config
npx jest --showConfig
```

### Environment Options
```bash
# Set Node environment
npx jest --env=jsdom

# Set timezone
TZ=UTC npx jest

# Pass Node options
NODE_OPTIONS="--max-old-space-size=4096" npx jest
```

## Cache Management

### Clear Cache
```bash
# Clear Jest cache
npx jest --clearCache

# Run without cache
npx jest --no-cache
```

## Debugging

### Debug Mode
```bash
# Run with Node inspector
node --inspect-brk node_modules/.bin/jest --runInBand

# Detect open handles
npx jest --detectOpenHandles

# Run in band (sequential)
npx jest --runInBand
```

### Error Handling
```bash
# Bail on first failure
npx jest --bail

# Bail after N failures
npx jest --bail=3

# Force exit after tests complete
npx jest --forceExit
```

## Parallel Execution

### Worker Configuration
```bash
# Set max workers
npx jest --maxWorkers=4

# Use percentage of CPUs
npx jest --maxWorkers=50%

# Single worker (debugging)
npx jest --runInBand
```

## Update Snapshots

```bash
# Update all snapshots
npx jest --updateSnapshot

# Update specific snapshot
npx jest --updateSnapshot --testNamePattern="{test-name}"
```

## Integration with npm Scripts

### Common package.json Scripts
```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:ci": "jest --ci --coverage --reporters=default --reporters=jest-junit"
  }
}
```

## Method Selection Priority

1. **Primary**: npm run scripts (uses project configuration)
2. **Secondary**: Direct npx jest commands
3. **Fallback**: Node direct execution

## Error Scenarios

### Test Execution Failures
- Verify Jest is installed: `npm list jest`
- Check config file exists and is valid
- Ensure test files match patterns in config

### Coverage Collection Failures
- Verify coverage providers are installed
- Check collectCoverageFrom patterns
- Ensure source files are accessible

### Memory Issues
- Increase Node memory: `NODE_OPTIONS="--max-old-space-size=4096"`
- Reduce parallelism: `--maxWorkers=2`
- Run in band: `--runInBand`

---

**Version**: 1.0.0
**Last Updated**: 2025-11-25
**Status**: Active
