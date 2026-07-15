# JUnit/Maven Configuration Detection

This document defines how to detect and read existing JUnit/Maven configuration in Phoenix OS.

Coverage operations are defined in `coverage-operations.md`.

**Stack**: java
**Test Framework**: JUnit 5
**Build Tool**: Maven (primary), Gradle (secondary)

---

## Configuration File Detection

### Priority Order (Maven)
1. `pom.xml` — Maven project configuration
2. `src/test/resources/` — Test resource directory

### Priority Order (Gradle)
1. `build.gradle` or `build.gradle.kts` — Gradle build configuration
2. `src/test/resources/` — Test resource directory

### Detect Configuration
```bash
# Check for Maven project
ls pom.xml 2>/dev/null && echo "Maven project"

# Check for Gradle project
ls build.gradle build.gradle.kts 2>/dev/null && echo "Gradle project"

# Check JUnit version in Maven
grep -A2 "junit-jupiter" pom.xml 2>/dev/null

# Check for JaCoCo plugin
grep "jacoco-maven-plugin" pom.xml 2>/dev/null
```

## Standard Paths

### Test File Locations
- `src/test/java/` — Test source directory (Maven/Gradle convention)
- `src/test/resources/` — Test resources directory
- `*Test.java` / `*Tests.java` — Test class naming convention

---

**Version**: 1.0.0
**Last Updated**: 2026-05-26
**Status**: Active
