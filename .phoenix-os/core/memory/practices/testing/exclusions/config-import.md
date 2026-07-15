# Config Import Rules

**Memory Type**: LTM (Long-Term Memory)
**Layer**: 3 — Project Config Import
**Parent**: #345 — Tech-Stack-Specific Intelligent Exclusion Patterns
**Feeds Into**: Step 2.6 of `test-planner.md`

---

## Import Pipeline

Config import is a 5-step pipeline executed once per planning session.

```
identify → read → extract → normalize → deduplicate
```

**Step 1 — Identify**: Route on `stackDescriptor.stackName` and `stackDescriptor.testFramework` to select the applicable per-stack section below. Locate the highest-priority config file for that stack (see priority tables).

**Step 2 — Read**: Read the first config file found using the Read tool. If no config file is found at any priority level, return empty result immediately (no error, no warning).

**Step 3 — Extract**: Locate the fields listed for that stack section. If a field is absent, skip it (treat as empty for that field). If the file is malformed (unparseable JSON/TOML/XML), log a warning and return empty result.

**Step 4 — Normalize**: Convert extracted patterns to universal glob format using the normalization rules in the Normalization Reference section. Unrecognized patterns that cannot be converted are logged as warnings and skipped.

**Step 5 — Deduplicate**: Remove any normalized pattern that exactly matches a pattern already present in the L1 defaults (from `defaults.md` for the resolved stack). Deduplication is exact string match on the normalized glob; no semantic equivalence is applied.

---

## Config Source Priority

When multiple config files exist for the same tool, use only the highest-priority source. If the highest-priority source exists but contains no exclusion fields, return empty result. Do NOT fall through to a lower-priority source.

| Stack | Priority (highest first) |
|-------|--------------------------|
| `nodejs` (jest) | `jest.config.ts` > `jest.config.js` > `jest.config.mjs` > `package.json` (jest key) |
| `nodejs` (vitest) | `vitest.config.ts` > `vitest.config.js` > `vite.config.ts` (test section) |
| `python` | `pyproject.toml` > `.coveragerc` > `setup.cfg` |
| `java` | `pom.xml` (JaCoCo plugin) > `build.gradle` (jacocoTestReport) |
| `dotnet` | `*.runsettings` > `*.csproj` (Coverlet inline) |
| `go` | (no config files — intentional empty result, see Go section) |

---

## Per-Stack Import Rules

### nodejs (jest)

**Applies when**: `stackDescriptor.stackName === "nodejs"` AND `stackDescriptor.testFramework === "jest"`

**Config source priority** (highest first):
1. `jest.config.ts`
2. `jest.config.js`
3. `jest.config.mjs`
4. `package.json` — `jest` key

**Agent instructions**:
1. Check for config files in priority order. Use the first file found.
2. If `jest.config.{ts,js,mjs}`: read file content, locate the export object.
3. If `package.json#jest`: read `package.json`, extract the `jest` key object.
4. If the highest-priority file exists but lacks all three fields below, return empty result. Do NOT check lower-priority files.
5. Extract each field listed below. If a field is absent, skip it (empty for that field).
6. Normalize extracted patterns per the Normalization Reference section.
7. Deduplicate against L1 `nodejs` defaults from `defaults.md`.
8. Store result in STM under `configImportExclusions`.

**Fields to extract**:

| Field | Type | Normalization |
|-------|------|---------------|
| `collectCoverageFrom` | string[] | Filter entries starting with `!`. Strip the `!` prefix. Remaining entries are already glob format — pass through. |
| `coveragePathIgnorePatterns` | string[] | Regex strings. Apply regex-to-glob conversion rules. |
| `testPathIgnorePatterns` | string[] | Regex strings. Apply regex-to-glob conversion rules. |

**Examples**:

`collectCoverageFrom` extraction:
```
Input array: ["src/**/*.ts", "!src/generated/**", "!src/**/*.spec.ts"]
Filter entries starting with "!": ["!src/generated/**", "!src/**/*.spec.ts"]
Strip "!" prefix: ["src/generated/**", "src/**/*.spec.ts"]
Result: ["src/generated/**", "src/**/*.spec.ts"]
```

`coveragePathIgnorePatterns` extraction:
```
Input array: ["/node_modules/", "/__tests__/", ".*\\.generated\\.ts$"]
Apply regex-to-glob conversion (see Normalization Reference):
  "/node_modules/" -> "node_modules/**"
  "/__tests__/"    -> "__tests__/**"
  ".*\\.generated\\.ts$" -> "**/*.generated.ts"
Result: ["node_modules/**", "__tests__/**", "**/*.generated.ts"]
```

`testPathIgnorePatterns` extraction:
```
Input array: ["/node_modules/", "/src/legacy/"]
Apply regex-to-glob conversion:
  "/node_modules/" -> "node_modules/**"
  "/src/legacy/"   -> "src/legacy/**"
Result: ["node_modules/**", "src/legacy/**"]
```

---

### nodejs (vitest)

**Applies when**: `stackDescriptor.stackName === "nodejs"` AND `stackDescriptor.testFramework === "vitest"`

**Config source priority** (highest first):
1. `vitest.config.ts`
2. `vitest.config.js`
3. `vite.config.ts` — `test` section

**Agent instructions**:
1. Check for config files in priority order. Use the first file found.
2. If `vitest.config.{ts,js}`: read file content, locate the `defineConfig` or `export default` object.
3. If `vite.config.ts#test`: read `vite.config.ts`, locate the `test` key within the config object.
4. If the highest-priority file exists but lacks both fields below, return empty result. Do NOT check lower-priority files.
5. Extract each field listed below.
6. Patterns from both fields are already in glob format — pass through without conversion.
7. Deduplicate against L1 `nodejs` defaults from `defaults.md`.
8. Store result in STM under `configImportExclusions`.

**Fields to extract**:

| Field | Location | Normalization |
|-------|----------|---------------|
| `coverage.exclude` | Under `coverage` key in test config | Already glob format — pass through |
| `exclude` | Top-level test config key | Already glob format — pass through |

**Examples**:

`coverage.exclude` extraction:
```
Config content (vitest.config.ts):
  test: {
    coverage: {
      exclude: ["node_modules/**", "**/*.spec.ts", "src/generated/**"]
    }
  }
Result: ["node_modules/**", "**/*.spec.ts", "src/generated/**"]
```

`exclude` extraction:
```
Config content (vitest.config.ts):
  test: {
    exclude: ["**/node_modules/**", "**/dist/**", "**/__mocks__/**"]
  }
Result: ["**/node_modules/**", "**/dist/**", "**/__mocks__/**"]
```

---

### python

**Applies when**: `stackDescriptor.stackName === "python"`

**Config source priority** (highest first):
1. `pyproject.toml`
2. `.coveragerc`
3. `setup.cfg`

**Agent instructions**:
1. Check for config files in priority order. Use the first file found.
2. If `pyproject.toml`: read file, locate `[tool.coverage.run]` section for `omit` field, and `[tool.pytest.ini_options]` section for `testpaths` field.
3. If `.coveragerc`: read file, locate `[run]` section for `omit` field.
4. If `setup.cfg`: read file, locate `[coverage:run]` section for `omit` field.
5. If the highest-priority file exists but lacks all relevant fields, return empty result. Do NOT check lower-priority files.
6. Normalize extracted patterns using the Python-paths-to-globs conversion rules.
7. Deduplicate against L1 `python` defaults from `defaults.md`.
8. Store result in STM under `configImportExclusions`.

**Fields to extract**:

| Field | Location | Normalization |
|-------|----------|---------------|
| `omit` | `[tool.coverage.run]` in pyproject.toml | Python path patterns — apply Python-to-glob conversion rules |
| `testpaths` | `[tool.pytest.ini_options]` in pyproject.toml | Directory names — convert to `{dir}/**` globs |
| `omit` | `[run]` in .coveragerc | Python path patterns — apply Python-to-glob conversion rules |
| `omit` | `[coverage:run]` in setup.cfg | Python path patterns — apply Python-to-glob conversion rules |

Note: `omit` and `testpaths` from pyproject.toml are separate fields extracted from different sections of the same file. Both are extracted in a single read pass.

**Examples**:

`[tool.coverage.run].omit` extraction from pyproject.toml:
```toml
[tool.coverage.run]
omit = [
    "*/migrations/*",
    "tests/*",
    "*.pyc",
    "setup.py"
]
```
```
Apply Python-to-glob conversion:
  "*/migrations/*" -> "**/migrations/**"
  "tests/*"        -> "tests/**"
  "*.pyc"          -> "**/*.pyc"
  "setup.py"       -> "setup.py"   (no wildcard at start, pass through)
Result: ["**/migrations/**", "tests/**", "**/*.pyc", "setup.py"]
```

`[tool.pytest.ini_options].testpaths` extraction from pyproject.toml:
```toml
[tool.pytest.ini_options]
testpaths = ["tests", "integration_tests"]
```
```
Convert directory names to globs:
  "tests"             -> "tests/**"
  "integration_tests" -> "integration_tests/**"
Result: ["tests/**", "integration_tests/**"]
```

`[run].omit` extraction from .coveragerc:
```ini
[run]
omit =
    */migrations/*
    tests/*
    *.pyc
```
```
Apply Python-to-glob conversion (same rules as above):
Result: ["**/migrations/**", "tests/**", "**/*.pyc"]
```

`[coverage:run].omit` extraction from setup.cfg:
```ini
[coverage:run]
omit =
    */migrations/*
    tests/*
```
```
Apply Python-to-glob conversion:
Result: ["**/migrations/**", "tests/**"]
```

---

### java

**Applies when**: `stackDescriptor.stackName === "java"`

**Config source priority** (highest first):
1. `pom.xml` — JaCoCo plugin configuration
2. `build.gradle` — `jacocoTestReport` task configuration

**Agent instructions**:
1. Check for config files in priority order. Use the first file found.
2. If `pom.xml`: read file, locate `<plugin>` with `<artifactId>jacoco-maven-plugin</artifactId>`, navigate to `<configuration><excludes>`, extract all `<exclude>` entries.
3. If `build.gradle`: read file, locate `jacocoTestReport { classDirectories.exclude }` or `jacocoTestReport { classDirectories { exclude [...] } }`, extract exclusion entries.
4. If the highest-priority file exists but lacks JaCoCo exclusion configuration, return empty result. Do NOT check lower-priority files.
5. Normalize extracted patterns using the Java-class-patterns-to-file-globs conversion rules.
6. Deduplicate against L1 `java` defaults from `defaults.md`.
7. Store result in STM under `configImportExclusions`.

**Fields to extract**:

| Field | Location | Normalization |
|-------|----------|---------------|
| `<exclude>` entries | `<plugin>jacoco-maven-plugin</plugin>` > `<configuration>` > `<excludes>` in pom.xml | Java class patterns — apply Java-to-file-glob conversion rules |
| exclusion entries | `jacocoTestReport { classDirectories.exclude [...] }` in build.gradle | Java class patterns — apply Java-to-file-glob conversion rules |

**Examples**:

`pom.xml` JaCoCo excludes extraction:
```xml
<plugin>
  <artifactId>jacoco-maven-plugin</artifactId>
  <configuration>
    <excludes>
      <exclude>**/Generated*</exclude>
      <exclude>com/example/config/*</exclude>
      <exclude>**/dto/**</exclude>
    </excludes>
  </configuration>
</plugin>
```
```
Apply Java-to-file-glob conversion:
  "**/Generated*"       -> "**/Generated*.java"
  "com/example/config/*" -> "com/example/config/*.java"
  "**/dto/**"           -> "**/dto/**"  (already path glob, append .java not applicable to directory patterns)
Result: ["**/Generated*.java", "com/example/config/*.java", "**/dto/**"]
```

`build.gradle` jacocoTestReport extraction:
```groovy
jacocoTestReport {
    classDirectories.setFrom(files(classDirectories.files.collect {
        fileTree(dir: it, exclude: [
            '**/Generated*',
            'com/example/config/*'
        ])
    }))
}
```
```
Extract exclusion entries: ["**/Generated*", "com/example/config/*"]
Apply Java-to-file-glob conversion:
  "**/Generated*"       -> "**/Generated*.java"
  "com/example/config/*" -> "com/example/config/*.java"
Result: ["**/Generated*.java", "com/example/config/*.java"]
```

---

### go

**Applies when**: `stackDescriptor.stackName === "go"`

**Result**: Always empty. No config files are read.

**Rationale**: Go does not use config-file-based test exclusions. Go's test tooling scopes coverage via command-line flags (`go test -coverprofile`, `./...` package patterns, build tags via `-tags`). There is no `go test` config file analogous to jest.config.ts or pyproject.toml that declares file or path exclusions. Exclusions in Go are controlled at the source level (build tags in source files) or at invocation time (package path arguments).

L3 intentionally returns an empty result for Go. Exclusion patterns for Go stacks are sourced from L1 (static defaults in `defaults.md`) and L2 (heuristic scan). No config import is performed.

**Note**: `go test -coverprofile` scopes coverage via package path arguments (e.g., `./...` or specific package paths), not via config file exclusion fields.

---

### dotnet

**Applies when**: `stackDescriptor.stackName === "dotnet"`

**Config source priority** (highest first):
1. `*.runsettings` — DataCollector Coverlet configuration
2. `*.csproj` — Coverlet inline `<PropertyGroup>` properties

**Agent instructions**:
1. Scan the repository root for files matching `*.runsettings`. If found, use the first one.
2. If no runsettings file exists, scan for files matching `*.csproj`. If multiple .csproj files exist, scan all of them and merge their exclusion fields.
3. If `*.runsettings`: read file, locate `<DataCollector friendlyName="XPlat Code Coverage">`, navigate to `<Configuration>`, extract `<Exclude>` and `<ExcludeByFile>` entries.
4. If `*.csproj`: read each file, locate `<PropertyGroup>`, extract `<Exclude>` and `<ExcludeByFile>` values.
5. If the highest-priority source(s) exist but lack exclusion fields, return empty result. Do NOT check lower-priority sources.
6. Normalize `<Exclude>` entries using the .NET-filter-expressions-to-globs conversion rules. Pass `<ExcludeByFile>` entries through without conversion (already file globs).
7. Deduplicate against L1 `dotnet` defaults from `defaults.md`.
8. Store result in STM under `configImportExclusions`.

**Fields to extract**:

| Field | Location | Normalization |
|-------|----------|---------------|
| `<Exclude>` | `<PropertyGroup>` in .csproj OR `<Configuration>` in runsettings | .NET filter expressions — apply .NET-to-glob conversion rules |
| `<ExcludeByFile>` | `<PropertyGroup>` in .csproj OR `<Configuration>` in runsettings | Already file glob format — pass through |

**Examples**:

`.csproj` Coverlet `<Exclude>` extraction:
```xml
<PropertyGroup>
  <Exclude>[*.Tests]*,[*]*.Migrations.*</Exclude>
  <ExcludeByFile>**/obj/**,**/Migrations/**/*.cs</ExcludeByFile>
</PropertyGroup>
```
```
<Exclude> value: "[*.Tests]*,[*]*.Migrations.*"
Split on comma: ["[*.Tests]*", "[*]*.Migrations.*"]
Apply .NET-to-glob conversion:
  "[*.Tests]*"       -> "*.Tests/**"
  "[*]*.Migrations.*" -> "**/Migrations/**"
Result from <Exclude>: ["*.Tests/**", "**/Migrations/**"]

<ExcludeByFile> value: "**/obj/**,**/Migrations/**/*.cs"
Split on comma: ["**/obj/**", "**/Migrations/**/*.cs"]
Pass through (already file globs):
Result from <ExcludeByFile>: ["**/obj/**", "**/Migrations/**/*.cs"]

Combined result: ["*.Tests/**", "**/Migrations/**", "**/obj/**", "**/Migrations/**/*.cs"]
```

`*.runsettings` DataCollector extraction:
```xml
<DataCollector friendlyName="XPlat Code Coverage">
  <Configuration>
    <Exclude>[*.Tests]*</Exclude>
    <ExcludeByFile>**/obj/**</ExcludeByFile>
  </Configuration>
</DataCollector>
```
```
Apply .NET-to-glob conversion on <Exclude>:
  "[*.Tests]*" -> "*.Tests/**"
Pass through <ExcludeByFile>:
  "**/obj/**" -> "**/obj/**"
Result: ["*.Tests/**", "**/obj/**"]
```

---

## Normalization Reference

### Regex to Glob (Jest `coveragePathIgnorePatterns` and `testPathIgnorePatterns`)

These fields contain JavaScript regex strings. Convert each regex to a glob pattern using the following rules in order:

| Step | Transform | Input Example | Output Example |
|------|-----------|---------------|----------------|
| 1 | Strip leading and trailing `/` (regex delimiters) | `/node_modules/` | `node_modules/` |
| 2 | Unescape `\\` sequences — replace `\\.` with `.`, `\\/` with `/` | `\\.stories\\.` | `.stories.` |
| 3 | Replace `.*` with `**` (match-all becomes recursive wildcard) | `.*\\.generated\\.ts` | `**.generated.ts` |
| 4 | Replace `[^/]+` with `*` (one-segment match becomes wildcard) | `[^/]+` | `*` |
| 5 | Strip `^` and `$` anchors | `^src/` | `src/` |
| 6 | If result ends with `/` (directory pattern), append `**` | `node_modules/` | `node_modules/**` |
| 7 | If result starts with `**` and has no leading path, ensure `**/` prefix | `**.generated.ts` | `**/*.generated.ts` |

**Worked Examples**:

| Input (Regex) | Output (Glob) | Rules Applied |
|---------------|---------------|---------------|
| `/node_modules/` | `node_modules/**` | 1, 6 |
| `/__tests__/` | `__tests__/**` | 1, 6 |
| `\\.stories\\.` | `*.stories.*` | 2, then wrap in `*` on each side |
| `.*\\.generated\\.ts$` | `**/*.generated.ts` | 2, 3, 5, 7 |
| `/src/legacy/` | `src/legacy/**` | 1, 6 |
| `^dist/` | `dist/` | 1 (no leading `/`), 5 |
| `/node_modules/` | `node_modules/**` | 1, 6 |
| `[^/]+\\.test\\.ts` | `*.test.ts` | 4, 2 |

**Note**: If a regex is too complex to convert deterministically (e.g., lookaheads, character classes other than `[^/]+`), log a warning: "Config import: skipping unrecognized pattern '{pattern}' from {file}". Skip the pattern.

---

### Python Paths to Globs

Python coverage `omit` patterns use a simplified glob-like syntax. Convert to universal globs using these rules:

| Input (Python) | Output (Glob) | Rule |
|----------------|---------------|------|
| `*/migrations/*` | `**/migrations/**` | Single `*` at segment boundary → `**` for recursive match |
| `tests/*` | `tests/**` | Directory prefix with trailing `/*` → trailing `/**` |
| `*.pyc` | `**/*.pyc` | File pattern without path → prefix with `**/` |
| `setup.py` | `setup.py` | Literal filename → pass through |
| `src/legacy/` | `src/legacy/**` | Directory path with trailing `/` → append `**` |

**General rules**:
1. If pattern starts with `*/`, replace `*/` with `**/` (make recursive)
2. If pattern ends with `/*`, replace `/*` with `/**` (make recursive)
3. If pattern starts with `*.` and has no path separator, prefix with `**/`
4. If pattern ends with `/`, append `**`
5. Otherwise pass through

**Worked Examples** (from pyproject.toml `omit`):

```
"*/migrations/*"     -> "**/migrations/**"
"tests/*"            -> "tests/**"
"*.pyc"              -> "**/*.pyc"
"setup.py"           -> "setup.py"
"src/*/generated/*"  -> "src/**/generated/**"
".venv/*"            -> ".venv/**"
```

---

### Java Class Patterns to File Globs

JaCoCo `<exclude>` entries use Java class file path patterns (using `/` as separator, with `.class` implied). Convert to source file globs:

| Input (Java) | Output (Glob) | Rule |
|--------------|---------------|------|
| `**/Generated*` | `**/Generated*.java` | Append `.java` extension (class name pattern → source file pattern) |
| `com/example/config/*` | `com/example/config/*.java` | Append `.java` extension |
| `com.example.config.*` | `com/example/config/*.java` | Replace `.` with `/` for package separators, append `.java` |
| `**/dto/**` | `**/dto/**` | Directory glob — do not append `.java` (already recursive directory) |
| `**/model/**/*.class` | `**/model/**/*.java` | Replace `.class` with `.java` |

**General rules**:
1. If the pattern contains `.` separators (Java package notation), replace `.` with `/` (except leading `**` segments)
2. If the pattern ends with `*` (not `**`), append `.java`
3. If the pattern ends with `/**`, leave as-is (directory exclusion)
4. If the pattern ends with `.class`, replace with `.java`

**Worked Examples** (from pom.xml JaCoCo excludes):

```
"**/Generated*"          -> "**/Generated*.java"
"com/example/config/*"   -> "com/example/config/*.java"
"**/dto/**"              -> "**/dto/**"
"com.example.model.*"    -> "com/example/model/*.java"
"**/R.class"             -> "**/R.java"
"**/BuildConfig.*"       -> "**/BuildConfig*.java"
```

---

### .NET Filter Expressions to Globs

Coverlet `<Exclude>` values use .NET filter expression syntax: `[AssemblyName]TypeName`. Multiple entries are comma-separated. Convert each entry to a file glob:

| Input (.NET) | Output (Glob) | Rule |
|--------------|---------------|------|
| `[*.Tests]*` | `*.Tests/**` | Strip `[]`, map assembly wildcard to directory wildcard, append `/**` |
| `[*]*.Migrations.*` | `**/Migrations/**` | Strip `[]`, extract namespace pattern, convert to path glob |
| `[MyAssembly]*` | `MyAssembly/**` | Strip `[]`, literal assembly name → directory name, append `/**` |
| `[*]*` | `**` | Fully wildcard — match everything |

**General rules**:
1. Split on `,` to handle multiple entries
2. For each entry, extract the assembly filter part (inside `[...]`) and the type filter part (after `]`)
3. Strip the `[` and `]` brackets
4. If the assembly filter is `*`, omit it from the path (or use `**/`)
5. Convert the type filter from .NET namespace notation to path notation:
   - Replace `.` with `/` for namespace separators
   - A trailing `.*` becomes `/**`
   - A standalone `*` becomes `/**`
6. Combine assembly and type parts into a glob

**Worked Examples** (from .csproj `<Exclude>`):

```
"[*.Tests]*"          -> "*.Tests/**"
"[*]*.Migrations.*"   -> "**/Migrations/**"
"[MyApp.Tests]*"      -> "MyApp.Tests/**"
"[*]*"                -> "**"
"[*]*.Generated"      -> "**/Generated"
```

---

## Deduplication Logic

After normalization, remove patterns from the imported set that exactly match patterns already present in the L1 defaults for the resolved stack (from `defaults.md`).

**Rules**:
- Comparison is exact string match on the normalized glob string
- No semantic equivalence is applied (e.g., `node_modules/**` and `**/node_modules/**` are NOT considered equal)
- Deduplication applies only against L1 defaults; L2 heuristic patterns are deduplicated during the merge step (#376)
- If the entire imported set becomes empty after deduplication, store an empty array in STM (not an error)

**Example**:
```
L1 defaults for nodejs: ["node_modules/**", "dist/**", "build/**", "coverage/**"]
Imported patterns (normalized): ["node_modules/**", "src/generated/**", "dist/**"]
After deduplication: ["src/generated/**"]
Stored in STM: ["src/generated/**"]
```

---

## Error Handling

| Scenario | Behavior |
|----------|----------|
| Config file not found (no file at any priority level) | Empty result. No error. No warning. |
| Config file exists, no exclusion fields present | Empty result. No error. No warning. |
| Config file parse error (malformed JSON, TOML, or XML) | Log warning: `"Config import: failed to parse {file}: {error}"`. Return empty result. |
| Unrecognized pattern format (cannot normalize) | Log warning: `"Config import: skipping unrecognized pattern '{pattern}' from {file}"`. Skip pattern; continue with remaining patterns. |
| Multiple config files for same tool (e.g., jest.config.ts AND package.json#jest) | Use highest-priority source only. Do NOT fall through. |

---

## STM Storage Format

Store results in STM using this JSON structure under the `configImportExclusions` key:

```json
{
  "configImportExclusions": {
    "source": "jest.config.ts",
    "fieldsExtracted": ["collectCoverageFrom", "coveragePathIgnorePatterns"],
    "rawPatterns": ["!src/generated/**", "/node_modules/"],
    "normalizedPatterns": ["src/generated/**", "node_modules/**"],
    "flattened": ["src/generated/**", "node_modules/**"]
  }
}
```

**Fields**:
- `source`: filename of the config file that was read (or `null` if no config found)
- `fieldsExtracted`: list of field names that contained data (empty array if none)
- `rawPatterns`: raw values extracted before normalization (preserved for debugging)
- `normalizedPatterns`: patterns after normalization (before deduplication)
- `flattened`: final deduplicated patterns stored for downstream merge by #376

**When no config is found**:
```json
{
  "configImportExclusions": {
    "source": null,
    "fieldsExtracted": [],
    "rawPatterns": [],
    "normalizedPatterns": [],
    "flattened": []
  }
}
```

---

## See Also

- `core/memory/practices/testing/exclusions/defaults.md` — L1 static defaults (deduplication source)
- `core/memory/practices/testing/stack-detection.md` — Stack descriptor schema (`stackName`, `testFramework`)
- `core/agents/testing/test-planner.md` — Step 2.6 executes this pipeline
- `core/memory/practices/testing/merge-algorithm.md` — Downstream consumer of `configImportExclusions` (L3 output)

---

**Version**: 1.0.0
**Last Updated**: 2026-03-19
**Status**: Active
**Issue**: #375
