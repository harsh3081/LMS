# CSS Framework Integration Patterns

**Category**: Practices / Design System
**Version**: 1.0.0
**Technology-Agnostic**: Patterns only (implementation references tech-stack)

---

## Overview

This document provides framework-agnostic patterns for integrating generated design tokens with existing CSS frameworks. It covers detection strategies, compatibility patterns, and zero-conflict integration approaches.

**Important**: This is technology-agnostic guidance. Framework-specific implementations should reference tech-stack memory files.

---

## Supported Framework Patterns

### 1. Utility-First Frameworks (Tailwind CSS, UnoCSS, Windi CSS)

**Characteristics**:
- Utility class generation from config
- Theme-based token structure
- Just-in-time compilation
- Plugin ecosystem

**Integration Pattern**:
```
1. Detect framework
   - Look for config file (tailwind.config.js, uno.config.ts)
   - Check package.json dependencies

2. Map tokens to theme structure
   - colors → theme.colors
   - spacing → theme.spacing
   - fontSize → theme.fontSize
   - etc.

3. Extend existing theme
   - Preserve user customizations
   - Add design tokens as extensions
   - Avoid overwriting defaults

4. Generate configuration
   - Export as JavaScript/TypeScript config
   - Use CommonJS or ESM as needed
   - Include type definitions
```

**Output Structure**:
```javascript
// tailwind.config.js extension
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          500: '#3b82f6',
          900: '#1e3a8a',
        },
        // ... design tokens
      },
      spacing: {
        // ... spacing tokens
      },
      fontSize: {
        // ... typography tokens
      }
    }
  }
}
```

---

### 2. Component Libraries (Material UI, Chakra UI, Ant Design)

**Characteristics**:
- Theme provider pattern
- Component-level theming
- Design system primitives
- Runtime theme switching

**Integration Pattern**:
```
1. Detect framework
   - Check for @mui/material, @chakra-ui/react, antd
   - Identify theme provider usage

2. Map tokens to theme structure
   - Material UI: palette, typography, spacing
   - Chakra UI: colors, semanticTokens, components
   - Ant Design: token, components

3. Create theme object
   - Follow framework's theme structure
   - Map design tokens to framework tokens
   - Include mode variants (light/dark)

4. Export theme module
   - TypeScript module with types
   - Import in theme provider
   - Support theme customization
```

**Output Structure (Material UI Example)**:
```typescript
// theme.ts
import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#3b82f6',
      light: '#60a5fa',
      dark: '#2563eb',
    },
    // ... design tokens
  },
  typography: {
    fontFamily: '"Inter", sans-serif',
    h1: {
      fontSize: '3rem',
      fontWeight: 700,
    },
    // ... typography tokens
  },
  spacing: 8, // base spacing unit
});
```

---

### 3. CSS-in-JS Libraries (Styled Components, Emotion, Stitches)

**Characteristics**:
- Runtime or compile-time styling
- Theme provider pattern
- Component-scoped styles
- TypeScript support

**Integration Pattern**:
```
1. Detect library
   - Check for styled-components, @emotion/react, @stitches/react
   - Identify theme provider usage

2. Create theme object
   - Flat or nested token structure
   - Include all token categories
   - Add TypeScript type definitions

3. Export theme and types
   - Theme object with tokens
   - TypeScript declaration file
   - Theme provider integration

4. Generate utility types
   - Token access types
   - Autocomplete support
   - Type-safe theme usage
```

**Output Structure**:
```typescript
// theme.ts
export const theme = {
  colors: {
    primary500: '#3b82f6',
    // ... color tokens
  },
  space: {
    1: '4px',
    2: '8px',
    // ... spacing tokens
  },
  fontSizes: {
    sm: '0.875rem',
    // ... typography tokens
  },
} as const;

// theme.d.ts
import 'styled-components';

declare module 'styled-components' {
  type Theme = typeof theme;
  export interface DefaultTheme extends Theme {}
}
```

---

### 4. CSS Variables / Custom Properties (Vanilla CSS, CSS Modules)

**Characteristics**:
- Native CSS feature
- Global or scoped variables
- Runtime updates possible
- No build step required

**Integration Pattern**:
```
1. Generate CSS variables
   - Use --prefix naming
   - Organize by category
   - Include mode selectors

2. Create variable files
   - tokens.css with all variables
   - Optional: category-specific files
   - Include light/dark mode variants

3. Import in application
   - Global CSS import
   - Or per-component imports
   - Use in existing CSS/SCSS/Less

4. Provide fallbacks
   - Default values for variables
   - Browser compatibility
   - Progressive enhancement
```

**Output Structure**:
```css
/* tokens.css */
:root {
  /* Colors */
  --color-primary-500: #3b82f6;
  --color-primary-600: #2563eb;

  /* Spacing */
  --spacing-2: 0.5rem;
  --spacing-4: 1rem;

  /* Typography */
  --font-size-base: 1rem;
  --font-family-body: 'Inter', sans-serif;
}

[data-theme="dark"] {
  --color-primary-500: #60a5fa;
  --color-primary-600: #3b82f6;
}
```

---

## Framework Detection

### Detection Strategy

**Step 1: Check package.json**
```
1. Read package.json
2. Check dependencies and devDependencies
3. Identify framework packages:
   - tailwindcss → Tailwind CSS
   - @mui/material → Material UI
   - @chakra-ui/react → Chakra UI
   - styled-components → Styled Components
   - @emotion/react → Emotion
```

**Step 2: Check config files**
```
1. Look for framework-specific configs:
   - tailwind.config.* → Tailwind
   - uno.config.* → UnoCSS
   - theme.js/theme.ts → Custom theme

2. Parse config to understand customizations
3. Determine integration approach
```

**Step 3: Check usage patterns**
```
1. Search for ThemeProvider imports
2. Look for createTheme usage
3. Check for CSS variable usage
4. Identify styling patterns
```

---

## Zero-Conflict Integration

### Principle: Extend, Don't Replace

**Problem**: Overwriting existing tokens breaks existing code

**Solution**: Always use `extend` or additive patterns

**Example (Tailwind)**:
```javascript
// ❌ Bad: Overwrites existing colors
module.exports = {
  theme: {
    colors: {
      primary: '#3b82f6' // Breaks existing primary usage
    }
  }
}

// ✅ Good: Extends existing colors
module.exports = {
  theme: {
    extend: {
      colors: {
        brand: {
          primary: '#3b82f6' // New namespace, no conflicts
        }
      }
    }
  }
}
```

---

### Namespacing Strategy

**Pattern**: Use unique namespace for design tokens

**Options**:
1. **Prefix**: `ds-primary-500`, `token-primary-500`
2. **Namespace object**: `brand.primary`, `designSystem.colors.primary`
3. **Semantic naming**: `action-primary`, `surface-background`

**Example (Material UI)**:
```typescript
// ✅ Namespaced tokens don't conflict
const theme = createTheme({
  palette: {
    // Existing MUI defaults preserved
    primary: { ... },

    // Design tokens in custom namespace
    brand: {
      primary: '#3b82f6',
      secondary: '#10b981',
    }
  }
});
```

---

### Gradual Migration Pattern

**Scenario**: Existing project with custom tokens

**Strategy**:
```
Phase 1: Add design tokens alongside existing
  - No breaking changes
  - Both systems coexist
  - New components use design tokens

Phase 2: Create mapping layer
  - Map old tokens to new tokens
  - Provide deprecation warnings
  - Document migration path

Phase 3: Migrate incrementally
  - Update components one by one
  - Maintain backwards compatibility
  - Test thoroughly

Phase 4: Remove old tokens
  - After all usage migrated
  - Remove deprecated tokens
  - Clean up mapping layer
```

---

## Compatibility Patterns

### Pattern 1: Configuration Extension

**Use Case**: Framework uses config file for theming

**Implementation**:
```
1. Generate framework-specific config
2. Export as partial config object
3. Merge with existing user config
4. Preserve user customizations
```

**Example**:
```javascript
// generated-tokens.config.js
module.exports = {
  theme: {
    extend: {
      colors: { /* design tokens */ },
      spacing: { /* design tokens */ }
    }
  }
};

// User merges in their config
// tailwind.config.js
const designTokens = require('./generated-tokens.config');

module.exports = {
  ...designTokens,
  theme: {
    extend: {
      ...designTokens.theme.extend,
      // User customizations
      fontFamily: { sans: ['Custom', 'sans-serif'] }
    }
  }
};
```

---

### Pattern 2: Theme Provider Wrapper

**Use Case**: Framework uses theme provider pattern

**Implementation**:
```
1. Generate theme object
2. Export theme module
3. User wraps app with theme provider
4. Components access tokens via theme
```

**Example**:
```typescript
// generated-theme.ts
export const designTokens = {
  colors: { /* ... */ },
  spacing: { /* ... */ }
};

// User's theme provider
import { ThemeProvider } from '@mui/material/styles';
import { designTokens } from './generated-theme';

function App() {
  const theme = createTheme({
    ...designTokens,
    // User customizations
  });

  return (
    <ThemeProvider theme={theme}>
      {/* App */}
    </ThemeProvider>
  );
}
```

---

### Pattern 3: CSS Variable Injection

**Use Case**: Framework uses or supports CSS variables

**Implementation**:
```
1. Generate CSS variable definitions
2. Inject into :root or theme selectors
3. Framework uses variables automatically
4. Or manual variable usage
```

**Example**:
```css
/* generated-tokens.css */
:root {
  --color-primary: #3b82f6;
  --spacing-unit: 0.25rem;
}

/* Framework can reference */
.button-primary {
  background: var(--color-primary);
  padding: calc(var(--spacing-unit) * 4);
}
```

---

## Mode Handling (Light/Dark Themes)

### Strategy 1: CSS Variable Swap

**Pattern**: Change variable values based on mode

```css
:root {
  --color-background: #ffffff;
  --color-text: #000000;
}

[data-theme="dark"] {
  --color-background: #000000;
  --color-text: #ffffff;
}
```

**Activation**:
```javascript
// Toggle theme
document.documentElement.setAttribute('data-theme', 'dark');
```

---

### Strategy 2: Framework Mode Support

**Pattern**: Use framework's built-in mode handling

**Material UI**:
```typescript
const theme = createTheme({
  palette: {
    mode: 'light', // or 'dark'
    primary: { /* adapts to mode */ }
  }
});
```

**Chakra UI**:
```typescript
const theme = extendTheme({
  semanticTokens: {
    colors: {
      'bg.canvas': {
        _light: 'white',
        _dark: 'gray.900'
      }
    }
  }
});
```

---

### Strategy 3: Separate Theme Objects

**Pattern**: Create separate theme objects per mode

```typescript
const lightTheme = {
  colors: {
    background: '#ffffff',
    text: '#000000'
  }
};

const darkTheme = {
  colors: {
    background: '#000000',
    text: '#ffffff'
  }
};

// Switch theme based on mode
const theme = mode === 'dark' ? darkTheme : lightTheme;
```

---

## TypeScript Integration

### Type Generation Strategy

**Goal**: Provide type-safe token access with autocomplete

**Approach**:
```
1. Generate token type definitions
2. Augment framework types if needed
3. Export typed theme object
4. Enable IDE autocomplete
```

**Example**:
```typescript
// generated-tokens.types.ts
export type ColorToken =
  | 'primary-500'
  | 'primary-600'
  | 'secondary-500';

export type SpacingToken =
  | '1' | '2' | '4' | '8';

// Augment framework types
declare module '@mui/material/styles' {
  interface Theme {
    tokens: {
      colors: Record<ColorToken, string>;
      spacing: Record<SpacingToken, string>;
    };
  }
}
```

---

## Validation and Testing

### Integration Validation Checklist

- [ ] Framework detected correctly
- [ ] Config file parsed successfully
- [ ] Generated tokens follow framework structure
- [ ] No naming conflicts with existing tokens
- [ ] Mode variants work correctly (light/dark)
- [ ] TypeScript types compile without errors
- [ ] Existing components still work
- [ ] New tokens accessible and functional

### Testing Strategy

**Unit Tests**:
```
- Token generation produces valid output
- Framework detection works for all supported frameworks
- Naming collision detection catches conflicts
- Mode handling generates correct variants
```

**Integration Tests**:
```
- Generated tokens import successfully
- Framework accepts generated config
- Theme provider works with tokens
- Components can access tokens
- Mode switching works correctly
```

**Visual Regression Tests**:
```
- Existing UI unchanged (no breaking changes)
- New tokens render correctly
- Mode switching preserves layout
- Colors/spacing match design specs
```

---

## Migration Guides

### Framework-Specific Guides

Each framework integration should include:

1. **Installation Instructions**
   - Dependencies to add
   - Config changes needed
   - Import statements

2. **Usage Examples**
   - Accessing tokens in components
   - Using with framework features
   - Mode switching implementation

3. **Migration Path**
   - From existing tokens to generated
   - Backwards compatibility approach
   - Breaking change handling

4. **Troubleshooting**
   - Common issues
   - Resolution steps
   - Support resources

---

## Related Documentation

- `token-extraction.md` - Figma token extraction
- `../tech-stack/react.md` - React-specific guidance
- `../tech-stack/nextjs.md` - Next.js-specific guidance

---

**Version**: 1.0.0
**Last Updated**: 2025-11-03
**Status**: Active
