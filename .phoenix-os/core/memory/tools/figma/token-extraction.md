# Figma Token Extraction Patterns

**Category**: Tools / Figma
**Version**: 1.0.0
**Technology-Agnostic**: Yes

---

## Overview

This document provides patterns and best practices for extracting design tokens from Figma files. It covers identification strategies, parsing patterns, and transformation approaches for converting Figma design data into structured token formats.

**Important**: This is technology-agnostic guidance. Implementation-specific details should reference tech-stack memory files.

---

## Design Token Categories

### 1. Color Tokens

**Figma Sources**:

- Variable Collections (Type: COLOR)
- Color Styles (legacy)
- Fill properties on components
- Stroke properties on components

**Token Structure**:

```
Primitive Colors:
  - Base palette (50-950 scale)
  - Named colors (red, blue, green, etc.)
  - Neutral scale (gray, slate, zinc)

Semantic Colors:
  - Brand (primary, secondary, accent)
  - Feedback (success, warning, error, info)
  - State (hover, active, disabled, focus)

Contextual Colors:
  - Background (page, surface, overlay)
  - Text (heading, body, caption, inverse)
  - Border (default, subtle, strong, focus)
  - Interactive (link, button, input)
```

**Extraction Strategy**:

1. Check for Variable Collections named "Color", "Colors", "Primitives"
2. Fallback to Color Styles if variables not present
3. Group by semantic meaning (look for naming patterns)
4. Extract RGB/RGBA values
5. Calculate hex, HSL representations
6. Verify WCAG contrast ratios

---

### 2. Typography Tokens

**Figma Sources**:

- Variable Collections (Type: STRING for font families)
- Text Styles
- Text nodes with typography properties

**Token Structure**:

```
Font Families:
  - Display (headings, marketing)
  - Body (paragraphs, UI)
  - Mono (code, data)

Font Sizes:
  - Scale: xs, sm, base, lg, xl, 2xl, 3xl, 4xl, 5xl
  - Pixel values: 12px, 14px, 16px, 18px, 20px, 24px, 32px, 48px, 64px
  - Responsive scaling if applicable

Font Weights:
  - Light (300)
  - Regular (400)
  - Medium (500)
  - Semibold (600)
  - Bold (700)

Line Heights:
  - Tight (1.25)
  - Normal (1.5)
  - Relaxed (1.75)
  - Loose (2)

Letter Spacing:
  - Tighter (-0.05em)
  - Tight (-0.025em)
  - Normal (0)
  - Wide (0.025em)
  - Wider (0.05em)
```

**Extraction Strategy**:

1. Identify Text Styles in Figma
2. Extract font family, size, weight, line height, letter spacing
3. Group by usage context (heading, body, caption, etc.)
4. Create semantic naming (heading-1, body-regular, caption-small)
5. Calculate relative values (rem, em) from pixel values
6. Document font-feature-settings if applicable

---

### 3. Spacing Tokens

**Figma Sources**:

- Variable Collections (Type: FLOAT for spacing)
- Auto-layout spacing properties
- Padding/margin values on components

**Token Structure**:

```
Spacing Scale:
  - 0: 0px
  - 0.5: 2px (0.125rem)
  - 1: 4px (0.25rem)
  - 1.5: 6px (0.375rem)
  - 2: 8px (0.5rem)
  - 3: 12px (0.75rem)
  - 4: 16px (1rem)
  - 6: 24px (1.5rem)
  - 8: 32px (2rem)
  - 12: 48px (3rem)
  - 16: 64px (4rem)
  - 24: 96px (6rem)
  - 32: 128px (8rem)

Component Spacing:
  - Button padding
  - Input padding
  - Card padding
  - Modal spacing

Layout Spacing:
  - Container max-width
  - Grid gaps
  - Section spacing
```

**Extraction Strategy**:

1. Identify Auto-layout frames with spacing
2. Extract spacing values from component variants
3. Find patterns (4px, 8px, 16px, 24px, 32px base-8 scale)
4. Create scale based on common values
5. Map to semantic names (xs, sm, md, lg, xl)
6. Document component-specific spacing

---

### 4. Effect Tokens (Shadows, Blur, etc.)

**Figma Sources**:

- Effect Styles
- Shadow properties on components
- Blur effects

**Token Structure**:

```
Box Shadows:
  - xs: 0 1px 2px 0 rgba(0, 0, 0, 0.05)
  - sm: 0 1px 3px 0 rgba(0, 0, 0, 0.1)
  - md: 0 4px 6px -1px rgba(0, 0, 0, 0.1)
  - lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1)
  - xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1)

Blur Effects:
  - none: 0px
  - sm: 4px
  - md: 8px
  - lg: 16px
  - xl: 24px
```

**Extraction Strategy**:

1. Fetch Effect Styles from Figma
2. Parse shadow properties (x, y, blur, spread, color)
3. Group by intensity (small, medium, large)
4. Extract backdrop blur values
5. Document elevation scale
6. Ensure dark mode variants

---

### 5. Radius Tokens (Border Radius)

**Figma Sources**:

- Variable Collections (Type: FLOAT)
- Corner radius properties
- Component variants with rounded corners

**Token Structure**:

```
Border Radius:
  - none: 0px
  - sm: 2px (0.125rem)
  - md: 4px (0.25rem)
  - lg: 8px (0.5rem)
  - xl: 12px (0.75rem)
  - 2xl: 16px (1rem)
  - 3xl: 24px (1.5rem)
  - full: 9999px (circular)
```

**Extraction Strategy**:

1. Identify components with rounded corners
2. Extract corner radius values
3. Find common patterns
4. Create scale based on usage
5. Map to semantic names
6. Document component-specific radius (button, card, modal)

---

## Extraction Patterns

### Pattern 1: Variable-Based Extraction (Modern Figma)

**Scenario**: Figma file uses Variable Collections

**Steps**:

1. Fetch variable collections via MCP

   ```
   Tool: mcp__figma__get_file_variables
   Input: { file_key }
   Output: Collections with variables and modes
   ```

2. Parse variable structure

   ```
   For each collection:
     - Identify collection type (color, spacing, etc.)
     - Extract variable names
     - Parse variable values per mode (light/dark)
     - Map to token structure
   ```

3. Transform to token format

   ```
   Variable: color/primary/500
   Type: COLOR
   Value (Light): { r: 59, g: 130, b: 246, a: 1 }
   Value (Dark): { r: 96, g: 165, b: 250, a: 1 }

   Transform to:
   Token: color-primary-500
   Light: #3b82f6
   Dark: #60a5fa
   ```

4. Generate multi-mode tokens
   ```
   For each mode:
     - Create mode-specific token set
     - Generate CSS variables with mode selectors
     - Create TypeScript types with mode unions
   ```

**Advantages**:

- Native Figma token structure
- Built-in mode support (light/dark)
- Semantic variable naming
- Documentation in descriptions

**Limitations**:

- Requires modern Figma files (Variables released 2023)
- Not all files have migrated to Variables

---

### Pattern 2: Style-Based Extraction (Legacy Figma)

**Scenario**: Figma file uses Styles instead of Variables

**Steps**:

1. Fetch styles via MCP

   ```
   Tool: mcp__figma__get_file_styles
   Input: { file_key }
   Output: Style definitions (color, text, effect, grid)
   ```

2. Parse style properties

   ```
   Color Style:
     - Name: "Primary/500"
     - Type: FILL
     - Color: { r, g, b, a }

   Text Style:
     - Name: "Heading 1"
     - Font Family: "Inter"
     - Font Size: 48
     - Font Weight: 700
     - Line Height: 56
   ```

3. Infer semantic structure from naming

   ```
   Style name patterns:
     - "Primary/500" → color-primary-500
     - "Text/Heading/Large" → typography-heading-lg
     - "Spacing/4" → spacing-4
   ```

4. Generate token structure
   ```
   Parse naming conventions:
     - Slash separators → hierarchy
     - Number suffixes → scale values
     - Context prefixes → token categories
   ```

**Advantages**:

- Works with older Figma files
- Styles are well-established pattern
- Broad compatibility

**Limitations**:

- No native mode support (need separate styles for light/dark)
- Less semantic than Variables
- Requires inferring structure from names

---

### Pattern 3: Component-Based Extraction

**Scenario**: Extract tokens from component definitions

**Steps**:

1. Fetch component nodes

   ```
   Tool: mcp__figma__get_file_components
   Input: { file_key }
   Output: Component definitions with properties
   ```

2. Parse component properties

   ```
   Button Component:
     - Variants: [default, primary, secondary]
     - Properties:
       - Background color
       - Text color
       - Padding (top, right, bottom, left)
       - Border radius
       - Font size, weight
   ```

3. Extract token values

   ```
   For each variant:
     - Extract fill colors → color tokens
     - Extract text properties → typography tokens
     - Extract spacing → spacing tokens
     - Extract effects → shadow tokens
   ```

4. Group by semantic meaning
   ```
   button-primary-background: #3b82f6
   button-primary-text: #ffffff
   button-padding-x: 16px
   button-padding-y: 8px
   button-radius: 8px
   ```

**Advantages**:

- Direct mapping to component usage
- Real-world values from designs
- Context-aware tokens

**Limitations**:

- Requires well-structured components
- May have inconsistencies across variants
- Harder to create systematic scales

---

### Pattern 4: Hybrid Extraction

**Scenario**: Combine multiple sources for comprehensive token set

**Steps**:

1. **Variables First** (if available)

   - Extract all variable collections
   - Prefer variables for systematic tokens

2. **Styles Second** (for coverage)

   - Fill gaps not covered by variables
   - Extract text styles for typography
   - Extract effect styles for shadows

3. **Components Third** (for context)

   - Extract component-specific tokens
   - Validate against variable/style values
   - Document usage context

4. **Merge and Deduplicate**
   - Combine all sources
   - Remove duplicates (prefer variables)
   - Resolve conflicts (document divergence)
   - Create unified token structure

**Advantages**:

- Most comprehensive approach
- Handles any Figma file structure
- Balances systematic and contextual tokens

**Limitations**:

- More complex extraction logic
- Requires conflict resolution
- Longer processing time

---

## Token Naming Conventions

### General Principles

1. **Kebab-case**: Use hyphens, lowercase

   - ✅ `color-primary-500`
   - ❌ `colorPrimary500`, `Color_Primary_500`

2. **Hierarchical**: Category → Subcategory → Modifier → Scale

   - `{category}-{subcategory}-{modifier}-{scale}`
   - `color-semantic-primary-500`
   - `spacing-component-button-padding-x`

3. **Semantic**: Meaning over implementation

   - ✅ `color-text-primary`
   - ❌ `color-black`, `#000000`

4. **Scalable**: Support variants and modes
   - `color-background-light` / `color-background-dark`
   - `spacing-xs` / `spacing-sm` / `spacing-md`

### Naming Patterns by Category

**Colors**:

```
Primitive: color-primitive-{name}-{scale}
  - color-primitive-blue-500
  - color-primitive-gray-300

Semantic: color-semantic-{role}-{variant}
  - color-semantic-primary-default
  - color-semantic-error-subtle

Contextual: color-{context}-{element}-{state}
  - color-background-surface-default
  - color-text-heading-primary
  - color-border-input-focus
```

**Typography**:

```
Font Family: typography-family-{usage}
  - typography-family-display
  - typography-family-body

Font Size: typography-size-{scale}
  - typography-size-xs
  - typography-size-2xl

Composite: typography-{element}-{variant}
  - typography-heading-1
  - typography-body-regular
```

**Spacing**:

```
Scale: spacing-{scale}
  - spacing-2 (8px)
  - spacing-4 (16px)

Component: spacing-component-{component}-{property}
  - spacing-component-button-padding-x
  - spacing-component-card-gap
```

**Effects**:

```
Shadows: shadow-{intensity}
  - shadow-sm
  - shadow-xl

Elevation: elevation-{level}
  - elevation-1
  - elevation-4
```

---

## Validation and Quality Checks

### Token Completeness

- [ ] All color tokens have values for each mode (light/dark)
- [ ] Typography tokens include all properties (family, size, weight, line-height)
- [ ] Spacing scale is systematic (no random values)
- [ ] Shadow tokens include all parameters (x, y, blur, spread, color)
- [ ] All tokens have descriptions/documentation

### Accessibility Compliance

- [ ] Color contrast ratios meet WCAG AA (4.5:1 for text, 3:1 for UI)
- [ ] Font sizes are readable (minimum 14px for body text)
- [ ] Touch targets meet size requirements (44x44px minimum)
- [ ] Focus states have sufficient contrast
- [ ] Disabled states are distinguishable

### Naming Consistency

- [ ] All tokens follow kebab-case convention
- [ ] Hierarchical structure is consistent
- [ ] Semantic names are used (not implementation details)
- [ ] Scale values are systematic (not arbitrary)
- [ ] Variants are clearly differentiated

### Technical Validity

- [ ] Color values are valid hex/rgb/hsl
- [ ] Numeric values have correct units (px, rem, em)
- [ ] Font families are available/fallback specified
- [ ] Shadow syntax is CSS-compatible
- [ ] No circular references in token definitions

---

## Figma Node Identification

### Locating Style Guide Nodes

**Common Patterns**:

1. **Dedicated Style Guide Page**

   - Page named: "Style Guide", "Design System", "Tokens", "Foundation"
   - Look for frames with organized token displays

2. **Component Library**

   - Page named: "Components", "Library", "Foundations"
   - Frames showing color palettes, typography scales

3. **Documentation Frames**
   - Frames with token documentation
   - Text labels with token names
   - Visual swatches or samples

**Search Strategy**:

```
1. Fetch file structure
   - Get all pages
   - Get top-level frames

2. Identify candidate pages
   - Check page names for keywords
   - Look for frames with "style", "token", "foundation"

3. Parse frame contents
   - Look for organized layouts (grids, lists)
   - Find text labels with token-like names
   - Identify components with consistent properties

4. Extract token data
   - Parse from Variables/Styles (preferred)
   - Fallback to component property extraction
```

### Node Types and Properties

**Color Swatches**:

- Type: RECTANGLE or ELLIPSE
- Properties: fills (color values)
- Labels: Text nodes with color names

**Typography Samples**:

- Type: TEXT
- Properties: font family, size, weight, line height
- Content: Often Lorem Ipsum or "Aa Bb Cc"

**Spacing Examples**:

- Type: FRAME with Auto-layout
- Properties: padding, item spacing, gap
- Visual: Lines or boxes showing spacing values

**Component Variants**:

- Type: COMPONENT_SET
- Properties: Variant properties with values
- Contains: Multiple component variants

---

## Transformation Strategies

### Color Value Transformation

**Input**: Figma RGB (0-1 range)

```
{ r: 0.231, g: 0.510, b: 0.965, a: 1 }
```

**Output Formats**:

```
Hex: #3b82f6
RGB: rgb(59, 130, 246)
RGBA: rgba(59, 130, 246, 1)
HSL: hsl(217, 91%, 60%)
CSS Variable: var(--color-primary-500)
```

**Transformation**:

```
Hex: Math.round(r * 255).toString(16).padStart(2, '0') + ...
RGB: [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)]
HSL: Convert RGB to HSL color space
```

### Spacing Value Transformation

**Input**: Figma pixels

```
16
```

**Output Formats**:

```
Pixel: 16px
Rem: 1rem (assuming 16px base)
Tailwind: spacing-4
CSS Variable: var(--spacing-4)
```

**Transformation**:

```
Rem: pixelValue / baseFontSize (typically 16)
Scale: Map to spacing scale (0, 0.5, 1, 2, 3, 4, 6, 8, 12, 16, 24, 32)
```

### Typography Value Transformation

**Input**: Figma text properties

```
{
  fontFamily: "Inter",
  fontSize: 16,
  fontWeight: 400,
  lineHeight: { value: 24, unit: "PIXELS" },
  letterSpacing: { value: 0, unit: "PERCENT" }
}
```

**Output Formats**:

```
CSS:
  font-family: 'Inter', sans-serif;
  font-size: 1rem;
  font-weight: 400;
  line-height: 1.5;
  letter-spacing: 0;

TypeScript:
  fontSize: '16px',
  fontWeight: 400,
  lineHeight: '24px'
```

---

## Error Handling

### Missing Data

- **Color variables not found**: Fallback to color styles, then component extraction
- **Typography styles missing**: Extract from text components
- **Spacing inconsistent**: Calculate scale from common values

### Invalid Values

- **Out-of-range colors**: Clamp RGB values to 0-255
- **Negative spacing**: Log warning, use absolute value or 0
- **Invalid font weights**: Map to nearest valid weight (100-900)

### Naming Conflicts

- **Duplicate token names**: Append suffix or context (\_1, \_2, or -light, -dark)
- **Reserved words**: Prefix with category (color-primary not just primary)
- **Special characters**: Convert to kebab-case, remove invalid chars

---

## Related Documentation

- `mcp-integration.md` - MCP Figma connection and authentication
- `figma-operations.md` - Figma API operations reference
- `framework-integration.md` - CSS framework compatibility

---

**Version**: 1.0.0
**Last Updated**: 2025-11-03
**Status**: Active
