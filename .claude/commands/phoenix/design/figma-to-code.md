---
name: phoenix:design:figma-to-code
description: Generate React components from Figma designs with automatic token mapping and Atomic Design structure
argument-hint: "figma-node-url(s)"
---

You are orchestrating component generation from Figma designs.

**Input**: Figma node URL(s) or ID(s): $1

## Your Task

1. **Validate Input**

   - Parse Figma node IDs/URLs from: $1
   - Validate format: `XXXX-YYYY` or `XXXX:YYYY` or full URLs
   - If invalid, stop with error and format examples

2. **Check MCP Connection**

   - Run: `claude mcp list`
   - If `figma-desktop` not connected:
     - Run: `claude mcp add --transport http figma-desktop http://127.0.0.1:3845/mcp`
     - Verify: `claude mcp list`
   - If connection fails, provide manual setup guidance

3. **Verify Agent**

   - Check `.claude/agents/design/component-generation-keeper.md` exists
   - If missing, stop with error

4. **Delegate to Component Generation Keeper**

   - Use Task tool with `subagent_type: phoenix:component-generation-keeper`
   - Pass node IDs and detected context
   - Agent will:
     - Extract Figma designs
     - Download image assets
     - Map design tokens
     - Identify if component is part of layout or similar components
     - Check component reuse opportunities (existing components)
     - Evaluate if existing components can be tweaked for reuse
     - Generate TypeScript React components
     - Place in atomic structure (primitives/blocks/cards)
     - Update Tailwind config
     - Create responsive analysis
     - Validate outputs

5. **Present Results**

   - Show generated components summary
   - Display quality checks
   - Request user approval before writing files

6. **Handle Approval**
   - On approve: Write all files
   - On preview: Show specific files
   - On modify: Re-invoke agent with changes
   - On cancel: Discard results

## Error Handling

- **Invalid Node ID**: Show format examples and stop
- **MCP Failed**: Provide manual setup steps
- **Agent Missing**: Show expected path
- **Generation Failed**: Display errors and offer retry

Keep responses concise. Delegate actual work to the agent.
