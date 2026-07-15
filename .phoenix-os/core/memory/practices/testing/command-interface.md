# Command Interface

This document defines the command interface resolution layer for the Phoenix OS test audit workflow. It maps `(stackName, operationName)` pairs to concrete command strings, paths, and tool memory pointers. It is the single authoritative location where stack-specific command strings are permitted.

**Status**: Frozen (do not modify without coordinated impact assessment across stories #347-#351)
**Schema Version**: 1.0
**Created**: 2026-03-17
**Depends On**: `stack-detection.md` (frozen, schema 1.0)

---

## Table of Contents

1. [Operation Definitions](#operation-definitions)
2. [Resolution Table](#resolution-table)
3. [Tool Memory Pointers](#tool-memory-pointers)
4. [Error Contract: Unsupported Stack](#error-contract-unsupported-stack)
5. [Worked Examples](#worked-examples)

---

## Operation Definitions

Six named operations form the complete interface between agents and stack-specific tooling. Agents resolve these operations by looking up `stackDescriptor.stackName` (from `stack-detection.md`, schema 1.0) in the resolution table below.

| Operation | Type | Semantic Contract |
|-----------|------|-------------------|
| `run_tests` | command string | Command to execute the full test suite. Returns exit code, stdout, and stderr. |
| `run_coverage` | command string | Command to execute the test suite with coverage collection enabled. Produces a coverage output artifact. For Node.js: primary command is `npm run test:coverage`; fallback detection priority is documented in `${config.memory.tools.jest}/coverage-operations.md`. |
| `parse_coverage` | pointer | Reference to the stack-specific tool memory file that contains instructions for reading and extracting metrics from the coverage output artifact. |
| `list_tests` | command string | Command to discover and list all test files or test function names without executing them. |
| `coverage_output` | relative path | Path (relative to repository root) where the coverage output artifact is written after `run_coverage` completes. |
| `test_directory` | path or pattern | Directory path or file naming convention where test files are located. Used for discovery and file placement. |

---

## Resolution Table

**Lookup key**: `stackDescriptor.stackName` (from `stack-detection.md`, schema 1.0)

| Operation | `nodejs` | `python` | `java` | `go` | `dotnet` |
|-----------|----------|----------|--------|------|----------|
| `run_tests` | `npm run test` | `pytest` | `mvn test` | `go test ./...` | `dotnet test` |
| `run_coverage` | `npm run test:coverage` | `pytest --cov=. --cov-report=json` | `mvn test jacoco:report` | `go test -cover -coverprofile=coverage.out ./...` | `dotnet test --collect:"XPlat Code Coverage"` |
| `parse_coverage` | See `${config.memory.tools.jest}/coverage-operations.md` | See `${config.memory.tools.pytest}/coverage-operations.md` | See `${config.memory.tools.junit}/coverage-operations.md` | See `${config.memory.tools.go-test}/coverage-operations.md` | See `${config.memory.tools.dotnet-test}/coverage-operations.md` |
| `list_tests` | `npx jest --listTests` | `pytest --collect-only -q` | `mvn test -Dtest=* -DfailIfNoTests=false -q` | `go test -list '.*' ./...` | `dotnet test --list-tests` |
| `coverage_output` | `coverage/coverage-summary.json` | `coverage.json` | `target/site/jacoco/jacoco.xml` | `coverage.out` | `TestResults/*/coverage.cobertura.xml` |
| `test_directory` | `__tests__/` or `tests/` | `tests/` | `src/test/` | `*_test.go` (co-located) | `*.Tests/` or `Tests/` |

All paths in `coverage_output` are relative to repository root.

### Notes

- **Node.js `run_coverage` fallback**: The primary command is `npm run test:coverage`. If this script is not defined in `package.json`, the fallback detection priority chain is documented in `${config.memory.tools.jest}/coverage-operations.md`. Agents should follow that chain when the primary command fails.
- **Node.js Vitest**: When `stackDescriptor.testFramework` is `vitest`, substitute commands from `${config.memory.tools.vitest}/` (created in #351). The resolution table above applies to the default `jest` framework.
- **Java build tool**: The `java` row assumes Maven as the primary build tool. For Gradle projects, see build tool detection in `stack-detection.md`. Future stories may add build-tool-aware resolution.
- **Go `test_directory`**: Go co-locates test files with source files using the `*_test.go` naming convention rather than a separate test directory.
- **.NET `test_directory`**: .NET test projects typically reside in `*.Tests/` or `Tests/` directories. When multiple test project matches are found, the agent should prompt the user to confirm which projects to include and whether any should be excluded.

---

## Tool Memory Pointers

Each stack has a dedicated tool memory directory containing detailed guidance for coverage parsing, test operations, and framework-specific configuration.

| Stack | Tool Memory Directory | Status |
|-------|----------------------|--------|
| `nodejs` | `${config.memory.tools.jest}/` | Exists (all four files: `commands.md`, `configuration.md`, `coverage-operations.md`, `test-operations.md`) |
| `python` | `${config.memory.tools.pytest}/` | Full suite available: `coverage-operations.md`, `commands.md`, `configuration.md`, `test-operations.md` |
| `java` | `${config.memory.tools.junit}/` | Full suite available: `coverage-operations.md`, `commands.md`, `configuration.md`, `test-operations.md` |
| `go` | `${config.memory.tools.go-test}/` | Full suite available: `coverage-operations.md`, `commands.md`, `configuration.md`, `test-operations.md` |
| `dotnet` | `${config.memory.tools.dotnet-test}/` | Full suite available: `coverage-operations.md`, `commands.md`, `configuration.md`, `test-operations.md` |

When following a `parse_coverage` pointer, agents should:
1. Attempt to read the referenced file.
2. If the file does not exist, surface a clear error: `"Tool memory file not found: {path}."`

---

## Error Contract: Unsupported Stack

When `stackDescriptor.stackName` does not match any row in the resolution table, return this error:

**Error type**: `UNSUPPORTED_STACK`

**Fields**:
| Field | Type | Description |
|-------|------|-------------|
| `error` | string | Always `"UNSUPPORTED_STACK"` |
| `stackName` | string | The unrecognized stack name from the descriptor |
| `operationName` | string | The operation that was requested |
| `supportedStacks` | string[] | `["nodejs", "python", "java", "go", "dotnet"]` |
| `message` | string | Human-readable: `"Stack '{stackName}' is not supported for operation '{operationName}'. Supported stacks: nodejs, python, java, go, dotnet."` |

**Agent behavior on error**: Stop execution. Display the `message` field to the user. Do not fall back to a default stack.

---

## Worked Examples

### Worked Example: Node.js

**Input** (from stack-detection.md):
```json
{
  "stackDescriptor": {
    "schemaVersion": "1.0",
    "stackName": "nodejs",
    "runtime": "node",
    "testFramework": "jest",
    "mockingFramework": "jest",
    "coverageTool": "jest --coverage"
  }
}
```

**Resolution** (lookup `stackName = "nodejs"` in resolution table):

| Operation | Resolved Value |
|-----------|---------------|
| `run_tests` | `npm run test` |
| `run_coverage` | `npm run test:coverage` |
| `parse_coverage` | Follow `${config.memory.tools.jest}/coverage-operations.md` |
| `list_tests` | `npx jest --listTests` |
| `coverage_output` | `coverage/coverage-summary.json` |
| `test_directory` | `__tests__/` or `tests/` |

### Worked Example: Python

**Input** (from stack-detection.md):
```json
{
  "stackDescriptor": {
    "schemaVersion": "1.0",
    "stackName": "python",
    "runtime": "python",
    "testFramework": "pytest",
    "mockingFramework": "unittest.mock",
    "coverageTool": "pytest-cov"
  }
}
```

**Resolution** (lookup `stackName = "python"` in resolution table):

| Operation | Resolved Value |
|-----------|---------------|
| `run_tests` | `pytest` |
| `run_coverage` | `pytest --cov=. --cov-report=json` |
| `parse_coverage` | Follow `${config.memory.tools.pytest}/coverage-operations.md` |
| `list_tests` | `pytest --collect-only -q` |
| `coverage_output` | `coverage.json` |
| `test_directory` | `tests/` |

### Worked Example: Java

**Input** (from stack-detection.md):
```json
{
  "stackDescriptor": {
    "schemaVersion": "1.0",
    "stackName": "java",
    "runtime": "java",
    "testFramework": "junit5",
    "mockingFramework": "mockito",
    "coverageTool": "jacoco"
  }
}
```

**Resolution** (lookup `stackName = "java"` in resolution table):

| Operation | Resolved Value |
|-----------|---------------|
| `run_tests` | `mvn test` |
| `run_coverage` | `mvn test jacoco:report` |
| `parse_coverage` | Follow `${config.memory.tools.junit}/coverage-operations.md` |
| `list_tests` | `mvn test -Dtest=* -DfailIfNoTests=false -q` |
| `coverage_output` | `target/site/jacoco/jacoco.xml` |
| `test_directory` | `src/test/` |

### Worked Example: Go

**Input** (from stack-detection.md):
```json
{
  "stackDescriptor": {
    "schemaVersion": "1.0",
    "stackName": "go",
    "runtime": "go",
    "testFramework": "go test",
    "mockingFramework": "gomock",
    "coverageTool": "go test -cover"
  }
}
```

**Resolution** (lookup `stackName = "go"` in resolution table):

| Operation | Resolved Value |
|-----------|---------------|
| `run_tests` | `go test ./...` |
| `run_coverage` | `go test -cover -coverprofile=coverage.out ./...` |
| `parse_coverage` | Follow `${config.memory.tools.go-test}/coverage-operations.md` |
| `list_tests` | `go test -list '.*' ./...` |
| `coverage_output` | `coverage.out` |
| `test_directory` | `*_test.go` (co-located) |

### Worked Example: .NET

**Input** (from stack-detection.md):
```json
{
  "stackDescriptor": {
    "schemaVersion": "1.0",
    "stackName": "dotnet",
    "runtime": "dotnet",
    "testFramework": "xunit",
    "mockingFramework": "moq",
    "coverageTool": "coverlet"
  }
}
```

**Resolution** (lookup `stackName = "dotnet"` in resolution table):

| Operation | Resolved Value |
|-----------|---------------|
| `run_tests` | `dotnet test` |
| `run_coverage` | `dotnet test --collect:"XPlat Code Coverage"` |
| `parse_coverage` | Follow `${config.memory.tools.dotnet-test}/coverage-operations.md` |
| `list_tests` | `dotnet test --list-tests` |
| `coverage_output` | `TestResults/*/coverage.cobertura.xml` |
| `test_directory` | `*.Tests/` or `Tests/` |

### Error Example: Unsupported Stack

**Input**:
```json
{
  "stackDescriptor": {
    "schemaVersion": "1.0",
    "stackName": "ruby",
    "runtime": "ruby",
    "testFramework": "rspec",
    "mockingFramework": "rspec-mocks",
    "coverageTool": "simplecov"
  }
}
```

**Resolution** (lookup `stackName = "ruby"` -- not found in resolution table):

```json
{
  "error": "UNSUPPORTED_STACK",
  "stackName": "ruby",
  "operationName": "run_tests",
  "supportedStacks": ["nodejs", "python", "java", "go", "dotnet"],
  "message": "Stack 'ruby' is not supported for operation 'run_tests'. Supported stacks: nodejs, python, java, go, dotnet."
}
```

---

**Version**: 1.0.0
**Last Updated**: 2026-03-17
**Status**: Frozen
