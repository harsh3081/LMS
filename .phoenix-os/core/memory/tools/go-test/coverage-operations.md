# Go Coverage Operations

This document defines coverage collection, parsing, and normalisation procedures for Go projects using `go test -cover`. It is the authoritative reference for the `parse_coverage` operation when `stackDescriptor.stackName` is `go`.

**Coverage Tool**: go test -cover
**Stack**: go
**Native Output Format**: Text (Go cover profile)
**Coverage Output Path**: `coverage.out` (relative to repository root)

---

## Coverage Collection

### Generate Coverage Report

```bash
# Standard coverage collection with profile output
go test -cover -coverprofile=coverage.out ./...

# Coverage with count mode (shows execution counts)
go test -covermode=count -coverprofile=coverage.out ./...

# Coverage with atomic mode (for concurrent tests)
go test -covermode=atomic -coverprofile=coverage.out ./...

# Display coverage summary from profile
go tool cover -func=coverage.out
```

The `-coverprofile=coverage.out` flag produces a text-format coverage profile at the specified path.

---

## Native Output Format

### coverage.out Structure

The Go cover profile is a line-delimited text file. The first line declares the coverage mode. Subsequent lines describe coverage blocks.

```
mode: set
github.com/example/main.go:10.20,12.2 1 1
github.com/example/main.go:14.30,18.2 3 1
github.com/example/main.go:20.15,25.2 4 0
github.com/example/main.go:27.10,30.2 2 1
github.com/example/util.go:5.20,8.2 2 1
github.com/example/util.go:10.15,15.2 3 0
```

### Line Format

Each coverage line has the format:

```
file:startLine.startCol,endLine.endCol numStatements count
```

| Field | Description |
|-------|-------------|
| `file` | Source file path (Go import path) |
| `startLine.startCol` | Start position of the block |
| `endLine.endCol` | End position of the block |
| `numStatements` | Number of statements in the block |
| `count` | Execution count (`0` = not covered, `>0` = covered) |

### Coverage Modes

| Mode | Description | `count` Meaning |
|------|-------------|-----------------|
| `set` | Boolean coverage | `0` or `1` |
| `count` | Execution count | Number of times executed |
| `atomic` | Thread-safe count | Number of times executed (atomic increment) |

For normalisation purposes, all modes are treated the same: `count > 0` means covered.

---

## Dimension Availability

| Dimension | Available | Notes |
|-----------|-----------|-------|
| lines | Yes | Derived from statement blocks (each block spans lines) |
| branches | **N/A** | `go test -cover` does not report branch coverage |
| functions | **N/A** | `go test -cover` does not report function-level coverage |
| statements | Yes | Directly reported as `numStatements` per block |

### Explicit N/A Contract

`branches` and `functions` are **always** `"N/A"` for Go projects. This is a hard constraint of `go test -cover`, which only instruments statement blocks, not branch points or function entry/exit.

- `branches`: `{ "pct": "N/A", "covered": "N/A", "total": "N/A" }`
- `functions`: `{ "pct": "N/A", "covered": "N/A", "total": "N/A" }`

This is not an error condition. Threshold validation MUST skip these dimensions per the N/A sentinel contract in `standards.md`.

---

## Normalisation Procedure

Transform Go cover profile output to the normalised coverage schema defined in `standards.md`.

### Step-by-Step

1. **Read** `coverage.out` from the repository root.

2. **Skip the mode line** (first line starting with `mode:`).

3. **Parse each coverage block line**:
   - Extract `file`, `numStatements`, and `count` from each line.
   - A block is **covered** when `count > 0`.
   - A block is **uncovered** when `count == 0`.

4. **Aggregate per-file**:
   - Group blocks by `file`.
   - For each file:
     - `statements.total` = sum of `numStatements` for all blocks in that file
     - `statements.covered` = sum of `numStatements` for blocks where `count > 0`
     - `statements.pct` = `statements.covered / statements.total * 100`
     - `lines` mirrors `statements` (Go cover profiles report statement blocks, not individual lines)
     - `branches` = `{ "pct": "N/A", "covered": "N/A", "total": "N/A" }`
     - `functions` = `{ "pct": "N/A", "covered": "N/A", "total": "N/A" }`

5. **Aggregate totals**:
   - Sum all per-file `statements.total` and `statements.covered`.
   - Compute `statements.pct` = `total_covered / total_all * 100`.
   - `lines` mirrors `statements` at the total level.
   - `branches` and `functions` are `"N/A"` at the total level.

6. **Build the `files` array**:
   - One entry per unique file path, with the aggregated per-file metrics.

### Field Mapping Summary

| Normalised Field | Source | Computation |
|-----------------|--------|-------------|
| `total.lines.pct` | All blocks | `sum(covered_stmts) / sum(all_stmts) * 100` |
| `total.lines.covered` | All blocks | `sum(numStatements where count > 0)` |
| `total.lines.total` | All blocks | `sum(numStatements)` |
| `total.branches.*` | -- | `"N/A"` (always) |
| `total.functions.*` | -- | `"N/A"` (always) |
| `total.statements.pct` | All blocks | Same as `lines.pct` |
| `total.statements.covered` | All blocks | Same as `lines.covered` |
| `total.statements.total` | All blocks | Same as `lines.total` |

---

## Error Scenarios

### coverage.out Not Found
- **Cause**: `-coverprofile=coverage.out` flag was not passed, or `go test` failed before producing output.
- **Action**: Surface error to agent. Do not fabricate coverage data.

### Empty Coverage Profile
- **Cause**: No Go test files found, or all packages excluded.
- **Action**: Report all dimensions as zero (for lines/statements) and `"N/A"` (for branches/functions). `pct` for lines/statements should be `100` when total is `0` (nothing to cover).

### No Test Files
- **Cause**: Repository has Go source files but no `*_test.go` files.
- **Action**: `go test -cover` will report `coverage: [no statements]`. Treat as empty profile.

---

**Version**: 1.0.0
**Last Updated**: 2026-03-17
**Status**: Active
