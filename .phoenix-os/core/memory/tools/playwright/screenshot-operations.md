# Playwright Screenshot Operations

This document defines screenshot capture, storage, and visual validation operations for Playwright in Phoenix OS.

## Screenshot Capture

### Page-Level Screenshots
```typescript
// Full page screenshot
await page.screenshot({ path: 'screenshots/page-full.png', fullPage: true });

// Viewport screenshot (visible area only)
await page.screenshot({ path: 'screenshots/page-viewport.png' });

// With specific quality (JPEG only)
await page.screenshot({ path: 'screenshots/page.jpg', quality: 80, type: 'jpeg' });
```

### Element-Level Screenshots
```typescript
// Screenshot specific element
const component = page.getByTestId('profile-picture-upload');
await component.screenshot({ path: 'screenshots/upload-component.png' });

// Screenshot by role
const avatar = page.getByRole('img', { name: /avatar/i });
await avatar.screenshot({ path: 'screenshots/avatar.png' });
```

### Conditional Screenshots
```typescript
// Screenshot on specific state
if (await page.getByRole('progressbar').isVisible()) {
  await page.screenshot({ path: 'screenshots/uploading-state.png' });
}

// Screenshot after waiting for state
await page.waitForSelector('[role="alert"]');
await page.screenshot({ path: 'screenshots/error-state.png' });
```

## Visual Comparison (Snapshot Testing)

### Baseline Comparison
```typescript
// Compare full page against baseline
await expect(page).toHaveScreenshot('login-page.png');

// Compare with tolerance
await expect(page).toHaveScreenshot('dashboard.png', {
  maxDiffPixelRatio: 0.05,  // 5% pixel difference allowed
});

// Compare with absolute pixel threshold
await expect(page).toHaveScreenshot('form.png', {
  maxDiffPixels: 100,  // Max 100 pixels different
});
```

### Element Comparison
```typescript
// Compare specific component
const card = page.getByTestId('profile-card');
await expect(card).toHaveScreenshot('profile-card.png');

// Compare with mask (ignore dynamic areas)
await expect(page).toHaveScreenshot('page.png', {
  mask: [page.getByTestId('timestamp')],  // Mask dynamic content
});
```

### Update Baselines
```bash
# Update all visual snapshots
npx playwright test --update-snapshots

# Update specific test snapshots
npx playwright test upload.spec.ts --update-snapshots
```

## Screenshot Storage

### Directory Structure
```
${config.specs.base-path}{issue-number}/validation/
├── snapshots/                    # Captured during validation
│   ├── default-avatar.png        # AC5: No picture state
│   ├── file-selected.png         # AC1: File picked state
│   ├── uploading-progress.png    # AC6: Upload in progress
│   ├── upload-complete.png       # AC4: After successful upload
│   ├── error-invalid-type.png    # AC1: Type rejection error
│   ├── error-file-too-large.png  # AC2: Size rejection error
│   └── full-form-integration.png # Integration: Full form with upload
```

### Naming Convention
```
{component}-{state}.png

Examples:
  default-avatar-sm.png
  default-avatar-md.png
  default-avatar-lg.png
  upload-empty-state.png
  upload-file-selected.png
  upload-in-progress.png
  upload-error-type.png
  upload-error-size.png
  upload-success.png
  form-with-upload.png
```

## Capture Points for Eval Criteria

### Standard Capture Points
For each eval criterion that has visual requirements, define capture points:

```typescript
// Capture point 1: Default state (no picture)
test('EVAL-032: DefaultAvatar renders correctly', async ({ page }) => {
  await page.goto('/profile/setup');
  await page.screenshot({
    path: 'validation/snapshots/default-avatar.png',
    fullPage: false,
  });
});

// Capture point 2: File selected (preview shown)
test('EVAL-036: File selected shows preview', async ({ page }) => {
  await page.goto('/profile/setup');
  await page.getByLabel(/upload/i).setInputFiles('fixtures/valid-photo.jpg');
  await page.screenshot({
    path: 'validation/snapshots/file-selected.png',
  });
});

// Capture point 3: Upload progress
test('EVAL-044: Progress bar during upload', async ({ page }) => {
  // Mock slow upload for screenshot
  await page.route('**/api/v1/profile/picture', async (route) => {
    await new Promise(r => setTimeout(r, 2000)); // Delay response
    await route.fulfill({ status: 200, body: '{}' });
  });
  await page.goto('/profile/setup');
  await page.getByLabel(/upload/i).setInputFiles('fixtures/valid-photo.jpg');
  await page.getByRole('button', { name: /upload/i }).click();
  await page.screenshot({
    path: 'validation/snapshots/uploading-progress.png',
  });
});

// Capture point 4: Error state
test('EVAL-054: Error message in alert', async ({ page }) => {
  await page.goto('/profile/setup');
  await page.getByLabel(/upload/i).setInputFiles('fixtures/invalid-file.gif');
  await page.screenshot({
    path: 'validation/snapshots/error-invalid-type.png',
  });
});
```

## Multimodal Validation Integration

### How Validation-Keeper Uses Screenshots
1. Playwright tests run and save screenshots to `validation/snapshots/`
2. Validation-Keeper reads each screenshot as an image
3. Validation-Keeper reads the corresponding spec requirement from spec.md
4. Validation-Keeper compares the visual output against the spec description
5. Validation-Keeper assigns confidence level (high/medium/low) per screenshot
6. Results written to `validation/validation-report.md`

### Screenshot-to-Spec Mapping
```markdown
| Screenshot | Spec Requirement | AC# |
|------------|-----------------|-----|
| default-avatar.png | "Default avatar displayed when no profile picture" | AC5 |
| file-selected.png | "Preview shown after file selection" | AC1 |
| uploading-progress.png | "Progress indicator during upload" | AC6 |
| error-invalid-type.png | "Clear error message for invalid format" | AC1 |
| error-file-too-large.png | "Clear error message for oversized file" | AC2 |
| upload-success.png | "Uploaded picture URL stored in profile" | AC4 |
```

## Method Selection Priority

1. **Primary**: `page.screenshot()` within Playwright tests
2. **Secondary**: `expect(page).toHaveScreenshot()` for visual comparison
3. **Fallback**: Manual screenshot capture via CLI

## Error Scenarios

### Screenshot Capture Failures
- Verify page has fully loaded: `await page.waitForLoadState('networkidle')`
- Check element exists before screenshot: `await element.waitFor()`
- Ensure directory exists and is writable

### Visual Comparison Failures
- Update baselines if intentional change: `--update-snapshots`
- Adjust tolerance for dynamic content: `maxDiffPixelRatio`
- Use masks for timestamps/dynamic areas

### Empty Screenshots
- Verify element is visible: `await expect(element).toBeVisible()`
- Check for CSS `visibility: hidden` or `opacity: 0`
- Wait for animations to complete

---

**Version**: 1.0.0
**Last Updated**: 2026-03-20
**Status**: Active
