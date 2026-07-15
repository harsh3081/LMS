# Asset Management Patterns

**Category**: Practices / Component Generation
**Version**: 1.0.0
**Technology-Agnostic**: Yes

---

## Overview

Patterns for downloading, organizing, and referencing image assets from Figma designs. Covers download strategies, file organization, naming conventions, and path resolution.

**Philosophy**: Download all assets locally, organize systematically, reference with correct relative paths.

---

## Asset Download Strategy

### When to Download

Download assets during Figma design extraction:

- Extract design specifications
- Identify all image assets (PNG, JPG, SVG, etc.)
- Download each asset from Figma
- Save to project assets directory
- Update component code with correct paths

### What to Download

**Images to Download**:

- Background images
- Logos and branding assets
- Icon graphics (if not in icon system)
- Illustrations
- Product images
- Avatar placeholders
- Decorative graphics

**Do NOT Download**:

- Simple geometric shapes (recreate with CSS)
- Solid color fills (use CSS)
- Basic icons already in icon system
- Text content (use actual text)

---

## File Organization

### Directory Structure Detection

**Detect project structure first**:

1. Check for `public/` directory (Next.js, Create React App)
2. Check for `static/` directory (Gatsby, some frameworks)
3. Check for `assets/` directory (Vue, custom setups)
4. Fall back to creating `assets/` in project root

### Standard Organization

```
public/                           # Public assets directory
├── assets/
│   ├── images/
│   │   ├── components/          # Component-specific images
│   │   │   ├── header/
│   │   │   │   ├── logo.svg
│   │   │   │   └── background.jpg
│   │   │   ├── product-card/
│   │   │   │   ├── placeholder.png
│   │   │   │   └── badge.svg
│   │   │   └── hero/
│   │   │       ├── hero-bg-desktop.jpg
│   │   │       ├── hero-bg-tablet.jpg
│   │   │       └── hero-bg-mobile.jpg
│   │   ├── icons/               # Downloadable icons
│   │   │   ├── menu.svg
│   │   │   ├── search.svg
│   │   │   └── close.svg
│   │   └── illustrations/       # Larger graphics
│   │       ├── empty-state.svg
│   │       └── error-404.svg
│   └── manifest.json            # Asset tracking manifest
```

### Naming Conventions

**Pattern**: `{context}-{descriptor}-{variant}.{ext}`

**Examples**:

```
logo-primary.svg
logo-white.svg
header-background-desktop.jpg
header-background-mobile.jpg
product-placeholder.png
hero-illustration-main.svg
button-icon-arrow.svg
card-decoration-1.svg
```

**Rules**:

- Lowercase only
- Hyphens for word separation
- Descriptive but concise
- Include variant/breakpoint if responsive
- Preserve original file extension

---

## Download Process

### Step-by-Step

1. **Extract Asset URLs from Figma**

   - Use MCP tools to get design context
   - Parse response for image URLs
   - Collect metadata (dimensions, format, etc.)

2. **Determine Target Directory**

   - Detect project structure
   - Choose appropriate assets directory
   - Create subdirectories if needed

3. **Generate File Names**

   - Use component name as context
   - Add descriptor based on asset purpose
   - Include variant if responsive
   - Ensure uniqueness

4. **Download Assets**

   - Fetch each asset from Figma URL
   - Save to target directory with generated name
   - Verify download success
   - Track in manifest

5. **Update Component Code**
   - Replace Figma URLs with local paths
   - Use correct relative or absolute paths
   - Ensure paths work in build environment

---

## Path Resolution

### Relative vs Absolute Paths

**In Components**:

```typescript
// ❌ Absolute from root (breaks in some environments)
<img src="/assets/images/logo.svg" />

// ✅ Relative from public directory
<img src="/assets/images/logo.svg" />

// ✅ Import statement (bundler handles path)
import logoUrl from '@/assets/images/logo.svg'
<img src={logoUrl} />
```

**Path Strategy**:

- **Public assets** (`public/assets/`): Use absolute path from root `/assets/...`
- **Source assets** (`src/assets/`): Use import statements with bundler
- **Packages**: Use package-relative imports `@/assets/...`

### Framework-Specific Paths

**Next.js**:

```typescript
// Assets in public/
<img src="/assets/images/logo.svg" />;

// Or use next/image
import Image from "next/image";
<Image src="/assets/images/logo.svg" width={200} height={50} />;
```

**Vite/Vue**:

```typescript
// Assets in public/
<img src="/assets/images/logo.svg" />

// Assets in src/ (use import)
import logoUrl from '@/assets/images/logo.svg'
<img :src="logoUrl" />
```

**Create React App**:

```typescript
// Assets in public/
<img src={process.env.PUBLIC_URL + "/assets/images/logo.svg"} />;

// Assets in src/ (use import)
import logo from "./assets/images/logo.svg";
<img src={logo} />;
```

---

## Asset Manifest

### Purpose

Track downloaded assets for:

- Avoiding duplicate downloads
- Regeneration tracking
- Cleanup of unused assets
- Build optimization

### Manifest Structure

```json
{
  "version": "1.0",
  "generated": "2025-11-05T10:30:00Z",
  "assets": [
    {
      "figmaUrl": "http://localhost:3000/figma-asset-123.svg",
      "localPath": "/assets/images/components/header/logo.svg",
      "component": "Header",
      "type": "logo",
      "format": "svg",
      "size": 12543,
      "dimensions": { "width": 200, "height": 50 },
      "downloaded": "2025-11-05T10:30:00Z"
    }
  ]
}
```

---

## Responsive Asset Handling

### Multiple Breakpoint Assets

When component has responsive images:

**Download Strategy**:

```
Download all breakpoint variants:
- hero-bg-mobile.jpg (from mobile Figma node)
- hero-bg-tablet.jpg (from tablet Figma node)
- hero-bg-desktop.jpg (from desktop Figma node)
```

**Usage in Component**:

```typescript
<picture>
  <source
    media="(min-width: 1200px)"
    srcSet="/assets/images/hero-bg-desktop.jpg"
  />
  <source
    media="(min-width: 768px)"
    srcSet="/assets/images/hero-bg-tablet.jpg"
  />
  <img src="/assets/images/hero-bg-mobile.jpg" alt="Hero background" />
</picture>
```

### Single Asset, Multiple Sizes

For same asset at different resolutions:

**Download Strategy**:

```
Download single high-resolution asset:
- Use Figma export at 2x or 3x
- Let CSS or framework handle responsive sizing
```

**Usage**:

```typescript
<img
  src="/assets/images/product-image.jpg"
  srcSet="/assets/images/product-image-2x.jpg 2x"
  alt="Product"
  className="w-full md:w-1/2 xl:w-1/3"
/>
```

---

## SVG Optimization

### Download and Optimize

When downloading SVGs:

1. Download original from Figma
2. Run through SVGO or similar optimizer
3. Remove unnecessary metadata
4. Preserve accessibility attributes
5. Ensure viewBox is set correctly

### Inline vs File Reference

**Inline SVG** (for icons, small graphics):

```typescript
// Good for styling, animation, accessibility
<svg viewBox="0 0 24 24" className="w-6 h-6">
  <path d="..." />
</svg>
```

**File Reference** (for large illustrations):

```typescript
// Good for caching, smaller bundle
<img src="/assets/images/illustration.svg" alt="Illustration" />
```

---

## Asset Cleanup

### Identify Unused Assets

Periodically check for unused assets:

1. Scan component files for asset references
2. Compare with manifest
3. Identify assets not referenced
4. Remove unused assets

### Regeneration Strategy

When regenerating components:

1. Check existing manifest
2. Reuse assets that haven't changed
3. Download only new/changed assets
4. Update manifest
5. Clean up orphaned assets

---

## Error Handling

### Download Failures

**Symptoms**: Asset URL returns 404, timeout, or network error

**Resolution**:

1. Log error with asset details
2. Continue with placeholder reference
3. Report failures to user
4. Provide manual download option

### Path Resolution Failures

**Symptoms**: Image not loading in component

**Resolution**:

1. Verify asset exists at path
2. Check path format (absolute vs relative)
3. Verify framework static file serving
4. Test in development and production

### Format Incompatibility

**Symptoms**: Browser cannot display asset format

**Resolution**:

1. Convert to web-compatible format (WebP, PNG, JPG, SVG)
2. Provide fallback formats
3. Use picture element for multiple formats

---

## Best Practices

### DO

✅ Download all assets locally (don't reference Figma URLs in production)
✅ Use descriptive, consistent naming conventions
✅ Organize assets by component/context
✅ Track assets in manifest
✅ Use appropriate path resolution for framework
✅ Optimize images (compress, resize, optimize)
✅ Provide alt text for accessibility
✅ Use responsive image techniques (srcset, picture)

### DON'T

❌ Leave Figma localhost URLs in production code
❌ Use generic names (image1.png, asset2.svg)
❌ Dump all assets in single directory
❌ Reference assets with hardcoded absolute paths
❌ Skip image optimization
❌ Forget alt text
❌ Use same image for all breakpoints when responsive versions exist

---

## Related Documentation

### Phoenix OS Memory

- `atomic-design.md` - Component organization
- `responsive-design.md` - Responsive image patterns

---

**Version**: 1.0.0
**Last Updated**: 2025-11-05
**Status**: Active
