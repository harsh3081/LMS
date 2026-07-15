# Playwright Test Operations

This document defines test execution and validation operations for Playwright in Phoenix OS.

## Test Execution

### Run All E2E Tests
```bash
# Using npm script (preferred)
npm run test:e2e

# Direct Playwright execution
npx playwright test

# With specific reporter
npx playwright test --reporter=list
```

### Run Specific Test Files
```bash
# Run single test file
npx playwright test e2e/upload.spec.ts

# Run tests matching grep pattern
npx playwright test --grep "profile picture"

# Run tests in directory
npx playwright test e2e/profile/

# Run specific project (browser)
npx playwright test --project=chromium
```

## Test Structure Pattern

### E2E Test Pattern
```typescript
import { test, expect } from '@playwright/test';

test.describe('Profile Picture Upload', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/profile/setup');
  });

  test('should display default avatar when no picture uploaded', async ({ page }) => {
    // Assert default avatar is visible
    await expect(page.getByRole('img', { name: /default avatar/i })).toBeVisible();

    // Capture screenshot for visual validation
    await page.screenshot({ path: 'screenshots/default-avatar.png' });
  });

  test('should upload JPEG file and show preview', async ({ page }) => {
    // Upload file
    const fileInput = page.getByLabel(/upload/i);
    await fileInput.setInputFiles('e2e/fixtures/valid-photo.jpg');

    // Assert preview appears
    await expect(page.getByRole('img', { name: /preview/i })).toBeVisible();

    // Capture screenshot
    await page.screenshot({ path: 'screenshots/file-selected.png' });
  });

  test('should show progress bar during upload', async ({ page }) => {
    const fileInput = page.getByLabel(/upload/i);
    await fileInput.setInputFiles('e2e/fixtures/valid-photo.jpg');

    // Click upload button
    await page.getByRole('button', { name: /upload/i }).click();

    // Assert progress bar appears
    await expect(page.getByRole('progressbar')).toBeVisible();

    // Capture screenshot during upload
    await page.screenshot({ path: 'screenshots/uploading-progress.png' });
  });

  test('should reject invalid file type with error message', async ({ page }) => {
    const fileInput = page.getByLabel(/upload/i);
    await fileInput.setInputFiles('e2e/fixtures/invalid-file.gif');

    // Assert error message
    await expect(page.getByRole('alert')).toContainText(/invalid file type/i);

    // Capture screenshot
    await page.screenshot({ path: 'screenshots/error-invalid-type.png' });
  });
});
```

### Test Fixtures Pattern
```
e2e/
├── fixtures/                 # Test data files
│   ├── valid-photo.jpg       # Valid JPEG for upload tests
│   ├── valid-photo.png       # Valid PNG for upload tests
│   ├── invalid-file.gif      # Invalid format for rejection tests
│   ├── oversized-file.jpg    # >5MB for size limit tests
│   └── spoofed-file.jpg      # Wrong magic bytes for security tests
├── profile/
│   ├── upload.spec.ts        # Upload E2E tests
│   └── avatar.spec.ts        # Avatar display tests
└── playwright.config.ts      # E2E-specific config
```

## Screenshot Operations

### Capture Screenshots in Tests
```typescript
// Full page screenshot
await page.screenshot({ path: 'screenshots/full-page.png', fullPage: true });

// Element screenshot
const avatar = page.getByTestId('profile-avatar');
await avatar.screenshot({ path: 'screenshots/avatar-component.png' });

// Screenshot with clip region
await page.screenshot({
  path: 'screenshots/upload-area.png',
  clip: { x: 0, y: 0, width: 400, height: 300 }
});
```

### Visual Comparison (Snapshot Testing)
```typescript
// Compare against baseline screenshot
await expect(page).toHaveScreenshot('default-avatar.png');

// With threshold tolerance
await expect(page).toHaveScreenshot('upload-form.png', {
  maxDiffPixelRatio: 0.05,
});

// Element-level visual comparison
await expect(page.getByTestId('avatar')).toHaveScreenshot('avatar.png');
```

## Test Output Parsing

### JSON Output
```bash
# Generate JSON results
PLAYWRIGHT_JSON_OUTPUT_NAME=results.json npx playwright test --reporter=json

# Parse results
cat results.json | jq '.suites[].specs[] | {title: .title, status: .ok}'
```

### Parse Test Results
```bash
# Get pass/fail counts
cat results.json | jq '{
  total: [.suites[].specs[]] | length,
  passed: [.suites[].specs[] | select(.ok == true)] | length,
  failed: [.suites[].specs[] | select(.ok == false)] | length
}'
```

## API Mocking

### Mock API Responses
```typescript
test('should handle upload API response', async ({ page }) => {
  // Mock the upload endpoint
  await page.route('**/api/v1/profile/picture', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: { profilePictureUrl: 'https://cdn.example.com/photo.jpg' }
      }),
    });
  });

  // Perform upload action
  // ...
});
```

### Mock File Upload
```typescript
test('should upload file via form', async ({ page }) => {
  // Navigate to upload page
  await page.goto('/profile/setup');

  // Set file on input
  const fileChooserPromise = page.waitForEvent('filechooser');
  await page.getByLabel(/upload/i).click();
  const fileChooser = await fileChooserPromise;
  await fileChooser.setFiles('e2e/fixtures/valid-photo.jpg');
});
```

## Network Interception

### Wait for API Calls
```typescript
// Wait for upload request
const uploadPromise = page.waitForRequest('**/api/v1/profile/picture');
await page.getByRole('button', { name: /upload/i }).click();
const request = await uploadPromise;

// Wait for response
const responsePromise = page.waitForResponse('**/api/v1/profile/picture');
await page.getByRole('button', { name: /upload/i }).click();
const response = await responsePromise;
expect(response.status()).toBe(200);
```

## Accessibility Testing

### Built-in Accessibility Checks
```typescript
test('upload form should be accessible', async ({ page }) => {
  await page.goto('/profile/setup');

  // Run accessibility scan
  const accessibilityScanResults = await page.accessibility.snapshot();

  // Check specific ARIA attributes
  const progressbar = page.getByRole('progressbar');
  await expect(progressbar).toHaveAttribute('aria-valuemin', '0');
  await expect(progressbar).toHaveAttribute('aria-valuemax', '100');
});
```

## Method Selection Priority

1. **Primary**: `npm run test:e2e` (uses project scripts)
2. **Secondary**: `npx playwright test` (direct execution)
3. **Fallback**: Individual test file execution

## Error Scenarios

### Test Execution Failures
- Verify Playwright config exists: `ls playwright.config.*`
- Verify browsers installed: `npx playwright install`
- Ensure dev server is running or webServer config is set

### Screenshot Failures
- Verify screenshot directory exists and is writable
- Check page has loaded completely before screenshot
- Increase timeout for slow-loading pages

### Network/API Failures
- Use route mocking for API-dependent tests
- Verify baseURL in config matches running server
- Check for CORS issues in test environment

---

**Version**: 1.0.0
**Last Updated**: 2026-03-20
**Status**: Active
