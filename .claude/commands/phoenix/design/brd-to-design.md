---
name: phoenix:design:brd-to-design
description: Generate ADRs, TOGAF-aligned tech design, and C4 architecture diagram from a BRD
argument-hint: "<brd-path> [--output-dir <dir>] [--issue-number <N>] [--non-interactive] [--allow-pii-examples] [--force-overwrite] [--publish-docx] [--allow-placeholder-diagrams] [--reference-docx <path>] [--mirror-to-docs]"
---

## Role

You are the `phoenix:design:brd-to-design` orchestrator. You ingest a BRD (`.md` or
`.txt`) and produce artifacts under `<output-dir>` (resolved in Step 0):

- `adr/ADR-NNN.md` — one Michael-Nygard ADR per significant decision
- `tech-design.md` — TOGAF-aligned (BDAT) technical design document with inline Mermaid C4 diagrams
- `architecture.drawio` — C4 Context + Container diagram (Component / Sequence / Data Flow / Deployment / Threat Model when BRD scope warrants)
- `tech-design.docx` — enterprise Word document (only when `--publish-docx` is passed and a converter is available)

You are a conductor, not an analyst. Every substantive task is delegated to a named
specialist agent. You orchestrate, validate, and report.

---

## Inputs

| Argument | Required | Default | Description |
|---|---|---|---|
| `<brd-path>` | yes | — | Path to BRD file; `.md` or `.txt` only |
| `--output-dir` | no | (resolved in Step 0) | Explicit output directory; overrides issue-number and slug logic |
| `--issue-number <N>` | no | — | Issue number; resolves output dir to `.phoenix-os/project/specs/<N>/` |
| `--non-interactive` | no | false | Skip all prompts; auto-accept recommendations |
| `--allow-pii-examples` | no | false | With `--non-interactive`: tolerate PII hits inside pragma blocks |
| `--force-overwrite` | no | false | Overwrite existing artifacts without prompting |
| `--publish-docx` | no | false | Opt-in: generate `tech-design.docx` via Pandoc / python-docx fallback |
| `--allow-placeholder-diagrams` | no | false | With `--publish-docx`: accept degraded mode (named placeholder captions) even when no diagram renderer is available; suppresses `ERR_PUBLISH_DOCX_NO_RENDERER` halt |
| `--reference-docx <path>` | no | — | Custom Word style template used with `--publish-docx` |
| `--mirror-to-docs` | no | false | Opt-in: copy artifacts to `<consumer-project>/docs/design/` after primary write |

---

## Orchestration Sequence

| Step | Phase | Owning agent | Output |
|---|---|---|---|
| 0 | Read BRD into memory; verify file is readable `.md`/`.txt`; resolve `<output-dir>` | orchestrator (inline) | in-memory BRD text + resolved output path |
| 1 | PII guard — pattern scan + pragma + per-hit disposition | orchestrator (inline) | continue or `ERR_BRD_PII_DETECTED` halt |
| 2a | Extract requirements, stakeholders, NFRs | `phoenix:brd-analyzer` | in-memory extraction summary |
| 2b | Identify technical decision gaps (TOGAF checklist) | `phoenix:tech-lead` | in-memory gap list with recommendations |
| 3 | Interview — 5–10 focused questions, one per gap, with recommendations | orchestrator + `phoenix:tech-lead` | in-memory accepted decisions |
| 4a | Write Michael-Nygard ADRs | `phoenix:adr-keeper` | `<output-dir>/adr/ADR-NNN.md` |
| 4b | Write TOGAF-aligned tech design with inline Mermaid C4 embeds | `phoenix:tech-lead` | `<output-dir>/tech-design.md` |
| 4c | Write C4 diagram as drawio XML (up to 7 conditional views) | `phoenix:architecture-diagrammer` | `<output-dir>/architecture.drawio` |
| 4d | Provide STRIDE threat entries (merged into 4b Threat Model section) | `phoenix:threat-modeller` | section content |
| 4e | When `--publish-docx`: inline tool probe → delegate to `phoenix:doc-publisher` | `phoenix:doc-publisher` | `<output-dir>/tech-design.docx` |
| 4f | When `--mirror-to-docs`: copy artifacts to `<consumer-project>/docs/design/` | orchestrator (inline) | mirror copy (non-blocking) |
| 5 | Print artifact paths and one-line decision summary | orchestrator (inline) | terminal output |

Steps 4a / 4b / 4c / 4d may run in parallel. Step 4b depends on 4d's STRIDE output.
Step 4e runs after 4b and 4c complete. Step 4f runs after 4e (or after 4c if `--publish-docx` is not set).

---

## Steps

### Step 0 — Read BRD and Resolve Output Directory

Read `<brd-path>` into memory. Accept `.md` and `.txt` only.

Halt if file is missing or unreadable:

```
ERR_BRD_UNREADABLE: BRD file not found or not readable at '<brd-path>'
action: verify path and file encoding (UTF-8 expected); .docx is not supported at MVP
```

Halt if extension is not `.md` or `.txt`:

```
ERR_BRD_FORMAT: unsupported BRD format '<ext>'
action: convert to .md or .txt; .docx support is deferred
```

#### Output directory resolution

After the BRD is confirmed readable, resolve `<output-dir>` using this precedence:

1. If `--output-dir <dir>` was passed: use verbatim; record `output-dir-source: explicit`
2. Else if `--issue-number <N>` was passed: resolve to `.phoenix-os/project/specs/<N>/`; record `output-dir-source: issue-number`
3. Else: derive `<brd-slug>` from the BRD filename (lower-case, alphanumeric and dashes only, max 60 chars, strip `.md`/`.txt` extension); resolve to `.phoenix-os/project/specs/design/<brd-slug>/`; record `output-dir-source: brd-slug`

The resolved `<output-dir>` is the canonical path used by all subsequent steps. The `docs/design/` tree is only written when `--mirror-to-docs` is explicitly passed (Step 4f).

#### Pre-flight renderer probe (when `--publish-docx`)

When `--publish-docx` is set (on CLI or will be offered in Step 3), probe for diagram renderer availability **before** beginning any generation work:

**Tier 1 — drawio-desktop**:
```
drawio --version
```
- Exit 0: Tier 1 available. Record `renderer-tier: 1`. Proceed.

**Tier 2 — Puppeteer**:
```
node -e "require('puppeteer')"
```
Run this from the `scripts/brd-to-design` directory (so that `node_modules/` there is on the resolution path).
- Exit 0 (and Tier 1 failed): Tier 2 available. Record `renderer-tier: 2`. Proceed.

**No renderer available (Tier 3)**:

If Tier 1 failed AND Tier 2 failed:

- If `--allow-placeholder-diagrams` IS set: record `renderer-tier: 3 (degraded)`. Do NOT halt. Proceed to Step 1. The pipeline will emit `WARN_DRAWIO_RENDERER_MISSING` at Step 4e and insert named placeholder captions.

- If `--allow-placeholder-diagrams` is NOT set: halt immediately with:

```
ERR_PUBLISH_DOCX_NO_RENDERER: --publish-docx requested but no diagram renderer is available
  Tried Tier 1: drawio --version        — not found or non-zero exit
  Tried Tier 2: node -e "require('puppeteer')" (from scripts/brd-to-design) — MODULE_NOT_FOUND or non-zero exit
  No partial docx will be written.

  Remediation options (choose one):
    Option A — Install draw.io Desktop:
               https://github.com/jgraph/drawio-desktop/releases
    Option B — Install Puppeteer (Tier 2 renderer):
               npm install --prefix scripts/brd-to-design
    Option C — Accept degraded output (named placeholder captions):
               Re-run with --allow-placeholder-diagrams added to your command.
               Diagrams will be replaced by text like:
               "[Diagram: Context] — see architecture.drawio page 1"
```

No downstream steps run. No files are written to `<output-dir>`. Exit non-zero.

**Note**: This probe runs in Step 0 (before the 5–10 min generation cycle) specifically so the user discovers the gap immediately, not after waiting for artifact generation.

---

### Step 1 — Inline PII Guard

Scan the BRD text for candidate PII before any other work. No Python, no external
script. The orchestrator performs the scan inline.

#### Pragma exemption

Content between `<!-- pii:examples-block -->` and `<!-- /pii:examples-block -->` tags
is excluded from scanning. Authors use this to mark intentional example data:

```
<!-- pii:examples-block -->
Sample email: jane@example.com
Sample card:  4111-1111-1111-1111
<!-- /pii:examples-block -->
```

#### Pattern set

Scan every line outside a pragma block for:

| Kind | Pattern |
|---|---|
| `email` | `word@word.tld` shaped token |
| `phone` | 7+ digit run with common separators (spaces, dashes, dots, parens); international `+` prefix included |
| `national-id` | SSN (`\d{3}-\d{2}-\d{4}`), Aadhaar (12-digit run), PAN (`[A-Z]{5}\d{4}[A-Z]`), NIN (`[A-Z]{2}\d{6}[A-Z]`) |
| `credit-card` | 13–19 digit groups (spaces/dashes OK) passing Luhn check |
| `street-address` | Numeric + street-suffix vocabulary (St, Ave, Rd, Blvd, Lane, Dr, Court, Pl, Way) |
| `personal-name` | Non-empty `Name` cell in a sign-off table row (`\| <text> \| <role> \| <sig> \|`); stakeholder-role-only rows are accepted |

#### Interactive disposition (default mode)

For each hit outside a pragma block, present:

```
PII candidate at line <N>: "<snippet>" (kind: <email|phone|national-id|credit-card|street-address|personal-name>)
Disposition:
  [real]     — this is real PII; halt and ask user to redact
  [example]  — example/mockup data; continue
  [false]    — pattern matched but not PII; continue
```

If any hit is dispositioned `real`, halt:

```
ERR_BRD_PII_DETECTED: candidate PII at line <N>: "<snippet>" (kind: <...>)
action: redact the BRD (or wrap intentional examples in <!-- pii:examples-block --> ... <!-- /pii:examples-block -->) and re-invoke.
        The recipe will not process BRDs containing real PII.
```

Otherwise continue.

#### Non-interactive mode

Any hit outside a pragma block halts immediately with `ERR_BRD_PII_DETECTED` unless
`--allow-pii-examples` is also set, in which case hits outside pragma blocks are
treated as `example` (not `real`) and the scan continues. In all cases, a hit inside
a pragma block never triggers a halt.

---

### Step 2 — Read and Extract

#### 2a — Delegate to `phoenix:brd-analyzer`

Delegate with the full BRD text (in-memory). Agent extracts:

- Business objectives and success metrics
- Stakeholders with ISO 42010 concerns (role, concern, viewpoint)
- Functional requirements (MoSCoW if present)
- Non-functional requirements

Output is in-memory. No IR files written.

#### 2b — Delegate to `phoenix:tech-lead`

Delegate the extraction summary. Agent identifies technical decision gaps against a
TOGAF-aligned checklist: tech stack, data store, auth model, hosting/deployment,
integrations, observability, security posture. Each gap includes a recommendation
with rationale.

Output is in-memory.

---

### Step 3 — Interview

Present 5–10 focused decision questions to the user, one per gap identified in 2b.
Each question shows the recommendation and alternatives.

Example format:

```
Decision: Data store
Recommended: PostgreSQL via Prisma (relational data model suits the BRD entities)
Alternatives: MongoDB (if schema flexibility needed), SQLite (prototype only)
Your choice [press Enter to accept recommendation]:
```

Always include this question last in the interview:

```
Decision: Document hand-off format
Generate tech-design.docx for ARB hand-off / enterprise sign-off? [no]
(Requires Pandoc or python-docx; skipped gracefully if neither is available)
Diagram renderer: <Tier 1 — drawio-desktop | Tier 2 — Puppeteer | none detected>
  Tier 1 (drawio --version succeeded): diagrams embedded as PNGs
  Tier 2 (node -e "require('puppeteer')" succeeded from scripts/brd-to-design): diagrams embedded as PNGs
  none detected: use --allow-placeholder-diagrams to accept named placeholder captions, or install a renderer first
    Option A: install draw.io Desktop — https://github.com/jgraph/drawio-desktop/releases
    Option B: run `npm install --prefix scripts/brd-to-design` (installs Puppeteer)
Your choice [press Enter to decline]:
```

Compute the renderer tier at interview time using the same probes defined in Step 0 — Pre-flight renderer probe. Substitute the actual detected tier into the `Diagram renderer:` line above.

If user accepts `--publish-docx` AND no renderer is detected (Tier 3), offer a one-time Puppeteer install before proceeding. Present this prompt immediately after the user accepts docx generation:

```
No diagram renderer detected. Tier 2 (Puppeteer) can be installed now (~300 MB Chromium download, ~1 min).
Install Puppeteer and use embedded diagrams?
  [y] Run `npm install --prefix scripts/brd-to-design` now, then continue with embedded PNGs
  [n] Continue without diagrams (placeholder captions only — not ARB sign-off quality)
Your choice [n]:
```

- If the user chooses `[y]`: run `npm install --prefix scripts/brd-to-design` inline (blocking). On success, re-probe for Tier 2 and record `renderer-tier: 2`. On failure, warn and fall back to Tier 3.
- If the user chooses `[n]` or in `--non-interactive` mode: record `renderer-tier: 3 (degraded)`. Emit:
  ```
  NOTE: tech-design.docx will contain named placeholder captions instead of embedded diagrams.
        This output is not suitable for ARB / enterprise sign-off without diagrams.
        To produce embedded diagrams: install draw.io Desktop or run `npm install --prefix scripts/brd-to-design`.
  ```
- The install offer is suppressed when `--allow-placeholder-diagrams` is set explicitly (the user has already opted in to degraded mode).

If user accepts, set `--publish-docx` for Step 4e. In `--non-interactive` mode, auto-decline (default `no`), do not set `--publish-docx` unless it was passed explicitly on the command line.

In `--non-interactive` mode, auto-accept all other recommendations and record
`decider: "auto"` for each. No prompts shown.

Keep a single in-memory decisions record: `[{ gap, recommendation, accepted, decider }]`.

---

### Step 4 — Generate Artifacts

#### 4a — ADRs (`phoenix:adr-keeper`)

Delegate the decisions record. Agent writes one Michael-Nygard ADR per significant
decision to `<output-dir>/adr/ADR-001.md`, `ADR-002.md`, etc.

Each ADR must contain exactly these sections: **Status**, **Context**, **Decision**,
**Consequences**. Optional: Supersedes, Superseded-by.

#### 4b — Tech Design (`phoenix:tech-lead`)

Delegate extraction summary + accepted decisions + STRIDE entries from 4d.
Agent writes `<output-dir>/tech-design.md` with exactly these ten sections:

1. Introduction (purpose, scope, context)
2. Business Architecture (objectives, stakeholders, capabilities)
3. Data Architecture (entities, data flows, classifications)
4. Application Architecture (components, interfaces, sequence views)
5. Technology Architecture (platforms, hosting, dependencies)
6. Quality Attributes (NFRs mapped to scenarios)
7. Architecture Decisions (links to ADR files)
8. Threat Model (STRIDE summary per component — from 4d)
9. Requirements Traceability Matrix (BRD requirement → component / ADR)
10. Sign-off (review block; not a gate)

Step 4b depends on 4d completing first so the Threat Model section is populated.

**Mermaid C4 embeds (always-on)**: In addition to the TOGAF prose, `phoenix:tech-lead`
must embed inline Mermaid C4 diagrams in `tech-design.md`. These render natively on
GitLab and most Markdown previewers without any toolchain. Embed:

- A **C4 Context diagram** (`graph TD` or `C4Context` block) in Section 4 (Application
  Architecture) or Section 5 (Technology Architecture), whichever is the more
  appropriate host section.
- A **C4 Container diagram** in the same or adjacent section.

These blocks are always produced — no flag required. Example skeleton:

````markdown
```mermaid
C4Context
  title System Context — <System Name>
  Person(user, "User", "Primary actor")
  System(sys, "<System Name>", "Core system")
  Rel(user, sys, "Uses")
```
````

````markdown
```mermaid
C4Container
  title Container View — <System Name>
  Container(api, "API Service", "Node.js", "Handles business logic")
  ContainerDb(db, "Database", "PostgreSQL", "Persists data")
  Rel(api, db, "Reads/writes")
```
````

#### 4c — Architecture Diagram (`phoenix:architecture-diagrammer`)

Delegate extraction summary + accepted decisions. Agent writes drawio XML directly
to `<output-dir>/architecture.drawio`. Required pages: C4 Context, C4 Container.
Component page is included when BRD scope warrants it. Four additional conditional
views (Sequence, Data Flow, Deployment, Threat Model) are produced when their
preconditions are met — see `architecture-diagrammer.md` v2.1.0. No drawio-desktop
invoked; no PNG export in the default path.

When `--publish-docx` is active for the current run (passed on the CLI or
accepted in the Step-3 interview, AND not halted by the Step-0 renderer probe
with `ERR_PUBLISH_DOCX_NO_RENDERER`), the orchestrator signals `--render-pngs`
to `phoenix:architecture-diagrammer` so it attempts PNG export as a best-effort
step. With `--allow-placeholder-diagrams` the Step-0 halt is skipped and the
signal is sent on a renderer-less environment too; in that case the diagrammer
silently degrades and `doc-publisher` inserts named placeholder captions per
`doc-publishing.md` Tier 3. See Step 4e for the inline probe that decides the
actual renderer tier used.

**Post-write XML lint (always-on)**:

After `architecture.drawio` is written by `phoenix:architecture-diagrammer`, the
orchestrator runs an inline XML lint step before any downstream step consumes the file:

```
python scripts/brd-to-design/drawio_lint.py <output-dir>/architecture.drawio
```

The lint script (`scripts/brd-to-design/drawio_lint.py`) asserts:
- (a) Well-formed XML — file parses without errors.
- (b) No `<UserObject>` element whose direct XML parent is `<mxCell>` — mxGraph schema violation that prevents drawio from opening the file. (check 7a)
- (b2) No `<mxCell>` element whose direct XML parent is another `<mxCell>` — edge-label cells must be siblings under `<root>`, not XML children of their edge cell. drawio Desktop drops these labels on first save; PNG renderers silently discard label text. (check 7b)
- (c) Every `<diagram>` page contains at least one vertex `<mxCell>` — detects silently empty pages.

On lint pass (exit 0): proceed to 4d / 4e as normal.

On lint failure (exit non-zero): re-delegate to `phoenix:architecture-diagrammer` with the
full lint JSON output and the relevant guidance from `drawio-conventions.md`:
- For `reason: "userobject_inside_mxcell"` (exit 2): pass `offending_cell_ids` and the "Alt-text and `UserObject` Usage" section.
- For `reason: "mxcell_inside_mxcell"` (exit 4): pass `offending_cell_ids` and the "Edge Label Flatness" section (check 7b) — every listed cell must be moved to be a direct child of `<root>` while retaining its `parent="<edge-id>"` attribute.
- For `reason: "empty_diagram_page"` (exit 3): pass `pages` and instruct the agent to re-emit content for the listed pages.

Re-lint after the redo attempt.

After 2 failed redo attempts, halt with a hard error:

```
ERR_DRAWIO_LINT_FAILED: architecture.drawio failed XML lint after 2 redo attempts
  lint result: <JSON from drawio_lint.py>
  action: inspect <output-dir>/architecture.drawio;
          for userobject_inside_mxcell: fix UserObject nesting (drawio-conventions.md check 7a)
          for mxcell_inside_mxcell: flatten nested mxCell elements to direct children of <root>
                                    (drawio-conventions.md check 7b, "Edge Label Flatness")
          for empty_diagram_page: re-emit content for the listed pages
```

#### 4d — STRIDE Threat Entries (`phoenix:threat-modeller`)

Delegate extraction summary. Agent provides STRIDE entries (Spoofing, Tampering,
Repudiation, Information Disclosure, Denial of Service, Elevation of Privilege) per
significant component. Output is section content delivered in-memory for 4b to merge.

#### 4e — Docx Publication (when `--publish-docx`) — `phoenix:doc-publisher`

Run only when `--publish-docx` is set (explicitly on command line or accepted in Step 3 interview).

**Inline tool probes (non-blocking)**:

1. **Pandoc probe**: attempt `pandoc --version` inline. If Pandoc ≥ 2.19 is available, record `converter: pandoc`.
2. **python-docx fallback probe**: if Pandoc is absent or below version, attempt `python -c "import docx"` inline. If python-docx is importable, record `converter: python-docx`.
3. **No converter**: if both probes fail, emit warning and skip docx generation:

```
WARN_PUBLISH_DOCX_SKIPPED: neither Pandoc nor python-docx is available
  tech-design.md and architecture.drawio are still produced
  action: install Pandoc (≥ 2.19) or python-docx to enable docx output
```

When a converter is available, delegate to `phoenix:doc-publisher` with:
- Input: `<output-dir>/tech-design.md`
- Reference docx: `--reference-docx <path>` if provided, else discovery chain (`.phoenix-os/project/templates/reference.docx` → no reference, plain style)
- Converter signal: `pandoc` or `python-docx`
- Output: `<output-dir>/tech-design.docx`

**Three-tier renderer probe (non-blocking)**:

After the converter probe and before invoking doc-publisher, probe for available
drawio renderers using the three-tier chain. Record the result as an in-memory
renderer signal — no file is written.

**Tier 1 — drawio-desktop**:

```
drawio --version
```

- Exit 0: drawio-desktop is available. Signal `--render-pngs` to `phoenix:architecture-diagrammer` (if not already signalled in 4c) with renderer hint `drawio-desktop`. Wait for PNGs in `<output-dir>/diagrams/`. doc-publisher embeds available PNGs.
- Non-zero / not found: proceed to Tier 2.

**Tier 2 — Puppeteer**:

```
node -e "require('puppeteer')"
```

- Exit 0 (and Tier 1 failed): Puppeteer is available. Signal `--render-pngs` to `phoenix:architecture-diagrammer` with renderer hint `puppeteer`. The Puppeteer renderer is invoked as:
  ```
  node scripts/brd-to-design/render-drawio.js <drawio-file> <output-dir>
  ```
  Either the diagrammer or doc-publisher invokes it; both are valid invocation sites. Wait for PNGs in `<output-dir>/diagrams/`. doc-publisher embeds available PNGs.
- Non-zero / not found: proceed to Tier 3.

**Tier 3 — No renderer (degraded mode)**:

Neither drawio-desktop nor Puppeteer is available. Do NOT signal `--render-pngs`.
Emit an advisory warning and continue:

```
WARN_DRAWIO_RENDERER_MISSING: no drawio renderer available; named placeholder captions inserted
  action: install drawio-desktop or Puppeteer (npm install puppeteer) to enable embedded diagram images
```

doc-publisher reads `<output-dir>/architecture.drawio`, enumerates all `<diagram>` pages,
and inserts one named placeholder caption per page at the resolved TOGAF section anchor.
Placeholder format: `[Diagram: <view-name>] — see architecture.drawio page <N>`

**Renderer-present, export-fails path (Branch B)**:

If the renderer binary is present but PNG export fails (renderer exits non-zero for any page after the drawio XML lint has already passed), this indicates a renderer-side error unrelated to XML validity. Halt with a hard error:

```
ERR_DRAWIO_RENDER_FAILED: drawio renderer present but PNG export failed after lint-clean write
  renderer exit: <exit-code and stderr>
  action: re-run drawio export manually; check display/headless environment; inspect <output-dir>/architecture.drawio
```

This hard error distinguishes a genuine export failure from a tool-availability gap. When lint passed and the renderer is present, a failed export is not advisory — it halts the pipeline so the failure is visible rather than silently degraded.

#### 4f — Mirror to Docs (when `--mirror-to-docs`)

Run only when `--mirror-to-docs` is set. After all primary artifacts are written to
`<output-dir>`, copy the following to `<consumer-project>/docs/design/`:

- `adr/` (full directory tree)
- `tech-design.md`
- `architecture.drawio`
- `tech-design.docx` (if produced in 4e)

Mirror is a copy, not a move. The primary artifacts in `<output-dir>` are unaffected.

If the mirror copy fails (e.g., target path not writable), emit warning and continue — mirror failure does not halt the recipe:

```
WARN_MIRROR_FAILED: could not copy artifacts to docs/design/
  action: check write permissions on <consumer-project>/docs/design/
```

---

### Step 5 — Closing Summary

Print to terminal:

```
Artifacts written to <output-dir>:
  <output-dir>/adr/ADR-001.md  [... ADR-NNN.md]
  <output-dir>/tech-design.md
  <output-dir>/architecture.drawio
  [<output-dir>/tech-design.docx]   (if produced)

Output directory source: <explicit | issue-number | brd-slug>

[Mirror copy written to docs/design/]   (if --mirror-to-docs was set)

Decisions: <one-line summary of key choices made in the interview>
```

---

## Re-run / Idempotency

If `<output-dir>` already contains any of `adr/`, `tech-design.md`, or
`architecture.drawio`, the recipe prompts:

```
NOTICE: <output-dir> already contains recipe artifacts.
  Options:
    [overwrite]   — replace existing artifacts
    [new-run]     — write to <output-dir>/<UTC-timestamp>/ instead
    [abort]       — halt; no writes
Your choice:
```

- `--force-overwrite` skips the prompt and overwrites.
- `--non-interactive` without `--force-overwrite` halts:

```
ERR_OUTPUT_DIR_EXISTS: <output-dir> already contains recipe artifacts
action: pass --force-overwrite to overwrite, or choose a different --output-dir
```

ADR numbering resets on overwrite (ADR-001, ADR-002, …). The recipe is stateless
across runs; use `new-run` to preserve prior ADR identities.

---

## Standards

| Standard | Role |
|---|---|
| TOGAF ADM | Defines `tech-design.md` content (BDAT viewpoints) |
| C4 Model | Defines diagram views (Context / Container / Component / Sequence / Data Flow / Deployment / Threat Model) |
| Michael-Nygard ADR | One ADR per significant decision (Status, Context, Decision, Consequences) |
| ISO 42010 | Stakeholder concerns captured in Business Architecture section |
| STRIDE | Threat entries captured in Threat Model section |
| Mermaid C4 | Inline C4 Context and Container diagrams in `tech-design.md` |

---

## What Is Not Required

The following are removed and must not be referenced or re-introduced as **mandatory** pipeline stages:

- Stage 0 pre-flight probes (owners.json, git version, team-skills.md) — these remain prohibited unconditionally
- STM directory and hard-coded `447/` paths — prohibited unconditionally
- Typed IR files (requirements-ir.json, scenarios-ir.json, stakeholders-ir.json, tech-stack-ir.json, components-ir.json, interfaces-ir.json, adrs-ir.json, threats-ir.json) and their JSON Schemas — prohibited unconditionally
- Quality gates, repair loop, and `phoenix:validation-keeper` coordinator — prohibited unconditionally
- Formal HIL gates (Stage 5 close, Stage 6 close, Stage 7 close, Stage 11 ARB) — prohibited unconditionally
- Python helper scripts (`pii_redact.py`, `validate-ir.js`, `drawio_probe.py`, `gates/run_all.py`) — prohibited unconditionally
- Pandoc or python-docx as **mandatory pre-flight dependencies** — they remain opt-in when `--publish-docx` is passed
- drawio-desktop binary as a **mandatory pre-flight dependency** — PNG export remains opt-in when `--publish-docx` is passed; the default path writes drawio XML only
- `phoenix:doc-publisher` as a **mandatory pipeline stage** — it remains an opt-in Step 4e participant when `--publish-docx` is passed

**Cold-start guarantee**: with no flags, no Pandoc, no Python, no drawio-desktop installed, the recipe must still produce `adr/ADR-NNN.md`, `tech-design.md` (with inline Mermaid), and `architecture.drawio` (Context + Container minimum), and exit 0.

---
**Version**: 1.0.0
**Last Updated**: 2026-05-26
**Status**: Active
**Changes**: Initial recipe; subsequent fixes via #531, #537, #538, #543, #544, #545, #546, #550. Internal cleanup (this commit) removed vestigial IR/gates artifacts to match the recipe's "What Is Not Required" prohibitions.
