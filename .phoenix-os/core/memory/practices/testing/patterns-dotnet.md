# .NET Test Patterns

This document defines test patterns for .NET projects in Phoenix OS. It covers **xUnit** (primary), **NUnit**, and **MSTest** for all eight required content areas. All examples target .NET 8+ (LTS) and follow the four-phase pattern (Setup-Exercise-Verify-Teardown) and the `MethodName_Scenario_ExpectedResult` naming convention.

**Frameworks in scope**:
- xUnit >= 2.5 (primary)
- NUnit >= 3.14
- MSTest v3 / Microsoft.VisualStudio.TestTools.UnitTesting
- FluentAssertions >= 6.12 (assertion library — works with all three runners)
- Moq >= 4.20 (mocking — works with all three runners)
- NSubstitute >= 5.1 (mocking — works with all three runners)
- FakeItEasy >= 8.0 (mocking — works with all three runners)

---

## Framework Overview

### When to Use Each Test Runner

| Attribute | xUnit | NUnit | MSTest |
|---|---|---|---|
| Test class | No attribute (POCO class) | `[TestFixture]` | `[TestClass]` |
| Test method | `[Fact]` | `[Test]` | `[TestMethod]` |
| Parameterised | `[Theory]` + `[InlineData]` | `[TestCase]` | `[DataTestMethod]` + `[DataRow]` |
| Per-test setup | Constructor | `[SetUp]` | `[TestInitialize]` |
| Per-test teardown | `IDisposable.Dispose` | `[TearDown]` | `[TestCleanup]` |
| Class-level setup | `IClassFixture<T>` | `[OneTimeSetUp]` | `[ClassInitialize]` |
| Class-level teardown | `IClassFixture<T>.Dispose` | `[OneTimeTearDown]` | `[ClassCleanup]` |
| Instance per test | Yes (new instance per `[Fact]`) | Yes (new instance per `[Test]`) | Yes (new instance per `[TestMethod]`) |

**Choose xUnit** when starting a new project or following Phoenix OS defaults. xUnit enforces test isolation by design and has the broadest adoption in ASP.NET Core projects.

**Choose NUnit** when migrating from a legacy NUnit codebase, when you need `[Values]`/`[Range]` attribute-driven combinatorial tests, or when the team prefers attribute-based lifecycle over constructor/disposal patterns.

**Choose MSTest** when the project is inside the Microsoft ecosystem (Azure DevOps pipelines with built-in test adapter, .NET MAUI, WinUI), when you need `[DeploymentItem]` support, or when the existing codebase uses MSTest.

**All three mocking libraries (Moq, NSubstitute, FakeItEasy) work identically with all three test runners.** The only difference is how mocks are initialised — see Section 2 for runner-specific lifecycle notes.

---

## 1. Unit Test Structure

### xUnit — [Fact] and [Theory]

xUnit creates a new class instance per test method. Constructor injection provides fresh dependencies for each test automatically.

```csharp
// tests/Services/OrderServiceTests.cs
using Xunit;
using FluentAssertions;
using Moq;

public class OrderServiceTests
{
    private readonly OrderService _sut;
    private readonly Mock<IOrderRepository> _repositoryMock;

    // Setup — runs before EACH test (new instance per test)
    public OrderServiceTests()
    {
        _repositoryMock = new Mock<IOrderRepository>();
        _sut = new OrderService(_repositoryMock.Object);
    }

    [Fact]
    public void CreateOrder_ValidRequest_ReturnsCreatedOrder()
    {
        // Setup
        var request = new CreateOrderRequest { ProductId = 1, Quantity = 2 };
        _repositoryMock
            .Setup(r => r.Add(It.IsAny<Order>()))
            .Returns((Order o) => o);

        // Exercise
        var result = _sut.CreateOrder(request);

        // Verify
        result.Should().NotBeNull();
        result.ProductId.Should().Be(1);
        result.Quantity.Should().Be(2);
    }

    [Fact]
    public void CreateOrder_NullRequest_ThrowsArgumentNullException()
    {
        // Exercise
        var act = () => _sut.CreateOrder(null!);

        // Verify
        act.Should().Throw<ArgumentNullException>()
            .WithParameterName("request");
    }
}
```

**Multiple dependencies via constructor**:

```csharp
public class ProductServiceTests
{
    private readonly ProductService _sut;
    private readonly Mock<IProductRepository> _repositoryMock;
    private readonly Mock<ILogger<ProductService>> _loggerMock;

    public ProductServiceTests()
    {
        _repositoryMock = new Mock<IProductRepository>();
        _loggerMock = new Mock<ILogger<ProductService>>();
        _sut = new ProductService(_repositoryMock.Object, _loggerMock.Object);
    }

    [Fact]
    public void GetProduct_ValidId_ReturnsProduct()
    {
        // Setup
        var expected = new Product { Id = 1, Name = "Widget" };
        _repositoryMock.Setup(r => r.GetById(1)).Returns(expected);

        // Exercise
        var result = _sut.GetProduct(1);

        // Verify
        result.Should().BeEquivalentTo(expected);
    }

    [Fact]
    public void GetProduct_InvalidId_ThrowsNotFoundException()
    {
        // Setup
        _repositoryMock.Setup(r => r.GetById(999)).Returns((Product?)null);

        // Exercise
        var act = () => _sut.GetProduct(999);

        // Verify
        act.Should().Throw<NotFoundException>();
    }
}
```

### NUnit — [TestFixture] and [Test]

NUnit uses `[TestFixture]` on the class (optional in NUnit 3+ for plain C# classes but required for parameterised fixtures) and `[Test]` on each method. Setup is done in `[SetUp]` methods — see Section 6 for full lifecycle details.

```csharp
// tests/Services/OrderServiceTests.cs
using NUnit.Framework;
using FluentAssertions;
using Moq;

[TestFixture]
public class OrderServiceTests
{
    private OrderService _sut;
    private Mock<IOrderRepository> _repositoryMock;

    // Setup — [SetUp] runs before EACH test
    [SetUp]
    public void SetUp()
    {
        _repositoryMock = new Mock<IOrderRepository>();
        _sut = new OrderService(_repositoryMock.Object);
    }

    [Test]
    public void CreateOrder_ValidRequest_ReturnsCreatedOrder()
    {
        // Setup
        var request = new CreateOrderRequest { ProductId = 1, Quantity = 2 };
        _repositoryMock
            .Setup(r => r.Add(It.IsAny<Order>()))
            .Returns((Order o) => o);

        // Exercise
        var result = _sut.CreateOrder(request);

        // Verify
        result.Should().NotBeNull();
        result.ProductId.Should().Be(1);
        result.Quantity.Should().Be(2);
    }

    [Test]
    public void CreateOrder_NullRequest_ThrowsArgumentNullException()
    {
        // Exercise
        var act = () => _sut.CreateOrder(null!);

        // Verify
        act.Should().Throw<ArgumentNullException>()
            .WithParameterName("request");
    }
}
```

**NUnit Category and Description attributes**:

```csharp
[TestFixture]
[Category("Integration")]
public class OrderRepositoryNUnitTests
{
    [Test]
    [Description("Verify seeded data is retrievable after insert")]
    public void GetAll_SeededDatabase_ReturnsAllOrders()
    {
        // Setup
        // ... (see Repository patterns in appendix)

        // Exercise / Verify
        Assert.That(/* ... */, Is.Not.Empty);
    }
}
```

**NUnit nested fixtures for grouping**:

```csharp
[TestFixture]
public class OrderServiceTests
{
    [TestFixture]
    [Category("HappyPath")]
    public class WhenOrderIsValid
    {
        private OrderService _sut;

        [SetUp]
        public void SetUp()
        {
            _sut = new OrderService(/* mock */);
        }

        [Test]
        public void CreateOrder_ValidRequest_ReturnsOrder()
        {
            // Setup
            var request = new CreateOrderRequest { ProductId = 1, Quantity = 1 };

            // Exercise
            var result = _sut.CreateOrder(request);

            // Verify
            Assert.That(result, Is.Not.Null);
        }
    }

    [TestFixture]
    [Category("Validation")]
    public class WhenOrderIsInvalid
    {
        [Test]
        public void CreateOrder_NullRequest_Throws()
        {
            // Setup
            var sut = new OrderService(/* mock */);

            // Exercise
            TestDelegate act = () => sut.CreateOrder(null!);

            // Verify
            Assert.Throws<ArgumentNullException>(act);
        }
    }
}
```

### MSTest — [TestClass] and [TestMethod]

MSTest uses `[TestClass]` on the class and `[TestMethod]` on each method. `TestContext` provides run-time metadata such as the test name and result storage path.

```csharp
// tests/Services/OrderServiceTests.cs
using Microsoft.VisualStudio.TestTools.UnitTesting;
using FluentAssertions;
using Moq;

[TestClass]
public class OrderServiceTests
{
    private OrderService _sut;
    private Mock<IOrderRepository> _repositoryMock;

    // TestContext is auto-injected by MSTest when the property name matches
    public TestContext TestContext { get; set; }

    // [TestInitialize] runs before EACH test
    [TestInitialize]
    public void TestInitialize()
    {
        _repositoryMock = new Mock<IOrderRepository>();
        _sut = new OrderService(_repositoryMock.Object);
    }

    [TestMethod]
    public void CreateOrder_ValidRequest_ReturnsCreatedOrder()
    {
        // Setup
        var request = new CreateOrderRequest { ProductId = 1, Quantity = 2 };
        _repositoryMock
            .Setup(r => r.Add(It.IsAny<Order>()))
            .Returns((Order o) => o);

        // Exercise
        var result = _sut.CreateOrder(request);

        // Verify
        result.Should().NotBeNull();
        result.ProductId.Should().Be(1);
        result.Quantity.Should().Be(2);
    }

    [TestMethod]
    public void CreateOrder_NullRequest_ThrowsArgumentNullException()
    {
        // Exercise
        var act = () => _sut.CreateOrder(null!);

        // Verify
        act.Should().Throw<ArgumentNullException>()
            .WithParameterName("request");
    }
}
```

**MSTest TestCategory for grouping**:

```csharp
[TestClass]
public class OrderServiceCategoryTests
{
    [TestMethod]
    [TestCategory("HappyPath")]
    public void CreateOrder_ValidRequest_ReturnsOrder()
    {
        // Setup / Exercise / Verify ...
    }

    [TestMethod]
    [TestCategory("Validation")]
    [TestCategory("Edge")]
    public void CreateOrder_NullRequest_Throws()
    {
        // Setup / Exercise / Verify ...
    }
}
```

**MSTest v3 — Constructor and IDisposable lifecycle**:

In MSTest v3 you may use constructor and `IDisposable`/`IAsyncDisposable` instead of `[TestInitialize]`/`[TestCleanup]`. This aligns closely with the xUnit pattern.

```csharp
[TestClass]
public class OrderServiceV3Tests : IDisposable
{
    private readonly OrderService _sut;
    private readonly Mock<IOrderRepository> _repositoryMock;

    // Constructor — runs before EACH test (MSTest v3+)
    public OrderServiceV3Tests()
    {
        _repositoryMock = new Mock<IOrderRepository>();
        _sut = new OrderService(_repositoryMock.Object);
    }

    [TestMethod]
    public void GetProduct_ValidId_ReturnsProduct()
    {
        // Setup / Exercise / Verify ...
    }

    // Teardown — IDisposable runs after EACH test
    public void Dispose()
    {
        // release resources
    }
}
```

---

### Appendix A — Advanced Domain Patterns

These patterns extend the basic unit test structure for domain-specific scenarios.

#### A.1 Domain Entity Tests (Value Object Equality and Invariants)

```csharp
[Fact]
public void Money_SameAmountAndCurrency_AreEqual()
{
    // Setup
    var money1 = new Money(100m, "USD");
    var money2 = new Money(100m, "USD");

    // Verify (value equality — no Exercise phase needed for construction assertions)
    money1.Should().Be(money2);
}

[Fact]
public void Money_DifferentCurrency_AreNotEqual()
{
    // Setup
    var money1 = new Money(100m, "USD");
    var money2 = new Money(100m, "EUR");

    // Verify
    money1.Should().NotBe(money2);
}

[Fact]
public void Order_NegativeQuantity_ThrowsDomainException()
{
    // Exercise
    var act = () => new Order(productId: 1, quantity: -1);

    // Verify
    act.Should().Throw<DomainException>()
        .WithMessage("*quantity*positive*");
}

[Fact]
public void Customer_NullName_ThrowsArgumentNullException()
{
    // Exercise
    var act = () => new Customer(null!, "test@example.com");

    // Verify
    act.Should().Throw<ArgumentNullException>()
        .WithParameterName("name");
}
```

#### A.2 Repository Tests with EF Core In-Memory Provider

```csharp
public class OrderRepositoryTests
{
    private readonly DbContextOptions<AppDbContext> _options;

    public OrderRepositoryTests()
    {
        _options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;
    }

    [Fact]
    public async Task GetByIdAsync_ExistingOrder_ReturnsOrder()
    {
        // Setup
        await using var context = new AppDbContext(_options);
        var order = new Order { Id = 1, Total = 100m };
        context.Orders.Add(order);
        await context.SaveChangesAsync();

        var repository = new OrderRepository(context);

        // Exercise
        var result = await repository.GetByIdAsync(1);

        // Verify
        result.Should().NotBeNull();
        result!.Total.Should().Be(100m);
    }

    [Fact]
    public async Task GetByIdAsync_NonExistingId_ReturnsNull()
    {
        // Setup
        await using var context = new AppDbContext(_options);
        var repository = new OrderRepository(context);

        // Exercise
        var result = await repository.GetByIdAsync(999);

        // Verify
        result.Should().BeNull();
    }
}
```

#### A.3 MediatR Handler Tests

```csharp
public class CreateOrderHandlerTests
{
    private readonly CreateOrderHandler _sut;
    private readonly Mock<IOrderRepository> _repositoryMock;

    public CreateOrderHandlerTests()
    {
        _repositoryMock = new Mock<IOrderRepository>();
        _sut = new CreateOrderHandler(_repositoryMock.Object);
    }

    [Fact]
    public async Task Handle_ValidCommand_ReturnsOrderId()
    {
        // Setup
        var command = new CreateOrderCommand { ProductId = 1, Quantity = 2 };
        _repositoryMock.Setup(r => r.AddAsync(It.IsAny<Order>()))
            .ReturnsAsync(new Order { Id = 42 });

        // Exercise
        var result = await _sut.Handle(command, CancellationToken.None);

        // Verify
        result.Should().Be(42);
        _repositoryMock.Verify(r => r.AddAsync(It.Is<Order>(o =>
            o.ProductId == 1 && o.Quantity == 2)), Times.Once);
    }
}
```

#### A.4 ASP.NET Core Controller Tests

**With WebApplicationFactory (integration-style)**:

```csharp
using Microsoft.AspNetCore.Mvc.Testing;
using System.Net;
using System.Net.Http.Json;

public class OrdersControllerTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly HttpClient _client;

    public OrdersControllerTests(WebApplicationFactory<Program> factory)
    {
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task GetOrder_ExistingId_ReturnsOk()
    {
        // Exercise
        var response = await _client.GetAsync("/api/orders/1");

        // Verify
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var order = await response.Content.ReadFromJsonAsync<OrderDto>();
        order.Should().NotBeNull();
    }
}
```

**With Mock HttpContext (unit-style)**:

```csharp
public class OrdersControllerUnitTests
{
    private readonly OrdersController _sut;
    private readonly Mock<IOrderService> _orderServiceMock;

    public OrdersControllerUnitTests()
    {
        _orderServiceMock = new Mock<IOrderService>();
        _sut = new OrdersController(_orderServiceMock.Object);
    }

    [Fact]
    public async Task GetById_ExistingId_ReturnsOkResult()
    {
        // Setup
        var order = new OrderDto { Id = 1, Total = 100m };
        _orderServiceMock.Setup(s => s.GetByIdAsync(1)).ReturnsAsync(order);

        // Exercise
        var result = await _sut.GetById(1);

        // Verify
        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        okResult.Value.Should().BeEquivalentTo(order);
    }

    [Fact]
    public async Task GetById_NonExistingId_ReturnsNotFound()
    {
        // Setup
        _orderServiceMock.Setup(s => s.GetByIdAsync(999)).ReturnsAsync((OrderDto?)null);

        // Exercise
        var result = await _sut.GetById(999);

        // Verify
        result.Should().BeOfType<NotFoundResult>();
    }
}
```

---

## 2. Mocking and Stubbing

Moq, NSubstitute, and FakeItEasy are runner-agnostic libraries. All patterns below work identically with xUnit, NUnit, and MSTest. The only difference between runners is **where mocks are initialised** — in the constructor (xUnit), `[SetUp]` method (NUnit), or `[TestInitialize]` method (MSTest).

### Moq

```csharp
// Setup return values
var mock = new Mock<IService>();
mock.Setup(s => s.GetById(It.IsAny<int>())).Returns(new Entity());
mock.Setup(s => s.GetByIdAsync(1)).ReturnsAsync(new Entity { Id = 1 });
mock.Setup(s => s.Save(It.Is<Entity>(e => e.Name == "Test"))).Returns(true);

// Callback — capture arguments passed to the mock
Entity capturedEntity = null;
mock.Setup(s => s.Save(It.IsAny<Entity>()))
    .Callback<Entity>(e => capturedEntity = e)
    .Returns(true);

// Sequential returns
mock.SetupSequence(s => s.GetNext())
    .Returns("first")
    .Returns("second")
    .Throws<InvalidOperationException>();

// Verify call count
mock.Verify(s => s.Save(It.IsAny<Entity>()), Times.Once);
mock.Verify(s => s.Delete(It.IsAny<int>()), Times.Never);
mock.VerifyNoOtherCalls();

// Access mock object
var service = mock.Object;
```

**Moq property setup**:

```csharp
mock.Setup(s => s.Name).Returns("MockedName");
mock.SetupProperty(s => s.Status, EntityStatus.Active); // trackable property
```

### NSubstitute

```csharp
// Setup return values
var service = Substitute.For<IService>();
service.GetById(Arg.Any<int>()).Returns(new Entity());
service.GetByIdAsync(1).Returns(Task.FromResult(new Entity { Id = 1 }));
service.Save(Arg.Is<Entity>(e => e.Name == "Test")).Returns(true);

// Callback — capture arguments
Entity capturedEntity = null;
service.When(s => s.Save(Arg.Any<Entity>()))
    .Do(callInfo => capturedEntity = callInfo.Arg<Entity>());

// Sequential returns
service.GetNext().Returns("first", "second");

// Verify call count
service.Received(1).Save(Arg.Any<Entity>());
service.DidNotReceive().Delete(Arg.Any<int>());

// Throw from a call
service.GetById(999).Returns(x => throw new NotFoundException());
```

### FakeItEasy

```csharp
// Setup return values
var service = A.Fake<IService>();
A.CallTo(() => service.GetById(A<int>.Ignored)).Returns(new Entity());
A.CallTo(() => service.GetByIdAsync(1)).Returns(Task.FromResult(new Entity { Id = 1 }));
A.CallTo(() => service.Save(A<Entity>.That.Matches(e => e.Name == "Test"))).Returns(true);

// Callback — capture arguments
Entity capturedEntity = null;
A.CallTo(() => service.Save(A<Entity>.Ignored))
    .Invokes((Entity e) => capturedEntity = e)
    .Returns(true);

// Sequential returns
A.CallTo(() => service.GetNext())
    .ReturnsNextFromSequence("first", "second");

// Verify call count
A.CallTo(() => service.Save(A<Entity>.Ignored)).MustHaveHappenedOnceExactly();
A.CallTo(() => service.Delete(A<int>.Ignored)).MustNotHaveHappened();

// Throw from a call
A.CallTo(() => service.GetById(999)).Throws<NotFoundException>();
```

### Runner-Specific Mock Initialisation

```csharp
// --- xUnit style (constructor, new instance per [Fact]) ---
public class OrderServiceXUnitTests
{
    private readonly Mock<IOrderRepository> _mock;
    private readonly OrderService _sut;

    public OrderServiceXUnitTests()           // fresh mock per test
    {
        _mock = new Mock<IOrderRepository>();
        _sut = new OrderService(_mock.Object);
    }
}

// --- NUnit style ([SetUp], new instance per [Test]) ---
[TestFixture]
public class OrderServiceNUnitTests
{
    private Mock<IOrderRepository> _mock;
    private OrderService _sut;

    [SetUp]
    public void SetUp()                       // fresh mock per test
    {
        _mock = new Mock<IOrderRepository>();
        _sut = new OrderService(_mock.Object);
    }
}

// --- MSTest style ([TestInitialize], new instance per [TestMethod]) ---
[TestClass]
public class OrderServiceMSTestTests
{
    private Mock<IOrderRepository> _mock;
    private OrderService _sut;

    [TestInitialize]
    public void TestInitialize()              // fresh mock per test
    {
        _mock = new Mock<IOrderRepository>();
        _sut = new OrderService(_mock.Object);
    }
}
```

---

## 3. Assertion Patterns

### FluentAssertions (works with all three runners)

FluentAssertions provides a rich, readable assertion API. Install `FluentAssertions` NuGet package; it works with xUnit, NUnit, and MSTest.

**Value assertions**:

```csharp
result.Should().Be(expected);
result.Should().NotBe(unexpected);
result.Should().BeNull();
result.Should().NotBeNull();
```

**String assertions**:

```csharp
name.Should().StartWith("John");
name.Should().EndWith("Doe");
name.Should().Contain("oh");
name.Should().BeEmpty();
name.Should().NotBeNullOrWhiteSpace();
name.Should().MatchRegex(@"^\w+$");
```

**Numeric assertions**:

```csharp
count.Should().BeGreaterThan(0);
count.Should().BeGreaterThanOrEqualTo(1);
count.Should().BeLessThan(100);
count.Should().BeInRange(1, 100);
price.Should().BeApproximately(10.0m, 0.01m);
```

**Boolean assertions**:

```csharp
isValid.Should().BeTrue();
isDeleted.Should().BeFalse();
```

**Collection assertions**:

```csharp
orders.Should().NotBeEmpty();
orders.Should().HaveCount(3);
orders.Should().HaveCountGreaterThan(0);
orders.Should().Contain(o => o.Id == 1);
orders.Should().NotContain(o => o.Status == "Deleted");
orders.Should().OnlyContain(o => o.Status == "Active");
orders.Should().BeInAscendingOrder(o => o.CreatedAt);
orders.Should().BeInDescendingOrder(o => o.Total);
orders.Should().AllSatisfy(o => o.Total.Should().BeGreaterThan(0));
```

**Object equivalency (deep comparison)**:

```csharp
result.Should().BeEquivalentTo(expected);

// Excluding specific members
result.Should().BeEquivalentTo(expected, options => options
    .Excluding(o => o.Id)
    .Excluding(o => o.CreatedAt));

// Strict ordering in collections
result.Should().BeEquivalentTo(expected, options => options
    .WithStrictOrdering());
```

**Type assertions**:

```csharp
result.Should().BeOfType<OrderDto>();
result.Should().BeAssignableTo<IEntity>();
result.Should().NotBeOfType<string>();
```

### NUnit Constraint Model

NUnit's constraint model (`Assert.That`) is the recommended style. The classic model (`Assert.AreEqual`) is supported but discouraged.

```csharp
// Equality
Assert.That(result, Is.EqualTo(expected));
Assert.That(result, Is.Not.EqualTo(unexpected));

// Null / not null
Assert.That(result, Is.Null);
Assert.That(result, Is.Not.Null);

// Boolean
Assert.That(isValid, Is.True);
Assert.That(isDeleted, Is.False);

// Numeric constraints
Assert.That(count, Is.GreaterThan(0));
Assert.That(count, Is.LessThanOrEqualTo(100));
Assert.That(count, Is.InRange(1, 100));
Assert.That(price, Is.EqualTo(10.0m).Within(0.01m));
```

**NUnit string constraints**:

```csharp
Assert.That(name, Does.StartWith("John"));
Assert.That(name, Does.EndWith("Doe"));
Assert.That(name, Does.Contain("oh"));
Assert.That(name, Is.Not.Null.And.Not.Empty);
Assert.That(name, Does.Match(@"^\w+$"));   // regex
```

**NUnit collection constraints**:

```csharp
Assert.That(orders, Is.Not.Empty);
Assert.That(orders, Has.Count.EqualTo(3));
Assert.That(orders, Has.Count.GreaterThan(0));
Assert.That(orders, Has.Member(specificOrder));
Assert.That(orders, Is.Ordered.By("CreatedAt"));
Assert.That(orders, Is.All.Matches<Order>(o => o.Total > 0));
```

**NUnit type constraints**:

```csharp
Assert.That(result, Is.InstanceOf<OrderDto>());
Assert.That(result, Is.AssignableTo<IEntity>());
Assert.That(result, Is.Not.InstanceOf<string>());
```

**NUnit classic model (legacy — prefer constraint model above)**:

```csharp
Assert.AreEqual(expected, actual);
Assert.IsTrue(condition);
Assert.IsNull(obj);
Assert.IsNotNull(obj);
```

### MSTest Assert API

```csharp
// Equality
Assert.AreEqual(expected, actual);
Assert.AreNotEqual(notExpected, actual);

// Null / not null
Assert.IsNull(obj);
Assert.IsNotNull(obj);

// Boolean
Assert.IsTrue(condition);
Assert.IsFalse(condition);

// Type
Assert.IsInstanceOfType(obj, typeof(OrderDto));
Assert.IsNotInstanceOfType(obj, typeof(string));
```

**MSTest CollectionAssert**:

```csharp
CollectionAssert.Contains(collection, item);
CollectionAssert.DoesNotContain(collection, item);
CollectionAssert.AreEqual(expected, actual);         // same order
CollectionAssert.AreEquivalent(expected, actual);    // any order
CollectionAssert.AllItemsAreNotNull(collection);
CollectionAssert.AllItemsAreInstancesOfType(collection, typeof(Order));
CollectionAssert.IsSubsetOf(subset, superset);
```

**MSTest StringAssert**:

```csharp
StringAssert.Contains(value, substring);
StringAssert.StartsWith(value, prefix);
StringAssert.EndsWith(value, suffix);
StringAssert.Matches(value, new System.Text.RegularExpressions.Regex(@"^\w+$"));
```

---

## 4. Async Testing

### xUnit — async Task Tests and IAsyncLifetime

xUnit supports `async Task` test methods natively. Return `Task` (not `void`) to propagate exceptions correctly.

```csharp
[Fact]
public async Task GetOrderAsync_ValidId_ReturnsOrder()
{
    // Setup
    var expectedOrder = new Order { Id = 1, Total = 100m };
    _repositoryMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(expectedOrder);

    // Exercise
    var result = await _sut.GetOrderAsync(1);

    // Verify
    result.Should().NotBeNull();
    result.Should().BeEquivalentTo(expectedOrder);
}

[Fact]
public async Task GetOrderAsync_NonExistingId_ThrowsNotFoundException()
{
    // Setup
    _repositoryMock.Setup(r => r.GetByIdAsync(999)).ReturnsAsync((Order?)null);

    // Exercise
    var act = async () => await _sut.GetOrderAsync(999);

    // Verify
    await act.Should().ThrowAsync<NotFoundException>()
        .WithMessage("*999*");
}
```

**CancellationToken testing**:

```csharp
[Fact]
public async Task ProcessAsync_CancelledToken_ThrowsOperationCanceledException()
{
    // Setup
    using var cts = new CancellationTokenSource();
    cts.Cancel();

    // Exercise
    var act = async () => await _sut.ProcessAsync(cts.Token);

    // Verify
    await act.Should().ThrowAsync<OperationCanceledException>();
}
```

**IAsyncLifetime — async setup and teardown**:

`IAsyncLifetime` provides async equivalents of constructor and `IDisposable`. Use when fixtures require `await` during initialisation (e.g., starting a test container, seeding a database).

```csharp
using Xunit;

public class DatabaseIntegrationTests : IAsyncLifetime
{
    private AppDbContext _context;

    // InitializeAsync runs before the first test in this class
    public async Task InitializeAsync()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        _context = new AppDbContext(options);
        await _context.Database.EnsureCreatedAsync();
        await SeedDataAsync(_context);
    }

    // DisposeAsync runs after the last test in this class
    public async Task DisposeAsync()
    {
        await _context.Database.EnsureDeletedAsync();
        await _context.DisposeAsync();
    }

    [Fact]
    public async Task GetAllOrders_SeededDatabase_ReturnsAllOrders()
    {
        // Setup
        var repository = new OrderRepository(_context);

        // Exercise
        var result = await repository.GetAllAsync();

        // Verify
        result.Should().NotBeEmpty();
    }

    private static async Task SeedDataAsync(AppDbContext context)
    {
        context.Orders.AddRange(
            new Order { Id = 1, Total = 50m },
            new Order { Id = 2, Total = 75m }
        );
        await context.SaveChangesAsync();
    }
}
```

**IAsyncLifetime on a shared fixture (IClassFixture)**:

```csharp
public class DatabaseFixture : IAsyncLifetime
{
    public AppDbContext Context { get; private set; }

    public async Task InitializeAsync()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase("SharedTestDb")
            .Options;
        Context = new AppDbContext(options);
        await Context.Database.EnsureCreatedAsync();
    }

    public async Task DisposeAsync()
    {
        await Context.DisposeAsync();
    }
}

public class OrderQueryTests : IClassFixture<DatabaseFixture>
{
    private readonly DatabaseFixture _fixture;

    public OrderQueryTests(DatabaseFixture fixture)
    {
        _fixture = fixture;
    }

    [Fact]
    public async Task GetById_SeedRecord_ReturnsRecord()
    {
        // Setup
        var repository = new OrderRepository(_fixture.Context);

        // Exercise
        var result = await repository.GetByIdAsync(1);

        // Verify
        result.Should().NotBeNull();
    }
}
```

**Async streams (IAsyncEnumerable)**:

```csharp
[Fact]
public async Task StreamOrders_ValidRange_YieldsAllOrders()
{
    // Setup
    var expected = new[] { 1, 2, 3 };
    _repositoryMock.Setup(r => r.StreamOrderIdsAsync())
        .Returns(expected.ToAsyncEnumerable());

    // Exercise
    var results = new List<int>();
    await foreach (var id in _sut.StreamOrderIdsAsync())
    {
        results.Add(id);
    }

    // Verify
    results.Should().BeEquivalentTo(expected);
}
```

### NUnit — async Task Tests

NUnit supports `async Task` test methods natively.

```csharp
[TestFixture]
public class OrderServiceAsyncNUnitTests
{
    private Mock<IOrderRepository> _repositoryMock;
    private OrderService _sut;

    [SetUp]
    public void SetUp()
    {
        _repositoryMock = new Mock<IOrderRepository>();
        _sut = new OrderService(_repositoryMock.Object);
    }

    [Test]
    public async Task GetOrderAsync_ValidId_ReturnsOrder()
    {
        // Setup
        var expected = new Order { Id = 1, Total = 100m };
        _repositoryMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(expected);

        // Exercise
        var result = await _sut.GetOrderAsync(1);

        // Verify
        Assert.That(result, Is.Not.Null);
        Assert.That(result, Is.EqualTo(expected).Using(new OrderComparer()));
    }

    [Test]
    public async Task GetOrderAsync_NonExistingId_ThrowsNotFoundException()
    {
        // Setup
        _repositoryMock.Setup(r => r.GetByIdAsync(999)).ReturnsAsync((Order?)null);

        // Exercise / Verify
        Assert.ThrowsAsync<NotFoundException>(
            async () => await _sut.GetOrderAsync(999));
    }
}
```

**NUnit Assert.ThatAsync (NUnit 3.13+)**:

```csharp
[Test]
public async Task GetOrderAsync_NonExistingId_ThrowsAsync()
{
    // Setup
    _repositoryMock.Setup(r => r.GetByIdAsync(999)).ReturnsAsync((Order?)null);

    // Exercise / Verify
    await Assert.ThatAsync(
        async () => await _sut.GetOrderAsync(999),
        Throws.TypeOf<NotFoundException>());
}
```

**NUnit async one-time setup**:

```csharp
[TestFixture]
public class DatabaseNUnitTests
{
    private AppDbContext _context;

    [OneTimeSetUp]
    public async Task OneTimeSetUp()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase("NUnitTestDb")
            .Options;
        _context = new AppDbContext(options);
        await _context.Database.EnsureCreatedAsync();
    }

    [OneTimeTearDown]
    public async Task OneTimeTearDown()
    {
        await _context.DisposeAsync();
    }
}
```

### MSTest — async Task Tests

MSTest supports `async Task` test methods natively.

```csharp
[TestClass]
public class OrderServiceAsyncMSTestTests
{
    private Mock<IOrderRepository> _repositoryMock;
    private OrderService _sut;

    [TestInitialize]
    public void TestInitialize()
    {
        _repositoryMock = new Mock<IOrderRepository>();
        _sut = new OrderService(_repositoryMock.Object);
    }

    [TestMethod]
    public async Task GetOrderAsync_ValidId_ReturnsOrder()
    {
        // Setup
        var expected = new Order { Id = 1, Total = 100m };
        _repositoryMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(expected);

        // Exercise
        var result = await _sut.GetOrderAsync(1);

        // Verify
        result.Should().NotBeNull();
        result.Should().BeEquivalentTo(expected);
    }

    [TestMethod]
    public async Task GetOrderAsync_NonExistingId_ThrowsNotFoundException()
    {
        // Setup
        _repositoryMock.Setup(r => r.GetByIdAsync(999)).ReturnsAsync((Order?)null);

        // Exercise / Verify
        await Assert.ThrowsExceptionAsync<NotFoundException>(
            async () => await _sut.GetOrderAsync(999));
    }
}
```

**MSTest async class-level setup**:

```csharp
[TestClass]
public class DatabaseMSTestTests
{
    private static AppDbContext _context;

    [ClassInitialize]
    public static async Task ClassInitialize(TestContext testContext)
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase("MSTestDb")
            .Options;
        _context = new AppDbContext(options);
        await _context.Database.EnsureCreatedAsync();
    }

    [ClassCleanup]
    public static async Task ClassCleanup()
    {
        await _context.DisposeAsync();
    }

    [TestMethod]
    public async Task GetAll_SeededData_ReturnsOrders()
    {
        // Setup
        var repository = new OrderRepository(_context);

        // Exercise
        var result = await repository.GetAllAsync();

        // Verify
        result.Should().NotBeEmpty();
    }
}
```

---

## 5. Error and Exception Testing

### xUnit / FluentAssertions Exception Patterns

**Synchronous exception**:

```csharp
[Fact]
public void Process_NullInput_ThrowsArgumentNullException()
{
    // Exercise
    var act = () => _sut.Process(null!);

    // Verify
    act.Should().Throw<ArgumentNullException>()
        .WithParameterName("input")
        .WithMessage("*cannot be null*");
}
```

**Asynchronous exception**:

```csharp
[Fact]
public async Task ProcessAsync_NullInput_ThrowsArgumentNullException()
{
    // Exercise
    var act = async () => await _sut.ProcessAsync(null!);

    // Verify
    await act.Should().ThrowAsync<ArgumentNullException>()
        .WithParameterName("input");
}
```

**No exception expected**:

```csharp
[Fact]
public void Process_ValidInput_DoesNotThrow()
{
    // Setup
    var validInput = new ProcessRequest { Value = "valid" };

    // Exercise
    var act = () => _sut.Process(validInput);

    // Verify
    act.Should().NotThrow();
}
```

**xUnit built-in Assert.Throws (no FluentAssertions)**:

```csharp
[Fact]
public void Process_NullInput_ThrowsArgumentNullExceptionBuiltIn()
{
    // Exercise / Verify
    var ex = Assert.Throws<ArgumentNullException>(
        () => _sut.Process(null!));

    Assert.Equal("input", ex.ParamName);
}

[Fact]
public async Task ProcessAsync_NullInput_ThrowsBuiltIn()
{
    // Exercise / Verify
    await Assert.ThrowsAsync<ArgumentNullException>(
        async () => await _sut.ProcessAsync(null!));
}
```

**Record.Exception (xUnit) — for inspecting exception details**:

```csharp
[Fact]
public void Process_InvalidState_ThrowsWithCorrectMessage()
{
    // Setup
    _sut.SetState(State.Invalid);

    // Exercise
    var ex = Record.Exception(() => _sut.Process(new ProcessRequest()));

    // Verify
    ex.Should().NotBeNull();
    ex.Should().BeOfType<InvalidOperationException>();
    ex.Message.Should().Contain("state");
}
```

**Custom exception types and inner exceptions**:

```csharp
[Fact]
public void ProcessOrder_DatabaseFailure_ThrowsServiceException()
{
    // Setup
    _repositoryMock.Setup(r => r.Save(It.IsAny<Order>()))
        .Throws(new DbException("Connection lost"));

    // Exercise
    var act = () => _sut.ProcessOrder(new Order());

    // Verify
    act.Should().Throw<ServiceException>()
        .WithMessage("*failed*")
        .WithInnerException<DbException>()
        .WithMessage("*Connection lost*");
}
```

**AggregateException**:

```csharp
[Fact]
public async Task ProcessBatchAsync_MultipleFailures_ThrowsAggregateException()
{
    // Setup
    var invalidItems = new[] { new Item { Id = -1 }, new Item { Id = -2 } };

    // Exercise
    var act = async () => await _sut.ProcessBatchAsync(invalidItems);

    // Verify
    var ex = await act.Should().ThrowAsync<AggregateException>();
    ex.Which.InnerExceptions.Should().HaveCount(2);
}
```

### NUnit Exception Patterns

**Assert.Throws (synchronous)**:

```csharp
[Test]
public void Process_NullInput_ThrowsArgumentNullException()
{
    // Exercise / Verify
    var ex = Assert.Throws<ArgumentNullException>(
        () => _sut.Process(null!));

    Assert.That(ex.ParamName, Is.EqualTo("input"));
}
```

**Assert.ThrowsAsync (asynchronous)**:

```csharp
[Test]
public void ProcessAsync_NullInput_ThrowsArgumentNullException()
{
    // Exercise / Verify
    // Note: Assert.ThrowsAsync is synchronous in the call, awaits internally
    var ex = Assert.ThrowsAsync<ArgumentNullException>(
        async () => await _sut.ProcessAsync(null!));

    Assert.That(ex.ParamName, Is.EqualTo("input"));
}
```

**Assert.DoesNotThrow**:

```csharp
[Test]
public void Process_ValidInput_DoesNotThrow()
{
    // Setup
    var validInput = new ProcessRequest { Value = "valid" };

    // Exercise / Verify
    Assert.DoesNotThrow(() => _sut.Process(validInput));
}
```

**NUnit constraint model for exceptions**:

```csharp
[Test]
public void Process_NullInput_ThrowsWithConstraint()
{
    // Exercise / Verify
    Assert.That(
        () => _sut.Process(null!),
        Throws.TypeOf<ArgumentNullException>()
            .With.Property("ParamName").EqualTo("input"));
}

[Test]
public void Process_NullInput_ThrowsConstraintWithMessage()
{
    // Exercise / Verify
    Assert.That(
        () => _sut.Process(null!),
        Throws.TypeOf<ArgumentNullException>()
            .And.Message.Contains("input"));
}
```

**NUnit DoesNotThrowAsync**:

```csharp
[Test]
public void ProcessAsync_ValidInput_DoesNotThrowAsync()
{
    // Setup
    var valid = new ProcessRequest { Value = "ok" };

    // Exercise / Verify
    Assert.DoesNotThrowAsync(async () => await _sut.ProcessAsync(valid));
}
```

### MSTest Exception Patterns

**Assert.ThrowsException (synchronous)**:

```csharp
[TestMethod]
public void Process_NullInput_ThrowsArgumentNullException()
{
    // Exercise / Verify
    var ex = Assert.ThrowsException<ArgumentNullException>(
        () => _sut.Process(null!));

    Assert.AreEqual("input", ex.ParamName);
}
```

**Assert.ThrowsExceptionAsync (asynchronous)**:

```csharp
[TestMethod]
public async Task ProcessAsync_NullInput_ThrowsArgumentNullException()
{
    // Exercise / Verify
    var ex = await Assert.ThrowsExceptionAsync<ArgumentNullException>(
        async () => await _sut.ProcessAsync(null!));

    Assert.AreEqual("input", ex.ParamName);
}
```

**[ExpectedException] — legacy, prefer Assert.ThrowsException**:

```csharp
// Legacy approach — do NOT use in new code; it cannot inspect exception details
[TestMethod]
[ExpectedException(typeof(ArgumentNullException))]
public void Process_NullInput_Throws_Legacy()
{
    _sut.Process(null!);
}
```

**MSTest with FluentAssertions for richer exception assertions**:

```csharp
[TestMethod]
public async Task ProcessAsync_DatabaseFailure_ThrowsServiceException()
{
    // Setup
    _repositoryMock.Setup(r => r.SaveAsync(It.IsAny<Order>(), default))
        .ThrowsAsync(new DbException("timeout"));

    // Exercise
    var act = async () => await _sut.ProcessAsync(new Order());

    // Verify
    await act.Should().ThrowAsync<ServiceException>()
        .WithInnerException<DbException>();
}
```

---

## 6. Setup and Teardown Lifecycle

### xUnit — Constructor, IDisposable, IClassFixture, IAsyncLifetime

xUnit enforces isolation by creating a new class instance per test. There are no lifecycle attributes; setup goes in the constructor and teardown in `IDisposable.Dispose`.

**Per-test setup and teardown**:

```csharp
public class OrderServiceLifecycleTests : IDisposable
{
    private readonly OrderService _sut;
    private readonly Mock<IOrderRepository> _mock;

    // Setup — runs before EACH test
    public OrderServiceLifecycleTests()
    {
        _mock = new Mock<IOrderRepository>();
        _sut = new OrderService(_mock.Object);
    }

    [Fact]
    public void CreateOrder_ValidRequest_ReturnsOrder()
    {
        // Setup / Exercise / Verify ...
    }

    // Teardown — runs after EACH test
    public void Dispose()
    {
        // Release unmanaged resources, stop server, etc.
        _sut.Dispose();
    }
}
```

**Class-level shared context (IClassFixture)**:

```csharp
public class DatabaseFixture : IDisposable
{
    public AppDbContext Context { get; }

    public DatabaseFixture()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase("TestDb-" + Guid.NewGuid())
            .Options;
        Context = new AppDbContext(options);
        // Seed data once
        Context.Orders.Add(new Order { Id = 1, Total = 100m });
        Context.SaveChanges();
    }

    public void Dispose() => Context.Dispose();
}

public class OrderQueryTests : IClassFixture<DatabaseFixture>
{
    private readonly DatabaseFixture _fixture;

    public OrderQueryTests(DatabaseFixture fixture)
    {
        _fixture = fixture;
    }

    [Fact]
    public void GetAll_ReturnsSeededOrders()
    {
        // Setup
        var repository = new OrderRepository(_fixture.Context);

        // Exercise
        var result = repository.GetAll();

        // Verify
        result.Should().NotBeEmpty();
    }
}
```

**Cross-class shared context (ICollectionFixture)**:

```csharp
[CollectionDefinition("Database")]
public class DatabaseCollection : ICollectionFixture<DatabaseFixture> { }

[Collection("Database")]
public class OrderServiceIntegrationTests
{
    private readonly DatabaseFixture _fixture;

    public OrderServiceIntegrationTests(DatabaseFixture fixture)
    {
        _fixture = fixture;
    }
}

[Collection("Database")]
public class ProductServiceIntegrationTests
{
    private readonly DatabaseFixture _fixture;

    public ProductServiceIntegrationTests(DatabaseFixture fixture)
    {
        _fixture = fixture;
    }
}
```

**IAsyncLifetime (see also Section 4)**:

Execution order in a single test class with `IAsyncLifetime`:
1. Constructor
2. `InitializeAsync`
3. Test method
4. `DisposeAsync`
5. `Dispose` (if also implements `IDisposable`)

```csharp
public class AsyncLifetimeTests : IAsyncLifetime, IDisposable
{
    private TestServer _server;

    public async Task InitializeAsync()
    {
        _server = await TestServer.StartAsync();
    }

    [Fact]
    public async Task GetHealth_RunningServer_ReturnsOk()
    {
        var response = await _server.GetAsync("/health");
        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    public async Task DisposeAsync()
    {
        await _server.StopAsync();
    }

    public void Dispose()
    {
        _server?.Dispose();
    }
}
```

**ITestOutputHelper (xUnit diagnostic output)**:

```csharp
using Xunit.Abstractions;

public class OrderServiceDiagnosticsTests
{
    private readonly ITestOutputHelper _output;

    public OrderServiceDiagnosticsTests(ITestOutputHelper output)
    {
        _output = output;
    }

    [Fact]
    public void CreateOrder_LogsDiagnosticInfo()
    {
        // Setup
        _output.WriteLine("Starting CreateOrder test...");

        // Exercise / Verify ...

        _output.WriteLine("Test complete.");
    }
}
```

### NUnit — [SetUp]/[TearDown]/[OneTimeSetUp]/[OneTimeTearDown]

NUnit creates a new instance per test. Lifecycle methods are annotated with attributes.

**Execution order within a test fixture**:
1. `[OneTimeSetUp]` — once before the first test
2. `[SetUp]` — before each test
3. Test method
4. `[TearDown]` — after each test
5. `[OneTimeTearDown]` — once after the last test

```csharp
[TestFixture]
public class OrderServiceNUnitLifecycleTests
{
    private static AppDbContext _sharedContext;   // class-level
    private OrderService _sut;                    // per-test
    private Mock<IOrderRepository> _mock;

    [OneTimeSetUp]
    public static void OneTimeSetUp()
    {
        // Runs ONCE before all tests in this fixture
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase("NUnitShared")
            .Options;
        _sharedContext = new AppDbContext(options);
        _sharedContext.Database.EnsureCreated();
    }

    [SetUp]
    public void SetUp()
    {
        // Runs before EACH test
        _mock = new Mock<IOrderRepository>();
        _sut = new OrderService(_mock.Object);
    }

    [Test]
    public void CreateOrder_ValidRequest_ReturnsOrder()
    {
        // Setup / Exercise / Verify ...
    }

    [TearDown]
    public void TearDown()
    {
        // Runs after EACH test
        _sut?.Dispose();
    }

    [OneTimeTearDown]
    public static void OneTimeTearDown()
    {
        // Runs ONCE after all tests in this fixture
        _sharedContext?.Dispose();
    }
}
```

**NUnit async lifecycle**:

```csharp
[TestFixture]
public class DatabaseNUnitAsyncTests
{
    private AppDbContext _context;

    [OneTimeSetUp]
    public async Task OneTimeSetUpAsync()
    {
        _context = new AppDbContext(/* options */);
        await _context.Database.EnsureCreatedAsync();
    }

    [OneTimeTearDown]
    public async Task OneTimeTearDownAsync()
    {
        await _context.DisposeAsync();
    }

    [SetUp]
    public async Task SetUpAsync()
    {
        await _context.Database.BeginTransactionAsync();
    }

    [TearDown]
    public async Task TearDownAsync()
    {
        await _context.Database.RollbackTransactionAsync();
    }
}
```

**NUnit IDisposable**:

```csharp
[TestFixture]
public class ResourceTests : IDisposable
{
    private SomeResource _resource;

    [SetUp]
    public void SetUp()
    {
        _resource = new SomeResource();
    }

    [Test]
    public void Resource_IsUsable_DoesNotThrow()
    {
        Assert.DoesNotThrow(() => _resource.Use());
    }

    public void Dispose()
    {
        _resource?.Dispose();
    }
}
```

### MSTest — [TestInitialize]/[TestCleanup]/[ClassInitialize]/[ClassCleanup]

**Execution order**:
1. `[AssemblyInitialize]` — once before all tests in the assembly
2. `[ClassInitialize]` — once before all tests in the class
3. Constructor (MSTest v3) or no-arg constructor
4. `[TestInitialize]` — before each test
5. Test method
6. `[TestCleanup]` — after each test
7. `Dispose` (MSTest v3 IDisposable)
8. `[ClassCleanup]` — once after all tests in the class
9. `[AssemblyCleanup]` — once after all tests in the assembly

```csharp
[TestClass]
public class OrderServiceMSTestLifecycleTests
{
    private static AppDbContext _sharedContext;    // class-level
    private OrderService _sut;
    private Mock<IOrderRepository> _mock;

    [AssemblyInitialize]
    public static void AssemblyInitialize(TestContext context)
    {
        // Runs ONCE for the entire assembly
    }

    [ClassInitialize]
    public static void ClassInitialize(TestContext context)
    {
        // Runs ONCE before all tests in this class
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase("MSTestShared")
            .Options;
        _sharedContext = new AppDbContext(options);
        _sharedContext.Database.EnsureCreated();
    }

    [TestInitialize]
    public void TestInitialize()
    {
        // Runs before EACH test
        _mock = new Mock<IOrderRepository>();
        _sut = new OrderService(_mock.Object);
    }

    [TestMethod]
    public void CreateOrder_ValidRequest_ReturnsOrder()
    {
        // Setup / Exercise / Verify ...
    }

    [TestCleanup]
    public void TestCleanup()
    {
        // Runs after EACH test
        _sut?.Dispose();
    }

    [ClassCleanup]
    public static void ClassCleanup()
    {
        // Runs ONCE after all tests in this class
        _sharedContext?.Dispose();
    }

    [AssemblyCleanup]
    public static void AssemblyCleanup()
    {
        // Runs ONCE after all tests in the assembly
    }
}
```

**MSTest async lifecycle**:

```csharp
[TestClass]
public class DatabaseMSTestAsyncLifecycle
{
    private static AppDbContext _context;

    [ClassInitialize]
    public static async Task ClassInitialize(TestContext context)
    {
        _context = new AppDbContext(/* options */);
        await _context.Database.EnsureCreatedAsync();
    }

    [ClassCleanup]
    public static async Task ClassCleanup()
    {
        await _context.DisposeAsync();
    }
}
```

**MSTest v3 — Constructor and IDisposable**:

MSTest v3 supports using constructor/`IDisposable` (like xUnit) instead of `[TestInitialize]`/`[TestCleanup]`. Both styles work; use `[TestInitialize]` if you need access to `TestContext`.

```csharp
[TestClass]
public class OrderServiceV3LifecycleTests : IDisposable
{
    private readonly OrderService _sut;
    private readonly Mock<IOrderRepository> _mock;

    public OrderServiceV3LifecycleTests()
    {
        _mock = new Mock<IOrderRepository>();
        _sut = new OrderService(_mock.Object);
    }

    [TestMethod]
    public void CreateOrder_ValidRequest_ReturnsOrder() { /* ... */ }

    public void Dispose()
    {
        _sut.Dispose();
    }
}
```

---

## 7. Parameterised and Data-Driven Tests

### xUnit — [Theory] Variants

**[InlineData]** — literal values inline:

```csharp
[Theory]
[InlineData("", false)]
[InlineData("a", false)]
[InlineData("test@example.com", true)]
[InlineData("invalid-email", false)]
[InlineData("user@domain.co.uk", true)]
public void IsValidEmail_VariousInputs_ReturnsExpected(string email, bool expected)
{
    // Exercise
    var result = EmailValidator.IsValid(email);

    // Verify
    result.Should().Be(expected);
}
```

**[MemberData]** — data from a static property or method:

```csharp
public static IEnumerable<object[]> OrderCalculationData =>
    new List<object[]>
    {
        new object[] { 1, 10.0m, 10.0m },
        new object[] { 2, 15.0m, 30.0m },
        new object[] { 0, 10.0m, 0.0m },
    };

[Theory]
[MemberData(nameof(OrderCalculationData))]
public void CalculateTotal_VariousInputs_ReturnsCorrectTotal(
    int quantity, decimal price, decimal expected)
{
    // Exercise
    var result = OrderCalculator.CalculateTotal(quantity, price);

    // Verify
    result.Should().Be(expected);
}
```

**[ClassData]** — data from a class implementing `IEnumerable<object[]>`:

```csharp
public class OrderTestDataGenerator : IEnumerable<object[]>
{
    public IEnumerator<object[]> GetEnumerator()
    {
        yield return new object[] { 1, 10.0m, 10.0m };
        yield return new object[] { 5, 20.0m, 100.0m };
        yield return new object[] { 0, 10.0m, 0.0m };
    }

    IEnumerator IEnumerable.GetEnumerator() => GetEnumerator();
}

[Theory]
[ClassData(typeof(OrderTestDataGenerator))]
public void CalculateTotal_GeneratedData_ReturnsCorrectTotal(
    int quantity, decimal price, decimal expected)
{
    // Exercise
    var result = OrderCalculator.CalculateTotal(quantity, price);

    // Verify
    result.Should().Be(expected);
}
```

### NUnit — [TestCase] and [TestCaseSource]

**[TestCase]** — inline values, similar to xUnit `[InlineData]`:

```csharp
[TestFixture]
public class EmailValidatorNUnitTests
{
    [TestCase("", false)]
    [TestCase("a", false)]
    [TestCase("test@example.com", true)]
    [TestCase("invalid-email", false)]
    [TestCase("user@domain.co.uk", true)]
    public void IsValidEmail_VariousInputs_ReturnsExpected(string email, bool expected)
    {
        // Exercise
        var result = EmailValidator.IsValid(email);

        // Verify
        Assert.That(result, Is.EqualTo(expected));
    }
}
```

**[TestCase] with ExpectedResult** — return value variant:

```csharp
[TestCase(1, 10.0, ExpectedResult = 10.0)]
[TestCase(2, 15.0, ExpectedResult = 30.0)]
[TestCase(0, 10.0, ExpectedResult = 0.0)]
public decimal CalculateTotal_VariousInputs_ReturnsCorrectTotal(int quantity, decimal price)
{
    // Exercise + implicit Verify (NUnit checks return value == ExpectedResult)
    return OrderCalculator.CalculateTotal(quantity, price);
}
```

**[TestCaseSource]** — data from a static property or method:

```csharp
public static IEnumerable<TestCaseData> OrderData()
{
    yield return new TestCaseData(1, 10.0m, 10.0m)
        .SetName("SingleItem_Returns10");
    yield return new TestCaseData(2, 15.0m, 30.0m)
        .SetName("TwoItems_Returns30");
    yield return new TestCaseData(0, 10.0m, 0.0m)
        .SetName("ZeroQuantity_Returns0");
}

[TestCaseSource(nameof(OrderData))]
public void CalculateTotal_SourcedData_ReturnsCorrectTotal(
    int quantity, decimal price, decimal expected)
{
    // Exercise
    var result = OrderCalculator.CalculateTotal(quantity, price);

    // Verify
    Assert.That(result, Is.EqualTo(expected));
}
```

**[Values] and [Range] — combinatorial attribute testing**:

```csharp
[Test]
public void IsPositive_PositiveValues_ReturnsTrue(
    [Values(1, 2, 5, 100)] int value)
{
    Assert.That(NumberUtils.IsPositive(value), Is.True);
}

[Test]
public void IsInRange_BoundaryValues_ReturnsExpected(
    [Range(1, 5)] int value)
{
    // Each value 1, 2, 3, 4, 5 gets its own test run
    Assert.That(RangeChecker.IsInRange(value, 1, 5), Is.True);
}
```

**[ValueSource] — values from a static property**:

```csharp
public static int[] ValidQuantities = { 1, 2, 5, 10 };

[Test]
public void Process_ValidQuantity_DoesNotThrow(
    [ValueSource(nameof(ValidQuantities))] int quantity)
{
    Assert.DoesNotThrow(() => _sut.Process(new Order { Quantity = quantity }));
}
```

**[Combinatorial] vs [Sequential]**:

```csharp
// [Combinatorial] (default) generates all combinations: 2x3 = 6 tests
[Test]
[Combinatorial]
public void Add_AllCombinations_ReturnsSum(
    [Values(1, 2)] int a,
    [Values(10, 20, 30)] int b)
{
    Assert.That(Calculator.Add(a, b), Is.EqualTo(a + b));
}

// [Sequential] pairs values positionally: 2 tests (stops at shortest sequence)
[Test]
[Sequential]
public void Add_SequentialPairs_ReturnsSum(
    [Values(1, 2)] int a,
    [Values(10, 20, 30)] int b)
{
    Assert.That(Calculator.Add(a, b), Is.EqualTo(a + b));
}
```

### MSTest — [DataRow] and [DynamicData]

**[DataTestMethod] + [DataRow]** — inline values, similar to NUnit `[TestCase]`:

```csharp
[TestClass]
public class EmailValidatorMSTestTests
{
    [DataTestMethod]
    [DataRow("", false)]
    [DataRow("a", false)]
    [DataRow("test@example.com", true)]
    [DataRow("invalid-email", false)]
    [DataRow("user@domain.co.uk", true)]
    public void IsValidEmail_VariousInputs_ReturnsExpected(string email, bool expected)
    {
        // Exercise
        var result = EmailValidator.IsValid(email);

        // Verify
        Assert.AreEqual(expected, result);
    }
}
```

**[DynamicData]** — data from a static property or method:

```csharp
[TestClass]
public class OrderCalculatorMSTestTests
{
    public static IEnumerable<object[]> OrderCalculationData
    {
        get
        {
            yield return new object[] { 1, 10.0m, 10.0m };
            yield return new object[] { 2, 15.0m, 30.0m };
            yield return new object[] { 0, 10.0m, 0.0m };
        }
    }

    [DataTestMethod]
    [DynamicData(nameof(OrderCalculationData))]
    public void CalculateTotal_DynamicData_ReturnsCorrectTotal(
        int quantity, decimal price, decimal expected)
    {
        // Exercise
        var result = OrderCalculator.CalculateTotal(quantity, price);

        // Verify
        Assert.AreEqual(expected, result);
    }
}
```

**[DynamicData] from a method**:

```csharp
public static IEnumerable<object[]> GetOrderData()
{
    yield return new object[] { 1, 10.0m, 10.0m };
    yield return new object[] { 2, 15.0m, 30.0m };
}

[DataTestMethod]
[DynamicData(nameof(GetOrderData), DynamicDataSourceType.Method)]
public void CalculateTotal_MethodData_ReturnsCorrectTotal(
    int quantity, decimal price, decimal expected)
{
    // Exercise
    var result = OrderCalculator.CalculateTotal(quantity, price);

    // Verify
    Assert.AreEqual(expected, result);
}
```

**Custom ITestDataSource** — for complex data scenarios:

```csharp
public class OrderDataSource : Attribute, ITestDataSource
{
    public IEnumerable<object[]> GetData(MethodInfo methodInfo)
    {
        yield return new object[] { 1, 10.0m, 10.0m };
        yield return new object[] { 5, 20.0m, 100.0m };
    }

    public string GetDisplayName(MethodInfo methodInfo, object[] data)
        => $"qty={data[0]}, price={data[1]}, expected={data[2]}";
}

[DataTestMethod]
[OrderDataSource]
public void CalculateTotal_CustomSource_ReturnsCorrectTotal(
    int quantity, decimal price, decimal expected)
{
    // Exercise
    var result = OrderCalculator.CalculateTotal(quantity, price);

    // Verify
    Assert.AreEqual(expected, result);
}
```

---

## 8. File Naming and Location Conventions

### Universal Conventions (All Runners)

**Naming pattern**: `MethodName_Scenario_ExpectedResult`

```
CreateOrder_ValidRequest_ReturnsOrder
CreateOrder_NullRequest_ThrowsArgumentNullException
GetById_ExistingId_ReturnsEntity
GetById_NonExistingId_ReturnsNull
CalculateTotal_EmptyCart_ReturnsZero
IsValidEmail_InvalidFormat_ReturnsFalse
ProcessAsync_CancelledToken_ThrowsOperationCanceledException
```

**File naming**: Test class per source class, with `Tests` suffix.

```
OrderService.cs          → OrderServiceTests.cs
EmailValidator.cs        → EmailValidatorTests.cs
CreateOrderHandler.cs    → CreateOrderHandlerTests.cs
OrdersController.cs      → OrdersControllerTests.cs
```

**Project naming by runner**:

```
MyProject.UnitTests          (xUnit — default)
MyProject.NUnitTests         (NUnit)
MyProject.MSTestTests        (MSTest)
MyProject.IntegrationTests   (any runner — integration tests)
```

### Directory Structure

Tests mirror the source structure under `tests/<Project>.<Runner>Tests/`:

```
src/
├── MyProject.Application/
│   ├── Services/
│   │   └── OrderService.cs
│   └── Handlers/
│       └── CreateOrderHandler.cs
├── MyProject.Domain/
│   └── Entities/
│       └── Order.cs
└── MyProject.Api/
    └── Controllers/
        └── OrdersController.cs

tests/
├── MyProject.UnitTests/                    ← xUnit
│   ├── MyProject.UnitTests.csproj
│   ├── Services/
│   │   └── OrderServiceTests.cs
│   ├── Handlers/
│   │   └── CreateOrderHandlerTests.cs
│   ├── Entities/
│   │   └── OrderTests.cs
│   └── Controllers/
│       └── OrdersControllerTests.cs
├── MyProject.NUnitTests/                   ← NUnit
│   ├── MyProject.NUnitTests.csproj
│   └── Services/
│       └── OrderServiceTests.cs
├── MyProject.MSTestTests/                  ← MSTest
│   ├── MyProject.MSTestTests.csproj
│   └── Services/
│       └── OrderServiceTests.cs
└── MyProject.IntegrationTests/             ← any runner
    ├── MyProject.IntegrationTests.csproj
    └── Api/
        └── OrdersControllerIntegrationTests.cs
```

### Project File Examples

**xUnit project (.csproj)**:

```xml
<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <TargetFramework>net8.0</TargetFramework>
    <Nullable>enable</Nullable>
    <IsPackable>false</IsPackable>
  </PropertyGroup>

  <ItemGroup>
    <PackageReference Include="xunit" Version="2.9.*" />
    <PackageReference Include="xunit.runner.visualstudio" Version="2.8.*">
      <IncludeAssets>runtime; build; native; contentfiles; analyzers</IncludeAssets>
      <PrivateAssets>all</PrivateAssets>
    </PackageReference>
    <PackageReference Include="Microsoft.NET.Test.Sdk" Version="17.*" />
    <PackageReference Include="FluentAssertions" Version="6.*" />
    <PackageReference Include="Moq" Version="4.*" />
  </ItemGroup>

  <ItemGroup>
    <ProjectReference Include="..\..\src\MyProject.Application\MyProject.Application.csproj" />
  </ItemGroup>
</Project>
```

**NUnit project (.csproj)**:

```xml
<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <TargetFramework>net8.0</TargetFramework>
    <Nullable>enable</Nullable>
    <IsPackable>false</IsPackable>
  </PropertyGroup>

  <ItemGroup>
    <PackageReference Include="NUnit" Version="3.*" />
    <PackageReference Include="NUnit3TestAdapter" Version="4.*" />
    <PackageReference Include="Microsoft.NET.Test.Sdk" Version="17.*" />
    <PackageReference Include="FluentAssertions" Version="6.*" />
    <PackageReference Include="Moq" Version="4.*" />
  </ItemGroup>
</Project>
```

**MSTest project (.csproj)**:

```xml
<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <TargetFramework>net8.0</TargetFramework>
    <Nullable>enable</Nullable>
    <IsPackable>false</IsPackable>
  </PropertyGroup>

  <ItemGroup>
    <PackageReference Include="MSTest" Version="3.*" />
    <PackageReference Include="Microsoft.NET.Test.Sdk" Version="17.*" />
    <PackageReference Include="FluentAssertions" Version="6.*" />
    <PackageReference Include="Moq" Version="4.*" />
  </ItemGroup>
</Project>
```

### xUnit-Specific Conventions

xUnit discovers all `public` classes with `[Fact]` or `[Theory]` methods without requiring any class-level attribute. Classes do not inherit from a base type.

```csharp
// Correct — xUnit discovers this automatically
public class OrderServiceTests
{
    [Fact]
    public void CreateOrder_ValidRequest_ReturnsOrder() { }
}

// Also correct — use sealed to prevent accidental inheritance
public sealed class OrderServiceTests
{
    [Fact]
    public void CreateOrder_ValidRequest_ReturnsOrder() { }
}
```

### NUnit-Specific Conventions

```csharp
// [TestFixture] is optional for plain public classes in NUnit 3+
// Required for parameterised fixtures: [TestFixture(arg1, arg2)]
[TestFixture]
public class OrderServiceTests
{
    [Test]
    public void CreateOrder_ValidRequest_ReturnsOrder() { }
}

// Parameterised fixture (requires [TestFixture])
[TestFixture("USD")]
[TestFixture("EUR")]
public class CurrencyTests
{
    private readonly string _currency;

    public CurrencyTests(string currency)
    {
        _currency = currency;
    }

    [Test]
    public void Format_ValidAmount_ReturnsFormattedString()
    {
        var result = CurrencyFormatter.Format(100m, _currency);
        Assert.That(result, Is.Not.Null.And.Not.Empty);
    }
}
```

### MSTest-Specific Conventions

MSTest requires `[TestClass]` on every test class — unlike xUnit and NUnit 3+, undiscovered classes will not run.

```csharp
// Required — [TestClass] is mandatory
[TestClass]
public class OrderServiceTests
{
    [TestMethod]
    public void CreateOrder_ValidRequest_ReturnsOrder() { }
}
```

**MSTest .runsettings** — configure test execution behaviour:

```xml
<!-- .runsettings -->
<?xml version="1.0" encoding="utf-8"?>
<RunSettings>
  <MSTest>
    <Parallelize>
      <Workers>4</Workers>
      <Scope>ClassLevel</Scope>
    </Parallelize>
  </MSTest>
  <RunConfiguration>
    <ResultsDirectory>./TestResults</ResultsDirectory>
  </RunConfiguration>
</RunSettings>
```

### Naming Convention Summary

| Element | xUnit | NUnit | MSTest | Convention |
|---|---|---|---|---|
| Test file | `OrderServiceTests.cs` | `OrderServiceTests.cs` | `OrderServiceTests.cs` | `{ClassName}Tests.cs` |
| Test class | `OrderServiceTests` (no attr) | `[TestFixture] OrderServiceTests` | `[TestClass] OrderServiceTests` | `{ClassName}Tests` |
| Test method | `[Fact] void Create_…` | `[Test] void Create_…` | `[TestMethod] void Create_…` | `Method_Scenario_ExpectedResult` |
| Project name | `MyProject.UnitTests` | `MyProject.NUnitTests` | `MyProject.MSTestTests` | `{Project}.{Runner}Tests` |
| Test directory | `tests/` | `tests/` | `tests/` | `tests/` at solution root |

### Test Name Examples Applying Convention

```csharp
// Pattern: MethodName_Scenario_ExpectedResult

// OrderService.CreateOrder
CreateOrder_ValidRequest_ReturnsCreatedOrder
CreateOrder_NullRequest_ThrowsArgumentNullException
CreateOrder_ZeroQuantity_ThrowsDomainException
CreateOrder_DuplicateRequest_ThrowsConflictException

// EmailValidator.IsValid
IsValid_StandardEmail_ReturnsTrue
IsValid_EmptyString_ReturnsFalse
IsValid_MissingAtSymbol_ReturnsFalse
IsValid_NullInput_ThrowsArgumentNullException

// OrderRepository.GetByIdAsync
GetByIdAsync_ExistingOrder_ReturnsOrder
GetByIdAsync_NonExistingId_ReturnsNull
GetByIdAsync_CancelledToken_ThrowsOperationCanceledException

// MediatR handler
Handle_ValidCommand_ReturnsOrderId
Handle_RepositoryThrows_PropagatesException
Handle_CancelledToken_ThrowsOperationCanceledException
```

---

**Version**: 2.0.0
**Last Updated**: 2026-03-17
**Status**: Active
**Stack**: .NET 8+ (xUnit >= 2.5, NUnit >= 3.14, MSTest v3, FluentAssertions >= 6.12, Moq >= 4.20, NSubstitute >= 5.1, FakeItEasy >= 8.0)
