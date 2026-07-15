# Go Test Mocking Patterns

This document defines mocking patterns for the Go testing ecosystem, covering gomock, testify/mock, mockery, and httpmock.

## Framework: gomock

### 1. Function/Method Mocking
```go
import (
    "testing"
    "go.uber.org/mock/gomock"
)

func TestService(t *testing.T) {
    ctrl := gomock.NewController(t)
    // ctrl.Finish() not needed with Go 1.14+ (auto-cleanup via t.Cleanup)

    mockRepo := NewMockUserRepository(ctrl)
    service := NewUserService(mockRepo)
}
```

### 2. Spy/Observation
```go
// gomock does not have a native spy — use Do() to observe calls
mockRepo.EXPECT().FindUser(gomock.Any()).
    Do(func(id int64) {
        // Observe the call arguments
        assert.Equal(t, int64(1), id)
    }).
    Return(testUser, nil)
```

### 3. Stub with Return Values
```go
mockRepo.EXPECT().FindUser(int64(1)).Return(testUser, nil)
mockRepo.EXPECT().FindAll().Return([]User{user1, user2}, nil)

// Sequential returns
gomock.InOrder(
    mockRepo.EXPECT().GetNext().Return("first", nil),
    mockRepo.EXPECT().GetNext().Return("second", nil),
)
```

### 4. Stub with Exceptions
```go
mockRepo.EXPECT().FindUser(int64(-1)).Return(nil, errors.New("not found"))
mockRepo.EXPECT().Save(gomock.Any()).Return(fmt.Errorf("db error"))
```

### 5. Argument Matching
```go
mockRepo.EXPECT().FindUser(gomock.Eq(int64(1))).Return(testUser, nil)
mockRepo.EXPECT().Save(gomock.Any()).Return(nil)
mockRepo.EXPECT().Search(gomock.Not("")).Return(results, nil)

// Custom matcher
type userMatcher struct {
    name string
}
func (m userMatcher) Matches(x interface{}) bool {
    user, ok := x.(*User)
    return ok && user.Name == m.name
}
func (m userMatcher) String() string {
    return fmt.Sprintf("has name %s", m.name)
}

mockRepo.EXPECT().Save(userMatcher{name: "Test"}).Return(nil)
```

### 6. Call Verification
```go
// Times
mockRepo.EXPECT().FindUser(gomock.Any()).Times(2).Return(testUser, nil)
mockRepo.EXPECT().Save(gomock.Any()).Times(1).Return(nil)
mockRepo.EXPECT().DeleteUser(gomock.Any()).Times(0) // Never called

// MinTimes / MaxTimes
mockRepo.EXPECT().Log(gomock.Any()).MinTimes(1).MaxTimes(5)

// AnyTimes
mockRepo.EXPECT().GetConfig().AnyTimes().Return(config)

// Order verification
gomock.InOrder(
    mockRepo.EXPECT().Validate(gomock.Any()),
    mockRepo.EXPECT().Save(gomock.Any()),
)
```

### 7. Module/Import Mocking
```go
// Go uses interfaces for dependency injection — no module-level mocking
// Generate mocks with mockgen:
//go:generate mockgen -source=repository.go -destination=mock_repository.go -package=service

// Or with reflect mode:
//go:generate mockgen -destination=mock_repository.go -package=service . UserRepository
```

### 8. HTTP/API Mocking
```go
// Use httptest (standard library)
import "net/http/httptest"

server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
    w.Header().Set("Content-Type", "application/json")
    w.WriteHeader(http.StatusOK)
    json.NewEncoder(w).Encode(map[string]string{"data": "test"})
}))
defer server.Close()

client := NewAPIClient(server.URL)
```

### 9. Timer/Date Mocking
```go
// Inject a clock interface
type Clock interface {
    Now() time.Time
}

type mockClock struct {
    now time.Time
}
func (c *mockClock) Now() time.Time { return c.now }

func TestWithTime(t *testing.T) {
    clock := &mockClock{now: time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC)}
    service := NewService(WithClock(clock))
}
```

### 10. Partial Mocking
```go
// Go doesn't support partial mocking directly
// Use composition: embed real struct and override specific methods via interface
type partialService struct {
    *RealService
    overrideFn func() string
}
func (p *partialService) ExternalCall() string {
    return p.overrideFn()
}
```

### Cleanup
```go
// With Go 1.14+, gomock.NewController(t) auto-cleans via t.Cleanup
// No manual ctrl.Finish() needed
```

## Framework: testify/mock

### 1. Function/Method Mocking
```go
import "github.com/stretchr/testify/mock"

type MockUserRepository struct {
    mock.Mock
}

func (m *MockUserRepository) FindUser(id int64) (*User, error) {
    args := m.Called(id)
    if args.Get(0) == nil {
        return nil, args.Error(1)
    }
    return args.Get(0).(*User), args.Error(1)
}

func TestService(t *testing.T) {
    mockRepo := new(MockUserRepository)
    mockRepo.On("FindUser", int64(1)).Return(testUser, nil)

    service := NewUserService(mockRepo)
    // ...

    mockRepo.AssertExpectations(t)
}
```

### 2. Spy/Observation
```go
// testify/mock records all calls automatically
mockRepo.AssertCalled(t, "FindUser", int64(1))
mockRepo.AssertNotCalled(t, "DeleteUser", mock.Anything)
mockRepo.AssertNumberOfCalls(t, "Save", 2)
```

### 3. Stub with Return Values
```go
mockRepo.On("FindUser", int64(1)).Return(testUser, nil)
mockRepo.On("FindAll").Return([]User{user1, user2}, nil)

// Sequential returns
mockRepo.On("GetNext").Return("first", nil).Once()
mockRepo.On("GetNext").Return("second", nil).Once()

// Computed return
mockRepo.On("Process", mock.Anything).Return(func(input string) string {
    return strings.ToUpper(input)
}, nil)
```

### 4. Stub with Exceptions
```go
mockRepo.On("FindUser", int64(-1)).Return(nil, errors.New("not found"))
```

### 5. Argument Matching
```go
mockRepo.On("FindUser", mock.Anything).Return(testUser, nil)
mockRepo.On("Save", mock.AnythingOfType("*User")).Return(nil)
mockRepo.On("Search", mock.MatchedBy(func(q string) bool {
    return len(q) > 0
})).Return(results, nil)
```

### 6. Call Verification
```go
mockRepo.AssertExpectations(t)  // All On() expectations met
mockRepo.AssertCalled(t, "FindUser", int64(1))
mockRepo.AssertNotCalled(t, "DeleteUser")
mockRepo.AssertNumberOfCalls(t, "Save", 2)
```

### Cleanup
```go
func TestSomething(t *testing.T) {
    mockRepo := new(MockUserRepository)
    defer mockRepo.AssertExpectations(t)
    // ... test code
}
```

## Framework: mockery (Code Generation)

### Mock Generation
```bash
# Generate mocks for all interfaces
mockery --all --output=./mocks

# Generate for specific interface
mockery --name=UserRepository --output=./mocks

# With config file (.mockery.yaml)
# mockery auto-generates testify/mock implementations
```

### Usage
```go
// Generated mocks follow testify/mock patterns
import "myapp/mocks"

func TestService(t *testing.T) {
    mockRepo := mocks.NewMockUserRepository(t) // Auto-cleanup with t
    mockRepo.On("FindUser", int64(1)).Return(testUser, nil)
}
```

## Framework: httpmock (HTTP Mocking Layer)

### HTTP/API Mocking
```go
import "github.com/jarcoal/httpmock"

func TestAPICall(t *testing.T) {
    httpmock.Activate()
    defer httpmock.DeactivateAndReset()

    httpmock.RegisterResponder("GET", "https://api.example.com/users",
        httpmock.NewJsonResponderOrPanic(200, []map[string]interface{}{
            {"id": 1, "name": "Test"},
        }))

    result, err := service.FetchUsers()
    assert.NoError(t, err)
    assert.Len(t, result, 1)

    // Verify call count
    assert.Equal(t, 1, httpmock.GetTotalCallCount())
}
```

## Anti-Patterns

- **Don't mock the system under test** — only mock its dependencies
- **Don't over-mock** — Go encourages small interfaces; mock only what's needed
- **Don't forget AssertExpectations** (testify) or use `ctrl.Finish()` (gomock < 1.14) — ensures expectations are verified
- **Don't mock concrete types** — always mock interfaces in Go
- **Don't create god interfaces** — keep interfaces small for testability
- **Don't use gomock AND testify/mock in the same project** — choose one

---

**Version**: 1.0.0
**Last Updated**: 2026-03-18
**Status**: Active
