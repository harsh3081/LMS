# Figma MCP Integration

**Category**: Tools / Figma
**Version**: 1.0.0
**Technology**: MCP (Model Context Protocol)

---

## Overview

This document provides technology-agnostic guidance for integrating with Figma through the Model Context Protocol (MCP). It covers connection establishment, authentication verification, and best practices for reliable Figma API access.

**Important**: This layer is technology-agnostic. Specific implementation details should reference tech-stack memory files.

---

## MCP Figma Server

### What is MCP?

Model Context Protocol (MCP) provides a standardized way to connect AI assistants with external tools and services. The MCP Figma server enables programmatic access to Figma files, nodes, and design data.

### Figma Desktop MCP

Phoenix OS uses **Figma Desktop MCP** which connects directly to the Figma Desktop application running on your machine. This provides:

- Local access to Figma files without API tokens
- Direct integration with Figma Desktop app
- Real-time access to design data
- HTTP transport via `http://127.0.0.1:3845/mcp`

**Connection Setup**:

```bash
# Check current connections
claude mcp list

# Add Figma Desktop connection
claude mcp add --transport http figma-desktop http://127.0.0.1:3845/mcp

# Verify connection
claude mcp list
```

### Available MCP Tools

The MCP Figma Desktop server provides these tools:

- `mcp__figma-desktop__get_design_context` - Generate UI code for a node
- `mcp__figma-desktop__get_variable_defs` - Get variable definitions
- `mcp__figma-desktop__get_code_connect_map` - Get code component mappings
- `mcp__figma-desktop__get_screenshot` - Generate node screenshots
- `mcp__figma-desktop__get_metadata` - Get node/page metadata in XML
- `mcp__figma-desktop__add_code_connect_map` - Map Figma nodes to code components
- `mcp__figma-desktop__create_design_system_rules` - Generate design system rules
- `mcp__figma-desktop__get_figjam` - Get FigJam node data

---

## Connection Verification

### Pre-flight Checks

Before executing any Figma operations, verify:

1. **MCP Server Status**

   - Check if Figma Desktop MCP is connected: `claude mcp list`
   - Look for `figma-desktop` in the list
   - If not connected, add automatically: `claude mcp add --transport http figma-desktop http://127.0.0.1:3845/mcp`
   - Verify connection: `claude mcp list`

2. **Figma Desktop App Status**

   - Ensure Figma Desktop application is running
   - Verify MCP server is active in Figma Desktop (port 3845)
   - No API token needed (uses local app connection)

3. **File Access**
   - File must be open or accessible in Figma Desktop
   - Verify node IDs if accessing specific nodes
   - Check file permissions in Figma Desktop app

### Connection Verification Pattern

```
Step 1: Check MCP Connection
- Command: claude mcp list
- Expected: 'figma-desktop' appears in list
- If not found: Run 'claude mcp add --transport http figma-desktop http://127.0.0.1:3845/mcp'
- Verify: Run 'claude mcp list' again

Step 2: Verify Figma Desktop App
- Check: Figma Desktop application is running
- Check: MCP server is active (port 3845)
- If not running: Launch Figma Desktop app

Step 3: Test MCP Tools Availability
- Check available tools with tool listing
- Expected: mcp__figma-desktop__* tools available
- Failure: Figma Desktop not running or MCP not enabled

Step 4: Test Basic Connectivity
- Use: mcp__figma-desktop__get_metadata (if file open)
- Expected: File/node metadata
- Failure: File not accessible or app not responding
```

---

## Error Handling

### Common Error Scenarios

#### 1. MCP Server Not Connected

**Symptom**: `claude mcp list` doesn't show `figma-desktop`

**Automatic Resolution**:

```bash
# Add Figma Desktop MCP connection
claude mcp add --transport http figma-desktop http://127.0.0.1:3845/mcp

# Verify connection
claude mcp list
```

**Manual Resolution** (if automatic fails):

```
MCP Figma Desktop is not connected.

Prerequisites:
1. Ensure Figma Desktop app is installed and running
2. Verify Figma Desktop MCP server is enabled (port 3845)

Manual Setup:
1. Launch Figma Desktop application

2. Check MCP server status in Figma Desktop
   - Go to Figma Desktop settings/preferences
   - Look for MCP or Developer settings
   - Enable MCP server if available

3. Add connection manually:
   claude mcp add --transport http figma-desktop http://127.0.0.1:3845/mcp

4. Verify:
   claude mcp list

Note: No API token needed - uses local Figma Desktop connection
```

#### 2. Figma Desktop Not Running

**Symptom**: MCP connection exists but tools fail or timeout

**Resolution**:

- Ensure Figma Desktop application is running
- Check if MCP server is active on port 3845
- Verify no firewall blocking localhost:3845

**User Guidance**:

```
Figma Desktop app is not running or MCP server is inactive.

Resolution:
1. Launch Figma Desktop application
2. Keep it running in the background
3. Retry the operation

Check MCP server:
- Figma Desktop should have MCP enabled
- Default port: 3845
- No manual configuration usually needed
```

#### 3. File Not Accessible

**Symptom**: Cannot access specific Figma file or nodes

**Resolution**:

- Ensure file is open or accessible in Figma Desktop
- Verify you have view permissions for the file
- Check if file is in your recent files or shared with you

**User Guidance**:

```
Figma file not accessible in Desktop app.

Resolution:
1. Open the file in Figma Desktop application
2. Ensure you're logged into Figma Desktop
3. Verify you have view access to the file
4. Check if file is in your account or properly shared
5. Retry the operation
```

#### 4. Invalid Node ID

**Symptom**: Node-specific operations fail

**Resolution**:

- Verify node ID format (e.g., "1:2", "123:456")
- Check if node exists in the file
- Ensure you're using the correct node ID

**User Guidance**:

```
Invalid or inaccessible node ID.

Resolution:
1. Verify node ID format: "number:number"
2. Check if node exists in Figma Desktop
3. Try accessing parent page/frame first
4. Use metadata tool to explore file structure
```

---

## Figma File Structure

### File Key Extraction

Figma file URLs follow this pattern:

```
https://www.figma.com/file/{file-key}/{file-name}
https://www.figma.com/design/{file-key}/{file-name}
```

Extract file key from URL:

- Pattern: Match after `/file/` or `/design/` until next `/`
- Example: `abc123def456` from `https://www.figma.com/file/abc123def456/My-Design`

### Node ID Format

Figma node IDs follow patterns like:

```
1:2        (page node)
1:3        (frame node)
123:456    (component node)
```

Node IDs are hierarchical and can be used to fetch specific nodes via MCP.

---

## Design Token Extraction

### Variable Collections

Modern Figma files use Variables for design tokens:

- Access via `mcp__figma__get_file_variables`
- Returns collections with modes (light/dark themes)
- Includes: colors, numbers (spacing/sizing), strings, booleans

### Variable Structure

```
Collection:
  - Name: "Primitives" | "Semantic" | "Component"
  - Modes: ["Light", "Dark"]
  - Variables:
    - Name: "color/primary/500"
    - Type: COLOR | FLOAT | STRING | BOOLEAN
    - Value: Per-mode values
    - Description: Token documentation
```

### Legacy Styles

Older Figma files use Styles instead of Variables:

- Access via `mcp__figma__get_file_styles`
- Includes: color styles, text styles, effect styles, grid styles
- Less flexible than Variables (no modes)

### Extraction Strategy

1. **Prefer Variables**: Check for variable collections first
2. **Fallback to Styles**: Use styles if variables not present
3. **Hybrid Approach**: Some files use both (prefer variables)
4. **Documentation**: Extract descriptions for token context

---

## Best Practices

### 1. Connection Management

- **Verify before every operation**: Don't assume connection persists
- **Cache file metadata**: Avoid repeated API calls for same data
- **Handle transient failures**: Retry with exponential backoff

### 2. Rate Limiting

- Figma API has rate limits (check current limits in docs)
- Batch requests when possible
- Cache responses to minimize calls
- Use node-specific queries vs full file fetches

### 3. Data Validation

- **Validate response structure**: API responses can change
- **Handle missing fields**: Not all nodes have all properties
- **Type checking**: Ensure expected data types before processing
- **Null safety**: Check for null/undefined before access

### 4. Error Recovery

- **Graceful degradation**: Provide partial results on failure
- **Clear error messages**: Explain what failed and why
- **Actionable guidance**: Tell user how to fix issues
- **Fallback strategies**: Have alternative approaches when primary fails

### 5. Security

- **Never log tokens**: Redact authentication tokens from logs
- **Validate file keys**: Ensure file keys are well-formed before API calls
- **Permission checking**: Verify access before processing sensitive data

---

## Integration Patterns

### Pattern 1: Verify-Then-Execute

```
1. Verify MCP connection
   - ListMcpResourcesTool → Check for Figma tools
   - Exit early if not available

2. Verify file access
   - mcp__figma__get_file → Test with file key
   - Exit early if unauthorized

3. Execute operation
   - Proceed with extraction/generation
   - Handle errors gracefully
```

### Pattern 2: Progressive Enhancement

```
1. Attempt Variables extraction (modern approach)
   - mcp__figma__get_file_variables
   - Success: Use variable collections

2. Fallback to Styles (legacy approach)
   - mcp__figma__get_file_styles
   - Success: Use style definitions

3. Manual extraction (if both fail)
   - Parse nodes directly from file structure
   - Extract properties from component definitions
```

### Pattern 3: Incremental Fetch

```
1. Fetch file metadata (lightweight)
   - Get document structure
   - Identify pages and top-level frames

2. Fetch specific nodes (targeted)
   - Only fetch style guide nodes
   - Avoid loading entire file

3. Extract tokens (focused)
   - Process only relevant nodes
   - Transform to design token format
```

---

## MCP Tool Usage Examples

### Example 1: List Available Resources

```
Tool: ListMcpResourcesTool
Parameters: { server: "figma" } (optional)
Expected Output:
- List of mcp__figma__* tools
- Server connection status
```

### Example 2: Fetch File Structure

```
Tool: mcp__figma__get_file
Parameters: { file_key: "abc123def456" }
Expected Output:
- File name and metadata
- Document structure (pages, nodes)
- Styles and components references
```

### Example 3: Fetch Variables

```
Tool: mcp__figma__get_file_variables
Parameters: { file_key: "abc123def456" }
Expected Output:
- Variable collections
- Modes (light/dark)
- Variable definitions with values per mode
```

---

## Troubleshooting Guide

### Issue: "MCP tools not available"

**Check**: Claude Code MCP configuration
**Fix**: Configure MCP Figma server with API token

### Issue: "401 Unauthorized"

**Check**: Figma API token validity
**Fix**: Generate new token with appropriate scopes

### Issue: "403 Forbidden"

**Check**: User has file access in Figma
**Fix**: Request access from file owner

### Issue: "404 Not Found"

**Check**: File key is correct
**Fix**: Verify URL and extract correct file key

### Issue: "Rate limit exceeded"

**Check**: Number of API calls
**Fix**: Implement caching, batch requests, add delays

### Issue: "Incomplete data"

**Check**: Node IDs and structure
**Fix**: Fetch parent nodes, verify file organization

---

## Configuration Reference

### Figma Desktop MCP Connection

Phoenix OS uses Figma Desktop MCP which connects via HTTP transport:

**Connection Command**:

```bash
# Add Figma Desktop MCP
claude mcp add --transport http figma-desktop http://127.0.0.1:3845/mcp

# Verify connection
claude mcp list
```

**Connection Details**:

- **Name**: `figma-desktop`
- **Transport**: HTTP
- **URL**: `http://127.0.0.1:3845/mcp`
- **Port**: 3845 (default Figma Desktop MCP port)
- **Authentication**: None (uses local Figma Desktop session)

**Prerequisites**:

1. Figma Desktop application installed
2. Figma Desktop running on your machine
3. MCP server enabled in Figma Desktop (usually enabled by default)

**No API Token Required**:

- Figma Desktop MCP uses local app connection
- No need to generate or configure API tokens
- Authentication handled by Figma Desktop login

---

## Related Documentation

### Phoenix OS Memory

- `token-extraction.md` - Token extraction patterns
- `figma-operations.md` - Figma API operations reference

### External Resources

- Figma API Documentation: https://www.figma.com/developers/api
- MCP Specification: https://modelcontextprotocol.io
- MCP Figma Server: https://github.com/modelcontextprotocol/servers/tree/main/src/figma

---

**Version**: 1.0.0
**Last Updated**: 2025-11-03
**Status**: Active
