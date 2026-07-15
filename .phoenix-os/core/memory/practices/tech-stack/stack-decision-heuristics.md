# Technology Stack Decision Heuristics

**Category**: tech-stack
**Status**: Active
**Version**: 1.0.0
**Created**: 2026-05-12
**See Also**: `corporate-defaults.md`, `team-skills.md`, `core/memory/practices/architecture/adr-conventions.md`

---

## Purpose

Provide decision heuristics for the most common technology selection dilemmas encountered during the `phoenix:design:brd-to-design` recipe's tech-stack reconciliation pass. Each heuristic is a quick-check flow that produces either a `recommended` choice the agent commits to inline in the design, or an `openQuestion` that the orchestrator surfaces to the user in the Step 3 interview.

---

## When to Apply

- During the `phoenix:design:brd-to-design` recipe's tech-stack reconciliation pass (Step 4a / 4b, performed inline by `phoenix:tech-lead`).
- During architecture design reviews when comparing technology options.
- When recording `alternatives-considered` and `decision-rationale` inline within an ADR.
- Before authoring a deviation ADR from `corporate-defaults.md`.

---

## Heuristic 1: Relational vs. NoSQL Database

```
QUESTION: Should the primary data store be relational or NoSQL?

IF data is highly relational (joins across many entity types are a primary query pattern)
  → Relational (PostgreSQL preferred — see corporate-defaults.md)

IF data is document-centric (variable schema, nested objects, team needs fast iteration)
  → Document store (MongoDB preferred)

IF data access is predominantly key-value with sub-millisecond SLA
  → Key-value cache (Redis) or key-value store (DynamoDB)

IF the QUALITY scenarios include time-series metrics or sensor data
  → Time-series DB (TimescaleDB or InfluxDB)

IF requirements mention "graph traversal" or "connected data" as primary access pattern
  → Graph DB (Neo4j) — rare; confirm with ADR

WHEN IN DOUBT: use relational.
Rationale: Relational adds more constraints than needed for simple use cases but is easier
to reason about, has better ACID guarantees, and the team skill gap is lower.
```

---

## Heuristic 2: Synchronous (REST/gRPC) vs. Asynchronous (Queue/Event)

```
QUESTION: Should component A communicate with component B synchronously or asynchronously?

IF the caller needs the result to continue its own flow → SYNCHRONOUS (REST or gRPC)
IF the operation is "fire and forget" from the caller's perspective → ASYNC (queue)
IF the receiver may be temporarily unavailable and retries are needed → ASYNC (queue + DLQ)
IF multiple consumers need to react to the same event → ASYNC (event bus / Kafka)
IF latency is critical and the response is sub-100ms → SYNCHRONOUS (gRPC preferred over REST)
IF the payload schema must evolve independently between producer and consumer → ASYNC with Avro + Schema Registry

MIXED PATTERN: If synchronous is needed for the happy path but resilience requires
async retry, consider a "sync with async retry" pattern:
  - Call synchronously; if timeout → publish to retry queue; consumer re-tries → eventual consistency.
  - Document the pattern in an ADR.
```

---

## Heuristic 3: In-Process Cache vs. External Cache

```
QUESTION: Should caching be in-process (e.g., Guava, Caffeine) or external (Redis)?

IF only one service instance needs the cache AND data is non-sensitive
  → In-process cache (Caffeine/Guava for JVM; node-cache for Node)

IF multiple service instances need shared cache state
  → External cache (Redis)

IF cache entries contain session tokens or PII (classification: restricted or confidential)
  → External cache with TLS + encryption at rest (Redis with TLS mandatory)

IF cache is only used for static configuration or feature flags
  → In-process cache; refresh on app startup via env var or config service

COST HEURISTIC: An external cache adds ~2ms per call and an infra cost.
Only introduce it when the multi-instance or sensitivity case applies.
```

---

## Heuristic 4: Microservices vs. Modular Monolith

```
QUESTION: Should we split into microservices or stay with a modular monolith?

IF team size < 5 engineers → Modular monolith (avoid distributed systems overhead)
IF deployment frequency of different modules differs significantly → Microservices (deploy independently)
IF components have very different scaling needs → Microservices (scale independently)
IF the organisation has dedicated DevOps / platform engineering → Microservices (operational burden shared)
IF team skills in distributed systems are low (check team-skills.md) → Modular monolith first; extract later

DEFAULT for new projects with teams ≤ 10: Start with a modular monolith.
The architecture should be designed as if it will eventually be split (clear module boundaries,
explicit interfaces) but deployed as one unit initially. Document this intent in an ADR.
```

---

## Heuristic 5: REST vs. gRPC for Internal Service-to-Service

```
QUESTION: For internal (non-public-facing) service-to-service calls, use REST or gRPC?

IF payload sizes are large (>10KB per call) → gRPC (binary encoding, ~40% smaller than JSON)
IF call latency is a quality scenario metric → gRPC (persistent HTTP/2 multiplexing)
IF schema evolution between services must be strongly typed → gRPC (Protobuf schema registry)
IF the team skill in Protobuf is low (check team-skills.md) → REST (lower barrier)
IF public API exposure is needed → REST (OpenAPI tooling ecosystem is richer)

GUIDANCE: gRPC is not free — debugging is harder, browser support requires a proxy.
Only use gRPC if at least two of the above gRPC criteria apply.
```

---

## Heuristic 6: API Gateway — Build vs. Buy

```
QUESTION: Should we use a managed API gateway or build gateway logic into the service?

IF the project has ≥ 3 public-facing services → Managed gateway (Kong, AWS API Gateway)
IF authentication and rate-limiting are required → Managed gateway (do not re-implement)
IF the team is on a cloud provider with a native gateway → Cloud-native gateway (lower ops overhead)
IF there is only 1 external endpoint → Nginx or service-level middleware may suffice (document in ADR)

NEVER build custom auth/rate-limit logic into a service when a managed gateway is available.
```

---

## Heuristic 7: SQL Schema Migration Strategy

```
QUESTION: How should database schema changes be managed?

IF team uses JVM stack → Flyway (imperative, straightforward) or Liquibase (XML/YAML declarative)
IF team uses Node.js → Knex.js migrations or Prisma migrate
IF team uses Python → Alembic (with SQLAlchemy) or Django migrations
IF using cloud-managed database with limited DDL control → document as a CONSTRAINT in BRD extraction

RULE: All schema migrations must be:
1. Versioned in source control alongside application code.
2. Idempotent (re-runnable safely).
3. Backward-compatible for one release window (Blue-Green / canary deployments).
```

---

## Heuristic 8: When to Write a Deviation ADR

Use the checklist below. If ANY item is true, an ADR is required:

- [ ] Chosen technology is not in `corporate-defaults.md` at any mandate level.
- [ ] Chosen technology is `restricted` in `corporate-defaults.md`.
- [ ] Choice deviates from the `mandated` default.
- [ ] The heuristic above returned "WHEN IN DOUBT" and a different path was taken anyway.
- [ ] Team skill in the chosen technology is below "intermediate" in `team-skills.md`.
- [ ] A QUALITY scenario cannot be met by the `recommended` default.

---

## See Also

- `corporate-defaults.md` — approved technology list per concern
- `team-skills.md` — team capability constraints that influence choices
- `core/memory/practices/architecture/adr-conventions.md` — authoring the deviation ADR
