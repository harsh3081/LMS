# .NET Test Mocking Patterns

This document defines mocking patterns for the .NET testing ecosystem, covering Moq, NSubstitute, FakeItEasy, and WireMock.Net.

For additional .NET-specific testing patterns, see also: `core/memory/practices/testing/patterns-dotnet.md`

## Framework: Moq

### 1. Function/Method Mocking
```csharp
using Moq;

// Create mock
var mockService = new Mock<IUserService>();
var service = mockService.Object; // Get the mocked instance

// With strict behavior (throws for unconfigured calls)
var strictMock = new Mock<IUserService>(MockBehavior.Strict);
```

### 2. Spy/Observation
```csharp
// Moq doesn't have a native spy — use CallBase for partial mocking
var mock = new Mock<UserService> { CallBase = true };
// Real methods execute; only stubbed methods are mocked

// Verify calls
mockService.Verify(s => s.FindUser(1), Times.Once());
```

### 3. Stub with Return Values
```csharp
mockService.Setup(s => s.FindUser(1)).Returns(testUser);
mockService.Setup(s => s.FindAll()).Returns(new List<User> { user1, user2 });

// Async methods
mockService.Setup(s => s.FindUserAsync(1)).ReturnsAsync(testUser);

// Sequential returns
mockService.SetupSequence(s => s.GetNext())
    .Returns("first")
    .Returns("second")
    .Returns("third");

// Computed return
mockService.Setup(s => s.Process(It.IsAny<string>()))
    .Returns<string>(input => input.ToUpper());
```

### 4. Stub with Exceptions
```csharp
mockService.Setup(s => s.FindUser(-1)).Throws(new NotFoundException("Not found"));
mockService.Setup(s => s.FindUser(-1)).Throws<NotFoundException>();

// Async exception
mockService.Setup(s => s.FindUserAsync(-1)).ThrowsAsync(new NotFoundException());
```

### 5. Argument Matching
```csharp
mockService.Setup(s => s.FindUser(It.IsAny<int>())).Returns(testUser);
mockService.Setup(s => s.FindUser(It.Is<int>(id => id > 0))).Returns(testUser);
mockService.Setup(s => s.Search(It.IsRegex("^test"))).Returns(results);
mockService.Setup(s => s.Save(It.IsNotNull<User>())).Returns(true);
mockService.Setup(s => s.Process(It.IsIn("a", "b", "c"))).Returns("matched");
```

### 6. Call Verification
```csharp
mockService.Verify(s => s.FindUser(1));                          // Called at least once
mockService.Verify(s => s.FindUser(1), Times.Once());            // Called exactly once
mockService.Verify(s => s.FindUser(1), Times.Exactly(2));        // Called exactly twice
mockService.Verify(s => s.DeleteUser(It.IsAny<int>()), Times.Never()); // Never called
mockService.Verify(s => s.Save(It.IsAny<User>()), Times.AtLeastOnce());
mockService.VerifyNoOtherCalls();                                // No unexpected calls
```

### 7. Module/Import Mocking
```csharp
// Moq works with interfaces and virtual members — no module-level mocking
// Use dependency injection and mock the interface
var mockLogger = new Mock<ILogger<MyService>>();
var service = new MyService(mockService.Object, mockLogger.Object);
```

### 8. HTTP/API Mocking
```csharp
// Mock HttpMessageHandler for HttpClient
var mockHandler = new Mock<HttpMessageHandler>();
mockHandler.Protected()
    .Setup<Task<HttpResponseMessage>>("SendAsync",
        ItExpr.IsAny<HttpRequestMessage>(),
        ItExpr.IsAny<CancellationToken>())
    .ReturnsAsync(new HttpResponseMessage
    {
        StatusCode = HttpStatusCode.OK,
        Content = new StringContent("{\"data\": \"test\"}", Encoding.UTF8, "application/json")
    });

var httpClient = new HttpClient(mockHandler.Object);
```

### 9. Timer/Date Mocking
```csharp
// Mock ISystemClock or TimeProvider (.NET 8+)
var mockClock = new Mock<TimeProvider>();
mockClock.Setup(c => c.GetUtcNow())
    .Returns(new DateTimeOffset(2026, 1, 1, 0, 0, 0, TimeSpan.Zero));

var service = new MyService(mockClock.Object);
```

### 10. Partial Mocking
```csharp
// CallBase = true invokes real implementation for non-stubbed members
var mock = new Mock<UserService> { CallBase = true };
mock.Setup(s => s.ExternalCall()).Returns("mocked");
// Other virtual methods execute real implementation
```

### Cleanup & Reset
```csharp
// Reset mock state
mockService.Reset();

// Invocations are cleared automatically per test with xUnit/NUnit
// Use mockService.Invocations.Clear() if needed
```

## Framework: NSubstitute

### 1. Function/Method Mocking
```csharp
using NSubstitute;

var mockService = Substitute.For<IUserService>();
```

### 2. Spy/Observation
```csharp
// Partial substitute (spy)
var spy = Substitute.ForPartsOf<UserService>();
spy.FindUser(1).Returns(testUser); // Override specific method
```

### 3. Stub with Return Values
```csharp
mockService.FindUser(1).Returns(testUser);
mockService.FindAll().Returns(new List<User> { user1, user2 });
mockService.FindUserAsync(1).Returns(Task.FromResult(testUser));

// Sequential returns
mockService.GetNext().Returns("first", "second", "third");

// Computed return
mockService.Process(Arg.Any<string>()).Returns(ci => ((string)ci[0]).ToUpper());
```

### 4. Stub with Exceptions
```csharp
mockService.FindUser(-1).Returns(x => throw new NotFoundException());
mockService.When(s => s.DeleteUser(-1)).Do(x => throw new InvalidOperationException());
```

### 5. Argument Matching
```csharp
mockService.FindUser(Arg.Any<int>()).Returns(testUser);
mockService.FindUser(Arg.Is<int>(id => id > 0)).Returns(testUser);
mockService.Search(Arg.Is("test")).Returns(results);
```

### 6. Call Verification
```csharp
mockService.Received().FindUser(1);
mockService.Received(2).Save(Arg.Any<User>());
mockService.DidNotReceive().DeleteUser(Arg.Any<int>());
mockService.ReceivedWithAnyArgs().Process(default);
```

### Cleanup
```csharp
mockService.ClearReceivedCalls();
```

## Framework: FakeItEasy

### 1. Function/Method Mocking
```csharp
using FakeItEasy;

var mockService = A.Fake<IUserService>();
```

### 3. Stub with Return Values
```csharp
A.CallTo(() => mockService.FindUser(1)).Returns(testUser);
A.CallTo(() => mockService.FindAll()).Returns(new List<User> { user1, user2 });
A.CallTo(() => mockService.FindUserAsync(1)).Returns(Task.FromResult(testUser));
```

### 4. Stub with Exceptions
```csharp
A.CallTo(() => mockService.FindUser(-1)).Throws(new NotFoundException());
```

### 5. Argument Matching
```csharp
A.CallTo(() => mockService.FindUser(A<int>.Ignored)).Returns(testUser);
A.CallTo(() => mockService.FindUser(A<int>.That.IsGreaterThan(0))).Returns(testUser);
```

### 6. Call Verification
```csharp
A.CallTo(() => mockService.FindUser(1)).MustHaveHappened();
A.CallTo(() => mockService.FindUser(1)).MustHaveHappenedOnceExactly();
A.CallTo(() => mockService.DeleteUser(A<int>.Ignored)).MustNotHaveHappened();
A.CallTo(() => mockService.Save(A<User>.Ignored)).MustHaveHappenedTwiceExactly();
```

## Framework: WireMock.Net (HTTP Mocking Layer)

### HTTP/API Mocking
```csharp
using WireMock.Server;
using WireMock.RequestBuilders;
using WireMock.ResponseBuilders;

public class ApiClientTests : IDisposable
{
    private readonly WireMockServer _server;

    public ApiClientTests()
    {
        _server = WireMockServer.Start();
    }

    [Fact]
    public async Task GetUser_ReturnsUser()
    {
        _server.Given(Request.Create().WithPath("/api/users/1").UsingGet())
            .RespondWith(Response.Create()
                .WithStatusCode(200)
                .WithHeader("Content-Type", "application/json")
                .WithBody("{\"id\": 1, \"name\": \"Test\"}"));

        var client = new ApiClient(_server.Url);
        var user = await client.GetUserAsync(1);

        Assert.Equal("Test", user.Name);
    }

    public void Dispose()
    {
        _server.Stop();
        _server.Dispose();
    }
}
```

## Anti-Patterns

- **Don't mock the system under test** — only mock its dependencies
- **Don't over-mock** — if a dependency is a simple DTO/POCO, use real objects
- **Don't mock sealed classes** — use interfaces or wrapper patterns
- **Don't forget to verify expectations** — unverified mocks hide bugs
- **Don't assert on mock internals** — assert on observable behavior
- **Don't mix Moq and NSubstitute** — choose one per project

---

**Version**: 1.0.0
**Last Updated**: 2026-03-18
**Status**: Active
