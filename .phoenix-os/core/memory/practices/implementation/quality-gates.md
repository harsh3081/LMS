# Quality Gates for Implementation

Quality gates ensure code quality and validation at multiple levels during implementation (Phase 6).

## Gate Levels

### 1. Task-Level Quality Gates
Run after completing each Level 2 task in todo.md.

**Checks**:
- ✅ Code compiles without errors
- ✅ Tests for this task pass
- ✅ No new linting warnings introduced

**Purpose**: Immediate feedback on task completion

### 2. Step-Level Quality Gates
Run after completing all Level 2 tasks for a Level 1 step.

**Checks**:
- ✅ All tests pass (unit tests)
- ✅ Code compiles successfully
- ✅ Linting checks pass
- ✅ No compilation warnings

**Purpose**: Validate complete step before moving to next

### 3. Integration Quality Gates
Run after completing steps that integrate components.

**Checks**:
- ✅ All unit tests pass
- ✅ Integration tests pass (if applicable)
- ✅ Server starts without errors (if applicable)
- ✅ API endpoints respond correctly (if applicable)
- ✅ Database migrations succeed (if applicable)

**Purpose**: Ensure components work together

### 4. Final Quality Gate
Run after completing all Level 1 steps before marking implementation complete.

**Checks**:
- ✅ All unit tests pass
- ✅ All integration tests pass (if applicable)
- ✅ Build succeeds
- ✅ Linting passes with no issues
- ✅ Code coverage meets threshold (>80%)
- ✅ Runtime validation (server/UI functional)
- ✅ No TODO comments in code
- ✅ No stub implementations remaining
- ✅ Documentation updated (if required by spec)

**Purpose**: Comprehensive validation before code review

## Quality Gate Execution

### Compilation Check
```bash
# Language-specific compilation commands
npm run build        # Node.js/TypeScript
mvn compile         # Java/Maven
gradle build        # Java/Gradle
dotnet build        # .NET
go build ./...      # Go
cargo build         # Rust
```

**Expected Result**: Zero compilation errors or warnings

### Test Execution
```bash
# Language-specific test commands
npm test            # Node.js/TypeScript
mvn test           # Java/Maven
gradle test        # Java/Gradle
dotnet test        # .NET
go test ./...      # Go
cargo test         # Rust
pytest             # Python
```

**Expected Result**: All tests pass, no skipped tests without justification

### Linting
```bash
# Language-specific linting commands
npm run lint        # Node.js/TypeScript (ESLint)
mvn checkstyle:check # Java (Checkstyle)
dotnet format --verify-no-changes # .NET
golangci-lint run   # Go
cargo clippy        # Rust
pylint **/*.py      # Python
```

**Expected Result**: No linting errors, no warnings (or documented exceptions)

### Build
```bash
# Production build commands
npm run build       # Node.js/TypeScript
mvn package        # Java/Maven
gradle build       # Java/Gradle
dotnet publish     # .NET
go build -o bin/app # Go
cargo build --release # Rust
```

**Expected Result**: Build succeeds, artifacts generated correctly

### Runtime Validation
```bash
# Start server and verify functionality
npm run start       # Node.js
java -jar target/app.jar # Java
dotnet run          # .NET
go run main.go      # Go
./bin/app           # Compiled binary
```

**Expected Result**:
- Server starts without errors
- Health checks pass (if configured)
- No runtime exceptions during startup
- UI accessible (if applicable)

### Coverage Check
```bash
# Coverage report generation
npm run test:coverage # Node.js/TypeScript (Jest/NYC)
mvn jacoco:report    # Java (JaCoCo)
dotnet test /p:CollectCoverage=true # .NET
go test -cover ./... # Go
cargo tarpaulin      # Rust
pytest --cov         # Python
```

**Expected Result**: Coverage >80% line coverage, >75% branch coverage

## Quality Gate Failure Handling

### Test Failures
1. Display test output with failures highlighted
2. Analyze failure cause
3. Fix implementation or test
4. Re-run tests until passing
5. Document fix in evidence.md

### Build Failures
1. Display build output with errors
2. Check for common issues:
   - Missing dependencies
   - Configuration errors
   - Version conflicts
3. Fix issues
4. Re-run build until succeeding
5. Document fix in evidence.md

### Linting Failures
1. Display linting output
2. Fix all linting issues
3. Re-run linting until clean
4. Document fix in evidence.md

### Runtime Failures
1. Display runtime logs with errors
2. Check for common issues:
   - Port conflicts
   - Environment variables
   - Missing dependencies
   - Database connection
3. Fix issues
4. Re-run until server starts successfully
5. Document fix in evidence.md

## Quality Standards

### TDD Compliance
- Test-to-Implementation Ratio: ≥ 1:1
- Code Line Ratio: Test lines ≥ Implementation lines
- Coverage Threshold: >80% achieved through actual test execution
- Method Coverage: Every public method must have corresponding test

### Code Quality
- All tests pass
- Code compiles without errors or warnings
- Linting passes with no issues
- No TODO comments in final code
- No stub implementations remaining

### Testing Standards
- Test behavior, not implementation
- Test public interfaces only
- Focused, single-responsibility tests
- Realistic test data
- Clear test names (methodName_scenario_expectedResult)
- Arrange-act-assert pattern

## Evidence Requirements

Document quality gate results in evidence.md:

**For Each Quality Gate Run**:
- Gate level (task/step/integration/final)
- Timestamp
- Status (passed/failed)
- Commands executed
- Output summary
- Issues found (if any)
- Fixes applied (if any)

**Example Evidence Entry**:
```markdown
### Step-Level Quality Gate: Implement User Service

**Timestamp**: 2025-10-11 14:30:00
**Status**: ✅ Passed

**Checks Executed**:
- ✅ Compilation: Success
- ✅ Tests: 12/12 passed
- ✅ Linting: No issues

**Commands**:
```bash
npm run build  # Success
npm test       # 12 tests passed
npm run lint   # No issues
```

**Coverage**: 85% (above threshold)
```

## Tech Stack Specific Gates

Refer to tech stack memory files for additional quality gates:
- `${config.memory.tech-stack}nodejs.md` - Node.js specific gates
- `${config.memory.tech-stack}react.md` - React specific gates
- `${config.memory.tech-stack}nextjs.md` - Next.js specific gates
- `${config.memory.tech-stack}postgresql.md` - PostgreSQL specific gates

## See Also

- `${config.memory.best-practices.tdd}` - TDD methodology and validation
- `${config.memory.best-practices.testing}` - Testing standards
- `${config.memory.practices.implementation.evidence-tracking}` - Evidence documentation standards
