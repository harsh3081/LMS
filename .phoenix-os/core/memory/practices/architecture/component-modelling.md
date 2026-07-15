# Component and Interface Modelling

**Category**: architecture
**Status**: Active
**Version**: 1.0.0
**Created**: 2026-05-12
**See Also**: `c4-strict.md`, `capability-registry.md`, `core/memory/practices/architecture-documentation/data-classification.md`

---

## Purpose

Define the rules and heuristics for identifying, naming, typing, and relating software components and their interfaces during the technical-design composition pass of the `phoenix:design:brd-to-design` recipe (Steps 2b → 4b). `phoenix:tech-lead` self-applies these rules when authoring `tech-design.md`; the component inventory it records then feeds `phoenix:architecture-diagrammer`, `phoenix:adr-keeper`, and `phoenix:threat-modeller`.

---

## When to Apply

- Step 4b of `phoenix:design:brd-to-design` (component and interface modelling, written into `tech-design.md`).
- Any architectural review where a component inventory is being built from a requirements set.
- When reviewing the C4 Container view for consistency with code-level boundaries.

---

## Component Identification Heuristics

Start from the extraction summary produced by `phoenix:brd-analyzer` and the tech-stack decisions accepted during the recipe's interview step. A candidate for a component is any unit of deployment, runtime isolation, or ownership boundary.

**Ask these questions for each requirement cluster:**
1. Does this requirement need its own deployment lifecycle? If yes — likely its own component.
2. Does this requirement cross a trust boundary? If yes — a gateway or security layer may be needed.
3. Does this requirement persist or query data? If yes — a datastore component may be needed.
4. Does this requirement involve asynchronous processing? If yes — a queue component may be needed.
5. Does this requirement run on a schedule? If yes — a job component may be needed.

**Component granularity rule**: A component recorded by `phoenix:tech-lead` corresponds to a C4 Level 2 Container — not a class, not a microservice cluster. When in doubt, err toward fewer, larger components (split later in story development).

---

## Component Type Taxonomy

| Type | Description | When to add |
|------|-------------|------------|
| `service` | Stateless business-logic unit (REST API, GraphQL, RPC) | Any requirement for synchronous data processing |
| `datastore` | Persistent storage (relational DB, document store, blob storage) | Any requirement mentioning data persistence or retrieval |
| `queue` | Asynchronous message broker or event bus | Decoupling, retry logic, or event-driven patterns |
| `gateway` | Edge component: API gateway, BFF, reverse proxy, auth proxy | Trust boundary, routing, rate limiting, authentication required |
| `cache` | In-process or external caching layer | Performance QAS with latency thresholds |
| `ui` | Frontend application or SPA | Any end-user-facing requirement |
| `job` | Scheduled or batch process | "nightly", "periodic", "on a schedule" language in BRD |
| `external` | Third-party system outside the solution boundary | Supplier systems, SaaS integrations, legacy systems not owned by the team |

**Rule — when to add a gateway**: Add a `gateway` type when:
- Two components of different trust levels communicate (e.g., internet-facing UI to internal service).
- The BRD mentions authentication, authorisation, or rate limiting at the system edge.
- A single service would otherwise expose multiple unrelated APIs to external consumers.

**Rule — when to add a queue**: Add a `queue` type when:
- A producing component must not block on consumer processing.
- A QUALITY requirement specifies resilience via retry or dead-letter.
- Data volumes require fan-out to multiple consumers.

**Rule — when to add an audit pipeline**: Add an `audit` `job` type when:
- The BRD has a `CONSTRAINT` about audit trails, data lineage, or regulatory logging.
- A `MUST` requirement involves recording "who did what and when" across system boundaries.

---

## Component Naming Convention

- Use kebab-case, nouns only (no verbs): `user-service`, `order-datastore`, `payment-gateway`.
- Prefix with domain if ambiguity exists: `billing-service`, `shipping-service`.
- Avoid generic names: not `service-1`, not `backend`, not `database`.
- External components: prefix with `ext-`: `ext-saml-idp`, `ext-payment-provider`.
- IDs: `COMP-001`, `COMP-002`, … (auto-assigned; do not reuse across BRD revisions).

---

## Interface Identification Rules

An interface exists between two components whenever one component calls, queries, publishes to, or subscribes from another.

**Interface fields** (per `interfaces.schema.json`):
- `id`: `INTF-NNN`
- `source-component`: FK to `COMP-NNN` (caller / publisher)
- `target-component`: FK to `COMP-NNN` (callee / subscriber)
- `protocol`: e.g., `REST/HTTPS`, `gRPC/TLS`, `AMQP`, `JDBC/TLS`, `WebSocket`
- `data-payload-classification`: inherited from the most restrictive data type flowing across this interface (see `data-classification.md`)

**Rule — synchronous vs. asynchronous**: If the caller blocks waiting for a response, the interface is synchronous (`REST`, `gRPC`). If the caller fires and continues, the interface is asynchronous (`AMQP`, `Kafka`, `WebSocket event`).

**Rule — classification propagation**: If a `gateway` forwards requests to a `service`, the gateway-to-service interface inherits the classification of the request payload, not just the gateway's own classification.

---

## Layering Rules

Ensure components adhere to a coherent layering model. Violations should be caught during diagram review (see `c4-strict.md` for the strict rule set).

| Layer | Components | Communication direction |
|-------|------------|------------------------|
| Edge | `gateway`, `ui` | Receive external requests; call Core |
| Core | `service`, `job` | Implement business logic; call Data |
| Data | `datastore`, `cache`, `queue` | Owned by Core; never call Core back |
| External | `external` | Called BY Core; never initiate calls to Core |

**Anti-pattern**: A `datastore` calling a `service` — this indicates a data-event trigger pattern; replace the call with a `queue` between `datastore` (publisher) and `service` (subscriber).

---

## Common Anti-Patterns

| Anti-Pattern | Detection | Correction |
|-------------|-----------|-----------|
| God component | One component satisfies >40% of all requirements | Split by bounded context (Domain-Driven Design) |
| Missing gateway for external-facing service | `service` of type `service` directly receives external traffic | Add `gateway` in front |
| Bi-directional synchronous interfaces | `service-A` calls `service-B` AND `service-B` calls `service-A` synchronously | Introduce queue or redesign ownership |
| Direct datastore-to-datastore interface | One `datastore` syncing to another directly | Add `job` as intermediary (ETL/CDC pattern) |
| Unnamed external dependency | Requirement references "the existing CRM" with no `ext-` component | Always add an `external` component; never leave dependencies implicit |

---

## See Also

- `core/memory/practices/architecture/c4-strict.md` — C4 Level 2 Container view rules (uses this component model as input)
- `core/memory/practices/architecture-documentation/data-classification.md` — Classification badge assignment per component type
- `core/memory/practices/architecture-documentation/threat-modelling.md` — Uses component list as STRIDE analysis input
