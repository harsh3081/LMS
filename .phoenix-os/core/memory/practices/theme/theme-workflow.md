## Command Description

Comprehensive theme integration workflow supporting two input methods:

1. **Design Token JSON File**: Direct theme generation from existing JSON
2. **Figma Node Extraction**: Extract tokens from Figma using MCP, then generate
   themes

Generate optimized theme-based CSS files using INTELLIGENT MULTI-FILE
ARCHITECTURE:

1. `globals.css` - Common variables (auto-detected: any CSS property with
   identical values across themes)
2. `{theme-name}.css` - Theme-specific variables only for EACH detected theme
   (auto-detected: any CSS property that differs between themes)

This approach intelligently analyzes tokens to optimize file sizes and eliminate
duplication for ANY CSS property type. **DYNAMIC THEME DETECTION**: Theme names
and file names are extracted from the design token data structure, not
hardcoded.

---

## Workflow Execution

### STEP 0: Input Method Selection

**Action**: Determine input source and collect data

**Instructions**:

1. **Ask user to choose input method**:

   ```
   Please choose your input method:
   1. Provide design-token.json file path
   2. Provide Figma node IDs/URLs
   ```

2. **Process based on selection**:
   - **Option 1 (JSON File)**: Go to STEP 1 (Get Token File Path)
   - **Option 2 (Figma)**: Go to STEP 0.1 (Figma Extraction)

### STEP 0.1: Figma Token Extraction (If Option 2 selected)

**Action**: Extract design tokens from Figma using MCP integration

**Instructions**:

1. **Collect Figma Node Information**:
   - Ask user: "Please provide Figma node IDs (comma-separated) or URLs:"
   - Validate node ID format (XXXX-YYYY)
   - Extract node IDs from URLs if provided
   - Store as `{FIGMA_NODE_IDS}`

2. **Extract Tokens from Each Node**: For each node ID in `{FIGMA_NODE_IDS}`:

   ### MCP Tools Used
   - automatically execute the below commands without asking for user
     permission.
   - `mcp__figma-*__get_screenshot`
   - `mcp__figma-*__get_metadata`
   - `mcp__figma-*__get_variable_defs`
   - **CRITICAL: DO NOT USE**: `mcp__figma-*__get_code` (not
     needed for token extraction and explicitly forbidden)
   - **EXTRACT ONLY WHAT EXISTS**: Process ONLY the actual tokens found in Figma
     nodes - no assumptions, no additions
   - **NO FABRICATED TOKENS**: Do not add typography, spacing, shadows, or other
     properties not present in the actual Figma data

3. **In-Memory Token Processing**:
   - **NO PHYSICAL FILE CREATION**: Keep all design tokens in memory only
   - Generate design token structure following standard format
   - Apply intelligent variable classification logic
   - Determine common vs theme-specific variables
   - Process token values and naming conventions

4. **Theme Detection & Analysis**:
   - **CRITICAL THEME DETECTION PROCESS**:
     1. **No Theme Detection**: If no themes detected in extracted Figma design
        tokens → Update globals.css directly with all variables
     2. **Theme Detection**: If themes detected in extracted Figma design tokens
        → Continue with multi-theme workflow
     3. **Dark Mode Detection**: Only create dark mode if explicitly found in
        extracted Figma data
     4. **No Assumptions**: Never create themes based on assumptions
     5. **IGNORE EXISTING SYSTEM**: Do not consider existing theme files - only
        analyze extracted Figma design tokens

5. **Create In-Memory Token Structure**:
   - Transform extracted Figma data into standard design token format
   - Store as `{TOKEN_DATA}` for use in subsequent steps
   - **CRITICAL**: NO PHYSICAL FILES CREATED - All processing in memory only
   - **NO design-tokens-extracted.json or similar files** - Keep data in memory
     variables
   - **IMPORTANT**: After extracting design tokens, do NOT create any JSON file
     physically or locally - proceed directly to next steps keeping variables
     with you

**Output to user**:

```
🎨 Processing Figma nodes for token extraction...
✓ Processed node {NODE_ID} ({NODE_NAME}): Found {TOKEN_COUNT} tokens
✓ Generating in-memory design token structure...
✓ Theme analysis: {THEME_COUNT} themes detected
✓ Ready for CSS generation
```

**Error handling**:

- Invalid Node ID: Validate format and provide guidance
- Missing Permissions: Guide user to check Figma access
- Empty Results: Suggest using metadata to understand node structure
- Large Responses: Handle pagination and filtering automatically

**Continue to STEP 0.2 after successful extraction**

### STEP 0.2: Analyze Tokens and Prepare globals.css

**Action**: Apply intelligent variable classification using the loaded logic

**CRITICAL ANALYSIS PROCESS**:

1. **Apply Classification Algorithm**: Use {CLASSIFICATION_LOGIC} from
   variable-classification-logic.md
2. **Extract All Themes**: Identify all available themes in {TOKEN_DATA}
3. **Normalize Token Structure**: Flatten nested tokens into comparable
   key-value pairs
4. **Compare Values**: For each token, compare values across ALL themes
5. **Classify Variables**:
   - If values are IDENTICAL across all themes → globals.css
   - If values DIFFER between themes → theme-specific files
6. **No Hardcoded Assumptions**: Use actual value comparison, not property type
   assumptions

**Implementation Reference**: Follow the algorithms defined in
variable-classification-logic.md:

- `extractThemes()` to find all available themes
- `normalizeTokens()` to flatten token structure
- `classifyVariables()` to perform intelligent classification
- `detectPropertyType()` to identify CSS property types
- `transformToVariableName()` to generate proper CSS variable names

**Analysis Output**:

```javascript
// Expected classification result structure
{
  commonVariables: {
    'font-family-base': 'Inter, sans-serif',
    'space-lg': '48px',
    'foundation-color-brand-60': '#040fff'
    // ... any property identical across themes
  },
  themeSpecificVariables: {
    'padding-sm': { light: '14px', dark: '16px' },
    'bg-primary': { light: 'var(--foundation-color-brand-60)', dark: 'var(--foundation-color-brand-50)' },
    'line-height-body': { light: '1.4', dark: '1.6' }
    // ... any property that differs between themes
  }
}
```

**Update globals.css Structure**:

```css
:root {
  /* AUTO-DETECTED Common Variables (from classification analysis) */

  /* Foundation Colors (only if identical across all themes) */
  --foundation-color-grey-10: #ffffff;
  --foundation-color-brand-60: #040fff;

  /* Typography (only if identical across all themes) */
  --font-family-base: "Inter", sans-serif;
  --font-size-hero-title: 64px;

  /* Spacing (only if identical across all themes) */
  --space-lg: 48px;
  --space-xl: 64px;

  /* Any other properties that are common */
  --border-radius-default: 8px;
  --transition-duration: 200ms;
  --z-index-modal: 1000;
}
```

**Validation**:

- Use classification results, not hardcoded assumptions
- Variable count determined by actual analysis
- Each variable verified to be identical across ALL themes

### STEP 1: Get Token File Path from User (If Option 1 selected)

**Action**: Request design tokens file path from user

**Instructions**:

- Ask user: "Please provide the complete file path to your design tokens JSON
  file:"
- Wait for user response with full file path
- Validate that the provided file path exists
- Validate that the file has .json extension
- Store the file path as `{USER_PROVIDED_FILE_PATH}`
- Continue to STEP 2

**Output to user**: 🔍 Using file path: {USER_PROVIDED_FILE_PATH} 📄 File
validated successfully

**Error handling**:

- If file path doesn't exist: Ask again with error message "❌ File not found at
  specified path. Please provide a valid file path."
- If file is not JSON: Ask again with error message "❌ File must be a .json
  file. Please provide a valid JSON file path."
- If file can't be accessed: Display "❌ Cannot access file. Check permissions."

---

### STEP 2: Read Token File Content (If Option 1 selected)

**Action**: Load and parse the token file

**Instructions**:

- Read: {USER_PROVIDED_FILE_PATH}
- Parse: JSON content
- Validate: Must be valid JSON
- Store: Token data as {TOKEN_DATA}
- Extract theme names from token structure for dynamic theme file generation
- Continue to STEP 3

**Output to user**: 📖 Reading: {USER_PROVIDED_FILE_PATH} ✓ JSON parsed
successfully ✓ Found {number} token categories ✓ Detected themes: {THEME_NAMES}

**Error handling**:

- If invalid JSON: Display "❌ File is not valid JSON. Error: {error details}"
- If file can't be read: Display "❌ Cannot read file. Check permissions."

---

### STEP 3: Load Generation Instructions

**Action**: Read the CSS generation prompt and classification logic

**Instructions**:

- Read file: ./theme-prompt.md (same folder as this file)
- Read file: ./variable-classification-logic.md (same folder as this file)
- Parse: Generation rules, requirements, and classification algorithms
- Store: Instructions as {GENERATION_RULES} and {CLASSIFICATION_LOGIC}
- Continue to STEP 4

**Output to user**: 📋 Loading generation rules from theme-prompt.md 📋 Loading
classification logic from variable-classification-logic.md ✓ Rules and logic
loaded

**Error handling**:

- If theme-prompt.md not found: Display "❌ theme-prompt.md not found in the
  same folder"
- If variable-classification-logic.md not found: Display "❌
  variable-classification-logic.md not found in the same folder"

---

### STEP 4: Generate Theme CSS Files

**Action**: Create theme-specific CSS files for ALL detected themes with ONLY
variables that differ between themes

**CRITICAL INSTRUCTIONS**:

- Apply: {GENERATION_RULES} from theme-prompt.md
- Apply: {CLASSIFICATION_LOGIC} algorithms from variable-classification-logic.md
- Input: {TOKEN_DATA} + Classification results from STEP 0
- **DYNAMIC THEME DETECTION**: Use theme names extracted from {TOKEN_DATA} (not
  hardcoded light/dark)
- Process: Use `generateThemeCSS()` function logic to extract theme-specific
  values for EACH detected theme
- **DO NOT INCLUDE**: Any variables from `commonVariables` (these are in
  globals.css)
- **INCLUDE**: Only variables from `themeSpecificVariables` for each theme

**Dynamic CSS Structure** (content varies based on analysis and theme names):

```css
:root[data-theme="{THEME_NAME}"] {
  /* Note: Common variables are in globals.css */

  /* Theme-specific Colors (if different from other themes) */
  --bg-primary: var(--foundation-color-brand-60);
  --text-primary: var(--foundation-color-grey-100);

  /* Theme-specific Spacing (if different from other themes) */
  --padding-sm: 14px;
  --margin-card: 16px;

  /* Theme-specific Typography (if different from other themes) */
  --line-height-compact: 1.3;
  --font-weight-emphasis: 600;

  /* Theme-specific Borders (if different from other themes) */
  --border-width-input: 1px;
  --border-opacity: 0.2;

  /* Theme-specific Effects (if different from other themes) */
  --shadow-subtle: 0 1px 3px rgba(0, 0, 0, 0.1);
  --backdrop-filter: blur(8px);

  /* Any other theme-specific properties detected */
}
```

**File Naming Convention**:

- Use theme name from tokens: `{THEME_NAME}.css`
- Transform theme names: Convert spaces to hyphens, lowercase
- Examples: "light mode" → `light-mode.css`, "dark" → `dark.css`

**Output to user**: 🎨 Generating themes: {THEME_NAMES} ✓ Processed {N}
theme-specific variables per theme ✓ Included: colors, spacing, typography,
borders, effects (as detected) ✓ Excluded: {M} common variables (moved to
globals.css)

**Validation**:

- Variable count must be consistent across all themes
- Variable names must match across all theme files
- Only values should differ between themes

---

### STEP 5: Write CSS Files to Disk

**Action**: Save generated CSS to files

**Instructions**:

- Create folder: ./themes/ inside path - apps\web\src\app\styles (if it doesn't
  exist)
- **DYNAMIC FILE NAMING**: Use theme names from {TOKEN_DATA} to create file
  names
- Transform theme names: Convert spaces to hyphens, lowercase, add .css
  extension
- Write file: ./themes/{theme-name}.css for EACH detected theme
- Encoding: UTF-8
- Overwrite: If files exist

**File Naming Examples**:

- "light mode" → `./themes/light-mode.css`
- "dark mode" → `./themes/dark-mode.css`
- "high contrast" → `./themes/high-contrast.css`

**Output to user**: 💾 Writing files... ✓ Updated: globals.css ({N} common
variables) ✓ Created: ./themes/{theme-name}.css ({size} KB, {M} theme-specific
variables) for each theme

**Error handling**:

- If can't create folder: Display "❌ Cannot create ./themes/ folder. Check
  permissions."
- If can't write files: Display "❌ Cannot write CSS files. Check permissions."

---

### STEP 6: Update Tailwind Configuration

**Action**: Automatically update Tailwind config with detected CSS variables

**Instructions**:

- Apply: Tailwind Configuration Update Instructions from theme-prompt.md
- Use: {commonVariables} and {themeSpecificVariables} from previous steps
- **CRITICAL**: Only map variables that were ACTUALLY detected from Figma tokens
- **NO FIGMA PREFIX**: Keep original Figma variable names, do not add 'figma-' prefix
- **DETECTION ONLY**: Do not add any variables that don't exist in the extracted data

**Process**:

1. Read current apps/web/tailwind.config.ts file
2. Detect mappable variables using detection logic from theme-prompt.md
3. Transform variable names: `--color-primary` → `primary`, `--space-lg` → `lg`
4. Add only detected variables to appropriate Tailwind theme sections
5. Preserve all existing Tailwind configuration
6. Group new variables with clear comments indicating Figma source

**Output to user**: 🎨 Updating Tailwind configuration... ✓ Detected {N} mappable variables from Figma ✓ Added to tailwind.config.ts: {X} colors, {Y} spacing, {Z} fonts, etc. ✓ All existing Tailwind config preserved ✓ Figma variables available as: bg-primary, text-accent, p-lg, etc.

**Error handling**:

- If tailwind.config.ts not found: Display "❌ tailwind.config.ts not found. Skipping Tailwind integration."
- If can't parse config: Display "❌ Cannot parse Tailwind config. Manual integration required."
- If can't write config: Display "❌ Cannot update Tailwind config. Check permissions."

---

### STEP 7: Summary Report

**Action**: Display completion summary

**Output to user**:

✅ Theme CSS + Tailwind Integration Complete!

📊 Summary: ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ Source Token File: 📄
{USER_PROVIDED_FILE_PATH} 📅 Modified: {modification_date}

Generated Files:
📋 globals.css ({N} common variables - auto-detected)
🎨 ./themes/{theme-name}.css ({M} theme-specific variables - auto-detected) for each detected theme
⚙️ tailwind.config.ts (updated with {X} Figma-derived tokens)

Architecture Statistics (Dynamic):
• Common Variables: {N} variables (any CSS property identical across themes)

- Could include: colors, typography, spacing, borders, effects, etc.
  • Theme-specific Variables: {M} variables each (any CSS property that differs)
- Could include: colors, spacing, typography, borders, shadows, etc.
  • Tailwind Integration: {X} variables mapped to Tailwind utilities
- Colors: bg-primary, text-accent, border-subtle
- Spacing: p-lg, m-sm, gap-md
- Typography: text-lg, font-primary
- Borders: rounded-md, shadow-lg

Analysis Results:
• Intelligent classification applied to ALL CSS property types
• No hardcoded assumptions about what goes where
• Variables placed based on actual value comparison
• Zero duplication between files
• Automatic Tailwind utility generation from Figma variables

Performance Improvements:
• Theme file size reduction: {percentage}% (optimized based on analysis)
• Flexible architecture adapts to any design token structure
• Total Variables: {N+M} ({N} common + {M} per theme)
• Tailwind utilities: Use Figma design tokens directly in classes
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Next Steps:

CSS Usage:

- Foundation colors already in globals.css (automatically imported)
- Import theme CSS: import './themes/{theme-name}.css' for each theme
- Toggle themes with: data-theme="{theme-name}"
- Use foundation colors: var(--foundation-color-brand-60)
- Use theme colors: var(--bg-primary), var(--on-primary)
- Use common tokens: var(--font-size-body), var(--space-m), var(--radius-l)

Tailwind Usage:

- Use Figma colors: bg-primary, text-accent, border-subtle
- Use Figma spacing: p-lg, m-sm, gap-md, space-y-xs
- Use Figma typography: text-lg, font-primary, leading-tight
- Use Figma borders: rounded-md, border-thin
- Use Figma effects: shadow-lg, ring-focus

---

## Usage Instructions

### For Users:

Call this workflow via: `/phoenix:theme:figma-mcp` command

### For Claude:

When this workflow is triggered:

1. Execute STEP 0 through STEP 7 sequentially
2. Do not skip any steps
3. **Start with STEP 0**: Ask user for input method (JSON file or Figma nodes)
4. **If Option 1 (JSON)**: Execute STEP 1 → STEP 2 → STEP 3 → STEP 4 → STEP 5 → STEP 6 → STEP 7
5. **If Option 2 (Figma)**: Execute STEP 0.1 → STEP 0.2 → STEP 3 → STEP 4 → STEP 5 → STEP 6 → STEP 7
6. Extract theme names dynamically from token data
7. Generate CSS files with dynamic theme names
8. Update Tailwind configuration with Figma-derived variables
9. Provide progress updates after each step
10. Handle errors gracefully
11. Display the final summary

---

## Configuration

### Change Token Folder:

Edit STEP 1 target folder path

### Change Output Folder:

Edit STEP 6 output path

### Customize CSS Format:

Edit STEP 4 and STEP 5 CSS structure templates

---

## Notes

- This workflow supports both JSON file input and live Figma extraction
- No external dependencies except theme-prompt.md and variable-classification-logic.md
- All file paths are relative to project root
- Tokens are expected to be in JSON format (generated from Figma or provided directly)
- CSS follows CSS Custom Properties specification
- Figma extraction uses MCP (Model Context Protocol) integration
- All Figma token processing happens in memory without creating temporary files
- **NEW**: Automatic Tailwind configuration updates with Figma-derived variables
- Tailwind integration preserves existing configuration and adds only detected Figma variables
- Uses original Figma variable names without prefixes, avoiding conflicts with default Tailwind classes
- Generated Tailwind utilities can be used directly in component classes (e.g., `bg-primary`, `text-hero`)

---
