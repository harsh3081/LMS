# JUnit Test Operations

This document defines test execution and validation operations for JUnit in Phoenix OS.

Coverage operations are defined in `coverage-operations.md`.

**Stack**: java
**Test Framework**: JUnit 5

---

## Test Execution

### Run All Tests
```bash
# Maven
mvn test

# Gradle
gradle test
```

### Run Specific Tests
```bash
# By class (Maven)
mvn test -Dtest=CalculatorTest

# By method (Maven)
mvn test -Dtest=CalculatorTest#testAdd

# By class (Gradle)
gradle test --tests CalculatorTest

# By method (Gradle)
gradle test --tests "CalculatorTest.testAdd"
```

## Test Output Parsing

### Maven Surefire Reports
```bash
# Reports location
ls target/surefire-reports/

# Parse XML reports
cat target/surefire-reports/TEST-*.xml
```

## Test Discovery

```bash
# Maven
mvn test -Dtest=* -DfailIfNoTests=false -q

# Gradle
gradle test --dry-run
```

## Method Selection Priority

1. **Primary**: `mvn test` (Maven projects)
2. **Secondary**: `gradle test` (Gradle projects)

---

**Version**: 1.0.0
**Last Updated**: 2026-05-26
**Status**: Active
