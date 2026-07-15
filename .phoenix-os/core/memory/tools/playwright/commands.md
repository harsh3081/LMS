# Playwright CLI Commands

This document defines the CLI commands for Playwright test framework operations in Phoenix OS.

## Core Test Execution

### Run All Tests
```bash
# Standard execution
npx playwright test

# With npm script (preferred)
npm run test:e2e

# With verbose output
npx playwright test --reporter=list
```

### Run Specific Tests
```bash
# Run tests matching pattern
npx playwright test --grep "{pattern}"

# Run specific test file
npx playwright test {path/to/test.spec.ts}

# Run tests in specific directory
npx playwright test {directory-path}

# Run tests matching title
npx playwright test --grep "upload profile picture"
```

### Run by Project/Browser
```bash
# Run in specific browser
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit

# Run in all browsers
npx playwright test
```

## Debug Mode

### Interactive Debug
```bash
# Run with Playwright Inspector
npx playwright test --debug

# Debug specific test
npx playwright test --debug {path/to/test.spec.ts}

# Head mode (visible browser)
npx playwright test --headed

# Slow motion
npx playwright test --headed --slowmo=500
```

### UI Mode
```bash
# Interactive UI mode (watch + trace)
npx playwright test --ui

# UI mode on specific port
npx playwright test --ui-port=8080
```

## Screenshot and Trace

### Screenshot Capture
```bash
# Screenshots are captured in tests via:
#   await page.screenshot({ path: 'screenshots/name.png' })
#   await page.screenshot({ path: 'screenshots/name.png', fullPage: true })

# Update snapshots
npx playwright test --update-snapshots
```

### Trace Collection
```bash
# Record trace for debugging
npx playwright test --trace on

# Record trace only on failure
npx playwright test --trace retain-on-failure

# View trace file
npx playwright show-trace trace.zip
```

## Reporter Options

### Built-in Reporters
```bash
# List reporter (line per test)
npx playwright test --reporter=list

# HTML reporter
npx playwright test --reporter=html

# JSON reporter
npx playwright test --reporter=json

# JUnit (CI/CD)
npx playwright test --reporter=junit

# Multiple reporters
npx playwright test --reporter=list,html
```

### Open HTML Report
```bash
# Open last HTML report
npx playwright show-report
```

## Installation and Setup

### Install Playwright
```bash
# Initialize Playwright in project
npm init playwright@latest

# Install browsers
npx playwright install

# Install specific browser
npx playwright install chromium

# Install system dependencies (Linux)
npx playwright install-deps
```

### Verify Installation
```bash
# Check Playwright version
npx playwright --version

# List installed browsers
npx playwright install --dry-run
```

## Parallel Execution

### Worker Configuration
```bash
# Set number of workers
npx playwright test --workers=4

# Use percentage of CPUs
npx playwright test --workers=50%

# Single worker (debugging)
npx playwright test --workers=1

# Fully parallel
npx playwright test --fully-parallel
```

## Retry and Timeout

### Retry Configuration
```bash
# Retry failed tests
npx playwright test --retries=2

# Set global timeout
npx playwright test --timeout=60000

# Set global expect timeout
npx playwright test --expect-timeout=10000
```

## Output and Artifacts

### Standard Output Locations
```
playwright-report/           # HTML report
test-results/                # Test artifacts (screenshots, traces, videos)
screenshots/                 # Custom screenshot directory
```

## CI/CD Integration

### GitHub Actions
```bash
# CI mode (all browsers, no retries)
npx playwright test --reporter=github,html

# CI with specific shard
npx playwright test --shard=1/3
```

### Common package.json Scripts
```json
{
  "scripts": {
    "test:e2e": "playwright test",
    "test:e2e:headed": "playwright test --headed",
    "test:e2e:debug": "playwright test --debug",
    "test:e2e:ui": "playwright test --ui",
    "test:e2e:report": "playwright show-report"
  }
}
```

## Method Selection Priority

1. **Primary**: npm run scripts (uses project configuration)
2. **Secondary**: Direct npx playwright commands
3. **Fallback**: Node direct execution

## Error Scenarios

### Playwright Not Installed
- Install: `npm init playwright@latest`
- Verify: `npx playwright --version`

### Browsers Not Installed
- Install: `npx playwright install`
- Check: `npx playwright install --dry-run`

### Test Execution Failures
- Check config file exists: `playwright.config.ts`
- Verify test files match patterns in config
- Ensure dev server is running if tests need it

---

**Version**: 1.0.0
**Last Updated**: 2026-03-20
**Status**: Active
