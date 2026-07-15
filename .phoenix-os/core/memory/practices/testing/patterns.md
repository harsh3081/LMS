# Test Patterns

This document defines test patterns for all supported stacks in Phoenix OS. Each stack section references its tool-specific mocking-patterns file for detailed mocking API usage.

## Stack: nodejs

### React Component Test Patterns

The following patterns apply to React/TypeScript components.

### Component Rendering Tests

### Basic Render Test
```typescript
import { render, screen } from '@testing-library/react';
import { ComponentName } from './ComponentName';

describe('ComponentName', () => {
  it('renders correctly', () => {
    render(<ComponentName />);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });
});
```

### Render with Props
```typescript
it('renders with custom props', () => {
  render(<ComponentName title="Test Title" variant="primary" />);
  expect(screen.getByText('Test Title')).toBeInTheDocument();
});
```

### Render with Children
```typescript
it('renders children correctly', () => {
  render(<ComponentName>Child Content</ComponentName>);
  expect(screen.getByText('Child Content')).toBeInTheDocument();
});
```

### User Interaction Tests

#### Click Events
```typescript
import userEvent from '@testing-library/user-event';

it('handles click events', async () => {
  const handleClick = jest.fn();
  const user = userEvent.setup();

  render(<Button onClick={handleClick}>Click Me</Button>);
  await user.click(screen.getByRole('button'));

  expect(handleClick).toHaveBeenCalledTimes(1);
});
```

#### Form Input
```typescript
it('handles text input', async () => {
  const handleChange = jest.fn();
  const user = userEvent.setup();

  render(<Input onChange={handleChange} />);
  await user.type(screen.getByRole('textbox'), 'test value');

  expect(handleChange).toHaveBeenCalled();
});
```

#### Form Submission
```typescript
it('handles form submission', async () => {
  const handleSubmit = jest.fn((e) => e.preventDefault());
  const user = userEvent.setup();

  render(
    <form onSubmit={handleSubmit}>
      <input name="email" />
      <button type="submit">Submit</button>
    </form>
  );

  await user.type(screen.getByRole('textbox'), 'test@example.com');
  await user.click(screen.getByRole('button'));

  expect(handleSubmit).toHaveBeenCalled();
});
```

### State Change Tests

#### useState Testing
```typescript
it('updates state on interaction', async () => {
  const user = userEvent.setup();

  render(<Counter />);
  expect(screen.getByText('Count: 0')).toBeInTheDocument();

  await user.click(screen.getByRole('button', { name: /increment/i }));
  expect(screen.getByText('Count: 1')).toBeInTheDocument();
});
```

#### Toggle State
```typescript
it('toggles visibility', async () => {
  const user = userEvent.setup();

  render(<Accordion title="Section" content="Hidden content" />);
  expect(screen.queryByText('Hidden content')).not.toBeInTheDocument();

  await user.click(screen.getByText('Section'));
  expect(screen.getByText('Hidden content')).toBeInTheDocument();
});
```

### Async Tests

#### Loading States
```typescript
it('shows loading state', async () => {
  render(<AsyncComponent />);

  expect(screen.getByText('Loading...')).toBeInTheDocument();
  await screen.findByText('Loaded Data');
  expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
});
```

#### API Calls
```typescript
import { rest } from 'msw';
import { setupServer } from 'msw/node';

const server = setupServer(
  rest.get('/api/data', (req, res, ctx) => {
    return res(ctx.json({ data: 'test' }));
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

it('fetches and displays data', async () => {
  render(<DataComponent />);

  await screen.findByText('test');
  expect(screen.getByText('test')).toBeInTheDocument();
});
```

### Error Handling Tests

#### Error State
```typescript
it('displays error message', async () => {
  server.use(
    rest.get('/api/data', (req, res, ctx) => {
      return res(ctx.status(500));
    })
  );

  render(<DataComponent />);

  await screen.findByText('Error loading data');
  expect(screen.getByRole('alert')).toBeInTheDocument();
});
```

#### Form Validation
```typescript
it('shows validation error', async () => {
  const user = userEvent.setup();

  render(<Form />);
  await user.click(screen.getByRole('button', { name: /submit/i }));

  expect(screen.getByText('Email is required')).toBeInTheDocument();
});
```

### Hook Tests

#### Custom Hook Testing
```typescript
import { renderHook, act } from '@testing-library/react';
import { useCounter } from './useCounter';

describe('useCounter', () => {
  it('increments counter', () => {
    const { result } = renderHook(() => useCounter());

    act(() => {
      result.current.increment();
    });

    expect(result.current.count).toBe(1);
  });
});
```

### Context Tests

#### Provider Testing
```typescript
const wrapper = ({ children }) => (
  <ThemeProvider theme="dark">{children}</ThemeProvider>
);

it('uses context value', () => {
  render(<ThemedComponent />, { wrapper });
  expect(screen.getByTestId('theme')).toHaveTextContent('dark');
});
```

### Accessibility Tests

#### Role-Based Queries
```typescript
it('has accessible button', () => {
  render(<IconButton aria-label="Close" />);
  expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument();
});
```

#### Keyboard Navigation
```typescript
it('supports keyboard navigation', async () => {
  const user = userEvent.setup();

  render(<Menu items={['Item 1', 'Item 2']} />);
  await user.tab();
  expect(screen.getByText('Item 1')).toHaveFocus();

  await user.keyboard('{ArrowDown}');
  expect(screen.getByText('Item 2')).toHaveFocus();
});
```

### Snapshot Tests

#### Component Snapshot
```typescript
it('matches snapshot', () => {
  const { container } = render(<Component />);
  expect(container).toMatchSnapshot();
});
```

#### Inline Snapshot
```typescript
it('matches inline snapshot', () => {
  const { container } = render(<Component />);
  expect(container.innerHTML).toMatchInlineSnapshot();
});
```

### Mock Patterns

#### Mock Child Components
```typescript
jest.mock('./ChildComponent', () => ({
  ChildComponent: () => <div data-testid="mock-child">Mocked</div>
}));
```

#### Mock Hooks
```typescript
jest.mock('./useData', () => ({
  useData: () => ({ data: 'mocked', loading: false })
}));
```

#### Mock Router
```typescript
import { MemoryRouter } from 'react-router-dom';

const wrapper = ({ children }) => (
  <MemoryRouter initialEntries={['/path']}>{children}</MemoryRouter>
);

render(<Component />, { wrapper });
```

> **Detailed Mocking Patterns**: For comprehensive mocking patterns covering 10 pattern categories (function mocking, spies, stubs, argument matching, module mocking, HTTP mocking, timer mocking, etc.), see:
> - Jest: `core/memory/tools/jest/mocking-patterns.md`
> - Vitest: `core/memory/tools/vitest/mocking-patterns.md`

---

## Stack: python

Python test patterns use pytest as the primary test runner with unittest.mock or pytest-mock for mocking.

**Mocking Patterns Reference**: `core/memory/tools/pytest/mocking-patterns.md`

Covers: unittest.mock, pytest-mock, monkeypatch, and responses across all 10 pattern categories.

---

## Stack: java

Java test patterns use JUnit 5 as the primary test framework with Mockito for mocking.

**Mocking Patterns Reference**: `core/memory/tools/junit/mocking-patterns.md`

Covers: Mockito, EasyMock, and WireMock across all 10 pattern categories.

---

## Stack: go

Go test patterns use the built-in `testing` package with interface-based mocking.

**Mocking Patterns Reference**: `core/memory/tools/go-test/mocking-patterns.md`

Covers: gomock, testify/mock, mockery, and httpmock across all 10 pattern categories.

---

## Stack: dotnet

.NET test patterns support xUnit, NUnit, and MSTest frameworks.

**Testing Patterns Reference**: `core/memory/practices/testing/patterns-dotnet.md`
**Mocking Patterns Reference**: `core/memory/tools/dotnet-test/mocking-patterns.md`

Covers: Moq, NSubstitute, FakeItEasy, and WireMock.Net across all 10 pattern categories.

---

**Version**: 2.0.0
**Last Updated**: 2026-03-18
**Status**: Active
