# Data Classification Badges

**Category**: architecture-documentation
**Status**: Active
**Version**: 1.0.0
**Created**: 2026-05-12
**See Also**: `core/memory/practices/architecture/component-modelling.md`, `core/memory/practices/architecture/c4-strict.md`

---

## Purpose

Define the three-tier data classification scheme used in architecture diagrams and technical design documents produced by the `phoenix:design:brd-to-design` pipeline. Classification badges are auto-assigned by the `architecture-diagrammer` agent based on component type and interface data payload; authors may override by editing the generated `.drawio` before publish.

---

## When to Apply

- When `phoenix:tech-lead` records component/interface decisions during technical-design composition.
- When `phoenix:architecture-diagrammer` writes shape XML and self-applies a classification badge to every component/datastore/external shape.
- When `phoenix:doc-publisher` resolves the document-level classification header from the highest badge across all components.

---

## Classification Tiers

| Badge | Label | Colour | Meaning |
|-------|-------|--------|---------|
| `internal` | INTERNAL | Green `#d5e8d4` / `#82b366` | Data accessible to any authenticated employee; not exposed externally |
| `confidential` | CONFIDENTIAL | Amber `#fff2cc` / `#d6b656` | Data shared with a restricted subset of employees or specific partners; PII or commercially sensitive |
| `restricted` | RESTRICTED | Red `#f8cecc` / `#b85450` | Highest sensitivity; regulated data (PII, financial records, health information, legal documents); access requires explicit authorisation |

---

## Auto-Assignment Rules (Inference by Component Type)

The `architecture-diagrammer` agent assigns badges using these heuristics. Users may override after generation by editing the `.drawio` file directly; the agent does not enforce gating on overrides.

| Component Type | Default Badge | Rationale |
|---------------|---------------|-----------|
| `gateway` | `confidential` | Edge component; handles authentication tokens and routing data |
| `ui` | `internal` | Frontend serves public or internal users; does not store sensitive data by default |
| `service` | `internal` | Business logic; no assumption of sensitive data without explicit BRD signal |
| `datastore` | `confidential` | Persists state; likely contains user or business data |
| `queue` | `internal` | Transient messages; classify based on payload type, not the queue itself |
| `cache` | `confidential` | May hold session tokens, PII fragments |
| `job` | `internal` | Batch processes; classify based on data read/written |
| `external` | `confidential` | Third-party systems handle data we do not control; default to confidential |

**Escalation rules** (triggers `restricted` regardless of component type):
- Component name or BRD requirement contains any of: `health`, `medical`, `financial`, `legal`, `HR`, `payroll`, `identity`, `biometric`.
- Requirement has `CONSTRAINT` class with regulatory reference (GDPR, HIPAA, SOX, PCI-DSS, ISO 27001).
- BRD explicitly states "sensitive personal data" or "regulated data".

---

## Interface Classification Propagation

An interface's `data-payload-classification` is the most restrictive classification among:
1. The `source-component`'s badge.
2. The `target-component`'s badge.
3. Any explicit classification signal in the BRD for data flowing on this interface.

**Example**: A `gateway` (confidential) calling an `identity-service` (restricted) → interface classification = `restricted`.

---

## Override Protocol

1. Auto-assigned badges are visible in the generated `.drawio` and in the data-classification matrix written by `architecture-diagrammer`.
2. Authors may upgrade (e.g., internal → confidential) or downgrade (confidential → internal) any badge by editing the diagram before publish.
3. Downgrades from `restricted` to a lower tier should be accompanied by a one-line rationale in the diagram tooltip so reviewers can audit the choice during the standard review pass.

---

## Badge Rendering in Diagrams

Classification badges are rendered as small labelled rectangles in the top-right corner of each component shape in the C4 Container and Data Flow views:

```xml
<!-- Badge example: RESTRICTED in top-right of a component shape -->
<mxCell id="30" value="RESTRICTED"
        style="rounded=1;whiteSpace=wrap;html=1;fillColor=#f8cecc;
               strokeColor=#b85450;fontSize=8;fontStyle=1;
               labelBackgroundColor=#f8cecc;"
        vertex="1" parent="1"
        tooltip="Data classification: RESTRICTED">
  <mxGeometry x="180" y="40" width="70" height="18" as="geometry" />
</mxCell>
```

Badge must be positioned relative to its parent shape and should not overlap the shape's primary label.

---

## Classification Header in Technical Design Document

The highest classification badge across all components identified in the design determines the document-level classification header in the published `tech-design.docx`:

| Max badge in system | Document header |
|--------------------|----------------|
| `internal` only | `INTERNAL` |
| any `confidential` | `CONFIDENTIAL` |
| any `restricted` | `RESTRICTED` |

The `phoenix:doc-publisher` agent resolves the document-level classification using this rule and writes it into the YAML frontmatter `classification` field of `tech-design.md` before invoking Pandoc. If a project supplies a custom `reference.docx` with a `{{CLASSIFICATION_BADGE}}` placeholder in its header, Pandoc populates that placeholder from the YAML field; otherwise the value still appears in the rendered document body via the frontmatter.

---

## Compliance Notes

- `restricted` data automatically triggers STRIDE threat categories: Info Disclosure and Repudiation (see `threat-modelling.md`).
- Components carrying `restricted` data must appear in the Deployment view with an explicitly isolated network zone (no co-tenancy with `internal`-only components unless justified in an ADR).
- The `data-classification.md` inference rules are designed to produce conservative defaults — false positives (too-high classification) are preferable to false negatives (too-low classification).

---

## See Also

- `core/memory/practices/architecture/component-modelling.md` — component type taxonomy
- `core/memory/practices/architecture/c4-strict.md` — badge rendering positions in C4 views
- `core/memory/practices/architecture-documentation/threat-modelling.md` — restricted components trigger STRIDE checks
- `core/memory/practices/architecture-documentation/enterprise-doc-standards.md` — classification header convention in docx
