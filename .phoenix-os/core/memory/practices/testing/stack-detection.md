# Stack Detection Contract

This document defines the stack detection chain and output descriptor contract
for the Phoenix OS test audit workflow. It is the single authoritative reference
for all agents and commands in feature #339.

**Status**: Frozen (do not modify without coordinated impact assessment across stories #347-#351)
**Schema Version**: 1.0
**Created**: 2026-03-17

---

## Table of Contents

1. [Stack Descriptor Schema](#stack-descriptor-schema)
2. [Manifest Probe Order](#manifest-probe-order)
3. [Default Resolutions per Stack](#default-resolutions-per-stack)
4. [Five-Step Detection Chain](#five-step-detection-chain)
5. [Tie-Breaking Rules](#tie-breaking-rules)
6. [Monorepo Detection Behavior](#monorepo-detection-behavior)
7. [Error Behavior](#error-behavior)

---

## Stack Descriptor Schema

The stack descriptor is the output contract of the detection chain. All downstream agents and the orchestrator consume this object from `test-plan.json` under the `stackDescriptor` key.

| Field | Type | Required | Description | Constraints |
|-------|------|----------|-------------|-------------|
| `schemaVersion` | string | yes | Schema version for forward compatibility | Currently `"1.0"` |
| `stackName` | string | yes | Canonical stack identifier | One of: `nodejs`, `python`, `java`, `go`, `dotnet` |
| `runtime` | string | yes | Runtime binary name | One of: `node`, `python`, `java`, `go`, `dotnet` |
| `testFramework` | string | yes | Resolved test runner name | See default resolutions table |
| `mockingFramework` | string | yes | Resolved mocking library name | See default resolutions table |
| `coverageTool` | string | yes | Resolved coverage collection command/tool | See default resolutions table |

All values are lowercase strings.

### Example Descriptor (Node.js)

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

---

## Manifest Probe Order

Probes are evaluated in this exact priority order. The detection chain checks the repository root first, then first-level sub-directories if no manifest is found at root.

| Priority | Manifest File(s) | Resolved Stack (`stackName`) | Runtime (`runtime`) |
|----------|-----------------|-------------------------------|---------------------|
| 1 | `package.json` | `nodejs` | `node` |
| 2 | `pyproject.toml`, `setup.py`, `setup.cfg` | `python` | `python` |
| 3 | `pom.xml`, `build.gradle`, `build.gradle.kts` | `java` | `java` |
| 4 | `go.mod` | `go` | `go` |
| 5 | `*.csproj`, `*.sln` | `dotnet` | `dotnet` |

### Probe Scope

- **Root**: Check the repository root directory for all manifest patterns in priority order.
- **First-level sub-directories**: If no manifest is found at root, scan immediate child directories (depth 1) for manifest patterns.
- **Deeper directories**: Not scanned. Monorepo structures deeper than one level require explicit user configuration.

---

## Default Resolutions per Stack

When the manifest does not explicitly declare a test framework, mocking framework, or coverage tool, apply these defaults.

| Stack (`stackName`) | Test Framework (`testFramework`) | Mocking Framework (`mockingFramework`) | Coverage Tool (`coverageTool`) |
|---------------------|----------------------------------|----------------------------------------|-------------------------------|
| `nodejs` | `jest` | `jest` | `jest --coverage` |
| `python` | `pytest` | `unittest.mock` | `pytest-cov` |
| `java` | `junit5` | `mockito` | `jacoco` |
| `go` | `go test` | `gomock` | `go test -cover` |
| `dotnet` | `xunit` | `moq` | `coverlet` |

### Override from Manifest

If the manifest explicitly declares a different test framework (e.g., `vitest` in `package.json` devDependencies instead of `jest`), the detection chain **should** resolve the declared framework rather than applying the default. Default resolutions are fallbacks, not overrides.

---

## Five-Step Detection Chain

This is the ordered procedure that `test-planner` executes to resolve the stack descriptor.

### Step 1: Probe for Manifest

1. Scan the repository root for manifest files in the priority order defined in the [Manifest Probe Order](#manifest-probe-order) table.
2. Record all manifests found and their resolved stack names.
3. If no manifest is found at root, scan first-level sub-directories.
4. If multiple manifests from **different stacks** are found, go to [Step 5: Fallback](#step-5-fallback).
5. If no manifest is found at any scanned level, go to [Step 5: Fallback](#step-5-fallback).
6. Set `stackName` and `runtime` from the matched probe entry.

### Step 2: Resolve Test Framework

1. Read manifest content for test framework dependencies (e.g., `devDependencies` in `package.json`, `[tool.pytest]` in `pyproject.toml`).
2. If a test framework is explicitly declared, set `testFramework` to the declared value.
3. If not explicitly declared, apply the default resolution from the [Default Resolutions](#default-resolutions-per-stack) table.

### Step 3: Resolve Mocking Framework

1. Read manifest content for mocking library dependencies.
2. If a mocking framework is explicitly declared, set `mockingFramework` to the declared value.
3. If not explicitly declared, apply the default resolution from the [Default Resolutions](#default-resolutions-per-stack) table.

### Step 4: Resolve Coverage Tool

1. Read manifest or configuration files for coverage tool declarations.
2. If a coverage tool is explicitly configured, set `coverageTool` to the declared value.
3. If not explicitly declared, apply the default resolution from the [Default Resolutions](#default-resolutions-per-stack) table.

### Step 5: Fallback

- **Multiple stacks detected**: Prompt the user to select the primary stack. Present the detected stacks and their manifest files. Do **not** resolve silently.
- **No manifest found**: Return a descriptive error message. Do **not** silently default to Node.js or any other stack.
  - Error message: `"No recognized project manifest found in repository root or first-level sub-directories. Supported manifests: package.json, pyproject.toml, setup.py, setup.cfg, pom.xml, build.gradle, build.gradle.kts, go.mod, *.csproj, *.sln"`
- **User declines prompt**: Abort the workflow with a clear message.

### Step 6: Emit Descriptor

1. Set `schemaVersion` to `"1.0"`.
2. Construct the stack descriptor object with all six fields.
3. Store the descriptor in `test-plan.json` under the `stackDescriptor` key.
4. Log: `"Stack detected: {stackName} | Test: {testFramework} | Mock: {mockingFramework} | Coverage: {coverageTool}"`

---

## Tie-Breaking Rules

- **Multiple manifests from the SAME stack**: No conflict. Proceed with detection. Example: `package.json` + `tsconfig.json` both indicate `nodejs` -- no prompt needed.
- **Multiple manifests from DIFFERENT stacks**: Conflict. Trigger user prompt to select the primary stack. Example: `package.json` + `pyproject.toml` -- prompt user.
- **No manifests found**: Not a tie-break scenario. Handled by the no-manifest error path in Step 5.

---

## Monorepo Detection Behavior

### Scan Depth

1. **Root directory**: Always scanned first.
2. **First-level sub-directories**: Scanned only if no manifest is found at root.
3. **Deeper levels**: Not scanned.

### Monorepo Conflict Resolution

When scanning first-level sub-directories, if multiple sub-directories contain manifests from different stacks:
- Collect all unique stack names detected.
- If more than one unique stack is detected, trigger the user prompt (same as tie-breaking for different stacks at root).
- If all sub-directories resolve to the same stack, proceed with that stack.

---

## Error Behavior

### No Manifest Found

- **Trigger**: No recognized manifest file in repository root or first-level sub-directories.
- **Behavior**: Return descriptive error message listing all supported manifest patterns.
- **Critical**: NEVER silently default to Node.js or any other stack.

### User Declines Prompt

- **Trigger**: User is prompted to select a stack (polyglot/monorepo) and declines or cancels.
- **Behavior**: Abort the workflow with message: `"Stack detection aborted by user. Cannot proceed without a resolved stack descriptor."`

### Unsupported Manifest

- **Trigger**: A manifest file is found but does not match any entry in the probe table.
- **Behavior**: Ignore the file and continue probing. Only files matching the probe table are considered.

---

**Version**: 1.0.0
**Last Updated**: 2026-03-17
**Status**: Frozen
