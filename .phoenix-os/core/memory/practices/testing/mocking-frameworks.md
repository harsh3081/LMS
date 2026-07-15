# Mocking Frameworks Reference

This document defines the canonical lookup table for mocking framework detection across supported technology stacks. It is consumed by the test-planner agent (Step 2.3) to resolve the `mockingFramework` field in the stack descriptor.

## Three-Tier Resolution

Mocking framework resolution follows a strict three-tier priority:

1. **Tier 1 — User Override**: If `mockFrameworkOverride` is set in `file-scope-context.json`, use it directly. Skip Tiers 2-3.
2. **Tier 2 — Manifest Auto-Detection**: Scan project manifest for known mocking dependencies using the tables below. First match wins.
3. **Tier 3 — Stack Default Fallback**: If no mocking dependency found in manifest, use the built-in default for the detected stack (from `stack-detection.md`). If no built-in default exists, prompt user.

## Stack: nodejs

| Dependency (package.json devDependencies) | Resolved Framework | Type |
|-------------------------------------------|-------------------|------|
| jest | jest (built-in mocking) | General |
| vitest | vitest (built-in vi.* API) | General |
| sinon | sinon | General |
| testdouble | testdouble | General |
| ts-mockito | ts-mockito | General |
| msw | msw | HTTP/API |
| nock | nock | HTTP/API |

**Default**: Inherits from `testFramework` (jest → jest mocking, vitest → vitest mocking)

**Coexistence Notes**:
- `msw` + `jest` or `vitest` is complementary (msw handles HTTP interception, jest/vitest handle general mocking) — resolve as the general framework, note msw as HTTP layer
- `nock` + `jest` is complementary — resolve as jest, note nock as HTTP layer
- `sinon` + `jest` is rare but valid — resolve as sinon (explicit choice overrides default)

## Stack: python

| Dependency (pyproject.toml / setup.py / setup.cfg) | Resolved Framework | Type |
|-------------------------------------------------------|-------------------|------|
| pytest-mock | pytest-mock | General |
| responses | responses | HTTP/API |
| requests-mock | requests-mock | HTTP/API |
| vcrpy | vcrpy | HTTP/API |

**Default**: `unittest.mock` (built-in, no dependency needed)

**Detection Note**: Scan structured manifests only (`pyproject.toml` `[project.dependencies]`/`[project.optional-dependencies]`, `setup.py` `install_requires`/`tests_require`, `setup.cfg` `[options]`). Plain `requirements.txt` files may also be scanned for package names but lack structured metadata — match lines starting with a known package name (ignoring version specifiers).

**Coexistence Notes**:
- `pytest-mock` wraps `unittest.mock` with pytest fixtures — resolve as pytest-mock
- `responses` + `pytest-mock` is complementary — resolve as pytest-mock, note responses as HTTP layer

## Stack: java

| Dependency (pom.xml / build.gradle) | Resolved Framework | Type |
|--------------------------------------|-------------------|------|
| mockito-core / org.mockito:mockito-core | mockito | General |
| org.easymock:easymock | easymock | General |
| org.powermock:powermock-api-mockito2 | powermock | General |
| com.github.tomakehurst:wiremock | wiremock | HTTP/API |
| com.github.tomakehurst:wiremock-jre8 | wiremock | HTTP/API |

**Default**: `mockito` (de facto standard for Java testing)

**Coexistence Notes**:
- `wiremock` + `mockito` is complementary — resolve as mockito, note wiremock as HTTP layer
- `powermock` + `mockito` — resolve as powermock (superset of mockito capabilities)

## Stack: go

| Dependency (go.mod) | Resolved Framework | Type |
|----------------------|-------------------|------|
| go.uber.org/mock | gomock | General |
| github.com/golang/mock | gomock (legacy path) | General |
| github.com/stretchr/testify | testify/mock | General |
| github.com/vektra/mockery | mockery | Code Generation |
| github.com/jarcoal/httpmock | httpmock | HTTP/API |

**Default**: No built-in mocking — if no dependency found, prompt user or recommend `testify/mock`

**Coexistence Notes**:
- `mockery` generates code for `testify/mock` interfaces — resolve as testify/mock, note mockery as generator
- `httpmock` + `testify/mock` is complementary — resolve as testify/mock, note httpmock as HTTP layer
- `gomock` and `testify/mock` are alternatives — if both present, prompt user

## Stack: dotnet

| Dependency (*.csproj PackageReference) | Resolved Framework | Type |
|----------------------------------------|-------------------|------|
| Moq | moq | General |
| NSubstitute | nsubstitute | General |
| FakeItEasy | fakeiteasy | General |
| WireMock.Net | wiremock.net | HTTP/API |

**Default**: `moq` (most widely used in .NET ecosystem)

**Coexistence Notes**:
- `WireMock.Net` + `Moq` is complementary — resolve as moq, note WireMock.Net as HTTP layer
- `Moq` and `NSubstitute` are alternatives — if both present, use the one with more recent version or prompt user

## HTTP vs General Mocking

HTTP/API mocking frameworks (msw, nock, wiremock, httpmock, responses) are **complementary** to general mocking frameworks. When both types are detected:
- Resolve `mockingFramework` to the **general** framework
- Note the HTTP framework in the stack descriptor's `_notes` field (informational)
- Test generation should use the appropriate framework based on the dependency type being mocked

## Validation

When `--mock-framework` override is provided, validate the value against the known frameworks list for the detected stack. If the value is not recognized:
- Emit warning: "Warning: '{value}' is not a recognized mocking framework for {stackName}. Proceeding with override."
- Do NOT error — the user may know about a framework not in this table

---

**Version**: 1.0.0
**Last Updated**: 2026-03-18
**Status**: Active
