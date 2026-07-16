# Test Fixtures — Issue #25 ("Convert a Lead into an Enquiry")

Required seed state and test-only credentials for the Playwright suite in
`.phoenix-os/project/specs/25/tests/`. Nothing here is production data.

## Reuse of issue #24's fixtures (no duplication)

This Story converts an existing Lead into an Enquiry, so it reuses #24's
established DSE principals, login mechanism, and Lead-creation payload
builder verbatim rather than re-declaring them:

- **`../../24/tests/fixtures/test-users.json`** — the same four test
  accounts (`dseA`, `dseB`, `dseC`, `noCapabilityUser`). Per
  `tech-design.md`'s resolved clarification ("`convert-lead` capability is
  provisioned by additively editing the #24 `test-users.json` fixture"),
  this file was edited **additively**:
  - `dseA`, `dseB`, `dseC` now carry `["create-lead", "convert-lead"]`
    (previously `["create-lead"]` only).
  - `noCapabilityUser` is **unchanged** (`capabilities: []`) — it continues
    to prove RBAC deny-by-default, now for both `create-lead` (#24) and
    `convert-lead` (#25, `EVAL-CC-07`).
  - No user was added, removed, or renamed; only the `capabilities` arrays
    of the three DSE accounts were extended, plus an additive note in
    `_comment`.
- **`../../24/tests/fixtures/lead-sources.json`** / **`vehicle-models.json`**
  — reused indirectly via `helpers/test-data.ts`'s re-export of #24's
  `validCreateLeadPayload`, which this Story's tests call to seed a fresh
  open Lead before converting it.
- **`../../24/tests/helpers/auth.ts`** — `loginApiContext` /
  `loginBrowserContext` are re-exported unchanged from `helpers/test-data.ts`
  in this directory's parent; the login contract (`POST
  /api/v1/auth/login`, cookie session) is identical for both Stories.

See `../../24/tests/fixtures/README.md` for the full seed-state
requirements those reused fixtures assume (must already be seeded in the
test environment for #24's suite to pass, which this Story's suite also
depends on transitively).

## New fixture data for this Story

No new **static** JSON fixture file was needed. Unlike #24 (which needed
seeded reference master data — lead sources, vehicle models), #25's only
new "seed" requirement is a **Lead to convert**, and Leads are created
dynamically:

- **Open Lead to convert**: each spec calls `helpers/test-data.ts`'s
  `createOpenLead(context)`, which does `POST /api/v1/leads` (reusing
  #24's `validCreateLeadPayload`) and returns the created Lead (incl.
  `leadId`). This keeps every conversion test independent — no test
  depends on another test's or another spec's Lead rows, mirroring #24's
  test-independence convention (`../../24/tests/fixtures/README.md`).
- **Already-"Converted" Lead fixture (for the `409` re-conversion test and
  the `AC5` queue-exclusion assertion)**: also created dynamically, not as
  a static fixture — a spec creates an open Lead, converts it once
  (expected `201`), and then either (a) attempts to convert the same
  `leadId` again (expected `409`), or (b) re-fetches the owner queue and
  asserts the now-`Converted` Lead is absent. This is deliberate: a
  pre-baked "already converted" row in a static fixture would require the
  conversion endpoint to already exist and succeed once anyway (chicken-
  and-egg for a Red-phase suite), so the spec performs that first
  conversion itself as test setup.
- **`ConvertLeadDto` payload builders** — `helpers/test-data.ts` adds
  `validConvertLeadPayload()`, `invalidBudgetCases` (zero, negative,
  non-integer, non-numeric string), `invalidVariantCases` (empty string),
  and `qualifyingFields` (the 4 field names, for generic missing-field
  loop tests). These are payload shapes only, not seed data, and live in
  the helper module rather than a JSON fixture since they are exercised
  programmatically (loops over cases), not read as static rows.

## Test-only credentials (reused from #24, capabilities extended)

All passwords below are **test-only** and must never be reused for any
non-ephemeral environment. Unchanged from #24 except the `Capabilities`
column, which now includes `convert-lead` for the three DSE accounts.

| Key | Email | Password | Location | Capabilities |
|---|---|---|---|---|
| `dseA` | dse.loc1.a@issue24.test | `Issue24!TestA1` | Location 1 | create-lead, convert-lead |
| `dseB` | dse.loc1.b@issue24.test | `Issue24!TestB1` | Location 1 | create-lead, convert-lead |
| `dseC` | dse.loc2.c@issue24.test | `Issue24!TestC1` | Location 2 | create-lead, convert-lead |
| `noCapabilityUser` | readonly.loc1@issue24.test | `Issue24!TestRO1` | Location 1 | (none) |

## Assumptions carried into test design (confirm with implementer)

- **Convert route**: `POST /api/v1/leads/{leadId}/convert`, per
  tech-design.md (resolved — route stays on the Leads path even though the
  handler lives in the new Enquiry module).
- **Landing/queue page**: the "Convert to Enquiry" action is asserted on
  the same DSE landing route (`/`) that hosts the owner-scoped Lead queue
  from #24 (`tests/feature-toggle.spec.ts`'s `dse-landing-entry-point.png`
  precedent) — tech-design.md describes an "Actions" column added to
  `LeadQueue.tsx` without naming a distinct route (resolved: "no new
  route").
- **Feature-flag mechanism**: env var `CONVERT_LEAD_ENABLED`, read
  server-side and reflected in `GET /api/v1/config`'s `convertLeadEnabled`
  field, mirroring #24's `NEW_LEAD_ENABLED` / `newLeadEnabled` pattern
  exactly (tech-design.md Component 4).
- **OpenAPI JSON path**: `GET /api-json` (same `@nestjs/swagger` default
  assumption as #24's `openapi-contract.spec.ts`).

If the implementer's actual values differ, only `tests/helpers/*.ts` (this
Story's or #24's) need updating — not the eval criteria.
