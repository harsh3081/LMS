# Team Skills Scaffold

**Category**: tech-stack
**Status**: SCAFFOLD — REPLACE BEFORE USE
**Version**: 1.0.0
**Created**: 2026-05-12
**See Also**: `corporate-defaults.md`, `stack-decision-heuristics.md`

---

## IMPORTANT: This is a Bundled Scaffold

This file ships as a **template with TBD placeholders**. It is NOT a record of any real team's skills. The `phoenix:design:brd-to-design` recipe pre-flight will:

1. Check if a project-specific `team-skills.md` exists at `.phoenix-os/project/memory/team-skills.md`.
2. If absent, copy this scaffold to that path and prompt the user to populate it.
3. **Block pipeline progression until the user confirms the file is populated** (all TBD placeholders replaced).

**To use**: Copy this file to `.phoenix-os/project/memory/team-skills.md` and replace every `TBD` with the actual team information. Do NOT modify this bundled scaffold.

---

## Purpose

Capture the current team's technology skill levels for use during tech-stack reconciliation in the `phoenix:design:brd-to-design` recipe (Step 4a). Skill levels influence whether the `recommended` default from `corporate-defaults.md` is viable or whether simpler alternatives are preferred.

---

## Skill Level Definitions

| Level | Code | Meaning |
|-------|------|---------|
| Expert | `E` | Team can design and debug this technology under any conditions; can mentor others |
| Proficient | `P` | Team uses this regularly with confidence; can handle complex scenarios |
| Intermediate | `I` | Team has shipped projects with this; needs occasional reference lookup |
| Beginner | `B` | Team has explored this but has not shipped production workloads |
| None | `N` | No meaningful experience; would require training before production use |

**Usage rule**: If the chosen technology's skill level is `B` or `N` for the majority of team members, the `stack-decision-heuristics.md` heuristics recommend using the lower-complexity alternative or documenting a learning spike as a project risk.

---

## Team Profile

**Project**: TBD — replace with project name
**Team name / squad**: TBD
**Team size**: TBD
**Last updated**: TBD — replace with ISO date (YYYY-MM-DD)
**Reviewed by**: TBD — replace with reviewer name/handle

---

## Frontend Skills

| Technology | Skill Level | Notes |
|-----------|-------------|-------|
| React 18 | TBD (E/P/I/B/N) | TBD — any notable gaps or strengths |
| TypeScript | TBD | TBD |
| Next.js | TBD | TBD |
| Tailwind CSS | TBD | TBD |
| Vite | TBD | TBD |
| State management (Zustand / Redux) | TBD | TBD |
| Accessibility (WCAG 2.1) | TBD | TBD |

---

## Backend Skills

| Technology | Skill Level | Notes |
|-----------|-------------|-------|
| Spring Boot (Java) | TBD | TBD |
| Node.js / Express / Fastify | TBD | TBD |
| .NET 8 / C# | TBD | TBD |
| Python (FastAPI / Django / Flask) | TBD | TBD |
| REST API design (OpenAPI 3.1) | TBD | TBD |
| gRPC / Protobuf | TBD | TBD |
| GraphQL | TBD | TBD |
| OAuth 2.0 / OIDC | TBD | TBD |

---

## Data Skills

| Technology | Skill Level | Notes |
|-----------|-------------|-------|
| PostgreSQL | TBD | TBD |
| MongoDB | TBD | TBD |
| Redis | TBD | TBD |
| Elasticsearch / OpenSearch | TBD | TBD |
| SQL query optimisation | TBD | TBD |
| Database schema migration (Flyway / Liquibase / Alembic) | TBD | TBD |
| Data modelling (ERD, normalisation) | TBD | TBD |

---

## Messaging and Integration Skills

| Technology | Skill Level | Notes |
|-----------|-------------|-------|
| Apache Kafka | TBD | TBD |
| RabbitMQ | TBD | TBD |
| AWS SQS / SNS | TBD | TBD |
| Azure Service Bus | TBD | TBD |
| Apache Avro + Schema Registry | TBD | TBD |
| API gateway configuration (Kong / AWS API GW) | TBD | TBD |

---

## DevOps and Infrastructure Skills

| Technology | Skill Level | Notes |
|-----------|-------------|-------|
| Docker / container build | TBD | TBD |
| Kubernetes | TBD | TBD |
| GitHub Actions / GitLab CI | TBD | TBD |
| Terraform | TBD | TBD |
| AWS (general) | TBD | TBD |
| Azure (general) | TBD | TBD |
| Observability (Prometheus, Grafana, OpenTelemetry) | TBD | TBD |
| HashiCorp Vault / Secrets management | TBD | TBD |

---

## Security Skills

| Technology / Practice | Skill Level | Notes |
|----------------------|-------------|-------|
| Threat modelling (STRIDE) | TBD | TBD |
| OWASP Top 10 awareness | TBD | TBD |
| Static analysis (SonarQube) | TBD | TBD |
| Dependency scanning (Snyk / Dependabot) | TBD | TBD |
| TLS configuration | TBD | TBD |
| Cryptography basics | TBD | TBD |

---

## Architecture and Design Skills

| Practice | Skill Level | Notes |
|---------|-------------|-------|
| C4 Model / architecture diagramming | TBD | TBD |
| Domain-Driven Design | TBD | TBD |
| Event-driven architecture patterns | TBD | TBD |
| ADR authoring | TBD | TBD |
| arc42 documentation | TBD | TBD |
| TOGAF / enterprise architecture frameworks | TBD | TBD |

---

## Known Skill Gaps and Planned Mitigations

_Replace this section with the team's identified gaps and planned learning/hiring actions._

| Gap | Current Level | Target Level | Mitigation | Timeline |
|-----|--------------|-------------|------------|----------|
| TBD | TBD | TBD | TBD | TBD |

---

## See Also

- `corporate-defaults.md` — approved technologies; skill levels influence which defaults are viable
- `stack-decision-heuristics.md` — heuristics reference team skill levels explicitly
- `core/commands/phoenix/design/brd-to-design.md` — recipe pre-flight blocks when `team-skills.md` placeholders are unpopulated
