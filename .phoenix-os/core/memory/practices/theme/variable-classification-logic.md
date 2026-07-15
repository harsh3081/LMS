# Variable Classification Logic

This document provides the detailed logic for intelligently classifying design tokens into common vs theme-specific variables.

## Core Classification Algorithm

### Step 1: Extract All Themes
```javascript
// Extract all available themes from design tokens
const themes = extractThemes(designTokens);
// Result: ['light', 'dark', 'high-contrast', etc.]
```

### Step 2: Normalize Token Structure
```javascript
// Flatten nested tokens into comparable key-value pairs
function normalizeTokens(tokens, theme) {
  const normalized = {};

  function flatten(obj, prefix = '') {
    for (const [key, value] of Object.entries(obj)) {
      const fullKey = prefix ? `${prefix}-${key}` : key;

      if (typeof value === 'object' && !Array.isArray(value) && value.value === undefined) {
        // Recursive case: nested object
        flatten(value, fullKey);
      } else {
        // Base case: actual token value
        const tokenValue = value.value || value;
        normalized[fullKey] = tokenValue;
      }
    }
  }

  flatten(tokens);
  return normalized;
}
```

### Step 3: Compare Across Themes
```javascript
function classifyVariables(designTokens) {
  const themes = extractThemes(designTokens);
  const normalizedThemes = {};

  // Normalize all themes
  for (const theme of themes) {
    normalizedThemes[theme] = normalizeTokens(designTokens[theme], theme);
  }

  // Get all unique token keys
  const allKeys = new Set();
  for (const themeTokens of Object.values(normalizedThemes)) {
    Object.keys(themeTokens).forEach(key => allKeys.add(key));
  }

  const commonVariables = {};
  const themeSpecificVariables = {};

  // Classify each token
  for (const key of allKeys) {
    const values = themes.map(theme => normalizedThemes[theme][key]);
    const uniqueValues = [...new Set(values.filter(v => v !== undefined))];

    if (uniqueValues.length === 1) {
      // All themes have the same value → common variable
      commonVariables[key] = uniqueValues[0];
    } else if (uniqueValues.length > 1) {
      // Different values across themes → theme-specific
      themeSpecificVariables[key] = {};
      for (const theme of themes) {
        if (normalizedThemes[theme][key] !== undefined) {
          themeSpecificVariables[key][theme] = normalizedThemes[theme][key];
        }
      }
    }
  }

  return { commonVariables, themeSpecificVariables };
}
```

## Property Type Detection

### CSS Property Classification
```javascript
function detectPropertyType(key, value) {
  // Color detection
  if (key.includes('color') || key.includes('bg') || key.includes('text') ||
      /^#[0-9a-f]{3,8}$/i.test(value) || value.startsWith('rgb') || value.startsWith('hsl')) {
    return 'color';
  }

  // Spacing detection
  if (key.includes('space') || key.includes('padding') || key.includes('margin') ||
      key.includes('gap') || /^\d+px$|^\d+rem$|^\d+em$/.test(value)) {
    return 'spacing';
  }

  // Typography detection
  if (key.includes('font') || key.includes('text') || key.includes('letter') ||
      key.includes('line-height') || /^\d+px$|^\d+rem$|^\d+em$/.test(value)) {
    return 'typography';
  }

  // Border detection
  if (key.includes('border') || key.includes('radius') || key.includes('outline')) {
    return 'border';
  }

  // Shadow/Effect detection
  if (key.includes('shadow') || key.includes('blur') || key.includes('opacity') ||
      key.includes('backdrop') || key.includes('filter')) {
    return 'effect';
  }

  // Z-index detection
  if (key.includes('z-index') || key.includes('layer') || /^\d+$/.test(value)) {
    return 'z-index';
  }

  // Transition detection
  if (key.includes('transition') || key.includes('duration') || key.includes('ease') ||
      /^\d+ms$|^\d+s$/.test(value)) {
    return 'transition';
  }

  return 'other';
}
```

## CSS Variable Naming

### Name Transformation
```javascript
function transformToVariableName(key, value, type) {
  // Convert to kebab-case
  let variableName = key
    .replace(/([a-z])([A-Z])/g, '$1-$2')  // camelCase to kebab-case
    .replace(/\s+/g, '-')                 // spaces to hyphens
    .replace(/[^a-zA-Z0-9-]/g, '')        // remove special chars
    .toLowerCase();

  // Add type prefix if not already present
  const typePrefix = getTypePrefix(type);
  if (!variableName.startsWith(typePrefix)) {
    variableName = `${typePrefix}${variableName}`;
  }

  return `--${variableName}`;
}

function getTypePrefix(type) {
  const prefixes = {
    'color': '',           // colors don't need prefix if semantic
    'spacing': 'space-',   // --space-md
    'typography': 'font-', // --font-size-base
    'border': 'border-',   // --border-radius-sm
    'effect': 'effect-',   // --effect-shadow-sm
    'z-index': 'z-',       // --z-modal
    'transition': 'transition-', // --transition-fast
    'other': ''
  };

  return prefixes[type] || '';
}
```

## Value Processing

### Value Standardization
```javascript
function processValue(value, type, key) {
  switch (type) {
    case 'color':
      return processColorValue(value);
    case 'spacing':
      return processSpacingValue(value);
    case 'typography':
      return processTypographyValue(value, key);
    case 'border':
      return processBorderValue(value, key);
    case 'effect':
      return processEffectValue(value, key);
    default:
      return String(value);
  }
}

function processColorValue(value) {
  // Convert rgba/hsla to hex if possible
  if (typeof value === 'string') {
    // Handle rgba(255,255,255,1) → #ffffff
    const rgbaMatch = value.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
    if (rgbaMatch) {
      const [, r, g, b, a] = rgbaMatch;
      if (!a || parseFloat(a) === 1) {
        return `#${((1 << 24) + (parseInt(r) << 16) + (parseInt(g) << 8) + parseInt(b)).toString(16).slice(1)}`;
      }
    }
  }
  return value;
}

function processSpacingValue(value) {
  // Ensure spacing values have units
  if (typeof value === 'number') {
    return `${value}px`;
  }
  if (typeof value === 'string' && /^\d+$/.test(value)) {
    return `${value}px`;
  }
  return value;
}

function processTypographyValue(value, key) {
  // Handle font families
  if (key.includes('font-family') || key.includes('family')) {
    if (typeof value === 'string' && value.includes(' ') && !value.includes(',')) {
      return `"${value}"`;
    }
  }

  // Handle font sizes
  if (key.includes('font-size') || key.includes('size')) {
    if (typeof value === 'number') {
      return `${value}px`;
    }
  }

  return value;
}
```

## Output Generation

### Generate CSS Structure
```javascript
function generateCSS(commonVariables, themeSpecificVariables, themes) {
  const result = {
    globalCSS: generateGlobalCSS(commonVariables),
    themeCSS: {}
  };

  for (const theme of themes) {
    result.themeCSS[theme] = generateThemeCSS(themeSpecificVariables, theme);
  }

  return result;
}

function generateGlobalCSS(commonVariables) {
  const groups = groupVariablesByType(commonVariables);

  let css = ':root {\n';

  for (const [type, variables] of Object.entries(groups)) {
    css += `  /* ${capitalize(type)} - Common across all themes */\n`;

    for (const [key, value] of Object.entries(variables)) {
      const variableName = transformToVariableName(key, value, type);
      const processedValue = processValue(value, type, key);
      css += `  ${variableName}: ${processedValue};\n`;
    }
    css += '\n';
  }

  css += '}';
  return css;
}

function generateThemeCSS(themeSpecificVariables, theme) {
  const groups = groupVariablesByType(themeSpecificVariables);

  let css = `:root[data-theme="${theme}"] {\n`;
  css += `  /* Note: Common variables are in globals.css */\n\n`;

  for (const [type, variables] of Object.entries(groups)) {
    if (Object.keys(variables).length === 0) continue;

    css += `  /* Theme-specific ${capitalize(type)} */\n`;

    for (const [key, themeValues] of Object.entries(variables)) {
      if (themeValues[theme] !== undefined) {
        const variableName = transformToVariableName(key, themeValues[theme], type);
        const processedValue = processValue(themeValues[theme], type, key);
        css += `  ${variableName}: ${processedValue};\n`;
      }
    }
    css += '\n';
  }

  css += '}';
  return css;
}
```

## Usage Example

```javascript
// Example usage
const designTokens = {
  light: {
    colors: {
      primary: '#2563eb',
      background: '#ffffff'
    },
    spacing: {
      sm: '8px',
      md: '16px'  // same in both themes
    },
    typography: {
      fontFamily: 'Inter, sans-serif'  // same in both themes
    }
  },
  dark: {
    colors: {
      primary: '#3b82f6',  // different from light
      background: '#1f2937' // different from light
    },
    spacing: {
      sm: '12px',  // different from light!
      md: '16px'   // same as light
    },
    typography: {
      fontFamily: 'Inter, sans-serif'  // same as light
    }
  }
};

const classification = classifyVariables(designTokens);

// Result:
// commonVariables: { 'spacing-md': '16px', 'typography-fontFamily': 'Inter, sans-serif' }
// themeSpecificVariables: {
//   'colors-primary': { light: '#2563eb', dark: '#3b82f6' },
//   'colors-background': { light: '#ffffff', dark: '#1f2937' },
//   'spacing-sm': { light: '8px', dark: '12px' }
// }
```

This intelligent classification system ensures that:
1. **Any CSS property type** can be common or theme-specific
2. **No hardcoded assumptions** about what goes where
3. **Actual value comparison** determines placement
4. **Maximum optimization** with zero duplication
5. **Future-proof** for any design token structure