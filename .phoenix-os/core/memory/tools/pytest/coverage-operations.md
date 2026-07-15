# pytest-cov Coverage Operations

This document defines coverage collection, parsing, and normalisation procedures for Python projects using pytest-cov. It is the authoritative reference for the `parse_coverage` operation when `stackDescriptor.stackName` is `python`.

**Coverage Tool**: pytest-cov
**Stack**: python
**Native Output Format**: JSON (`coverage.json`)
**Coverage Output Path**: `coverage.json` (relative to repository root)

---

## Coverage Collection

### Generate Coverage Report

```bash
# Standard coverage collection (JSON output)
pytest --cov=. --cov-report=json

# Coverage with specific source directory
pytest --cov=src --cov-report=json

# Coverage with multiple report formats
pytest --cov=. --cov-report=json --cov-report=html
```

The `--cov-report=json` flag produces a `coverage.json` file in the repository root. This is the required format for normalisation.

---

## Native Output Format

### coverage.json Structure

pytest-cov (via coverage.py) produces a JSON file with the following structure:

```json
{
  "meta": {
    "format": 2,
    "version": "7.4.0",
    "timestamp": "2026-03-17T10:00:00",
    "branch_coverage": true,
    "show_contexts": false
  },
  "totals": {
    "covered_lines": 340,
    "num_statements": 400,
    "percent_covered": 85.0,
    "percent_covered_display": "85%",
    "missing_lines": 60,
    "excluded_lines": 0,
    "num_branches": 120,
    "num_partial_branches": 10,
    "covered_branches": 100,
    "missing_branches": 20
  },
  "files": {
    "src/main.py": {
      "executed_lines": [1, 2, 3, 5, 10, 15],
      "summary": {
        "covered_lines": 170,
        "num_statements": 200,
        "percent_covered": 85.0,
        "percent_covered_display": "85%",
        "missing_lines": 30,
        "excluded_lines": 0,
        "num_branches": 60,
        "num_partial_branches": 5,
        "covered_branches": 50,
        "missing_branches": 10
      },
      "missing_lines": [20, 25, 30],
      "excluded_lines": []
    }
  }
}
```

### Key Fields

| Native Field | Location | Description |
|-------------|----------|-------------|
| `covered_lines` | `totals` / `files.{path}.summary` | Number of lines executed |
| `num_statements` | `totals` / `files.{path}.summary` | Total number of executable statements |
| `percent_covered` | `totals` / `files.{path}.summary` | Overall line coverage percentage (0-100) |
| `num_branches` | `totals` / `files.{path}.summary` | Total number of branches |
| `covered_branches` | `totals` / `files.{path}.summary` | Number of branches executed |
| `missing_branches` | `totals` / `files.{path}.summary` | Number of branches not executed |

---

## Dimension Availability

| Dimension | Available | Source Field | Notes |
|-----------|-----------|-------------|-------|
| lines | Yes | `covered_lines` / `num_statements` | `percent_covered` provides the percentage directly |
| branches | Yes | `covered_branches` / `num_branches` | Requires `--branch` or branch coverage enabled in config |
| functions | **N/A** | -- | pytest-cov does not report function-level coverage |
| statements | Yes | `covered_lines` / `num_statements` | pytest-cov treats statements and lines equivalently; values mirror the `lines` dimension exactly (same source fields) |

---

## Normalisation Procedure

Transform pytest-cov JSON output to the normalised coverage schema defined in `standards.md`.

### Step-by-Step

1. **Read** `coverage.json` from the repository root.

2. **Extract totals** from the `totals` object:
   - `lines.covered` = `totals.covered_lines`
   - `lines.total` = `totals.num_statements`
   - `lines.pct` = `totals.percent_covered`
   - `branches.covered` = `totals.covered_branches`
   - `branches.total` = `totals.num_branches`
   - `branches.pct` = `totals.covered_branches / totals.num_branches * 100` (compute; do not use `percent_covered` which is line-based)
   - `functions` = `{ "pct": "N/A", "covered": "N/A", "total": "N/A" }`
   - `statements.covered` = `totals.covered_lines`
   - `statements.total` = `totals.num_statements`
   - `statements.pct` = `totals.percent_covered`

3. **Extract per-file data** from the `files` object:
   - For each key in `files`, create an entry in the `files` array:
     - `path` = the file key (e.g., `"src/main.py"`)
     - Map `summary` fields using the same logic as totals
     - Set `functions` to `"N/A"` for all files

4. **Edge cases**:
   - If `num_branches` is `0`, set `branches.pct` to `100` (no branches to miss), `branches.covered` to `0`, `branches.total` to `0`.
   - If branch coverage is not enabled (`meta.branch_coverage` is `false`), set `branches` to `"N/A"` for all three fields.

### Field Mapping Summary

| Normalised Field | Source |
|-----------------|--------|
| `total.lines.pct` | `totals.percent_covered` |
| `total.lines.covered` | `totals.covered_lines` |
| `total.lines.total` | `totals.num_statements` |
| `total.branches.pct` | `totals.covered_branches / totals.num_branches * 100` |
| `total.branches.covered` | `totals.covered_branches` |
| `total.branches.total` | `totals.num_branches` |
| `total.functions.*` | `"N/A"` (always) |
| `total.statements.pct` | `totals.percent_covered` |
| `total.statements.covered` | `totals.covered_lines` |
| `total.statements.total` | `totals.num_statements` |

---

## Error Scenarios

### coverage.json Not Found
- **Cause**: `--cov-report=json` flag was not passed, or pytest failed before producing output.
- **Action**: Surface error to agent. Do not fabricate coverage data.

### Branch Coverage Not Enabled
- **Cause**: Project does not have `branch = true` in `.coveragerc` or `[tool.coverage.run]` config.
- **Action**: Set `branches` to `"N/A"` for all three fields (not zero).

---

**Version**: 1.0.0
**Last Updated**: 2026-03-17
**Status**: Active
