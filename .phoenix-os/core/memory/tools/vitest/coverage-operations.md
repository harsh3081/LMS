# Vitest Coverage Operations

This document defines coverage collection and analysis operations for Vitest in Phoenix OS.

**Coverage Tool**: @vitest/coverage-istanbul (default recommendation) or @vitest/coverage-v8
**Stack**: nodejs (Vitest variant — when `stackDescriptor.testFramework` is `vitest`)
**Native Output Format**: JSON (`coverage-summary.json` — same format as Jest for both providers)
**Coverage Output Path**: `coverage/coverage-summary.json` (relative to repository root)

## Coverage Collection

### Generate Coverage Report
```bash
# Run tests with coverage (istanbul provider — primary recommendation)
npx vitest run --coverage

# Explicit provider selection
npx vitest run --coverage --coverage.provider=istanbul

# With V8 provider (alternative)
npx vitest run --coverage --coverage.provider=v8

# Multiple output formats
npx vitest run --coverage \
  --coverage.reporter=text \
  --coverage.reporter=json-summary \
  --coverage.reporter=html

# With coverage directory
npx vitest run --coverage --coverage.reportsDirectory=coverage
```

### Coverage Provider Selection

**Istanbul provider** (recommended default):
- Install: `npm install -D @vitest/coverage-istanbul`
- Uses istanbul instrumentation (same engine as Jest)
- Output: `coverage/coverage-summary.json` — identical format to Jest's output
- All four dimensions available: `lines`, `branches`, `functions`, `statements`
- Produces `coverage-summary.json` that is a near-identity transform to the normalized schema

**V8 provider** (alternative):
- Install: `npm install -D @vitest/coverage-v8`
- Uses Node.js V8 built-in coverage (faster, no instrumentation overhead)
- Output: `coverage/coverage-summary.json` — same keys as istanbul, V8 instrumentation source
- All four dimensions available: `lines`, `branches`, `functions`, `statements`
- Slightly different numeric values than istanbul for the same code (V8 vs istanbul counting)

**Recommendation**: Use istanbul provider for consistency with Jest-based pipelines. Both providers produce `coverage-summary.json` at the same path with the same schema.

### Coverage Provider via vitest.config.ts
```typescript
export default defineConfig({
  test: {
    coverage: {
      provider: 'istanbul',  // or 'v8'
      reporter: ['json-summary', 'text', 'html', 'lcov'],
      reportsDirectory: './coverage',
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.{test,spec}.{ts,tsx}', 'src/**/*.d.ts'],
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

## Coverage Output Locations

### Standard Output Structure
```
coverage/
├── coverage-summary.json  # PRIMARY — machine-readable summary (same format as Jest)
├── lcov.info              # LCOV format (for Codecov, SonarQube)
├── index.html             # HTML report entry point
└── [source-tree files]    # Annotated source files (HTML)
```

**Primary coverage output**: `coverage/coverage-summary.json` (relative to repository root)
This matches the `coverage_output` for the Vitest stack in `command-interface.md`.

### Coverage Summary JSON Format
Both istanbul and V8 providers produce the same `coverage-summary.json` schema as Jest:

```json
{
  "total": {
    "lines": { "total": 1000, "covered": 850, "skipped": 0, "pct": 85 },
    "statements": { "total": 1200, "covered": 1000, "skipped": 0, "pct": 83.33 },
    "functions": { "total": 200, "covered": 170, "skipped": 0, "pct": 85 },
    "branches": { "total": 300, "covered": 230, "skipped": 0, "pct": 76.67 }
  },
  "src/calculator.ts": {
    "lines": { "total": 50, "covered": 45, "skipped": 0, "pct": 90 },
    "statements": { "total": 60, "covered": 55, "skipped": 0, "pct": 91.67 },
    "functions": { "total": 10, "covered": 9, "skipped": 0, "pct": 90 },
    "branches": { "total": 15, "covered": 12, "skipped": 0, "pct": 80 }
  }
}
```

**Note**: This format is identical to Jest's `coverage-summary.json`. The normalization procedure for Vitest is a near-identity transform.

## Reading Coverage Data

### Parse Coverage Summary
```bash
# Get overall coverage percentages
cat coverage/coverage-summary.json | jq '.total'

# Get line coverage percentage
cat coverage/coverage-summary.json | jq '.total.lines.pct'

# Get files below threshold
cat coverage/coverage-summary.json | jq '
  to_entries |
  .[] |
  select(.key != "total") |
  select(.value.lines.pct < 80) |
  {file: .key, coverage: .value.lines.pct}
'
```

## Normalization to Schema

This section describes how to transform the native `coverage/coverage-summary.json` output into the normalized coverage schema defined in `standards.md`.

### Normalization Procedure

1. Open `coverage/coverage-summary.json` (relative path from repository root).
2. Read the `total` object for aggregate data.
3. Map fields as follows (near-identity transform since Vitest uses the same format as Jest):

   | Normalized field | Source field | Calculation |
   |-----------------|--------------|-------------|
   | `lines.covered` | `total.lines.covered` | direct |
   | `lines.total` | `total.lines.total` | direct |
   | `lines.pct` | `total.lines.pct` | direct |
   | `branches.covered` | `total.branches.covered` | direct |
   | `branches.total` | `total.branches.total` | direct |
   | `branches.pct` | `total.branches.pct` | direct |
   | `functions.covered` | `total.functions.covered` | direct |
   | `functions.total` | `total.functions.total` | direct |
   | `functions.pct` | `total.functions.pct` | direct |
   | `statements.covered` | `total.statements.covered` | direct |
   | `statements.total` | `total.statements.total` | direct |
   | `statements.pct` | `total.statements.pct` | direct |

4. For per-file data: iterate all keys except `total`; the key is the file path, value has the same structure.
5. Drop the `skipped` field from each dimension (not part of normalized schema).

### N/A Dimensions

For the **istanbul provider**: all four dimensions (`lines`, `branches`, `functions`, `statements`) are numeric.
For the **V8 provider**: all four dimensions are also numeric.

No dimensions are `"N/A"` for Vitest — this is a key difference from non-Node.js stacks.

### Inline Worked Example

**Native fixture** (`coverage/coverage-summary.json` from `npx vitest run --coverage`):
```json
{
  "total": {
    "lines": { "total": 1000, "covered": 850, "skipped": 0, "pct": 85 },
    "statements": { "total": 1200, "covered": 1000, "skipped": 0, "pct": 83.33 },
    "functions": { "total": 200, "covered": 170, "skipped": 0, "pct": 85 },
    "branches": { "total": 300, "covered": 230, "skipped": 0, "pct": 76.67 }
  },
  "src/calculator.ts": {
    "lines": { "total": 50, "covered": 45, "skipped": 0, "pct": 90 },
    "statements": { "total": 60, "covered": 55, "skipped": 0, "pct": 91.67 },
    "functions": { "total": 10, "covered": 9, "skipped": 0, "pct": 90 },
    "branches": { "total": 15, "covered": 12, "skipped": 0, "pct": 80 }
  }
}
```

**Normalized output** (conforming to schema in `standards.md`):
```json
{
  "total": {
    "lines":      { "pct": 85,    "covered": 850,  "total": 1000 },
    "statements": { "pct": 83.33, "covered": 1000, "total": 1200 },
    "functions":  { "pct": 85,    "covered": 170,  "total": 200 },
    "branches":   { "pct": 76.67, "covered": 230,  "total": 300 }
  },
  "files": [
    {
      "path": "src/calculator.ts",
      "lines":      { "pct": 90,    "covered": 45, "total": 50 },
      "statements": { "pct": 91.67, "covered": 55, "total": 60 },
      "functions":  { "pct": 90,    "covered": 9,  "total": 10 },
      "branches":   { "pct": 80,    "covered": 12, "total": 15 }
    }
  ]
}
```

**Transform notes**:
- Drop the `skipped` field from each dimension.
- Restructure per-file entries from keyed-object (key = file path) to `files` array with explicit `path` field.
- The `total` block field names (`pct`, `covered`, `total`) are identical to the normalized schema — near-identity transform.
- All four dimensions are numeric for Vitest (no `"N/A"` sentinels needed).
- This transform is identical to Jest's normalization (Example 1 in `standards.md`).

### Schema Reference

Full normalized schema definition: see `standards.md` "Normalised Coverage Schema" section.
Per-stack dimension availability: see `standards.md` "Per-Stack Dimension Availability" table.
For nodejs/Vitest: `lines` = numeric, `branches` = numeric, `functions` = numeric, `statements` = numeric.

## Coverage Collection Patterns

### Exclude Files from Coverage
```typescript
// vitest.config.ts
coverage: {
  exclude: [
    'src/**/*.d.ts',
    'src/**/*.test.{ts,tsx}',
    'src/**/*.spec.{ts,tsx}',
    'src/**/index.ts',        // Re-exports only
    'src/**/__mocks__/**',
    'src/**/*.stories.{ts,tsx}',
  ],
}
```

## Method Selection Priority

1. **Primary**: `npx vitest run --coverage` (uses `vitest.config.ts` settings)
2. **Secondary**: `npm run test:coverage` (uses project scripts)
3. **Fallback**: Parse existing `coverage/coverage-summary.json` if tests cannot run

## Error Scenarios

### Coverage Collection Failures
- Verify coverage provider is installed: `npm list @vitest/coverage-istanbul`
- Install if missing: `npm install -D @vitest/coverage-istanbul`
- Check `coverage/` directory write permissions
- Ensure `--coverage` flag is present (or `coverage.enabled: true` in config)

### Missing coverage-summary.json
- Confirm `json-summary` is in `coverage.reporter` array in `vitest.config.ts`
- Default: `npx vitest run --coverage --coverage.reporter=json-summary`
- Check custom `reportsDirectory` — default is `coverage/`

### V8 vs Istanbul Differences
- V8 produces slightly different coverage numbers for the same code (different instrumentation)
- If switching providers, expect minor percentage changes — not errors
- Both produce `coverage/coverage-summary.json` at the same path with the same schema

---

**Version**: 1.0.0
**Last Updated**: 2026-03-17
**Status**: Active
