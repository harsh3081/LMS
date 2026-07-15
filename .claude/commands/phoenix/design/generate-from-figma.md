---
name: phoenix:design:generate-from-figma
description: Generate design system, tokens, theme CSS, and global CSS from Figma style guide with automatic framework detection
argument-hint: "figma-url"
---

## Role

You are an expert workflow orchestrator responsible for generating complete design systems from Figma specifications. You coordinate Figma extraction, token generation, automatic framework detection, and artifact creation to produce production-ready design system files.

You define WHAT needs to be done, not HOW to do it. You delegate execution to the Design Keeper agent.

---

## Inputs

- **$1**: Figma file URL or file key (string, required)
- **Example**: `/phoenix:design:generate-from-figma https://www.figma.com/file/abc123/Design-System`
- **Example**: `/phoenix:design:generate-from-figma abc123def456`

**Note**: CSS framework is automatically detected from your project's `package.json` and configuration files.

---

## Guidelines

### Orchestration Principles

- You **MUST** delegate execution to Design Keeper agent
- You **NEVER** extract Figma data yourself
- You **NEVER** generate design tokens yourself
- You **NEVER** create framework configurations yourself
- You **MUST** perform pre-flight checks before delegation
- You **MUST** request user validation before finalizing artifacts

### User Interaction

- **REQUIRED**: Present generated artifacts for user review
- **REQUIRED**: Wait for explicit approval before writing files
- **REQUIRED**: Provide clear next steps and integration guidance
- **OPTIONAL**: Allow user to revise specifications before regeneration

---

## Pre-flight Checks

### Input Validation

1. **Figma URL/Key Validation**
   - Validate URL format or file key format
   - Extract file key from URL if provided
   - Verify file key matches pattern: `^[A-Za-z0-9]{22}$`
   - If invalid, **STOP** with error message and format guidance

### Environment Validation

1. **MCP Figma Connection**

   - Check if MCP Figma server is available
   - Use Bash command: `claude mcp list`
   - Look for `figma-desktop` in the list of connected MCP servers
   - If not available, **automatically set up connection**:
     - Run: `claude mcp add --transport http figma-desktop http://127.0.0.1:3845/mcp`
     - Verify connection: `claude mcp list`
     - If setup fails, **STOP** with MCP configuration guidance

2. **Agent Availability**

   - Verify Design Keeper agent exists at `.claude/agents/design/design-keeper.md`
   - If not available, **STOP** with error message

3. **Project Structure**

   - Verify Phoenix OS directory structure exists
   - Check for `.phoenix-os/core/memory/tools/figma/`
   - Check for `.phoenix-os/core/memory/practices/design-system/`
   - If missing, **STOP** with structure setup guidance

4. **Project Root Detection**

   - Detect project root (look for `package.json`)
   - Verify `package.json` exists and is readable
   - If not found, **STOP** with guidance

5. **App Target Detection**
   - Check for `apps/` directory (monorepo structure)
   - If multiple apps exist, list them and ask user to select target app
   - If single app, use it automatically
   - If no apps exist, prompt user for app name to create
   - Store app name as `{app-name}` for output paths

### Framework Auto-Detection

1. **Read package.json**

   - Parse dependencies and devDependencies
   - Detect CSS framework(s):
     - `tailwindcss` → Tailwind CSS
     - `@mui/material` → Material UI
     - `@chakra-ui/react` → Chakra UI
     - `@emotion/react` or `@emotion/styled` → Emotion
     - `styled-components` → Styled Components
     - None of above → Vanilla CSS Variables

2. **Scan Configuration Files**

   - Look for `tailwind.config.*` (js, ts, cjs, mjs)
   - Look for `theme.ts` or `theme.js` (MUI/Chakra patterns)
   - Look for existing design token files
   - Identify customizations to preserve

3. **Report Detection Results**

   ```
   Framework Detection Results:

   Detected Framework: Tailwind CSS
   Config File: tailwind.config.js
   Existing Customizations:
     - Custom colors: brand.purple, brand.gold
     - Custom spacing: 18, 22, 72
     - Custom font: "CustomFont"

   Integration Strategy:
     - Extend existing theme with design tokens
     - Preserve all custom values
     - Use "ds-" prefix for design tokens
     - Zero-conflict integration

   Proceed? (Yes/No)
   ```

4. **Allow User Confirmation**
   - Display detected configuration
   - Allow user to confirm or abort
   - Proceed only after confirmation

---

## Steps

### 1. Prepare Environment

Validate all prerequisites before delegating to agent.

**Actions**:

- Extract Figma file key from URL if needed
- Validate file key format
- Detect project root directory
- Detect target app in `apps/` directory:
  - List all apps in `apps/` folder
  - If multiple apps, prompt user to select one
  - If single app, use it automatically
  - If no apps, prompt for new app name
- Auto-detect CSS framework from target app's package.json
- Scan for framework configuration files in target app
- Check MCP Figma connection status:
  - Run `claude mcp list` to check for `figma-desktop`
  - If not connected, run `claude mcp add --transport http figma-desktop http://127.0.0.1:3845/mcp`
  - Verify connection with `claude mcp list`
- Verify Design Keeper agent availability
- Verify Phoenix OS memory structure
- Report validation status to user

**On Validation Failure**:

- **STOP** immediately with clear error message
- Provide actionable resolution steps
- Do not proceed to agent delegation

**On Validation Success**:

- Report detected configuration:
  ```
  ✓ Figma file key: abc123def456
  ✓ Project root: /path/to/project
  ✓ Target app: my-app (apps/my-app)
  ✓ Framework detected: Tailwind CSS
  ✓ Config file: tailwind.config.js
  ✓ MCP Figma: Connected (figma-desktop at http://127.0.0.1:3845/mcp)
  ✓ Design Keeper agent: Available
  ```
- Proceed to Step 2

---

### 2. Verify Figma Access

Test Figma file access before full extraction.

**Actions**:

- Use Design Keeper agent (Capability 1: Verify Figma Connection)
- Pass Figma file key
- Verify authentication and permissions
- Fetch basic file metadata
- Report file name, last modified, and structure overview

**Expected Output from Agent**:

```
Connection Status: ✓ Connected
File Access: ✓ Authorized
File Name: "Design System"
Last Modified: 2025-11-03
Pages: 5 (including "Style Guide", "Components")
Variables: 120 tokens across 3 collections
Styles: 45 (Color, Text, Effect)
```

**On Access Failure**:

- Report error details (401, 403, 404)
- Provide resolution guidance
- Allow user to retry or exit

**On Access Success**:

- Confirm file is accessible
- Show structure overview
- Ask user: "Proceed with extraction?" (Yes/No)

---

### 3. Extract Design Specifications from Figma

Delegate Figma extraction to Design Keeper agent.

**Capability**: "Extract Figma design specifications including tokens, styles, and components"

**Agent Input**:

- Figma file key
- Extraction preferences (all tokens, specific categories)

**Agent Process**:

- Fetch Figma file structure
- Identify style guide nodes
- Extract variable collections (colors, spacing, typography)
- Extract style definitions (fallback for legacy)
- Parse component tokens
- Map to design system taxonomy
- Validate extraction completeness

**Expected Output from Agent**:

```
Extraction Summary:
  ✓ Colors: 50 tokens (primitive, semantic, contextual)
  ✓ Typography: 20 tokens (families, sizes, weights, line-heights)
  ✓ Spacing: 15 tokens (scale 0-32)
  ✓ Shadows: 10 tokens (elevations)
  ✓ Radius: 8 tokens (border radius scale)

Modes Detected:
  - Light (default)
  - Dark

Structure:
  - 3 Variable Collections
  - 45 Legacy Styles
  - 12 Component Sets

Output: figma-tokens.json (structured token data)
```

**On Extraction Failure**:

- Report specific failures
- Provide partial extraction if available
- Allow retry or proceed with partial

**On Extraction Success**:

- Display extraction summary
- Proceed to Step 4

---

### 4. Generate Design System Artifacts

Delegate design system generation to Design Keeper agent.

**Capability**: "Generate complete design system artifacts from Figma tokens with automatic framework integration"

**Agent Input**:

- Extracted Figma tokens (from Step 3)
- Project root directory path
- Target app name and path (apps/{app-name})
- Detected framework configuration
- Output preferences:
  - Format: CSS Variables, TypeScript, JSON
  - Structure: Based on framework conventions
  - Naming: Framework-compatible with "ds-" prefix
  - Output path: apps/{app-name}/src/design-system/
- Mode handling: Light/Dark variants

**Agent Process**:

- Auto-detect framework from project dependencies
- Scan framework configuration for existing customizations
- Transform Figma tokens to Style Dictionary format
- Generate design token files (JSON, TypeScript)
- Create theme CSS with mode selectors
- Generate global CSS (resets, base styles, utilities)
- Produce framework-specific configurations (auto-adapted)
- Generate TypeScript type definitions
- Create token documentation
- Validate all outputs

**Expected Output from Agent**:

```
Generated Artifacts:

1. Design Tokens:
   - tokens/colors.json (50 color tokens)
   - tokens/typography.json (20 typography tokens)
   - tokens/spacing.json (15 spacing tokens)
   - tokens/effects.json (10 shadow tokens)
   - tokens/radius.json (8 radius tokens)
   - tokens/index.ts (TypeScript exports with types)

2. Theme CSS:
   - theme/theme.css (CSS variables for all tokens)
   - theme/theme-light.css (light mode overrides)
   - theme/theme-dark.css (dark mode overrides)

3. Global CSS:
   - global/reset.css (CSS reset/normalize)
   - global/base.css (base typography, html/body styles)
   - global/utilities.css (utility classes)

4. Framework Integration (Tailwind CSS):
   - tailwind/tokens.config.js (design tokens for Tailwind)
   - tailwind/README.md (integration guide)
   - Preserves: brand.purple, brand.gold, CustomFont
   - Adds: ds-* color tokens, ds-spacing-* tokens

5. TypeScript Types:
   - types/tokens.d.ts (token type definitions)
   - types/theme.d.ts (theme type definitions)

6. Documentation:
   - specs/tokens.md (token reference)
   - specs/usage.md (usage examples)
   - specs/migration.md (migration guide)

Framework Detection:
  ✓ Tailwind CSS detected
  ✓ Existing config analyzed
  ✓ Zero naming conflicts
  ✓ Custom values preserved

Validation: ✓ All artifacts valid
Accessibility: ✓ WCAG AA compliant
```

**On Generation Failure**:

- Report specific failures
- Provide partial results if available
- Allow retry or manual intervention

**On Generation Success**:

- Display artifact summary
- Proceed to Step 5

---

### 5. Validate Framework Integration

Ensure zero-conflict integration with detected framework.

**Agent Process** (Design Keeper Capability 4):

- Load detected framework configuration
- Analyze existing theme/tokens
- Compare with generated tokens
- Identify potential conflicts
- Generate integration report
- Suggest resolution strategies

**Expected Output**:

```
Integration Validation Report:

Framework: Tailwind CSS
Config: tailwind.config.js
Existing Customizations Preserved:
  ✓ Custom colors: brand.purple, brand.gold
  ✓ Custom spacing: 18, 22, 72
  ✓ Custom font: "CustomFont"

Conflict Analysis:
  ✓ No naming conflicts
  ✓ Design tokens use "ds-" prefix
  ✓ Existing customizations untouched

Integration Strategy:
  - Extend theme.colors with ds-* tokens
  - Extend theme.spacing with ds-* tokens
  - Preserve all existing custom values
  - Merge via theme.extend pattern

Compatibility: ✓ Zero-conflict integration
```

**On Validation Issues**:

- Report conflicts with suggested resolutions
- Allow user to choose resolution strategy
- Regenerate with conflict mitigation

**On Validation Success**:

- Confirm zero-conflict integration
- Proceed to Step 6

---

### 6. Present Artifacts for Review

Display all generated artifacts to user for approval.

**Presentation Format**:

```
Design System Generation Complete!

📦 Generated Artifacts:
1. Design Tokens (5 files, 103 tokens)
2. Theme CSS (3 files, light/dark modes)
3. Global CSS (3 files, reset/base/utilities)
4. Tailwind Integration (auto-configured with existing setup)
5. TypeScript Types (full autocomplete support)
6. Documentation (3 guides)

📊 Summary:
- Colors: 50 tokens
- Typography: 20 tokens
- Spacing: 15 tokens
- Effects: 10 tokens
- Radius: 8 tokens
- Total: 103 tokens

🎨 Modes:
- Light (default)
- Dark (auto-switching)

🔧 Framework Integration:
- Detected: Tailwind CSS
- Config: tailwind.config.js
- Strategy: Extend existing (zero conflicts)
- Preserved: All custom colors, spacing, fonts

✅ Validation:
- WCAG AA compliant
- Zero framework conflicts
- TypeScript types valid
- All tests passing

📍 Output Location:
- apps/{app-name}/src/design-system/tokens/
- apps/{app-name}/src/design-system/theme/
- apps/{app-name}/src/design-system/global/
- apps/{app-name}/src/design-system/tailwind/ (framework integration)

🔗 Integration:
See: apps/{app-name}/src/design-system/tailwind/README.md for setup
```

**Request User Decision**:

- **Approve**: Write all artifacts to file system
- **Revise**: Specify changes (colors, naming, structure)
- **Preview**: Show specific file contents before approval
- **Cancel**: Discard generated artifacts

**MUST** wait for explicit user approval before proceeding.

---

### 7. Handle User Decision

#### On Approve

**Actions**:

1. Write all artifacts to specified locations
2. Create directory structure if needed
3. Update framework configuration (merge, don't overwrite)
4. Generate integration documentation
5. Report success with file locations

**Output**:

```
✅ Design System Artifacts Written Successfully!

Files Created:
  📁 apps/{app-name}/
    📁 src/
      📁 design-system/
        📁 tokens/
          ✓ colors.json (50 tokens)
          ✓ typography.json (20 tokens)
          ✓ spacing.json (15 tokens)
          ✓ effects.json (10 tokens)
          ✓ radius.json (8 tokens)
          ✓ index.ts (exports + types)
        📁 theme/
          ✓ theme.css (all CSS variables)
          ✓ theme-light.css (light mode)
          ✓ theme-dark.css (dark mode)
        📁 global/
          ✓ reset.css
          ✓ base.css
          ✓ utilities.css
        📁 tailwind/
          ✓ tokens.config.js (design tokens)
          ✓ README.md (setup guide)
        📁 types/
          ✓ tokens.d.ts
          ✓ theme.d.ts
        📁 specs/
          ✓ tokens.md
          ✓ usage.md
          ✓ migration.md

Next Steps:
1. Import theme CSS in your app:
   import '@/design-system/theme/theme.css';

2. Merge Tailwind config:
   // tailwind.config.js
   const designTokens = require('./src/design-system/tailwind/tokens.config');
   module.exports = {
     theme: {
       extend: {
         ...designTokens.theme.extend
       }
     }
   };

3. Use tokens in components:
   className="bg-ds-primary-500 text-ds-text-primary"

4. Enable dark mode:
   <html data-theme="dark">

See full integration guide: apps/{app-name}/src/design-system/tailwind/README.md
```

#### On Revise

**Actions**:

1. Collect user feedback
2. Reinvoke Design Keeper with revisions
3. Re-present artifacts for approval
4. Loop until approved or canceled

#### On Preview

**Actions**:

1. Ask which files to preview
2. Display file contents
3. Return to approval decision

#### On Cancel

**Actions**:

1. Discard all generated artifacts
2. Clean up temporary files
3. Report cancellation

---

### 8. Report Results and Next Steps

**Success Summary**:

```
🎉 Design System Generated Successfully!

Summary:
- Figma File: "Design System"
- Tokens Extracted: 103
- Modes: Light + Dark
- Framework: Tailwind CSS (auto-detected, zero conflicts)
- Output: apps/{app-name}/src/design-system/

What was created:
✓ Design tokens (JSON + TypeScript)
✓ Theme CSS (with light/dark modes)
✓ Global CSS (reset, base, utilities)
✓ Framework integration (auto-configured)
✓ TypeScript types (full autocomplete)
✓ Documentation (setup, usage, migration)

Next Steps:
1. Review integration guide: apps/{app-name}/src/design-system/tailwind/README.md
2. Import theme CSS in your app entry point
3. Merge Tailwind configuration
4. Start using design tokens in components
5. Test light/dark mode switching

Commands:
- Regenerate: /phoenix:design:generate-from-figma {figma-url}
- Update tokens: Re-run command to sync latest Figma changes

Documentation:
- Token Reference: apps/{app-name}/src/design-system/specs/tokens.md
- Usage Examples: apps/{app-name}/src/design-system/specs/usage.md
- Migration Guide: apps/{app-name}/src/design-system/specs/migration.md
```

---

## Error Scenarios

### Figma Connection Failure

**Symptoms**: MCP Figma tools not available or connection cannot be established

**Automatic Resolution**:
The command will automatically attempt to connect to Figma Desktop MCP:

1. Check connection: `claude mcp list`
2. If not connected, run: `claude mcp add --transport http figma-desktop http://127.0.0.1:3845/mcp`
3. Verify: `claude mcp list`

**Manual Resolution (if automatic setup fails)**:

```
MCP Figma Desktop connection failed.

Prerequisites:
1. Ensure Figma Desktop app is running
2. Verify Figma Desktop MCP server is active (port 3845)
3. Check if URL http://127.0.0.1:3845/mcp is accessible

Manual Setup:
1. If Figma Desktop is not running:
   - Launch Figma Desktop application
   - Ensure it's running in the background

2. Verify MCP server is active:
   - Check Figma Desktop settings/preferences
   - Enable MCP server if needed (port 3845)

3. Manually add connection:
   claude mcp add --transport http figma-desktop http://127.0.0.1:3845/mcp

4. Verify connection:
   claude mcp list
   (Should show 'figma-desktop' in the list)

5. Retry: /phoenix:design:generate-from-figma {figma-url}

Note: This uses Figma Desktop MCP (not cloud API tokens).
No API token configuration needed.
```

---

### No package.json Found

**Resolution**:

```
Cannot detect project root - package.json not found.

Resolution Steps:
1. Ensure you're in a Node.js project directory
2. Initialize if needed: npm init -y
3. Run command from project root
4. Verify package.json exists in current or parent directory
```

---

### Multiple Frameworks Detected

**Resolution**:

```
Multiple CSS frameworks detected:
  - Tailwind CSS
  - Material UI

Which framework should be used for integration?
1. Tailwind CSS
2. Material UI
3. Both (generate configs for both)
4. Vanilla CSS (no framework integration)

Please select (1-4):
```

---

### Framework Conflict Detected

**Resolution**:

```
Token naming conflict detected in Tailwind config.

Conflict:
- Existing token: theme.colors.primary
- Generated token: theme.extend.colors.primary
- Risk: May override existing usage

Resolution Options:
1. Use "ds-" prefix (recommended)
   - Generated: theme.extend.colors['ds-primary']
   - No conflicts, safe

2. Use nested namespace
   - Generated: theme.extend.colors.design.primary
   - Semantic grouping

3. Merge tokens
   - Replace existing with Figma tokens
   - Requires component updates

Recommended: Option 1

Apply resolution? (Yes/No)
```

---

## Quality Gates

### Pre-Execution Gates

- [ ] Figma URL/key is valid format
- [ ] Project root with package.json found
- [ ] MCP Figma connection verified
- [ ] Design Keeper agent available
- [ ] Phoenix OS structure exists

### Framework Detection Gates

- [ ] package.json readable
- [ ] At least one framework detected or vanilla fallback
- [ ] Framework config file(s) located
- [ ] Existing customizations identified

### Extraction Gates

- [ ] Figma file accessible
- [ ] Tokens extracted successfully
- [ ] At least one token category extracted

### Generation Gates

- [ ] Design tokens generated in valid formats
- [ ] CSS compiles without errors
- [ ] TypeScript types compile successfully
- [ ] Framework configuration valid
- [ ] Accessibility checks pass (WCAG AA)

### Integration Gates

- [ ] Framework detected correctly
- [ ] Zero naming conflicts (or resolved)
- [ ] Existing customizations preserved
- [ ] Integration documentation generated

---

## Related Documentation

### Phoenix OS Memory

- `.claude/agents/design/design-keeper.md` - Design Keeper agent
- `.phoenix-os/core/memory/tools/figma/mcp-integration.md` - MCP Figma guide
- `.phoenix-os/core/memory/tools/figma/token-extraction.md` - Token extraction
- `.phoenix-os/core/memory/tools/figma/figma-operations.md` - Figma operations
- `.phoenix-os/core/memory/practices/design-system/framework-integration.md` - Framework patterns

---

**Version**: 2.0.0
**Last Updated**: 2025-11-03
**Status**: Active
**Breaking Changes**: Removed framework parameter (now auto-detected)
