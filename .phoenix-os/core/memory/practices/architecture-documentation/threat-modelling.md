# Threat Modelling (STRIDE per Component)

**Category**: architecture-documentation
**Status**: Active
**Version**: 1.0.0
**Created**: 2026-05-12
**See Also**: `data-classification.md`, `core/memory/practices/architecture/c4-strict.md`

---

## Purpose

Define the STRIDE per-component threat analysis methodology and risk-rating rubric used by the `threat-modeller` agent in Step 4d of the `phoenix:design:brd-to-design` recipe. Output is in-memory STRIDE section content that `phoenix:tech-lead` merges into the Threat Model section of `tech-design.md`, and entries that `phoenix:architecture-diagrammer` consumes when drawing the Threat Model Overlay view (View 7).

---

## When to Apply

- Step 4d of `phoenix:design:brd-to-design` (threat modelling by `phoenix:threat-modeller`).
- STRIDE coverage self-check: every significant component must have at least one assessed STRIDE category. `phoenix:threat-modeller` self-applies this rule before returning section content.
- Threat Model Overlay diagram construction (View 7).
- Architecture Review Board (ARB) security review preparation.

---

## STRIDE Categories

| Code | Category | What the attacker does |
|------|----------|----------------------|
| S | Spoofing | Impersonates another user or component |
| T | Tampering | Modifies data or code without authorisation |
| R | Repudiation | Denies performing an action; no audit trail |
| I | Information Disclosure | Exposes data to unauthorised parties |
| D | Denial of Service | Prevents legitimate use of a resource |
| E | Elevation of Privilege | Gains capabilities beyond those authorised |

---

## STRIDE Per Component Type — Heuristics

Use this table as a starting checklist. Assess each listed category for every component. Add categories not listed if the component's BRD requirements suggest additional threats.

| Component Type | Likely STRIDE Categories |
|---------------|--------------------------|
| `gateway` | S (spoofed client identity), T (request/response tampering), I (API key/token exposure), D (volumetric attack), E (auth bypass) |
| `ui` | S (session hijacking), T (XSS, CSRF), I (sensitive data in browser storage), D (client-side flood), E (privilege escalation via UI state) |
| `service` | S (service impersonation), T (business logic tampering), R (missing audit log), I (data over-return in API responses), D (resource exhaustion), E (IDOR, role boundary violations) |
| `datastore` | T (SQL/NoSQL injection, schema tampering), R (missing audit trail), I (data dump, backup exposure), D (storage exhaustion), E (schema privilege escalation) |
| `queue` | T (message tampering in transit), R (lost messages without DLQ), I (queue content exposure), D (queue flooding), E (publishing to unauthorised topics) |
| `cache` | T (cache poisoning), I (sensitive data in cache without TTL), D (cache eviction attack), E (cache-based privilege escalation) |
| `job` | T (job parameter injection), R (no execution audit log), I (job output containing PII), D (resource exhaustion by malicious scheduling), E (job running under overprivileged account) |
| `external` | S (dependency spoofing), T (supply chain tampering), I (data shared with external party), D (dependency unavailability) |

---

## Risk-Rating Rubric

Rate each identified threat on the `risk-rating` field using the following criteria:

| Rating | Criteria | Response |
|--------|---------|----------|
| `critical` | Exploitable with known tooling; immediate data loss, system compromise, or regulatory breach | Document an ADR-level mitigation before the design is published for review |
| `high` | Likely exploitable under realistic conditions; significant business impact | Document mitigation in ADR; track in backlog |
| `medium` | Requires specific conditions to exploit; moderate impact | Document mitigation in threat record; review in sprint planning |
| `low` | Unlikely or low-impact if exploited; defence-in-depth reduces risk | Note mitigation; review annually |
| `informational` | Not a direct threat; awareness item for security posture | Document for awareness only |

**Risk rating formula** (DREAD-simplified):
```
Risk = Likelihood × Impact
Likelihood: exploitability in the given deployment context
Impact:     data sensitivity (from data-classification.md) × blast radius
```

---

## Mitigation Guidelines Per Category

| STRIDE Category | Common Mitigations |
|----------------|--------------------|
| Spoofing (S) | Mutual TLS, JWT with short expiry, MFA, certificate pinning |
| Tampering (T) | Input validation, HMAC on messages, signed payloads, WAF rules |
| Repudiation (R) | Audit log with immutable storage, timestamp signing, event sourcing |
| Information Disclosure (I) | Encryption at rest and in transit, field-level masking, least-privilege data access |
| Denial of Service (D) | Rate limiting, circuit breakers, autoscaling, DLQ for queues |
| Elevation of Privilege (E) | RBAC, principle of least privilege, security-scoped tokens, input sanitisation |

---

## Threat Record Format (in-memory entries)

`phoenix:threat-modeller` returns each threat entry in-memory to the recipe orchestrator. Each entry must carry:
- `id`: `THR-NNN`
- `component-id`: the COMP-NNN identifier the threat applies to
- `stride-category`: one of `spoofing`, `tampering`, `repudiation`, `info-disclosure`, `dos`, `elevation`
- `risk-rating`: one of `critical`, `high`, `medium`, `low`, `informational`
- `mitigation`: one-sentence description of the primary control

**Coverage requirement** (self-applied by `phoenix:threat-modeller`): Every significant component identified in the design must have at least one threat entry. Reviewers should treat unassessed components as defects.

---

## Trust Boundary Identification

Trust boundaries are lines across which data flows from a higher-trust zone to a lower-trust zone (or vice versa). Mark them explicitly on the Threat Model Overlay view (View 7) as bold red dashed rectangles.

**Standard trust zones** (use these unless BRD specifies otherwise):
1. **Internet zone** — Unauthenticated external users, public APIs.
2. **DMZ** — Edge components (`gateway`, `ui`) that accept internet traffic.
3. **Internal zone** — Backend `service`, `queue`, `datastore` components.
4. **Restricted zone** — Components handling `restricted`-classified data.

An interface crossing a trust boundary is automatically a STRIDE target for Spoofing (the identity claim must be verified at the boundary).

---

## Handling Coverage Gaps

If `phoenix:threat-modeller` returns content with components lacking STRIDE assessment, or with `critical`/`high` rated threats missing a mitigation string, the recipe orchestrator (Step 4d) re-delegates to `phoenix:threat-modeller` with the explicit gap list to complete the missing assessments. Reviewers should reject designs that still carry unassessed components or unrated high-risk threats.

---

## See Also

- `core/memory/practices/architecture-documentation/data-classification.md` — Component classification drives threat scope
- `core/memory/practices/architecture/c4-strict.md` — Threat Model Overlay view (View 7) conventions
- `core/agents/design/threat-modeller.md` — agent that produces in-memory STRIDE section content from these conventions
