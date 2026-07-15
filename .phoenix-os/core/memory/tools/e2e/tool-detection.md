# E2E Tool Detection

This document defines how to detect the project framework/runtime and select the appropriate E2E testing tool. It replaces the assumption that all projects use Playwright.

## Detection Algorithm

Run the following checks in order. The first match wins.

### Step 1 — Inspect Project Root Files

```bash
# Check for Node.js / JavaScript project
test -f package.json && echo "node-project"

# Check for Python project
test -f requirements.txt && echo "python-project" || \
test -f pyproject.toml && echo "python-project" || \
test -f setup.py && echo "python-project"

# Check for Go project
test -f go.mod && echo "go-project"
```

### Step 2 — Read package.json Dependencies (Node projects only)

If `jq` is not available, use the Node fallback shown in the comments.

```bash
# Detect Next.js
# jq: cat package.json | jq '.dependencies.next // .devDependencies.next // empty'
node -e "const p=require('./package.json'); console.log(p.dependencies?.next ?? p.devDependencies?.next ?? '')"

# Detect Vite + React
# jq: cat package.json | jq '.dependencies.vite // .devDependencies.vite // empty'
node -e "const p=require('./package.json'); console.log(p.dependencies?.vite ?? p.devDependencies?.vite ?? '')"
node -e "const p=require('./package.json'); console.log(p.dependencies?.react ?? p.devDependencies?.react ?? '')"

# Detect pure API frameworks (no front-end)
# jq: cat package.json | jq '(.dependencies + .devDependencies) | with_entries(select(.key | test("^(express|fastify|koa|hapi|@nestjs/core)$"))) | keys[]' 2>/dev/null
node -e "
  const p=require('./package.json');
  const all={...p.dependencies,...p.devDependencies};
  const api=['express','fastify','koa','hapi','@nestjs/core'];
  console.log(api.filter(k=>all[k]).join(','));
"
```

### Step 3 — Supplementary Signal from tech-design.md

If the project root inspection is ambiguous, read `tech-design.md` for an explicit `## Tech Stack` section. Treat any stack declaration there as a confirmation signal, not a primary source.

---

## Framework-to-E2E-Tool Mapping

| Detected Framework / Runtime | Recommended E2E Tool | Install Command | Test File Pattern |
|------------------------------|----------------------|-----------------|-------------------|
| Next.js | Playwright | `npm init playwright@latest` | `*.spec.ts` |
| React + Vite | Playwright | `npm init playwright@latest` | `*.spec.ts` |
| Express / Fastify / Koa / NestJS (API only, no front-end) | Supertest | `npm install --save-dev supertest @types/supertest` | `*.test.ts` |
| Python service | pytest + requests | `pip install pytest requests` | `test_*.py` |
| Go service | net/http/httptest + testify | `go get github.com/stretchr/testify` | `*_test.go` |

**"API only, no front-end"** means `package.json` does not contain `react`, `vue`, `angular`, `svelte`, or `next` in its dependency tree.

**NestJS hybrid note**: NestJS is sometimes used alongside a front-end framework (e.g. NestJS + Next.js, NestJS + Angular). If `react`, `next`, `vue`, or `angular` are also present in `package.json`, treat the project as front-end and recommend Playwright. Pure `@nestjs/core` without a front-end dependency → Supertest.

---

## Detection Output

After running the algorithm, produce a detection result with the following fields:

```yaml
detected_framework: "Next.js"           # Human-readable framework name
e2e_tool: "playwright"                  # Internal tool identifier
install_command: "npm init playwright@latest"
test_file_pattern: "*.spec.ts"
confidence: "high"                      # high | medium | low
signals:
  - "package.json contains 'next' in dependencies"
```

Set `confidence: "low"` when the primary detection signals are absent and the result comes only from `tech-design.md`.

---

## Human-in-the-Loop Approval

After detection, present the result to the user before proceeding:

> "Detected framework: **{detected_framework}**. Recommended E2E tool: **{e2e_tool}**. Install command: `{install_command}`. How would you like to proceed?"
>
> - **Approve** — install and use the recommended tool
> - **Edit** — specify an alternative tool or install command
> - **Decline** — stop the workflow without generating tests

### On Approve

Run the install command automatically, then verify installation:

```bash
# Playwright
npx playwright --version

# Supertest
node -e "require('supertest')" && echo "supertest ok"

# pytest
python -m pytest --version

# Go testify (build check)
go build ./...
```

### On Edit

Accept the user-provided alternative. Re-confirm the edited tool before installing:

> "You have chosen: **{user_tool}** with install command: `{user_command}`. Confirm? (Yes / No)"

### On Decline

Stop cleanly. Do not install anything. Summarize what was detected and inform the user they can re-run `/impl:eval` after updating `tech-design.md` if needed.

---

## Tool-Specific Configuration Patterns

### Playwright (Next.js / React + Vite)

Configuration file: `playwright.config.ts`

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
```

### Supertest (Express / Fastify / Koa / NestJS API-only)

No separate config file needed. Tests import the app directly:

```typescript
// example.test.ts
import request from 'supertest';
import app from '../src/app';

describe('GET /health', () => {
  it('returns 200', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
  });
});
```

### pytest + requests (Python service)

Configuration file: `pytest.ini` or `pyproject.toml`

```ini
# pytest.ini
[pytest]
testpaths = tests
python_files = test_*.py
python_functions = test_*
```

```python
# tests/test_health.py
import requests

BASE_URL = "http://localhost:8000"

def test_health():
    res = requests.get(f"{BASE_URL}/health")
    assert res.status_code == 200
```

### net/http/httptest + testify (Go service)

No separate config file. Standard Go test conventions apply:

```go
// handler_test.go
package main

import (
    "net/http"
    "net/http/httptest"
    "testing"

    "github.com/stretchr/testify/assert"
)

func TestHealthHandler(t *testing.T) {
    req := httptest.NewRequest(http.MethodGet, "/health", nil)
    w := httptest.NewRecorder()
    HealthHandler(w, req)
    assert.Equal(t, http.StatusOK, w.Code)
}
```

---

## Error Scenarios

### Framework Cannot Be Detected

- **What**: No known marker files found and `tech-design.md` does not declare a tech stack
- **Why**: Project may be non-standard or newly scaffolded without dependencies installed
- **Fix**: Prompt user to select framework manually from the supported list above
- **Alternative**: Ask user to add a `## Tech Stack` section to `tech-design.md` and re-run detection
- **Impact**: Cannot select E2E tool; Phase 5 is blocked until framework is resolved

### Install Command Fails

- **What**: Auto-install of the approved E2E tool returns a non-zero exit code
- **Why**: Network issue, permission problem, or incompatible Node/Python/Go version
- **Fix**: Display the install command for the user to run manually in their environment
- **Alternative**: User may select a pre-installed tool via the Edit option
- **Impact**: Phase 5 is blocked until the tool is available

### Ambiguous Framework (Multiple Signals)

- **What**: Both front-end (React, Next.js, Vue, Angular) and API (Express, NestJS) dependencies detected in the same `package.json`
- **Why**: Monorepo or full-stack app where both exist in a single package
- **Fix**: If front-end framework keys (`react`, `next`, `vue`, `angular`, `svelte`) are present, prefer Playwright — front-end presence implies browser testing need. Set `confidence: "medium"` and present the reasoning at the approval prompt so the user can override via Edit.
- **Alternative**: User may override via Edit at the approval prompt
- **Impact**: Minor — resolved through human approval step

---

**Version**: 1.1.0
**Last Updated**: 2026-05-04
**Status**: Active
**Changes**: Moved from playwright/ to e2e/ directory; replaced ls with test -f for portable file detection; added Node fallback for jq-based dependency reads; added NestJS hybrid note to mapping table; tightened ambiguous framework fix to be front-end-key-driven rather than blanket Playwright preference
