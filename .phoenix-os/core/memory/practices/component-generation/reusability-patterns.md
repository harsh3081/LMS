# Component Reusability Patterns

**Category**: Practices / Component Generation
**Version**: 1.0.0
**Technology-Agnostic**: Yes

---

## Overview

This document provides patterns for maximizing component reuse and preventing component proliferation. It covers evaluation strategies, extension patterns, and decision frameworks for determining when to create new components versus extending existing ones.

**Philosophy**: Extend Before Create - Every component request should trigger systematic evaluation of existing components before creating new ones.

---

## Core Principles

### 1. DRY (Don't Repeat Yourself)

**Application**:

- Every piece of functionality should have single, authoritative implementation
- Avoid creating similar components with slightly different props or styling
- Use variant systems instead of component duplication
- Centralize asset management (icons, images) through registry patterns

**Anti-Pattern**:

```
❌ PrimaryButton.tsx
❌ SecondaryButton.tsx
❌ DangerButton.tsx
❌ LargeButton.tsx
❌ SmallPrimaryButton.tsx

✅ Button.tsx with variants: { variant: 'primary' | 'secondary' | 'danger', size: 'sm' | 'md' | 'lg' }
```

---

### 2. KISS (Keep It Simple, Stupid)

**Application**:

- Simple solutions over complex abstractions
- Minimal props interface - only what's needed now
- Direct implementations over clever patterns
- Clear component hierarchy following atomic design

**Anti-Pattern**:

```typescript
❌ Complex polymorphic system when not needed
<Button as="a" href="..." variant="primary" size="md" icon="left" loading={true} />

✅ Simple when sufficient
<Button variant="primary" onClick={handleClick}>Click me</Button>
```

---

### 3. YAGNI (You Aren't Gonna Need It)

**Application**:

- Generate based on current requirements only
- No premature optimization or feature anticipation
- Essential props only - no convenience props until needed
- Minimal dependencies

**Anti-Pattern**:

```typescript
❌ Over-engineered with unused features
interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'tertiary' | 'ghost' | 'link'
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'
  loading?: boolean
  disabled?: boolean
  leftIcon?: ReactNode
  rightIcon?: ReactNode
  isFullWidth?: boolean
  loadingText?: string
  // ... 20 more props that aren't used
}

✅ Essential props only
interface ButtonProps {
  variant: 'primary' | 'secondary'
  children: ReactNode
  onClick?: () => void
}
```

---

## Reuse Evaluation Process

### Step 1: Identify Component Function

**Questions**:

- What is the core purpose of this component?
- What atomic level does it belong to (primitive/block/card)?
- What are its essential features?

### Step 2: Scan Existing Components

**Process**:

- **Identify if component is part of layout** (Header, Footer, Sidebar, Navigation, etc.)
- Search components at same atomic level
- **Search for similar components** that serve related purposes
- Analyze functional similarity
- Review props interfaces
- Check implementation patterns
- **Evaluate if existing components can be tweaked** for reuse

**Search Patterns**:

```
For Layout Components:
- Always check apps/{app-name}/components/layout/ first
- Example: Creating Header → Check existing Header.tsx, Navigation.tsx
- Consider: Can existing layout be tweaked with props/variants?

For Primitives:
- Look for components with similar single purpose
- Example: Creating button → Check existing Button.tsx
- Consider: Can existing primitive be extended with variant?

For Blocks:
- Look for components combining similar primitives
- Example: Creating form field → Check FormField.tsx, InputGroup.tsx
- Consider: Can existing block be tweaked with additional props?

For Cards:
- Look for components with similar layout patterns
- Example: Creating product card → Check existing card patterns
- Consider: Can composition of existing primitives/blocks achieve this?
```

### Step 3: Calculate Overlap

**Overlap Metrics**:

- **Functional overlap**: Does it do the same thing?
- **Structural overlap**: Similar composition of child components?
- **Styling overlap**: Similar appearance and design tokens?
- **Props overlap**: Similar configurable properties?

**Overlap Score**:

```
High (90-100%): Nearly identical, different variant/style only
Medium-High (70-89%): Same core function, some different features
Medium (50-69%): Similar function, different implementation
Low (<50%): Different purpose, minimal overlap
```

### Step 4: Determine Reuse Strategy

| Overlap Score | Strategy                 | Action                                                    |
| ------------- | ------------------------ | --------------------------------------------------------- |
| 90-100%       | **Extend with variant**  | Add new variant prop value                                |
| 70-89%        | **Extend with props**    | Add optional props for customization                      |
| 60-69%        | **Tweak existing**       | Evaluate if existing can be modified/tweaked for reuse    |
| 50-59%        | **Evaluate composition** | Consider composing existing primitives/blocks differently |
| <50%          | **Create new**           | Justify why extension/tweaking isn't viable               |

**Special Cases**:

- **Layout Components** (Header, Footer, Sidebar): ALWAYS check existing layouts first, prefer tweaking over creating new
- **Similar Components** (60%+ overlap): Evaluate tweaking before creating new component

---

## Extension Patterns

### Pattern 1: Variant Extension

**When to Use**: Component is 90%+ identical, only styling/behavior variant differs

**Implementation**:

```typescript
// Before: Only 'primary' variant exists
interface ButtonProps {
  children: ReactNode
  onClick?: () => void
}

// After: Extended with variants
interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'ghost'
  children: ReactNode
  onClick?: () => void
}

// Usage
<Button variant="primary">Submit</Button>
<Button variant="ghost">Cancel</Button>
```

**Benefits**:

- Single source of truth
- Consistent behavior across variants
- Easy to maintain
- No code duplication

---

### Pattern 2: Props Extension

**When to Use**: Component is 70-89% similar, needs additional customization

**Implementation**:

```typescript
// Before: Basic input
interface InputProps {
  value: string
  onChange: (value: string) => void
}

// After: Extended with optional features
interface InputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  error?: string
  icon?: ReactNode
}

// Usage
<Input value={value} onChange={setValue} />
<Input value={email} onChange={setEmail} error={emailError} icon={<EmailIcon />} />
```

**Benefits**:

- Backward compatible
- Optional enhancements
- Single component handles multiple use cases

---

### Pattern 3: Composition Extension

**When to Use**: Need to combine existing primitives in new way

**Implementation**:

```typescript
// Reuse existing primitives in new block
<SearchBar>
  <Input placeholder="Search..." />
  <Icon name="search" />
  <Button>Search</Button>
</SearchBar>

// vs creating separate SearchInput, SearchIcon, SearchButton
```

**Benefits**:

- Reuses tested primitives
- Maintains consistency
- Flexible composition
- Less code to maintain

---

### Pattern 4: Children-Based Extension

**When to Use**: Need flexible content within structured container

**Implementation**:

```typescript
// Before: Fixed structure
<Card>
  <CardTitle>{title}</CardTitle>
  <CardBody>{body}</CardBody>
</Card>

// After: Flexible children
<Card>
  {children}
</Card>

// Usage with different content
<Card>
  <ProductImage />
  <ProductInfo />
  <ProductActions />
</Card>

<Card>
  <UserAvatar />
  <UserBio />
</Card>
```

**Benefits**:

- Maximum flexibility
- Reuses container logic
- Handles diverse content
- Simple API

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Component Proliferation

**Problem**: Creating separate components for every slight variation

**Bad**:

```
primitives/
├── RedButton.tsx
├── BlueButton.tsx
├── GreenButton.tsx
├── LargeRedButton.tsx
├── SmallBlueButton.tsx
├── DisabledGreenButton.tsx
```

**Good**:

```
primitives/
└── Button.tsx
    // With variants system:
    // variant: 'red' | 'blue' | 'green'
    // size: 'sm' | 'md' | 'lg'
    // disabled: boolean
```

---

### Anti-Pattern 2: Duplicate Functionality

**Problem**: Multiple components doing the same thing with different names

**Bad**:

```typescript
<PrimaryActionButton />
<MainCTAButton />
<ImportantButton />
// All render the same primary button
```

**Good**:

```typescript
<Button variant="primary" />
// Single component, clear naming
```

---

### Anti-Pattern 3: Hard-coded Variations

**Problem**: Creating copies with hardcoded differences

**Bad**:

```typescript
// LargeButton.tsx
<button className="px-6 py-3 text-lg">
  {children}
</button>

// SmallButton.tsx
<button className="px-2 py-1 text-sm">
  {children}
</button>
```

**Good**:

```typescript
// Button.tsx
const sizeClasses = {
  sm: 'px-2 py-1 text-sm',
  md: 'px-4 py-2 text-base',
  lg: 'px-6 py-3 text-lg'
}

<button className={sizeClasses[size]}>
  {children}
</button>
```

---

### Anti-Pattern 4: Premature Abstraction

**Problem**: Creating complex reusable systems before they're needed

**Bad**:

```typescript
// Over-engineered before second use case exists
interface UniversalComponentProps<T> {
  as?: keyof JSX.IntrinsicElements;
  variant?: string;
  size?: string;
  children?: ReactNode;
  ref?: Ref<T>;
  // ... 50 more generic props
}
```

**Good**:

```typescript
// Simple, specific to current needs
interface ButtonProps {
  variant: "primary" | "secondary";
  children: ReactNode;
  onClick?: () => void;
}

// Extend ONLY when second use case actually appears
```

---

## Asset Reusability

### Icon Registry Pattern

**Problem**: Creating individual icon components (Icon1.tsx, Icon2.tsx, Icon3.tsx...)

**Solution**: Universal Icon system with registry

```typescript
// primitives/Icon.tsx
const ICON_ASSETS = {
  search: 'http://localhost:3000/icon-search.svg',
  menu: 'http://localhost:3000/icon-menu.svg',
  close: 'http://localhost:3000/icon-close.svg',
  // ... centralized registry
}

interface IconProps {
  name: keyof typeof ICON_ASSETS
  size?: number
  className?: string
}

// Usage
<Icon name="search" />
<Icon name="menu" size={24} />
```

**Benefits**:

- Single Icon component instead of dozens
- Centralized asset management
- Easy to add new icons
- Consistent sizing and styling

---

### Image Asset Pattern

**Problem**: Creating separate components for each image

**Solution**: Generic Image component with src prop or asset registry for common images

```typescript
// primitives/Image.tsx
<Image src={logoUrl} alt="Logo" />
<Image src={avatarUrl} alt="User avatar" />

// For common assets, use registry
const COMMON_IMAGES = {
  logo: '/images/logo.svg',
  placeholder: '/images/placeholder.png',
}

<Image asset="logo" alt="Logo" />
```

---

## Decision Framework

### Question Checklist

Before creating a new component, answer these questions:

1. **Layout Check**

   - [ ] Is this component part of layout (Header, Footer, Sidebar, Navigation)?
   - [ ] If yes, does a layout component already exist?
   - [ ] Can existing layout be tweaked with props/variants?

2. **Function Check**

   - [ ] What is the core function of this component?
   - [ ] Is there an existing component with the same core function?
   - [ ] Are there similar components that serve related purposes?

3. **Similarity Check**

   - [ ] What is the overlap percentage with existing components?
   - [ ] Can I achieve 60%+ with extension or tweaking?

4. **Variant Check**

   - [ ] Is this just a styling variant of existing component?
   - [ ] Can I add a variant prop instead?

5. **Props Check**

   - [ ] What props does this need?
   - [ ] Can existing component accept these through extension?
   - [ ] Can I tweak existing component to support these props?

6. **Composition Check**

   - [ ] Can I compose existing primitives to achieve this?
   - [ ] Is this just a new arrangement of existing components?
   - [ ] Can existing blocks be reused for this purpose?

7. **Tweaking Check**

   - [ ] Can existing component (60%+ overlap) be modified for reuse?
   - [ ] What minimal changes would make existing component work?
   - [ ] Is creating new component better than tweaking existing?

8. **Justification Check**
   - [ ] Why can't I extend an existing component?
   - [ ] Why can't I tweak an existing similar component?
   - [ ] What makes this fundamentally different?

**If you can't clearly answer the justification check, DO NOT create a new component.**

---

## Reusability Thresholds

| Atomic Level  | Reuse Threshold | Guideline                                                                  |
| ------------- | --------------- | -------------------------------------------------------------------------- |
| **Layout**    | 80%             | Always check first. Layout components should be reused/tweaked.            |
| **Primitive** | 90%             | Almost always extend. Primitives should be highly generic.                 |
| **Block**     | 70%             | Frequently extend. Blocks serve specific functions but should be flexible. |
| **Card**      | 50%             | Sometimes extend. Cards are more context-specific.                         |

**Special Considerations**:

- **Layout Components**: Header, Footer, Sidebar, Navigation - ALWAYS check existing layouts first
- **Similar Components** (60%+): Evaluate tweaking existing before creating new
- **Component Families**: If creating multiple similar components, consider shared base with variants

---

## Related Documentation

### Phoenix OS Memory

- `atomic-design.md` - Atomic Design methodology
- `token-mapping.md` - Design token integration
- `principal-guidelines.md` - DRY/KISS/YAGNI principles

---

**Version**: 1.0.0
**Last Updated**: 2025-11-05
**Status**: Active
