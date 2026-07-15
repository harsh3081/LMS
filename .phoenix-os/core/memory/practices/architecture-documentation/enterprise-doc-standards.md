# Enterprise Documentation Standards

**Category**: architecture-documentation
**Status**: Active
**Version**: 1.0.0
**Created**: 2026-05-12
**See Also**: `doc-publishing.md`

---

## Purpose

Define the enterprise documentation standards — heading inventory, classification header, sign-off block, TOC conventions, and style contract — for technical design documents produced by the `phoenix:design:brd-to-design` pipeline. Standards are traceable to arc42, IEEE 1016, ISO/IEC/IEEE 42010, and TOGAF ADD. These standards are self-applied by `phoenix:tech-lead` when composing `tech-design.md` and by `phoenix:doc-publisher` when rendering the docx; reviewers should treat deviations as defects.

---

## When to Apply

- When `phoenix:tech-lead` composes `tech-design.md` (mandatory section inventory + ordering).
- When `phoenix:doc-publisher` renders `tech-design.docx` (style contract + classification header + sign-off block).
- When manually authoring or reviewing architecture documents outside the pipeline.
- When a project chooses to supply an optional `reference.docx` style template (see `doc-publishing.md` § Discovery Chain).

---

## Mandatory Section Inventory (Level-1 Headings)

The following Heading 1 sections must be present in every `tech-design.docx` produced by the pipeline. `phoenix:tech-lead` self-applies this list when composing `tech-design.md`; reviewers should treat a missing or renamed heading as a defect.

| # | Heading | Standard Source |
|---|---------|----------------|
| 1 | Introduction and Goals | arc42 §1 |
| 2 | Constraints | arc42 §2 |
| 3 | Context and Scope | arc42 §3 |
| 4 | Solution Strategy | arc42 §4 |
| 5 | Building Block View | arc42 §5 / C4 L2 |
| 6 | Runtime View | arc42 §6 / C4 Sequence |
| 7 | Deployment View | arc42 §7 / C4 Deployment |
| 8 | Cross-cutting Concepts | arc42 §8 |
| 9 | Architecture Decisions | arc42 §9 / ADRs |
| 10 | Quality Requirements | arc42 §10 / SEI QAS |
| 11 | Risks and Technical Debt | arc42 §11 |
| 12 | Glossary | arc42 §12 |
| 13 | Traceability Matrix | Standalone enterprise pattern |
| 14 | Sign-off | Enterprise compliance |

**Mapping to standards**:
- arc42 §1–12 covers the bulk of the structure.
- IEEE 1016 §5 (component design) maps to sections 5 and 6.
- ISO 42010 §5 (architecture description) maps to sections 3, 5, 9.
- TOGAF ADD Phase C/D outputs map to sections 4, 7, 8.

---

## Style Contract (Optional reference.docx Named Styles)

The recipe does not ship a `reference.docx`. A project that wants enterprise Word styling may supply one (per the discovery chain in `doc-publishing.md`); the table below documents the named paragraph styles such a template should define so Pandoc maps Markdown elements onto a consistent house style. If no `reference.docx` is provided, `phoenix:doc-publisher` produces a structurally complete but unstyled docx — these styles are optional, not required for the recipe to function.

| Style Name | Appearance | Usage |
|-----------|-----------|-------|
| `Title` | Sans-serif, 24pt, bold, navy `#0B2545` | Document title only |
| `Heading 1` | Sans-serif, 18pt, bold, navy `#0B2545`; numbered `1.` | Level-1 mandatory sections |
| `Heading 2` | Sans-serif, 14pt, bold, slate `#1F3A5F`; numbered `1.1` | Sub-sections |
| `Heading 3` | Sans-serif, 12pt, bold; numbered `1.1.1` | Third-level headings (max depth in TOC) |
| `Body Text` | Serif, 11pt, line-height 1.4 | Body paragraphs |
| `Code` | Consolas 10pt, light-grey block (`#f5f5f5` background) | Code blocks, commands, file paths |
| `Caption` | 10pt, italic, centred | Table captions, figure captions |
| `Table Heading` | 10pt, bold, white on dark navy background | Table header rows |

If a named style is absent in the project-supplied `reference.docx`, Pandoc falls back to the built-in Word default for that style — which will not match the enterprise look-and-feel but is structurally valid. Missing styles do not block publish.

---

## Classification Header

- Location: top of first page, in the document header section (when a project-supplied `reference.docx` defines one) or in the YAML frontmatter / first body paragraph (default rendering).
- Value: one of `PUBLIC`, `INTERNAL`, `CONFIDENTIAL`, `RESTRICTED`. `phoenix:doc-publisher` resolves the value from the highest classification badge across all components (per `data-classification.md` max-badge rule) and writes it into the `classification` field of the `tech-design.md` YAML frontmatter before invoking Pandoc.
- Style (when a project `reference.docx` is supplied): centred, bold, 14pt, colour matching the badge tier (green/amber/red from `data-classification.md`); the project's `reference.docx` may use `{{CLASSIFICATION_BADGE}}` as the header placeholder and Pandoc will populate it from the YAML field.
- Reviewers should reject docs where the resolved classification value is empty or outside the four allowed values.

---

## Sign-off Block

Located at the end of the document (Section 14). A bordered 4-column table with the following rows:

| Name | Role | Date | Signature |
|------|------|------|-----------|
| (TBD) | Recipe Author | | |
| (TBD) | Architecture Reviewer | | |
| (TBD) | Security Reviewer | | |
| (TBD) | ARB Approver | | |

- Role names sourced from `owners.json` (STM record).
- "ARB Approver" row is left blank by the recipe; the architecture review board fills it during the human review pass that gates merge.
- `phoenix:tech-lead` self-applies the structural rule when composing `tech-design.md`: sign-off table exists, has exactly 4 rows, all role-column cells are non-empty.

---

## TOC Conventions

- Auto-generated by Pandoc (`--toc --toc-depth=3`).
- Covers Heading 1, 2, and 3.
- TOC title is "Table of Contents" (Pandoc default).
- TOC is positioned after the document metadata block and before Section 1.
- Post-publish check (advisory, not gating): the rendered docx should contain a `<w:sdt>` TOC structured document tag in `word/document.xml`.

---

## Page Footer

- Left: document title (from YAML frontmatter `title` field).
- Right: "Page X of Y" auto-numbering.
- Font: 9pt, grey.

When a project supplies a `reference.docx`, the footer is configured there as a Word footer field and is inherited by the rendered docx — Pandoc does not author footers. Footer presence is not machine-verified.

---

## alt-text Requirement on Embedded Images

Every PNG image embedded in the docx must have non-empty alt-text. In the Pandoc Markdown source, this is the `![alt text](path)` alt-text string. `phoenix:doc-publisher` self-applies this rule before invoking Pandoc — empty alt-text on any image line is treated as a defect and surfaced for repair.

Alt-text source: the drawio `<diagram name="…">` page name (which `architecture-diagrammer` writes for each view). Format: `"<View Name> — <brief description of what is shown>"`.

---

## Standards Cross-Reference

This section maps the mandatory headings to their source standards for ARB traceability:

| Standard | Section | Covered by Heading # |
|----------|---------|---------------------|
| arc42 | §1 Intro and Goals | 1 |
| arc42 | §2 Constraints | 2 |
| arc42 | §3 Context | 3 |
| arc42 | §4 Solution Strategy | 4 |
| arc42 | §5 Building Block View | 5 |
| arc42 | §6 Runtime View | 6 |
| arc42 | §7 Deployment | 7 |
| arc42 | §8 Crosscutting | 8 |
| arc42 | §9 Decisions | 9 |
| arc42 | §10 Quality | 10 |
| arc42 | §11 Risks | 11 |
| arc42 | §12 Glossary | 12 |
| IEEE 1016 §5 | Component Design Description | 5, 6 |
| ISO 42010 §5 | Architecture Description | 3, 5, 9 |
| TOGAF ADD | Phase C/D outputs | 4, 7, 8 |

---

## See Also

- `doc-publishing.md` — Pandoc invocation and reference.docx discovery chain
- `data-classification.md` — classification badge colours and header value
- `core/templates/impl/brd-to-design-traceability.md` — Section 13 traceability matrix template
