# Spring Boot Tech Stack Knowledge

## Overview

Spring Boot framework knowledge for building production-grade Java applications. This file covers framework-specific patterns for configuration, error handling, data access, integrations, and cross-cutting concerns. It contains principles, reasoning, and decision guidance — not step-by-step instructions.

**Memory Type**: Long-term memory (LT) — Tech stack guidance for agents.

**Role**: Agents read this memory for Spring Boot framework conventions, patterns, and decision guidance. Loaded via tech stack tags in `spec.md`.

**Memory Path**: `${config.memory.tech-stack}/spring-boot.md`

**Consuming Agents**: `phoenix:engineering-manager` (tags), `phoenix:tech-lead` (primary), `phoenix:developer` (implementation), `phoenix:bug-analyzer` (analysis)

**Context Triggers**: Loaded when `spec.md` contains a `spring-boot` tech stack tag. Always co-load with `java.md`.

**Related knowledge**: `java.md` for core Java standards (always co-load), `../testing/standards.md` for coverage methodology, `../best-practices/` for architecture patterns.

## Project Structure

- Use layered architecture: controllers, services, repositories, models — **why**: enforces separation of concerns; each layer has a single responsibility and can be tested independently
- Separate configuration classes in a dedicated config package — **why**: keeps `@Configuration` beans discoverable and prevents them from scattering across business packages
- Isolate third-party clients in an integration package — **why**: creates a boundary between your domain and external contracts; changes to external APIs only affect one package
- Keep database migrations under `src/main/resources/db/migration/` — **why**: this is the default path for both Flyway and Liquibase; avoids custom configuration and matches team expectations
- Place AOP aspects in a dedicated aspect package — **why**: cross-cutting concerns are easier to audit, test, and control when they live together rather than being scattered across layers

## Configuration

**Intent**: Configuration must be externalized, type-safe, and secrets must never be stored in source code.

- Follow configuration hierarchy: env vars > system properties > profile YAML > defaults — **why**: this is Spring Boot's built-in precedence; environment-specific overrides happen at deployment time without code changes
- Use `@ConfigurationProperties` with `@Validated` for type-safe configuration — **why**: catches misconfiguration at startup (missing values, wrong types) instead of at runtime when the code path is hit
- Never store secrets in YAML; inject via secret managers or environment variables — **why**: YAML files are committed to version control; secrets in VCS leak through history, CI logs, and forks
- Use `@Profile` for environment-specific beans — **why**: ensures dev-only beans (mock services, seed data) never activate in production
- Tune connection pool sizes per environment — **why**: dev needs 2-5 connections, production needs 20-50+; a single setting either wastes resources or causes connection exhaustion

**Recommended options for secret management**: HashiCorp Vault, AWS Secrets Manager, Azure Key Vault, K8s Secrets (encrypted at rest).

### Context: Spring Boot 3.x

- Use `spring.config.import` for external config sources — **why**: replaces the bootstrap context pattern from Spring Cloud Config, simplifying the configuration chain

### Context: Spring Boot 2.x (legacy)

- Use `bootstrap.yml` with Spring Cloud Config — **why**: Boot 2.x requires the bootstrap context for external config sources; `spring.config.import` is not available

## Error Handling

**Intent**: Exception handling must be centralized, consistent, and separated from business logic.

- Centralize HTTP-layer exception handling via `@ControllerAdvice` — **why**: scattering try-catch blocks across controllers duplicates error formatting logic; a single `@ControllerAdvice` guarantees uniform error responses across all endpoints
- Use AOP `@AfterThrowing` for service-layer exception handling (logging, metrics, alerting) — **why**: separates the concern of "what to do when something fails" from the business logic itself; adding a new service method automatically gets exception logging without any extra code
- Return consistent error response DTOs from `@ControllerAdvice` — **why**: API consumers need a predictable error format (status, message, timestamp, path) to handle failures programmatically
- Only catch exceptions in individual methods when recovery is possible at that point — **why**: catching without recovery hides failures from the centralized handler; only catch when the method can meaningfully recover and continue
- Define a custom exception hierarchy mapped to HTTP status codes — **why**: `ResourceNotFoundException` → 404, `ValidationException` → 400, `ConflictException` → 409; the mapping lives in `@ControllerAdvice`, not scattered across controllers

## Data Access

**Intent**: Database interactions must be efficient, safe from N+1 queries, and properly transaction-managed.

- Use Spring Data repositories for standard CRUD — **why**: eliminates boilerplate DAO code; derived query methods cover most use cases without manual SQL
- Use `@Transactional(readOnly = true)` for read operations — **why**: read-only transactions skip dirty checking and flush, reducing overhead; some databases optimize read-only connections
- Disable `spring.jpa.open-in-view` (set `spring.jpa.open-in-view=false`) — **why**: open-in-view keeps the database connection open for the entire HTTP request including view rendering; this wastes connections, causes lazy loading surprises, and makes connection pool exhaustion more likely under load
- Use projections and DTOs for queries that don't need full entities — **why**: fetching only needed columns reduces data transfer and avoids triggering lazy-loaded associations
- Enable JPA batch inserts for bulk operations — **why**: batch inserts reduce database round-trips from N to N/batchSize
- Keep database migrations versioned and incremental — **why**: each migration is a discrete, auditable change; rollback and forward-compatibility depend on incremental steps

**Recommended options**: Spring Data JPA (relational), Spring Data Redis (caching/sessions), Flyway or Liquibase (migrations).

### Context: Reactive Stack

- Use R2DBC instead of JPA — **why**: JPA is blocking by design; R2DBC provides non-blocking database access compatible with the reactive stack. Note: Spring Data R2DBC repositories have a different API surface than JPA repositories — migrating is not just a dependency swap

## Third-Party Integrations

**Intent**: External calls must be timeout-bounded, resilient to failure, and observable.

- Configure explicit connect, read, and write timeouts on all HTTP clients — **why**: unbounded timeouts cause thread pool exhaustion when an external service hangs; a single slow dependency can cascade into full application failure
- Apply circuit breaking, retry, and bulkhead isolation on external calls — **why**: circuit breakers prevent repeated calls to a failing service; retries handle transient failures; bulkheads prevent one slow integration from consuming all threads
- Wrap third-party clients in adapter classes — **why**: isolates external API contracts from your domain; when the external API changes, only the adapter changes, not your business logic
- Instrument integrations with metrics and distributed tracing — **why**: without observability, diagnosing "which external call is slow" in production requires guesswork

**Recommended options for resilience**: Resilience4j (lightweight, Spring Boot integration), Spring Retry (simpler, for basic retry-only needs).

**Recommended options for HTTP clients**: `RestClient` (Spring Boot 3.2+, synchronous), `WebClient` (reactive or non-blocking needed), `RestTemplate` (legacy Boot 2.x only).

**Recommended options for messaging**: Spring Cloud Stream (broker-agnostic abstraction), Spring Kafka (Kafka-specific, more control).

### Context: Spring Boot 3.2+

- Prefer `RestClient` over `RestTemplate` for synchronous HTTP — **why**: `RestClient` is the modern replacement with a fluent API; `RestTemplate` is in maintenance mode

### Context: Spring Boot 2.x

- Use `RestTemplate` with `RestTemplateBuilder` — **why**: `RestClient` does not exist in Boot 2.x; `RestTemplateBuilder` applies consistent timeouts and interceptors

## AOP (Aspect-Oriented Programming)

**Intent**: Cross-cutting concerns (logging, auditing, metrics) must be centralized, lightweight, and opt-in.

- Use `@Aspect` with `@Component` for cross-cutting concerns — **why**: Spring manages aspect lifecycle and dependency injection; standalone aspects miss Spring context
- Prefer custom annotations (`@Loggable`, `@Auditable`) as pointcut markers — **why**: explicit opt-in makes it clear which methods are affected; blanket package-wide pointcuts cause unexpected behavior and performance overhead
- Keep aspect logic lightweight; delegate heavy processing to dedicated services — **why**: aspects execute on every matched method invocation; heavy logic in aspects creates latency across the entire application
- Use `@Order` to control aspect execution precedence — **why**: when multiple aspects apply to the same method, execution order is undefined unless explicitly set; this causes non-deterministic behavior in logging vs security vs transaction aspects
- Use pointcut expressions to target specific layers — **why**: `within(..service..)` ensures service-layer aspects don't accidentally fire on controllers or repositories

### AOP Use Cases

| Concern | Advice type | Why AOP over manual code |
|---------|-------------|--------------------------|
| Logging (entry/exit/timing) | `@Around` | Eliminates repetitive log statements in every method; one aspect covers all annotated methods |
| Exception handling | `@AfterThrowing` | Centralizes error formatting and logging; prevents inconsistent error handling across services |
| Audit logging | `@Around` | Captures who/what/when without polluting business logic with audit code |
| Performance metrics | `@Around` | Consistent timing instrumentation without manual `StopWatch` in every method |

## Testing

**Intent**: Tests must be fast, isolated, and cover critical paths per coverage thresholds defined in `../testing/standards.md`.

- Prefer slice annotations (`@WebMvcTest`, `@DataJpaTest`, `@JsonTest`) over full `@SpringBootTest` — **why**: slice tests load only the relevant Spring context layer, making them 5-10x faster than full context tests; full `@SpringBootTest` starts the entire application for every test class
- Use real dependencies in containers for integration tests — **why**: in-memory replacements (H2 for Postgres, embedded brokers) behave differently from production; real containers catch compatibility issues early
- Stub external HTTP services in tests — **why**: tests that call real external APIs are slow, flaky, and fail when the external service is down; stubs make tests deterministic
- Test AOP aspects independently with a minimal Spring context — **why**: verifying aspect behavior doesn't require the full application; a minimal context with a test target class is faster and more focused

**Recommended options**: JUnit 5 (test framework), Testcontainers (real-dependency integration tests), WireMock (HTTP service stubbing), AssertJ (fluent assertions).

> Coverage threshold is a reference. See `../testing/standards.md` for project-specific thresholds and methodology.

## Logging

**Intent**: Produce logs that are structured, environment-aware, and integrated with observability tooling.

- Use structured JSON logging in containerized and production environments — **why**: log aggregators (ELK, Datadog, CloudWatch) parse JSON natively; unstructured text requires fragile regex parsing
- Include correlation IDs via MDC (Mapped Diagnostic Context) — **why**: enables tracing a single request across multiple services and threads; Spring Boot integrates MDC with Sleuth/Micrometer tracing
- Use Spring Boot Actuator's `/actuator/loggers` for runtime log level changes — **why**: avoids redeployment to enable debug logging for a specific package during incident investigation
- Never log request/response bodies containing PII — **why**: logs are stored long-term with broad access; PII in logs creates compliance violations (GDPR, HIPAA)

**Recommended options for observability**: Micrometer (metrics), OpenTelemetry (tracing), Spring Boot Actuator (health, info, log management).

## Security

**Intent**: Secure by default, validate at boundaries, and never store secrets in code.

- Customize security via `SecurityFilterChain` beans — **why**: programmatic security configuration is testable, version-controlled, and explicit; XML and annotation-only security hides rules
- Validate all inputs with annotation-driven validation — **why**: `@Valid` on controller parameters catches malformed input before it reaches business logic; without it, invalid data propagates and causes obscure failures
- CSRF must remain enabled for browser-session-based authentication. Only disable CSRF for stateless REST APIs using Bearer token authentication — **why**: CSRF protection is essential for browser-based sessions with cookies; stateless JWT APIs don't use cookies, so CSRF adds overhead without security benefit in that context
- Secure Actuator endpoints in production — **why**: actuator exposes sensitive data (env vars, beans, heap dumps); unrestricted access is an information disclosure vulnerability
- Audit dependencies for known vulnerabilities — **why**: unpatched libraries are the most common attack vector; automated scanning catches CVEs before deployment

**Recommended options for auth**: Spring Security with `SecurityFilterChain`, `spring-boot-starter-oauth2-resource-server` (JWT validation).

**Recommended options for validation**: Jakarta Bean Validation, Hibernate Validator.

**Recommended options for vulnerability scanning**: OWASP dependency-check, Snyk.

## Performance

**Intent**: Optimize database access, caching, and connection management for production load.

- Tune connection pool sizes per environment — **why**: too few connections cause request queuing; too many waste database resources and cause contention
- Cache frequently accessed, rarely changing data — **why**: eliminates repeated database round-trips for reference data; reduces latency and database load
- Use `@Transactional(readOnly = true)` on read-heavy endpoints — **why**: skips JPA dirty checking and flush; some JDBC drivers optimize read-only connections
- Configure graceful shutdown — **why**: in-flight requests complete before the application stops, preventing errors during restarts
- Configure connection pool explicitly (pool size, connection timeout, idle timeout, max lifetime) per environment
- Ensure total pool size across application instances stays within database connection limits

**Recommended options for connection pooling**: HikariCP (Spring Boot default, preferred for all new projects), Tomcat JDBC Pool (only when specific configuration features are required).

**Recommended options for caching**: Spring Cache abstraction with Redis (distributed), Caffeine (local, high-throughput).

## Code Standards

- Follow core Java standards defined in `java.md`
- Document REST endpoints via OpenAPI annotations — **why**: auto-generated API docs stay in sync with code; hand-written docs drift and mislead consumers
- Use custom annotations as AOP pointcut markers instead of blanket package-wide pointcuts — **why**: explicit opt-in prevents unexpected aspect execution on new classes
- Enforce layer dependency rules with architectural tests — **why**: prevents controllers from bypassing services to call repositories directly; catches violations at build time, not code review

## Anti-Patterns to Avoid

| Anti-pattern | Why it's harmful |
|-------------|-----------------|
| Using `@SpringBootTest` for every test | Starts full application context; slows test suite by orders of magnitude |
| Business logic in controllers | Controllers become untestable without HTTP; logic can't be reused by other entry points (messaging, CLI) |
| Lazy loading across transaction boundaries | Causes `LazyInitializationException` or silent N+1 queries depending on `open-in-view` setting |
| Catching exceptions in every service method | Duplicates error handling; use centralized `@ControllerAdvice` or AOP instead |
| Hardcoding URLs to external services | Breaks across environments; externalize in configuration properties |
| Blanket `@Transactional` on all service methods | Read-only operations don't need write transactions; unnecessary locking reduces throughput |
| Using `@Autowired` on fields | Hides dependencies, prevents immutability, requires reflection for testing |
| Ignoring `/actuator` security | Actuator endpoints expose sensitive data (env vars, beans, heap dumps); secure them in production |

## Context-Aware Decision Guide

| Context | Guidance |
|---------|----------|
| **Spring Boot 2.x (legacy)** | Use `RestTemplate`, `bootstrap.yml` for config, `WebSecurityConfigurerAdapter` for security. Migration path: upgrade to Boot 3.x when possible. |
| **Spring Boot 3.x** | Use `RestClient`, `spring.config.import`, `SecurityFilterChain`. Jakarta EE namespace (`jakarta.*` not `javax.*`). |
| **Web service (servlet)** | Default stack. HikariCP, `@WebMvcTest` slices, synchronous `RestClient`. |
| **Reactive service** | `spring-boot-starter-webflux`, `WebClient`, `@WebFluxTest`, R2DBC instead of JPA. Do not mix servlet and reactive stacks. |
| **Batch / scheduled jobs** | `spring-boot-starter-batch`, `@Scheduled`. Minimize context size. Virtual threads (Java 21+) for parallel I/O steps. |

## References

- [Spring Boot Documentation](https://docs.spring.io/spring-boot/reference/)
- [Spring AOP Documentation](https://docs.spring.io/spring-framework/reference/core/aop.html)
- [Spring Security Reference](https://docs.spring.io/spring-security/reference/)
- [Spring Data JPA Reference](https://docs.spring.io/spring-data/jpa/reference/)
- [Resilience4j Documentation](https://resilience4j.readme.io/docs/getting-started-3)
- [Testcontainers for Spring Boot](https://testcontainers.com/guides/testing-spring-boot-rest-api-using-testcontainers/)
