# Go Test Patterns

This document defines test patterns for Go projects in Phoenix OS. It covers the **Go `testing` stdlib** (primary) with **testify** as the assertion and mocking enhancement layer for all eight required content areas. All examples target Go 1.21+ and follow the four-phase pattern (Setup-Exercise-Verify-Teardown) and the `TestMethodName_Scenario_ExpectedResult` naming convention (exported `Test` prefix required by `go test`; PascalCase segments separated by underscores).

**Frameworks in scope**:
- `testing` (stdlib, primary test runner)
- `testify` >= 1.8 (`assert`, `require`, `mock`, `suite` sub-packages)
- `net/http/httptest` (stdlib, HTTP test doubles — used in the mocking section)
- `sync`, `context` (stdlib, concurrency and timeout patterns)
- `golang.org/x/sync/errgroup` (extended concurrency helpers)

**Naming convention**:
- Top-level test functions: `TestMethodName_Scenario_ExpectedResult` (exported, PascalCase per segment)
- `t.Run()` subtest names: `"Scenario_ExpectedResult"` (scenario + expected, omit the method name since it is already the parent)
- Benchmark functions: `BenchmarkMethodName_Scenario`
- Example functions: `ExampleMethodName`
- Fuzz functions: `FuzzMethodName` (Go 1.18+)

---

## 1. Unit Test Structure

### stdlib — Basic Test Function Anatomy

Every test function must be exported (`Test` prefix), accept `*testing.T`, and live in a `_test.go` file. No framework or registration required.

```go
// services/order_service_test.go
package services

import (
    "testing"

    "github.com/stretchr/testify/assert"
)

func TestCreateOrder_ValidRequest_ReturnsOrder(t *testing.T) {
    // Setup
    service := NewOrderService()
    request := OrderRequest{ProductID: 1, Quantity: 2}

    // Exercise
    result, err := service.CreateOrder(request)

    // Verify
    assert.NoError(t, err)
    assert.NotNil(t, result)
    assert.Equal(t, int64(1), result.ProductID)
    assert.Equal(t, 2, result.Quantity)
}

func TestCreateOrder_ZeroQuantity_ReturnsError(t *testing.T) {
    // Setup
    service := NewOrderService()
    request := OrderRequest{ProductID: 1, Quantity: 0}

    // Exercise
    _, err := service.CreateOrder(request)

    // Verify
    assert.Error(t, err)
    assert.Contains(t, err.Error(), "quantity must be positive")
}
```

### stdlib — t.Run() Subtests for Grouping

`t.Run()` creates a named subtest. Subtests appear in output as `TestParent/SubtestName`. They can be run selectively with `-run TestParent/SubtestName`.

```go
func TestCreateOrder(t *testing.T) {
    t.Run("ValidRequest_ReturnsOrder", func(t *testing.T) {
        // Setup
        service := NewOrderService()
        request := OrderRequest{ProductID: 1, Quantity: 2}

        // Exercise
        result, err := service.CreateOrder(request)

        // Verify
        assert.NoError(t, err)
        assert.NotNil(t, result)
    })

    t.Run("ZeroQuantity_ReturnsError", func(t *testing.T) {
        // Setup
        service := NewOrderService()
        request := OrderRequest{ProductID: 1, Quantity: 0}

        // Exercise
        _, err := service.CreateOrder(request)

        // Verify
        assert.Error(t, err)
    })

    t.Run("MissingProductID_ReturnsError", func(t *testing.T) {
        // Setup
        service := NewOrderService()
        request := OrderRequest{Quantity: 2} // zero ProductID

        // Exercise
        _, err := service.CreateOrder(request)

        // Verify
        assert.Error(t, err)
        assert.Contains(t, err.Error(), "product ID required")
    })
}
```

### stdlib — t.Helper() for Test Helper Functions

`t.Helper()` marks the calling function as a test helper. When an assertion in the helper fails, the error is reported at the call site, not inside the helper.

```go
// assertOrderEquals is a reusable helper — must call t.Helper()
func assertOrderEquals(t *testing.T, expected, actual Order) {
    t.Helper()
    assert.Equal(t, expected.ProductID, actual.ProductID, "ProductID mismatch")
    assert.Equal(t, expected.Quantity, actual.Quantity, "Quantity mismatch")
    assert.Equal(t, expected.Status, actual.Status, "Status mismatch")
}

func TestCreateOrder_ValidRequest_MatchesRequest(t *testing.T) {
    // Setup
    service := NewOrderService()
    request := OrderRequest{ProductID: 1, Quantity: 2}

    // Exercise
    result, err := service.CreateOrder(request)

    // Verify
    assert.NoError(t, err)
    assertOrderEquals(t, Order{ProductID: 1, Quantity: 2, Status: StatusCreated}, *result)
}
```

### testify Suite — Class-Style Grouping

`testify/suite` provides class-style test grouping with lifecycle methods. Use when you need shared state across multiple test methods and `TestMain` is too coarse.

```go
import (
    "testing"

    "github.com/stretchr/testify/suite"
)

type OrderServiceSuite struct {
    suite.Suite
    service *OrderService
}

func (s *OrderServiceSuite) SetupTest() {
    // Setup — runs before each test method in the suite
    s.service = NewOrderService()
}

func (s *OrderServiceSuite) TestCreateOrder_ValidRequest_ReturnsOrder() {
    // Setup (test-specific)
    request := OrderRequest{ProductID: 1, Quantity: 2}

    // Exercise
    result, err := s.service.CreateOrder(request)

    // Verify
    s.Require().NoError(err)
    s.Assert().Equal(int64(1), result.ProductID)
}

func (s *OrderServiceSuite) TestCreateOrder_ZeroQuantity_ReturnsError() {
    // Setup
    request := OrderRequest{ProductID: 1, Quantity: 0}

    // Exercise
    _, err := s.service.CreateOrder(request)

    // Verify
    s.Assert().Error(err)
}

// Entry point — required to run the suite
func TestOrderServiceSuite(t *testing.T) {
    suite.Run(t, new(OrderServiceSuite))
}
```

### testify Suite — Suite-Level Setup

`SetupSuite` / `TearDownSuite` run once for the entire suite. Use for expensive resources (database connections, test servers).

```go
type DatabaseSuite struct {
    suite.Suite
    db   *sql.DB
    repo *OrderRepository
}

func (s *DatabaseSuite) SetupSuite() {
    // Setup (once for all tests in suite)
    var err error
    s.db, err = sql.Open("sqlite3", ":memory:")
    s.Require().NoError(err)
    s.Require().NoError(runMigrations(s.db))
    s.repo = NewOrderRepository(s.db)
}

func (s *DatabaseSuite) TearDownSuite() {
    // Teardown (once after all tests in suite)
    s.db.Close()
}

func (s *DatabaseSuite) SetupTest() {
    // Setup (per test — clear data between tests)
    _, _ = s.db.Exec("DELETE FROM orders")
}

func (s *DatabaseSuite) TestSave_ValidOrder_Persists() {
    // Setup
    order := Order{ProductID: 1, Quantity: 2}

    // Exercise
    saved, err := s.repo.Save(order)

    // Verify
    s.Require().NoError(err)
    s.Assert().NotZero(saved.ID)
}

func TestDatabaseSuite(t *testing.T) {
    suite.Run(t, new(DatabaseSuite))
}
```

---

## 2. Mocking and Stubbing

### Interface-Based Test Doubles (Primary — Idiomatic Go)

Go's implicit interface satisfaction means any struct that has the required methods implements the interface. Define a minimal fake at the consumer side — no code generation required.

```go
// services/order_service_test.go
package services

import (
    "errors"
    "testing"

    "github.com/stretchr/testify/assert"
)

// Interface defined at the consumer side (Go convention: accept interfaces, return structs)
type OrderRepository interface {
    Save(order Order) (Order, error)
    FindByID(id int64) (Order, error)
    Delete(id int64) error
}

// Manual fake — explicit, readable, zero dependencies
type fakeOrderRepo struct {
    savedOrders map[int64]Order
    nextID      int64
    saveErr     error
    findErr     error
}

func newFakeOrderRepo() *fakeOrderRepo {
    return &fakeOrderRepo{savedOrders: make(map[int64]Order), nextID: 1}
}

func (f *fakeOrderRepo) Save(order Order) (Order, error) {
    if f.saveErr != nil {
        return Order{}, f.saveErr
    }
    order.ID = f.nextID
    f.nextID++
    f.savedOrders[order.ID] = order
    return order, nil
}

func (f *fakeOrderRepo) FindByID(id int64) (Order, error) {
    if f.findErr != nil {
        return Order{}, f.findErr
    }
    if order, ok := f.savedOrders[id]; ok {
        return order, nil
    }
    return Order{}, ErrNotFound
}

func (f *fakeOrderRepo) Delete(id int64) error {
    delete(f.savedOrders, id)
    return nil
}

func TestCreateOrder_ValidRequest_SavesAndReturnsOrder(t *testing.T) {
    // Setup
    repo := newFakeOrderRepo()
    service := NewOrderService(repo)
    request := OrderRequest{ProductID: 1, Quantity: 2}

    // Exercise
    result, err := service.CreateOrder(request)

    // Verify
    assert.NoError(t, err)
    assert.NotZero(t, result.ID)
    assert.Equal(t, int64(1), result.ProductID)
    assert.Len(t, repo.savedOrders, 1) // verify side effect
}

func TestCreateOrder_RepositoryFailure_ReturnsWrappedError(t *testing.T) {
    // Setup
    repo := newFakeOrderRepo()
    repo.saveErr = errors.New("connection refused")
    service := NewOrderService(repo)

    // Exercise
    _, err := service.CreateOrder(OrderRequest{ProductID: 1, Quantity: 1})

    // Verify
    assert.Error(t, err)
    assert.Contains(t, err.Error(), "failed to persist")
}
```

### testify/mock — Complex Verification Scenarios

Use `testify/mock` when you need call-count verification, argument matching, or ordered call sequences that are awkward with manual fakes.

```go
import (
    "github.com/stretchr/testify/mock"
)

// Mock implementation using testify
type MockOrderRepository struct {
    mock.Mock
}

func (m *MockOrderRepository) Save(order Order) (Order, error) {
    args := m.Called(order)
    return args.Get(0).(Order), args.Error(1)
}

func (m *MockOrderRepository) FindByID(id int64) (Order, error) {
    args := m.Called(id)
    return args.Get(0).(Order), args.Error(1)
}

func (m *MockOrderRepository) Delete(id int64) error {
    args := m.Called(id)
    return args.Error(0)
}

func TestCreateOrder_ValidRequest_CallsSaveExactlyOnce(t *testing.T) {
    // Setup
    mockRepo := new(MockOrderRepository)
    savedOrder := Order{ID: 42, ProductID: 1, Quantity: 2}
    mockRepo.On("Save", mock.AnythingOfType("Order")).Return(savedOrder, nil)

    service := NewOrderService(mockRepo)
    request := OrderRequest{ProductID: 1, Quantity: 2}

    // Exercise
    result, err := service.CreateOrder(request)

    // Verify
    assert.NoError(t, err)
    assert.Equal(t, int64(42), result.ID)
    mockRepo.AssertExpectations(t)        // all On() calls were made
    mockRepo.AssertCalled(t, "Save", mock.AnythingOfType("Order"))
    mockRepo.AssertNumberOfCalls(t, "Save", 1)
}

func TestDeleteOrder_RepositoryDeleteFails_ReturnsError(t *testing.T) {
    // Setup
    mockRepo := new(MockOrderRepository)
    mockRepo.On("FindByID", int64(1)).Return(Order{ID: 1}, nil)
    mockRepo.On("Delete", int64(1)).Return(errors.New("delete failed"))

    service := NewOrderService(mockRepo)

    // Exercise
    err := service.DeleteOrder(1)

    // Verify
    assert.Error(t, err)
    mockRepo.AssertExpectations(t)
}
```

### httptest — HTTP Handler and Client Testing

`net/http/httptest` provides a real HTTP server and response recorder for unit-testing HTTP handlers and HTTP-dependent clients without a real network.

```go
import (
    "encoding/json"
    "net/http"
    "net/http/httptest"
    "testing"

    "github.com/stretchr/testify/assert"
    "github.com/stretchr/testify/require"
)

// Testing an HTTP handler with ResponseRecorder
func TestOrderHandler_GetOrder_ValidID_ReturnsJSONOrder(t *testing.T) {
    // Setup
    repo := newFakeOrderRepo()
    repo.savedOrders[1] = Order{ID: 1, ProductID: 10, Quantity: 2}
    handler := NewOrderHandler(NewOrderService(repo))

    req := httptest.NewRequest(http.MethodGet, "/orders/1", nil)
    rec := httptest.NewRecorder()

    // Exercise
    handler.GetOrder(rec, req)

    // Verify
    assert.Equal(t, http.StatusOK, rec.Code)
    var body Order
    require.NoError(t, json.NewDecoder(rec.Body).Decode(&body))
    assert.Equal(t, int64(1), body.ID)
}

func TestOrderHandler_GetOrder_MissingID_Returns404(t *testing.T) {
    // Setup
    handler := NewOrderHandler(NewOrderService(newFakeOrderRepo()))
    req := httptest.NewRequest(http.MethodGet, "/orders/999", nil)
    rec := httptest.NewRecorder()

    // Exercise
    handler.GetOrder(rec, req)

    // Verify
    assert.Equal(t, http.StatusNotFound, rec.Code)
}

// Testing an HTTP client against a stub server
func TestOrderClient_FetchOrder_ValidResponse_ParsesOrder(t *testing.T) {
    // Setup — start a stub HTTP server
    server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        w.Header().Set("Content-Type", "application/json")
        json.NewEncoder(w).Encode(Order{ID: 1, ProductID: 10, Quantity: 2})
    }))
    t.Cleanup(server.Close) // Teardown: auto-close after test

    client := NewOrderClient(server.URL)

    // Exercise
    result, err := client.FetchOrder(1)

    // Verify
    require.NoError(t, err)
    assert.Equal(t, int64(1), result.ID)
}

func TestOrderClient_ServerError_ReturnsError(t *testing.T) {
    // Setup
    server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        http.Error(w, "internal server error", http.StatusInternalServerError)
    }))
    t.Cleanup(server.Close)

    client := NewOrderClient(server.URL)

    // Exercise
    _, err := client.FetchOrder(1)

    // Verify
    assert.Error(t, err)
}
```

### Dependency Injection for Testability

Go's idiomatic pattern: accept interfaces as parameters, return concrete structs. This makes all dependencies swappable in tests without any mocking framework.

```go
// Production code: accept interface, return struct
type NotificationSender interface {
    Send(to, subject, body string) error
}

type OrderService struct {
    repo   OrderRepository   // interface — swappable in tests
    sender NotificationSender // interface — swappable in tests
}

func NewOrderService(repo OrderRepository, sender NotificationSender) *OrderService {
    return &OrderService{repo: repo, sender: sender}
}

// Test code: inject fakes
type fakeNotificationSender struct {
    sentMessages []string
}

func (f *fakeNotificationSender) Send(to, subject, body string) error {
    f.sentMessages = append(f.sentMessages, to)
    return nil
}

func TestCreateOrder_ValidRequest_SendsConfirmationNotification(t *testing.T) {
    // Setup
    repo := newFakeOrderRepo()
    sender := &fakeNotificationSender{}
    service := NewOrderService(repo, sender)
    request := OrderRequest{ProductID: 1, Quantity: 2, CustomerEmail: "user@example.com"}

    // Exercise
    _, err := service.CreateOrder(request)

    // Verify
    assert.NoError(t, err)
    assert.Len(t, sender.sentMessages, 1)
    assert.Equal(t, "user@example.com", sender.sentMessages[0])
}
```

---

## 3. Assertion Patterns

### stdlib — Manual Assertion Pattern

The baseline Go assertion: compare values with `==` or `reflect.DeepEqual` and call `t.Errorf`/`t.Fatalf` on mismatch. Verbose, but zero dependencies.

```go
import (
    "reflect"
    "testing"
)

func TestCalculateTotal_TwoUnitsAtFifteen_ReturnsThirty(t *testing.T) {
    // Setup
    quantity := 2
    price := 15.0

    // Exercise
    got := calculateTotal(quantity, price)

    // Verify
    want := 30.0
    if got != want {
        t.Errorf("calculateTotal(%d, %f) = %f, want %f", quantity, price, got, want)
    }
}

func TestCreateOrder_ValidRequest_MatchesInput(t *testing.T) {
    // Setup
    service := NewOrderService()
    request := OrderRequest{ProductID: 1, Quantity: 2}

    // Exercise
    result, err := service.CreateOrder(request)
    if err != nil {
        t.Fatalf("unexpected error: %v", err) // Fatal stops the test immediately
    }

    // Verify — deep equality for structs
    expected := &Order{ProductID: 1, Quantity: 2, Status: StatusCreated}
    if !reflect.DeepEqual(expected.ProductID, result.ProductID) {
        t.Errorf("ProductID: got %d, want %d", result.ProductID, expected.ProductID)
    }
}
```

### go-cmp — Readable Struct Diffs

`github.com/google/go-cmp/cmp` produces human-readable diffs for struct comparisons. Useful when `reflect.DeepEqual` failures are hard to diagnose.

```go
import (
    "testing"

    "github.com/google/go-cmp/cmp"
    "github.com/google/go-cmp/cmp/cmpopts"
)

func TestCreateOrder_ValidRequest_ProducesCorrectOrder(t *testing.T) {
    // Setup
    service := NewOrderService()
    request := OrderRequest{ProductID: 1, Quantity: 2}

    // Exercise
    result, err := service.CreateOrder(request)
    if err != nil {
        t.Fatalf("unexpected error: %v", err)
    }

    // Verify — cmp.Diff shows + added / - removed fields
    want := &Order{ProductID: 1, Quantity: 2, Status: StatusCreated}
    if diff := cmp.Diff(want, result, cmpopts.IgnoreFields(Order{}, "ID", "CreatedAt")); diff != "" {
        t.Errorf("CreateOrder() mismatch (-want +got):\n%s", diff)
    }
}
```

### testify/assert — Soft Assertions (Test Continues on Failure)

`assert` functions record a failure but allow the test to continue. Use for independent conditions where you want all failures reported.

```go
import (
    "github.com/stretchr/testify/assert"
)

func TestCreateOrder_ValidRequest_AllFieldsPopulated(t *testing.T) {
    // Setup
    service := NewOrderService()
    request := OrderRequest{ProductID: 1, Quantity: 2}

    // Exercise
    result, err := service.CreateOrder(request)

    // Verify — all assertions run even if one fails
    assert.NoError(t, err)
    assert.NotNil(t, result)
    assert.NotZero(t, result.ID)
    assert.Equal(t, int64(1), result.ProductID)
    assert.Equal(t, 2, result.Quantity)
    assert.Equal(t, StatusCreated, result.Status)
    assert.NotZero(t, result.CreatedAt)
}

func TestGetOrders_MultipleOrders_ReturnsAll(t *testing.T) {
    // Setup
    repo := newFakeOrderRepo()
    repo.savedOrders[1] = Order{ID: 1, ProductID: 10}
    repo.savedOrders[2] = Order{ID: 2, ProductID: 20}
    service := NewOrderService(repo)

    // Exercise
    results, err := service.GetAllOrders()

    // Verify
    assert.NoError(t, err)
    assert.Len(t, results, 2)
    assert.Contains(t, results, Order{ID: 1, ProductID: 10})
    assert.ElementsMatch(t, []int64{1, 2},
        func() []int64 {
            ids := make([]int64, len(results))
            for i, o := range results { ids[i] = o.ID }
            return ids
        }())
}
```

### testify/require — Fatal Assertions (Test Stops on Failure)

`require` functions call `t.FailNow()` on failure. Use for preconditions where continuing without them would produce misleading failures.

```go
import (
    "github.com/stretchr/testify/assert"
    "github.com/stretchr/testify/require"
)

func TestGetOrder_ExistingID_ReturnsOrder(t *testing.T) {
    // Setup
    service := NewOrderService(newFakeOrderRepo())
    created, err := service.CreateOrder(OrderRequest{ProductID: 1, Quantity: 2})
    require.NoError(t, err)       // Fatal: if create failed, the rest is meaningless
    require.NotNil(t, created)    // Fatal: if nil, ID access below would panic

    // Exercise
    result, err := service.GetOrder(created.ID)

    // Verify
    require.NoError(t, err)
    assert.Equal(t, created.ID, result.ID) // non-fatal: we already know result is valid
    assert.Equal(t, int64(1), result.ProductID)
}
```

### Table-Driven Assertions

Consolidate related assert patterns in a table for DRY verification.

```go
func TestAssertVariousTypes(t *testing.T) {
    tests := []struct {
        name     string
        input    string
        expected bool
    }{
        {"ValidEmail_ReturnsTrue", "user@example.com", true},
        {"EmptyString_ReturnsFalse", "", false},
        {"NoAtSign_ReturnsFalse", "invalid-email", false},
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            // Exercise
            result := isValidEmail(tt.input)

            // Verify
            assert.Equal(t, tt.expected, result)
        })
    }
}
```

---

## 4. Async and Concurrency Testing

### Goroutine + Channel — Basic Async Result Collection

```go
import (
    "testing"
    "time"

    "github.com/stretchr/testify/assert"
    "github.com/stretchr/testify/require"
)

func TestFetchOrderAsync_ValidID_ReturnsOrder(t *testing.T) {
    // Setup
    service := NewAsyncOrderService()
    resultCh := make(chan Order, 1)
    errCh := make(chan error, 1)

    // Exercise
    go func() {
        order, err := service.FetchOrder(1)
        if err != nil {
            errCh <- err
            return
        }
        resultCh <- order
    }()

    // Verify (with timeout to prevent test hang)
    select {
    case result := <-resultCh:
        assert.Equal(t, int64(1), result.ID)
    case err := <-errCh:
        t.Fatalf("unexpected error: %v", err)
    case <-time.After(5 * time.Second):
        t.Fatal("test timed out waiting for async result")
    }
}
```

### sync.WaitGroup — Concurrent Operations

```go
import (
    "sync"
    "testing"

    "github.com/stretchr/testify/assert"
)

func TestProcessOrders_ConcurrentRequests_AllSucceed(t *testing.T) {
    // Setup
    service := NewOrderService(newFakeOrderRepo())
    const concurrency = 10
    var wg sync.WaitGroup
    var mu sync.Mutex
    var failures []error

    // Exercise
    for i := 0; i < concurrency; i++ {
        wg.Add(1)
        go func(id int) {
            defer wg.Done()
            _, err := service.CreateOrder(OrderRequest{ProductID: int64(id + 1), Quantity: 1})
            if err != nil {
                mu.Lock()
                failures = append(failures, err)
                mu.Unlock()
            }
        }(i)
    }
    wg.Wait() // block until all goroutines finish

    // Verify
    assert.Empty(t, failures, "expected no errors, got: %v", failures)
}
```

### context.WithTimeout — Deadline Enforcement

```go
import (
    "context"
    "testing"
    "time"

    "github.com/stretchr/testify/assert"
    "github.com/stretchr/testify/require"
)

func TestFetchOrder_ContextTimeout_ReturnsContextError(t *testing.T) {
    // Setup
    service := NewOrderService(newFakeOrderRepo())
    ctx, cancel := context.WithTimeout(context.Background(), 100*time.Millisecond)
    t.Cleanup(cancel) // Teardown: cancel context when test exits

    // Exercise — simulate slow operation
    _, err := service.FetchOrderWithContext(ctx, 1)

    // Verify
    assert.ErrorIs(t, err, context.DeadlineExceeded)
}

func TestFetchOrder_ContextCancelled_StopsEarly(t *testing.T) {
    // Setup
    service := NewOrderService(newFakeOrderRepo())
    ctx, cancel := context.WithCancel(context.Background())

    // Exercise — cancel before the call
    cancel()
    _, err := service.FetchOrderWithContext(ctx, 1)

    // Verify
    assert.ErrorIs(t, err, context.Canceled)
}
```

### t.Parallel() — Concurrent Subtest Execution

`t.Parallel()` releases the test runner to run other tests concurrently. Use with table-driven tests for faster suites when tests have no shared mutable state.

```go
func TestCalculateDiscount_VariousTiers_ParallelExecution(t *testing.T) {
    tests := []struct {
        name     string
        tier     string
        price    float64
        expected float64
    }{
        {"Silver_AppliesFivePercent", "SILVER", 100.0, 95.0},
        {"Gold_AppliesTonPercent", "GOLD", 100.0, 90.0},
        {"Platinum_AppliesTwentyPercent", "PLATINUM", 100.0, 80.0},
    }

    for _, tt := range tests {
        tt := tt // capture loop variable (required pre-Go 1.22; harmless post-1.22)
        t.Run(tt.name, func(t *testing.T) {
            t.Parallel() // run subtests concurrently

            // Exercise
            result := CalculateDiscount(tt.tier, tt.price)

            // Verify
            assert.InDelta(t, tt.expected, result, 0.001)
        })
    }
}
```

### errgroup — Coordinated Goroutine Error Handling

```go
import (
    "context"
    "testing"

    "golang.org/x/sync/errgroup"
    "github.com/stretchr/testify/assert"
)

func TestBatchProcess_AllOrders_ReturnsFirstError(t *testing.T) {
    // Setup
    repo := newFakeOrderRepo()
    repo.savedOrders[1] = Order{ID: 1}
    repo.savedOrders[2] = Order{ID: 2}
    service := NewOrderService(repo)
    ids := []int64{1, 2, 3} // ID 3 does not exist

    // Exercise
    g, ctx := errgroup.WithContext(context.Background())
    results := make([]Order, len(ids))

    for i, id := range ids {
        i, id := i, id // capture
        g.Go(func() error {
            order, err := service.GetOrderWithContext(ctx, id)
            if err != nil {
                return err
            }
            results[i] = order
            return nil
        })
    }
    err := g.Wait()

    // Verify — errgroup returns first non-nil error from any goroutine
    assert.Error(t, err)
    assert.ErrorIs(t, err, ErrNotFound)
}
```

### Race Condition Testing — -race Flag

Use `go test -race` to detect data races. `t.Parallel()` increases the likelihood of race exposure.

```go
// This test is intentionally run with: go test -race ./...
func TestOrderCache_ConcurrentAccess_NoDataRace(t *testing.T) {
    // Setup
    cache := NewOrderCache()

    // Exercise — concurrent reads and writes
    var wg sync.WaitGroup
    for i := 0; i < 50; i++ {
        wg.Add(2)
        go func(id int64) {
            defer wg.Done()
            cache.Set(id, Order{ID: id})
        }(int64(i))
        go func(id int64) {
            defer wg.Done()
            cache.Get(id)
        }(int64(i))
    }
    wg.Wait()

    // Verify — if race detector is active, it will fail the test before this
    assert.NotNil(t, cache)
}
```

---

## 5. Error and Exception Testing

### stdlib — Error Return Value Patterns

Go uses explicit error return values. Test both the error path and the happy path.

```go
func TestFindOrder_ExistingID_ReturnsOrderWithNoError(t *testing.T) {
    // Setup
    repo := newFakeOrderRepo()
    repo.savedOrders[1] = Order{ID: 1, ProductID: 10}
    service := NewOrderService(repo)

    // Exercise
    result, err := service.GetOrder(1)

    // Verify
    if err != nil {
        t.Fatalf("expected no error, got: %v", err)
    }
    if result == nil {
        t.Fatal("expected non-nil result")
    }
    if result.ID != 1 {
        t.Errorf("ID: got %d, want 1", result.ID)
    }
}

func TestFindOrder_MissingID_ReturnsError(t *testing.T) {
    // Setup
    service := NewOrderService(newFakeOrderRepo())

    // Exercise
    _, err := service.GetOrder(999)

    // Verify
    if err == nil {
        t.Fatal("expected error for missing order, got nil")
    }
}
```

### errors.Is and errors.As — Sentinel and Wrapped Errors

```go
import (
    "errors"
    "testing"

    "github.com/stretchr/testify/assert"
    "github.com/stretchr/testify/require"
)

var ErrNotFound = errors.New("not found")
var ErrPermission = errors.New("permission denied")

func TestGetOrder_MissingID_ReturnsErrNotFound(t *testing.T) {
    // Setup
    service := NewOrderService(newFakeOrderRepo())

    // Exercise
    _, err := service.GetOrder(999)

    // Verify — errors.Is unwraps error chain
    require.Error(t, err)
    assert.ErrorIs(t, err, ErrNotFound)
}

func TestGetOrder_UnauthorizedUser_ReturnsPermissionError(t *testing.T) {
    // Setup
    service := NewOrderServiceWithAuth(newFakeOrderRepo(), unauthorizedUser())

    // Exercise
    _, err := service.GetOrder(1)

    // Verify
    require.Error(t, err)
    assert.ErrorIs(t, err, ErrPermission)
}

// Custom error type assertion with errors.As
type ValidationError struct {
    Field   string
    Message string
}

func (e *ValidationError) Error() string {
    return e.Field + ": " + e.Message
}

func TestCreateOrder_InvalidQuantity_ReturnsValidationError(t *testing.T) {
    // Setup
    service := NewOrderService(newFakeOrderRepo())
    request := OrderRequest{ProductID: 1, Quantity: -1}

    // Exercise
    _, err := service.CreateOrder(request)

    // Verify — errors.As extracts the typed error from the chain
    require.Error(t, err)
    var valErr *ValidationError
    require.True(t, errors.As(err, &valErr), "expected *ValidationError")
    assert.Equal(t, "quantity", valErr.Field)
    assert.Contains(t, valErr.Message, "must be positive")
}
```

### testify/assert — Error Assertion Helpers

```go
import (
    "github.com/stretchr/testify/assert"
    "github.com/stretchr/testify/require"
)

func TestAssertErrorPatterns(t *testing.T) {
    service := NewOrderService(newFakeOrderRepo())

    t.Run("NoError_HappyPath", func(t *testing.T) {
        // Exercise
        _, err := service.CreateOrder(OrderRequest{ProductID: 1, Quantity: 1})

        // Verify
        assert.NoError(t, err)
    })

    t.Run("Error_ErrorPath", func(t *testing.T) {
        // Exercise
        _, err := service.CreateOrder(OrderRequest{Quantity: 0})

        // Verify
        assert.Error(t, err)
        assert.ErrorContains(t, err, "quantity")
        assert.EqualError(t, err, "quantity must be positive") // exact message match
    })

    t.Run("ErrorIs_SentinelError", func(t *testing.T) {
        // Exercise
        _, err := service.GetOrder(999)

        // Verify
        assert.ErrorIs(t, err, ErrNotFound)
    })

    t.Run("ErrorAs_TypedError", func(t *testing.T) {
        // Exercise
        _, err := service.CreateOrder(OrderRequest{ProductID: 1, Quantity: -1})

        // Verify
        var valErr *ValidationError
        assert.ErrorAs(t, err, &valErr)
    })
}
```

### Panic Testing

```go
import (
    "testing"

    "github.com/stretchr/testify/assert"
)

// stdlib pattern — defer/recover
func TestDivide_ByZero_Panics(t *testing.T) {
    // Setup
    defer func() {
        // Verify — recover catches the panic
        r := recover()
        if r == nil {
            t.Errorf("expected panic, but did not panic")
        }
    }()

    // Exercise
    divide(10, 0) // should panic
}

// testify pattern — cleaner panic assertions
func TestDivide_ByZero_PanicsWithMessage(t *testing.T) {
    // Exercise & Verify
    assert.Panics(t, func() {
        divide(10, 0)
    })
}

func TestDivide_ByZero_PanicsWithSpecificValue(t *testing.T) {
    // Exercise & Verify
    assert.PanicsWithValue(t, "division by zero", func() {
        divide(10, 0)
    })
}

func TestDivide_ValidInputs_NoPanic(t *testing.T) {
    // Exercise & Verify
    assert.NotPanics(t, func() {
        result := divide(10, 2)
        assert.Equal(t, 5, result)
    })
}

func TestDivide_ByZero_PanicsWithError(t *testing.T) {
    // Exercise & Verify
    assert.PanicsWithError(t, "division by zero", func() {
        divideWithError(10, 0)
    })
}
```

---

## 6. Setup and Teardown Lifecycle

### TestMain — Package-Level Setup and Teardown

`TestMain` is the entry point for a test binary. It runs once per package. Use for one-time expensive resources (database migrations, test server startup).

```go
// order_service_test.go (same package)
package services

import (
    "os"
    "testing"
)

var testDB *Database
var testServer *TestServer

func TestMain(m *testing.M) {
    // Setup (once before all tests in this package)
    var err error
    testDB, err = Database.OpenInMemory()
    if err != nil {
        panic("failed to open test database: " + err.Error())
    }
    if err := testDB.Migrate(); err != nil {
        panic("failed to migrate: " + err.Error())
    }

    // Run all tests
    code := m.Run()

    // Teardown (once after all tests in this package)
    testDB.Close()

    os.Exit(code) // must call os.Exit with m.Run() result
}
```

### t.Cleanup() — Per-Test Teardown

`t.Cleanup()` registers a function to run when the test (and all its subtests) finish. Multiple cleanups execute in LIFO order. Runs even if the test panics or fails.

```go
func TestSave_ValidOrder_Persists(t *testing.T) {
    // Setup
    tx := testDB.BeginTransaction()
    t.Cleanup(func() {
        tx.Rollback() // Teardown: always rollback after test
    })
    repo := NewOrderRepository(tx)
    order := Order{ProductID: 1, Quantity: 2}

    // Exercise
    saved, err := repo.Save(order)

    // Verify
    assert.NoError(t, err)
    assert.NotZero(t, saved.ID)
}

func TestOrderService_WithTempFile_UsesFile(t *testing.T) {
    // Setup — t.TempDir() is cleaned up automatically; t.Cleanup for explicit resources
    tempDir := t.TempDir() // stdlib: auto-cleaned after test

    configPath := filepath.Join(tempDir, "config.json")
    require.NoError(t, os.WriteFile(configPath, []byte(`{"timeout":30}`), 0600))

    service, err := NewOrderServiceFromConfig(configPath)
    require.NoError(t, err)
    t.Cleanup(func() {
        service.Shutdown() // Teardown: explicit shutdown before tempDir is removed
    })

    // Exercise
    result, err := service.CreateOrder(OrderRequest{ProductID: 1, Quantity: 1})

    // Verify
    assert.NoError(t, err)
    assert.NotNil(t, result)
}
```

### t.Cleanup() — LIFO Order Demonstration

```go
func TestLifecycleOrder(t *testing.T) {
    // Setup
    t.Cleanup(func() { t.Log("Teardown: third (registered first)") })
    t.Cleanup(func() { t.Log("Teardown: second") })
    t.Cleanup(func() { t.Log("Teardown: first (registered last, runs first)") })

    // Exercise & Verify
    assert.True(t, true)

    // Output order (LIFO):
    // Teardown: first (registered last, runs first)
    // Teardown: second
    // Teardown: third (registered first)
}
```

### Shared Setup Helper Functions

Use helper functions with `t.Helper()` to encapsulate setup logic. The helper can register its own `t.Cleanup` so callers do not need to worry about teardown.

```go
// setupOrderService creates a service with a seeded fake repo
// and registers cleanup. Returns the service and the seed order ID.
func setupOrderService(t *testing.T) (*OrderService, int64) {
    t.Helper()
    repo := newFakeOrderRepo()
    order := Order{ID: 1, ProductID: 10, Quantity: 2}
    repo.savedOrders[1] = order
    service := NewOrderService(repo)
    t.Cleanup(func() {
        // nothing to close for in-memory repo, but pattern is established
    })
    return service, 1
}

func TestGetOrder_ExistingOrder_ReturnsOrder(t *testing.T) {
    // Setup
    service, id := setupOrderService(t)

    // Exercise
    result, err := service.GetOrder(id)

    // Verify
    assert.NoError(t, err)
    assert.Equal(t, id, result.ID)
}
```

### testify Suite — Lifecycle Methods

All suite lifecycle methods are optional. Implement only the ones you need.

```go
type OrderSuite struct {
    suite.Suite
    db      *sql.DB
    service *OrderService
}

// SetupSuite runs once before all tests in the suite
func (s *OrderSuite) SetupSuite() {
    var err error
    s.db, err = sql.Open("sqlite3", ":memory:")
    s.Require().NoError(err)
    s.Require().NoError(runMigrations(s.db))
}

// TearDownSuite runs once after all tests in the suite
func (s *OrderSuite) TearDownSuite() {
    s.db.Close()
}

// SetupTest runs before each test method
func (s *OrderSuite) SetupTest() {
    s.service = NewOrderService(NewSQLOrderRepository(s.db))
    _, _ = s.db.Exec("DELETE FROM orders")
}

// TearDownTest runs after each test method (even on failure)
func (s *OrderSuite) TearDownTest() {
    // cleanup per-test state if needed
}

func (s *OrderSuite) TestCreateOrder_ValidRequest_Persists() {
    // Setup (test-specific)
    request := OrderRequest{ProductID: 1, Quantity: 2}

    // Exercise
    result, err := s.service.CreateOrder(request)

    // Verify
    s.Require().NoError(err)
    s.Assert().NotZero(result.ID)
}

func TestOrderSuite(t *testing.T) {
    suite.Run(t, new(OrderSuite))
}
```

---

## 7. Parameterized and Data-Driven Tests

### Table-Driven Tests — Basic Pattern (Canonical Go)

Table-driven tests are the idiomatic Go parameterization pattern. A slice of anonymous structs holds test cases; a `for`+`t.Run` loop executes each.

```go
func TestIsValidEmail_VariousInputs_ReturnsExpected(t *testing.T) {
    tests := []struct {
        name     string
        email    string
        expected bool
    }{
        {"ValidSimpleEmail_ReturnsTrue", "user@example.com", true},
        {"ValidSubdomainEmail_ReturnsTrue", "user@mail.example.com", true},
        {"ValidPlusAddress_ReturnsTrue", "user+tag@example.com", true},
        {"EmptyString_ReturnsFalse", "", false},
        {"NoAtSign_ReturnsFalse", "invalid-email", false},
        {"NoLocalPart_ReturnsFalse", "@example.com", false},
        {"NoDomain_ReturnsFalse", "user@", false},
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            // Exercise
            result := IsValidEmail(tt.email)

            // Verify
            assert.Equal(t, tt.expected, result,
                "IsValidEmail(%q) = %v, want %v", tt.email, result, tt.expected)
        })
    }
}
```

### Table-Driven Tests — Complex Setup Per Case

```go
func TestCreateOrder_VariousRequests_ReturnsExpectedResults(t *testing.T) {
    tests := []struct {
        name        string
        request     OrderRequest
        setupRepo   func(*fakeOrderRepo)  // per-case repo configuration
        expectedID  int64
        expectError bool
        errorMsg    string
    }{
        {
            name:       "ValidRequest_ReturnsOrderWithID",
            request:    OrderRequest{ProductID: 1, Quantity: 2},
            setupRepo:  func(r *fakeOrderRepo) {}, // no special setup
            expectedID: 1,
        },
        {
            name:        "RepositorySaveFailure_ReturnsError",
            request:     OrderRequest{ProductID: 1, Quantity: 2},
            setupRepo:   func(r *fakeOrderRepo) { r.saveErr = errors.New("db error") },
            expectError: true,
            errorMsg:    "failed to persist",
        },
        {
            name:        "ZeroQuantity_ValidationError",
            request:     OrderRequest{ProductID: 1, Quantity: 0},
            setupRepo:   func(r *fakeOrderRepo) {},
            expectError: true,
            errorMsg:    "quantity must be positive",
        },
    }

    for _, tt := range tests {
        tt := tt // capture loop variable (pre-Go 1.22)
        t.Run(tt.name, func(t *testing.T) {
            // Setup
            repo := newFakeOrderRepo()
            tt.setupRepo(repo)
            service := NewOrderService(repo)

            // Exercise
            result, err := service.CreateOrder(tt.request)

            // Verify
            if tt.expectError {
                require.Error(t, err)
                assert.Contains(t, err.Error(), tt.errorMsg)
            } else {
                require.NoError(t, err)
                assert.Equal(t, tt.expectedID, result.ID)
            }
        })
    }
}
```

### Table-Driven Tests — Map-Based for Unordered Cases

Use a `map[string]struct` when test case order does not matter and names must be unique.

```go
func TestCalculateDiscount_VariousTiers_ReturnsCorrectPercent(t *testing.T) {
    tests := map[string]struct {
        tier     string
        price    float64
        expected float64
    }{
        "Bronze_NoDiscount":           {"BRONZE", 100.0, 100.0},
        "Silver_FivePercentOff":       {"SILVER", 100.0, 95.0},
        "Gold_TenPercentOff":          {"GOLD", 100.0, 90.0},
        "Platinum_TwentyPercentOff":   {"PLATINUM", 100.0, 80.0},
    }

    for name, tt := range tests {
        tt := tt // capture loop variable
        t.Run(name, func(t *testing.T) {
            // Exercise
            result := CalculateDiscount(tt.tier, tt.price)

            // Verify
            assert.InDelta(t, tt.expected, result, 0.001)
        })
    }
}
```

### Table-Driven Tests — Parallel Execution (Post Go 1.22)

Go 1.22 changed loop variable semantics so that each iteration has its own binding. The `tc := tc` copy idiom remains valid but is no longer required on 1.22+.

```go
func TestBatchValidation_ParallelCases(t *testing.T) {
    tests := []struct {
        name    string
        input   string
        wantErr bool
    }{
        {"ValidUUID_NoError", "550e8400-e29b-41d4-a716-446655440000", false},
        {"EmptyString_Error", "", true},
        {"NotUUID_Error", "not-a-uuid", true},
    }

    for _, tt := range tests {
        // On Go 1.22+: loop variable is per-iteration; tc := tc not required
        // On Go 1.21: uncomment tc := tc below
        // tc := tt
        t.Run(tt.name, func(t *testing.T) {
            t.Parallel()

            // Exercise
            err := validateUUID(tt.input)

            // Verify
            if tt.wantErr {
                assert.Error(t, err)
            } else {
                assert.NoError(t, err)
            }
        })
    }
}
```

### Nested t.Run — Multi-Dimensional Organization

```go
func TestOrderService_MultiDimensional(t *testing.T) {
    t.Run("CreateOrder", func(t *testing.T) {
        t.Run("WithValidRequest", func(t *testing.T) {
            t.Run("ReturnsOrder", func(t *testing.T) {
                // Setup
                service := NewOrderService(newFakeOrderRepo())

                // Exercise
                result, err := service.CreateOrder(OrderRequest{ProductID: 1, Quantity: 1})

                // Verify
                assert.NoError(t, err)
                assert.NotNil(t, result)
            })

            t.Run("SetsStatusCreated", func(t *testing.T) {
                // Setup
                service := NewOrderService(newFakeOrderRepo())

                // Exercise
                result, err := service.CreateOrder(OrderRequest{ProductID: 1, Quantity: 1})

                // Verify
                require.NoError(t, err)
                assert.Equal(t, StatusCreated, result.Status)
            })
        })

        t.Run("WithInvalidRequest", func(t *testing.T) {
            t.Run("ZeroQuantity_ReturnsError", func(t *testing.T) {
                // Setup
                service := NewOrderService(newFakeOrderRepo())

                // Exercise
                _, err := service.CreateOrder(OrderRequest{ProductID: 1, Quantity: 0})

                // Verify
                assert.Error(t, err)
            })
        })
    })
}
```

### testify Suite — Parameterized Test Methods

Embed test data in the suite struct and iterate in test methods.

```go
type DiscountSuite struct {
    suite.Suite
    service *PricingService
    cases   []struct {
        tier     string
        price    float64
        expected float64
    }
}

func (s *DiscountSuite) SetupSuite() {
    s.service = NewPricingService()
    s.cases = []struct {
        tier     string
        price    float64
        expected float64
    }{
        {"SILVER", 100.0, 95.0},
        {"GOLD", 100.0, 90.0},
        {"PLATINUM", 100.0, 80.0},
    }
}

func (s *DiscountSuite) TestCalculateDiscount_AllTiers_ReturnExpected() {
    for _, tc := range s.cases {
        s.Run(tc.tier+"_ReturnsExpected", func() {
            // Exercise
            result := s.service.CalculateDiscount(tc.tier, tc.price)

            // Verify
            s.Assert().InDelta(tc.expected, result, 0.001)
        })
    }
}

func TestDiscountSuite(t *testing.T) {
    suite.Run(t, new(DiscountSuite))
}
```

---

## 8. File Naming and Location Conventions

### Test File Naming

```
Source file          →  Test file
order_service.go     →  order_service_test.go        (white-box: package services)
email_validator.go   →  email_validator_test.go      (white-box: package validators)

Black-box tests (external package):
order_service.go     →  order_service_test.go        (package services_test)

# Rule: _test.go suffix in the same directory as the source file.
# No separate test directory for unit tests in Go.
```

### Package Naming Conventions

```go
// White-box test (same package) — access unexported identifiers
// File: internal/services/order_service_test.go
package services

// Black-box test (external package) — only exported identifiers
// File: internal/services/order_service_test.go (same file, different package declaration)
package services_test

// export_test.go — expose unexported identifiers to external tests (compile-time only)
// File: internal/services/export_test.go
package services

var InternalHelper = internalHelper  // exposes internalHelper to package services_test
```

### Standard Go Project Layout

```
project-root/
├── go.mod
├── go.sum
├── cmd/
│   └── server/
│       ├── main.go
│       └── main_test.go           ← integration-level smoke test for cmd
├── internal/
│   ├── services/
│   │   ├── order_service.go
│   │   ├── order_service_test.go  ← white-box unit tests (package services)
│   │   └── testdata/
│   │       ├── valid_order.json   ← fixture files read with os.ReadFile
│   │       └── invalid_orders/
│   │           └── missing_product.json
│   ├── validators/
│   │   ├── email_validator.go
│   │   └── email_validator_test.go
│   └── repository/
│       ├── order_repo.go
│       ├── order_repo_test.go     ← uses testDB from TestMain
│       └── testdata/
│           └── schema.sql
└── pkg/                           ← exported packages (if any)
    └── client/
        ├── order_client.go
        └── order_client_test.go   ← typically package client_test (black-box)
```

### testdata/ Directory Convention

```go
// Read fixture files relative to the test file's package directory
// Go sets the working directory to the package directory when running tests

func TestParseOrder_ValidJSON_ReturnsOrder(t *testing.T) {
    // Setup — testdata/ is a reserved directory name; go tooling ignores it during build
    data, err := os.ReadFile("testdata/valid_order.json")
    require.NoError(t, err)

    // Exercise
    result, err := ParseOrder(data)

    // Verify
    assert.NoError(t, err)
    assert.Equal(t, int64(1), result.ID)
}
```

### Test Function Naming Summary

```
Function type       Naming convention                   Example
───────────────────────────────────────────────────────────────────────────────
Unit test           TestMethodName_Scenario_Expected     TestCreateOrder_ValidRequest_ReturnsOrder
Subtest (t.Run)     "Scenario_Expected" (string arg)     t.Run("ValidRequest_ReturnsOrder", ...)
Benchmark           BenchmarkMethodName_Scenario         BenchmarkCreateOrder_HighVolume
Example             ExampleMethodName                    ExampleCreateOrder
Fuzz (Go 1.18+)    FuzzMethodName                       FuzzParseOrder
Suite entry         TestXxxSuite                         TestOrderServiceSuite
```

### Build Tags for Test Categorization

```go
// Integration test file — excluded from regular go test ./...
// File: internal/repository/order_repo_integration_test.go
//go:build integration

package repository

import "testing"

func TestOrderRepository_Save_IntegrationWithRealDB(t *testing.T) {
    // Requires real database connection
}

// Run only unit tests (default):
//   go test ./...

// Run integration tests (explicit tag):
//   go test -tags=integration ./...

// Run all tests:
//   go test -tags=integration ./...
```

### go test Discovery and Execution

```
# Run all tests in the current module
go test ./...

# Run tests in a specific package
go test ./internal/services/...

# Run a specific test function
go test -run TestCreateOrder ./internal/services/

# Run a specific subtest
go test -run "TestCreateOrder/ValidRequest_ReturnsOrder" ./internal/services/

# Run with race detector
go test -race ./...

# Run with coverage
go test -coverprofile=coverage.out ./...
go tool cover -html=coverage.out -o coverage.html

# Run with verbose output
go test -v ./...

# Run with build tag
go test -tags=integration ./...

# Run benchmarks
go test -bench=. -benchmem ./...
```

### Golden File Pattern

```go
import (
    "flag"
    "os"
    "testing"

    "github.com/stretchr/testify/assert"
    "github.com/stretchr/testify/require"
)

var updateGolden = flag.Bool("update", false, "update golden files")

func TestRenderOrder_ValidOrder_MatchesGoldenFile(t *testing.T) {
    // Setup
    order := Order{ID: 1, ProductID: 10, Quantity: 2, Status: StatusCreated}
    goldenFile := "testdata/golden/render_order.txt"

    // Exercise
    got := RenderOrder(order)

    if *updateGolden {
        // Update mode: regenerate golden file
        require.NoError(t, os.MkdirAll("testdata/golden", 0755))
        require.NoError(t, os.WriteFile(goldenFile, []byte(got), 0644))
        t.Skip("golden file updated")
    }

    // Verify
    want, err := os.ReadFile(goldenFile)
    require.NoError(t, err)
    assert.Equal(t, string(want), got)
}

// Regenerate golden files: go test -run TestRenderOrder -update ./...
```

---

**Version**: 1.0.0
**Last Updated**: 2026-03-17
**Status**: Active

*This file is a satellite pattern library for Go (stdlib testing + testify). It is part of the Phoenix OS testing memory layer established by Feature #342 (Story #356). Companion files: `patterns.md` (React/Jest), `patterns-python.md` (pytest/unittest), `patterns-java.md` (JUnit 5/Mockito/AssertJ).*
