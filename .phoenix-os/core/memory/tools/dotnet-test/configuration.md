# .NET Test Configuration Detection

This document defines how to detect and read existing .NET test configuration in Phoenix OS.

Coverage operations are defined in `coverage-operations.md`.

**Stack**: dotnet
**Test Framework**: xUnit (default), NUnit, MSTest

---

## Configuration File Detection

### Priority Order
1. `*.csproj` — C# project files (look for test framework references)
2. `*.sln` — Solution file (identifies project structure)
3. `.runsettings` — Test run settings
4. `Directory.Build.props` — Shared build properties

### Detect Configuration
```bash
# Check for .NET solution
ls *.sln 2>/dev/null && echo ".NET solution found"

# Check for test projects
find . -name "*.Tests.csproj" -o -name "*.Test.csproj" 2>/dev/null

# Check test framework in csproj
grep -r "xunit\|nunit\|mstest" *.csproj 2>/dev/null

# Check for coverlet
grep -r "coverlet" *.csproj 2>/dev/null

# Check .NET SDK version
dotnet --version
```

## Standard Paths

### Test File Locations
- `*.Tests/` — Test project directory (e.g., `MyApp.Tests/`)
- `Tests/` — Alternative test project directory
- `*Tests.cs` / `*Test.cs` — Test class naming convention

---

**Version**: 1.0.0
**Last Updated**: 2026-05-26
**Status**: Active
