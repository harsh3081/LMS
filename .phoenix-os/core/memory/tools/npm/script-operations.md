# npm Script Operations

This document defines npm script operations for test execution in Phoenix OS.

## Script Discovery

### List Available Scripts
```bash
# Show all scripts in package.json
cat package.json | jq '.scripts'

# List script names only
cat package.json | jq -r '.scripts | keys[]'

# Find test-related scripts
cat package.json | jq -r '.scripts | to_entries[] | select(.key | test("test")) | "\(.key): \(.value)"'
```

### Common Test Scripts
```bash
# Detect test script
cat package.json | jq -r '.scripts.test // empty'

# Detect coverage script
cat package.json | jq -r '.scripts["test:coverage"] // .scripts["coverage"] // empty'

# Detect watch script
cat package.json | jq -r '.scripts["test:watch"] // empty'
```

## Script Execution

### Run Scripts
```bash
# Run test script
npm run test

# Run with arguments
npm run test -- --verbose

# Run coverage script
npm run test:coverage

# Run specific script
npm run {script-name}
```

### Run with Environment Variables
```bash
# Set CI mode
CI=true npm run test

# Set timezone
TZ=UTC npm run test

# Increase memory
NODE_OPTIONS="--max-old-space-size=4096" npm run test
```

## Script Detection Priority

1. **Check for test:coverage script** - Preferred for coverage collection
2. **Check for test script** - Fallback for test execution
3. **Check for jest in dependencies** - Construct command if no script exists

### Detection Logic
```bash
# Preferred coverage script
if cat package.json | jq -e '.scripts["test:coverage"]' > /dev/null 2>&1; then
  npm run test:coverage
# Fallback: add coverage flag to test script
elif cat package.json | jq -e '.scripts.test' > /dev/null 2>&1; then
  npm run test -- --coverage
# Last resort: direct Jest command
else
  npx jest --coverage
fi
```

## Output Capture

### Capture Script Output
```bash
# Capture to file
npm run test:coverage 2>&1 | tee test-output.log

# Capture exit code
npm run test:coverage
echo "Exit code: $?"
```

### Parse Output
```bash
# Extract test summary from output
npm run test 2>&1 | grep -E "Tests:|Suites:|Snapshots:|Time:"
```

## Error Handling

### Handle Script Failures
```bash
# Run with error capture
npm run test:coverage || echo "Tests failed with exit code $?"

# Check for missing scripts
if ! cat package.json | jq -e '.scripts.test' > /dev/null 2>&1; then
  echo "No test script found in package.json"
fi
```

## Method Selection Priority

1. **Primary**: npm run scripts (project-configured)
2. **Secondary**: npm run test -- with flags
3. **Fallback**: npx jest direct command

## Error Scenarios

### Script Not Found
- Verify script exists in package.json
- Check for typos in script name
- Use `npm run` to list available scripts

### Script Execution Failures
- Check npm install has been run
- Verify dependencies are installed
- Check for configuration errors

### Timeout Issues
- Use `--forceExit` flag for tests
- Increase timeout in jest config
- Check for unclosed handles

---

**Version**: 1.0.0
**Last Updated**: 2025-11-25
**Status**: Active
