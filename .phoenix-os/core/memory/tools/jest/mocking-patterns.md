# Jest Mocking Patterns

This document defines mocking patterns for the Jest ecosystem, covering jest built-in mocking, sinon, msw, and nock.

## Framework: jest (built-in)

### 1. Function/Method Mocking
```typescript
// Create mock function
const mockFn = jest.fn();
const mockFnWithImpl = jest.fn((x) => x + 1);

// Mock class method
const instance = new MyClass();
jest.spyOn(instance, 'method').mockImplementation(() => 'mocked');
```

### 2. Spy/Observation
```typescript
// Spy without changing implementation
const spy = jest.spyOn(object, 'method');
expect(spy).toHaveBeenCalled();
expect(spy).toHaveBeenCalledWith('arg1', 'arg2');
expect(spy).toHaveBeenCalledTimes(2);

// Spy on getter/setter
jest.spyOn(object, 'prop', 'get').mockReturnValue('value');
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
jest.mock('./module');

// Manual mock with factory
jest.mock('./api', () => ({
  fetchData: jest.fn().mockResolvedValue({ data: 'test' }),
  postData: jest.fn().mockResolvedValue({ success: true }),
}));

// Partial mock (keep some real implementations)
jest.mock('./utils', () => ({
  ...jest.requireActual('./utils'),
  targetFn: jest.fn(),
}));

// Mock node_modules
jest.mock('axios');
```

### 8. HTTP/API Mocking
```typescript
// Using jest with fetch mock
global.fetch = jest.fn().mockResolvedValue({
  ok: true,
  json: () => Promise.resolve({ data: 'test' }),
});

// Cleanup
afterEach(() => {
  jest.restoreAllMocks();
});
```

### 9. Timer/Date Mocking
```typescript
// Fake timers
jest.useFakeTimers();
jest.advanceTimersByTime(1000);
jest.runAllTimers();
jest.runOnlyPendingTimers();
jest.useRealTimers();

// Date mocking
jest.useFakeTimers({ now: new Date('2026-01-01') });
jest.setSystemTime(new Date('2026-06-15'));
```

### 10. Partial Mocking
```typescript
// Spy on specific method while keeping others real
const spy = jest.spyOn(service, 'fetchData').mockResolvedValue(mockData);
// Other methods on `service` remain unchanged

// Partial module mock
jest.mock('./module', () => ({
  ...jest.requireActual('./module'),
  specificExport: jest.fn(),
}));
```

### Cleanup & Reset
```typescript
// Per-test cleanup
afterEach(() => {
  jest.clearAllMocks();    // Clear call history, instances, results
  jest.resetAllMocks();    // Also reset implementations
  jest.restoreAllMocks();  // Restore original implementations (spies)
});
```

## Framework: sinon

### 1. Function/Method Mocking
```typescript
import sinon from 'sinon';
const stub = sinon.stub(object, 'method');
const stub = sinon.stub().returns('value');
```

### 2. Spy/Observation
```typescript
const spy = sinon.spy(object, 'method');
expect(spy.calledOnce).toBe(true);
expect(spy.calledWith('arg')).toBe(true);
expect(spy.callCount).toBe(2);
```

### 3. Stub with Return Values
```typescript
stub.returns('static');
stub.onFirstCall().returns('first');
stub.onSecondCall().returns('second');
stub.withArgs('specific').returns('matched');
stub.resolves('asyncValue');
```

### 4. Stub with Exceptions
```typescript
stub.throws(new Error('test error'));
stub.rejects(new Error('async error'));
stub.onFirstCall().throws(new Error('once'));
```

### 5. Argument Matching
```typescript
sinon.assert.calledWith(stub, sinon.match.string);
sinon.assert.calledWith(stub, sinon.match({ key: 'value' }));
sinon.assert.calledWith(stub, sinon.match.any);
sinon.assert.calledWith(stub, sinon.match.func);
```

### 6. Call Verification
```typescript
sinon.assert.called(stub);
sinon.assert.calledOnce(stub);
sinon.assert.calledTwice(stub);
sinon.assert.callOrder(stub1, stub2);
sinon.assert.neverCalledWith(stub, 'arg');
```

### 7-10 (General patterns same as jest but using sinon API)

### Cleanup & Reset
```typescript
afterEach(() => {
  sinon.restore(); // Restore all stubs, spies, and mocks
});
```

## Framework: msw (HTTP Mocking Layer)

### HTTP/API Mocking
```typescript
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';

const handlers = [
  http.get('/api/users', () => {
    return HttpResponse.json([{ id: 1, name: 'Test User' }]);
  }),
  http.post('/api/users', async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({ id: 2, ...body }, { status: 201 });
  }),
  http.delete('/api/users/:id', ({ params }) => {
    return new HttpResponse(null, { status: 204 });
  }),
];

const server = setupServer(...handlers);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

// Override for specific test
it('handles server error', async () => {
  server.use(
    http.get('/api/users', () => {
      return HttpResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    })
  );
  // ... test error handling
});
```

### Network Error Simulation
```typescript
import { http, HttpResponse } from 'msw';

server.use(
  http.get('/api/data', () => {
    return HttpResponse.error(); // Network error
  })
);
```

## Framework: nock (HTTP Mocking Layer)

### HTTP/API Mocking
```typescript
import nock from 'nock';

// Mock GET request
nock('https://api.example.com')
  .get('/users')
  .reply(200, [{ id: 1, name: 'Test' }]);

// Mock POST with body matching
nock('https://api.example.com')
  .post('/users', { name: 'New User' })
  .reply(201, { id: 2, name: 'New User' });

// Mock with headers
nock('https://api.example.com')
  .get('/protected')
  .matchHeader('Authorization', 'Bearer token')
  .reply(200, { data: 'secret' });

// Persist mock (don't consume after first match)
nock('https://api.example.com')
  .get('/status')
  .reply(200, 'ok')
  .persist();

// Cleanup
afterEach(() => {
  nock.cleanAll();
});
```

## Anti-Patterns

- **Don't mock the system under test** — only mock its dependencies
- **Don't over-mock** — if a dependency is simple and deterministic, use the real implementation
- **Don't forget cleanup** — always use `afterEach` to restore/clear mocks
- **Don't assert on mock internals** — assert on observable behavior, not how mocks were configured
- **Don't mix mocking frameworks** — use one general framework per test file (msw/nock as HTTP layer is OK)

---

**Version**: 1.0.0
**Last Updated**: 2026-03-18
**Status**: Active
