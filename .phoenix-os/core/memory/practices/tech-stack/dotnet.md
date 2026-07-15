# .NET & Clean Architecture Guidelines

This document is **Long-Term Memory (LTM)** for .NET backend systems. Following Phoenix OS philosophy, it captures **knowledge — not process** — about architecture, design, API, and validation patterns for enterprise-grade .NET development. Agents load this memory contextually based on tech-stack tags in specs.

## 1. Overview

**Intent**: Provide deterministic architectural and technology knowledge for .NET backend systems

**Why**: Agents need consistent, context-aware guardrails to make autonomous decisions about code structure, API patterns, and library selection across .NET projects

**Outcome**: Any agent loading this memory can produce code and designs that conform to organizational standards without human intervention

---

## 2. Memory Identity

| Key | Value |
|---|---|
| Memory Path | `${config.memory.tech-stack}dotnet.md` |
| Memory Dimension | LTM > Technology |
| Scope | All .NET backend systems |
| Version | 3.1.0 |
| Last Updated | 2026-02-12 |
| Owners | Architecture Team |
| Status | Active |

### Consuming Agents

| Agent | How It Uses This Memory |
|---|---|
| `phoenix:developer` | Reads via `${config.memory.tech-stack}` tag during implementation for coding standards, patterns, and guardrails |
| `phoenix:tech-lead` | Follows tech-stack tags to inform technical design decisions, layer structure, and library selection |
| `phoenix:engineering-manager` | References via `${config.memory.tech-stack}` tags when creating specs to set architectural constraints |
| `phoenix:bug-analyzer` | Loads for anti-pattern recognition and dependency-rule validation during RCA |

### Skill → Section Mapping

| Skill | Sections | Typical Recipe Phase |
|---|---|---|
| Requirements Analysis | 4, 6, 8 | Implement Story → fetch details |
| Tech Design Generation | 4, 5, 6, 12 | Implement Story → create tech design |
| Code Implementation | 4, 5, 6, 7, 9, 11, 12 | Implement Story → TDD implementation |
| Test Validation | 10 | Implement Story → TDD implementation |
| Code Review | 6, 7, 9, 10, 11, 13 | Implement Story → code review |
| Bug Analysis | 6, 9, 13, 15 | Fix Bug → identify RCA |
| Code Fix | 4, 6, 7, 9, 11, 12, 13 | Fix Bug → fix code |
| API Design | 8, 11, 16 | Implement Story → create tech design |
| Feasibility Analysis | 4, 6 | Product Feature Definition → technical feasibility |

### Recipe Traceability

How each recipe consumes this memory across its phases:

**Fix Bug** (`identify RCA → find fix → review → fix code → raise PR`)
| Recipe Phase | Agent | Skills Invoked | Sections Loaded |
|---|---|---|---|
| Identify RCA | `phoenix:bug-analyzer` | Bug Analysis | 6, 9, 13, 15 |
| Find fix | `phoenix:developer` | Code Fix | 4, 6, 7, 9, 11, 12, 13 |
| Review | `phoenix:tech-lead` | Code Review | 6, 7, 9, 10, 11, 13 |
| Fix code | `phoenix:developer` | Code Implementation, Test Validation | 4, 5, 6, 7, 9, 10, 11, 12 |

**Implement Story** (`fetch details → tech design → tasks → TDD → review → merge`)
| Recipe Phase | Agent | Skills Invoked | Sections Loaded |
|---|---|---|---|
| Tech design | `phoenix:tech-lead` | Tech Design Generation, API Design | 4, 5, 6, 8, 11, 12, 16 |
| TDD implementation | `phoenix:developer` | Code Implementation, Test Validation | 4, 5, 6, 7, 9, 10, 11, 12 |
| Code review | `phoenix:tech-lead` | Code Review | 6, 7, 9, 10, 11, 13 |

**Product Feature Definition** (`gather requirements → analyze domain → feasibility → approve`)
| Recipe Phase | Agent | Skills Invoked | Sections Loaded |
|---|---|---|---|
| Technical feasibility | `phoenix:tech-lead` | Feasibility Analysis | 4, 6 |

### Context Triggers

This memory is loaded when:
- A spec or story is tagged with `dotnet`, `.net`, `csharp`, or `aspnet`
- The codebase contains `.csproj`, `.sln`, or `Program.cs` files
- An agent needs to make decisions about .NET architecture, libraries, or API patterns

---

## 3. Technology Scope

These guidelines apply to backend systems implemented using:

- **.NET Core / ASP.NET Core**
  - ASP.NET Core Web API
  - Minimal APIs
  - Background Services
  - Worker Services
  - Azure Functions (isolated or in-process)
- Supported runtimes:
  - .NET 6 LTS
  - .NET 8 LTS (preferred)
- Hosting targets:
  - Azure App Service
  - Azure Container Apps / AKS
  - Azure Functions

---

## 4. Core Architecture Principles

- Clean Architecture is the **default architectural model**
- Dependencies **always point inward**
- Domain must be:
  - Framework-independent
  - Database-agnostic
  - Testable in isolation
- Explicit contracts > implicit coupling
- Optimize for **change, scale, and failure**

### Context-Aware Application

| Project Context | Architecture Expectation |
|---|---|
| **Greenfield service / Production API** | Full Clean Architecture — all layers, all rules enforced |
| **Azure Function (single-purpose)** | Simplified layers acceptable — Application + Domain sufficient; separate Infrastructure only if external dependencies are non-trivial |
| **Legacy migration** | Phased adoption — slice-by-slice (see Section 14); new code in Clean Architecture, existing code migrated incrementally |
| **Hotfix / Time-constrained** | Minimal-change strategy within existing architecture; tech debt tracked as a follow-up issue |
| **Prototype / Spike** | Clean Architecture not required; mark code as disposable; do not merge to main without refactoring |

---

## 5. Standard Project Structure

### Full Structure (Greenfield / Production Services)
```
src/
  <Project>.<Domain>/
  <Project>.<Domain>.Api/
  <Project>.<Domain>.Application/
  <Project>.<Domain>.Domain/
  <Project>.<Domain>.Infrastructure/
  <Project>.<Domain>.Contracts/
tests/
  <Project>.<Domain>.UnitTests/
  <Project>.<Domain>.IntegrationTests/
  <Project>.<Domain>.ContractTests/
docs/
  adr/
build/
  pipelines/
```

### Simplified Structure (Azure Functions / Small Services)
```
src/
  <Project>.<Domain>.Function/
  <Project>.<Domain>.Application/
  <Project>.<Domain>.Domain/
tests/
  <Project>.<Domain>.UnitTests/
```

When a simplified service grows to include multiple external dependencies or complex domain logic, migrate to the full structure.

---

## 6. Dependency Rules (Critical)

### Layer Model

| Layer | Responsibility |
|---|---|
| Presentation | APIs, controllers, input/output |
| Application | Use cases, orchestration, validation |
| Domain | Business rules, entities, value objects |
| Infrastructure | DB, messaging, external systems |

### Allowed Dependencies
Presentation → Application, Infrastructure (startup only)
Application → Domain
Infrastructure → Domain, Application
Domain → NONE

### Forbidden Dependencies
Presentation → Domain
Application → Infrastructure, Presentation
Domain → Any layer
Infrastructure → Presentation

**Violation Code:** `CLEAN_DEP_001`

---

## 7. Dependency Inversion & DI Standards

- ≥ **80% dependencies via abstractions**
- Constructor injection preferred
- **Intent**: Inversion of Control via a standards-compliant DI container
  - Primary: Microsoft.Extensions.DependencyInjection (built-in, zero-dependency)
  - Secondary: Autofac, Castle Windsor (when advanced features like interception or property injection are needed)
  - Constraint: Any container must integrate with the Microsoft hosting model (`IServiceCollection` / `IServiceProvider`)
- ❌ Service Locator forbidden

**Violation Codes**
- `CLEAN_DEP_002` – Concrete dependency
- `CLEAN_DEP_003` – Improper DI

---

## 8. API Design Rules

- Standardize error responses: **ProblemDetails** (RFC7807) with consistent error codes
- **Mandatory** Correlation IDs on all requests
- Required support:
  - Pagination (continuation tokens, pageSize)
  - ETags / optimistic concurrency
  - Idempotency-Key for POST (orders/payments)
- **Intent**: Structured input validation with typed error responses
  - Primary: FluentValidation (complex models, cross-field rules, reusable validators)
  - Secondary: DataAnnotations (simple DTOs with basic constraints)
  - Fallback: Manual validation returning structured `ProblemDetails` errors
- Return structured errors — never throw generic exceptions for validation

---

## 9. Domain Layer Independence (Critical)

**Allowed in Domain layer**
- `System.*`
- Logging & DI abstractions

**Forbidden in Domain layer**
- Entity Framework
- ASP.NET
- Web frameworks
- Database-specific libraries

---

## 10. Coverage Targets

Coverage targets adapt to project context. Agents should apply the column matching the current project phase.

| Layer | Greenfield / Critical Workflows | Established Service | Legacy Migration |
|---|---|---|---|
| Domain | 90% | 85% | 70% |
| Application | 85% | 80% | 65% |
| Infrastructure | 70% | 65% | 50% |
| Presentation | 60% | 55% | 40% |

**Context rules**:
- **Critical workflows** (payments, orders, auth) always use Greenfield column regardless of project phase
- **Legacy migration**: coverage targets apply to *new and modified code only*; existing untouched code is not held to these thresholds
- **Hotfix**: no coverage regression — new tests must cover the fix; overall thresholds not enforced for the hotfix scope

**Enforcement**: Agents validate coverage against these targets using quality gates defined in `${config.memory.practices.implementation.quality-gates}` and testing standards in `${config.memory.practices.testing.standards}`.

---

## 11. Code Standards

- Interfaces: max 7 methods, cohesion ≥ 0.8, role-based, XML documentation required
- Enable nullable reference types
- Use analyzers: FxCop/Roslyn + StyleCop (team preference)
- Enforce formatting via `dotnet format`
- Treat warnings as errors in CI for main/release branches

---

## 12. Library Selection by Intent

Each entry defines the **intent** (what outcome is needed) with a tiered selection strategy. Agents should select the highest-ranked option that fits the project context.

| Intent | Primary | Secondary | Fallback | Selection Context |
|---|---|---|---|---|
| **Web API hosting** | ASP.NET Core Web API (controllers) | Minimal APIs | — | Minimal APIs for small services / Azure Functions; controllers for large domains |
| **Input validation** | FluentValidation | DataAnnotations | Manual + ProblemDetails | FluentValidation for complex models; DataAnnotations for simple DTOs |
| **Mediation / CQRS** | MediatR | Lightweight in-process handlers (no library) | Direct service calls | MediatR for cross-cutting pipeline behaviors; skip for simple CRUD services |
| **Resilience** | Polly | Microsoft.Extensions.Http.Resilience (.NET 8+) | Manual retry with exponential backoff | .NET 8 resilience extensions wrap Polly; use directly for pre-.NET 8 |
| **Structured logging** | Serilog + AppInsights sink | Microsoft.Extensions.Logging + AppInsights provider | Console structured JSON | Serilog when rich sink ecosystem needed; built-in for simple services |
| **Authentication** | Microsoft.Identity.Web | ASP.NET Core JWT Bearer middleware | — | Identity.Web for Azure AD / Entra ID; raw JWT Bearer for non-Microsoft IdPs |
| **Unit testing** | xUnit + FluentAssertions | NUnit + Shouldly | MSTest | xUnit preferred for parallelism; NUnit acceptable for teams already using it |
| **Integration testing** | Testcontainers + WebApplicationFactory | In-memory providers (EF InMemory, test doubles) | — | Testcontainers for realistic DB testing; in-memory for speed in CI |
| **Object mapping** | Mapster | AutoMapper | Manual mapping | Mapster for performance; AutoMapper for teams already invested; manual for < 5 mappings |
| **API documentation** | Swashbuckle (Swagger) | NSwag | — | Swashbuckle for standard OpenAPI; NSwag when client generation is needed |
| **API versioning** | Asp.Versioning (Microsoft) | URL path conventions | — | Library-based for public APIs; URL conventions acceptable for internal services |

---

## 13. Anti-Patterns

### Always Avoid (any context)
- Fat controllers / business logic in API layer — violates layer separation (Section 6)
- Domain models as "anemic DTOs" without rules/invariants — defeats the purpose of a Domain layer
- Sharing EF entities directly as API response models — couples persistence to API contract
- Using exceptions for control flow (especially validation) — use structured error returns instead (Section 8)
- No correlation ID / inconsistent logging — breaks observability across services (Section 15)
- Unbounded retries without backoff — causes cascading failures

### Context-Dependent (evaluate before flagging)
- **Generic repositories** — anti-pattern when they hide query intent or performance characteristics; acceptable for simple CRUD with uniform access patterns
- **Skipping idempotency keys** — anti-pattern for payment/order creation and any externally-visible mutation; acceptable for internal, retryable operations where the consumer controls replay
- **AutoMapper for simple mappings** — not an anti-pattern itself, but unnecessary overhead when < 5 mappings exist (see Section 12, Object mapping row)

---

## 14. Legacy-to-Clean-Architecture Migration Knowledge

Knowledge for agents operating in codebases that have not yet adopted Clean Architecture.

### Target State
- All .NET services follow Clean Architecture (Sections 4–6)
- API contracts stabilized via a Contracts project (Section 5)
- Structured error responses via ProblemDetails with correlation IDs (Section 8)

### Migration Patterns

| Pattern | When to Apply | Risk |
|---|---|---|
| **Vertical slice extraction** | A bounded domain area can be isolated into its own Application + Domain layers without rewriting the entire service | Low |
| **Contracts-first stabilization** | Public API or event schemas are volatile; introducing a Contracts project decouples consumers from internal refactoring | Low |
| **ProblemDetails + Correlation ID retrofit** | Error responses are inconsistent; this is a non-breaking change that improves observability immediately | Low |
| **CQRS introduction** | A workflow has high churn, complex reads/writes, or would benefit from separate read/write models | Medium |
| **Observability before refactor** | Adding structured logging and health checks before major structural changes ensures regressions are detectable | Low |

### Coexistence Rules
- New code in a migrating codebase **must** follow Clean Architecture (Sections 4–6)
- Existing code is migrated incrementally — no big-bang rewrites
- Mixed-architecture services are acceptable during migration; the boundary between old and new code should be explicit (e.g., separate namespaces or projects)
- Coverage targets for migrating code follow the Legacy Migration column in Section 10

---

## 15. Observability

- Required structured log fields: `correlationId`, `userId`/`objectId`, and domain-specific entity identifiers relevant to the service context (e.g., `orderId`, `tenantId`)
- Health checks: liveness + readiness + dependency checks
- Never log secrets or PII (mask tokens, emails when needed)

---

## 16. Authentication & Authorization

- Use **policy-based authorization** (avoid role checks scattered across controllers)
- Keep authorization rules in **Application layer** where possible
- Map claims consistently: `email`, `objectId`, `roles`

---

### References

Microsoft Docs: ASP.NET Core, EF Core, Microsoft.Identity.Web
RFC7807 Problem Details (error responses)
Polly resilience patterns and best practices

> **Architecture knowledge enables deterministic agent decisions.**
