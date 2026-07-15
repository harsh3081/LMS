# Corporate Technology Defaults

**Category**: tech-stack
**Status**: Active
**Version**: 1.0.0
**Created**: 2026-05-12
**See Also**: `stack-decision-heuristics.md`, `team-skills.md`, `core/memory/practices/architecture/adr-conventions.md`

---

## Purpose

Document the organisation-level approved technology choices per concern area. These defaults are the starting point for the tech-stack reconciliation that `phoenix:tech-lead` performs in Step 4a / 4b of the `phoenix:design:brd-to-design` recipe. Deviations from these defaults require an ADR with a justification referencing this file.

---

## When to Apply

- During the `phoenix:design:brd-to-design` recipe's tech-stack reconciliation pass (Step 4a / 4b, when `phoenix:tech-lead` reconciles BRD-implied technology choices against the corporate defaults).
- Any architecture design session where technology choices are evaluated.
- When reviewing accepted tech-stack decisions recorded in an ADR to confirm any `mandated` choice has been honoured (or, if deviated from, that the ADR documents the rationale).
- When onboarding a new project to ensure toolchain alignment.

---

## How to Use

Each entry below has a `mandate` level:
- `mandated` — must use; any deviation requires an ADR approved by the Architecture Review Board.
- `recommended` — preferred choice; alternatives allowed if justified in an ADR.
- `approved` — on the approved list; choice between approved options is team-level.
- `restricted` — not approved; using this requires a security review AND ARB ADR.

---

## Frontend

| Concern | Default Choice | Mandate | Notes |
|---------|---------------|---------|-------|
| SPA Framework | React 18+ | `recommended` | Next.js preferred for SSR; Vue/Angular require ADR |
| Styling | Tailwind CSS or CSS Modules | `approved` | No global style framework (Bootstrap, MUI) without ADR |
| State management | React Context + hooks; Zustand for complex state | `recommended` | Redux requires ADR justifying the additional complexity |
| Build tool | Vite or Next.js built-in | `recommended` | Webpack allowed for existing projects only |
| TypeScript | TypeScript 5+ | `mandated` | Plain JavaScript not permitted in new projects |

---

## Backend

| Concern | Default Choice | Mandate | Notes |
|---------|---------------|---------|-------|
| Service runtime (JVM) | Spring Boot 3+ (Java 17+) | `recommended` | Quarkus approved for cloud-native new projects |
| Service runtime (Node) | Node.js 20 LTS + Express or Fastify | `recommended` | Deno requires ARB ADR |
| Service runtime (.NET) | .NET 8 (C# 12) | `recommended` | .NET Framework restricted — migration required |
| Service runtime (Python) | Python 3.11+ + FastAPI | `recommended` | Django or Flask approved; FastAPI preferred for async/typed APIs; Python <3.11 requires an upgrade path |
| API style | REST (OpenAPI 3.1) | `recommended` | gRPC approved for internal service-to-service; GraphQL requires ADR |
| Authentication | OAuth 2.0 + OIDC | `mandated` | JWT issued by org IdP; custom auth schemes restricted |
| Authorisation | RBAC via org-provided IAM service | `recommended` | ABAC allowed when RBAC is insufficient; document in ADR |

---

## Data

| Concern | Default Choice | Mandate | Notes |
|---------|---------------|---------|-------|
| Primary relational DB | PostgreSQL 16+ | `recommended` | MySQL allowed for existing projects; Oracle restricted (cost + licensing) |
| Document store | MongoDB 7+ | `approved` | CosmosDB (Mongo API) approved for Azure-hosted workloads |
| Key-value cache | Redis 7+ | `recommended` | Memcached approved for simple TTL caches; Hazelcast restricted |
| Search | Elasticsearch / OpenSearch 8+ | `approved` | Solr restricted |
| Time-series | InfluxDB or TimescaleDB | `approved` | Only for telemetry/metrics workloads |
| Graph database | Neo4j | `approved` | Only when graph traversal is a primary query pattern |

---

## Messaging and Integration

| Concern | Default Choice | Mandate | Notes |
|---------|---------------|---------|-------|
| Message broker | Apache Kafka 3+ | `recommended` | RabbitMQ approved for simple fan-out / RPC patterns |
| Cloud messaging | AWS SQS/SNS or Azure Service Bus | `approved` | Depends on cloud platform; see Deployment defaults |
| API gateway | Kong or AWS API Gateway | `recommended` | Nginx as gateway requires ADR (no built-in auth/rate-limit) |
| Service mesh | Istio (if ≥10 services) | `approved` | Not required below 10 services; document decision in ADR |
| Event streaming schema | Apache Avro + Schema Registry | `recommended` | Protobuf approved; JSON Schema approved with caveats (no binary compaction) |

---

## Deployment and Infrastructure

| Concern | Default Choice | Mandate | Notes |
|---------|---------------|---------|-------|
| Container runtime | Docker + Kubernetes 1.29+ | `mandated` | Bare-metal deployment requires ARB ADR |
| CI/CD pipeline | GitHub Actions or GitLab CI | `mandated` | Jenkins restricted for new projects (migration path required) |
| Container registry | GitHub Container Registry or AWS ECR | `recommended` | DockerHub restricted (pull-rate limits + security scan gaps) |
| IaC | Terraform (for cloud infra) | `recommended` | Pulumi approved; CloudFormation approved for AWS-only workloads |
| Secrets management | HashiCorp Vault or AWS Secrets Manager | `mandated` | No secrets in environment variables or config files committed to source control |
| Observability | Prometheus + Grafana (metrics); OpenTelemetry (traces); ELK (logs) | `recommended` | DataDog approved with cost review; NewRelic restricted (licensing) |

---

## Security

| Concern | Default Choice | Mandate | Notes |
|---------|---------------|---------|-------|
| SAST | SonarQube + Gitleaks | `mandated` | Configured in CI pipeline (see DevOps setup) |
| DAST | OWASP ZAP | `recommended` | Run at least weekly on staging |
| Dependency scanning | Snyk or Dependabot | `mandated` | Alerts on CVSS ≥ 7.0 must be resolved within 30 days |
| Encryption at rest | AES-256 | `mandated` | All `restricted`-classified datastores |
| TLS | TLS 1.3 (TLS 1.2 as minimum) | `mandated` | TLS 1.0 and 1.1 restricted |

---

## Deviation Protocol

Any technology not in this list, or any deviation from a `mandated` or `recommended` default, must be:
1. Discussed during the recipe's tech-stack reconciliation pass with a `team-skills.md` cross-reference.
2. Surfaced to the user as an open question during the recipe's Step 3 interview — the user's decision is recorded inline in the design.
3. Resolved via an ADR (per `adr-conventions.md`) before the design is published for review.

---

## See Also

- `stack-decision-heuristics.md` — decision rules when choosing between approved options
- `team-skills.md` — per-project team capability constraints
- `core/memory/practices/architecture/adr-conventions.md` — ADR authoring for deviations
