# Java Tech Stack Knowledge

## Overview

Core Java language knowledge. This file covers language conventions, idioms, and standard library usage. It contains principles, reasoning, and decision guidance — not step-by-step instructions.

**Memory Type**: Long-term memory (LT) — Tech stack guidance for agents.

**Role**: Agents read this memory for Java language conventions, patterns, and decision guidance. Loaded via tech stack tags in `spec.md`.

**Memory Path**: `${config.memory.tech-stack}/java.md`

**Consuming Agents**: `phoenix:engineering-manager` (tags), `phoenix:tech-lead` (primary), `phoenix:developer` (implementation), `phoenix:bug-analyzer` (analysis)

**Context Triggers**: Loaded when `spec.md` contains a `java` tech stack tag.

**Related knowledge**: `spring-boot.md` for Spring Boot projects, `../testing/standards.md` for coverage methodology.

## Project Structure

- Organize code into layers with clear separation of concerns — **why**: each layer has a single responsibility and can be tested independently
- Keep configuration separate from business logic — **why**: configuration changes across environments; business logic should not
- One public class per file — **why**: matches Java's compilation model and makes classes easy to locate by filename
- Package by feature over package by layer for larger codebases — **why**: feature-based packaging keeps related code together, reducing cross-package dependencies and making it easier to reason about a single feature

## Naming Conventions

- Classes and interfaces: PascalCase (`OrderService`, `Payable`)
- Methods and variables: camelCase (`calculateTotal`, `orderCount`)
- Constants: UPPER_SNAKE_CASE (`MAX_RETRY_COUNT`)
- Packages: lowercase, reverse domain (`com.example.order.service`)
- Booleans: prefix with `is`, `has`, `can`, `should` (`isActive`, `hasPermission`)

> **Why**: Consistent naming reduces cognitive load when reading unfamiliar code. These conventions are universal in the Java ecosystem and match IDE defaults, autocompletion, and static analysis tooling.

## Error Handling

- Define a custom exception hierarchy rooted in a base application exception — **why**: gives a single catch point for application-level errors and enables consistent error response formatting
- Use unchecked exceptions for programming errors, checked for recoverable conditions — **why**: unchecked exceptions signal bugs (fix the code), checked exceptions signal expected failures (handle gracefully)
- Never catch `Exception` or `Throwable` broadly; catch specific types — **why**: broad catches hide bugs, swallow unrelated errors, and make debugging significantly harder
- Always include context in exception messages (entity ID, operation, input) — **why**: "Order not found" is useless in logs; "Order 12345 not found during payment processing" is actionable
- Never swallow exceptions silently; log or rethrow — **why**: silent swallowing creates invisible failures that surface much later as data corruption or unexpected behavior
- Use `try-with-resources` for all `AutoCloseable` resources — **why**: prevents resource leaks (connections, file handles, streams) that cause memory/connection exhaustion under load

## Collections and Streams

- Prefer `List.of()`, `Map.of()`, `Set.of()` for immutable collections — **why**: immutability prevents accidental modification bugs and is thread-safe by default
- Use Streams for transformation and filtering; use loops for side-effects — **why**: streams express data pipelines declaratively, but side-effects in streams cause ordering and parallelism bugs
- Avoid nested streams; extract into named methods — **why**: nested streams are hard to read and debug; named methods add clarity about what each transformation does
- Use `Optional` for return types that may be absent; never for fields or parameters — **why**: `Optional` signals "this might not exist" to callers; using it for fields breaks serialization and adds unnecessary heap overhead

## Concurrency

**Intent**: Write thread-safe code that scales under load without deadlocks or data races.

- Prefer `ExecutorService` and `CompletableFuture` over raw threads — **why**: provides thread pool management, error handling, and composition; raw threads lack lifecycle control
- Use `ConcurrentHashMap` and atomic classes for shared mutable state — **why**: lock-free data structures scale better than synchronized blocks under contention
- Keep synchronized blocks as small as possible — **why**: large synchronized blocks serialize execution and become bottlenecks

### Context: Java 21+

- Use virtual threads for high-throughput I/O-bound workloads — **why**: virtual threads are lightweight (~1KB vs ~1MB for platform threads), enabling millions of concurrent tasks without thread pool tuning
- Platform threads remain appropriate for CPU-bound work — **why**: virtual threads don't improve CPU parallelism, only I/O concurrency
- Avoid pinning virtual threads with `synchronized`; prefer `ReentrantLock` — **why**: `synchronized` blocks pin virtual threads to carrier threads, negating their scalability advantage

## Modern Java Features

**Intent**: Use language features that reduce boilerplate and improve safety, based on the project's Java version.

### Context: Java 17+

- Use records for immutable data carriers (DTOs, value objects) — **why**: records auto-generate `equals()`, `hashCode()`, `toString()`, eliminating boilerplate and reducing bugs from hand-written implementations
- Use sealed classes/interfaces to model restricted type hierarchies — **why**: the compiler enforces exhaustive `switch` handling, catching missing cases at compile time instead of runtime
- Use pattern matching with `instanceof` to eliminate explicit casts — **why**: reduces error-prone manual casting and makes type-checking + usage a single readable expression
- Use text blocks for multi-line strings (SQL, JSON, templates) — **why**: avoids error-prone string concatenation and preserves readability of embedded formats

### Context: Java 21+

- Use switch expressions with pattern matching — **why**: combines type checking, deconstruction, and null handling in a single exhaustive expression
- Use record patterns in `instanceof` and `switch` for deconstruction — **why**: eliminates accessor calls and temporary variables when working with nested data structures

## Dependency Management

**Intent**: Builds must be reproducible, version-locked, and auditable for security vulnerabilities.

- Lock dependency versions explicitly; avoid dynamic version ranges — **why**: dynamic ranges (e.g., `1.+`) cause non-reproducible builds where the same code compiles differently on different days
- Verify the dependency tree is clean before releases — **why**: transitive dependency conflicts cause `NoSuchMethodError` and `ClassNotFoundException` at runtime, which are hard to diagnose
- Audit dependencies for known vulnerabilities regularly — **why**: unpatched libraries are the most common attack vector in Java applications (see Log4Shell as an example)

**Recommended options**: Maven (with wrapper) or Gradle (Kotlin DSL, with wrapper) for builds; OWASP dependency-check or Snyk for vulnerability scanning.

## Testing

**Intent**: Tests must be isolated, readable, and cover critical paths per coverage thresholds defined in `../testing/standards.md`.

- Follow Arrange-Act-Assert pattern — **why**: consistent structure makes tests scannable; readers instantly know what's being set up, executed, and verified
- Test edge cases: nulls, empty collections, boundary values — **why**: most production bugs occur at boundaries, not in the happy path
- Isolated unit tests with mocking for external dependencies — **why**: unit tests that hit real databases or APIs are slow, flaky, and test integration rather than logic

**Recommended options**: JUnit 5 (test framework), Mockito (mocking), AssertJ (fluent assertions).

> Coverage threshold is a reference. See `../testing/standards.md` for project-specific thresholds and methodology.

## Performance

- Use connection pooling for databases
- Configure pool size, timeouts, and idle limits per environment
- Ensure total pool size across application instances stays within database connection limits
- Prefer `StringBuilder` for string construction in loops — **why**: string concatenation in loops creates O(n²) memory allocation; `StringBuilder` is O(n)
- Minimize object creation in hot paths — **why**: excessive short-lived objects increase GC pressure and cause latency spikes
- Use lazy initialization for expensive resources — **why**: avoids paying the cost of initialization until the resource is actually needed

## Logging

**Intent**: Produce logs that are structured, traceable, and safe.

- Use a logging facade, not a concrete implementation — **why**: decouples application code from the logging backend; allows swapping implementations without code changes
- Use parameterized messages (`log.info("Order {} created", orderId)`) not string concatenation — **why**: concatenation evaluates eagerly even when the log level is disabled, wasting CPU; parameterized messages are lazy
- Log at appropriate levels: ERROR for failures requiring attention, WARN for recoverable issues, INFO for business events, DEBUG for diagnostics — **why**: consistent levels enable filtering and alerting; mixing levels makes monitoring unreliable
- Include correlation IDs in log messages — **why**: enables tracing a single request across multiple services/threads in distributed systems
- Never log sensitive data (passwords, tokens, PII) — **why**: logs are often stored long-term in systems with broad access; leaked credentials in logs are a common security breach vector

**Recommended options**: SLF4J (facade), Logback or Log4j2 (implementation).

## Security

**Intent**: Defend against OWASP Top 10 at the code level.

- Validate and sanitize all external inputs — **why**: unvalidated input is the root cause of injection, XSS, and path traversal attacks
- Use parameterized queries exclusively — **why**: string-concatenated SQL is the #1 cause of SQL injection; parameterized queries make injection structurally impossible
- Never hardcode secrets; inject via environment variables or secret managers — **why**: secrets in source code leak through version history, CI logs, and dependency scanning
- Keep dependencies updated — **why**: known CVEs in libraries are actively exploited; automated scanners make unpatched apps easy targets

## Code Standards

- Avoid wildcard imports; organize as java, jakarta, org, com — **why**: wildcard imports hide where classes come from, cause naming collisions between packages, and create noisy diffs on unrelated changes
- Keep methods short (aim for ~30 lines) — **why**: long methods are harder to test, name, and reason about; shorter methods encourage single responsibility and reuse
- Use `final` for variables that should not be reassigned — **why**: signals intent to readers and prevents accidental mutation; the compiler enforces it
- Prefer constructor-based dependency injection over field injection — **why**: constructor injection makes dependencies explicit, supports immutability, and enables testing without reflection or a DI container

## Anti-Patterns to Avoid

| Anti-pattern | Why it's harmful |
|-------------|-----------------|
| Raw types instead of generics | Loses compile-time type safety; errors surface at runtime as `ClassCastException` |
| Returning `null` where `Optional` fits | Callers forget to null-check, causing `NullPointerException` in production |
| Catching and ignoring exceptions | Creates invisible failures that corrupt state silently |
| Mutable public fields | Breaks encapsulation; any code can change state without validation |
| String concatenation in loops | Creates O(n²) memory allocation; `StringBuilder` is O(n) |
| God classes with mixed responsibilities | Impossible to test in isolation; every change risks unrelated breakage |
| Wildcard imports | Naming collisions, unclear provenance, noisy diffs |

## Recommended Options

Pick based on project context, not as a mandated single choice.

| Concern | Options | Notes |
|---------|---------|-------|
| **Logging facade** | SLF4J | De facto standard; nearly universal |
| **Logging impl** | Logback, Log4j2 | Log4j2 for async-heavy workloads |
| **Testing** | JUnit 5, Mockito, AssertJ | JUnit 5 is the ecosystem standard; AssertJ adds fluent readability |
| **Utility** | Apache Commons Lang, Guava | Use sparingly — prefer JDK equivalents when available |
| **Validation** | Jakarta Bean Validation, Hibernate Validator | Annotation-driven validation |
| **JSON** | Jackson, Gson | Jackson is faster and more feature-rich; Gson is simpler for small use cases |
| **Build** | Maven, Gradle | Maven for convention-heavy projects; Gradle for complex multi-module builds |
| **Code quality** | Checkstyle, SpotBugs, ArchUnit | ArchUnit uniquely enforces architectural rules as tests |

## Context-Aware Decision Guide

| Context | Guidance |
|---------|----------|
| **Java 11 (legacy)** | No records, no sealed classes, no pattern matching. Use Lombok for boilerplate reduction if needed. Stick to `ExecutorService` for concurrency. |
| **Java 17 (LTS)** | Use records, sealed classes, text blocks, pattern matching with `instanceof`. This is the baseline for all Modern Java Features above. |
| **Java 21+ (LTS)** | Add virtual threads, switch pattern matching, record patterns. Prefer `ReentrantLock` over `synchronized` in concurrent code. |
| **Library / SDK** | Minimize dependencies. Target the lowest Java version your consumers need. Avoid framework-specific annotations. |

## References

- [Java Language Specification](https://docs.oracle.com/javase/specs/)
- [Effective Java — Joshua Bloch](https://www.oreilly.com/library/view/effective-java/9780134686097/)
- [Java Naming Conventions](https://www.oracle.com/java/technologies/javase/codeconventions-namingconventions.html)
