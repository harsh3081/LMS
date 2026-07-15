# Figma Operations Reference

**Category**: Tools / Figma
**Version**: 1.0.0
**Technology-Agnostic**: Yes

---

## Overview

This document provides technology-agnostic reference for common Figma operations via MCP. It describes operation patterns, expected inputs/outputs, and best practices for reliable Figma integration.

---

## Core Operations

### Operation 1: Fetch File Metadata

**Purpose**: Get basic file information and structure

**MCP Tool**: `mcp__figma__get_file`

**Inputs**:

- `file_key` (required): Figma file identifier

**Expected Output**:

```
{
  name: "Design System",
  lastModified: "2025-11-03T10:30:00Z",
  thumbnailUrl: "https://...",
  version: "1234567",
  document: {
    id: "0:0",
    name: "Document",
    type: "DOCUMENT",
    children: [
      { id: "1:2", name: "Page 1", type: "CANVAS" },
      { id: "1:3", name: "Style Guide", type: "CANVAS" }
    ]
  },
  components: { ... },
  styles: { ... }
}
```

**Use Cases**:

- Verify file access
- List available pages
- Get file version for caching
- Identify structure before extraction

---

### Operation 2: Fetch Specific Nodes

**Purpose**: Get detailed information for specific node IDs

**MCP Tool**: `mcp__figma__get_file_nodes`

**Inputs**:

- `file_key` (required): Figma file identifier
- `node_ids` (required): Array of node IDs (e.g., ["1:2", "123:456"])

**Expected Output**:

```
{
  nodes: {
    "1:2": {
      document: {
        id: "1:2",
        name: "Colors",
        type: "FRAME",
        children: [ ... ],
        backgroundColor: { r, g, b, a },
        fills: [ ... ]
      }
    },
    "123:456": { ... }
  }
}
```

**Use Cases**:

- Fetch specific frames (style guide sections)
- Get component details
- Extract properties from known nodes
- Avoid loading entire file

---

### Operation 3: Fetch File Styles

**Purpose**: Get all style definitions (legacy approach)

**MCP Tool**: `mcp__figma__get_file_styles`

**Inputs**:

- `file_key` (required): Figma file identifier

**Expected Output**:

```
{
  styles: {
    "color-id-1": {
      key: "abc123",
      name: "Primary/500",
      styleType: "FILL",
      description: "Primary brand color",
      color: { r, g, b, a }
    },
    "text-id-1": {
      key: "def456",
      name: "Heading 1",
      styleType: "TEXT",
      fontFamily: "Inter",
      fontSize: 48,
      fontWeight: 700,
      lineHeight: { value: 56, unit: "PIXELS" }
    }
  }
}
```

**Use Cases**:

- Extract design tokens from legacy files
- Get typography definitions
- Fetch effect styles (shadows, blur)
- Fallback when variables not available

---

### Operation 4: Fetch File Variables

**Purpose**: Get variable collections (modern design tokens)

**MCP Tool**: `mcp__figma__get_file_variables`

**Inputs**:

- `file_key` (required): Figma file identifier

**Expected Output**:

```
{
  variableCollections: {
    "collection-id-1": {
      id: "collection-id-1",
      name: "Primitives",
      modes: [
        { modeId: "mode-1", name: "Light" },
        { modeId: "mode-2", name: "Dark" }
      ],
      variables: [
        {
          id: "var-1",
          name: "color/primary/500",
          type: "COLOR",
          description: "Primary brand color",
          valuesByMode: {
            "mode-1": { r: 0.231, g: 0.510, b: 0.965, a: 1 },
            "mode-2": { r: 0.376, g: 0.647, b: 0.980, a: 1 }
          }
        }
      ]
    }
  }
}
```

**Use Cases**:

- Extract modern design tokens
- Get light/dark mode variants
- Access semantic variable structure
- Preferred method for token extraction

---

### Operation 5: Fetch Components

**Purpose**: Get component definitions and metadata

**MCP Tool**: `mcp__figma__get_file_components`

**Inputs**:

- `file_key` (required): Figma file identifier

**Expected Output**:

```
{
  components: {
    "comp-id-1": {
      key: "comp-key-1",
      name: "Button/Primary",
      description: "Primary action button",
      componentSetId: "comp-set-1",
      properties: {
        "Size": ["Small", "Medium", "Large"],
        "State": ["Default", "Hover", "Disabled"]
      }
    }
  }
}
```

**Use Cases**:

- Map components to design system
- Extract component tokens
- Identify variants and properties
- Generate component documentation

---

## Operation Patterns

### Pattern 1: Progressive Loading

**Scenario**: Minimize API calls by loading incrementally

**Steps**:

1. **Load file metadata** (lightweight)

   - Get document structure
   - Identify pages and key frames

2. **Load specific nodes** (targeted)

   - Fetch only style guide frames
   - Load component definitions as needed

3. **Load details on demand** (lazy)
   - Variables/Styles when needed
   - Full node details when required

**Benefits**:

- Faster initial load
- Reduced API calls
- Lower memory usage
- Better error isolation

---

### Pattern 2: Comprehensive Extraction

**Scenario**: Extract all design data in one pass

**Steps**:

1. **Load file structure**

   - Get full file with all nodes

2. **Load variables and styles**

   - Fetch all variable collections
   - Fetch all style definitions

3. **Load components**
   - Get all component metadata

**Benefits**:

- Single extraction pass
- Complete data set
- Simplified logic
- Better for caching

**Trade-offs**:

- Slower initial load
- More memory usage
- More API calls
- Larger payload

---

### Pattern 3: Cached Extraction

**Scenario**: Cache results to avoid repeated API calls

**Steps**:

1. **Check cache**

   - Look for cached file data
   - Verify cache version matches file version

2. **Load if cache miss**

   - Fetch from Figma API
   - Store in cache with version

3. **Use cached data**
   - Parse from cache
   - Transform to tokens

**Cache Key Structure**:

```
cache-key: figma-{file_key}-{version}
cache-value: {
  fileData: { ... },
  variables: { ... },
  styles: { ... },
  components: { ... },
  extractedAt: "2025-11-03T10:30:00Z"
}
```

**Benefits**:

- Significantly faster
- Reduced API calls
- Lower rate limit usage
- Offline capability

**Invalidation**:

- File version changes
- Manual refresh requested
- Cache expiry (time-based)

---

## Error Handling Strategies

### Transient Errors

**Symptoms**:

- Network timeouts
- 5xx server errors
- Rate limit exceeded

**Strategy**:

```
1. Detect error type
2. Implement exponential backoff
   - Wait: 1s, 2s, 4s, 8s, 16s
   - Max retries: 5
3. Retry operation
4. Report if all retries fail
```

---

### Authentication Errors

**Symptoms**:

- 401 Unauthorized
- 403 Forbidden
- Invalid token

**Strategy**:

```
1. Detect auth error
2. DO NOT retry (will fail again)
3. Report to user with guidance
4. Request token refresh/validation
5. Exit operation cleanly
```

---

### Not Found Errors

**Symptoms**:

- 404 Not Found
- Invalid file key
- Node doesn't exist

**Strategy**:

```
1. Validate input format first
2. If format valid, report not found
3. Provide user guidance
4. Suggest verification steps
5. Do not retry
```

---

### Partial Failure Handling

**Scenario**: Some operations succeed, others fail

**Strategy**:

```
1. Continue with successful operations
2. Collect failed operations
3. Provide partial results
4. Report failures separately
5. Allow user to retry failures only
```

**Example**:

```
Extracted:
  ✓ Colors (50 tokens)
  ✓ Typography (20 tokens)
  ✗ Spacing (failed: node not found)
  ✓ Shadows (10 tokens)

Status: Partial success (80 tokens extracted, 1 category failed)
```

---

## Data Validation

### Input Validation

**File Key**:

- Format: alphanumeric string
- Length: typically 22 characters
- Pattern: `^[A-Za-z0-9]{22}$`

**Node ID**:

- Format: `{number}:{number}`
- Pattern: `^\d+:\d+$`
- Example: `1:2`, `123:456`

**Validation Pattern**:

```
1. Check input is provided
2. Validate format/pattern
3. Sanitize if needed
4. Reject if invalid
5. Proceed if valid
```

---

### Output Validation

**Color Values**:

- RGB: 0-255 range
- Alpha: 0-1 range
- Hex: Valid hex format (#RRGGBB)

**Typography Values**:

- Font size: > 0
- Font weight: 100-900
- Line height: > 0

**Spacing Values**:

- Value: >= 0 (no negative spacing)
- Unit: Valid CSS unit (px, rem, em)

**Validation Pattern**:

```
1. Extract raw values
2. Validate ranges
3. Transform to target format
4. Validate transformed output
5. Report validation errors
```

---

## Performance Optimization

### 1. Batch Operations

**Pattern**: Group related operations

```
Instead of:
  - Fetch node 1:2
  - Fetch node 1:3
  - Fetch node 1:4

Do:
  - Fetch nodes [1:2, 1:3, 1:4] in single call
```

**Benefits**:

- Fewer API calls
- Lower latency
- Better rate limit usage

---

### 2. Selective Loading

**Pattern**: Only load what you need

```
Instead of:
  - Fetch entire file (heavy)

Do:
  - Fetch file structure (light)
  - Identify style guide page
  - Fetch only that page's nodes
```

**Benefits**:

- Faster responses
- Lower memory usage
- Targeted extraction

---

### 3. Parallel Fetching

**Pattern**: Fetch independent data in parallel

```
Fetch concurrently:
  - Variables
  - Styles
  - Components

All three operations are independent, can run in parallel
```

**Benefits**:

- Faster overall time
- Better resource utilization

**Caution**:

- Watch rate limits
- Ensure error isolation

---

### 4. Response Streaming

**Pattern**: Process data as it arrives

```
1. Fetch file (stream starts)
2. Parse partial response
3. Extract tokens incrementally
4. Provide progress updates
5. Complete when stream ends
```

**Benefits**:

- Faster perceived performance
- Progressive UI updates
- Better user experience

---

## Figma API Limits

### Rate Limiting

**Current Limits** (check Figma docs for updates):

- Personal tokens: 200 requests per minute
- OAuth tokens: Variable based on plan

**Handling Strategy**:

```
1. Track request count
2. Implement rate limiter
3. Queue requests if limit approached
4. Backoff if 429 received
5. Resume after backoff period
```

---

### File Size Limits

**Considerations**:

- Large files (>100MB) may timeout
- Complex files with many nodes load slowly
- Deep nesting can cause parsing issues

**Strategy**:

```
1. Prefer targeted node fetching over full file
2. Implement timeout handling
3. Provide progress feedback for large files
4. Consider pagination for very large datasets
```

---

## Testing Strategies

### Unit Testing

**Mock Figma Responses**:

```
Test scenarios:
- Valid file response
- File not found (404)
- Auth failure (401)
- Rate limit (429)
- Network error (timeout)
- Partial data (missing fields)
```

**Validation Testing**:

```
Test cases:
- Valid color extraction
- Invalid RGB values
- Missing typography properties
- Malformed node structures
- Empty variable collections
```

---

### Integration Testing

**End-to-End Flow**:

```
1. Connect to test Figma file
2. Extract design tokens
3. Generate design system artifacts
4. Validate output formats
5. Verify framework compatibility
```

**Test Files**:

- Create test Figma files with known tokens
- Include edge cases (empty, malformed, complex)
- Test with different Figma versions

---

## Related Documentation

- `mcp-integration.md` - MCP connection and authentication
- `token-extraction.md` - Token extraction patterns
- `framework-integration.md` - CSS framework compatibility

---

**Version**: 1.0.0
**Last Updated**: 2025-11-03
**Status**: Active
