# Go Test CLI Commands

This document defines the CLI commands for Go test framework operations in Phoenix OS.

Coverage operations are defined in `coverage-operations.md`.

**Stack**: go
**Test Framework**: go test (built-in)

---

## Core Test Execution

### Run All Tests
```bash
# Run all tests in all packages
go test ./...

# Verbose output
go test -v ./...

# Short mode (skip long-running tests)
go test -short ./...

# With race detector
go test -race ./...
```

### Run Specific Tests
```bash
# Run tests in a specific package
go test ./pkg/calculator/

# Run tests matching pattern
go test -run "TestAdd" ./...

# Run specific sub-test
go test -run "TestCalculator/Add" ./...
```

### Test Discovery
```bash
# List all tests
go test -list '.*' ./...

# List tests in specific package
go test -list '.*' ./pkg/calculator/
```

## Method Selection Priority

1. **Primary**: `go test ./...` (all packages)
2. **Secondary**: `go test ./pkg/...` (specific package tree)

---

**Version**: 1.0.0
**Last Updated**: 2026-05-26
**Status**: Active
