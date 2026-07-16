# Test Fixtures — Issue #24 ("Create a New Lead")

Required seed state and test-only credentials for the Playwright suite in `.phoenix-os/project/specs/24/tests/`. Nothing here is production data.

## Required seed state before running these tests

The test-environment database must be seeded with the following **before** any spec in this suite runs. These match the fixtures in this directory 1:1.

1. **`lead_sources`** — see `lead-sources.json`. Four active rows (`Walk-in`, `Referral`, `Call`, `Online`) plus one inactive row (`Discontinued`) to exercise the "active only" read contract.
2. **`vehicle_models`** — see `vehicle-models.json`. Three rows for dropdown-population and referential-validation tests.
3. **`users`** / **`locations`** / **`dealer_groups`** — see `test-users.json`. Four test accounts:
   - `dseA`, `dseB` — same `location_id` (`11111111-0000-0000-0000-000000000001`), different owners. Used to prove **owner-scoped** isolation (a DSE sees only their own leads even when a peer shares their location).
   - `dseC` — a different `location_id` (`22222222-0000-0000-0000-000000000002`). Used to prove **tenant-scoped** isolation across locations.
   - `noCapabilityUser` — authenticated, but without the `create-lead` capability. Used to prove RBAC denies (`403`), as distinct from unauthenticated (`401`).
4. No pre-existing `leads` rows are required — each spec creates its own leads and does not depend on other specs' leads existing (test independence). Cross-location/cross-owner leads created by one spec must not leak into another spec's assertions; if the test DB is not reset between spec files, prefer tagging created leads' `customerName` with a unique per-test prefix (already done in `helpers/test-data.ts`) rather than relying on row counts.

## Test-only credentials

All passwords below are **test-only** and must never be reused for any non-ephemeral environment.

| Key | Email | Password | Location | Capabilities |
|---|---|---|---|---|
| `dseA` | dse.loc1.a@issue24.test | `Issue24!TestA1` | Location 1 | create-lead |
| `dseB` | dse.loc1.b@issue24.test | `Issue24!TestB1` | Location 1 | create-lead |
| `dseC` | dse.loc2.c@issue24.test | `Issue24!TestC1` | Location 2 | create-lead |
| `noCapabilityUser` | readonly.loc1@issue24.test | `Issue24!TestRO1` | Location 1 | (none) |

## Assumptions the fixtures/helpers depend on (confirm with implementer)

- **Login endpoint**: `helpers/auth.ts` assumes `POST /api/v1/auth/login` accepting `{ email, password }` and setting a session cookie on success (per ADR-004's cookie-based session). This is not specified in the frozen tech-design (which starts from an already-authenticated `Principal`). If the actual bootstrap auth contract differs, only `helpers/auth.ts` needs to change — no other test file references the login mechanics directly.
- **Seed loading mechanism**: These fixtures are plain JSON describing *what* must exist, not *how* it gets there (no direct Postgres access from Playwright). The backend/CI setup is expected to load this seed data into the test database (e.g. via a `db:seed:test` script or a Jest/Supertest `beforeAll` in the backend integration suite) before `npx playwright test` runs against a running server. This E2E suite does not perform seeding itself.
- **IDs**: `locationId`/`dealerGroupId` UUID-shaped placeholders and integer `sourceId`/`modelId` placeholders are illustrative. If the implementation's actual seed script assigns different IDs, update `test-users.json` / `lead-sources.json` / `vehicle-models.json` to match — the specs read from these files, not hardcoded literals, wherever practical.
