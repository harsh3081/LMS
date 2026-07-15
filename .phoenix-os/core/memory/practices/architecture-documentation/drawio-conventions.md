# Draw.io Diagram Conventions

**Category**: architecture-documentation
**Status**: Active
**Version**: 1.0.0
**Created**: 2026-05-12
**See Also**: `core/memory/practices/architecture/c4-strict.md`

---

## Purpose

Define the draw.io XML authoring conventions used when the `architecture-diagrammer` agent generates `architecture.drawio` in the `phoenix:design:brd-to-design` recipe. The agent writes drawio XML directly from the in-memory extraction summary — no skeleton files are loaded at runtime. These conventions apply to every diagram page the agent produces and to any human edits to `architecture.drawio` after generation.

---

## When to Apply

- When the `architecture-diagrammer` agent generates `architecture.drawio` (Step 4c).
- When manually editing `.drawio` files outside the pipeline.

---

## File Structure

Every `.drawio` file must use this root structure:

```xml
<mxfile host="brd-to-design" agent="Phoenix-OS" version="24.7.17">
  <diagram name="<PAGE-NAME>" id="<unique-id>">
    <mxGraphModel dx="800" dy="600" grid="1" gridSize="10" guides="1"
                  tooltips="1" connect="1" arrows="1" fold="1" page="1"
                  pageScale="1" pageWidth="1169" pageHeight="827"
                  math="0" shadow="0">
      <root>
        <mxCell id="0" />
        <mxCell id="1" parent="0" />
        <!-- shape cells go here -->
      </root>
    </mxGraphModel>
  </diagram>
</mxfile>
```

**Rules**:
- `host` attribute: always `"brd-to-design"` for pipeline-generated files.
- `agent` attribute: always `"Phoenix-OS"`.
- `version` attribute: a known-good draw.io version (`24.7.17` has been validated for headless PNG export on Windows; later versions are expected to remain compatible).
- Page size: A4 landscape (`pageWidth="1169" pageHeight="827"`) for all diagram types.
- `grid="1" gridSize="10"`: mandatory — shapes must snap to the 10px grid.

---

## Shape Conventions

### Basic Shape Cell

```xml
<mxCell id="2" value="<LABEL>" style="<STYLE>" vertex="1" parent="1"
        tooltip="<ALT-TEXT>">
  <mxGeometry x="100" y="100" width="120" height="60" as="geometry" />
</mxCell>
```

**Mandatory attributes on every vertex cell**:
- `vertex="1"` — identifies the cell as a shape (not an edge).
- `tooltip="<ALT-TEXT>"` — non-empty description of what the shape represents. The `architecture-diagrammer` agent self-applies this check before writing the file; reviewers should treat shapes with empty or missing tooltips as defects.
- `value="<LABEL>"` — human-readable label. Must not be empty for component shapes (may be empty for cosmetic shapes like boundary boxes if tooltip is set).

### ID Assignment

- Cell `id="0"` and `id="1"` are reserved for the root containers (always present).
- Diagram-content cells start at `id="2"` and increment as strings.
- IDs must be unique within a diagram page; they need not be globally unique across pages.

---

## Edge Conventions

### Orthogonal Routing (Mandatory)

All edges must use orthogonal routing. Curved or diagonal edges violate the convention and should be corrected before publishing the diagram.

```xml
<mxCell id="10" value="<PROTOCOL>" style="edgeStyle=orthogonalEdgeStyle;
        orthogonalLoop=1;jettySize=auto;exitX=1;exitY=0.5;exitDx=0;exitDy=0;
        entryX=0;entryY=0.5;entryDx=0;entryDy=0;
        labelBackgroundColor=#ffffff;"
        edge="1" source="2" target="5" parent="1">
  <mxGeometry relative="1" as="geometry" />
</mxCell>
```

**Required style attributes on edges**:
- `edgeStyle=orthogonalEdgeStyle` — forces 90-degree turns.
- `orthogonalLoop=1` — handles self-loops correctly.
- `labelBackgroundColor=#ffffff` — white background on edge labels for readability.
- `source` and `target` must reference existing vertex cell IDs.

### Arrow Anchor Points

- Use explicit `exitX/exitY` and `entryX/entryY` anchors on all edges to prevent the renderer from auto-routing through shapes.
- Preferred anchors: right side (exitX=1, exitY=0.5) to left side (entryX=0, entryY=0.5) for horizontal flows.

---

## Label Backgrounds

All labels — both on shapes and on edges — must use a white background when placed over a coloured fill or a complex diagram background:

```xml
style="...; fontStyle=1; labelBackgroundColor=#ffffff; labelBorderColor=none;"
```

This is mandatory for accessibility (contrast ratio ≥ 4.5:1) and readability when exporting to PNG.

---

## Alt-text and `UserObject` Usage

Alt-text (accessibility / screen-reader text) is set via the `tooltip` attribute on `<mxCell>` **or** via a `<UserObject>` element that **wraps** `<mxCell>`. The two are distinct XML patterns and must not be mixed.

### Pattern A — `tooltip` on `<mxCell>` (preferred when alt-text only)

Use this pattern when you need an alt-text description but no additional object-level metadata:

```xml
<mxCell id="ctx-customer" value="Customer" style="..." vertex="1" parent="1"
        tooltip="C4 Context — Customer — PUBLIC">
  <mxGeometry x="80" y="100" width="180" height="120" as="geometry" />
</mxCell>
```

This is the recommended pattern. The `tooltip` attribute is already documented under Shape Conventions and is self-checked by the `architecture-diagrammer` agent before the file is written.

### Pattern B — `<UserObject>` wrapping `<mxCell>` (when object-level metadata is needed)

Use this pattern **only** when the cell genuinely requires object-level metadata (e.g., `alt`, `link`, or custom properties) beyond a plain tooltip:

```xml
<UserObject id="ctx-customer" label="Customer" alt="C4 Context — Customer — PUBLIC">
  <mxCell style="..." vertex="1" parent="1">
    <mxGeometry x="80" y="100" width="180" height="120" as="geometry" />
  </mxCell>
</UserObject>
```

`<UserObject>` is the **parent** of `<mxCell>` in this pattern. The `id` attribute lives on `<UserObject>`, not on `<mxCell>`.

> **FORBIDDEN:** `<UserObject>` as a **child** of `<mxCell>`.
>
> ```xml
> <!-- WRONG — mxGraph schema violation; drawio will refuse to open the file -->
> <mxCell id="ctx-customer" value="Customer..." style="..." vertex="1" parent="1">
>   <mxGeometry ... />
>   <UserObject label="" alt="C4 Context — Customer — PUBLIC"/>  <!-- invalid -->
> </mxCell>
> ```
>
> This pattern causes drawio Desktop to emit `Could not add object for UserObject` and silently breaks PNG export. **Never emit `<UserObject>` as a child of `<mxCell>`.**

### Common mistake

Agents trained on fragmented mxGraph examples sometimes place `<UserObject>` inside `<mxCell>` to attach alt-text metadata. This is structurally invalid. If alt-text is the only goal, use Pattern A (`tooltip` attribute). If metadata is required, use Pattern B (`<UserObject>` wrapping `<mxCell>`). In either case, `<UserObject>` must never appear as a descendant of `<mxCell>`.

---

## Boundary Box Convention

Boundary boxes (system boundary, container boundary, trust boundary) are drawn as dashed rectangles with no fill:

```xml
<mxCell id="20" value="System Boundary"
        style="rounded=0;whiteSpace=wrap;html=1;dashed=1;fillColor=none;
               strokeColor=#000000;strokeWidth=2;
               fontStyle=1;fontSize=12;verticalAlign=top;"
        vertex="1" parent="1"
        tooltip="System boundary enclosing all owned components">
  <mxGeometry x="60" y="60" width="800" height="600" as="geometry" />
</mxCell>
```

Shapes inside the boundary are nested visually (positioned within the bounding box geometry) but remain `parent="1"` in the XML (not child cells of the boundary box) unless explicit grouping is required.

---

## Multi-Page Files

The seven mandatory views live on seven pages in a single `.drawio` file. Each page is a `<diagram>` element:

```xml
<mxfile ...>
  <diagram name="Context" id="page-1"> ... </diagram>
  <diagram name="Container" id="page-2"> ... </diagram>
  <diagram name="Component" id="page-3"> ... </diagram>
  <diagram name="Sequence" id="page-4"> ... </diagram>
  <diagram name="Data Flow" id="page-5"> ... </diagram>
  <diagram name="Deployment" id="page-6"> ... </diagram>
  <diagram name="Threat Model" id="page-7"> ... </diagram>
</mxfile>
```

Page names must match the canonical names exactly. The `architecture-diagrammer` agent self-checks page names against this list before writing the file; reviewers should reject diagrams with renamed or extra pages.

---

## Headless PNG Export

draw.io 24.7.17 on Windows 11 supports headless PNG export with exit code 0 and a valid PNG output. Canonical command:

```cmd
"C:\Program Files\draw.io\draw.io.exe" --export --format png --output <out.png> --page-index <N> <file.drawio>
```

- `--page-index` is zero-based (page 0 = first `<diagram>` element).
- PNG minimum size threshold: 1024 bytes (smaller outputs are treated as corrupt).
- When no drawio renderer is available (degraded mode — see `doc-publishing.md` § Three-Tier Renderer Chain), PNG export is skipped and `doc-publisher` inserts a placeholder caption per page in the docx.

---

## XML Validity Requirements

Every `.drawio` file must pass these checks. `scripts/brd-to-design/drawio_lint.py` validates them after the `architecture-diagrammer` agent writes the file; lint failures must be repaired before publish:
1. File starts with `<mxfile` root element.
2. Contains at least one `<diagram` element.
3. Contains at least one `<mxGraphModel` element.
4. Contains a `<root>` element with at least two child `<mxCell` elements (id=0 and id=1).
5. Contains at least one `<mxCell vertex="1"` shape cell (non-root).
6. All edge `source` and `target` attributes reference existing vertex IDs within the same page.
7. No `<mxCell>` element may appear as a direct XML child of another `<mxCell>`. The mxGraph schema requires **every `<mxCell>` to be a direct child of `<root>`**. Hierarchy is expressed *logically* through the `parent="..."` attribute, not through XML nesting. This covers two distinct forbidden patterns:
   - **7a** — No `<UserObject>` element whose direct XML parent is `<mxCell>`. (See "Alt-text and `UserObject` Usage" section above.)
   - **7b** — No `<mxCell>` element whose direct XML parent is another `<mxCell>`. Edge-label cells must be siblings under `<root>`, not nested inside their parent edge cell. See "Edge Label Flatness" section below.

### Edge Label Flatness (check 7b)

The most common source of check 7b violations is edge-label cells. The `architecture-diagrammer` agent must emit all edge-label `<mxCell>` elements as **direct children of `<root>`**, using the `parent="<edge-id>"` attribute to express the logical relationship. XML nesting must never be used.

**FORBIDDEN — `<mxCell>` nested inside its parent edge `<mxCell>`:**

```xml
<!-- WRONG — mxGraph schema violation; drawio drops edge labels on save -->
<mxCell id="ctx-e1" style="edgeStyle=orthogonalEdgeStyle;" edge="1"
        parent="1" source="ctx-customer" target="ctx-system">
  <mxGeometry relative="1" as="geometry"/>
  <mxCell id="ctx-e1-lbl" value="HTTPS" style="edgeLabel;" vertex="1"
          connectable="0" parent="ctx-e1">        <!-- INVALID: mxCell inside mxCell -->
    <mxGeometry x="-0.2" relative="1" as="geometry"/>
  </mxCell>
</mxCell>
```

**CORRECT — edge-label `<mxCell>` as a sibling under `<root>`:**

```xml
<!-- RIGHT — edge-label is a direct child of <root>; parent attr carries the link -->
<mxCell id="ctx-e1" style="edgeStyle=orthogonalEdgeStyle;" edge="1"
        parent="1" source="ctx-customer" target="ctx-system">
  <mxGeometry relative="1" as="geometry"/>
</mxCell>
<mxCell id="ctx-e1-lbl" value="HTTPS" style="edgeLabel;" vertex="1"
        connectable="0" parent="ctx-e1">          <!-- correct: sibling under root -->
  <mxGeometry x="-0.2" relative="1" as="geometry"/>
</mxCell>
```

The `parent="ctx-e1"` attribute correctly binds the label to the edge logically; drawio renders it as a mid-edge label. The only difference from the forbidden pattern is that the `<mxCell id="ctx-e1-lbl">` element is a **sibling** of `<mxCell id="ctx-e1">` under `<root>`, not a child.

> **Verification snippet**: use the quick check from issue #552 to assert no violations before committing a drawio file:
> ```python
> import xml.etree.ElementTree as ET
> tree = ET.parse("architecture.drawio")
> violations = sum(
>     1 for elem in tree.iter()
>     for child in list(elem)
>     if elem.tag == "mxCell" and child.tag == "mxCell"
> )
> assert violations == 0, f"{violations} mxCell elements XML-nested inside other mxCells"
> ```

---

## See Also

- `core/memory/practices/architecture/c4-strict.md` — C4 shape palette and view rules
- `core/memory/practices/architecture-documentation/data-classification.md` — classification badge colours
- `core/agents/design/architecture-diagrammer.md` — agent that writes `architecture.drawio` directly using these conventions
