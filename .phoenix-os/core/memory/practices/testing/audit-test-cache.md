---
title: Audit-Test Runtime Cache
version: 1.0
status: Active
---

# Audit-Test Runtime Cache

Spec for the runtime cache used by `test-planner` (Step -1) to skip repeated stack detection,
exclusion resolution, and preflight checks when the project environment has not changed.

## Cache Location

`.phoenix-os/cache/audit-test/`

- Gitignored by the root `.phoenix-os/` rule — never committed.
- Created at runtime by `test-planner` after a successful fresh scan.
- Safe to delete at any time — next run will rebuild from scratch.

## Cache Files

| File | Key inputs | Contents | When written |
|------|-----------|----------|-------------|
| `stack-{hash}.json` | Manifest file content (+ lockfile if present) | `stackDescriptor` (Step 2.6.1) + `exclusionResolution` added in Step 2.8.1 | Step 2.6.1 (initial write); Step 2.8.1 (update with exclusionResolution) |

## Hash Computation

The cache key is a SHA-256 hex digest computed from the content of the detected manifest file.
Use manifest content (not filename or branch name) so the same content on any branch reuses the cache.

### macOS / Linux

```bash
sha256sum package.json | awk '{print $1}'
# alternative
shasum -a 256 package.json | awk '{print $1}'
```

### Windows PowerShell

```powershell
(Get-FileHash 'package.json' -Algorithm SHA256).Hash.ToLower()
```

### Per-Stack Manifest Files

| Stack | Primary manifest to hash | Include lockfile? |
|-------|--------------------------|-------------------|
| nodejs | `package.json` | Yes — `package-lock.json` or `yarn.lock` or `pnpm-lock.yaml` (first found) |
| python | First found: `pyproject.toml` → `setup.py` → `setup.cfg` | Yes — `Pipfile.lock` or `poetry.lock` (first found, if present) |
| java | First found: `pom.xml` → `build.gradle` → `build.gradle.kts` | No lockfile convention |
| go | `go.mod` | Yes — `go.sum` (if present) |
| dotnet | First `*.csproj` found at root, else first `*.sln` | No lockfile convention |

### Multi-file hash example (nodejs)

```bash
cat package.json package-lock.json | sha256sum | awk '{print $1}'
```

If the lockfile does not exist, hash manifest only. Do not error on missing lockfile.

## Cache Schema

`stack-{hash}.json`:

```json
{
  "schemaVersion": "1.0",
  "manifestPath": "package.json",
  "manifestHash": "a3f9c2d18e4b7f60a1c52d9e3b8f01a4d27c5e9f1b0a3d6e8f2c4b7a9d1e3f5",
  "cachedAt": "2026-05-20T10:00:00Z",
  "stackDescriptor": {
    "schemaVersion": "1.0",
    "stackName": "nodejs",
    "runtime": "node",
    "testFramework": "jest",
    "mockingFramework": "jest",
    "coverageTool": "jest --coverage"
  },
  "exclusionResolution": {
    "stackName": "nodejs",
    "L1_stackDefaults": ["*.test.{ts,tsx,js,jsx}", "*.spec.{ts,tsx,js,jsx}", "__tests__/**"],
    "L2_heuristics": [],
    "L3_configImport": [],
    "L4_userOverrides": [],
    "resolved": ["*.test.{ts,tsx,js,jsx}", "*.spec.{ts,tsx,js,jsx}", "__tests__/**"]
  }
}
```

### Validation rules (on cache read)

- `schemaVersion` must equal `"1.0"`
- `stackDescriptor` must have all 6 required fields: `schemaVersion`, `stackName`, `runtime`, `testFramework`, `mockingFramework`, `coverageTool`
- `exclusionResolution.resolved` must be an array (may be empty)
- Any field missing or wrong type → treat as schema mismatch → fall through to fresh detection

## What Is Cached vs Not Cached

| Data | Cached? | Reason |
|------|---------|--------|
| `stackDescriptor` (6 fields) | ✅ Yes | Stable — determined by manifest content only |
| `exclusionResolution` (L1 + L2 + L3 merged) | ✅ Yes | Stable for unchanged manifest + source files |
| L4 user overrides | ❌ No | Per-invocation — user supplies these each run |
| Preflight check results | ❌ No | Runtime env may change (tool installed/removed) |
| `projectPatterns` | ❌ No | Persisted separately in committed patterns file |
| Coverage data | ❌ No | Changes as tests are added — must always re-collect |
| Test plan (`test-plan.json`) | ❌ No | Per-invocation STM output |
| `address-results.json` | ❌ No | Per-invocation STM output |

## Cache Invalidation

Auto-invalidation: manifest content change → different hash → automatic cache miss → fresh detection.
No manual invalidation needed for normal workflows.

| Scenario | Cache behavior |
|----------|---------------|
| New package added to `package.json` | New hash → miss → fresh detection → new cache written |
| Branch switch, same `package.json` content | Same hash → HIT (correct — stack unchanged) |
| Branch switch, different `package.json` | Different hash → miss → fresh detection |
| Global tool version change (e.g., `node --version`) | Same manifest hash → HIT (may be stale for env checks) → use `--no-cache` to force refresh |
| `--no-cache` flag passed | Cache bypassed this run; fresh scan runs; cache written after |
| `.phoenix-os/cache/` directory deleted | All misses → rebuilds naturally on next run |

## Edge Cases

### Cache Corruption
If `stack-{hash}.json` cannot be parsed as valid JSON (truncated write, disk error):
1. Log: `"Warning: cache file corrupt — falling through to full detection"`
2. Delete the corrupt file (prevent repeated corrupt-read loop)
3. Proceed with full stack detection (Steps 0–3)
4. Write a fresh cache after detection completes

### Concurrent Invocations
If two invocations run simultaneously and both miss:
- Both perform full detection independently
- Both write `stack-{hash}.json`
- Last write wins — output is deterministic for the same manifest, so content is identical
- No locking required; no data loss

### No Manifest Found at Root
- Skip cache check entirely (cannot compute hash without a manifest)
- Proceed to Step 0 — Step 2.5 handles the "no manifest found" error as before

### Cache Hit but Stack Mismatch
Not possible by design — the cache key is derived from the manifest that determines the stack.
A manifest change always produces a different hash → cache miss → fresh detection.

### `--no-cache` behavior
- Cache is NOT read (bypass)
- Fresh detection runs (Steps 0–3)
- Cache IS written after fresh detection (so next run benefits)
- Use when env changed in a way not captured by manifest hash (e.g., global jest version bump)

## Agent Integration

| Agent step | Cache interaction |
|-----------|------------------|
| test-planner Step -1 | Read cache; HIT → inject stackDescriptor + exclusionResolution, skip Steps 1–3 |
| test-planner Step 2.6.1 | Write initial cache (stackDescriptor only, MISS path) |
| test-planner Step 2.8.1 | Update cache (add exclusionResolution, MISS path) |
| test-addresser | No cache interaction — reads projectPatterns from committed patterns file (Tier 0) |
| test-rechecker | No cache interaction |
