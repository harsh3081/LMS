# JUnit Mocking Patterns

This document defines mocking patterns for the Java testing ecosystem, covering Mockito, EasyMock, and WireMock.

## Framework: Mockito

### 1. Function/Method Mocking
```java
import static org.mockito.Mockito.*;

// Create mock
UserService mockService = mock(UserService.class);

// With annotations
@ExtendWith(MockitoExtension.class)
class MyTest {
    @Mock UserService userService;
    @InjectMocks UserController controller;
}
```

### 2. Spy/Observation
```java
// Spy wraps real object
UserService spy = spy(new UserServiceImpl());

// With annotation
@Spy UserService userService = new UserServiceImpl();

// Verify calls on spy
verify(spy).findUser(1L);
verify(spy, times(2)).saveUser(any());
```

### 3. Stub with Return Values
```java
when(mockService.findUser(1L)).thenReturn(testUser);
when(mockService.findUser(anyLong())).thenReturn(testUser);
when(mockService.findAll()).thenReturn(List.of(user1, user2));

// Sequential returns
when(mockService.getNext()).thenReturn("first", "second", "third");

// Computed return
when(mockService.process(any())).thenAnswer(invocation -> {
    String arg = invocation.getArgument(0);
    return arg.toUpperCase();
});
```

### 4. Stub with Exceptions
```java
when(mockService.findUser(-1L)).thenThrow(new NotFoundException("Not found"));
when(mockService.save(null)).thenThrow(IllegalArgumentException.class);

// For void methods
doThrow(new RuntimeException("error")).when(mockService).deleteUser(1L);
```

### 5. Argument Matching
```java
import static org.mockito.ArgumentMatchers.*;

verify(mockService).findUser(eq(1L));
verify(mockService).save(any(User.class));
verify(mockService).search(contains("query"));
verify(mockService).process(argThat(arg -> arg.length() > 5));
verify(mockService).configure(isNull());
verify(mockService).log(anyString(), anyInt());
```

### 6. Call Verification
```java
verify(mockService).findUser(1L);                    // Called once (default)
verify(mockService, times(2)).save(any());            // Called exactly twice
verify(mockService, never()).deleteUser(any());       // Never called
verify(mockService, atLeastOnce()).findAll();          // At least once
verify(mockService, atMost(3)).process(any());        // At most 3 times

// Verification order
InOrder inOrder = inOrder(mockService, mockRepo);
inOrder.verify(mockService).validate(any());
inOrder.verify(mockRepo).save(any());

// No more interactions
verifyNoMoreInteractions(mockService);
```

### 7. Module/Import Mocking
```java
// Static method mocking (Mockito 3.4+)
try (MockedStatic<Utilities> mockStatic = mockStatic(Utilities.class)) {
    mockStatic.when(() -> Utilities.generateId()).thenReturn("fixed-id");
    // ... test code
}

// Constructor mocking (Mockito 3.5+)
try (MockedConstruction<MyService> mockConst = mockConstruction(MyService.class)) {
    MyService service = new MyService(); // Returns mock
    when(service.getData()).thenReturn("mocked");
}
```

### 8. HTTP/API Mocking
```java
// Mock RestTemplate
@Mock RestTemplate restTemplate;

when(restTemplate.getForObject(anyString(), eq(User.class)))
    .thenReturn(new User(1L, "Test"));

when(restTemplate.exchange(anyString(), eq(HttpMethod.GET), any(), eq(User.class)))
    .thenReturn(new ResponseEntity<>(testUser, HttpStatus.OK));
```

### 9. Timer/Date Mocking
```java
// Mock Clock (Java 8+)
@Mock Clock clock;

when(clock.instant()).thenReturn(Instant.parse("2026-01-01T00:00:00Z"));
when(clock.getZone()).thenReturn(ZoneId.of("UTC"));

// Or use static mock
try (MockedStatic<Instant> mockInstant = mockStatic(Instant.class)) {
    mockInstant.when(Instant::now).thenReturn(fixedInstant);
}
```

### 10. Partial Mocking
```java
// Spy with selective stubbing
UserService spy = spy(new UserServiceImpl());
doReturn(mockData).when(spy).externalCall();
// Other methods execute real implementation

// Partial mock with @Spy
@Spy UserService service = new UserServiceImpl();
```

### Cleanup & Reset
```java
// Reset mock state
reset(mockService);

// With MockitoExtension: automatic cleanup per test
@ExtendWith(MockitoExtension.class) // Handles lifecycle

// Manual cleanup
@AfterEach
void tearDown() {
    Mockito.clearAllCaches();
}
```

## Framework: EasyMock

### 1. Function/Method Mocking
```java
import static org.easymock.EasyMock.*;

UserService mockService = createMock(UserService.class);
// or createNiceMock() for default return values
// or createStrictMock() for order verification

expect(mockService.findUser(1L)).andReturn(testUser);
replay(mockService);  // Switch to replay mode

// ... test code

verify(mockService);  // Verify all expectations met
```

### 2-10. (EasyMock follows record-replay-verify pattern for all categories)

### Cleanup
```java
@AfterEach
void tearDown() {
    verify(mockService); // Verify expectations
}
```

## Framework: WireMock (HTTP Mocking Layer)

### HTTP/API Mocking
```java
import static com.github.tomakehurst.wiremock.client.WireMock.*;

@WireMockTest
class ApiClientTest {
    @Test
    void testGetUser(WireMockRuntimeInfo wmRuntimeInfo) {
        stubFor(get(urlEqualTo("/api/users/1"))
            .willReturn(aResponse()
                .withStatus(200)
                .withHeader("Content-Type", "application/json")
                .withBody("{\"id\": 1, \"name\": \"Test\"}")));

        ApiClient client = new ApiClient(wmRuntimeInfo.getHttpBaseUrl());
        User user = client.getUser(1L);

        assertEquals("Test", user.getName());

        verify(getRequestedFor(urlEqualTo("/api/users/1")));
    }

    @Test
    void testServerError(WireMockRuntimeInfo wmRuntimeInfo) {
        stubFor(get(anyUrl())
            .willReturn(aResponse().withStatus(500)));

        assertThrows(ApiException.class, () -> client.getUser(1L));
    }
}
```

## Anti-Patterns

- **Don't mock the system under test** — only mock its dependencies
- **Don't over-mock** — if a dependency is simple (e.g., DTO), use real objects
- **Don't forget @ExtendWith(MockitoExtension.class)** — ensures proper lifecycle
- **Don't use `any()` when specific matchers suffice** — be as specific as reasonable
- **Don't assert on mock internals** — assert on observable behavior
- **Don't mix Mockito and EasyMock** — choose one per project

---

**Version**: 1.0.0
**Last Updated**: 2026-03-18
**Status**: Active
