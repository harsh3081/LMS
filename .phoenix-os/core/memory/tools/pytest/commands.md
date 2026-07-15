# pytest CLI Commands

This document defines the CLI commands for pytest test framework operations in Phoenix OS.

Coverage operations are defined in `coverage-operations.md`.

**Stack**: python
**Test Framework**: pytest

---

## Core Test Execution

### Run All Tests
```bash
# Run all tests
pytest

# Verbose output
pytest -v

# Quiet mode
pytest -q

# With specific markers
pytest -m "not slow"
```

### Run Specific Tests
```bash
# Run a specific test file
pytest tests/test_module.py

# Run a specific test function
pytest tests/test_module.py::test_function

# Run a specific test class
pytest tests/test_module.py::TestClass

# Run tests matching keyword expression
pytest -k "test_add or test_subtract"
```

### Test Discovery
```bash
# List all tests without running
pytest --collect-only -q

# Show test IDs
pytest --collect-only
```

## Method Selection Priority

1. **Primary**: `pytest` (direct invocation)
2. **Secondary**: `python -m pytest` (module invocation)

---

**Version**: 1.0.0
**Last Updated**: 2026-05-26
**Status**: Active
