# Design Token Mapping Patterns

**Category**: Practices / Component Generation
**Version**: 1.0.0
**Technology-Agnostic**: Yes

---

## Overview

Patterns for mapping Figma design properties to CSS framework utility classes and design tokens. Covers priority systems, naming conventions, and configuration strategies.

**Critical Rule**: Never use hardcoded values. All design values must be configurable through CSS variables or framework configuration.

---

## Mapping Priority System

### Priority Order

1. **Custom Framework Classes** - Configured classes that map to design tokens
2. **Design System Variables** - CSS variables from design system (as arbitrary values)
3. **Standard Framework Utilities** - Built-in framework classes
4. **Custom Variables** - New variables added to framework config
5. **Arbitrary Values** - Last resort only

---

## Naming Conventions

### Spacing Variables

Use mathematical notation for precision:

**Pattern**: `{value}P{decimal}` where P = point (rem conversion)

**Examples**:
```
'4P375': '4.375rem'   // 70px ÷ 16
'2P8125': '2.8125rem' // 45px ÷ 16
'1P375': '1.375rem'   // 22px ÷ 16
```

**Usage**: `w-4P375 h-2P8125 mt-1P375`

**Rationale**: Generic, reusable, not tied to specific components

---

### Color Variables

Use descriptive generic names, avoid component-specific names:

**Good**:
```
'neon': { '100': '#E6F3FF', '500': '#603CFF', '700': '#4A2ECC' }
'accent': { '100': '#F3E6FF', '500': '#9D4EDD' }
```

**Bad**:
```
'login-button-bg': '#603CFF'
'header-primary': '#9D4EDD'
```

---

### Shadow/Effect Variables

Descriptive but generic effect names:

**Good**:
```
'glow-purple': '0px 21px 27px -10px rgba(96, 60, 255, 0.48)'
'soft-elevation': '0px 4px 12px rgba(0, 0, 0, 0.15)'
'glass-blur': 'backdrop-blur(12px)'
```

**Bad**:
```
'login-card-shadow': '...'
'button-glow': '...'
```

---

## Framework Configuration Rules

### Rule 1: Never Override Built-in Classes

**Bad**:
```javascript
spacing: {
  '4': '2rem',  // ❌ Overrides w-4, h-4, p-4
  '8': '3rem',  // ❌ Overrides w-8, h-8, p-8
}
```

**Good**:
```javascript
spacing: {
  '4P375': '4.375rem',  // ✅ New custom value
  '2P8125': '2.8125rem', // ✅ New custom value
}
```

---

### Rule 2: Extend, Don't Replace

**Pattern**:
```javascript
theme: {
  extend: {
    // Add new values here
    colors: { ... },
    spacing: { ... },
    fontSize: { ... }
  }
}
```

**Not**:
```javascript
theme: {
  // ❌ This replaces entire theme
  colors: { ... }
}
```

---

### Rule 3: Use Semantic Grouping

Group related values together:

```javascript
colors: {
  'neon': {
    '100': '#E6F3FF',
    '300': '#80B3FF',
    '500': '#603CFF',
    '700': '#4A2ECC',
    '900': '#2E1A80',
  }
}
```

---

## Mapping Strategies

### Color Mapping

**Process**:
1. Check if CSS variable exists (e.g., `--foundation-color-newmans-blue-500`)
2. Check if framework class exists (e.g., `bg-newmans-blue-500`)
3. Use framework class if available
4. Use CSS variable as arbitrary value if class doesn't exist
5. Add new custom variable if neither exists

**Example**:
```
Figma: #603CFF
→ Check: var(--foundation-color-primary-500) exists?
→ Check: bg-primary-500 configured?
→ Use: bg-primary-500 (if configured)
→ Or: bg-[var(--foundation-color-primary-500)] (if not configured)
→ Or: Add to config as 'neon-500': '#603CFF', use bg-neon-500
```

---

### Spacing Mapping

**Process**:
1. Calculate rem value: `px ÷ 16`
2. Check if standard Tailwind value exists (4, 8, 12, 16, etc.)
3. Use standard if close enough (within 2px)
4. Create custom variable with mathematical notation if unique
5. Add to framework config

**Example**:
```
Figma: 70px width
→ Calculate: 70 ÷ 16 = 4.375rem
→ Check standard: w-16 (4rem = 64px), w-20 (5rem = 80px)
→ Not close enough, create custom
→ Add: '4P375': '4.375rem'
→ Use: w-4P375
```

---

### Typography Mapping

**Process**:
1. Extract font size, line height, font weight, letter spacing
2. Check if standard framework size exists
3. Extend framework typography if needed
4. Use combined utilities or custom class

**Example**:
```
Figma: 96px font, 600 weight, 1.2 line-height
→ Check: text-8xl exists? (usually 6rem = 96px)
→ If not: Add '8xl': ['6rem', { lineHeight: '1.2', fontWeight: '600' }]
→ Use: text-8xl
```

---

### Effect Mapping

**Shadow Mapping**:
```
Figma: Complex shadow with blur, spread, color
→ Calculate CSS shadow value
→ Create generic shadow name
→ Add to boxShadow config
→ Use: shadow-glow-purple
```

**Blur/Backdrop Mapping**:
```
Figma: Backdrop blur 12px
→ Check: backdrop-blur-md exists?
→ If not: Add custom backdrop filter
→ Use: backdrop-blur-glass
```

---

## Anti-Patterns

### Anti-Pattern 1: Hardcoded Arbitrary Values

**Bad**:
```typescript
className="w-[594px] h-[80px] text-[96px] shadow-[0px_21px_27px_rgba(96,60,255,0.48)]"
```

**Good**:
```typescript
// After adding to config
className="w-37P125 h-5 text-8xl shadow-glow-purple"
```

---

### Anti-Pattern 2: Component-Specific Variable Names

**Bad**:
```javascript
spacing: {
  'login-card-width': '37.125rem',
  'header-height': '5rem',
  'button-padding': '1.375rem',
}
```

**Good**:
```javascript
spacing: {
  '37P125': '37.125rem',  // Generic, reusable
  '5': '5rem',
  '1P375': '1.375rem',
}
```

---

### Anti-Pattern 3: Overriding Framework Defaults

**Bad**:
```javascript
theme: {
  colors: {
    blue: {
      500: '#603CFF'  // ❌ Overrides Tailwind's blue-500
    }
  }
}
```

**Good**:
```javascript
theme: {
  extend: {
    colors: {
      'neon': {
        500: '#603CFF'  // ✅ New color family
      }
    }
  }
}
```

---

## Configuration Update Workflow

1. **Extract all design values from Figma**
2. **Categorize** (colors, spacing, typography, effects)
3. **Check existing configuration** for matches
4. **Calculate custom values** needed
5. **Name using conventions** (generic, not component-specific)
6. **Update framework config** (extend only)
7. **Verify no conflicts** with built-in classes
8. **Use configured classes** in component generation

---

## Related Documentation

### Phoenix OS Memory
- `framework-integration.md` - CSS framework patterns
- `atomic-design.md` - Component structure
- `responsive-design.md` - Responsive token usage

---

**Version**: 1.0.0
**Last Updated**: 2025-11-05
**Status**: Active
