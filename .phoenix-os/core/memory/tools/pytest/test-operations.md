# pytest Test Operations

This document defines test execution and validation operations for pytest in Phoenix OS.

Coverage operations are defined in `coverage-operations.md`.

**Stack**: python
**Test Framework**: pytest

---

## Test Execution

### Run All Tests
```bash
# Standard execution
pytest

# Verbose output
pytest -v

# With coverage
pytest --cov=. --cov-report=json
```

### Run Specific Tests
```bash
# By file
pytest tests/test_module.py

# By function
pytest tests/test_module.py::test_function

# By keyword
pytest -k "keyword"

# By marker
pytest -m "marker_name"
```

## Test Output Parsing

### Exit Codes
- `0` — All tests passed
- `1` — Some tests failed
- `2` — Test execution interrupted
- `3` — Internal error
- `4` — pytest command line usage error
- `5` — No tests collected

## Test Discovery

```bash
# List all tests
pytest --collect-only -q

# List tests matching pattern
pytest --collect-only -q -k "pattern"
```

## Method Selection Priority

1. **Primary**: `pytest` (direct invocation)
2. **Secondary**: `python -m pytest` (module invocation)

---

**Version**: 1.0.0
**Last Updated**: 2026-05-26
**Status**: Active
