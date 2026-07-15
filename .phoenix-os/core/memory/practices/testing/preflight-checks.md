# Testing Pre-flight Checks

This document defines pre-flight validation for unit testing operations in Phoenix OS. It is a **stack-indexed validation matrix**: the test-planner agent (Step 3.1) navigates to the H2 section whose heading matches `stackDescriptor.stackName` and executes every check defined there before proceeding.

## Navigation Contract

- Section headings MUST match the `stackDescriptor.stackName` values produced by `stack-detection.md` exactly (lowercase, no spaces).
- Supported values: `nodejs`, `python`, `java`, `go`, `dotnet`.
- Each check defines: **severity**, **validation command**, **error message**, and **recovery action**.
- Severity semantics:
  - **MUST** — hard halt; do not proceed until resolved.
  - **SHOULD** — warning; log and continue; flag for developer attention.
  - **MAY** — informational; log only.

---

## nodejs

Node.js / npm / Jest stack pre-flight checks.

### Check 1 — Runtime Installed

| Field | Value |
|---|---|
| Severity | MUST |
| Category | Runtime installed |
| Validation | `node --version` |
| Error | "Node.js runtime not found. Install Node.js 18 LTS or later." |
| Recovery | Install from https://nodejs.org or via `nvm install --lts` |

```bash
if command -v node &>/dev/null; then
  echo "PASS node $(node --version)"
else
  echo "FAIL [MUST] Node.js not found -- install Node.js 18 LTS"
  exit 1
fi
```

### Check 2 — Package Manager Present

| Field | Value |
|---|---|
| Severity | MUST |
| Category | Package manager present |
| Validation | `npm --version` |
| Error | "npm not found. It ships with Node.js — reinstall Node.js." |
| Recovery | Reinstall Node.js from https://nodejs.org |

```bash
if command -v npm &>/dev/null; then
  echo "PASS npm $(npm --version)"
else
  echo "FAIL [MUST] npm not found -- reinstall Node.js"
  exit 1
fi
```

### Check 3 — Dependencies Resolved

| Field | Value |
|---|---|
| Severity | MUST |
| Category | Dependencies resolved |
| Validation | `test -d node_modules` |
| Error | "node_modules directory not found. Dependencies are not installed." |
| Recovery | `npm install` |

```bash
if [ -f package.json ]; then
  echo "PASS package.json exists"
else
  echo "FAIL [MUST] package.json not found"
  exit 1
fi

if [ -d node_modules ]; then
  echo "PASS node_modules exists"
else
  echo "FAIL [MUST] Dependencies not installed -- run: npm install"
  exit 1
fi
```

### Check 4 — Test Framework Available

| Field | Value |
|---|---|
| Severity | MUST |
| Category | Test framework available |
| Validation | `npm list jest` |
| Error | "Jest not found in project dependencies." |
| Recovery | `npm install --save-dev jest @types/jest ts-jest` |

```bash
if npm list jest &>/dev/null 2>&1; then
  echo "PASS Jest installed"
else
  echo "FAIL [MUST] Jest not found -- run: npm install --save-dev jest @types/jest ts-jest"
  exit 1
fi
```

### Check 5 — Test Configuration Present

| Field | Value |
|---|---|
| Severity | SHOULD |
| Category | Test configuration present |
| Validation | Check for `jest.config.ts`, `jest.config.js`, `jest.config.json`, or `jest` key in `package.json` |
| Error | "No Jest configuration found. Jest will use defaults which may not match project conventions." |
| Recovery | Run `npx jest --init` to generate a configuration file |

```bash
if [ -f jest.config.ts ] || [ -f jest.config.js ] || [ -f jest.config.json ]; then
  echo "PASS Jest config file found"
elif node -e "require('./package.json').jest" &>/dev/null 2>&1; then
  echo "PASS Jest configured in package.json"
else
  echo "WARN [SHOULD] No Jest configuration found -- run: npx jest --init"
fi
```

### Check 6 — Coverage Tool Available

| Field | Value |
|---|---|
| Severity | SHOULD |
| Category | Coverage tool available |
| Validation | `npm list @jest/coverage-provider` or verify `--coverage` flag support |
| Error | "Coverage reporters (json-summary, text, lcov) not configured in Jest config." |
| Recovery | Add `coverageReporters: ['json-summary', 'text', 'lcov']` to Jest config |

```bash
JEST_CONFIG=$(npx jest --showConfig 2>/dev/null)
if echo "$JEST_CONFIG" | grep -q "json-summary"; then
  echo "PASS json-summary coverage reporter configured"
else
  echo "WARN [SHOULD] json-summary reporter not configured -- add to Jest coverageReporters"
fi
if echo "$JEST_CONFIG" | grep -q "lcov"; then
  echo "PASS lcov coverage reporter configured"
else
  echo "WARN [SHOULD] lcov reporter not configured"
fi
```

### Check 7 — Mocking Framework Installed

| Field | Value |
|---|---|
| Severity | SHOULD |
| Category | Mocking framework installed |
| Validation | `npm list @testing-library/react` |
| Error | "@testing-library/react not found. Component tests may not be possible." |
| Recovery | `npm install --save-dev @testing-library/react @testing-library/jest-dom @testing-library/user-event` |

```bash
if npm list @testing-library/react &>/dev/null 2>&1; then
  echo "PASS @testing-library/react installed"
else
  echo "WARN [SHOULD] @testing-library/react not found -- run: npm install --save-dev @testing-library/react @testing-library/jest-dom @testing-library/user-event"
fi
```

### nodejs Full Pre-flight Script

```bash
#!/bin/bash
# Node.js / Jest pre-flight checks
echo "=== Node.js Pre-flight Checks ==="
FAILURES=0

# 1. Runtime
command -v node &>/dev/null && echo "PASS node $(node --version)" || { echo "FAIL [MUST] Node.js not found"; ((FAILURES++)); }

# 2. Package manager
command -v npm &>/dev/null && echo "PASS npm $(npm --version)" || { echo "FAIL [MUST] npm not found"; ((FAILURES++)); }

# 3. Dependencies
[ -f package.json ] && echo "PASS package.json exists" || { echo "FAIL [MUST] package.json not found"; ((FAILURES++)); }
[ -d node_modules ] && echo "PASS node_modules exists" || { echo "FAIL [MUST] node_modules missing -- run: npm install"; ((FAILURES++)); }

# 4. Test framework
npm list jest &>/dev/null 2>&1 && echo "PASS Jest installed" || { echo "FAIL [MUST] Jest not found -- run: npm install --save-dev jest"; ((FAILURES++)); }

# 5. Test configuration
if [ -f jest.config.ts ] || [ -f jest.config.js ] || [ -f jest.config.json ]; then
  echo "PASS Jest config file found"
else
  echo "WARN [SHOULD] No Jest configuration found"
fi

# 6. Coverage tool
JEST_CFG=$(npx jest --showConfig 2>/dev/null)
echo "$JEST_CFG" | grep -q "json-summary" && echo "PASS json-summary reporter" || echo "WARN [SHOULD] json-summary reporter missing"

# 7. Mocking framework
npm list @testing-library/react &>/dev/null 2>&1 && echo "PASS @testing-library/react" || echo "WARN [SHOULD] @testing-library/react not found"

echo "=== Summary: $FAILURES critical failure(s) ==="
[ $FAILURES -eq 0 ] || exit 1
```

---

## python

Python / pip / pytest stack pre-flight checks.

### Check 1 — Runtime Installed

| Field | Value |
|---|---|
| Severity | MUST |
| Category | Runtime installed |
| Validation | `python --version` or `python3 --version` |
| Error | "Python runtime not found. Install Python 3.9 or later." |
| Recovery | Install from https://python.org or via `pyenv install 3.11` |

```bash
if command -v python3 &>/dev/null; then
  echo "PASS python3 $(python3 --version)"
elif command -v python &>/dev/null; then
  echo "PASS python $(python --version)"
else
  echo "FAIL [MUST] Python not found -- install Python 3.9+"
  exit 1
fi
```

### Check 2 — Package Manager Present

| Field | Value |
|---|---|
| Severity | MUST |
| Category | Package manager present |
| Validation | `pip --version` or `pip3 --version` |
| Error | "pip not found. Python package management is unavailable." |
| Recovery | `python -m ensurepip --upgrade` or install pip separately |

```bash
if command -v pip3 &>/dev/null; then
  echo "PASS pip3 $(pip3 --version)"
elif command -v pip &>/dev/null; then
  echo "PASS pip $(pip --version)"
else
  echo "FAIL [MUST] pip not found -- run: python -m ensurepip --upgrade"
  exit 1
fi
```

### Check 3 — Dependencies Resolved

| Field | Value |
|---|---|
| Severity | MUST |
| Category | Dependencies resolved |
| Validation | Check for `requirements.txt`, `pyproject.toml`, or `setup.py` |
| Error | "No dependency manifest found (requirements.txt / pyproject.toml / setup.py)." |
| Recovery | Create `requirements.txt` and run `pip install -r requirements.txt` |

```bash
if [ -f requirements.txt ]; then
  echo "PASS requirements.txt found"
  echo "PASS Dependencies manifest present (run pip install -r requirements.txt to resolve)"
elif [ -f pyproject.toml ]; then
  echo "PASS pyproject.toml found"
elif [ -f setup.py ]; then
  echo "PASS setup.py found"
else
  echo "FAIL [MUST] No dependency manifest found -- create requirements.txt or pyproject.toml"
  exit 1
fi
```

### Check 4 — Test Framework Available

| Field | Value |
|---|---|
| Severity | MUST |
| Category | Test framework available |
| Validation | `python -m pytest --version` |
| Error | "pytest not found. Cannot execute test suite." |
| Recovery | `pip install pytest` |

```bash
if python -m pytest --version &>/dev/null 2>&1; then
  echo "PASS $(python -m pytest --version)"
else
  echo "FAIL [MUST] pytest not found -- run: pip install pytest"
  exit 1
fi
```

### Check 5 — Test Configuration Present

| Field | Value |
|---|---|
| Severity | SHOULD |
| Category | Test configuration present |
| Validation | Check for `pytest.ini`, `pyproject.toml [tool.pytest]`, `setup.cfg [tool:pytest]`, or `conftest.py` |
| Error | "No pytest configuration found. pytest will use discovery defaults." |
| Recovery | Create `pytest.ini` with `[pytest]` section or add `[tool.pytest.ini_options]` to `pyproject.toml` |

```bash
if [ -f pytest.ini ] || [ -f conftest.py ]; then
  echo "PASS pytest configuration found"
elif [ -f pyproject.toml ] && grep -q "\[tool.pytest" pyproject.toml; then
  echo "PASS pytest configured in pyproject.toml"
elif [ -f setup.cfg ] && grep -q "\[tool:pytest\]" setup.cfg; then
  echo "PASS pytest configured in setup.cfg"
else
  echo "WARN [SHOULD] No pytest configuration found -- create pytest.ini or add [tool.pytest.ini_options] to pyproject.toml"
fi
```

### Check 6 — Coverage Tool Available

| Field | Value |
|---|---|
| Severity | SHOULD |
| Category | Coverage tool available |
| Validation | `python -m pytest --co -q` with `pytest-cov` plugin |
| Error | "pytest-cov not installed. Coverage reports will not be generated." |
| Recovery | `pip install pytest-cov` |

```bash
if python -c "import pytest_cov" &>/dev/null 2>&1; then
  echo "PASS pytest-cov installed"
else
  echo "WARN [SHOULD] pytest-cov not installed -- run: pip install pytest-cov"
fi
```

### Check 7 — Mocking Framework Installed

| Field | Value |
|---|---|
| Severity | SHOULD |
| Category | Mocking framework installed |
| Validation | `python -c "import unittest.mock"` and `python -c "import pytest_mock"` |
| Error | "unittest.mock is part of the standard library; pytest-mock is not installed." |
| Recovery | `pip install pytest-mock` |

```bash
if python -c "import unittest.mock" &>/dev/null 2>&1; then
  echo "PASS unittest.mock available (stdlib)"
else
  echo "FAIL [MUST] unittest.mock not available -- Python 3.3+ required"
fi
if python -c "import pytest_mock" &>/dev/null 2>&1; then
  echo "PASS pytest-mock installed"
else
  echo "WARN [SHOULD] pytest-mock not installed -- run: pip install pytest-mock"
fi
```

### python Full Pre-flight Script

```bash
#!/bin/bash
# Python / pytest pre-flight checks
echo "=== Python Pre-flight Checks ==="
FAILURES=0

# 1. Runtime
(command -v python3 || command -v python) &>/dev/null && echo "PASS Python found" || { echo "FAIL [MUST] Python not found"; ((FAILURES++)); }

# 2. Package manager
(command -v pip3 || command -v pip) &>/dev/null && echo "PASS pip found" || { echo "FAIL [MUST] pip not found -- run: python -m ensurepip"; ((FAILURES++)); }

# 3. Dependencies
([ -f requirements.txt ] || [ -f pyproject.toml ] || [ -f setup.py ]) && echo "PASS dependency manifest found" || { echo "FAIL [MUST] no dependency manifest"; ((FAILURES++)); }

# 4. Test framework
python -m pytest --version &>/dev/null 2>&1 && echo "PASS pytest installed" || { echo "FAIL [MUST] pytest not found -- run: pip install pytest"; ((FAILURES++)); }

# 5. Test configuration
([ -f pytest.ini ] || [ -f conftest.py ] || ([ -f pyproject.toml ] && grep -q "\[tool.pytest" pyproject.toml)) && echo "PASS pytest config found" || echo "WARN [SHOULD] no pytest config"

# 6. Coverage tool
python -c "import pytest_cov" &>/dev/null 2>&1 && echo "PASS pytest-cov installed" || echo "WARN [SHOULD] pytest-cov not installed -- run: pip install pytest-cov"

# 7. Mocking framework
python -c "import unittest.mock" &>/dev/null 2>&1 && echo "PASS unittest.mock available" || { echo "FAIL [MUST] unittest.mock unavailable"; ((FAILURES++)); }
python -c "import pytest_mock" &>/dev/null 2>&1 && echo "PASS pytest-mock installed" || echo "WARN [SHOULD] pytest-mock not installed -- run: pip install pytest-mock"

echo "=== Summary: $FAILURES critical failure(s) ==="
[ $FAILURES -eq 0 ] || exit 1
```

---

## java

Java / Maven or Gradle / JUnit 5 / Mockito / JaCoCo stack pre-flight checks.

### Check 1 — Runtime Installed

| Field | Value |
|---|---|
| Severity | MUST |
| Category | Runtime installed |
| Validation | `java -version` |
| Error | "Java runtime not found. Install JDK 17 or later." |
| Recovery | Install OpenJDK 17+ or use SDKMAN: `sdk install java 17-tem` |

```bash
if command -v java &>/dev/null; then
  echo "PASS java $(java -version 2>&1 | head -1)"
else
  echo "FAIL [MUST] Java not found -- install JDK 17+"
  exit 1
fi
```

### Check 2 — Package Manager Present

| Field | Value |
|---|---|
| Severity | MUST |
| Category | Package manager present |
| Validation | `mvn --version` or `gradle --version` or Maven/Gradle wrapper scripts |
| Error | "Neither mvn nor gradle found and no wrapper script present." |
| Recovery | Install Maven via `sdk install maven` or ensure `mvnw` / `gradlew` wrapper is present |

```bash
if command -v mvn &>/dev/null; then
  echo "PASS mvn $(mvn --version | head -1)"
elif [ -f mvnw ]; then
  echo "PASS Maven wrapper (mvnw) present"
elif command -v gradle &>/dev/null; then
  echo "PASS gradle $(gradle --version | grep 'Gradle')"
elif [ -f gradlew ]; then
  echo "PASS Gradle wrapper (gradlew) present"
else
  echo "FAIL [MUST] No build tool found -- install Maven or Gradle or add mvnw/gradlew wrapper"
  exit 1
fi
```

### Check 3 — Dependencies Resolved

| Field | Value |
|---|---|
| Severity | MUST |
| Category | Dependencies resolved |
| Validation | Check for `pom.xml` (Maven) or `build.gradle` / `build.gradle.kts` (Gradle) |
| Error | "No project build file found (pom.xml or build.gradle)." |
| Recovery | Create a `pom.xml` or `build.gradle` with JUnit 5 dependency |

```bash
if [ -f pom.xml ]; then
  echo "PASS pom.xml found"
  mvn dependency:resolve -q 2>/dev/null && echo "PASS Maven dependencies resolvable" || echo "WARN [SHOULD] Some Maven dependencies may not resolve"
elif [ -f build.gradle ] || [ -f build.gradle.kts ]; then
  echo "PASS build.gradle found"
else
  echo "FAIL [MUST] No build file found -- create pom.xml or build.gradle"
  exit 1
fi
```

### Check 4 — Test Framework Available

| Field | Value |
|---|---|
| Severity | MUST |
| Category | Test framework available |
| Validation | Check `pom.xml` or `build.gradle` for `junit-jupiter` / `junit5` dependency |
| Error | "JUnit 5 (junit-jupiter) dependency not declared in build file." |
| Recovery | Add `org.junit.jupiter:junit-jupiter` to `pom.xml` or `build.gradle` |

```bash
if [ -f pom.xml ]; then
  if grep -q "junit-jupiter\|junit-platform\|junit5" pom.xml; then
    echo "PASS JUnit 5 declared in pom.xml"
  else
    echo "FAIL [MUST] JUnit 5 not found in pom.xml -- add org.junit.jupiter:junit-jupiter"
    exit 1
  fi
elif [ -f build.gradle ] || [ -f build.gradle.kts ]; then
  BUILD_FILE="build.gradle"; [ -f build.gradle.kts ] && BUILD_FILE="build.gradle.kts"
  if grep -q "junit-jupiter\|junit5\|useJUnitPlatform" "$BUILD_FILE"; then
    echo "PASS JUnit 5 declared in $BUILD_FILE"
  else
    echo "FAIL [MUST] JUnit 5 not found in $BUILD_FILE"
    exit 1
  fi
fi
```

### Check 5 — Test Configuration Present

| Field | Value |
|---|---|
| Severity | SHOULD |
| Category | Test configuration present |
| Validation | Presence of `src/test` directory and Surefire/Failsafe plugin (Maven) or test task (Gradle) |
| Error | "src/test directory missing or test plugin not configured." |
| Recovery | Create `src/test/java` directory; configure Maven Surefire plugin or Gradle test task |

```bash
if [ -d src/test ]; then
  echo "PASS src/test directory exists"
else
  echo "WARN [SHOULD] src/test directory not found -- create src/test/java"
fi

if [ -f pom.xml ] && grep -q "maven-surefire-plugin\|maven-failsafe-plugin" pom.xml; then
  echo "PASS Maven Surefire/Failsafe plugin configured"
elif [ -f build.gradle ] || [ -f build.gradle.kts ]; then
  echo "PASS Gradle test task assumed present"
else
  echo "WARN [SHOULD] Test plugin not explicitly configured"
fi
```

### Check 6 — Coverage Tool Available

| Field | Value |
|---|---|
| Severity | SHOULD |
| Category | Coverage tool available |
| Validation | Check for `jacoco-maven-plugin` (Maven) or `jacoco` plugin (Gradle) |
| Error | "JaCoCo not configured. Coverage reports will not be generated." |
| Recovery | Add `jacoco-maven-plugin` to `pom.xml` or `id 'jacoco'` to `build.gradle` |

```bash
if [ -f pom.xml ] && grep -q "jacoco" pom.xml; then
  echo "PASS JaCoCo configured in pom.xml"
elif ([ -f build.gradle ] || [ -f build.gradle.kts ]) && grep -q "jacoco" build.gradle* 2>/dev/null; then
  echo "PASS JaCoCo configured in build.gradle"
else
  echo "WARN [SHOULD] JaCoCo not configured -- add jacoco-maven-plugin or jacoco Gradle plugin"
fi
```

### Check 7 — Mocking Framework Installed

| Field | Value |
|---|---|
| Severity | SHOULD |
| Category | Mocking framework installed |
| Validation | Check build file for `mockito-core` or `mockito-junit-jupiter` dependency |
| Error | "Mockito not declared in build file. Mocking capabilities are unavailable." |
| Recovery | Add `org.mockito:mockito-junit-jupiter` to `pom.xml` or `build.gradle` |

```bash
FOUND_MOCKITO=false
[ -f pom.xml ] && grep -q "mockito" pom.xml && FOUND_MOCKITO=true
([ -f build.gradle ] || [ -f build.gradle.kts ]) && grep -q "mockito" build.gradle* 2>/dev/null && FOUND_MOCKITO=true

if $FOUND_MOCKITO; then
  echo "PASS Mockito declared in build file"
else
  echo "WARN [SHOULD] Mockito not found -- add org.mockito:mockito-junit-jupiter to dependencies"
fi
```

### java Full Pre-flight Script

```bash
#!/bin/bash
# Java / JUnit 5 pre-flight checks
echo "=== Java Pre-flight Checks ==="
FAILURES=0

# 1. Runtime
command -v java &>/dev/null && echo "PASS java found" || { echo "FAIL [MUST] Java not found -- install JDK 17+"; ((FAILURES++)); }

# 2. Build tool
(command -v mvn || [ -f mvnw ] || command -v gradle || [ -f gradlew ]) &>/dev/null && echo "PASS build tool found" || { echo "FAIL [MUST] No build tool found"; ((FAILURES++)); }

# 3. Build file
([ -f pom.xml ] || [ -f build.gradle ] || [ -f build.gradle.kts ]) && echo "PASS build file found" || { echo "FAIL [MUST] No build file found"; ((FAILURES++)); }

# 4. JUnit 5
if [ -f pom.xml ]; then
  grep -q "junit-jupiter\|junit-platform\|junit5" pom.xml && echo "PASS JUnit 5 in pom.xml" || { echo "FAIL [MUST] JUnit 5 missing from pom.xml"; ((FAILURES++)); }
fi

# 5. Test directory
[ -d src/test ] && echo "PASS src/test exists" || echo "WARN [SHOULD] src/test not found"

# 6. JaCoCo
([ -f pom.xml ] && grep -q "jacoco" pom.xml) || grep -q "jacoco" build.gradle* 2>/dev/null && echo "PASS JaCoCo configured" || echo "WARN [SHOULD] JaCoCo not configured"

# 7. Mockito
([ -f pom.xml ] && grep -q "mockito" pom.xml) || grep -q "mockito" build.gradle* 2>/dev/null && echo "PASS Mockito found" || echo "WARN [SHOULD] Mockito not declared"

echo "=== Summary: $FAILURES critical failure(s) ==="
[ $FAILURES -eq 0 ] || exit 1
```

---

## go

Go / go test / gomock / go coverage stack pre-flight checks.

### Check 1 — Runtime Installed

| Field | Value |
|---|---|
| Severity | MUST |
| Category | Runtime installed |
| Validation | `go version` |
| Error | "Go runtime not found. Install Go 1.21 or later." |
| Recovery | Install from https://go.dev/dl or via `goenv install 1.21.0` |

```bash
if command -v go &>/dev/null; then
  echo "PASS $(go version)"
else
  echo "FAIL [MUST] Go not found -- install Go 1.21+"
  exit 1
fi
```

### Check 2 — Package Manager Present

| Field | Value |
|---|---|
| Severity | MUST |
| Category | Package manager present |
| Validation | `go env GOPATH` and presence of `go.mod` |
| Error | "go.mod not found. Module mode is required." |
| Recovery | Run `go mod init <module-name>` to initialize the module |

```bash
if [ -f go.mod ]; then
  echo "PASS go.mod found (module: $(head -1 go.mod | awk '{print $2}'))"
else
  echo "FAIL [MUST] go.mod not found -- run: go mod init <module-name>"
  exit 1
fi
```

### Check 3 — Dependencies Resolved

| Field | Value |
|---|---|
| Severity | MUST |
| Category | Dependencies resolved |
| Validation | `go mod verify` |
| Error | "Go module dependencies could not be verified." |
| Recovery | `go mod tidy && go mod download` |

```bash
if go mod verify &>/dev/null 2>&1; then
  echo "PASS go mod verify passed"
else
  echo "FAIL [MUST] go mod verify failed -- run: go mod tidy && go mod download"
  exit 1
fi
```

### Check 4 — Test Framework Available

| Field | Value |
|---|---|
| Severity | MUST |
| Category | Test framework available |
| Validation | `go test ./... -list .` (dry run — lists tests without running them) |
| Error | "go test is not functional. The Go toolchain may be broken." |
| Recovery | Reinstall Go or verify GOPATH / GOROOT are set correctly |

```bash
if go test ./... -list . &>/dev/null 2>&1; then
  echo "PASS go test ./... executable"
else
  echo "WARN [SHOULD] go test ./... returned non-zero (may indicate no tests yet or compilation error)"
fi
```

### Check 5 — Test Configuration Present

| Field | Value |
|---|---|
| Severity | SHOULD |
| Category | Test configuration present |
| Validation | Check for `*_test.go` files in the project |
| Error | "No *_test.go files found. Test suite may be empty." |
| Recovery | Create test files following the `<package>_test.go` naming convention |

```bash
TEST_FILES=$(find . -name "*_test.go" -not -path "./vendor/*" 2>/dev/null | wc -l)
if [ "$TEST_FILES" -gt 0 ]; then
  echo "PASS $TEST_FILES _test.go file(s) found"
else
  echo "WARN [SHOULD] No *_test.go files found -- create tests following <package>_test.go convention"
fi
```

### Check 6 — Coverage Tool Available

| Field | Value |
|---|---|
| Severity | SHOULD |
| Category | Coverage tool available |
| Validation | `go test -cover ./...` (Go's built-in coverage profiler) |
| Error | "go test -cover is not producing output. Coverage profiling may be broken." |
| Recovery | Coverage is built into the Go toolchain. Verify Go installation integrity. |

```bash
if go tool cover -h &>/dev/null 2>&1; then
  echo "PASS go tool cover available"
else
  echo "WARN [SHOULD] go tool cover not available -- verify Go installation"
fi

if go test -coverprofile=/dev/null ./... &>/dev/null 2>&1; then
  echo "PASS go test -coverprofile works"
else
  echo "MAY [MAY] go test -coverprofile returned non-zero (may be no test files)"
fi
```

### Check 7 — Mocking Framework Installed

| Field | Value |
|---|---|
| Severity | SHOULD |
| Category | Mocking framework installed |
| Validation | Check `go.mod` for `github.com/golang/mock` or `go.uber.org/mock` |
| Error | "gomock not declared in go.mod. Interface mocking is unavailable." |
| Recovery | `go get go.uber.org/mock/mockgen` |

```bash
if grep -q "golang/mock\|uber.org/mock\|testify/mock" go.mod 2>/dev/null; then
  echo "PASS mocking library found in go.mod"
else
  echo "WARN [SHOULD] No mock library in go.mod -- run: go get go.uber.org/mock/mockgen"
fi
```

### go Full Pre-flight Script

```bash
#!/bin/bash
# Go / go test pre-flight checks
echo "=== Go Pre-flight Checks ==="
FAILURES=0

# 1. Runtime
command -v go &>/dev/null && echo "PASS $(go version)" || { echo "FAIL [MUST] Go not found -- install Go 1.21+"; ((FAILURES++)); }

# 2. Module file
[ -f go.mod ] && echo "PASS go.mod found" || { echo "FAIL [MUST] go.mod not found -- run: go mod init"; ((FAILURES++)); }

# 3. Dependencies
go mod verify &>/dev/null 2>&1 && echo "PASS go mod verify passed" || { echo "FAIL [MUST] go mod verify failed -- run: go mod tidy"; ((FAILURES++)); }

# 4. Test framework (built into toolchain)
command -v go &>/dev/null && echo "PASS go test available (stdlib)" || { echo "FAIL [MUST] go test not available"; ((FAILURES++)); }

# 5. Test files
TEST_COUNT=$(find . -name "*_test.go" -not -path "./vendor/*" 2>/dev/null | wc -l)
[ "$TEST_COUNT" -gt 0 ] && echo "PASS $TEST_COUNT _test.go file(s) found" || echo "WARN [SHOULD] No *_test.go files found"

# 6. Coverage tool
go tool cover -h &>/dev/null 2>&1 && echo "PASS go tool cover available" || echo "WARN [SHOULD] go tool cover unavailable"

# 7. Mocking framework
grep -q "golang/mock\|uber.org/mock\|testify/mock" go.mod 2>/dev/null && echo "PASS mock library in go.mod" || echo "WARN [SHOULD] No mock library -- run: go get go.uber.org/mock/mockgen"

echo "=== Summary: $FAILURES critical failure(s) ==="
[ $FAILURES -eq 0 ] || exit 1
```

---

## dotnet

.NET / dotnet CLI / xUnit / Moq / Coverlet stack pre-flight checks.

### Check 1 — Runtime Installed

| Field | Value |
|---|---|
| Severity | MUST |
| Category | Runtime installed |
| Validation | `dotnet --version` |
| Error | ".NET SDK not found. Install .NET 8 SDK or later." |
| Recovery | Install from https://dotnet.microsoft.com/download or via `winget install Microsoft.DotNet.SDK.8` |

```bash
if command -v dotnet &>/dev/null; then
  echo "PASS dotnet $(dotnet --version)"
else
  echo "FAIL [MUST] dotnet CLI not found -- install .NET 8 SDK"
  exit 1
fi
```

### Check 2 — Package Manager Present

| Field | Value |
|---|---|
| Severity | MUST |
| Category | Package manager present |
| Validation | `dotnet nuget locals all --list` |
| Error | "NuGet package cache is inaccessible. dotnet restore will fail." |
| Recovery | Verify dotnet CLI installation; run `dotnet nuget locals all --clear` and retry |

```bash
if dotnet nuget locals all --list &>/dev/null 2>&1; then
  echo "PASS NuGet accessible"
else
  echo "FAIL [MUST] NuGet inaccessible -- run: dotnet nuget locals all --clear"
  exit 1
fi
```

### Check 3 — Dependencies Resolved

| Field | Value |
|---|---|
| Severity | MUST |
| Category | Dependencies resolved |
| Validation | Check for `.sln` or `.csproj` file, then `dotnet restore` |
| Error | "No solution or project file found. Cannot resolve NuGet packages." |
| Recovery | Create or restore a `.csproj` file and run `dotnet restore` |

```bash
if ls *.sln *.csproj 2>/dev/null | grep -q .; then
  echo "PASS Solution/project file found"
  dotnet restore --no-cache -q 2>/dev/null && echo "PASS dotnet restore succeeded" || echo "WARN [SHOULD] dotnet restore had warnings -- run: dotnet restore"
else
  echo "FAIL [MUST] No .sln or .csproj found -- create project with: dotnet new classlib"
  exit 1
fi
```

### Check 4 — Test Framework Available

| Field | Value |
|---|---|
| Severity | MUST |
| Category | Test framework available |
| Validation | Check test projects for `xunit` or `nunit` or `mstest` package references |
| Error | "No xUnit / NUnit / MSTest test SDK found in any project." |
| Recovery | Add xUnit: `dotnet add package xunit && dotnet add package xunit.runner.visualstudio && dotnet add package Microsoft.NET.Test.Sdk` |

```bash
if grep -r "xunit\|nunit\|MSTest\|Microsoft.NET.Test.Sdk" --include="*.csproj" . 2>/dev/null | grep -q .; then
  echo "PASS Test framework (xUnit/NUnit/MSTest) declared in project(s)"
else
  echo "FAIL [MUST] No test framework found in .csproj files -- add xunit or nunit package references"
  exit 1
fi
```

### Check 5 — Test Configuration Present

| Field | Value |
|---|---|
| Severity | SHOULD |
| Category | Test configuration present |
| Validation | Check for `xunit.runner.json`, `.runsettings`, or `Directory.Build.props` with test settings |
| Error | "No test runner configuration found. xUnit will use defaults." |
| Recovery | Create `xunit.runner.json` in the test project directory or a `.runsettings` file |

```bash
if find . -name "xunit.runner.json" -o -name "*.runsettings" -o -name "Directory.Build.props" 2>/dev/null | grep -q .; then
  echo "PASS Test runner configuration found"
else
  echo "WARN [SHOULD] No test runner configuration found -- create xunit.runner.json or .runsettings"
fi
```

### Check 6 — Coverage Tool Available

| Field | Value |
|---|---|
| Severity | SHOULD |
| Category | Coverage tool available |
| Validation | Check for `coverlet.collector` or `coverlet.msbuild` package reference in test projects |
| Error | "Coverlet not declared in test project(s). Coverage reports will not be generated." |
| Recovery | `dotnet add <TestProject> package coverlet.collector` |

```bash
if grep -r "coverlet" --include="*.csproj" . 2>/dev/null | grep -q .; then
  echo "PASS Coverlet declared in project(s)"
else
  echo "WARN [SHOULD] Coverlet not found -- run: dotnet add <TestProject>.csproj package coverlet.collector"
fi
```

### Check 7 — Mocking Framework Installed

| Field | Value |
|---|---|
| Severity | SHOULD |
| Category | Mocking framework installed |
| Validation | Check for `Moq` or `NSubstitute` or `FakeItEasy` package reference in test projects |
| Error | "No mocking framework (Moq / NSubstitute / FakeItEasy) found in test project(s)." |
| Recovery | `dotnet add <TestProject> package Moq` |

```bash
if grep -r "Moq\|NSubstitute\|FakeItEasy" --include="*.csproj" . 2>/dev/null | grep -q .; then
  echo "PASS Mocking framework (Moq/NSubstitute/FakeItEasy) declared"
else
  echo "WARN [SHOULD] No mocking framework found -- run: dotnet add <TestProject>.csproj package Moq"
fi
```

### dotnet Full Pre-flight Script

```bash
#!/bin/bash
# .NET / xUnit / Coverlet / Moq pre-flight checks
echo "=== .NET Pre-flight Checks ==="
FAILURES=0

# 1. Runtime
command -v dotnet &>/dev/null && echo "PASS dotnet $(dotnet --version)" || { echo "FAIL [MUST] dotnet CLI not found -- install .NET 8 SDK"; ((FAILURES++)); }

# 2. NuGet (package manager)
dotnet nuget locals all --list &>/dev/null 2>&1 && echo "PASS NuGet accessible" || { echo "FAIL [MUST] NuGet inaccessible"; ((FAILURES++)); }

# 3. Project / solution file and restore
ls *.sln *.csproj 2>/dev/null | grep -q . && echo "PASS solution/project file found" || { echo "FAIL [MUST] No .sln or .csproj found"; ((FAILURES++)); }
dotnet restore -q 2>/dev/null && echo "PASS dotnet restore succeeded" || echo "WARN [SHOULD] dotnet restore had issues -- run: dotnet restore"

# 4. Test SDK / framework
grep -r "xunit\|nunit\|MSTest\|Microsoft.NET.Test.Sdk" --include="*.csproj" . 2>/dev/null | grep -q . && echo "PASS test framework declared" || { echo "FAIL [MUST] No test framework in .csproj -- add xunit packages"; ((FAILURES++)); }

# 5. Test runner config
find . -name "xunit.runner.json" -o -name "*.runsettings" 2>/dev/null | grep -q . && echo "PASS test runner config found" || echo "WARN [SHOULD] No test runner config -- create xunit.runner.json"

# 6. Coverlet
grep -r "coverlet" --include="*.csproj" . 2>/dev/null | grep -q . && echo "PASS Coverlet declared" || echo "WARN [SHOULD] Coverlet not found -- run: dotnet add package coverlet.collector"

# 7. Mocking framework
grep -r "Moq\|NSubstitute\|FakeItEasy" --include="*.csproj" . 2>/dev/null | grep -q . && echo "PASS mocking framework declared" || echo "WARN [SHOULD] No mocking framework -- run: dotnet add package Moq"

echo "=== Summary: $FAILURES critical failure(s) ==="
[ $FAILURES -eq 0 ] || exit 1
```

---

## Severity Reference

| Severity | Behaviour | Agent action |
|---|---|---|
| MUST | Hard halt — do not proceed | Exit with error; surface message to user; block test generation |
| SHOULD | Warning — log and continue | Log warning; flag for developer attention; continue workflow |
| MAY | Informational | Log only; no action required |

## Stack Descriptor Mapping

| `stackDescriptor.stackName` | Section | Default test framework | Default coverage | Default mocking |
|---|---|---|---|---|
| `nodejs` | `## nodejs` | Jest | jest --coverage | @testing-library/react, jest.fn() |
| `python` | `## python` | pytest | pytest-cov | unittest.mock, pytest-mock |
| `java` | `## java` | JUnit 5 (junit-jupiter) | JaCoCo | Mockito |
| `go` | `## go` | go test (stdlib) | go test -cover | gomock / testify/mock |
| `dotnet` | `## dotnet` | xUnit | Coverlet | Moq |

---

**Version**: 2.0.0
**Last Updated**: 2026-03-19
**Status**: Active
**Changes**: Refactored from Node.js-only to stack-indexed validation matrix supporting nodejs, python, java, go, and dotnet. Each stack defines 7 check categories with MUST/SHOULD/MAY severity levels. Node.js checks preserved and restructured under the `## nodejs` H2 section.
