# .NET Test Operations

This document defines test execution and validation operations for .NET in Phoenix OS.

Coverage operations are defined in `coverage-operations.md`.

**Stack**: dotnet
**Test Framework**: xUnit (default), NUnit, MSTest

---

## Test Execution

### Run All Tests
```bash
# Solution-level
dotnet test

# With verbose output
dotnet test --verbosity detailed

# With coverage
dotnet test --collect:"XPlat Code Coverage"
```

### Run Specific Tests
```bash
# By filter
dotnet test --filter "FullyQualifiedName~CalculatorTests"

# By category
dotnet test --filter "Category=Unit"

# Specific project
dotnet test MyProject.Tests/
```

## Test Output Parsing

### Exit Codes
- `0` — All tests passed
- `1` — Some tests failed or execution error

### TRX Report
```bash
# Generate TRX report
dotnet test --logger "trx;LogFileName=results.trx"

# Reports location
ls TestResults/*.trx
```

## Test Discovery

```bash
# List all tests
dotnet test --list-tests

# List with filter
dotnet test --list-tests --filter "Category=Unit"
```

## Method Selection Priority

1. **Primary**: `dotnet test` (solution-level)
2. **Secondary**: `dotnet test MyProject.Tests/` (project-level)

---

**Version**: 1.0.0
**Last Updated**: 2026-05-26
**Status**: Active
