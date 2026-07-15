# Java Test Patterns

This document defines test patterns for Java projects in Phoenix OS. It covers **JUnit 5** (primary) with **Mockito** for mocking and **AssertJ** for fluent assertions (primary) / **Hamcrest** (alternative) for all eight required content areas. All examples target Java 17+ and follow the four-phase pattern (Setup-Exercise-Verify-Teardown) and the `methodName_scenario_expectedResult` naming convention (camelCase — native to Java, direct mapping from the Phoenix OS standard).

**Frameworks in scope**:
- JUnit 5 (Jupiter) >= 5.10 (primary test runner)
- Mockito >= 5.0 (mocking, stubbing, verification)
- AssertJ >= 3.24 (primary fluent assertion library)
- Hamcrest >= 2.2 (alternative matcher-based assertions — shown where it adds value)
- `java.util.concurrent` (stdlib, async patterns)
- Awaitility >= 4.2 (optional, polling-based async assertions)

**Naming convention**: All test method names use camelCase with underscores as segment separators: `methodName_scenario_expectedResult`. Example: `createOrder_validRequest_returnsOrder`. The `@DisplayName` annotation uses natural language for human-readable output. Java class names follow `{ClassName}Test` convention.

---

## 1. Unit Test Structure

### JUnit 5 — Basic Test Class Anatomy

The simplest JUnit 5 form: a class with `@Test`-annotated methods. No base class required. Class visibility can be package-private (JUnit 5 does not require `public`).

```java
// src/test/java/com/myapp/services/OrderServiceTest.java
package com.myapp.services;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class OrderServiceTest {

    @Test
    void createOrder_validRequest_returnsOrder() {
        // Setup
        var service = new OrderService();
        var request = new OrderRequest(1L, 2);

        // Exercise
        var result = service.createOrder(request);

        // Verify
        assertThat(result).isNotNull();
        assertThat(result.getProductId()).isEqualTo(1L);
        assertThat(result.getQuantity()).isEqualTo(2);
    }

    @Test
    void createOrder_nullRequest_throwsNullPointerException() {
        // Setup
        var service = new OrderService();

        // Exercise & Verify (combined when the act is the assertion subject)
        org.junit.jupiter.api.Assertions.assertThrows(
            NullPointerException.class,
            () -> service.createOrder(null)
        );
    }
}
```

### JUnit 5 — @DisplayName for Human-Readable Names

Use `@DisplayName` on the class and individual test methods for descriptive test reports. The annotation does not replace the method naming convention — both coexist.

```java
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("OrderService")
class OrderServiceTest {

    @Test
    @DisplayName("createOrder: valid request — returns populated Order")
    void createOrder_validRequest_returnsOrder() {
        // Setup
        var service = new OrderService();
        var request = new OrderRequest(1L, 2);

        // Exercise
        var result = service.createOrder(request);

        // Verify
        assertThat(result).isNotNull();
        assertThat(result.getProductId()).isEqualTo(1L);
    }

    @Test
    @DisplayName("createOrder: zero quantity — throws IllegalArgumentException")
    void createOrder_zeroQuantity_throwsIllegalArgumentException() {
        // Setup
        var service = new OrderService();
        var request = new OrderRequest(1L, 0);

        // Exercise & Verify
        org.junit.jupiter.api.Assertions.assertThrows(
            IllegalArgumentException.class,
            () -> service.createOrder(request)
        );
    }
}
```

### JUnit 5 — @Nested Classes for Grouping

`@Nested` inner classes group tests by method under test. They provide a describe-style hierarchy visible in IDE and build reports. Each nested class can have its own `@BeforeEach`/`@AfterEach`.

```java
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@DisplayName("OrderService")
class OrderServiceTest {

    private OrderService service;

    @BeforeEach
    void setUp() {
        // Setup (shared across all tests)
        service = new OrderService();
    }

    @Nested
    @DisplayName("createOrder")
    class CreateOrder {

        @Test
        void createOrder_validRequest_returnsOrder() {
            // Setup
            var request = new OrderRequest(1L, 2);

            // Exercise
            var result = service.createOrder(request);

            // Verify
            assertThat(result.getProductId()).isEqualTo(1L);
            assertThat(result.getQuantity()).isEqualTo(2);
        }

        @Test
        void createOrder_zeroQuantity_throwsIllegalArgumentException() {
            // Setup
            var request = new OrderRequest(1L, 0);

            // Exercise & Verify
            assertThatThrownBy(() -> service.createOrder(request))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("quantity must be positive");
        }
    }

    @Nested
    @DisplayName("cancelOrder")
    class CancelOrder {

        @Test
        void cancelOrder_existingOrder_setsStatusCancelled() {
            // Setup
            var order = service.createOrder(new OrderRequest(1L, 1));

            // Exercise
            service.cancelOrder(order.getId());

            // Verify
            var updated = service.findById(order.getId());
            assertThat(updated.getStatus()).isEqualTo(OrderStatus.CANCELLED);
        }

        @Test
        void cancelOrder_nonExistentId_throwsOrderNotFoundException() {
            // Setup
            long nonExistentId = 9999L;

            // Exercise & Verify
            assertThatThrownBy(() -> service.cancelOrder(nonExistentId))
                .isInstanceOf(OrderNotFoundException.class);
        }
    }
}
```

### JUnit 5 — @Tag for Test Categorization

`@Tag` marks tests for selective execution. Common tags: `"unit"`, `"integration"`, `"slow"`, `"smoke"`.

```java
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

@Tag("unit")
class OrderServiceTest {

    @Test
    @Tag("smoke")
    void createOrder_validRequest_returnsOrder() {
        // Setup
        var service = new OrderService();
        var request = new OrderRequest(1L, 2);

        // Exercise
        var result = service.createOrder(request);

        // Verify
        assertThat(result).isNotNull();
    }
}
```

### JUnit 5 — Test Instance Lifecycle

By default, JUnit 5 creates a new test instance per method (`PER_METHOD`). Use `@TestInstance(Lifecycle.PER_CLASS)` to share state and allow `@BeforeAll`/`@AfterAll` on non-static methods.

```java
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.TestInstance;

@TestInstance(TestInstance.Lifecycle.PER_CLASS)
class DatabaseRepositoryTest {

    private DatabaseConnection connection;

    @BeforeAll
    void connectToDatabase() {
        // Setup (runs once; non-static because of PER_CLASS)
        connection = DatabaseConnection.open("jdbc:h2:mem:test");
    }

    @Test
    void findById_existingId_returnsRecord() {
        // Setup
        var repo = new OrderRepository(connection);

        // Exercise
        var result = repo.findById(1L);

        // Verify
        assertThat(result).isPresent();
    }
}
```

### JUnit 5 — Conditional Execution

Skip tests based on OS, JRE version, or custom conditions without removing them.

```java
import org.junit.jupiter.api.condition.EnabledOnOs;
import org.junit.jupiter.api.condition.EnabledForJreRange;
import org.junit.jupiter.api.condition.OS;
import org.junit.jupiter.api.condition.JRE;

class PlatformSpecificTest {

    @Test
    @EnabledOnOs(OS.LINUX)
    void filePermissions_linuxPath_setsCorrectly() {
        // Setup
        var path = Path.of("/tmp/test-file.txt");

        // Exercise & Verify
        // Linux-specific file permission logic
    }

    @Test
    @EnabledForJreRange(min = JRE.JAVA_21)
    void virtualThread_highConcurrency_completesWithinBudget() {
        // Setup — virtual thread test requires Java 21+
        var executor = Executors.newVirtualThreadPerTaskExecutor();

        // Exercise
        var future = CompletableFuture.runAsync(() -> {
            // work
        }, executor);

        // Verify
        assertThat(future).isNotCompletedExceptionally();
    }
}
```

---

## 2. Mocking and Stubbing

### Mockito — @Mock, @InjectMocks, @ExtendWith

The canonical Mockito setup for JUnit 5. `MockitoExtension` initialises all `@Mock` fields and injects them into `@InjectMocks` via constructor, setter, or field injection.

```java
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class OrderServiceTest {

    @Mock
    private OrderRepository orderRepository;

    @Mock
    private EmailNotifier emailNotifier;

    @InjectMocks
    private OrderService orderService;

    @Test
    void createOrder_validRequest_savesAndReturnsOrder() {
        // Setup
        var request = new OrderRequest(1L, 2);
        var savedOrder = new Order(42L, 1L, 2);
        when(orderRepository.save(any(Order.class))).thenReturn(savedOrder);

        // Exercise
        var result = orderService.createOrder(request);

        // Verify
        assertThat(result.getId()).isEqualTo(42L);
        verify(orderRepository).save(any(Order.class));
    }

    @Test
    void createOrder_repositoryFailure_throwsServiceException() {
        // Setup
        var request = new OrderRequest(1L, 2);
        when(orderRepository.save(any())).thenThrow(new RuntimeException("db down"));

        // Exercise & Verify
        org.junit.jupiter.api.Assertions.assertThrows(
            ServiceException.class,
            () -> orderService.createOrder(request)
        );
    }
}
```

### Mockito — Stubbing Variants

```java
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class StubbingPatternsTest {

    @Mock
    private OrderRepository repo;

    @Test
    void stubbingVariants() {
        // Setup
        var order = new Order(1L, 1L, 2);

        // when/thenReturn — stub return value
        when(repo.findById(1L)).thenReturn(Optional.of(order));

        // when/thenReturn with multiple calls — different value each time
        when(repo.findById(2L))
            .thenReturn(Optional.empty())
            .thenReturn(Optional.of(order)); // second call returns order

        // when/thenThrow — stub exception
        when(repo.findById(-1L)).thenThrow(new IllegalArgumentException("invalid id"));

        // doReturn (avoids calling the real method on @Spy)
        doReturn(Optional.of(order)).when(repo).findById(99L);

        // doNothing — stub void methods
        doNothing().when(repo).delete(any(Order.class));

        // doAnswer — dynamic stub
        doAnswer(invocation -> {
            Order arg = invocation.getArgument(0);
            arg.setId(100L);
            return arg;
        }).when(repo).save(any(Order.class));

        // Exercise & Verify
        assertThat(repo.findById(1L)).isPresent();
    }
}
```

### Mockito — Verify and Argument Matchers

```java
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class VerifyPatternsTest {

    @Mock
    private OrderRepository repo;

    @Mock
    private AuditLogger auditLogger;

    @InjectMocks
    private OrderService orderService;

    @Test
    void createOrder_validRequest_logsAuditEvent() {
        // Setup
        when(repo.save(any())).thenAnswer(i -> i.getArgument(0));

        // Exercise
        orderService.createOrder(new OrderRequest(1L, 2));

        // Verify
        verify(repo).save(any(Order.class));                        // called exactly once
        verify(auditLogger).log(eq("ORDER_CREATED"), anyString()); // specific + wildcard
        verify(repo, times(1)).save(any());                         // explicit times
        verifyNoMoreInteractions(auditLogger);                      // no other calls
    }

    @Test
    void cancelOrder_nonExistentOrder_neverSaves() {
        // Setup
        when(repo.findById(999L)).thenReturn(Optional.empty());

        // Exercise (expect exception)
        assertThatThrownBy(() -> orderService.cancelOrder(999L))
            .isInstanceOf(OrderNotFoundException.class);

        // Verify
        verify(repo, never()).save(any()); // save must not be called
        verifyNoInteractions(auditLogger); // auditLogger untouched
    }
}
```

### Mockito — ArgumentCaptor

Capture arguments passed to mocks for detailed assertion.

```java
import org.mockito.ArgumentCaptor;
import org.mockito.Captor;

@ExtendWith(MockitoExtension.class)
class ArgumentCaptorTest {

    @Mock
    private EmailNotifier emailNotifier;

    @Captor
    private ArgumentCaptor<EmailMessage> emailCaptor;

    @InjectMocks
    private OrderService orderService;

    @Test
    void createOrder_validRequest_sendsConfirmationEmail() {
        // Setup
        when(orderRepository.save(any())).thenAnswer(i -> i.getArgument(0));
        var request = new OrderRequest(1L, 2);

        // Exercise
        orderService.createOrder(request);

        // Verify — capture the EmailMessage sent to the notifier
        verify(emailNotifier).send(emailCaptor.capture());
        EmailMessage sent = emailCaptor.getValue();
        assertThat(sent.getSubject()).contains("Order Confirmation");
        assertThat(sent.getTo()).isNotEmpty();
    }
}
```

### Mockito — @Spy and Partial Mocks

`@Spy` wraps a real instance. Unstubbed methods call through to the real implementation.

```java
import org.mockito.Spy;

@ExtendWith(MockitoExtension.class)
class SpyPatternTest {

    @Spy
    private OrderValidator validator = new OrderValidator(); // real instance

    @InjectMocks
    private OrderService orderService;

    @Test
    void createOrder_whenValidatorApprovesCustomRule_proceeds() {
        // Setup — override only the custom rule check, rest of validation is real
        doReturn(true).when(validator).isCustomRuleApproved(any());

        // Exercise
        var result = orderService.createOrder(new OrderRequest(1L, 2));

        // Verify
        assertThat(result).isNotNull();
        verify(validator).isCustomRuleApproved(any()); // was called
    }
}
```

### Mockito — MockedStatic (Legacy Code Only)

**Warning**: Use `MockedStatic` only for legacy code where refactoring to dependency injection is not feasible. Static method mocking couples tests to implementation details and makes refactoring harder. Prefer injecting collaborators via constructor.

```java
import org.mockito.MockedStatic;

import static org.mockito.Mockito.mockStatic;

class StaticMethodLegacyTest {

    @Test
    void processOrder_usesCurrentTimestamp_recordsCorrectTime() {
        // Setup — must be opened in try-with-resources to ensure closure
        try (MockedStatic<DateUtils> mockedDateUtils = mockStatic(DateUtils.class)) {
            var fixedTime = LocalDateTime.of(2024, 1, 15, 12, 0);
            mockedDateUtils.when(DateUtils::now).thenReturn(fixedTime);

            var processor = new OrderProcessor();

            // Exercise
            var result = processor.processOrder(new Order(1L));

            // Verify
            assertThat(result.getProcessedAt()).isEqualTo(fixedTime);
        }
        // Teardown: MockedStatic auto-restored on try-with-resources exit
    }
}
```

---

## 3. Assertion Patterns

### AssertJ — Fluent Assertions (Primary)

AssertJ provides a fluent chain API. Import `Assertions.assertThat` statically.

```java
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.within;

class AssertJPatternsTest {

    @Test
    void assertJStringPatterns() {
        // Setup
        String result = "Hello, World!";

        // Verify
        assertThat(result)
            .isNotNull()
            .isNotEmpty()
            .startsWith("Hello")
            .endsWith("!")
            .contains("World")
            .hasSize(13)
            .doesNotContain("foo");
    }

    @Test
    void assertJCollectionPatterns() {
        // Setup
        var orders = List.of(new Order(1L), new Order(2L), new Order(3L));

        // Verify
        assertThat(orders)
            .isNotEmpty()
            .hasSize(3)
            .extracting(Order::getId)
            .containsExactly(1L, 2L, 3L);

        assertThat(orders)
            .extracting(Order::getId)
            .containsExactlyInAnyOrder(3L, 1L, 2L); // order-independent
    }

    @Test
    void assertJNumericPatterns() {
        // Setup
        double result = 3.14159;

        // Verify
        assertThat(result)
            .isCloseTo(3.14, within(0.01))
            .isGreaterThan(0.0)
            .isLessThan(4.0)
            .isNotNegative();
    }

    @Test
    void assertJObjectPatterns() {
        // Setup
        var order = new Order(1L, 2L, 3);

        // Verify
        assertThat(order)
            .isNotNull()
            .isInstanceOf(Order.class)
            .hasFieldOrPropertyWithValue("id", 1L)
            .hasFieldOrPropertyWithValue("quantity", 3);
    }
}
```

### AssertJ — Soft Assertions

`SoftAssertions` collects all failures before reporting. Use when multiple independent conditions should all be checked.

```java
import org.assertj.core.api.SoftAssertions;
import org.assertj.core.api.junit.jupiter.SoftAssertionsExtension;

@ExtendWith(SoftAssertionsExtension.class)
class SoftAssertionTest {

    @Test
    void createOrder_validRequest_allFieldsPopulated(SoftAssertions softly) {
        // Setup
        var service = new OrderService();
        var request = new OrderRequest(1L, 2);

        // Exercise
        var result = service.createOrder(request);

        // Verify — all assertions run even if one fails
        softly.assertThat(result.getId()).isNotNull();
        softly.assertThat(result.getProductId()).isEqualTo(1L);
        softly.assertThat(result.getQuantity()).isEqualTo(2);
        softly.assertThat(result.getStatus()).isEqualTo(OrderStatus.CREATED);
        softly.assertThat(result.getCreatedAt()).isNotNull();
    }
}
```

### JUnit 5 — Built-in Assertions (Basic Cases)

Use JUnit 5 built-in `Assertions` for simple single-condition checks where AssertJ is not on the classpath or for assertAll grouping.

```java
import org.junit.jupiter.api.Assertions;

class JUnitBuiltInAssertionsTest {

    @Test
    void basicAssertions() {
        // Setup & Exercise
        int result = add(2, 3);

        // Verify
        Assertions.assertEquals(5, result);
        Assertions.assertTrue(result > 0);
        Assertions.assertNotNull(result);
    }

    @Test
    void assertAll_groupedAssertions_allReported() {
        // Setup & Exercise
        var order = new Order(1L, 2L, 3);

        // Verify — assertAll runs all lambdas and reports all failures
        Assertions.assertAll("order fields",
            () -> Assertions.assertEquals(1L, order.getId()),
            () -> Assertions.assertEquals(2L, order.getProductId()),
            () -> Assertions.assertEquals(3, order.getQuantity())
        );
    }

    @Test
    void assertTimeout_operationCompletesWithinDeadline() {
        // Verify — test fails if lambda exceeds 1 second
        Assertions.assertTimeout(
            Duration.ofSeconds(1),
            () -> {
                // Exercise
                var result = computeResult();
                Assertions.assertEquals(42, result);
            }
        );
    }
}
```

### Hamcrest — Alternative Matcher-Based Assertions

Hamcrest assertions are available as an alternative when a more compositional matching style is preferred.

```java
import static org.hamcrest.MatcherAssert.assertThat;
import static org.hamcrest.Matchers.*;

class HamcrestPatternsTest {

    @Test
    void hamcrestStringPatterns() {
        // Setup
        String result = "Hello, World!";

        // Verify
        assertThat(result, startsWith("Hello"));
        assertThat(result, containsString("World"));
        assertThat(result, hasLength(13));
    }

    @Test
    void hamcrestCollectionPatterns() {
        // Setup
        var ids = List.of(1L, 2L, 3L);

        // Verify
        assertThat(ids, hasSize(3));
        assertThat(ids, hasItem(2L));
        assertThat(ids, containsInAnyOrder(3L, 2L, 1L));
    }

    @Test
    void hamcrestComposedMatchers() {
        // Setup
        int score = 75;

        // Verify — composing matchers with allOf/anyOf
        assertThat(score, allOf(greaterThan(50), lessThan(100)));
        assertThat(score, anyOf(equalTo(75), equalTo(100)));
    }
}
```

---

## 4. Async Testing

### JUnit 5 — @Timeout Annotation

`@Timeout` fails the test if the annotated method does not complete within the specified duration. It can be placed on the test class to apply globally.

```java
import org.junit.jupiter.api.Timeout;

import java.util.concurrent.TimeUnit;

class AsyncTimeoutTest {

    @Test
    @Timeout(value = 5, unit = TimeUnit.SECONDS)
    void fetchOrder_validId_completesWithinFiveSeconds() throws Exception {
        // Setup
        var service = new AsyncOrderService();

        // Exercise
        Order result = service.fetchOrderAsync(1L).get();

        // Verify
        assertThat(result).isNotNull();
        assertThat(result.getId()).isEqualTo(1L);
    }
}
```

### CompletableFuture — Assertion Patterns

```java
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.TimeUnit;

class CompletableFutureTest {

    @Test
    void fetchOrder_validId_futureCompletesWithOrder() throws Exception {
        // Setup
        var service = new AsyncOrderService();

        // Exercise
        CompletableFuture<Order> future = service.fetchOrderAsync(1L);
        Order result = future.get(2, TimeUnit.SECONDS); // bounded wait

        // Verify
        assertThat(result).isNotNull();
        assertThat(result.getId()).isEqualTo(1L);
    }

    @Test
    void fetchOrder_invalidId_futureCompletesExceptionally() {
        // Setup
        var service = new AsyncOrderService();

        // Exercise
        CompletableFuture<Order> future = service.fetchOrderAsync(-1L);

        // Verify — AssertJ has direct CompletableFuture support
        assertThat(future).isCompletedExceptionally();
        assertThatThrownBy(future::join)
            .isInstanceOf(CompletionException.class)
            .hasCauseInstanceOf(OrderNotFoundException.class);
    }

    @Test
    void processOrderAsync_pipelineSucceeds_allStagesComplete() throws Exception {
        // Setup
        var service = new AsyncOrderService();
        var request = new OrderRequest(1L, 2);

        // Exercise — chain of async operations
        Order result = service.createOrderAsync(request)
            .thenApply(order -> service.enrichOrder(order))
            .thenCompose(order -> service.notifyAsync(order))
            .get(5, TimeUnit.SECONDS);

        // Verify
        assertThat(result.isNotified()).isTrue();
    }
}
```

### JUnit 5 — assertTimeout and assertTimeoutPreemptively

```java
import static org.junit.jupiter.api.Assertions.assertTimeout;
import static org.junit.jupiter.api.Assertions.assertTimeoutPreemptively;

class TimeoutAssertionTest {

    @Test
    void computation_withinDeadline_returnsResult() {
        // Verify — assertTimeout runs in same thread; allows ThreadLocal usage
        int result = assertTimeout(
            Duration.ofMillis(500),
            () -> performComputation() // Exercise inside lambda
        );

        assertThat(result).isEqualTo(42);
    }

    @Test
    void computation_preemptiveTimeout_abortsIfExceeded() {
        // Verify — assertTimeoutPreemptively runs in separate thread; aborts on timeout
        assertTimeoutPreemptively(
            Duration.ofMillis(200),
            () -> performFastOperation()
        );
    }
}
```

### Awaitility — Polling-Based Async Assertions (Optional)

Awaitility is recommended for testing async state changes where the completion time is non-deterministic (e.g., event-driven systems, message queues).

```java
import static org.awaitility.Awaitility.await;
import static org.hamcrest.Matchers.equalTo;

import java.util.concurrent.TimeUnit;

class AwaitilityTest {

    @Test
    void processMessage_asyncHandler_updatesOrderStatus() {
        // Setup
        var service = new OrderProcessingService();
        var orderId = service.submitOrder(new OrderRequest(1L, 2));

        // Exercise (async — method returns immediately)
        service.publishOrderEvent(orderId);

        // Verify — poll until condition met or timeout
        await()
            .atMost(5, TimeUnit.SECONDS)
            .pollInterval(100, TimeUnit.MILLISECONDS)
            .until(() -> service.getStatus(orderId), equalTo(OrderStatus.PROCESSING));
    }

    @Test
    void sendEmail_asyncNotifier_deliversWithinDeadline() {
        // Setup
        var notifier = new AsyncEmailNotifier();
        var capturedEmails = new java.util.concurrent.CopyOnWriteArrayList<String>();
        notifier.onSend(capturedEmails::add);

        // Exercise
        notifier.sendAsync("user@example.com");

        // Verify
        await()
            .atMost(3, TimeUnit.SECONDS)
            .untilAsserted(() ->
                assertThat(capturedEmails).contains("user@example.com")
            );
    }
}
```

### CountDownLatch — Thread Synchronization

```java
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;

class CountDownLatchTest {

    @Test
    void processOrders_concurrentRequests_allComplete() throws InterruptedException {
        // Setup
        int threadCount = 10;
        var latch = new CountDownLatch(threadCount);
        var executor = Executors.newFixedThreadPool(threadCount);
        var service = new OrderService();
        var results = new java.util.concurrent.CopyOnWriteArrayList<Order>();

        // Exercise
        for (int i = 0; i < threadCount; i++) {
            final long orderId = i + 1;
            executor.submit(() -> {
                try {
                    results.add(service.createOrder(new OrderRequest(orderId, 1)));
                } finally {
                    latch.countDown();
                }
            });
        }
        latch.await(10, TimeUnit.SECONDS);

        // Verify
        assertThat(results).hasSize(threadCount);

        // Teardown
        executor.shutdown();
    }
}
```

---

## 5. Error and Exception Testing

### JUnit 5 — assertThrows

`assertThrows` returns the exception for further assertion on its message, cause, and type.

```java
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;

class ExceptionTestingTest {

    @Test
    void createOrder_zeroQuantity_throwsIllegalArgumentException() {
        // Setup
        var service = new OrderService();
        var request = new OrderRequest(1L, 0);

        // Exercise & Verify
        var exception = assertThrows(
            IllegalArgumentException.class,
            () -> service.createOrder(request)
        );

        // Verify exception details
        assertThat(exception.getMessage()).contains("quantity must be positive");
    }

    @Test
    void createOrder_negativeQuantity_throwsIllegalArgumentWithCause() {
        // Setup
        var service = new OrderService();

        // Exercise & Verify
        var exception = assertThrows(
            ServiceException.class,
            () -> service.createOrder(new OrderRequest(1L, -5))
        );

        // Verify cause chain
        assertThat(exception.getCause()).isInstanceOf(IllegalArgumentException.class);
        assertThat(exception.getMessage()).contains("validation failed");
    }

    @Test
    void assertDoesNotThrow_validRequest_noException() {
        // Setup
        var service = new OrderService();
        var request = new OrderRequest(1L, 2);

        // Exercise & Verify — test fails if any exception is thrown
        assertDoesNotThrow(() -> service.createOrder(request));
    }

    @Test
    void assertThrowsExactly_onlyExactType_notSubclass() {
        // Setup
        var service = new OrderService();

        // Exercise & Verify — fails if a subclass is thrown
        org.junit.jupiter.api.Assertions.assertThrowsExactly(
            IllegalArgumentException.class,
            () -> service.createOrder(new OrderRequest(1L, 0))
        );
    }
}
```

### AssertJ — assertThatThrownBy and assertThatCode

AssertJ's exception assertions integrate with the fluent chain.

```java
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatExceptionOfType;

class AssertJExceptionTest {

    @Test
    void deleteOrder_nonExistentId_throwsOrderNotFoundException() {
        // Setup
        var service = new OrderService();
        long missingId = 9999L;

        // Exercise & Verify
        assertThatThrownBy(() -> service.deleteOrder(missingId))
            .isInstanceOf(OrderNotFoundException.class)
            .hasMessageContaining(String.valueOf(missingId))
            .hasNoCause();
    }

    @Test
    void deleteOrder_validId_noExceptionThrown() {
        // Setup
        var service = new OrderService();
        var order = service.createOrder(new OrderRequest(1L, 2));

        // Exercise & Verify — assertThatCode verifies the absence of exception
        assertThatCode(() -> service.deleteOrder(order.getId()))
            .doesNotThrowAnyException();
    }

    @Test
    void parseOrderId_nonNumericInput_throwsNumberFormatException() {
        // Setup & Exercise & Verify — fluent type-specific method
        assertThatExceptionOfType(NumberFormatException.class)
            .isThrownBy(() -> Long.parseLong("not-a-number"))
            .withMessageContaining("not-a-number");
    }
}
```

### Mockito — Exception Stubbing Patterns

```java
@ExtendWith(MockitoExtension.class)
class ExceptionStubbingTest {

    @Mock
    private OrderRepository repo;

    @InjectMocks
    private OrderService service;

    @Test
    void createOrder_repositoryThrowsRuntimeException_wrappedAsServiceException() {
        // Setup
        when(repo.save(any())).thenThrow(new RuntimeException("connection lost"));

        // Exercise & Verify
        assertThatThrownBy(() -> service.createOrder(new OrderRequest(1L, 1)))
            .isInstanceOf(ServiceException.class)
            .hasMessageContaining("failed to persist")
            .hasCauseInstanceOf(RuntimeException.class);
    }

    @Test
    void deleteOrder_repositoryVoidMethodThrows_propagatesException() {
        // Setup — doThrow for void methods
        doThrow(new DataIntegrityException("constraint violation"))
            .when(repo).delete(any(Order.class));

        // Exercise & Verify
        assertThatThrownBy(() -> service.deleteOrder(1L))
            .isInstanceOf(ServiceException.class);
    }

    @Test
    void findOrder_checkedExceptionThrown_handledCorrectly() {
        // Setup — stubbing a checked exception on a method that declares it
        when(repo.findByIdOrThrow(999L)).thenThrow(new OrderNotFoundException(999L));

        // Exercise & Verify
        assertThatThrownBy(() -> service.getOrder(999L))
            .isInstanceOf(OrderNotFoundException.class)
            .hasMessageContaining("999");
    }
}
```

### Custom Exception Hierarchy Testing

```java
class CustomExceptionTest {

    @Test
    void validate_multipleViolations_throwsValidationExceptionWithAllMessages() {
        // Setup
        var validator = new OrderValidator();
        var invalidRequest = new OrderRequest(-1L, -5);

        // Exercise
        var exception = assertThrows(
            ValidationException.class,
            () -> validator.validate(invalidRequest)
        );

        // Verify exception structure
        assertThat(exception.getViolations())
            .hasSize(2)
            .extracting(Violation::getField)
            .containsExactlyInAnyOrder("productId", "quantity");
    }
}
```

---

## 6. Setup and Teardown Lifecycle

### @BeforeEach / @AfterEach — Per-Test Lifecycle

`@BeforeEach` runs before each test method. `@AfterEach` runs after each test method, even if the test threw an exception.

```java
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;

class OrderServiceLifecycleTest {

    private OrderService service;
    private List<Long> createdOrderIds;

    @BeforeEach
    void setUp() {
        // Setup — fresh state for each test
        service = new OrderService(new InMemoryOrderRepository());
        createdOrderIds = new ArrayList<>();
    }

    @AfterEach
    void tearDown() {
        // Teardown — cleanup after each test
        createdOrderIds.forEach(service::forceDelete);
        createdOrderIds.clear();
    }

    @Test
    void createOrder_validRequest_returnsOrder() {
        // Setup (test-specific)
        var request = new OrderRequest(1L, 2);

        // Exercise
        var result = service.createOrder(request);
        createdOrderIds.add(result.getId()); // track for teardown

        // Verify
        assertThat(result).isNotNull();
    }
}
```

### @BeforeAll / @AfterAll — Per-Class Lifecycle

`@BeforeAll` and `@AfterAll` run once for the entire test class. Methods must be `static` (default `PER_METHOD` lifecycle) or the class must use `@TestInstance(PER_CLASS)`.

```java
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.TestInstance;

@TestInstance(TestInstance.Lifecycle.PER_CLASS)
class DatabaseIntegrationTest {

    private DatabaseConnection connection;
    private OrderRepository repository;

    @BeforeAll
    void openDatabaseConnection() {
        // Setup (once for all tests in this class)
        connection = DatabaseConnection.open("jdbc:h2:mem:test;DB_CLOSE_DELAY=-1");
        connection.runMigrations();
        repository = new JdbcOrderRepository(connection);
    }

    @AfterAll
    void closeDatabaseConnection() {
        // Teardown (once after all tests)
        connection.close();
    }

    @BeforeEach
    void beginTransaction() {
        connection.beginTransaction();
    }

    @AfterEach
    void rollbackTransaction() {
        connection.rollback(); // each test runs in isolation
    }

    @Test
    void save_validOrder_persistsToDatabase() {
        // Setup
        var order = new Order(1L, 2);

        // Exercise
        var saved = repository.save(order);

        // Verify
        assertThat(saved.getId()).isNotNull();
        assertThat(repository.findById(saved.getId())).isPresent();
    }
}
```

### @TempDir — Temporary File System

`@TempDir` injects a temporary directory that is deleted after the test (or test class). Works on fields and parameters.

```java
import org.junit.jupiter.api.io.TempDir;

import java.nio.file.Path;

class FileProcessorTest {

    @TempDir
    Path tempDir;

    @Test
    void processFile_validCsvFile_parsesAllRows(@TempDir Path dir) throws Exception {
        // Setup — create a temp file
        var csvFile = dir.resolve("orders.csv");
        Files.writeString(csvFile, "id,qty\n1,2\n3,4");
        var processor = new FileProcessor();

        // Exercise
        var results = processor.processCsv(csvFile);

        // Verify
        assertThat(results).hasSize(2);

        // Teardown: @TempDir auto-deletes after test
    }
}
```

### JUnit 5 Extension Model — Custom Lifecycle Hooks

Extensions implement `BeforeEachCallback`, `AfterEachCallback`, or `ParameterResolver` to encapsulate reusable lifecycle logic.

```java
import org.junit.jupiter.api.extension.AfterEachCallback;
import org.junit.jupiter.api.extension.BeforeEachCallback;
import org.junit.jupiter.api.extension.ExtensionContext;

// Custom extension that manages a test database transaction
class TransactionExtension implements BeforeEachCallback, AfterEachCallback {

    @Override
    public void beforeEach(ExtensionContext context) {
        TestTransaction.begin();
    }

    @Override
    public void afterEach(ExtensionContext context) {
        TestTransaction.rollback(); // always rollback after each test
    }
}

// Usage
@ExtendWith(TransactionExtension.class)
class OrderRepositoryTest {

    @Test
    void save_validOrder_persistsTransiently() {
        // Setup
        var repo = new OrderRepository(TestTransaction.current());
        var order = new Order(1L, 2);

        // Exercise
        repo.save(order);

        // Verify
        assertThat(repo.findById(order.getId())).isPresent();

        // Teardown: TransactionExtension rolls back automatically
    }
}
```

---

## 7. Parameterized Tests

### @ParameterizedTest — @ValueSource

`@ValueSource` provides a single argument from a literal array.

```java
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.junit.jupiter.params.provider.NullSource;
import org.junit.jupiter.params.provider.EmptySource;
import org.junit.jupiter.params.provider.NullAndEmptySource;

class EmailValidatorTest {

    @ParameterizedTest
    @ValueSource(strings = {"user@example.com", "admin@corp.io", "name.surname@domain.co.uk"})
    void isValid_validEmailFormats_returnsTrue(String email) {
        // Exercise
        boolean result = EmailValidator.isValid(email);

        // Verify
        assertThat(result).isTrue();
    }

    @ParameterizedTest
    @ValueSource(ints = {0, -1, -100, Integer.MIN_VALUE})
    void createOrder_nonPositiveQuantity_throwsIllegalArgumentException(int quantity) {
        // Setup
        var service = new OrderService();

        // Exercise & Verify
        assertThrows(
            IllegalArgumentException.class,
            () -> service.createOrder(new OrderRequest(1L, quantity))
        );
    }

    @ParameterizedTest
    @NullAndEmptySource
    void isValid_nullOrEmptyEmail_returnsFalse(String email) {
        // Exercise & Verify
        assertThat(EmailValidator.isValid(email)).isFalse();
    }
}
```

### @ParameterizedTest — @CsvSource and @CsvFileSource

`@CsvSource` provides multi-argument rows inline. `@CsvFileSource` reads from a CSV file under `src/test/resources`.

```java
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.CsvFileSource;

class OrderCalculatorTest {

    @ParameterizedTest(name = "calculateTotal({0} units @ {1}) = {2}")
    @CsvSource({
        "1,  10.0,  10.0",
        "2,  15.0,  30.0",
        "0,  10.0,   0.0",
        "5,   3.5,  17.5"
    })
    void calculateTotal_variousInputs_returnsCorrectTotal(
            int quantity, double price, double expectedTotal) {
        // Exercise
        double result = OrderCalculator.calculateTotal(quantity, price);

        // Verify
        assertThat(result).isCloseTo(expectedTotal, within(0.001));
    }

    @ParameterizedTest
    @CsvFileSource(resources = "/test-data/discount-scenarios.csv", numLinesToSkip = 1)
    void applyDiscount_variousScenarios_returnsDiscountedPrice(
            String tier, double originalPrice, double expectedFinalPrice) {
        // Exercise
        double result = PricingService.applyDiscount(tier, originalPrice);

        // Verify
        assertThat(result).isCloseTo(expectedFinalPrice, within(0.01));
    }
}
```

### @ParameterizedTest — @MethodSource

`@MethodSource` points to a static factory method returning `Stream<Arguments>`. Use for complex object arguments or test cases requiring programmatic construction.

```java
import org.junit.jupiter.params.provider.MethodSource;
import org.junit.jupiter.params.provider.Arguments;

import java.util.stream.Stream;

class OrderServiceParamTest {

    @ParameterizedTest(name = "{0}")
    @MethodSource("validOrderRequests")
    void createOrder_validRequests_returnsOrder(String scenario, OrderRequest request) {
        // Setup
        var service = new OrderService();

        // Exercise
        var result = service.createOrder(request);

        // Verify
        assertThat(result).isNotNull();
        assertThat(result.getProductId()).isEqualTo(request.getProductId());
    }

    static Stream<Arguments> validOrderRequests() {
        return Stream.of(
            Arguments.of("single unit", new OrderRequest(1L, 1)),
            Arguments.of("bulk order", new OrderRequest(2L, 100)),
            Arguments.of("max quantity", new OrderRequest(3L, Integer.MAX_VALUE))
        );
    }

    @ParameterizedTest
    @MethodSource  // convention: method name matches test method name
    void calculateDiscount_variousTiers_returnsExpected(
            String tier, double price, double expected) {
        // Exercise
        double result = DiscountCalculator.calculate(tier, price);

        // Verify
        assertThat(result).isCloseTo(expected, within(0.01));
    }

    static Stream<Arguments> calculateDiscount_variousTiers_returnsExpected() {
        return Stream.of(
            Arguments.of("SILVER", 100.0, 95.0),
            Arguments.of("GOLD", 100.0, 90.0),
            Arguments.of("PLATINUM", 100.0, 80.0)
        );
    }
}
```

### @ParameterizedTest — @EnumSource

`@EnumSource` supplies all or selected enum constants as test arguments.

```java
import org.junit.jupiter.params.provider.EnumSource;

class OrderStatusTest {

    @ParameterizedTest
    @EnumSource(OrderStatus.class) // all enum values
    void isTerminal_anyStatus_neverThrows(OrderStatus status) {
        // Exercise & Verify — must not throw for any status value
        assertThatCode(() -> OrderStatusService.isTerminal(status))
            .doesNotThrowAnyException();
    }

    @ParameterizedTest
    @EnumSource(value = OrderStatus.class, names = {"CANCELLED", "COMPLETED", "REFUNDED"})
    void isTerminal_terminalStatuses_returnsTrue(OrderStatus status) {
        // Exercise & Verify
        assertThat(OrderStatusService.isTerminal(status)).isTrue();
    }

    @ParameterizedTest
    @EnumSource(
        value = OrderStatus.class,
        names = {"CREATED", "PROCESSING"},
        mode = EnumSource.Mode.EXCLUDE
    )
    void isTerminal_nonActiveStatuses_returnsTrue(OrderStatus status) {
        // Exercise & Verify
        assertThat(OrderStatusService.isTerminal(status)).isTrue();
    }
}
```

### Custom ArgumentsProvider

For dynamic or externally-sourced test data, implement `ArgumentsProvider`.

```java
import org.junit.jupiter.api.extension.ExtensionContext;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.ArgumentsProvider;
import org.junit.jupiter.params.provider.ArgumentsSource;

import java.util.stream.Stream;

class RandomOrderProvider implements ArgumentsProvider {
    @Override
    public Stream<? extends Arguments> provideArguments(ExtensionContext context) {
        return IntStream.range(1, 6)
            .mapToObj(i -> Arguments.of(new OrderRequest((long) i, i * 2)));
    }
}

class DynamicParamTest {

    @ParameterizedTest
    @ArgumentsSource(RandomOrderProvider.class)
    void createOrder_dynamicData_allSucceed(OrderRequest request) {
        // Setup
        var service = new OrderService();

        // Exercise
        var result = service.createOrder(request);

        // Verify
        assertThat(result.getQuantity()).isEqualTo(request.getQuantity());
    }
}
```

---

## 8. File Naming and Location Conventions

### Test Class Naming

```
ClassName.java           →  ClassNameTest.java      (unit tests)
OrderService.java        →  OrderServiceTest.java
EmailValidator.java      →  EmailValidatorTest.java

Integration test variants (Maven Failsafe convention):
OrderService.java        →  OrderServiceIT.java     (integration tests)
OrderService.java        →  OrderServiceIntegrationTest.java
```

### Test Method Naming

```
Convention: methodName_scenario_expectedResult  (camelCase with underscore separators)

Examples:
  createOrder_validRequest_returnsOrder
  createOrder_zeroQuantity_throwsIllegalArgumentException
  cancelOrder_nonExistentId_throwsOrderNotFoundException
  calculateTotal_emptyCart_returnsZero
  findById_existingId_returnsOptionalWithOrder
  findById_missingId_returnsEmptyOptional
  processPayment_insufficientFunds_throwsPaymentException
  sendNotification_networkFailure_retriesThreeTimes
```

### Directory Structure — Maven Standard Layout

```
project-root/
├── pom.xml
└── src/
    ├── main/
    │   ├── java/
    │   │   └── com/myapp/
    │   │       ├── services/
    │   │       │   └── OrderService.java
    │   │       ├── repositories/
    │   │       │   └── OrderRepository.java
    │   │       └── validators/
    │   │           └── EmailValidator.java
    │   └── resources/
    │       └── application.properties
    └── test/
        ├── java/
        │   └── com/myapp/
        │       ├── services/
        │       │   └── OrderServiceTest.java      ← mirrors src/main/java
        │       ├── repositories/
        │       │   └── OrderRepositoryTest.java
        │       └── validators/
        │           └── EmailValidatorTest.java
        └── resources/
            ├── test-data/
            │   └── discount-scenarios.csv         ← @CsvFileSource data
            └── application-test.properties        ← test configuration

# Mapping rule: src/main/java/com/myapp/X.java → src/test/java/com/myapp/XTest.java
# Same package as source — allows access to package-private members
```

### Directory Structure — Gradle Standard Layout

```
project-root/
├── build.gradle (or build.gradle.kts)
└── src/
    ├── main/
    │   └── java/
    │       └── com/myapp/
    │           └── OrderService.java
    └── test/
        └── java/
            └── com/myapp/
                └── OrderServiceTest.java

# Gradle test task discovers all *Test.java files in src/test/java
# Integration tests may use a separate source set:
# src/integrationTest/java/com/myapp/OrderServiceIT.java
```

### @Tag Conventions for Test Categorization

```java
// Apply at class level for all tests in a class
@Tag("unit")
class OrderServiceTest { ... }

// Apply at method level for selective tagging
@Test
@Tag("smoke")
@Tag("unit")
void createOrder_validRequest_returnsOrder() { ... }
```

```
# Maven — run only unit tests
mvn test -Dgroups="unit"

# Maven — exclude slow tests
mvn test -DexcludedGroups="slow"

# Gradle — filter by tag
./gradlew test --tests "*" -Djunit.jupiter.execution.tag.include.pattern="unit"
```

### Test Resource Placement

```
src/test/resources/
├── application-test.properties          ← Spring Boot test profile
├── test-data/
│   ├── valid-order.json                 ← JSON fixture files
│   ├── invalid-orders.csv               ← @CsvFileSource data
│   └── order-schema.sql                 ← Database schema for tests
└── __files/                             ← WireMock stubs (if used)
    └── order-response.json
```

### Integration Test Separation

```java
// Maven Failsafe: classes ending in IT, ITCase, or starting with IT
@Tag("integration")
class OrderRepositoryIT {
    // Uses real database, slow, excluded from unit test phase
}

// Gradle: separate source set via build.gradle
// sourceSets {
//     integrationTest { java.srcDir 'src/integrationTest/java' }
// }
```

---

**Version**: 1.0.0
**Last Updated**: 2026-03-17
**Status**: Active

*This file is a satellite pattern library for Java (JUnit 5 + Mockito + AssertJ). It is part of the Phoenix OS testing memory layer established by Feature #342 (Story #356). Companion files: `patterns.md` (React/Jest), `patterns-python.md` (pytest/unittest), `patterns-go.md` (Go stdlib/testify).*
