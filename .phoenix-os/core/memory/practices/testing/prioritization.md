# Test Prioritization

This document defines how to prioritize coverage gaps and test generation in Phoenix OS.

## Prioritization Framework

### Priority Levels

**P0 - Critical (Must Test)**:
- Core business logic
- Payment/transaction code
- Authentication/authorization
- Data validation
- Security-sensitive functions

**P1 - High (Should Test)**:
- User-facing components
- State management
- API integrations
- Form handling
- Error handling

**P2 - Medium (Consider Testing)**:
- Utility functions
- Formatting helpers
- UI components (presentational)
- Navigation logic

**P3 - Low (Optional)**:
- Simple getters/setters
- Configuration files
- Type definitions
- Pure presentation components

## Coverage Gap Analysis

### Identify Gaps
```bash
# Files with zero coverage
cat coverage/coverage-summary.json | jq -r '
  to_entries |
  .[] |
  select(.key != "total") |
  select(.value.lines.pct == 0) |
  .key
'

# Files below threshold
cat coverage/coverage-summary.json | jq -r '
  to_entries |
  .[] |
  select(.key != "total") |
  select(.value.lines.pct < 80) |
  "\(.key): \(.value.lines.pct)%"
'
```

### Sort by Impact
```bash
# Sort by uncovered lines (most impactful first)
cat coverage/coverage-summary.json | jq -r '
  to_entries |
  .[] |
  select(.key != "total") |
  select(.value.lines.pct < 100) |
  {
    file: .key,
    uncovered: (.value.lines.total - .value.lines.covered),
    pct: .value.lines.pct
  }
' | jq -s 'sort_by(-.uncovered)'
```

## Component Prioritization

### React Components
1. **Container components** - Business logic, state management
2. **Form components** - User input, validation
3. **Interactive components** - Buttons, modals, dropdowns
4. **Presentational components** - Display only

### Utility Functions
1. **Validation functions** - Data integrity
2. **Transformation functions** - Data processing
3. **Calculation functions** - Business rules
4. **Formatting functions** - Display helpers

## File Type Priority

### By File Extension
```yaml
priority:
  high:
    - "*.service.ts"     # Service layer
    - "*.utils.ts"       # Utilities
    - "*.hook.ts"        # Custom hooks
    - "*.context.ts"     # Context providers
  medium:
    - "*.component.tsx"  # React components
    - "*.container.tsx"  # Container components
  low:
    - "*.types.ts"       # Type definitions
    - "*.constants.ts"   # Constants
    - "*.config.ts"      # Configuration
```

### By Directory
```yaml
priority:
  high:
    - src/services/
    - src/utils/
    - src/hooks/
  medium:
    - src/components/
    - src/pages/
  low:
    - src/types/
    - src/constants/
```

## Batch Processing Strategy

### Phase 1: Quick Wins
- Files with highest coverage gap
- Simple utility functions
- Standalone components

### Phase 2: Core Logic
- Business logic functions
- State management
- API integration layers

### Phase 3: Component Coverage
- User-facing components
- Interactive elements
- Form handling

### Phase 4: Edge Cases
- Error handling
- Boundary conditions
- Accessibility

## Selection Criteria

### Include in Batch
- Files below coverage threshold
- Files with business logic
- Files with user interactions
- Files modified recently

### Exclude from Batch
- Generated files
- Type definition files
- Configuration files
- Third-party wrappers

## Coverage Target Strategy

### Incremental Approach
```yaml
rounds:
  round_1:
    target: 60%
    focus: "Core business logic"
  round_2:
    target: 70%
    focus: "User-facing components"
  round_3:
    target: 80%
    focus: "Remaining gaps"
```

### Files Per Batch
- Maximum 5-10 files per generation batch
- Group related files together
- Balance complexity across batch

## Gap Report Format

```markdown
## Coverage Gap Analysis

### Priority 0 (Critical)
| File | Current | Target | Gap |
|------|---------|--------|-----|
| auth.service.ts | 45% | 90% | -45% |

### Priority 1 (High)
| File | Current | Target | Gap |
|------|---------|--------|-----|
| UserForm.tsx | 60% | 80% | -20% |

### Summary
- Total files below threshold: N
- Total uncovered lines: N
- Estimated tests needed: N
```

---

**Version**: 1.0.0
**Last Updated**: 2025-11-25
**Status**: Active
