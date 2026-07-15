# Next.js Tech Stack Guidelines

## Overview
Guidelines for implementing Next.js based solutions in Phoenix OS projects.

## Best Practices

### Project Structure
```
app/
  (routes)/
    page.tsx
    layout.tsx
  api/
    route.ts
  components/
  lib/
  hooks/
public/
  assets/
```

### Routing and Navigation
- Use App Router (app directory) for new projects
- Implement route groups for logical organization
- Use server components by default
- Add 'use client' only when needed (interactivity, hooks)
- Leverage parallel and intercepting routes for complex UIs

### Rendering Strategies
- **Static Generation (SSG)**: Default for most pages
- **Server-Side Rendering (SSR)**: For dynamic, personalized content
- **Incremental Static Regeneration (ISR)**: For frequently updated content
- **Client-Side Rendering**: For highly interactive components
- Use Server Components for data fetching when possible

### Data Fetching
- Fetch data in Server Components directly
- Use fetch with caching and revalidation options
- Implement React Server Actions for mutations
- Use SWR or React Query for client-side data
- Avoid waterfalls with parallel data fetching

### Performance Optimization
- Use next/image for automatic image optimization
- Implement next/font for optimized font loading
- Enable dynamic imports for code splitting
- Use Suspense boundaries for streaming
- Optimize bundle size with tree shaking
- Implement route prefetching strategically

### File Organization
- Colocate components with routes when route-specific
- Share common components in /components
- Keep utilities and helpers in /lib
- Store custom hooks in /hooks
- Use barrel exports (index.ts) sparingly

### API Routes
- Use Route Handlers in app/api
- Implement proper HTTP methods (GET, POST, PUT, DELETE)
- Validate request data with Zod or similar
- Handle errors consistently
- Use middleware for authentication/authorization

### State Management
- React Context for simple shared state
- Zustand or Redux for complex client state
- Server state via Server Components
- URL state for shareable UI state
- Minimize client-side state

### Styling
- Tailwind CSS (recommended for utility-first approach)
- CSS Modules for component-scoped styles
- Styled Components or Emotion (if CSS-in-JS needed)
- Follow mobile-first responsive design
- Use CSS variables for theming

### Environment and Configuration
- Use .env.local for local secrets
- Use .env for committed defaults
- Prefix public env vars with NEXT_PUBLIC_
- Never commit sensitive keys
- Use next.config.js for build configuration

### Testing
- Unit tests with Jest and React Testing Library
- E2E tests with Playwright or Cypress
- Test Server Components and Actions
- Mock API routes in tests
- Aim for 80%+ coverage on critical paths

### Code Quality
- TypeScript for type safety (strongly recommended)
- ESLint with next/core-web-vitals config
- Prettier for code formatting
- Husky for pre-commit hooks
- Validate builds before deployment

### SEO and Metadata
- Use Metadata API for static metadata
- generateMetadata for dynamic metadata
- Implement proper Open Graph tags
- Add structured data (JSON-LD)
- Use canonical URLs
- Create sitemap.xml and robots.txt

### Security
- Implement CSRF protection for mutations
- Sanitize user inputs
- Use environment variables for secrets
- Implement rate limiting on API routes
- Set proper CORS policies
- Use Content Security Policy headers

## Recommended Libraries
- **Styling**: Tailwind CSS, shadcn/ui
- **State**: Zustand, Redux Toolkit
- **Forms**: React Hook Form, Zod
- **Data Fetching**: SWR, React Query
- **Auth**: NextAuth.js, Clerk
- **Testing**: Vitest, Playwright
- **UI Components**: Radix UI, Headless UI
- **Database**: Prisma, Drizzle ORM
- **Validation**: Zod, Yup

## Anti-Patterns to Avoid
- Using Pages Router for new projects
- Making all components client components
- Fetching data in useEffect when Server Components work
- Ignoring Web Vitals and Core Performance metrics
- Not using next/image and next/font optimizations
- Putting secrets in client-side code
- Over-using client-side state management
- Not implementing proper error boundaries

## Migration Considerations
- Gradually migrate Pages Router to App Router
- Move data fetching from getServerSideProps to Server Components
- Replace getStaticProps with native fetch caching
- Update API routes to Route Handlers
- Refactor _app and _document to layouts

## References
- [Next.js Documentation](https://nextjs.org/docs)
- [Next.js App Router](https://nextjs.org/docs/app)
- [React Server Components](https://nextjs.org/docs/app/building-your-application/rendering/server-components)
- [Next.js Best Practices](https://nextjs.org/docs/app/building-your-application/optimizing)
