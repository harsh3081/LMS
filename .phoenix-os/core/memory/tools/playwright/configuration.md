# Playwright Configuration Detection

This document defines how to detect and read existing Playwright configuration in Phoenix OS.

## Configuration File Detection

### Priority Order
1. `playwright.config.ts` - TypeScript configuration (preferred)
2. `playwright.config.js` - JavaScript configuration
3. `playwright.config.mjs` - ESM configuration

### Detect Configuration
```bash
# Check for configuration files
ls -la playwright.config.* 2>/dev/null || echo "No playwright config found"

# Check if Playwright is installed
npx playwright --version 2>/dev/null || echo "Playwright not installed"

# Check package.json for Playwright dependency
cat package.json | jq '.devDependencies["@playwright/test"] // .dependencies["@playwright/test"] // "not installed"'
```

## Reading Configuration

### Standard Configuration Structure
```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
```

### Extract Key Settings
```bash
# Show test directory
grep -i "testDir" playwright.config.* 2>/dev/null

# Show base URL
grep -i "baseURL" playwright.config.* 2>/dev/null

# Show web server config
grep -A5 "webServer" playwright.config.* 2>/dev/null

# Show projects/browsers
grep -A3 "projects" playwright.config.* 2>/dev/null
```

## Standard Paths

### Test File Locations
- `e2e/` - Common E2E test directory
- `tests/` - Alternative test directory
- `**/*.spec.ts` - Playwright test file pattern (convention)

### Output Locations
- `playwright-report/` - HTML report
- `test-results/` - Artifacts (screenshots, traces, videos)

## Web Server Configuration

### Dev Server Auto-Start
Playwright can automatically start the dev server before tests:
```typescript
webServer: {
  command: 'npm run dev',        // Command to start server
  url: 'http://localhost:3000',  // URL to wait for
  reuseExistingServer: true,     // Use running server if available
  timeout: 120000,               // Max wait time (ms)
}
```

### Detect Dev Server Command
```bash
# Check package.json for dev script
cat package.json | jq '.scripts.dev // .scripts.start // "no dev script found"'
```

## Screenshot Configuration

### Per-Test Screenshots
```typescript
use: {
  screenshot: 'on',              // Always capture
  screenshot: 'only-on-failure', // Only on failure
  screenshot: 'off',             // Never capture
}
```

### Custom Screenshot Directory
```typescript
use: {
  screenshot: {
    mode: 'on',
    fullPage: true,
  },
}
// Screenshots saved to test-results/
```

## Method Selection Priority

1. **Primary**: Read existing playwright.config.ts
2. **Secondary**: Check package.json for Playwright dependency
3. **Fallback**: Use default Playwright patterns

## Error Scenarios

### Configuration Not Found
- Check for playwright.config.ts in project root
- Verify Playwright is in package.json dependencies
- Initialize if needed: `npm init playwright@latest`

### Invalid Configuration
- Run `npx playwright test --list` to validate
- Check for syntax errors in config file
- Verify TypeScript compilation

---

**Version**: 1.0.0
**Last Updated**: 2026-03-20
**Status**: Active
