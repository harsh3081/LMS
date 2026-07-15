# Jest Configuration Detection

This document defines how to detect and read existing Jest configuration in Phoenix OS.

## Configuration File Detection

### Priority Order
1. `jest.config.ts` - TypeScript configuration
2. `jest.config.js` - JavaScript configuration
3. `jest.config.json` - JSON configuration
4. `package.json` `jest` field

### Detect Configuration
```bash
# Check for configuration files
ls -la jest.config.* 2>/dev/null || echo "No jest.config file found"

# Check package.json for jest config
cat package.json | jq '.jest' 2>/dev/null || echo "No jest config in package.json"

# Show current Jest config
npx jest --showConfig
```

## Reading Configuration

### Extract Test Patterns
```bash
# Get testMatch patterns from config
npx jest --showConfig | grep -A5 "testMatch"
```

### Extract Coverage Settings
```bash
# Get coverage threshold
npx jest --showConfig | grep -A10 "coverageThreshold"

# Get collectCoverageFrom
npx jest --showConfig | grep -A10 "collectCoverageFrom"
```

### Extract Coverage Directory
```bash
# Get coverage directory location
npx jest --showConfig | grep "coverageDirectory"
```

## Standard Paths

### Test File Locations
- `src/__tests__/` - Common test directory
- `**/*.test.{ts,tsx}` - Test file pattern
- `**/*.spec.{ts,tsx}` - Spec file pattern

### Coverage Output
- `coverage/` - Default coverage directory
- `coverage/coverage-summary.json` - Coverage summary
- `coverage/lcov-report/` - HTML report

## Method Selection Priority

1. **Primary**: Read existing project configuration
2. **Secondary**: Use npx jest --showConfig
3. **Fallback**: Use default Jest patterns

## Error Scenarios

### Configuration Not Found
- Check for jest.config.ts, jest.config.js, or package.json jest field
- Verify file is in project root
- Use default patterns if no config exists

### Invalid Configuration
- Run `npx jest --showConfig` to validate
- Check for syntax errors in config file
- Verify dependencies are installed

---

**Version**: 1.0.0
**Last Updated**: 2025-11-25
**Status**: Active
