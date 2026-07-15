# Jest Coverage Operations

This document defines coverage collection and analysis operations for Jest in Phoenix OS.

## Coverage Collection

### Generate Coverage Report
```bash
# Standard coverage collection
npm run test:coverage

# Direct Jest command
npx jest --coverage

# Coverage with specific config
npx jest --coverage --config=jest.config.ts
```

### Coverage with Reporters
```bash
# Multiple reporter formats
npx jest --coverage \
  --coverageReporters=text \
  --coverageReporters=lcov \
  --coverageReporters=json-summary

# CI-friendly output
npx jest --coverage --coverageReporters=text-summary --coverageReporters=json-summary
```

## Coverage Output Locations

### Standard Output Structure
```
coverage/
├── lcov-report/          # HTML report
│   └── index.html        # Main coverage report
├── coverage-summary.json # JSON summary (machine-readable)
├── coverage-final.json   # Detailed coverage data
└── lcov.info             # LCOV format
```

### Coverage Summary JSON Format
```json
{
  "total": {
    "lines": { "total": 1000, "covered": 850, "skipped": 0, "pct": 85 },
    "statements": { "total": 1200, "covered": 1000, "skipped": 0, "pct": 83.33 },
    "functions": { "total": 200, "covered": 170, "skipped": 0, "pct": 85 },
    "branches": { "total": 300, "covered": 230, "skipped": 0, "pct": 76.67 }
  },
  "path/to/file.ts": {
    "lines": { "total": 50, "covered": 45, "skipped": 0, "pct": 90 },
    "statements": { "total": 60, "covered": 55, "skipped": 0, "pct": 91.67 },
    "functions": { "total": 10, "covered": 9, "skipped": 0, "pct": 90 },
    "branches": { "total": 15, "covered": 12, "skipped": 0, "pct": 80 }
  }
}
```

## Reading Coverage Data

### Parse Coverage Summary
```bash
# Get overall coverage percentages
cat coverage/coverage-summary.json | jq '.total'

# Get line coverage percentage
cat coverage/coverage-summary.json | jq '.total.lines.pct'

# Get files below threshold
cat coverage/coverage-summary.json | jq 'to_entries | .[] | select(.value.lines.pct < 80) | {file: .key, coverage: .value.lines.pct}'
```

### Extract Uncovered Files
```bash
# Find files with low coverage
cat coverage/coverage-summary.json | jq -r '
  to_entries |
  .[] |
  select(.key != "total") |
  select(.value.lines.pct < 80) |
  "\(.key): \(.value.lines.pct)%"
'
```

## Coverage Thresholds

### Standard Thresholds (Enterprise)
```json
{
  "coverageThreshold": {
    "global": {
      "branches": 75,
      "functions": 80,
      "lines": 80,
      "statements": 80
    }
  }
}
```

### Per-File Thresholds
```json
{
  "coverageThreshold": {
    "global": {
      "branches": 75,
      "functions": 80,
      "lines": 80,
      "statements": 80
    },
    "./src/core/**/*.ts": {
      "branches": 90,
      "functions": 90,
      "lines": 90,
      "statements": 90
    },
    "./src/utils/**/*.ts": {
      "branches": 85,
      "functions": 85,
      "lines": 85,
      "statements": 85
    }
  }
}
```

## Coverage Collection Patterns

### Collect from Specific Paths
```bash
# Collect coverage from src directory
npx jest --coverage --collectCoverageFrom="src/**/*.{ts,tsx}"

# Exclude test files
npx jest --coverage --collectCoverageFrom="!src/**/*.test.{ts,tsx}"

# Multiple patterns
npx jest --coverage \
  --collectCoverageFrom="src/**/*.{ts,tsx}" \
  --collectCoverageFrom="!src/**/*.d.ts" \
  --collectCoverageFrom="!src/**/__tests__/**"
```

### Coverage for Changed Files Only
```bash
# Coverage for uncommitted changes
npx jest --coverage --changedSince=HEAD

# Coverage for files changed since branch point
npx jest --coverage --changedSince=main
```

## Analyzing Coverage Gaps

### Identify Uncovered Functions
```bash
# Parse coverage-final.json for uncovered functions
cat coverage/coverage-final.json | jq '
  to_entries |
  .[] |
  {
    file: .key,
    uncovered_functions: [
      .value.fnMap | to_entries | .[] |
      select(.value.decl.start.line as $line |
        .key as $id |
        (.value.f // 0) == 0
      ) |
      .value.name
    ]
  } |
  select(.uncovered_functions | length > 0)
'
```

### Identify Uncovered Lines
```bash
# Get uncovered line numbers per file
cat coverage/coverage-final.json | jq '
  to_entries |
  .[] |
  {
    file: .key,
    uncovered_lines: [
      .value.s | to_entries | .[] |
      select(.value == 0) |
      .key | tonumber
    ]
  } |
  select(.uncovered_lines | length > 0)
'
```

## Coverage Comparison

### Compare Coverage Between Runs
```bash
# Store baseline coverage
cp coverage/coverage-summary.json coverage/baseline.json

# Run tests again
npm run test:coverage

# Compare coverage
diff <(cat coverage/baseline.json | jq '.total.lines.pct') \
     <(cat coverage/coverage-summary.json | jq '.total.lines.pct')
```

### Delta Coverage Analysis
```javascript
// Script to compare coverage summaries
const baseline = require('./coverage/baseline.json');
const current = require('./coverage/coverage-summary.json');

const delta = {
  lines: current.total.lines.pct - baseline.total.lines.pct,
  branches: current.total.branches.pct - baseline.total.branches.pct,
  functions: current.total.functions.pct - baseline.total.functions.pct,
  statements: current.total.statements.pct - baseline.total.statements.pct
};

console.log('Coverage Delta:', delta);
```

## CI/CD Integration

### GitHub Actions Coverage
```yaml
- name: Run Tests with Coverage
  run: npm run test:coverage

- name: Check Coverage Thresholds
  run: |
    COVERAGE=$(cat coverage/coverage-summary.json | jq '.total.lines.pct')
    if (( $(echo "$COVERAGE < 80" | bc -l) )); then
      echo "Coverage $COVERAGE% is below threshold 80%"
      exit 1
    fi
```

### Coverage Badge Generation
```bash
# Generate coverage badge data
cat coverage/coverage-summary.json | jq '{
  schemaVersion: 1,
  label: "coverage",
  message: "\(.total.lines.pct | tostring)%",
  color: (if .total.lines.pct >= 80 then "green" elif .total.lines.pct >= 60 then "yellow" else "red" end)
}'
```

## Method Selection Priority

1. **Primary**: `npm run test:coverage` (uses project scripts)
2. **Secondary**: `npx jest --coverage` (direct execution)
3. **Fallback**: Parse existing coverage files if tests cannot run

## Error Scenarios

### Coverage Collection Failures
- Verify Jest is installed: `npm list jest`
- Check coverage directory permissions
- Ensure source files are accessible

### Threshold Enforcement Failures
- Review coverageThreshold in jest.config
- Check if exclusion patterns are too broad
- Verify collectCoverageFrom patterns

### Missing Coverage Data
- Verify coverage reporters are configured
- Check coverageDirectory path
- Ensure tests complete successfully before checking coverage

---

**Version**: 1.0.0
**Last Updated**: 2025-11-25
**Status**: Active
