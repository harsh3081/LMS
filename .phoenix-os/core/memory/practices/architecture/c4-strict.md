# C4 Strict Conventions

**Category**: architecture
**Status**: Active
**Version**: 1.0.0
**Created**: 2026-05-12
**See Also**: `component-modelling.md`, `core/memory/practices/architecture-documentation/drawio-conventions.md`

---

## Purpose

Define the strict C4 Model conventions used by the `architecture-diagrammer` agent when generating the seven mandatory diagram views. "Strict" means the agent self-applies the page-count + page-name check before writing the file and treats any deviation as a defect; reviewers should reject `.drawio` files that fail these rules.

---

## When to Apply

- Step 4c of `phoenix:design:brd-to-design` (architecture diagrams generation by `architecture-diagrammer`).
- Any C4 diagram review pass.
- When extending existing C4 diagrams produced by the recipe.

---

## Seven Mandatory Views

Every recipe run MUST produce exactly these seven diagram views, each as its own page in `architecture.drawio`. The `architecture-diagrammer` agent writes the XML directly — there are no template files to load; page names below are what the agent must use as the `name` attribute of each `<diagram>` element so downstream consumers (`doc-publisher`, PNG renderer) can identify each view.

| # | Page Name in `architecture.drawio` | C4 Level |
|---|---|---|
| 1 | Context | L1 |
| 2 | Container | L2 |
| 3 | Component (primary container) | L3 |
| 4 | Sequence (key scenario) | Sequence |
| 5 | Data Flow | Data Flow |
| 6 | Deployment | Deployment |
| 7 | Threat Model Overlay | Threat Overlay |

**Failure condition** (treat as a defect, reject during review): Fewer than seven pages in the `.drawio` file, or a page with a name not matching one of the canonical view names above.

---

## C4 Level 1 — Context View Rules

- **Mandatory shapes**: one "System" box (the system being designed), user/actor shapes for each external user class, external system shapes for each `external`-type component identified during the extraction summary.
- **Label convention**: System box label = system name (from BRD title). Actor labels = stakeholder roles from the extraction summary. External system labels = component names from the extraction summary.
- **Arrows**: Every relationship arrow must carry a technology label (e.g., "HTTPS") and a description of the interaction.
- **Palette**: System = blue (`#dae8fc` fill, `#6c8ebf` stroke). Actor = yellow (`#fff2cc` fill, `#d6b656` stroke). External = grey (`#f5f5f5` fill, `#666666` stroke).
- **Boundary**: No explicit boundary box at L1 — the system IS the boundary.

---

## C4 Level 2 — Container View Rules

- **Mandatory shapes**: one shape per component identified during the extraction summary (excluding `external` types — those appear as external systems). One "System Boundary" dashed box enclosing all non-external components.
- **Label convention**: Component name + technology tag in brackets: `order-service [Spring Boot]`. Technology tags sourced from the tech-stack decisions recorded by `phoenix:tech-lead`.
- **Arrows**: Every interface identified in the extraction summary must appear as an arrow. Arrow label = interface protocol. Direction = source component → target component.
- **Palette**: `service` = blue, `datastore` = cylinder shape, `queue` = parallelogram or queue symbol, `gateway` = diamond or gateway symbol, `ui` = browser frame, `job` = gear or clock shape, `external` = grey box outside the boundary.
- **Classification badges**: Mandatory on every shape — placed as a small rectangle in the top-right corner using the badge colour from `data-classification.md`.

---

## C4 Level 3 — Component View Rules

- Covers ONE container (the primary `service` or `gateway` with the most interfaces).
- **Mandatory shapes**: one shape per code-level component (controller, service, repository, facade, client). Connected with dependency arrows.
- **Label convention**: Component name + stereotype: `OrderController [REST Controller]`.
- **Boundary**: One "Container Boundary" dashed box.
- Interfaces shown are internal (method calls / DI), not network protocols.

---

## Sequence Diagram Rules (View 4)

- Covers the single most critical scenario identified in the extraction summary (highest risk or highest MoSCoW priority).
- **Mandatory elements**: lifelines for every participant component, activation bars, return arrows, at least one "loop" or "alt" fragment if conditional behaviour is present.
- Protocol labels on every synchronous call arrow.
- Async messages use dashed arrows.

---

## Data Flow Diagram Rules (View 5)

- Depicts data at rest and in transit across the system boundary.
- **Mandatory elements**: data stores, data transforms (processes), external entities, data flows with classification labels.
- Every data flow arrow must carry: data type label + classification badge (`internal` / `confidential` / `restricted`).
- Use the same component shapes as the Container view for consistency (not arbitrary DFD circles).

---

## Deployment View Rules (View 6)

- Maps containers from the L2 view to deployment targets (cloud regions, Kubernetes namespaces, bare-metal nodes).
- **Mandatory elements**: infrastructure boundary box, at least one deployment node shape per distinct deployment target, component shapes nested inside their deployment nodes.
- Technology labels: runtime version if known (e.g., "AWS EKS 1.29", "Azure App Service").
- Network zone boundaries shown as separate dashed boxes (Internet Zone, DMZ, Internal Zone).

---

## Threat Model Overlay Rules (View 7)

- Reuses the Container view's shapes and layout as the base.
- **Mandatory elements**: STRIDE threat markers on every component/interface for which `threat-modeller` recorded a STRIDE entry. Markers are small red diamonds with the STRIDE category abbreviation (S/T/R/I/D/E).
- Trust boundaries must be explicitly drawn as bold red dashed borders around security zones.
- Every marked threat must have a tooltip (drawio `tooltip` attribute) carrying the mitigation summary from the corresponding threat-modeller entry.

---

## Universal Shape Rules (All Views)

1. **Alt-text mandatory**: Every shape (`mxCell vertex="1"`) must have a non-empty `tooltip` attribute (used as alt-text for accessibility). `architecture-diagrammer` self-applies this rule and `drawio_lint.py` re-verifies it.
2. **Orthogonal routing mandatory**: All edges must use `edgeStyle=orthogonalEdgeStyle` or `elbowEdgeStyle`. Diagonal or curved edges violate the convention.
3. **No edge-vertex intersections**: Route edges around shapes; never through them.
4. **Consistent label backgrounds**: Text labels on edges must use a white rectangle background (`labelBackgroundColor=#ffffff`) for readability against complex backgrounds.
5. **Page names**: Exact strings from the Seven Mandatory Views table above — no abbreviations, no spaces changed.

---

## Palette Reference

| Element | Fill | Stroke | Shape |
|---------|------|--------|-------|
| System (L1) | `#dae8fc` | `#6c8ebf` | rectangle |
| Actor | `#fff2cc` | `#d6b656` | person/actor |
| External system | `#f5f5f5` | `#666666` | rectangle |
| Service | `#dae8fc` | `#6c8ebf` | rectangle |
| Datastore | `#f8cecc` | `#b85450` | cylinder |
| Queue | `#e1d5e7` | `#9673a6` | parallelogram |
| Gateway | `#d5e8d4` | `#82b366` | hexagon |
| UI | `#fff2cc` | `#d6b656` | browser frame |
| Job | `#fce4d6` | `#c55a11` | gear |
| Internal classification | `#d5e8d4` | `#82b366` | small badge rectangle |
| Confidential classification | `#fff2cc` | `#d6b656` | small badge rectangle |
| Restricted classification | `#f8cecc` | `#b85450` | small badge rectangle |
| Threat marker | `#ff0000` | `#990000` | diamond |

---

## See Also

- `component-modelling.md` — source of component list and interface list
- `core/memory/practices/architecture-documentation/drawio-conventions.md` — drawio XML authoring rules
- `core/memory/practices/architecture-documentation/threat-modelling.md` — STRIDE threat labels for View 7
- `core/memory/practices/architecture-documentation/data-classification.md` — classification badge colours
- `core/agents/design/architecture-diagrammer.md` — agent that writes `architecture.drawio` directly using these conventions
