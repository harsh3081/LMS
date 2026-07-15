# Theme CSS Generation Instructions

You are a CSS theme generator. Follow these rules precisely.

---

## Input

- **File**: JSON design tokens (from Figma or other design tools)
- **Format**: Design tokens in JSON format with nested structure

---

## Output

Generate THREE separate CSS files with optimized variable distribution:

1. **globals.css** - Common variables shared across all themes (foundation
   colors, typography, spacing, radius)
2. **light.css** - Light theme-specific color mappings only
3. **dark.css** - Dark theme-specific color mappings only

---

## CSS Generation Rules

### 1. Variable Naming Convention

**Format**: `--{category}-{token-name}`

**Examples**:

```css
/* Colors */
--color-primary: #value;
--color-primary: #value;

/* Typography */
--font-family-base: value;
--font-family-base: value;

/* Spacing */
--space-md: value;
--space-md: value;
```

**Token Name Transformation**:

- Convert camelCase to kebab-case
- Convert spaces to hyphens
- Lowercase all names
- Remove special characters

**Examples**:

- backgroundColor → background-color
- fontSize16 → font-size-16
- Primary Color → primary-color

### 2. CSS Structure

Template for each file:

```css
/**
 * Theme: {THEME_NAME}
 * Generated from: {SOURCE_FILE}
 * Date: {GENERATION_DATE}
 */

:root[data-theme="{theme-name}"] {
  /* ============================================
     COLORS
     ============================================ */

  /* Primary Colors */
  --color-primary: {value};
  --color-primary-hover: {value};
  --color-primary-active: {value};

  /* Secondary Colors */
  --color-secondary: {value};

  /* Neutrals */
  --color-background: {value};
  --color-surface: {value};
  --color-text: {value};

  /* Status Colors */
  --color-success: {value};
  --color-warning: {value};
  --color-error: {value};
  --color-info: {value};


  /* ============================================
     TYPOGRAPHY
     ============================================ */

  /* Font Families */
  --font-family-base: {value};
  --font-family-heading: {value};
  --font-family-mono: {value};

  /* Font Sizes */
  --font-size-xs: {value};
  --font-size-sm: {value};
  --font-size-md: {value};
  --font-size-lg: {value};
  --font-size-xl: {value};

  /* Font Weights */
  --font-weight-normal: {value};
  --font-weight-medium: {value};
  --font-weight-bold: {value};

  /* Line Heights */
  --line-height-tight: {value};
  --line-height-normal: {value};
  --line-height-loose: {value};


  /* ============================================
     SPACING
     ============================================ */

  --space-xs: {value};
  --space-sm: {value};
  --space-md: {value};
  --space-lg: {value};
  --space-xl: {value};
  --space-2xl: {value};


  /* ============================================
     BORDERS
     ============================================ */

  /* Border Widths */
  --border-width-thin: {value};
  --border-width-normal: {value};
  --border-width-thick: {value};

  /* Border Radius */
  --border-radius-sm: {value};
  --border-radius-md: {value};
  --border-radius-lg: {value};
  --border-radius-full: {value};

  /* Border Colors */
  --border-color-default: {value};
  --border-color-subtle: {value};


  /* ============================================
     SHADOWS
     ============================================ */

  --shadow-sm: {value};
  --shadow-md: {value};
  --shadow-lg: {value};
  --shadow-xl: {value};


  /* ============================================
     Z-INDEX
     ============================================ */

  --z-index-dropdown: {value};
  --z-index-modal: {value};
  --z-index-tooltip: {value};
  --z-index-notification: {value};


  /* ============================================
     TRANSITIONS
     ============================================ */

  --transition-fast: {value};
  --transition-normal: {value};
  --transition-slow: {value};


  /* ============================================
     BREAKPOINTS (if applicable)
     ============================================ */

  --breakpoint-sm: {value};
  --breakpoint-md: {value};
  --breakpoint-lg: {value};
  --breakpoint-xl: {value};
}
```

### 3. Value Processing Rules

**Colors**:

- Convert to hex format (#RRGGBB or #RRGGBBAA)
- If rgba format, convert to hex with alpha
- Preserve color names if semantic (e.g., "transparent", "currentColor")

**Sizes (font-size, spacing, etc.)**:

- Convert to rem or px
- If token has unit, keep it
- If no unit, assume px and add unit
- Example: 16 → 16px or 1rem

**Font Families**:

- Wrap in quotes if contains spaces
- Example: Roboto → "Roboto" or 'Roboto'
- Multiple fonts: "Roboto", sans-serif

**Shadows**:

- Combine offset-x, offset-y, blur, spread, color
- Format: {offset-x} {offset-y} {blur} {spread} {color}
- Example: 0 2px 4px 0 rgba(0,0,0,0.1)

**Transitions**:

- Format: {property} {duration} {timing-function}
- Example: all 0.3s ease-in-out

### 4. Token Detection Rules

How to identify Light vs Dark tokens:

**Check for explicit theme property**:

```json
{
  "theme": "light",
  "color": {
    "primary": "#000"
  }
}
```

**Check for mode/theme nesting**:

```json
{
  "light": {
    "color": {...}
  },
  "dark": {
    "color": {...}
  }
}
```

**Check for semantic naming**:

- Light indicators: "light", "day", "default"
- Dark indicators: "dark", "night", "alternative"

**If no theme specified**:

- Use same tokens for both themes
- Or ask user for clarification

### 5. Categories to Process

Process ALL of these categories if present in tokens:

✅ Colors (primary, secondary, accent, neutrals, semantic) ✅ Typography
(families, sizes, weights, line-heights, letter-spacing) ✅ Spacing (margins,
paddings, gaps) ✅ Borders (widths, radius, colors, styles) ✅ Shadows
(box-shadow, text-shadow) ✅ Effects (opacity, blur, transforms) ✅ Z-index
(layering values) ✅ Transitions (durations, timing functions) ✅ Breakpoints
(responsive design values) ✅ Grid (columns, gutters) ✅ Custom tokens (any
other design tokens)

### 6. Comments and Organization

- **Section headers**: Use comment blocks for each category
- **Grouping**: Group related variables together
- **Alphabetical order**: Within groups, sort alphabetically
- **Inline comments**: Add brief descriptions for complex values

Example:

```css
/* Primary brand colors for main UI elements */
--color-primary: #2563eb;
--color-primary-hover: #1d4ed8; /* Darker shade for hover state */
```

### 7. Special Cases

**Gradients**:

```css
--gradient-primary: linear-gradient(90deg, #start 0%, #end 100%);
```

**Multiple box shadows**:

```css
--shadow-elevated: 0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06);
```

**Calc expressions (if needed)**:

```css
--container-width: calc(100% - 2rem);
```

**CSS functions (if applicable)**:

```css
--color-overlay: hsl(0, 0%, 0%, 0.5);
```

### 8. File Headers

Each CSS file must start with:

```css
/**
 * ============================================
 * {THEME_NAME} Theme
 * ============================================
 *
 * Generated from: {SOURCE_TOKEN_FILE}
 * Generation date: {DATE}
 *
 * Usage:
 * <html data-theme="light"> or <html data-theme="dark">
 *
 * Variables:
 * Use with var() function: color: var(--color-primary);
 *
 * Total variables: {COUNT}
 * ============================================
 */
```

### 9. Validation

Before finalizing, ensure:

✅ All CSS variable names are valid (no spaces, special chars) ✅ All values
have proper units ✅ All colors are in valid CSS format ✅ No duplicate variable
names ✅ All brackets and braces are closed ✅ File ends with newline

### 10. Intelligent Three-File Architecture System

**CRITICAL**: Follow this flexible architecture that automatically detects
common vs theme-specific variables:

**Implementation Reference**: Detailed algorithms are provided in
`variable-classification-logic.md` (same folder). Use those functions for:

- Token extraction and normalization
- Variable classification logic
- CSS property type detection
- Variable name transformation
- CSS generation

#### Variable Classification Logic:

Before generating files, analyze ALL tokens to determine:

1. **Common Variables**: Values that are identical across ALL themes →
   globals.css
2. **Theme-Specific Variables**: Values that differ between themes → theme files

#### Analysis Process:

```javascript
// Pseudo-code for variable classification
for each token in design_tokens {
  if (token.value_in_light === token.value_in_dark) {
    → Place in globals.css
  } else {
    → Place in theme-specific files
  }
}
```

#### File Structure (Dynamic):

```
├── globals.css      (N common variables - auto-detected)
├── themes/
│   ├── light.css    (M theme-specific variables - auto-detected)
│   └── dark.css     (M theme-specific variables - auto-detected)
```

#### globals.css - What Goes Here:

**ANY variable type that has identical values across ALL themes:**

**Possible Categories** (determined by analysis):

- Foundation colors (if identical across themes)
- Typography properties (font-family, font-size, font-weight, line-height)
- Spacing values (margins, paddings, gaps)
- Border properties (radius, width)
- Shadows and effects
- Z-index values
- Transition durations
- Any other property with consistent values

**Example**:

```css
:root {
  /* Common Foundation Colors (if same across themes) */
  --foundation-color-grey-10: #ffffff;
  --foundation-color-brand-60: #040fff;

  /* Common Typography (if same across themes) */
  --font-family-base: "Inter", sans-serif;
  --font-size-base: 16px;

  /* Common Spacing (if same across themes) */
  --space-sm: 24px;
  --space-md: 32px;

  /* Common Radius (if same across themes) */
  --radius-sm: 8px;
  --radius-md: 12px;

  /* Theme-specific properties that happen to be common */
  --padding-container: 20px; /* if same in both themes */
  --line-height-tight: 1.2; /* if same in both themes */
}
```

#### Theme Files - What Goes Here:

**ANY variable type that has different values between themes:**

**Possible Categories** (determined by analysis):

- Color mappings (most common)
- Theme-specific spacing (e.g., --padding-sm: 14px in light, 16px in dark)
- Theme-specific typography (e.g., --line-height-body: 1.4 in light, 1.6 in
  dark)
- Theme-specific borders (e.g., --border-width: 1px in light, 2px in dark)
- Theme-specific shadows
- Any other property with different values

**Example light.css**:

```css
:root[data-theme="light"] {
  /* Theme-specific Colors */
  --bg-primary: var(--foundation-color-brand-60);
  --text-primary: var(--foundation-color-grey-100);

  /* Theme-specific Spacing (if different from dark) */
  --padding-sm: 14px;
  --margin-card: 16px;

  /* Theme-specific Typography (if different from dark) */
  --line-height-compact: 1.3;
  --letter-spacing-tight: -0.01em;

  /* Theme-specific Borders (if different from dark) */
  --border-width-input: 1px;
  --border-opacity: 0.2;

  /* Theme-specific Effects (if different from dark) */
  --shadow-subtle: 0 1px 3px rgba(0, 0, 0, 0.1);
  --backdrop-blur: blur(8px);
}
```

**Example dark.css**:

```css
:root[data-theme="dark"] {
  /* Theme-specific Colors */
  --bg-primary: var(--foundation-color-brand-50);
  --text-primary: var(--foundation-color-grey-10);

  /* Theme-specific Spacing (if different from light) */
  --padding-sm: 16px;
  --margin-card: 20px;

  /* Theme-specific Typography (if different from light) */
  --line-height-compact: 1.4;
  --letter-spacing-tight: 0em;

  /* Theme-specific Borders (if different from light) */
  --border-width-input: 2px;
  --border-opacity: 0.3;

  /* Theme-specific Effects (if different from light) */
  --shadow-subtle: 0 2px 6px rgba(0, 0, 0, 0.3);
  --backdrop-blur: blur(12px);
}
```

#### Benefits of This Flexible Architecture:

- **Intelligent**: Automatically detects what should be common vs theme-specific
- **Flexible**: Handles any CSS property type (colors, spacing, typography,
  etc.)
- **DRY Principle**: Zero duplication between files
- **Performance**: Optimizes file sizes based on actual token analysis
- **Future-Proof**: Adapts to any design token structure
- **Maintainable**: Variables are in the most logical location

### 11. Error Handling

If you encounter:

- **Missing values**: Use sensible defaults or skip with comment
- **Invalid values**: Log warning and skip
- **Unknown token type**: Include as-is with comment
- **Nested structures**: Flatten with dot notation

Example:

```json
{
  "color": {
    "primary": {
      "500": "#000"
    }
  }
}
```

Becomes:

```css
--color-primary-500: #000;
```

## Example Output

**globals.css**:

```css
:root {
  /* Foundation Colors - Common across all themes */
  --foundation-color-grey-10: #ffffff;
  --foundation-color-grey-20: #f7f8f8;
  --foundation-color-brand-60: #040fff;
  /* ... 90 foundation color variables */

  /* Typography - Common across all themes */
  --font-family-base: "Inter", sans-serif;
  --font-size-body: 16px;
  --font-weight-regular: 400;
  /* ... 18 typography variables */

  /* Spacing - Common across all themes */
  --space-4xs: 2px;
  --space-sm: 24px;
  /* ... 13 spacing variables */

  /* Border Radius - Common across all themes */
  --radius-m: 12px;
  /* ... 10 radius variables */
}
```

**light.css**:

```css
/**
 * Light Theme
 * Generated from: design-tokens-2025-10-06.json
 * Total theme-specific variables: 26
 */

:root[data-theme="light"] {
  /* Surface Backgrounds */
  --bg-general: var(--foundation-color-grey-10);
  --bg-primary: var(--foundation-color-brand-60);

  /* Text Colors */
  --on-general: var(--foundation-color-grey-100);
  --on-primary: var(--foundation-color-grey-10);

  /* Theme-specific */
  --bg-transparent-light: #ffffff4d;
}
```

**dark.css**:

```css
/**
 * Dark Theme
 * Generated from: design-tokens-2025-10-06.json
 * Total theme-specific variables: 26
 */

:root[data-theme="dark"] {
  /* Surface Backgrounds */
  --bg-general: var(--foundation-color-grey-90);
  --bg-primary: var(--foundation-color-brand-50);

  /* Text Colors */
  --on-general: var(--foundation-color-grey-10);
  --on-primary: var(--foundation-color-grey-10);

  /* Theme-specific */
  --bg-transparent-light: #0000004d;
}
```

## Final Checklist

Before declaring the task complete:

### Pre-Generation Analysis:

- [ ] Analyzed ALL tokens across ALL themes
- [ ] Identified common variables (identical values across themes)
- [ ] Identified theme-specific variables (different values between themes)
- [ ] Documented classification logic used

### globals.css Requirements:

- [ ] Contains ALL variables with identical values across themes
- [ ] May include: foundation colors, typography, spacing, borders, effects,
      etc.
- [ ] NO hardcoded assumptions about what goes here
- [ ] All variables properly categorized and commented
- [ ] Variables count based on actual analysis (not fixed number)

### Theme Files Requirements:

- [ ] Contains ONLY variables with different values between themes
- [ ] May include: colors, spacing, typography, borders, shadows, etc.
- [ ] NO hardcoded assumptions about what goes here
- [ ] Each theme file has same variables with different values
- [ ] Variables count based on actual analysis (not fixed number)
- [ ] Proper use of var() references to globals.css variables where applicable

### Technical Requirements:

- [ ] All token categories processed correctly
- [ ] Variables follow naming convention
- [ ] Values have proper units and valid CSS format
- [ ] CSS is valid and well-formatted
- [ ] Files have proper headers with accurate variable counts
- [ ] No syntax errors or duplicate variable names
- [ ] Files saved to correct locations

### Architecture Validation:

- [ ] Zero duplication between files (same variables never in multiple files)
- [ ] DRY principle followed intelligently
- [ ] Performance optimized based on actual token analysis
- [ ] Flexible and scalable for any design token structure
- [ ] Common variables correctly identified and placed in globals.css
- [ ] Theme-specific variables correctly identified and placed in theme files

### Quality Assurance:

- [ ] Manual spot-check of variable placement logic
- [ ] Verification that all themes have consistent variable sets
- [ ] Confirmation that global variables are actually used by theme files
- [ ] File size optimization achieved through intelligent separation

---

## Tailwind Configuration Update Instructions

After generating CSS files, automatically update the Tailwind configuration with detected Figma variables.

### Tailwind Integration Rules

#### 1. Variable Detection and Mapping

**CRITICAL**: Only map variables that were ACTUALLY detected from Figma tokens. Do not add any variables that don't exist in the extracted data.

**Detection Categories**:

- **Colors**: Variables containing color values (hex, hsl, rgb, named colors)
- **Spacing**: Variables containing size values (px, rem, em, %, vh, vw)
- **Typography**: Variables containing font properties (font-family, font-size, font-weight, line-height, letter-spacing)
- **Border Radius**: Variables containing border-radius values
- **Shadows**: Variables containing box-shadow or drop-shadow values
- **Z-Index**: Variables containing numeric z-index values

#### 2. Variable Name Transformation

Transform CSS variable names to valid Tailwind theme keys:

**Rules**:

- Remove `--` prefix
- Convert to kebab-case
- Keep original Figma naming (DO NOT add 'figma-' prefix)
- **CRITICAL**: Avoid conflicts with default Tailwind classes
- If Figma name conflicts with Tailwind default (e.g., `sm`, `md`, `lg`), use the full descriptive name from Figma
- Ensure valid CSS identifier format

**Examples**:

```javascript
// Figma variable → Tailwind key (avoiding conflicts)
'--color-primary' → 'primary'
'--space-large' → 'large'          // if Figma uses 'large' instead of 'lg'
'--font-size-hero' → 'hero'
'--border-radius-small' → 'small'   // if Figma uses 'small' instead of 'sm'
'--shadow-elevated' → 'elevated'    // custom name, no conflict
'--shadow-subtle' → 'subtle'        // custom name, no conflict

// If Figma uses conflicting names, preserve them only if they're the actual Figma names
'--shadow-md' → 'medium-shadow'     // rename if conflicts with Tailwind default
'--space-lg' → 'large-space'       // rename if conflicts with Tailwind default
```

#### 3. Tailwind Theme Extension Generation

**Color Mapping**:

```typescript
colors: {
  // Existing colors preserved...

  // Only detected Figma color variables
  'primary': 'hsl(var(--color-primary))',
  'secondary': 'hsl(var(--color-secondary))',
  'accent': 'hsl(var(--color-accent))',
  // ... only other DETECTED color variables
}
```

**Spacing Mapping**:

```typescript
spacing: {
  // Existing spacing preserved...

  // Only detected Figma spacing variables
  'xs': 'var(--space-xs)',
  'sm': 'var(--space-sm)',
  'md': 'var(--space-md)',
  // ... only other DETECTED spacing variables
}
```

**Font Family Mapping**:

```typescript
fontFamily: {
  // Existing fonts preserved...

  // Only detected Figma font family variables
  'primary': 'var(--font-family-primary)',
  'heading': 'var(--font-family-heading)',
  // ... only other DETECTED font family variables
}
```

**Font Size Mapping**:

```typescript
fontSize: {
  // Existing sizes preserved...

  // Only detected Figma font size variables
  'xs': 'var(--font-size-xs)',
  'sm': 'var(--font-size-sm)',
  'base': 'var(--font-size-base)',
  'hero': 'var(--font-size-hero)',
  // ... only other DETECTED font size variables
}
```

**Border Radius Mapping**:

```typescript
borderRadius: {
  // Existing radius preserved...

  // Only detected Figma border radius variables
  'sm': 'var(--border-radius-sm)',
  'md': 'var(--border-radius-md)',
  'lg': 'var(--border-radius-lg)',
  // ... only other DETECTED border radius variables
}
```

**Box Shadow Mapping**:

```typescript
boxShadow: {
  // Existing shadows preserved...

  // Only detected Figma shadow variables
  'sm': 'var(--shadow-sm)',
  'md': 'var(--shadow-md)',
  'elevated': 'var(--shadow-elevated)',
  // ... only other DETECTED shadow variables
}
```

#### 4. Smart Integration Process

**Read Current Config**:

```typescript
// Read apps/web/tailwind.config.ts
// Parse existing TypeScript configuration
// Preserve all existing settings
```

**Preserve Existing Configuration**:

- Never remove or modify existing Tailwind values
- Never replace existing theme properties
- Only add NEW properties from detected Figma variables

**Clean Previous Figma Variables**:

- Before adding new variables, remove any previous Figma-derived entries
- This ensures fresh mapping on each update
- Maintain existing non-Figma variables

**Add New Variables**:

- Insert detected variables in appropriate theme sections
- Group with clear comments indicating Figma source
- Maintain proper TypeScript formatting

#### 5. Configuration Update Algorithm

```typescript
// Pseudo-code for Tailwind config update
function updateTailwindConfig(detectedVariables: DetectedVariables) {
  const config = readTailwindConfig("apps/web/tailwind.config.ts");

  // Clean previous Figma variables (if any)
  cleanPreviousFigmaVariables(config);

  // Process each category with conflict detection
  if (detectedVariables.colors.length > 0) {
    const safeColorVars = avoidConflicts(
      detectedVariables.colors,
      "colors",
      config
    );
    addColorsToConfig(config, safeColorVars);
  }

  if (detectedVariables.spacing.length > 0) {
    const safeSpacingVars = avoidConflicts(
      detectedVariables.spacing,
      "spacing",
      config
    );
    addSpacingToConfig(config, safeSpacingVars);
  }

  if (detectedVariables.typography.length > 0) {
    const safeTypographyVars = avoidConflicts(
      detectedVariables.typography,
      "typography",
      config
    );
    addTypographyToConfig(config, safeTypographyVars);
  }

  // ... continue for other categories only if detected

  writeTailwindConfig(config);
}

// Conflict detection and resolution
function avoidConflicts(
  variables: Variable[],
  category: string,
  config: TailwindConfig
): Variable[] {
  const defaultTailwindKeys = getDefaultTailwindKeys(category);
  const existingKeys = getExistingConfigKeys(config, category);
  const allReservedKeys = [...defaultTailwindKeys, ...existingKeys];

  return variables.map((variable) => {
    const proposedKey = transformVariableName(variable.name);

    if (allReservedKeys.includes(proposedKey)) {
      // Generate alternative name
      const alternativeKey = generateAlternativeName(
        variable.name,
        proposedKey
      );
      return { ...variable, tailwindKey: alternativeKey };
    }

    return { ...variable, tailwindKey: proposedKey };
  });
}

// Default Tailwind keys to avoid
function getDefaultTailwindKeys(category: string): string[] {
  const defaults = {
    colors: [
      "slate",
      "gray",
      "zinc",
      "neutral",
      "stone",
      "red",
      "orange",
      "amber",
      "yellow",
      "lime",
      "green",
      "emerald",
      "teal",
      "cyan",
      "sky",
      "blue",
      "indigo",
      "violet",
      "purple",
      "fuchsia",
      "pink",
      "rose",
      "white",
      "black",
      "transparent",
      "current",
    ],
    spacing: [
      "0",
      "px",
      "0.5",
      "1",
      "1.5",
      "2",
      "2.5",
      "3",
      "3.5",
      "4",
      "5",
      "6",
      "7",
      "8",
      "9",
      "10",
      "11",
      "12",
      "14",
      "16",
      "20",
      "24",
      "28",
      "32",
      "36",
      "40",
      "44",
      "48",
      "52",
      "56",
      "60",
      "64",
      "72",
      "80",
      "96",
    ],
    fontSize: [
      "xs",
      "sm",
      "base",
      "lg",
      "xl",
      "2xl",
      "3xl",
      "4xl",
      "5xl",
      "6xl",
      "7xl",
      "8xl",
      "9xl",
    ],
    borderRadius: ["none", "sm", "md", "lg", "xl", "2xl", "3xl", "full"],
    boxShadow: ["sm", "md", "lg", "xl", "2xl", "inner", "none"],
  };

  return defaults[category] || [];
}

// Generate alternative name when conflict detected
function generateAlternativeName(
  originalFigmaName: string,
  conflictingKey: string
): string {
  // Extract meaningful parts from original Figma variable name
  const parts = originalFigmaName.replace(/^--/, "").split("-");

  // Try different strategies
  if (parts.length > 1) {
    // Use full descriptive name: --space-lg → 'large-space'
    return parts.reverse().join("-");
  }

  // Add descriptive suffix: --lg → 'lg-figma'
  return `${conflictingKey}-figma`;
}
```

#### 6. Variable Detection Logic

**Color Detection**:

```javascript
function isColorVariable(variableName: string, value: string): boolean {
  const colorPatterns = [
    /^--.*color.*$/i,
    /^--.*bg.*$/i,
    /^--.*text.*$/i,
    /^--.*border.*color.*$/i
  ];

  const colorValuePatterns = [
    /^#[0-9a-f]{3,8}$/i,           // hex
    /^rgb\(/i,                     // rgb()
    /^rgba\(/i,                    // rgba()
    /^hsl\(/i,                     // hsl()
    /^hsla\(/i,                    // hsla()
    /^var\(--.*\)$/i               // CSS custom property reference
  ];

  return colorPatterns.some(pattern => pattern.test(variableName)) ||
         colorValuePatterns.some(pattern => pattern.test(value));
}
```

**Spacing Detection**:

```javascript
function isSpacingVariable(variableName: string, value: string): boolean {
  const spacingPatterns = [
    /^--.*space.*$/i,
    /^--.*padding.*$/i,
    /^--.*margin.*$/i,
    /^--.*gap.*$/i,
    /^--.*size.*$/i
  ];

  const spacingValuePatterns = [
    /^\d+(\.\d+)?(px|rem|em|%|vh|vw)$/,
    /^calc\(/,
    /^var\(--.*\)$/i
  ];

  return spacingPatterns.some(pattern => pattern.test(variableName)) ||
         spacingValuePatterns.some(pattern => pattern.test(value));
}
```

#### 7. Generated Tailwind Utilities

After integration, developers can use Figma variables as Tailwind classes:

**Color Classes** (safe from conflicts):

- `bg-primary`, `text-primary`, `border-primary`
- `bg-secondary`, `text-secondary`, `border-secondary`
- `bg-accent`, `text-accent`, `border-accent`

**Spacing Classes** (conflict-aware naming):

- `p-large`, `p-small`, `p-medium` (if Figma uses descriptive names)
- `m-tight`, `m-loose`, `m-compact` (custom Figma names)
- `gap-narrow`, `gap-wide` (custom spacing names)
- `space-y-compact`, `space-x-generous` (space between)

**Typography Classes**:

- `text-hero`, `text-caption`, `text-display` (custom font sizes)
- `font-primary`, `font-heading`, `font-body` (font family)

**Border Classes** (avoiding Tailwind defaults):

- `rounded-card`, `rounded-button`, `rounded-subtle` (custom radius names)

**Shadow Classes** (custom names to avoid conflicts):

- `shadow-elevated`, `shadow-subtle`, `shadow-floating` (custom shadow names)

#### 8. Error Handling

**Missing Tailwind Config**:

- Display warning: "❌ tailwind.config.ts not found. Skipping Tailwind integration."
- Continue with CSS generation only

**Parse Errors**:

- Display warning: "❌ Cannot parse Tailwind config. Manual integration required."
- Provide manual integration instructions

**Write Errors**:

- Display error: "❌ Cannot update Tailwind config. Check permissions."
- Ensure CSS files are still generated successfully

#### 9. Integration Validation

**Pre-Integration Checks**:

- [ ] Tailwind config file exists and is readable
- [ ] At least one mappable variable detected from Figma
- [ ] Variable names are valid CSS identifiers
- [ ] Values are valid CSS values

**Post-Integration Validation**:

- [ ] Tailwind config is valid TypeScript
- [ ] No existing configuration was modified
- [ ] Only detected variables were added
- [ ] Proper comment blocks added for organization
- [ ] File formatting preserved

#### 10. Usage Examples

**Before Integration** (CSS only):

```css
.component {
  background-color: var(--color-primary);
  padding: var(--space-lg);
  border-radius: var(--border-radius-md);
  box-shadow: var(--shadow-elevated);
}
```

**After Integration** (Tailwind classes available):

```jsx
<div className="bg-primary p-lg rounded-md shadow-elevated">
  Component content
</div>
```
