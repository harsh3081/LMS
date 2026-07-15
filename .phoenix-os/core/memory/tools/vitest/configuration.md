# Vitest Configuration Detection

This document defines how to detect and read existing Vitest configuration in Phoenix OS.

## Configuration File Detection

### Priority Order
1. `vitest.config.ts` — TypeScript Vitest configuration (dedicated, highest priority)
2. `vitest.config.js` — JavaScript Vitest configuration (dedicated)
3. `vite.config.ts` — Vite configuration with `test` field (shared config)
4. `vite.config.js` — JavaScript Vite configuration with `test` field
5. `package.json` `vitest` field — Inline configuration (less common)

**Note**: Vitest extends Vite configuration. A `vitest.config.ts` file always takes precedence over `vite.config.ts`. When only `vite.config.ts` exists, Vitest reads the `test` key from it.

### Detect Configuration
```bash
# Check for Vitest-specific config files
ls -la vitest.config.ts vitest.config.js 2>/dev/null || echo "No dedicated vitest config"

# Check for Vite config with test section
ls -la vite.config.ts vite.config.js 2>/dev/null && echo "Vite config found"

# Check if Vitest is installed
npm list vitest 2>/dev/null | grep vitest

# Check coverage providers
npm list @vitest/coverage-istanbul @vitest/coverage-v8 2>/dev/null

# Show current Vitest configuration
npx vitest run --reporter=verbose 2>&1 | head -20
```

### Configuration File Examples

**vitest.config.ts** (dedicated Vitest config — recommended):
```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test-setup.ts'],
    include: ['**/*.{test,spec}.{ts,tsx}'],
    exclude: ['node_modules', 'dist'],
    coverage: {
      provider: 'istanbul',       // Primary recommendation (consistent with Jest pipeline)
      reporter: ['text', 'json-summary', 'html', 'lcov'],
      reportsDirectory: './coverage',
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.d.ts',
        'src/**/*.test.{ts,tsx}',
        'src/**/*.spec.{ts,tsx}',
        'src/**/index.ts',
      ],
      thresholds: {
        lines: 80,
        branches: 75,
        functions: 80,
        statements: 80,
      },
    },
  },
});
```

**vite.config.ts** (shared Vite + Vitest config):
```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test-setup.ts'],
    coverage: {
      provider: 'istanbul',
      reporter: ['text', 'json-summary'],
      reportsDirectory: './coverage',
    },
  },
});
```

**Coverage Provider Configuration**:
```typescript
// istanbul (default recommendation — consistent with Jest coverage-summary.json format)
coverage: {
  provider: 'istanbul',   // Requires: npm install -D @vitest/coverage-istanbul
  reporter: ['json-summary', 'text', 'html', 'lcov'],
  reportsDirectory: './coverage',
}

// V8 (alternative — faster, uses V8's built-in coverage)
coverage: {
  provider: 'v8',         // Requires: npm install -D @vitest/coverage-v8
  reporter: ['json-summary', 'text', 'html'],
  reportsDirectory: './coverage',
}
```

## Reading Configuration

### Extract Test Patterns
```bash
# Get testMatch/include patterns from config
# Read vitest.config.ts directly or run:
npx vitest run --reporter=verbose 2>&1 | grep -E "include|exclude|pattern"

# Check globals setting (required for describe/it/expect without imports)
grep -r "globals" vitest.config.ts vite.config.ts 2>/dev/null
```

### Extract Coverage Settings
```bash
# Read coverage provider
grep -r "provider" vitest.config.ts vite.config.ts 2>/dev/null

# Read coverage output directory
grep -r "reportsDirectory" vitest.config.ts vite.config.ts 2>/dev/null

# Read coverage thresholds
grep -r "thresholds" vitest.config.ts vite.config.ts 2>/dev/null
```

### Extract Coverage Directory
```bash
# Default coverage output (relative to project root)
ls -la coverage/ 2>/dev/null && echo "Coverage directory found"

# Primary coverage summary file (istanbul provider)
ls -la coverage/coverage-summary.json 2>/dev/null && echo "Coverage summary found"

# V8 provider produces same filename
ls -la coverage/coverage-summary.json 2>/dev/null

# coverage/coverage-summary.json is the primary output (matches command-interface.md coverage_output for vitest)
```

## Standard Paths

### Test File Locations
- `src/**/*.test.ts` — TypeScript test files (Vitest default)
- `src/**/*.spec.ts` — Specification test files (Vitest default)
- `src/**/*.test.tsx` — React component test files
- `src/**/*.spec.tsx` — React component spec files
- `__tests__/**/*.ts` — Centralized test directory (Jest-compatible)
- `**/*.test.ts` — Flat project structure

**Note**: Vitest uses the same test file discovery conventions as Jest by default.

### Coverage Output
```
coverage/
├── coverage-summary.json  # Primary machine-readable output (matches command-interface.md)
├── lcov.info              # LCOV format (for coverage tools)
├── index.html             # HTML entry point
└── lcov-report/           # HTML report files
    └── index.html
```

**Primary coverage output**: `coverage/coverage-summary.json` (relative to repository root)
This matches the `coverage_output` value for Vitest in `command-interface.md`.

### Coverage Provider Packages
- `@vitest/coverage-istanbul` — Istanbul provider (default recommendation)
- `@vitest/coverage-v8` — V8 native provider (alternative)

Both providers produce `coverage/coverage-summary.json` with the same schema as Jest's output.

## Method Selection Priority

1. **Primary**: Read `vitest.config.ts` for dedicated Vitest configuration
2. **Secondary**: Read `vite.config.ts` `test` field when no dedicated Vitest config exists
3. **Fallback**: Use Vitest defaults (discovers `*.test.ts` and `*.spec.ts` files)

## Error Scenarios

### Configuration Not Found
- If no config file found, Vitest uses defaults: discovers `**/*.{test,spec}.{ts,js,tsx,jsx}` in project
- Run `npx vitest run` to verify default discovery works

### Invalid Configuration
- Run `npx vitest run --reporter=verbose` to see configuration errors immediately
- Check TypeScript syntax in `vitest.config.ts`: `npx tsc --noEmit vitest.config.ts`
- Verify Vitest version compatibility with installed plugins

### Coverage Provider Not Installed
- Error: `Error: Missing "@vitest/coverage-istanbul" package`
- Fix: `npm install -D @vitest/coverage-istanbul`
- Alternative: `npm install -D @vitest/coverage-v8`

---

**Version**: 1.0.0
**Last Updated**: 2026-03-17
**Status**: Active
