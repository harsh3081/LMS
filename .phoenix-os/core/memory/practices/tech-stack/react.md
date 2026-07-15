# React Tech Stack Guidelines

## Overview
Guidelines for implementing React based solutions in Phoenix OS projects.

## Best Practices

### Component Architecture
- Prefer functional components with hooks
- Keep components small and focused (Single Responsibility)
- Extract reusable logic into custom hooks
- Use composition over inheritance

### State Management
- Use React Context for simple global state
- Redux/Zustand for complex state management
- Keep state as local as possible
- Lift state only when necessary

### Performance Optimization
- Use React.memo for expensive components
- Implement useMemo and useCallback appropriately
- Lazy load routes and heavy components
- Virtualize long lists

### File Structure
```
src/
  components/
    common/
    feature-name/
  hooks/
  services/
  utils/
  pages/
```

### Styling
- CSS Modules or Styled Components
- Consistent design system (Material-UI, Chakra UI)
- Responsive design mobile-first
- Theme configuration for consistency

### Testing
- Unit tests with React Testing Library
- Integration tests for user flows
- E2E tests with Cypress or Playwright
- Test user behavior, not implementation

### Code Quality
- TypeScript for type safety
- ESLint + Prettier for consistency
- Prop-types or TypeScript interfaces
- Accessibility (a11y) compliance

## Recommended Libraries
- **State**: Redux Toolkit, Zustand, React Query
- **Routing**: React Router
- **Forms**: React Hook Form, Formik
- **UI**: Material-UI, Chakra UI, Ant Design
- **Testing**: React Testing Library, Vitest

## Anti-Patterns to Avoid
- Prop drilling (use Context or state management)
- Massive components (break down into smaller ones)
- Direct DOM manipulation (use refs sparingly)
- Mutating state directly

## References
- [React Documentation](https://react.dev)
- [React Best Practices](https://react.dev/learn/thinking-in-react)
