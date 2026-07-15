# JaCoCo Coverage Operations

This document defines coverage collection, parsing, and normalisation procedures for Java projects using JaCoCo. It is the authoritative reference for the `parse_coverage` operation when `stackDescriptor.stackName` is `java`.

**Coverage Tool**: JaCoCo
**Stack**: java
**Native Output Format**: XML (`jacoco.xml`)
**Coverage Output Path**: `target/site/jacoco/jacoco.xml` (relative to repository root)

---

## Coverage Collection

### Generate Coverage Report

```bash
# Maven: run tests with JaCoCo agent and generate XML report
mvn test jacoco:report

# Gradle: run tests with JaCoCo plugin
gradle test jacocoTestReport
```

The JaCoCo Maven plugin produces an XML report at `target/site/jacoco/jacoco.xml` by default. Gradle projects may output to `build/reports/jacoco/test/jacocoTestReport.xml`.

---

## Native Output Format

### jacoco.xml Structure

JaCoCo produces an XML report with `<counter>` elements at multiple levels (report, package, class, method). Each counter has a `type` attribute and `missed`/`covered` integer attributes.

```xml
<report name="my-project">
  <!-- Report-level counters (aggregated totals) -->
  <counter type="INSTRUCTION" missed="180" covered="820"/>
  <counter type="BRANCH" missed="45" covered="155"/>
  <counter type="LINE" missed="60" covered="340"/>
  <counter type="COMPLEXITY" missed="30" covered="70"/>
  <counter type="METHOD" missed="15" covered="85"/>
  <counter type="CLASS" missed="2" covered="18"/>

  <package name="com/example">
    <class name="com/example/Main" sourcefilename="Main.java">
      <counter type="INSTRUCTION" missed="90" covered="410"/>
      <counter type="BRANCH" missed="20" covered="80"/>
      <counter type="LINE" missed="30" covered="170"/>
      <counter type="METHOD" missed="8" covered="42"/>
    </class>
    <class name="com/example/Util" sourcefilename="Util.java">
      <counter type="INSTRUCTION" missed="90" covered="410"/>
      <counter type="BRANCH" missed="25" covered="75"/>
      <counter type="LINE" missed="30" covered="170"/>
      <counter type="METHOD" missed="7" covered="43"/>
    </class>
  </package>
</report>
```

### Counter Types

| Counter Type | Description | Maps to Normalised Dimension |
|-------------|-------------|------------------------------|
| `INSTRUCTION` | Bytecode instructions | `statements` |
| `BRANCH` | Branch points (if/else, switch) | `branches` |
| `LINE` | Source code lines | `lines` |
| `METHOD` | Methods/functions | `functions` |
| `COMPLEXITY` | Cyclomatic complexity | Not mapped (ignored) |
| `CLASS` | Classes | Not mapped (ignored) |

---

## Dimension Availability

| Dimension | Available | Source Counter | Notes |
|-----------|-----------|---------------|-------|
| lines | Yes | `LINE` | Always present in JaCoCo XML |
| branches | Yes | `BRANCH` | Always present in JaCoCo XML |
| functions | Yes (conditional) | `METHOD` | Present by default; may be absent in minimal configurations |
| statements | Yes | `INSTRUCTION` | Always present in JaCoCo XML |

### When METHOD Counters Are Absent

Some JaCoCo configurations may omit METHOD-level counters. In this case:
- Set `functions` to `{ "pct": "N/A", "covered": "N/A", "total": "N/A" }`.
- All other dimensions remain numeric.

---

## Normalisation Procedure

Transform JaCoCo XML output to the normalised coverage schema defined in `standards.md`.

### Step-by-Step

1. **Read** `target/site/jacoco/jacoco.xml` from the repository root.

2. **Parse report-level counters** (direct children of `<report>` element):
   - For each `<counter>` element at the report level:
     - `total = missed + covered`
     - `pct = covered / total * 100` (round to 2 decimal places)

3. **Map counter types to normalised dimensions**:
   - `INSTRUCTION` -> `statements`: `{ pct, covered, total }`
   - `BRANCH` -> `branches`: `{ pct, covered, total }`
   - `LINE` -> `lines`: `{ pct, covered, total }`
   - `METHOD` -> `functions`: `{ pct, covered, total }` (or `"N/A"` if absent)

4. **Extract per-file data** from `<class>` elements:
   - For each `<class>` element:
     - `path` = `sourcefilename` attribute (e.g., `"Main.java"`)
     - Parse `<counter>` children using the same mapping as step 3
     - If the class has a package, prefix the path: `{package-path}/{sourcefilename}` where `package-path` converts `/` from the `name` attribute

5. **Edge cases**:
   - If a counter has `missed = 0` and `covered = 0` (total = 0), set `pct` to `100` (no items to miss).
   - If `METHOD` counter is not present at the report level, set `functions` to `"N/A"` for totals and all files.

### Field Mapping Summary

| Normalised Field | Source Counter | Computation |
|-----------------|---------------|-------------|
| `total.lines.pct` | `LINE` | `covered / (missed + covered) * 100` |
| `total.lines.covered` | `LINE` | `covered` attribute |
| `total.lines.total` | `LINE` | `missed + covered` |
| `total.branches.pct` | `BRANCH` | `covered / (missed + covered) * 100` |
| `total.branches.covered` | `BRANCH` | `covered` attribute |
| `total.branches.total` | `BRANCH` | `missed + covered` |
| `total.functions.pct` | `METHOD` | `covered / (missed + covered) * 100` or `"N/A"` |
| `total.functions.covered` | `METHOD` | `covered` attribute or `"N/A"` |
| `total.functions.total` | `METHOD` | `missed + covered` or `"N/A"` |
| `total.statements.pct` | `INSTRUCTION` | `covered / (missed + covered) * 100` |
| `total.statements.covered` | `INSTRUCTION` | `covered` attribute |
| `total.statements.total` | `INSTRUCTION` | `missed + covered` |

---

## Error Scenarios

### jacoco.xml Not Found
- **Cause**: JaCoCo plugin not configured, or `jacoco:report` goal not executed after tests.
- **Action**: Surface error to agent. Do not fabricate coverage data.

### Empty Report
- **Cause**: No classes were instrumented (e.g., no source files matched includes).
- **Action**: All counters will have `missed = 0` and `covered = 0`. Report `pct` as `100` for each dimension (nothing to cover).

---

**Version**: 1.0.0
**Last Updated**: 2026-03-17
**Status**: Active
