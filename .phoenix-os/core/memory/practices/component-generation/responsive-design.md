# Responsive Design Patterns

**Category**: Practices / Component Generation
**Version**: 1.0.0
**Technology-Agnostic**: Yes

---

## Overview

Patterns for creating responsive components that adapt across device sizes. Covers mobile-first methodology, breakpoint strategies, and responsive token usage.

**Philosophy**: Mobile-first approach with progressive enhancement for larger screens.

---

## Mobile-First Methodology

### Core Principle

Start with mobile design as the base, then enhance for larger screens.

**Pattern**:
```
Base styles (no prefix) = Mobile (320px+)
Medium prefix (md:) = Tablet (768px+)
Large prefix (xl:) = Desktop (1200px+)
```

**Rationale**:
- Most traffic is mobile
- Easier to enhance than strip down
- Better performance (less CSS)
- Forces content prioritization

---

## Breakpoint Strategy

### Standard Breakpoints

| Device | Width Range | Prefix | Usage |
|--------|-------------|--------|-------|
| Mobile | 320px - 767px | (none) | Base styles |
| Tablet | 768px - 1199px | `md:` | Medium enhancements |
| Desktop | 1200px+ | `xl:` | Large enhancements |

### Implementation Pattern

```typescript
// Mobile base
className="w-full p-4 text-base"

// Mobile + Tablet
className="w-full p-4 text-base md:w-auto md:p-6 md:text-lg"

// Mobile + Tablet + Desktop
className="w-full p-4 text-base md:w-auto md:p-6 md:text-lg xl:w-96 xl:p-8 xl:text-xl"
```

---

## Responsive Scaling Rules

### Typography Scaling

**Desktop to Mobile**:
- Reduce by 20-30% for mobile
- Reduce by 10-15% for tablet
- **Must remain readable at ALL viewports (320px - 2560px+)**

**Example**:
```
Desktop:  96px (text-8xl)
Tablet:   ~84px (text-7xl)  // -12.5%
Mobile:   ~72px (text-6xl)  // -25%
```

**Implementation**:
```typescript
className="text-6xl md:text-7xl xl:text-8xl"
```

**Readability Rules**:
- Body text: Minimum 16px (1rem) on mobile
- Headings: Scale proportionally but stay readable
- Line height: Increase on mobile for better readability (1.5-1.6)
- Letter spacing: Adjust for smaller screens if needed

---

### Spacing Scaling

**Critical Rule**: ALL spacing properties must scale proportionally across viewports.

**Large Spacing (>40px)**:
- Reduce by 40-60% for mobile
- Reduce by 20-30% for tablet

**Small Spacing (<40px)**:
- Minimal reduction or keep same
- Maintain minimum touch-friendly spacing on mobile (8px minimum)

**Example**:
```
Desktop padding:  80px  (p-20)
Tablet padding:   56px  (md:p-14)  // -30%
Mobile padding:   32px  (p-8)      // -60%
```

**Implementation**:
```typescript
// Padding
className="p-8 md:p-14 xl:p-20"

// Margin
className="mt-4 md:mt-6 xl:mt-8"

// Gap (Flexbox/Grid)
className="gap-4 md:gap-6 xl:gap-8"
```

**Positioning Scaling**:
```typescript
// Absolute positioning
className="top-4 md:top-8 xl:top-12 left-4 md:left-8 xl:left-12"

// Relative positioning
className="relative top-2 md:top-4 xl:top-6"
```

**Proportional Scaling Formula**:
```
Mobile value = Desktop value × 0.4 to 0.6
Tablet value = Desktop value × 0.7 to 0.8
```

---

### Component Size Scaling

**Width/Height Constraints**:
```
Mobile:   Full width (w-full)
Tablet:   Constrained (max-w-2xl)
Desktop:  Fixed or larger constraint (w-96, max-w-4xl)
```

**Touch Targets** (Mobile):
- Minimum 44px (2.75rem) for interactive elements
- Buttons, links, inputs must meet minimum

---

## Layout Transformation Patterns

### Pattern 1: Stack to Side-by-Side

**Mobile**: Vertical stack
**Desktop**: Horizontal layout

```typescript
// Mobile: Stacked
<div className="flex flex-col gap-4 md:flex-row md:gap-6">
  <LeftPanel />
  <RightPanel />
</div>
```

---

### Pattern 2: Full-Width to Centered

**Mobile**: Edge-to-edge
**Desktop**: Centered with max-width

```typescript
<div className="w-full px-4 md:max-w-2xl md:mx-auto xl:max-w-4xl">
  <Content />
</div>
```

---

### Pattern 3: Bottom Sheet to Modal

**Mobile**: Fixed at bottom
**Desktop**: Centered modal

```typescript
<div className="fixed bottom-0 left-0 right-0 md:inset-0 md:flex md:items-center md:justify-center">
  <div className="w-full md:w-96 md:rounded-lg">
    <ModalContent />
  </div>
</div>
```

---

### Pattern 4: Hamburger to Full Navigation

**Mobile**: Collapsed menu
**Desktop**: Expanded navigation

```typescript
<nav>
  {/* Mobile: Hidden by default, shown when menu open */}
  <div className="hidden data-[open]:block md:block">
    <NavItems />
  </div>

  {/* Mobile: Menu toggle button */}
  <button className="md:hidden">
    <MenuIcon />
  </button>
</nav>
```

---

## Responsive Component Patterns

### Responsive Props

Components may need different behavior at different sizes:

```typescript
interface ComponentProps {
  // Responsive size variants
  size?: 'sm' | 'md' | 'lg'

  // Responsive layout modes
  layout?: 'stack' | 'side-by-side'

  // Or use responsive object pattern
  responsive?: {
    mobile: { size: 'sm', layout: 'stack' }
    desktop: { size: 'lg', layout: 'side-by-side' }
  }
}
```

**Note**: Only add responsive props when behavior significantly differs. Prefer CSS-only responsive design.

---

### Conditional Rendering

When layout structure differs significantly:

```typescript
const isMobile = useMediaQuery('(max-width: 767px)')

return isMobile ? (
  <MobileLayout>...</MobileLayout>
) : (
  <DesktopLayout>...</DesktopLayout>
)
```

**Use sparingly**: CSS handles most responsive needs. Reserve for truly different structures.

---

## Responsive Image Patterns

### Pattern 1: Responsive Sizing

```typescript
<img
  className="w-full md:w-1/2 xl:w-1/3"
  src={image}
  alt={alt}
/>
```

### Pattern 2: Different Images per Breakpoint

```typescript
<picture>
  <source media="(min-width: 1200px)" srcSet={desktopImage} />
  <source media="(min-width: 768px)" srcSet={tabletImage} />
  <img src={mobileImage} alt={alt} />
</picture>
```

### Pattern 3: Background Image Positioning

```typescript
<div className="bg-cover bg-bottom md:bg-center xl:bg-top">
  {children}
</div>
```

---

## Testing Requirements

### Breakpoint Testing Checklist

**Critical Rule**: All spacing (padding, margin, position) and typography must scale properly at EVERY viewport.

Test at these critical widths:
- [ ] 320px - Minimum mobile (smallest supported)
- [ ] 375px - iPhone SE
- [ ] 390px - Standard mobile
- [ ] 414px - iPhone Pro Max
- [ ] 768px - Tablet portrait threshold
- [ ] 1024px - Tablet landscape
- [ ] 1200px - Desktop threshold
- [ ] 1440px - Standard desktop
- [ ] 1920px - Full HD desktop
- [ ] 2560px - 2K displays

**Viewport Scaling Validation**:
- [ ] Padding scales appropriately (not too cramped on mobile, not too loose on large screens)
- [ ] Margin maintains visual balance across all viewports
- [ ] Absolute/relative positioning adjusts proportionally
- [ ] Typography remains readable (not too small on mobile, not too large on desktop)
- [ ] Touch targets ≥44px on mobile/tablet
- [ ] No horizontal scroll at any viewport
- [ ] Component fits within viewport boundaries at all sizes

### Functionality Validation

- [ ] Touch targets ≥44px on mobile
- [ ] Text readable at all sizes
- [ ] Forms usable on mobile
- [ ] Navigation accessible
- [ ] Images scale without distortion
- [ ] No horizontal scroll
- [ ] Adequate spacing on small screens

---

## Anti-Patterns

### Anti-Pattern 1: Desktop-First Design

**Bad**:
```typescript
// Base styles for desktop, override for mobile
className="w-96 xl:w-full"  // ❌ Wrong direction
```

**Good**:
```typescript
// Base styles for mobile, enhance for desktop
className="w-full xl:w-96"  // ✅ Mobile-first
```

---

### Anti-Pattern 2: Too Many Breakpoints

**Bad**:
```typescript
className="text-sm sm:text-base md:text-lg lg:text-xl xl:text-2xl 2xl:text-3xl"
// ❌ Unnecessary complexity
```

**Good**:
```typescript
className="text-base md:text-lg xl:text-xl"
// ✅ Three breakpoints sufficient
```

---

### Anti-Pattern 3: Pixel-Perfect at All Sizes

**Bad**: Trying to match Figma exactly at every single width

**Good**: Match key breakpoints (mobile, tablet, desktop), let CSS handle intermediate sizes

---

## Multi-Node Responsive Workflow

When generating from multiple Figma nodes (desktop, tablet, mobile):

1. **Extract all nodes in parallel**
2. **Compare designs**:
   - Layout differences
   - Typography changes
   - Spacing variations
   - Hidden/shown elements
3. **Generate analysis document** (RESPONSIVE_ANALYSIS.md)
4. **Create breakpoint variables** in framework config
5. **Implement mobile-first classes**
6. **Validate at all breakpoints**

---

## Related Documentation

### Phoenix OS Memory
- `token-mapping.md` - Responsive token usage
- `atomic-design.md` - Component structure
- `framework-integration.md` - Framework-specific responsive utilities

---

**Version**: 1.0.0
**Last Updated**: 2025-11-05
**Status**: Active
