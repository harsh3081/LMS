# Design Commands

This directory contains commands for generating design systems and components from Figma designs.

## Overview

Phoenix OS provides two complementary commands for Figma-to-code workflows:

1. **`generate-from-figma`** - Design System Foundation
2. **`figma-to-code`** - Component Generation

---

## Command Workflow

### Step 1: Generate Design System Foundation

**Command**: `phoenix:design:generate-from-figma`

**Purpose**: Extract design tokens, theme, and global styles from Figma style guide

**Input**: Figma file URL (entire style guide/design system)

**Example**:
```bash
/phoenix:design:generate-from-figma https://www.figma.com/file/abc123/Design-System
```

**Outputs**:
- Design tokens (colors, typography, spacing, etc.)
- Theme CSS files (light/dark modes)
- Global CSS (reset, base, utilities)
- Framework integration configs (Tailwind, etc.)
- TypeScript type definitions

**Output Location**: `apps/{app-name}/src/design-system/`

**Agent**: `phoenix:design-keeper`

**When to Use**:
- Starting a new project
- Setting up design system foundation
- Updating design tokens from Figma
- Adding new themes or brand updates

---

### Step 2: Generate React Components

**Command**: `phoenix:design:figma-to-code`

**Purpose**: Generate React components from Figma component designs with automatic token mapping

**Input**: Figma node URL(s) - specific component frames

**Example**:
```bash
/phoenix:design:figma-to-code https://www.figma.com/file/abc123?node-id=123-456
```

**Outputs**:
- React component files (.tsx)
- Automatic design token mapping
- Atomic Design structure (atoms, molecules, organisms)
- Component tests (if configured)
- Storybook stories (if configured)

**Output Location**:
- Primitives: `packages/ui/components/primitives/`
- Blocks: `packages/ui/components/blocks/`
- Cards: `apps/{app-name}/components/cards/`
- Layouts: `apps/{app-name}/components/layout/`

**Agent**: `phoenix:component-generation-keeper`

**When to Use**:
- After design tokens are established (Step 1)
- Converting Figma components to code
- Building component libraries
- Updating existing components from Figma

---

## Typical Workflow

### Initial Setup (One-Time)

1. **Generate Design System**:
   ```bash
   /phoenix:design:generate-from-figma https://www.figma.com/file/abc123/Design-System
   ```

2. **Review & Apply**:
   - Review generated tokens and themes
   - Integrate into your build system
   - Import theme CSS in your app

### Component Development (Ongoing)

3. **Generate Components**:
   ```bash
   /phoenix:design:figma-to-code https://www.figma.com/file/abc123?node-id=123-456
   ```

4. **Iterate**:
   - Components automatically use design tokens from Step 1
   - Refine and customize generated components
   - Repeat for each Figma component

### Updates (As Needed)

5. **Update Design Tokens**:
   - Re-run `generate-from-figma` to sync token changes
   - Components automatically pick up new token values

6. **Update Components**:
   - Re-run `figma-to-code` for specific components
   - Review diffs and merge changes

---

## Key Differences

| Aspect | generate-from-figma | figma-to-code |
|--------|---------------------|---------------|
| **Purpose** | Design system foundation | Component implementation |
| **Input** | Entire Figma file/style guide | Specific component nodes |
| **Output** | Tokens, themes, CSS | React components |
| **Agent** | design-keeper | component-generation-keeper |
| **Frequency** | Once + occasional updates | Per component + updates |
| **Dependencies** | None | Requires design tokens from Step 1 |

---

## Prerequisites

### MCP Server Connection

Both commands require Figma Desktop MCP server:

```bash
claude mcp add --transport http figma-desktop http://127.0.0.1:3845/mcp
```

### Figma Requirements

- Figma Desktop app installed
- Dev Mode access
- Design files with proper token naming
- Component structure follows Atomic Design

---

## Configuration

### Design System Paths

Default output paths can be customized in your project's Phoenix OS configuration.

### Framework Detection

The `generate-from-figma` command automatically detects your CSS framework:
- Tailwind CSS
- CSS Modules
- Styled Components
- Emotion

And generates appropriate integration files.

---

## See Also

- [Design Keeper Agent](../../../agents/design/design-keeper.md)
- [Component Generation Keeper Agent](../../../agents/design/component-generation-keeper.md)
- [Atomic Design Methodology](../../../memory/practices/component-generation/atomic-design.md)
- [Token Mapping Guide](../../../memory/practices/component-generation/token-mapping.md)
- [Figma MCP Integration](../../../memory/tools/figma/mcp-integration.md)
