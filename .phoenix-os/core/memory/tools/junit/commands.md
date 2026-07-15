# JUnit/Maven CLI Commands

This document defines the CLI commands for JUnit test framework operations (via Maven) in Phoenix OS.

Coverage operations are defined in `coverage-operations.md`.

**Stack**: java
**Test Framework**: JUnit 5
**Build Tool**: Maven (primary), Gradle (secondary)

---

## Core Test Execution

### Run All Tests (Maven)
```bash
# Run all tests
mvn test

# Run with verbose output
mvn test -X

# Skip compilation (tests only)
mvn test -pl .

# Run specific test class
mvn test -Dtest=CalculatorTest

# Run specific test method
mvn test -Dtest=CalculatorTest#testAdd
```

### Run All Tests (Gradle)
```bash
# Run all tests
gradle test

# Run with verbose output
gradle test --info

# Run specific test class
gradle test --tests CalculatorTest
```

### Test Discovery
```bash
# List tests (Maven)
mvn test -Dtest=* -DfailIfNoTests=false -q

# List tests (Gradle)
gradle test --dry-run
```

## Method Selection Priority

1. **Primary**: `mvn test` (Maven projects)
2. **Secondary**: `gradle test` (Gradle projects)

---

**Version**: 1.0.0
**Last Updated**: 2026-05-26
**Status**: Active
