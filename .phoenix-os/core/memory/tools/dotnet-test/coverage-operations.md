# Coverlet Coverage Operations

This document defines coverage collection, parsing, and normalisation procedures for .NET projects using Coverlet with Cobertura XML output. It is the authoritative reference for the `parse_coverage` operation when `stackDescriptor.stackName` is `dotnet`.

**Coverage Tool**: Coverlet
**Stack**: dotnet
**Native Output Format**: Cobertura XML (`coverage.cobertura.xml`)
**Coverage Output Path**: `TestResults/*/coverage.cobertura.xml` (relative to repository root)

---

## Coverage Collection

### Generate Coverage Report

```bash
# Standard coverage collection (XPlat Code Coverage uses Coverlet under the hood)
dotnet test --collect:"XPlat Code Coverage"

# Coverage with specific output directory
dotnet test --collect:"XPlat Code Coverage" --results-directory TestResults

# Coverage with specific format settings
dotnet test --collect:"XPlat Code Coverage" -- DataCollectionRunSettings.DataCollectors.DataCollector.Configuration.Format=cobertura
```

The `--collect:"XPlat Code Coverage"` flag produces a Cobertura XML report under `TestResults/{guid}/coverage.cobertura.xml`. The `*` in the output path represents a GUID-named directory created per test run.

---

## Native Output Format

### coverage.cobertura.xml Structure

Coverlet produces a Cobertura-format XML report with the following structure:

```xml
<?xml version="1.0" encoding="utf-8"?>
<coverage line-rate="0.85" branch-rate="0.78" version="1.0"
          timestamp="1234567890" lines-covered="340" lines-valid="400"
          branches-covered="156" branches-valid="200">
  <packages>
    <package name="MyApp" line-rate="0.85" branch-rate="0.78"
             complexity="50">
      <classes>
        <class name="MyApp.Services.UserService"
               filename="Services/UserService.cs"
               line-rate="0.90" branch-rate="0.80" complexity="10">
          <methods>
            <method name="GetUser" signature="(int)" line-rate="1.0"
                    branch-rate="1.0" complexity="2">
              <lines>
                <line number="10" hits="3" branch="False"/>
                <line number="11" hits="3" branch="False"/>
              </lines>
            </method>
          </methods>
          <lines>
            <line number="10" hits="3" branch="False"/>
            <line number="11" hits="3" branch="False"/>
            <line number="15" hits="0" branch="False"/>
            <line number="20" hits="1" branch="True"
                  condition-coverage="80% (4/5)"/>
          </lines>
        </class>
      </classes>
    </package>
  </packages>
</coverage>
```

### Key Attributes

| Attribute | Location | Description |
|-----------|----------|-------------|
| `line-rate` | `<coverage>`, `<package>`, `<class>` | Line coverage ratio (0.0-1.0) |
| `branch-rate` | `<coverage>`, `<package>`, `<class>` | Branch coverage ratio (0.0-1.0) |
| `lines-covered` | `<coverage>` | Total lines hit |
| `lines-valid` | `<coverage>` | Total coverable lines |
| `branches-covered` | `<coverage>` | Total branches hit |
| `branches-valid` | `<coverage>` | Total coverable branches |
| `filename` | `<class>` | Relative path to source file |
| `hits` | `<line>` | Execution count for a line |
| `condition-coverage` | `<line>` | Branch coverage detail for branch lines (e.g., `"80% (4/5)"`) |

---

## Dimension Availability

| Dimension | Available | Source | Notes |
|-----------|-----------|-------|-------|
| lines | Yes | `line-rate`, `lines-covered`, `lines-valid` | Always present in Cobertura XML |
| branches | Yes | `branch-rate`, `branches-covered`, `branches-valid` | Always present in Cobertura XML |
| functions | **N/A** | -- | Cobertura XML does not report method-level coverage metrics |
| statements | Yes | Derived from line data | Cobertura does not distinguish statements from lines; statements mirrors lines |

### Functions Dimension

Although Cobertura XML contains `<method>` elements, these do not have aggregate `covered`/`total` counters at the report level. Method-level coverage would require counting methods with `line-rate > 0` vs. total methods, which is not a standard Cobertura metric. To maintain consistency and avoid fragile heuristics, `functions` is set to `"N/A"`.

---

## Normalisation Procedure

Transform Cobertura XML output to the normalised coverage schema defined in `standards.md`.

### Step-by-Step

1. **Locate** the coverage file: find the most recent `TestResults/*/coverage.cobertura.xml` file. If multiple GUID directories exist, use the one with the latest modification timestamp.

2. **Parse the `<coverage>` root element** for aggregate metrics:
   - `lines.covered` = `lines-covered` attribute
   - `lines.total` = `lines-valid` attribute
   - `lines.pct` = `line-rate * 100`
   - `branches.covered` = `branches-covered` attribute
   - `branches.total` = `branches-valid` attribute
   - `branches.pct` = `branch-rate * 100`
   - `functions` = `{ "pct": "N/A", "covered": "N/A", "total": "N/A" }`
   - `statements.covered` = `lines-covered` attribute (mirrors lines)
   - `statements.total` = `lines-valid` attribute (mirrors lines)
   - `statements.pct` = `line-rate * 100` (mirrors lines)

3. **Extract per-file data** from `<class>` elements:
   - For each `<class>` element:
     - `path` = `filename` attribute
     - `lines.pct` = `line-rate * 100`
     - `branches.pct` = `branch-rate * 100`
     - For line counts: count `<line>` elements where `hits > 0` for `covered`, total `<line>` elements for `total`
     - For branch counts at the file level: parse `condition-coverage` attributes from branch lines (e.g., `"80% (4/5)"` means 4 covered out of 5)
     - `functions` = `"N/A"` for all files
     - `statements` mirrors `lines`

4. **Handle duplicate class files**: If multiple `<class>` elements share the same `filename`, aggregate their line data (union of line numbers, summing hits for shared lines).

5. **Edge cases**:
   - If `lines-valid` is `0`, set `lines.pct` to `100` (nothing to cover).
   - If `branches-valid` is `0`, set `branches.pct` to `100` (nothing to cover).

### Field Mapping Summary

| Normalised Field | Source | Computation |
|-----------------|--------|-------------|
| `total.lines.pct` | `<coverage>` `line-rate` | `line-rate * 100` |
| `total.lines.covered` | `<coverage>` `lines-covered` | Direct attribute |
| `total.lines.total` | `<coverage>` `lines-valid` | Direct attribute |
| `total.branches.pct` | `<coverage>` `branch-rate` | `branch-rate * 100` |
| `total.branches.covered` | `<coverage>` `branches-covered` | Direct attribute |
| `total.branches.total` | `<coverage>` `branches-valid` | Direct attribute |
| `total.functions.*` | -- | `"N/A"` (always) |
| `total.statements.pct` | `<coverage>` `line-rate` | `line-rate * 100` (mirrors lines) |
| `total.statements.covered` | `<coverage>` `lines-covered` | Mirrors lines |
| `total.statements.total` | `<coverage>` `lines-valid` | Mirrors lines |

---

## Error Scenarios

### coverage.cobertura.xml Not Found
- **Cause**: `--collect:"XPlat Code Coverage"` flag was not passed, Coverlet NuGet package not installed, or tests failed before producing output.
- **Action**: Surface error to agent. Do not fabricate coverage data.

### Multiple TestResults Directories
- **Cause**: Multiple test runs created separate GUID directories under `TestResults/`.
- **Action**: Use the most recently modified `coverage.cobertura.xml` file.

### Empty Coverage Report
- **Cause**: No assemblies were instrumented.
- **Action**: Report `lines-covered = 0`, `lines-valid = 0`, `pct = 100` (nothing to cover). Same for branches. Functions remains `"N/A"`.

---

**Version**: 1.0.0
**Last Updated**: 2026-03-17
**Status**: Active
