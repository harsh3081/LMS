# Stack Default Exclusion Patterns

**Schema Version**: 1.0
**Purpose**: Per-stack default exclusion patterns for test coverage analysis. Agents load this file and look up the section matching `stackDescriptor.stackName` to obtain the default exclusion pattern set.

## Lookup Contract

Agents find the H2 section matching `stackDescriptor.stackName`, parse the YAML fenced code block, and flatten all four category arrays into a single exclusion pattern list.

## Category Semantics

- `test-files` — test file naming conventions to exclude from coverage
- `type-definitions` — type stubs/definitions with no executable logic
- `infrastructure` — build output, generated code, vendor directories
- `framework` — framework-specific files (stories, configs, fixtures, entry points)

---

## nodejs

```yaml
nodejs:
  test-files:
    - "*.test.{ts,tsx,js,jsx}"
    - "*.spec.{ts,tsx,js,jsx}"
    - "__tests__/**"
    - "__mocks__/**"
  type-definitions:
    - "*.d.ts"
  infrastructure:
    - "**/build/**"
    - "**/dist/**"
    - "**/generated/**"
    - "**/styleguide/**"
    - "**/plugins/**"
    - "**/*-config/**"
    - "**/api/editing/**"
    - "**/api/sitemap/**"
  framework:
    - "*.stories.{ts,tsx,js,jsx}"
    - "*.config.{js,ts}"
    - "index.{ts,js}"
```

## python

```yaml
python:
  test-files:
    - "test_*.py"
    - "*_test.py"
    - "tests/**"
    - "conftest.py"
  type-definitions:
    - "*.pyi"
  infrastructure:
    - "**/build/**"
    - "**/dist/**"
    - "**/__pycache__/**"
    - "**/migrations/**"
    - "*.egg-info/**"
    - "**/generated/**"
  framework:
    - "setup.py"
    - "setup.cfg"
    - "manage.py"
    - "**/fixtures/**"
```

## java

```yaml
java:
  test-files:
    - "*Test.java"
    - "*Tests.java"
    - "*TestSuite.java"
    - "src/test/**"
  type-definitions: []
  infrastructure:
    - "**/target/**"
    - "**/build/**"
    - "**/generated-sources/**"
    - "**/generated-test-sources/**"
    - "**/generated/**"
  framework:
    - "**/testFixtures/**"
    - "**/*Config.java"
    - "**/*Application.java"
```

## go

```yaml
go:
  test-files:
    - "*_test.go"
    - "**/testdata/**"
  type-definitions: []
  infrastructure:
    - "**/vendor/**"
    - "**/bin/**"
    - "**/generated/**"
    - "**/*.pb.go"
    - "**/*_generated.go"
  framework:
    - "**/mock_*.go"
    - "**/*_mock.go"
```

## dotnet

```yaml
dotnet:
  test-files:
    - "*Tests.cs"
    - "*Test.cs"
    - "*.Tests/**"
    - "*.Test/**"
    - "Tests/**"
  type-definitions: []
  infrastructure:
    - "**/bin/**"
    - "**/obj/**"
    - "**/generated/**"
    - "**/*.Designer.cs"
    - "**/*.g.cs"
    - "**/*.g.i.cs"
    - "**/Migrations/**"
  framework:
    - "**/*Fixture.cs"
    - "Program.cs"
```
