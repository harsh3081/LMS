# Document Publishing Conventions

**Category**: architecture-documentation
**Status**: Active
**Version**: 2.0.0
**Created**: 2026-05-12
**Updated**: 2026-05-26
**See Also**: `enterprise-doc-standards.md`, `core/memory/practices/architecture-documentation/data-classification.md`

---

## Purpose

Define the Pandoc-based document publishing conventions used by the `doc-publisher` agent at Step 4e of the `phoenix:design:brd-to-design` recipe. Covers docx rendering, drawio PNG embedding (three-tier renderer chain), view-type-to-TOGAF-section mapping, caption format, aspect-aware sizing, degraded-mode placeholder captions, TOC generation, and the reference.docx discovery chain.

---

## When to Apply

- Step 4e of `phoenix:design:brd-to-design` (publication by `doc-publisher` agent, only when `--publish-docx` is set).
- When debugging publication failures or extending the Pandoc orchestration pipeline.

---

## Pandoc Invocation (Canonical)

The `doc-publisher` agent invokes Pandoc with these flags:

```bash
pandoc <tech-design.md> \
  --from gfm+yaml_metadata_block \
  --to docx \
  --reference-doc <reference.docx> \
  --toc \
  --toc-depth=3 \
  --standalone \
  -o <tech-design.docx>
```

**Flag rationale**:
- `--from gfm+yaml_metadata_block`: GitHub-Flavored Markdown with YAML frontmatter (Phoenix OS document format).
- `--reference-doc`: Injects named styles from the core default or per-project override (see discovery chain below).
- `--toc --toc-depth=3`: Auto-generates Table of Contents through Heading 3.
- `--standalone`: Produces a complete document, not a fragment.

**Pre-flight probe** (inline in orchestrator Step 4e): `pandoc --version` — if Pandoc is absent, the orchestrator records `WARN_PUBLISH_DOCX_SKIPPED` and falls back to `python-docx`. If neither is available, docx generation is skipped non-blockingly.

---

## reference.docx Discovery Chain

The recipe does not ship a core-default `reference.docx`. Teams that want custom Word styling provide their own template via either:

```
1. --reference-docx <path>                        (explicit CLI argument; highest precedence)
2. .phoenix-os/project/templates/reference.docx   (per-project override)
```

If neither is provided, the `doc-publisher` agent proceeds without a reference template — plain Pandoc/python-docx output (not an error).

**Authoring a project reference.docx**: open Microsoft Word (or generate via `pandoc -o reference.docx empty.md`), define the named paragraph styles listed in `enterprise-doc-standards.md` § Style Contract, save to `.phoenix-os/project/templates/reference.docx`.

---

## Three-Tier Drawio Renderer Chain

The orchestrator (Step 4e of `brd-to-design.md`) probes for available renderers in order; the first available tier is used. The probe is performed inline — no external probe-result file is written.

### Tier 1 — drawio-desktop

```bash
drawio --version
```

- Exit 0: drawio-desktop is available. Signal full PNG mode using drawio-desktop renderer.
- Non-zero / not found: proceed to Tier 2.

### Tier 2 — Puppeteer + viewer.diagrams.net

```bash
node -e "require('puppeteer')"
```

- Exit 0: Puppeteer is available. Signal full PNG mode using the `scripts/brd-to-design/render-drawio.js` Puppeteer renderer.
  - Invocation: `node scripts/brd-to-design/render-drawio.js <drawio-file> <output-dir>`
  - Output: `diagrams/drawio-<page-name-slug>.png` per diagram page (by page name, not sequential index).
  - Stdout: JSON array of `{ page, file, width, height }` for each rendered page.
- Non-zero / not found: proceed to Tier 3.

### Tier 3 — Degraded mode (no renderer available)

Neither Tier 1 nor Tier 2 is available.

- Emit `WARN_DRAWIO_RENDERER_MISSING: no drawio renderer available; named placeholder captions inserted`.
- `doc-publisher` iterates all `<diagram>` pages in `architecture.drawio` and inserts one named placeholder caption per page.
- Placeholder format: `[Diagram placeholder: <page title> — drawio renderer not available. See architecture.drawio.]`
- Pipeline continues; no PNG files are written; `doc-publisher` inserts named placeholder captions instead.

---

## View-Type to TOGAF Section Convention Table

`doc-publisher` resolves which TOGAF section to anchor each diagram in by matching the drawio page title (case-insensitive substring) against the table below. First match wins. Matching is performed against the Heading-2/3 text in `tech-design.md`, not against hard-coded section numbers — re-numbered TOGAF outlines are handled correctly.

| drawio page title contains (case-insensitive) | TOGAF section anchor | Heading match keywords |
|---|---|---|
| "system context" or matches `c4.*context` | System Context section (e.g. §4.3) | `system context` |
| "container" | Container Architecture section (e.g. §4.4) | `container` |
| "component" or "interface" | Component / Interface section (e.g. §4.5) | `component`, `interface` |
| "sequence" or "runtime" | Sequence / Interaction section (e.g. §4.6) | `sequence` |
| "data flow" or matches `data.*architecture` | Data Flow section (e.g. §3.3) | `data flow` |
| "deployment" or "network" | Deployment / Network section (e.g. §5.2) | `deployment`, `network` |
| "threat" | Threat Model section (e.g. §8) | `threat` |
| *(unrecognised)* | "Diagrams" annex (appended at end of document) | — |

**Resolution algorithm**:
1. Lower-case the drawio page title.
2. For each row in the table (top-to-bottom), check if any keyword for that row is a substring of the page title.
3. First match → use that TOGAF section anchor; scan the document headings for the first heading whose lower-cased text contains the match keyword.
4. No match → append to the "Diagrams" annex section.

Section numbers are not hard-coded; the publisher resolves them by matching Heading-2/3 text so re-numbered TOGAF outlines still work.

---

## PNG Embedding

Diagram views are embedded using `python-docx` `InlineShape` API (not via Markdown image syntax in the source `.md`). The `doc-publisher` agent:

1. Reads `architecture.drawio` to enumerate all `<diagram>` pages (authoritative source of diagram count and view-type metadata).
2. Uses the renderer tier signalled by the orchestrator (Tier 1 or Tier 2 — resolved inline in Step 4e, not from a file).
3. For Tier 1 (drawio-desktop): exports each page using `drawio --export --format png --page-name <name>` → `diagrams/drawio-<page-name-slug>.png`.
4. For Tier 2 (Puppeteer): invokes `node scripts/brd-to-design/render-drawio.js` → `diagrams/drawio-<page-name-slug>.png`.
5. Applies the aspect-aware sizing formula (see below) to each PNG.
6. Inserts each PNG at the TOGAF section anchor resolved by the convention table above.
7. Appends the caption immediately below the image using `Caption` Word style, centered.

**PNG file naming**: `diagrams/drawio-<page-name-slug>.png` where `<page-name-slug>` is the drawio page title lowercased, non-alphanumeric characters stripped, spaces replaced with hyphens, truncated to 80 characters. This naming lets `doc-publisher` derive view type from the filename when needed.

---

## Aspect-Aware Sizing Formula

Given a drawio render at native `(W_px, H_px)`:

```
aspect       = H_px / W_px
usable_w     = 6.5"            # A4-portrait body width
usable_h     = 8.0"            # A4-portrait body height cap
target_w     = min(usable_w, usable_h / aspect)
target_h     = target_w * aspect
```

Apply via `python-docx` EMU (914400 EMU = 1 inch):

```python
EMU_PER_INCH = 914400
target_w_emu = int(target_w * EMU_PER_INCH)
target_h_emu = int(target_h * EMU_PER_INCH)
run.add_picture(png_path, width=target_w_emu, height=target_h_emu)
```

Aspect preserved. No image overflows usable area. Very wide diagrams use full width; very tall diagrams are capped at the height limit.

---

## Caption Format

Caption immediately below each embedded image:

```
Figure {section}-{n_within_section} — {drawio page title} (drawio)
```

- Em-dash U+2014 (not two ASCII hyphens).
- `Caption` Word style, centered.
- `{section}`: resolved TOGAF section number (e.g. `4.3`, `8`).
- `{n_within_section}`: 1-based counter reset per section.
- `{drawio page title}`: the page `name` attribute from `<diagram name="...">` in `architecture.drawio`.

**Example**: `Figure 4.3-1 — System Context (drawio)`

---

## Degraded Mode — Placeholder Captions

When Tier 3 is active (no renderer available), `doc-publisher` inserts one placeholder caption per drawio page at the resolved TOGAF section anchor. Placeholder format:

```
[Diagram placeholder: <page title> — drawio renderer not available. See architecture.drawio.]
```

The warning code `WARN_DRAWIO_RENDERER_MISSING` is emitted once, reporting the total drawio page count:

```
WARN_DRAWIO_RENDERER_MISSING: no drawio renderer available; named placeholder captions inserted
  drawio pages: N (from architecture.drawio <diagram> count)
```

PNG embedding is fully skipped in degraded mode; the docx is still produced with all text, TOC, and placeholder captions.

---

## TOC Generation

Pandoc auto-generates the TOC from Heading 1–3 levels. The TOC is inserted at the `[TOC]` marker if present in the source Markdown; otherwise, Pandoc places it after the document metadata block.

**TOC check**: The published docx must contain a TOC. Verify by opening the docx as a zip and checking that `word/document.xml` contains a `<w:sdt>` TOC structured document tag.

---

## Document Metadata Block (YAML Frontmatter)

Every technical design document emitted by the recipe must begin with a YAML metadata block:

```yaml
---
title: "Technical Design — <System Name>"
author: "<recipe-author>"
date: "<ISO date>"
classification: "{{CLASSIFICATION_BADGE}}"
version: "1.0"
issue: "447"
---
```

`doc-publisher` resolves `{{CLASSIFICATION_BADGE}}` to the document-level classification (from `data-classification.md` max-badge rule) before invoking Pandoc.

---

## Classification Header

The `reference.docx` file contains a header field at the top of the first page with placeholder text `{{CLASSIFICATION_BADGE}}`. Pandoc populates this via the YAML `classification` field.

In degraded mode, if no PNG is embedded, the docx still gets the correct classification header — PNG embedding is independent of the classification resolution.

---

## Engine Fallback Chain

In case Pandoc is unavailable or fails:

| Engine | Fallback | Notes |
|--------|---------|-------|
| Pandoc ≥ 2.19 | python-docx | Orchestrator probes inline; if Pandoc absent, falls back to python-docx; if both absent, docx generation is skipped non-blockingly |
| drawio-desktop (Tier 1) | Tier 2 (Puppeteer) | See Three-Tier Renderer Chain above |
| Puppeteer (Tier 2) | Tier 3 (degraded placeholders) | See Three-Tier Renderer Chain above |
| reference.docx not found | Pandoc generates unstyled docx | Orchestrator warns but does NOT block — unstyled output is still structurally complete |

There is no automatic fallback from Pandoc to another docx engine. If Pandoc fails mid-run (e.g., out-of-memory), the pipeline halts with `ERR: pandoc exit=<N>`.

---

## Post-Publish Verification

After `doc-publisher` completes, verify:
1. `tech-design.docx` exists.
2. Word XML contains level-1 headings for the ten mandatory TOGAF sections produced by `phoenix:tech-lead`.
3. TOC structured document tag present.
4. Classification header non-empty.
5. Sign-off block table present (4 rows: Recipe Author, Architecture Reviewer, Security Reviewer, ARB Approver).

---

## See Also

- `enterprise-doc-standards.md` — heading inventory, sign-off block, style contract (named paragraph styles a project reference.docx should define)
- `data-classification.md` — classification header value resolution
- `scripts/brd-to-design/render-drawio.js` — Tier 2 Puppeteer renderer implementation
- `core/commands/phoenix/design/brd-to-design.md` — Step 4e orchestration and inline renderer probe
