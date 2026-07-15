# .NET Test CLI Commands

This document defines the CLI commands for .NET test framework operations in Phoenix OS.

Coverage operations are defined in `coverage-operations.md`.

**Stack**: dotnet
**Test Framework**: xUnit (default), NUnit, MSTest

---

## Core Test Execution

### Run All Tests
```bash
# Run all tests in solution
dotnet test

# Verbose output
dotnet test --verbosity detailed

# Run specific test project
dotnet test MyProject.Tests/

# With specific framework
dotnet test --framework net8.0
```

### Run Specific Tests
```bash
# By test name filter
dotnet test --filter "FullyQualifiedName~CalculatorTests"

# By test method
dotnet test --filter "FullyQualifiedName=Namespace.CalculatorTests.TestAdd"

# By trait/category
dotnet test --filter "Category=Unit"
```

### Test Discovery
```bash
# List all tests
dotnet test --list-tests

# List tests with filter
dotnet test --list-tests --filter "Category=Unit"
```

## Method Selection Priority

1. **Primary**: `dotnet test` (solution-level)
2. **Secondary**: `dotnet test MyProject.Tests/` (project-level)

---

**Version**: 1.0.0
**Last Updated**: 2026-05-26
**Status**: Active
