# Go Test Operations

This document defines test execution and validation operations for Go in Phoenix OS.

Coverage operations are defined in `coverage-operations.md`.

**Stack**: go
**Test Framework**: go test (built-in)

---

## Test Execution

### Run All Tests
```bash
# All packages
go test ./...

# Verbose
go test -v ./...

# With coverage
go test -cover -coverprofile=coverage.out ./...
```

### Run Specific Tests
```bash
# By package
go test ./pkg/calculator/

# By test name pattern
go test -run "TestAdd" ./...

# By sub-test
go test -run "TestCalculator/Add" ./...
```

## Test Output Parsing

### Exit Codes
- `0` — All tests passed
- `1` — Some tests failed
- `2` — Test binary build failure

### JSON Output
```bash
# Machine-readable output
go test -json ./...
```

## Test Discovery

```bash
# List all tests
go test -list '.*' ./...

# List tests in package
go test -list '.*' ./pkg/calculator/
```

## Method Selection Priority

1. **Primary**: `go test ./...` (all packages)
2. **Secondary**: `go test -v ./...` (verbose for debugging)

---

**Version**: 1.0.0
**Last Updated**: 2026-05-26
**Status**: Active
