# Vitest Mocking Patterns

This document defines mocking patterns for the Vitest test framework using the built-in `vi.*` API.

## Framework: vitest (built-in vi.* API)

### 1. Function/Method Mocking
```typescript
import { vi } from 'vitest';

// Create mock function
const mockFn = vi.fn();
const mockFnWithImpl = vi.fn((x) => x + 1);

// Mock class method
const instance = new MyClass();
vi.spyOn(instance, 'method').mockImplementation(() => 'mocked');
```

### 2. Spy/Observation
```typescript
const spy = vi.spyOn(object, 'method');
expect(spy).toHaveBeenCalled();
expect(spy).toHaveBeenCalledWith('arg1', 'arg2');
expect(spy).toHaveBeenCalledTimes(2);

// Spy on getter/setter
vi.spyOn(object, 'prop', 'get').mockReturnValue('value');
```

### 3. Stub with Return Values
```typescript
mockFn.mockReturnValue('static');
mockFn.mockReturnValueOnce('first').mockReturnValueOnce('second');
mockFn.mockImplementation(() => 'computed');
```

### 4. Stub with Exceptions
```typescript
mockFn.mockImplementation(() => { throw new Error('test error'); });
mockFn.mockRejectedValue(new Error('async error'));
mockFn.mockRejectedValueOnce(new Error('one-time error'));
```

### 5. Argument Matching
```typescript
expect(mockFn).toHaveBeenCalledWith(
  expect.any(String),
  expect.objectContaining({ key: 'value' }),
  expect.arrayContaining([1, 2])
);
expect(mockFn).toHaveBeenCalledWith(expect.anything());
expect(mockFn).toHaveBeenCalledWith(expect.stringContaining('partial'));
expect(mockFn).toHaveBeenCalledWith(expect.stringMatching(/regex/));
```

### 6. Call Verification
```typescript
expect(mockFn).toHaveBeenCalled();
expect(mockFn).toHaveBeenCalledTimes(3);
expect(mockFn).toHaveBeenLastCalledWith('arg');
expect(mockFn).toHaveBeenNthCalledWith(1, 'firstArg');
expect(mockFn).toHaveReturnedWith('value');
```

### 7. Module/Import Mocking
```typescript
// Auto-mock entire module
vi.mock('./module');

// Manual mock with factory
vi.mock('./api', () => ({
  fetchData: vi.fn().mockResolvedValue({ data: 'test' }),
  postData: vi.fn().mockResolvedValue({ success: true }),
}));

// Partial mock (keep some real implementations)
vi.mock('./utils', async () => {
  const actual = await vi.importActual('./utils');
  return {
    ...actual,
    targetFn: vi.fn(),
  };
});

// Mock node_modules
vi.mock('axios');

// Dynamic import mock
const { myFn } = await vi.importMock('./module');
```

### 8. HTTP/API Mocking
```typescript
// Using vi with fetch mock
const fetchMock = vi.fn().mockResolvedValue({
  ok: true,
  json: () => Promise.resolve({ data: 'test' }),
});
vi.stubGlobal('fetch', fetchMock);

// Cleanup
afterEach(() => {
  vi.unstubAllGlobals();
});
```

### 9. Timer/Date Mocking
```typescript
// Fake timers
vi.useFakeTimers();
vi.advanceTimersByTime(1000);
vi.runAllTimers();
vi.runOnlyPendingTimers();
vi.useRealTimers();

// Date mocking
vi.useFakeTimers({ now: new Date('2026-01-01') });
vi.setSystemTime(new Date('2026-06-15'));
```

### 10. Partial Mocking
```typescript
// Spy on specific method while keeping others real
const spy = vi.spyOn(service, 'fetchData').mockResolvedValue(mockData);

// Partial module mock
vi.mock('./module', async () => {
  const actual = await vi.importActual('./module');
  return {
    ...actual,
    specificExport: vi.fn(),
  };
});
```

### Cleanup & Reset
```typescript
afterEach(() => {
  vi.clearAllMocks();    // Clear call history
  vi.resetAllMocks();    // Also reset implementations
  vi.restoreAllMocks();  // Restore original implementations (spies)
  vi.unstubAllGlobals(); // Restore stubbed globals
});
```

### Key Differences from Jest
- Use `vi.fn()` instead of `jest.fn()`
- Use `vi.mock()` instead of `jest.mock()`
- Use `vi.spyOn()` instead of `jest.spyOn()`
- Use `vi.importActual()` with `await` (async) instead of `jest.requireActual()` (sync)
- Use `vi.importMock()` for dynamic mock imports
- Use `vi.stubGlobal()` for global stubs (more explicit than jest)
- Use `vi.unstubAllGlobals()` for global cleanup

## Anti-Patterns

- **Don't mock the system under test** — only mock its dependencies
- **Don't over-mock** — if a dependency is simple and deterministic, use the real implementation
- **Don't forget cleanup** — always use `afterEach` to restore/clear mocks
- **Don't assert on mock internals** — assert on observable behavior
- **Don't use jest.fn() in vitest** — always use vi.fn() for consistency

---

**Version**: 1.0.0
**Last Updated**: 2026-03-18
**Status**: Active
