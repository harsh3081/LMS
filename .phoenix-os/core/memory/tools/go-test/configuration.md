# Go Test Configuration Detection

This document defines how to detect and read existing Go test configuration in Phoenix OS.

Coverage operations are defined in `coverage-operations.md`.

**Stack**: go
**Test Framework**: go test (built-in)

---

## Configuration File Detection

### Priority Order
1. `go.mod` — Go module definition (confirms Go project)
2. `*_test.go` — Test files (co-located with source)

### Detect Configuration
```bash
# Check for Go module
ls go.mod 2>/dev/null && echo "Go project"

# Check Go version
go version

# Find test files
find . -name "*_test.go" -not -path "./vendor/*" | head -20
```

## Standard Paths

### Test File Locations
- `*_test.go` — Co-located with source files (Go convention)
- Go does not use a separate test directory; tests live alongside source files
- Test functions: `func TestXxx(t *testing.T)` naming convention
- Benchmark functions: `func BenchmarkXxx(b *testing.B)`

---

**Version**: 1.0.0
**Last Updated**: 2026-05-26
**Status**: Active
