# Atomic Design Methodology

**Category**: Practices / Component Generation
**Version**: 1.0.0
**Technology-Agnostic**: Yes

---

## Overview

Atomic Design is a methodology for creating design systems by breaking interfaces into fundamental building blocks. Components are organized hierarchically from smallest (atoms) to largest (organisms), promoting reusability and maintainability.

**Important**: This is technology-agnostic guidance. Framework-specific implementations reference tech-stack memory files.

---

## Component Hierarchy

### Primitives (Atoms)

**Definition**: The smallest, most fundamental building blocks that cannot be broken down further without losing their function.

**Characteristics**:

- Single HTML element or minimal wrapper
- Single purpose, focused functionality
- No internal child components
- Highly reusable across all contexts
- Self-contained with minimal props

**Examples**:

- Button
- Input
- Label
- Icon
- Avatar
- Badge
- Checkbox
- Radio button
- Image

**Detection Criteria**:

- Single HTML element (button, input, img, svg, etc.)
- No child components or simple text/icon children only
- <3 configurable properties
- Serves exactly one purpose

**File Organization**:

```
packages/
├── ui/
│   └── components/
│       └── primitives/
│           ├── Button.tsx
│           ├── Input.tsx
│           ├── Icon.tsx
│           └── index.ts
```

**Rationale**: Primitives are shared across all applications, so they live in the packages directory for reusability.

---

### Blocks (Molecules)

**Definition**: Simple combinations of primitives working together as a single functional unit.

**Characteristics**:

- Composed of 2-5 primitives
- Single cohesive function
- Interactive but focused scope
- Reusable across similar contexts
- Specific purpose within larger interface

**Examples**:

- Search bar (Input + Icon + Button)
- Form field (Label + Input + Error message)
- Navigation item (Icon + Text + Badge)
- Dropdown (Button + Menu + Items)
- Card header (Avatar + Text + Action button)

**Detection Criteria**:

- Contains 2-5 primitive components
- Serves one specific function
- Interactive elements working together
- Not a complete interface section

**File Organization**:

```
packages/
├── ui/
│   └── components/
│       └── blocks/
│           ├── SearchBar.tsx
│           ├── FormField.tsx
│           ├── NavItem.tsx
│           └── index.ts
```

**Rationale**: Blocks are reusable combinations of primitives, shared across applications.

---

### Cards (Organisms)

**Definition**: Complex components composed of multiple blocks and/or primitives, representing distinct interface sections.

**Characteristics**:

- Contains multiple blocks or 6+ primitives
- Represents interface sections
- Multiple functionalities combined
- Context-specific but still reusable
- Self-contained units of functionality

**Examples**:

- Header (Logo + Navigation + Search + UserMenu)
- Sidebar (Logo + NavItems + Footer)
- Product card (Image + Title + Price + Rating + AddToCart)
- User profile (Avatar + Bio + Stats + Actions)
- Login form (Title + FormFields + SocialButtons + Links)

**Detection Criteria**:

- Contains multiple blocks or 6+ primitives
- Represents complete interface section
- Multiple functional areas
- High complexity with internal structure

**File Organization**:

```
apps/
├── {app-name}/
│   └── components/
│       ├── cards/
│       │   ├── ProductCard.tsx
│       │   ├── UserProfile.tsx
│       │   └── index.ts
│       └── layout/
│           ├── Header.tsx
│           ├── Sidebar.tsx
│           ├── Footer.tsx
│           └── index.ts
```

**Rationale**: Cards are complex, context-specific components tied to specific applications. Layout components (Header, Footer, Sidebar, Navigation) should be placed in a dedicated `layout/` directory within the app.

---

## Classification Rules

### Decision Tree

```
Component Analysis
├─ Single HTML element or simple wrapper?
│   └─ YES → Primitive (Atom)
├─ Contains 2-5 primitives?
│   └─ YES → Block (Molecule)
├─ Contains multiple blocks or 6+ primitives?
│   └─ YES → Card (Organism)
└─ Complex hierarchical structure?
    └─ YES → Card (Organism)
```

### Complexity Scoring

Use this scoring system to determine atomic level:

| Metric             | Primitive    | Block      | Card            |
| ------------------ | ------------ | ---------- | --------------- |
| Child components   | 0-1          | 2-5        | 6+              |
| Nesting levels     | 1            | 2-3        | 3+              |
| Functions/purposes | 1            | 1-2        | 3+              |
| Props complexity   | Low          | Medium     | High            |
| State management   | None/minimal | Local only | Multiple states |

**Scoring**:

- Sum the category matches
- 4-5 matches → Classify as that level
- 2-3 matches → Evaluate context and lean toward higher complexity

---

## Component Naming Conventions

### Primitives

- Use singular nouns: `Button`, `Input`, `Icon`, `Badge`
- Describe the element itself: `Avatar`, `Checkbox`, `Label`
- Avoid action-based names: ~~`ClickHandler`~~, ~~`InputCollector`~~

### Blocks

- Use descriptive compound names: `SearchBar`, `FormField`, `NavItem`
- Describe the function: `LoginButton`, `UserMenu`, `Dropdown`
- Include context when needed: `SocialLoginButton`, `ProductPrice`

### Cards

- Use interface section names: `Header`, `Sidebar`, `Footer`
- Use entity + context: `ProductCard`, `UserProfile`, `CommentThread`
- Describe the complete unit: `LoginForm`, `HeroSection`, `PricingTable`

---

## Composition Principles

### Primitive Composition

Primitives should be **pure** and **stateless** when possible:

**Good**:

```typescript
// Simple, focused primitive
<Button variant="primary" size="md" onClick={handleClick}>
  Click me
</Button>
```

**Bad**:

```typescript
// Over-engineered primitive with internal complexity
<Button
  variant="primary"
  size="md"
  onClick={handleClick}
  loading={isLoading}
  icon={<Icon name="arrow" />}
  tooltip="Click to submit"
  analyticsTrack="button_click"
>
  Submit
</Button>
```

### Block Composition

Blocks combine primitives for specific functions:

**Good**:

```typescript
// Clear combination of primitives
<SearchBar>
  <Input placeholder="Search..." />
  <Icon name="search" />
  <Button>Search</Button>
</SearchBar>
```

**Bad**:

```typescript
// Too many responsibilities in one block
<SearchBar
  onSearch={handleSearch}
  filters={<FilterDropdown />}
  results={<ResultsList />}
  history={<SearchHistory />}
/>
```

### Card Composition

Cards orchestrate blocks and primitives into complete sections:

**Good**:

```typescript
// Well-structured card with clear sections
<ProductCard>
  <ProductImage src={image} />
  <ProductInfo>
    <ProductTitle>{title}</ProductTitle>
    <ProductPrice>{price}</ProductPrice>
    <ProductRating rating={rating} />
  </ProductInfo>
  <ProductActions>
    <AddToCartButton />
    <WishlistButton />
  </ProductActions>
</ProductCard>
```

**Bad**:

```typescript
// Mixing atomic levels inappropriately
<ProductCard>
  {/* Mixing primitives and complex logic */}
  <div>{title}</div>
  <span>{price}</span>
  <CompleteCheckoutForm />
  <InventoryManagementPanel />
</ProductCard>
```

---

## Anti-Patterns

### Avoid: Primitive Bloat

**Problem**: Creating too many specific primitives

**Bad**:

```
primitives/
├── RedButton.tsx
├── BlueButton.tsx
├── LargeButton.tsx
├── SmallRedButton.tsx
├── IconBlueButton.tsx
```

**Good**:

```
primitives/
└── Button.tsx  // With variants: color, size, icon support
```

---

### Avoid: Block Confusion

**Problem**: Unclear distinction between blocks and cards

**Bad**:

```typescript
// This is actually a card, not a block
<NavigationBlock>
  <Logo />
  <MenuItems />
  <SearchBar />
  <UserMenu />
  <Notifications />
</NavigationBlock>
```

**Good**:

```typescript
// Correctly classified as card
<Header>
  <Logo />
  <Navigation />
  <SearchBar />
  <UserMenu />
</Header>
```

---

### Avoid: Card Overload

**Problem**: Cards that are too complex or do too much

**Bad**:

```typescript
// Too much in one card
<MegaCard>
  <Header />
  <Sidebar />
  <MainContent />
  <Footer />
  <Modals />
  <Notifications />
</MegaCard>
```

**Good**:

```typescript
// Break into multiple focused cards
<PageLayout>
  <Header />
  <ContentArea>
    <Sidebar />
    <MainContent />
  </ContentArea>
  <Footer />
</PageLayout>
```

---

## Testing Strategy

### Primitive Testing

- **Unit tests**: Test in isolation
- **Snapshot tests**: Verify rendering
- **Interaction tests**: Test user interactions
- **Accessibility tests**: ARIA, keyboard navigation

### Block Testing

- **Integration tests**: Test primitive composition
- **Interaction tests**: Test block-specific behavior
- **Accessibility tests**: Combined accessibility
- **State tests**: Test internal state management

### Card Testing

- **Integration tests**: Test block/primitive orchestration
- **Layout tests**: Verify complex layouts
- **Responsive tests**: Test breakpoint behavior
- **Accessibility tests**: Complete section accessibility

---

## Migration Strategy

### From Unstructured to Atomic

1. **Audit existing components**

   - List all components
   - Analyze complexity and dependencies
   - Identify primitives used across multiple places

2. **Extract primitives**

   - Identify reusable single-element components
   - Create primitive components in `packages/ui/components/primitives/`
   - Replace hardcoded elements with primitives
   - **Never duplicate existing primitives - extend them instead**

3. **Compose blocks**

   - Group primitives that work together
   - Create block components in `packages/ui/components/blocks/`
   - Replace primitive combinations with blocks
   - **Check existing blocks first - prefer modification over creation**

4. **Organize cards**

   - Identify complex interface sections
   - Refactor into cards using blocks/primitives
   - Place in app-specific `apps/{app-name}/components/cards/`
   - Ensure clear hierarchy

5. **Update imports and structure**
   - Move files to atomic directories (packages vs apps)
   - Update import paths to reference packages
   - Create index files for barrel exports
   - Download and organize image assets in assets folder

### Component Existence Check

**Before creating any component**:

1. **Identify if component is part of layout** (Header, Footer, Sidebar, Navigation)
   - If yes → Check `apps/{app-name}/components/layout/` first
2. Search for existing component with same name
3. **Search for similar components** that serve related purposes
4. **Evaluate if existing component can be tweaked** (props, variants, styling)
   - 60%+ overlap → Consider extending or tweaking existing
   - Can new functionality be added via props/variants?
5. If found → Modify/extend/tweak existing
6. If not found or <50% overlap → Create new in appropriate location
   - Justify why reuse isn't viable

---

## Related Documentation

### Phoenix OS Memory

- `reusability-patterns.md` - Component reuse strategies
- `token-mapping.md` - Design token integration
- `responsive-design.md` - Responsive component patterns

### External Resources

- Atomic Design by Brad Frost: https://atomicdesign.bradfrost.com/
- Component-Driven Development: https://www.componentdriven.org/

---

**Version**: 1.0.0
**Last Updated**: 2025-11-05
**Status**: Active
