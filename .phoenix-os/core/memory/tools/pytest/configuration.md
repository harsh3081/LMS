# pytest Configuration Detection

This document defines how to detect and read existing pytest configuration in Phoenix OS.

Coverage operations are defined in `coverage-operations.md`.

**Stack**: python
**Test Framework**: pytest

---

## Configuration File Detection

### Priority Order
1. `pyproject.toml` `[tool.pytest.ini_options]` section
2. `pytest.ini` (dedicated pytest config)
3. `setup.cfg` `[tool:pytest]` section
4. `tox.ini` `[pytest]` section

### Detect Configuration
```bash
# Check for pyproject.toml with pytest config
grep -l "tool.pytest" pyproject.toml 2>/dev/null

# Check for pytest.ini
ls pytest.ini 2>/dev/null

# Check for setup.cfg with pytest section
grep -l "tool:pytest" setup.cfg 2>/dev/null

# Check if pytest is installed
pip show pytest 2>/dev/null | grep Version
```

## Standard Paths

### Test File Locations
- `tests/` — Centralized test directory (default convention)
- `test_*.py` — Test file naming convention
- `*_test.py` — Alternative test file naming convention

---

**Version**: 1.0.0
**Last Updated**: 2026-05-26
**Status**: Active
