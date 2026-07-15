# FastAPI Tech Stack Knowledge

## Overview

FastAPI framework knowledge for building production-grade Python web services and APIs. This file covers framework-specific patterns for configuration, dependency injection, request/response modeling, error handling, data access, async behavior, and cross-cutting concerns. It contains principles, reasoning, and decision guidance — not step-by-step instructions.

**Memory Type**: Long-term memory (LT) — Tech stack guidance for agents.

**Role**: Agents read this memory for FastAPI framework conventions, patterns, and decision guidance. Loaded via tech stack tags in `spec.md`.

**Memory Path**: `${config.memory.tech-stack}/fastapi.md`

**Consuming Agents**: `phoenix:engineering-manager` (tags), `phoenix:tech-lead` (primary), `phoenix:developer` (implementation), `phoenix:bug-analyzer` (analysis)

**Context Triggers**: Loaded when `spec.md` contains a `fastapi` tech stack tag. Always co-load with `python.md`.

**Related knowledge**: `python.md` for core Python standards (always co-load), `postgresql.md` for relational data access, `../testing/patterns-python.md` for pytest patterns, `../testing/standards.md` for coverage methodology.

## Project Structure

- Organize routes into `APIRouter` modules grouped by feature, included via `include_router` with `prefix` and `tags` — **why**: keeps a single feature's endpoints together and avoids one monolithic app module that every change touches
- Use layered separation: routers (HTTP), services (business logic), repositories (data access), schemas (Pydantic models) — **why**: route handlers stay thin and testable; business logic is reusable outside the HTTP entry point
- Keep Pydantic schemas separate from ORM/persistence models — **why**: coupling the API contract to the database schema leaks storage details to consumers and forces breaking API changes on every migration
- Construct the app via an application factory or `lifespan` setup, not module-level side effects — **why**: a factory lets tests build isolated app instances with overridden dependencies; module-level wiring runs on import and is hard to control
- Isolate third-party clients in an integration package — **why**: changes to external API contracts only affect one boundary, not the domain

## Configuration

**Intent**: Configuration must be externalized, type-safe, and secrets must never be stored in source code.

- Use `pydantic-settings` `BaseSettings` for typed configuration loaded from environment variables — **why**: validates and coerces config at startup, catching missing or malformed values before the first request instead of mid-request
- Provide settings as an injectable dependency (cached with `lru_cache`) — **why**: makes configuration overridable in tests and avoids re-reading the environment on every access
- Never store secrets in code, `.env` files committed to VCS, or default values — **why**: committed secrets leak through history, CI logs, and forks
- Separate per-environment configuration via environment variables, not code branches — **why**: the same image runs in every environment; behavior changes by configuration, not by rebuild

**Recommended options for secret management**: HashiCorp Vault, AWS Secrets Manager, Azure Key Vault, K8s Secrets (encrypted at rest).

## Dependency Injection

**Intent**: Use FastAPI's `Depends` system to wire collaborators, enforce cross-cutting concerns, and keep handlers thin.

- Inject collaborators (DB sessions, settings, auth context, services) via `Depends` rather than constructing them inside handlers — **why**: makes dependencies explicit and overridable in tests via `app.dependency_overrides`, without monkeypatching
- Prefer the `Annotated[Type, Depends(...)]` form over default-value `Depends` — **why**: the annotated form is reusable across endpoints and keeps the parameter's type visible to type checkers
- Use dependencies for authentication, authorization, and shared validation — **why**: centralizes the check in one place that every protected route declares explicitly, instead of repeating guard code per handler
- Use `yield` dependencies for setup/teardown (DB sessions, connections) — **why**: guarantees cleanup (session close, rollback on error) runs even when the handler raises
- Keep dependency functions lightweight — **why**: they execute on every matched request; heavy work in a dependency adds latency to every call that declares it

## Request and Response Models

**Intent**: Let Pydantic models define the validated contract at the boundary; never trust raw input.

- Define explicit Pydantic models for request bodies and responses — **why**: FastAPI validates, coerces, and documents from these models; raw `dict` payloads bypass validation and OpenAPI generation
- Use separate models for create, update, and read (e.g. `OrderCreate`, `OrderUpdate`, `OrderRead`) — **why**: input and output have different fields (no server-assigned IDs on input; no secrets on output); one shared model leaks or demands fields it shouldn't
- Set `response_model` on routes to control serialized output — **why**: prevents accidentally leaking internal or sensitive fields by serializing only the declared shape
- Validate constraints in the model (`Field` bounds, validators) rather than in the handler — **why**: validation failures return a consistent 422 automatically and keep handlers focused on orchestration
- Return domain/DTO models, never ORM entities directly — **why**: serializing ORM objects triggers lazy loads and couples the response to the persistence layer

### Context: Pydantic v2

- Use v2 idioms (`model_config`, `model_dump`, `field_validator`, `Annotated` constraints) — **why**: Pydantic v1 APIs (`Config` class, `.dict()`, `@validator`) are deprecated; v2 is significantly faster and is the FastAPI default on 0.100+

## Error Handling

**Intent**: Exception handling must be centralized, consistent, and separated from business logic.

- Raise `HTTPException` (or a custom subclass) for expected client-facing errors — **why**: maps cleanly to status codes and a structured body without manual `Response` construction
- Register centralized handlers with `@app.exception_handler` for custom exception types — **why**: a single handler guarantees a uniform error envelope across all endpoints instead of per-route formatting
- Define a custom exception hierarchy mapped to HTTP status codes — **why**: `ResourceNotFoundError` → 404, `ValidationError` → 400, `ConflictError` → 409; the mapping lives in one handler, not scattered across routes
- Return a consistent error response shape (e.g. RFC 7807 `problem+json` or a fixed error DTO) — **why**: consumers need a predictable structure (code, message, detail) to handle failures programmatically
- Let FastAPI handle `RequestValidationError` (422) unless a custom shape is required — **why**: the built-in handler already produces detailed field-level errors; override only to match an organization-wide envelope

## Data Access

**Intent**: Database interactions must be efficient, transaction-safe, and must not block the event loop.

- Use a session-per-request, provided by a `yield` dependency — **why**: scopes the unit of work to the request and guarantees commit/rollback/close; sharing a session across requests causes race conditions and leaked state
- For `async def` routes, use an async driver and async SQLAlchemy (2.0 style) — **why**: a synchronous/blocking ORM call inside an async route blocks the entire event loop, stalling all concurrent requests
- For synchronous ORM code, use `def` routes so FastAPI runs them in a threadpool — **why**: this offloads blocking work off the event loop without forcing a full async rewrite
- Use projections/DTOs for queries that don't need full entities — **why**: fetching only needed columns reduces transfer and avoids triggering relationship loads
- Keep migrations versioned and incremental with Alembic — **why**: each migration is a discrete, auditable, reversible change (see `postgresql.md` for schema conventions)

**Recommended options**: SQLAlchemy 2.0 (async or sync), SQLModel (SQLAlchemy + Pydantic), Alembic (migrations), `asyncpg`/`psycopg` (PostgreSQL drivers).

## Async and Concurrency

**Intent**: Choose `async def` vs `def` deliberately and never block the event loop.

- Use `async def` for routes whose I/O is async (async DB, `httpx`, async cache) — **why**: cooperative concurrency lets one worker serve many in-flight I/O-bound requests
- Use plain `def` for routes that call blocking libraries — **why**: FastAPI runs `def` routes in a threadpool, keeping the event loop free; a blocking call in `async def` freezes every concurrent request
- Offload unavoidable blocking calls inside async code via `run_in_threadpool` / `anyio.to_thread` — **why**: isolates the blocking work so the loop keeps serving other requests
- Do not perform CPU-bound work in request handlers — **why**: the GIL serializes CPU work and stalls the worker; push it to a task queue or a separate process (see `python.md` Concurrency)

## Third-Party Integrations

**Intent**: External calls must be timeout-bounded, resilient, and observable.

- Use an async HTTP client (`httpx.AsyncClient`) with explicit connect/read/write timeouts — **why**: unbounded timeouts exhaust the worker when an external service hangs; one slow dependency can cascade into full outage
- Reuse a single client instance across requests (created in `lifespan`) — **why**: connection pooling and keep-alive are lost if a new client is created per request, adding latency and socket churn
- Apply retries with backoff and circuit breaking on external calls — **why**: retries absorb transient failures; circuit breakers stop hammering a service that is already down
- Wrap third-party clients in adapter classes — **why**: isolates external contracts from the domain so an upstream API change touches only the adapter

**Recommended options**: `httpx` (async/sync HTTP client), `tenacity` (retry/backoff), `stamina` (tenacity-based retries with sane defaults).

## Background Work

**Intent**: Match the work to the right execution model; the request lifecycle is not a job runner.

- Use `BackgroundTasks` only for short, fire-and-forget work tied to a response (e.g. sending a notification) — **why**: background tasks run in the same process after the response; long or critical work blocks workers and is lost on restart
- Use a dedicated task queue for long-running, retryable, or scheduled work — **why**: queues provide durability, retries, and horizontal scaling that in-process background tasks cannot
- Use `lifespan` (async context manager) for startup/shutdown resources — **why**: the deprecated `@app.on_event` handlers are being removed; `lifespan` cleanly manages pools and clients across the app's life

**Recommended options for task queues**: Celery (mature, broad ecosystem), ARQ (async-native, Redis-based), Dramatiq (simpler alternative).

## Testing

**Intent**: Tests must be fast, isolated, and cover critical paths per coverage thresholds defined in `../testing/standards.md`.

- Test routes with `TestClient` (sync) or `httpx.AsyncClient` + `ASGITransport` (async) — **why**: exercises the real routing, validation, and serialization stack without a running server
- Override dependencies via `app.dependency_overrides` to inject test doubles (DB sessions, auth, clients) — **why**: swaps real collaborators for fakes without monkeypatching, keeping tests deterministic and fast
- Use real dependencies in containers for integration tests — **why**: in-memory substitutes (e.g. SQLite for PostgreSQL) behave differently and hide compatibility bugs
- Stub external HTTP services — **why**: tests that hit live APIs are slow, flaky, and fail when the upstream is down
- Use `pytest-asyncio` (or `anyio`) for async test functions — **why**: async routes and dependencies must be awaited within an event loop the test framework manages

**Recommended options**: pytest, pytest-asyncio, httpx (`AsyncClient`), Testcontainers (real-dependency integration tests), `respx` (httpx mocking). See `../testing/patterns-python.md`.

> Coverage threshold is a reference. See `../testing/standards.md` for project-specific thresholds and methodology.

## Logging

**Intent**: Produce logs that are structured, traceable, and safe.

- Use structured JSON logging in containerized and production environments — **why**: log aggregators parse JSON natively; unstructured text needs fragile regex parsing
- Attach a correlation/request ID via middleware and include it in every log record — **why**: enables tracing a single request across services and concurrent tasks
- Configure logging through Python's `logging` (see `python.md`), not `print` — **why**: `print` cannot be leveled, filtered, routed, or disabled
- Never log request/response bodies containing secrets or PII — **why**: logs are retained long-term with broad access; PII in logs is a compliance violation (GDPR, HIPAA)

**Recommended options**: `structlog` or `python-json-logger` (structured output), OpenTelemetry (tracing).

## Security

**Intent**: Secure by default, validate at the boundary, and never store secrets in code.

- Implement authentication as a dependency (`OAuth2PasswordBearer` + JWT validation, or an IdP integration) — **why**: every protected route declares the dependency explicitly; the validation logic lives in one tested place
- Enforce authorization in dependencies or the service layer, not scattered `if role ==` checks in handlers — **why**: centralized policy checks are auditable and reusable; scattered checks drift and get missed on new routes
- Rely on Pydantic models for input validation at the boundary — **why**: malformed input is rejected with a 422 before reaching business logic
- Configure CORS explicitly with a known origin allowlist — **why**: a permissive `*` origin with credentials exposes the API to cross-site abuse
- Restrict and authenticate auto-generated docs (`/docs`, `/openapi.json`) in production where the API is non-public — **why**: the schema discloses every endpoint and model shape to unauthenticated callers
- Never hardcode secrets; inject via environment or a secret manager — **why**: secrets in source leak through history and logs
- Audit dependencies for known vulnerabilities — **why**: unpatched libraries are the most common attack vector

**Recommended options for auth**: `OAuth2PasswordBearer` + `PyJWT`/`python-jose`, `Authlib` (OAuth/OIDC integration), `fastapi-users` (full user management).

## Performance

**Intent**: Exploit async I/O, pool connections, and avoid serialization waste under load.

- Run with an ASGI server using multiple workers (Uvicorn workers under Gunicorn, or Uvicorn `--workers`) — **why**: a single worker is one process; multiple workers use all CPU cores for request handling
- Tune database connection pool size per environment, accounting for worker count — **why**: total connections = workers × pool size; misconfiguration either starves the app or exhausts the database (see `postgresql.md`)
- Cache frequently accessed, rarely changing data — **why**: eliminates repeated round-trips for reference data
- Limit response payloads with `response_model` and pagination — **why**: serializing and transferring large payloads dominates latency for list endpoints
- Reuse pooled async clients and DB engines across requests — **why**: per-request construction destroys pooling benefits and adds connection-setup latency

**Recommended options**: Uvicorn (ASGI server), Gunicorn (process manager with Uvicorn workers), `fastapi-cache` or Redis (caching).

## Code Standards

- Follow core Python standards defined in `python.md`
- Type-annotate every route signature, dependency, and model — **why**: FastAPI derives validation, serialization, and OpenAPI docs from annotations; missing or loose types silently weaken validation and documentation
- Keep route handlers thin; delegate business logic to services — **why**: handlers coupled to HTTP can't be reused by other entry points (CLI, tasks) and are harder to test
- Generate and review the OpenAPI schema as the API contract — **why**: the auto-generated schema stays in sync with code, unlike hand-written docs that drift
- Pin the FastAPI and Pydantic versions and treat Pydantic v1→v2 as a deliberate migration — **why**: the v2 rewrite changes model APIs; an unplanned bump breaks validators and serialization

## Anti-Patterns to Avoid

| Anti-pattern | Why it's harmful |
|-------------|-----------------|
| Business logic in route handlers | Untestable without HTTP; logic can't be reused by CLI, tasks, or other routes |
| Blocking I/O inside `async def` routes | Freezes the event loop, stalling all concurrent requests |
| Returning ORM entities directly as responses | Triggers lazy loads and couples the API contract to the database schema |
| Raw `dict` request/response instead of Pydantic models | Bypasses validation and OpenAPI generation; errors surface at runtime |
| One shared model for create/update/read | Leaks server-only or sensitive fields, or demands fields the operation shouldn't require |
| Constructing DB sessions/clients inside handlers | Loses pooling, can't be overridden in tests, risks leaked connections |
| Module-level app wiring with side effects on import | Hard to test in isolation; dependencies can't be overridden per test |
| Permissive CORS (`allow_origins=["*"]`) with credentials | Exposes the API to cross-site request abuse |
| Long-running work in `BackgroundTasks` | Blocks workers and is lost on restart; use a task queue |
| `@app.on_event` startup/shutdown | Deprecated; use the `lifespan` context manager |

## Context-Aware Decision Guide

| Context | Guidance |
|---------|----------|
| **Async stack** | `async def` routes, async SQLAlchemy 2.0 + `asyncpg`, `httpx.AsyncClient`, `pytest-asyncio`. Never call blocking libraries without offloading. |
| **Sync stack** | Plain `def` routes (run in threadpool), synchronous SQLAlchemy/psycopg. Simpler; acceptable when no async drivers are in play. |
| **Pydantic v1 (legacy)** | `Config` class, `.dict()`, `@validator`. Plan migration to v2; pin FastAPI to a v1-compatible release until then. |
| **Pydantic v2 (preferred)** | `model_config`, `model_dump`, `field_validator`, `Annotated` constraints. Default on FastAPI 0.100+. |
| **Public API** | Lock down `/docs`/`/openapi.json` or require auth; strict CORS; full request validation and rate limiting at the gateway. |
| **Internal microservice** | Docs can stay open within the trust boundary; favor async clients with timeouts and circuit breakers for service-to-service calls. |
| **FastAPI vs Django/Flask** | FastAPI for async, typed, OpenAPI-first APIs. Choose Django when its ORM/admin/batteries are central; Flask for minimal sync services (see `corporate-defaults.md`). |

## References

- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [FastAPI Dependency Injection](https://fastapi.tiangolo.com/tutorial/dependencies/)
- [Pydantic v2 Documentation](https://docs.pydantic.dev/latest/)
- [Starlette Documentation](https://www.starlette.io/)
- [SQLAlchemy 2.0 (async)](https://docs.sqlalchemy.org/en/20/orm/extensions/asyncio.html)
- [Uvicorn Deployment](https://www.uvicorn.org/deployment/)
