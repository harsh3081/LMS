# Python Test Patterns

This document defines test patterns for Python projects in Phoenix OS. It covers **pytest** (primary) and **unittest** (alternative) for all eight required content areas. All examples target Python 3.9+ and follow the four-phase pattern (Setup-Exercise-Verify-Teardown) and the `test_method_name_scenario_expected_result` naming convention (PEP 8 snake_case adaptation of the Phoenix OS `methodName_scenario_expectedResult` standard).

**Frameworks in scope**:
- pytest >= 7.0 (primary)
- pytest-mock >= 3.0 (thin wrapper around unittest.mock)
- pytest-asyncio >= 0.21
- unittest (stdlib — shown where API diverges from pytest)
- unittest.mock (stdlib)
- asyncio (stdlib)

---

## 1. Unit Test Structure

### pytest — Function-Based Tests

The simplest pytest form: a plain function prefixed with `test_`. No class or base type required.

```python
# tests/services/test_order_service.py
import pytest
from myapp.services.order_service import OrderService


def test_create_order_valid_request_returns_order():
    # Setup
    service = OrderService()
    request = {"product_id": 1, "quantity": 2}

    # Exercise
    result = service.create_order(request)

    # Verify
    assert result is not None
    assert result.product_id == 1
    assert result.quantity == 2
```

### pytest — Class-Based Tests

Group related tests under a `Test`-prefixed class. No inheritance required. Use when shared setup via fixtures or logical grouping improves readability.

```python
# tests/services/test_order_service.py
import pytest
from myapp.services.order_service import OrderService


class TestOrderService:
    """Tests for OrderService business logic."""

    def test_create_order_valid_request_returns_order(self):
        # Setup
        service = OrderService()
        request = {"product_id": 1, "quantity": 2}

        # Exercise
        result = service.create_order(request)

        # Verify
        assert result is not None
        assert result.product_id == 1
        assert result.quantity == 2

    def test_create_order_zero_quantity_raises_value_error(self):
        # Setup
        service = OrderService()
        request = {"product_id": 1, "quantity": 0}

        # Exercise & Verify (combined when exception is the exercise outcome)
        with pytest.raises(ValueError, match="quantity must be positive"):
            service.create_order(request)

    def test_create_order_missing_product_id_raises_key_error(self):
        # Setup
        service = OrderService()
        request = {"quantity": 2}

        # Exercise & Verify
        with pytest.raises(KeyError):
            service.create_order(request)
```

### pytest — Nested Class Style (Given-When-Then Grouping)

Use nested classes to express given/when/then or describe-style grouping within a single test file.

```python
class TestOrderServiceCalculateTotal:
    """Describe: OrderService.calculate_total"""

    class WhenCartIsEmpty:
        def test_calculate_total_empty_cart_returns_zero(self):
            # Setup
            service = OrderService()

            # Exercise
            result = service.calculate_total(items=[])

            # Verify
            assert result == 0.0

    class WhenCartHasItems:
        def test_calculate_total_single_item_returns_item_price(self):
            # Setup
            service = OrderService()
            items = [{"price": 10.0, "quantity": 1}]

            # Exercise
            result = service.calculate_total(items=items)

            # Verify
            assert result == 10.0

        def test_calculate_total_multiple_items_returns_sum(self):
            # Setup
            service = OrderService()
            items = [
                {"price": 10.0, "quantity": 2},
                {"price": 5.0, "quantity": 3},
            ]

            # Exercise
            result = service.calculate_total(items=items)

            # Verify
            assert result == 35.0
```

### unittest — TestCase Class

Use `unittest.TestCase` when you need `self.assert*` methods or are integrating with frameworks that require it.

```python
# tests/services/test_order_service.py
import unittest
from myapp.services.order_service import OrderService


class TestOrderService(unittest.TestCase):

    def test_create_order_valid_request_returns_order(self):
        # Setup
        service = OrderService()
        request = {"product_id": 1, "quantity": 2}

        # Exercise
        result = service.create_order(request)

        # Verify
        self.assertIsNotNone(result)
        self.assertEqual(result.product_id, 1)
        self.assertEqual(result.quantity, 2)

    def test_create_order_zero_quantity_raises_value_error(self):
        # Setup
        service = OrderService()
        request = {"product_id": 1, "quantity": 0}

        # Exercise & Verify
        with self.assertRaises(ValueError) as ctx:
            service.create_order(request)
        self.assertIn("quantity must be positive", str(ctx.exception))


if __name__ == "__main__":
    unittest.main()
```

---

## 2. Mocking and Stubbing

### pytest-mock — mocker Fixture (Primary Pattern)

`mocker` is injected as a pytest fixture. Mocks are automatically reset after each test — no cleanup needed.

```python
import pytest
from myapp.services.order_service import OrderService


class TestOrderServiceWithMocks:

    def test_create_order_valid_request_calls_repository_save(self, mocker):
        # Setup
        mock_repo = mocker.Mock()
        mock_repo.save.return_value = {"id": 42, "product_id": 1}
        service = OrderService(repository=mock_repo)
        request = {"product_id": 1, "quantity": 2}

        # Exercise
        service.create_order(request)

        # Verify
        mock_repo.save.assert_called_once()
        saved_order = mock_repo.save.call_args[0][0]
        assert saved_order["product_id"] == 1

    def test_create_order_repository_failure_raises_runtime_error(self, mocker):
        # Setup
        mock_repo = mocker.Mock()
        mock_repo.save.side_effect = ConnectionError("db down")
        service = OrderService(repository=mock_repo)

        # Exercise & Verify
        with pytest.raises(RuntimeError, match="failed to persist"):
            service.create_order({"product_id": 1, "quantity": 1})
```

### pytest-mock — mocker.patch (Module-Level Patching)

Use `mocker.patch` to replace a target by import path. The mock is automatically undone after the test.

```python
class TestNotificationService:

    def test_send_email_valid_recipient_calls_smtp_send(self, mocker):
        # Setup
        mock_smtp = mocker.patch("myapp.services.notification_service.smtp_client")
        mock_smtp.send.return_value = True
        service = NotificationService()

        # Exercise
        result = service.send_email("user@example.com", "Hello")

        # Verify
        mock_smtp.send.assert_called_once_with("user@example.com", "Hello")
        assert result is True

    def test_send_email_uses_configured_sender_address(self, mocker):
        # Setup
        mock_smtp = mocker.patch("myapp.services.notification_service.smtp_client")
        mocker.patch(
            "myapp.services.notification_service.settings",
            sender="noreply@myapp.com",
        )
        service = NotificationService()

        # Exercise
        service.send_email("user@example.com", "Hello")

        # Verify
        call_kwargs = mock_smtp.send.call_args.kwargs
        assert call_kwargs["from_addr"] == "noreply@myapp.com"
```

### pytest — monkeypatch Fixture

Use `monkeypatch` for overriding attributes, environment variables, dictionary entries, or system paths without the `unittest.mock.patch` overhead.

```python
class TestConfigLoader:

    def test_load_config_env_var_set_uses_env_value(self, monkeypatch):
        # Setup
        monkeypatch.setenv("APP_ENV", "production")

        # Exercise
        config = ConfigLoader.load()

        # Verify
        assert config.environment == "production"

    def test_load_config_missing_env_var_uses_default(self, monkeypatch):
        # Setup
        monkeypatch.delenv("APP_ENV", raising=False)

        # Exercise
        config = ConfigLoader.load()

        # Verify
        assert config.environment == "development"

    def test_process_uses_custom_working_directory(self, monkeypatch, tmp_path):
        # Setup
        monkeypatch.chdir(tmp_path)

        # Exercise
        result = FileProcessor.get_working_dir()

        # Verify
        assert result == str(tmp_path)
```

### unittest.mock — @patch Decorator

Use the `@patch` decorator when you want the mock injected as a test method argument. Apply multiple decorators bottom-up (innermost first in the argument list).

```python
from unittest.mock import patch, MagicMock
from myapp.services.notification_service import NotificationService


class TestNotificationServiceUnittest:

    @patch("myapp.services.notification_service.smtp_client")
    def test_send_email_valid_recipient_calls_smtp_send(self, mock_smtp):
        # Setup
        mock_smtp.send.return_value = True
        service = NotificationService()

        # Exercise
        result = service.send_email("user@example.com", "Hello")

        # Verify
        mock_smtp.send.assert_called_once_with("user@example.com", "Hello")
        assert result is True

    @patch("myapp.services.notification_service.logger")
    @patch("myapp.services.notification_service.smtp_client")
    def test_send_email_smtp_failure_logs_error(self, mock_smtp, mock_logger):
        # Setup — note: decorators apply bottom-up, args left-to-right
        mock_smtp.send.side_effect = ConnectionError("timeout")
        service = NotificationService()

        # Exercise
        service.send_email("user@example.com", "Hello")

        # Verify
        mock_logger.error.assert_called_once()
```

### unittest.mock — Context Manager (patch as with)

Use the context-manager form when you need the mock scoped to a block within a test, or when you want to avoid decorator stacking.

```python
from unittest.mock import patch


class TestNotificationServiceContextManager:

    def test_send_email_smtp_failure_returns_false(self):
        # Setup
        with patch("myapp.services.notification_service.smtp_client") as mock_smtp:
            mock_smtp.send.side_effect = ConnectionError("timeout")
            service = NotificationService()

            # Exercise
            result = service.send_email("user@example.com", "Hello")

            # Verify
            assert result is False
```

### unittest.mock — MagicMock and return_value / side_effect

```python
from unittest.mock import MagicMock


class TestOrderProcessor:

    def test_process_order_calls_payment_gateway(self):
        # Setup
        mock_gateway = MagicMock()
        mock_gateway.charge.return_value = {"status": "success", "transaction_id": "tx123"}
        processor = OrderProcessor(payment_gateway=mock_gateway)
        order = {"total": 50.0, "currency": "USD"}

        # Exercise
        processor.process(order)

        # Verify
        mock_gateway.charge.assert_called_once_with(amount=50.0, currency="USD")

    def test_process_order_gateway_error_raises_payment_error(self):
        # Setup
        mock_gateway = MagicMock()
        mock_gateway.charge.side_effect = [
            ConnectionError("first attempt"),
            ConnectionError("second attempt"),
        ]
        processor = OrderProcessor(payment_gateway=mock_gateway)

        # Exercise & Verify
        with pytest.raises(PaymentError):
            processor.process({"total": 50.0, "currency": "USD"})

    def test_process_order_records_call_arguments(self):
        # Setup
        mock_gateway = MagicMock()
        mock_gateway.charge.return_value = {"status": "success"}
        processor = OrderProcessor(payment_gateway=mock_gateway)

        # Exercise
        processor.process({"total": 99.99, "currency": "EUR"})

        # Verify
        mock_gateway.charge.assert_called_once_with(amount=99.99, currency="EUR")
        assert mock_gateway.charge.call_count == 1
```

### unittest.mock — patch.object and patch.dict

```python
from unittest.mock import patch


class TestCacheService:

    def test_get_value_cache_hit_returns_cached_value(self):
        # Setup
        cache_store = {"user:1": {"name": "Alice"}}
        with patch.dict("myapp.cache.CACHE_STORE", cache_store, clear=True):
            service = CacheService()

            # Exercise
            result = service.get("user:1")

            # Verify
            assert result == {"name": "Alice"}

    def test_send_notification_calls_instance_method(self):
        # Setup
        notifier = EmailNotifier()
        with patch.object(notifier, "send", return_value=True) as mock_send:
            service = AlertService(notifier=notifier)

            # Exercise
            service.trigger_alert("system_down")

            # Verify
            mock_send.assert_called_once()
```

---

## 3. Assertion Patterns

### pytest — Plain assert with Rich Diff

pytest rewrites `assert` statements to produce detailed failure messages. Prefer plain `assert` over helper functions.

```python
import pytest


class TestAssertionPatterns:

    def test_string_contains_substring_returns_true(self):
        # Setup
        result = "Hello, World!"

        # Verify
        assert result.startswith("Hello")
        assert "World" in result
        assert result.endswith("!")
        assert len(result) == 13

    def test_collection_has_expected_elements(self):
        # Setup
        orders = [{"id": 1, "status": "open"}, {"id": 2, "status": "closed"}]

        # Verify
        assert len(orders) == 2
        assert any(o["status"] == "open" for o in orders)
        assert all("id" in o for o in orders)
        assert {"id": 1, "status": "open"} in orders

    def test_dict_has_expected_keys_and_values(self):
        # Setup
        result = {"user_id": 42, "role": "admin", "active": True}

        # Verify
        assert "user_id" in result
        assert result["role"] == "admin"
        assert result["active"] is True
        assert result.get("missing_key") is None

    def test_none_and_boolean_assertions(self):
        # Setup
        value = get_optional_value()
        flag = check_condition()

        # Verify
        assert value is not None
        assert flag is True   # use `is True`, not `== True`, for booleans

    def test_object_identity_vs_equality(self):
        # Setup
        a = [1, 2, 3]
        b = [1, 2, 3]
        c = a

        # Verify
        assert a == b        # value equality
        assert a is not b    # different objects
        assert a is c        # same object (identity)
```

### pytest — Numeric and Float Assertions

```python
import pytest


class TestNumericAssertions:

    def test_calculate_tax_rate_returns_approximate_value(self):
        # Setup
        amount = 100.0
        rate = 0.0725

        # Exercise
        result = calculate_tax(amount, rate)

        # Verify — use pytest.approx for floats to avoid floating-point precision issues
        assert result == pytest.approx(7.25, abs=0.01)

    def test_calculate_discount_within_expected_range(self):
        # Setup & Exercise
        result = calculate_discount(original_price=100.0, discount_pct=10)

        # Verify
        assert 8.0 <= result <= 12.0   # range assertion

    def test_calculate_percentage_approx_with_relative_tolerance(self):
        # Setup & Exercise
        result = calculate_ratio(numerator=1, denominator=3)

        # Verify — rel=1e-3 means within 0.1% relative tolerance
        assert result == pytest.approx(0.333, rel=1e-3)
```

### unittest — self.assert* Methods

```python
import unittest


class TestAssertionPatternsUnittest(unittest.TestCase):

    def test_string_assertions(self):
        # Setup
        result = "Hello, World!"

        # Verify
        self.assertEqual(len(result), 13)
        self.assertIn("World", result)
        self.assertTrue(result.startswith("Hello"))
        self.assertFalse(result.startswith("Goodbye"))

    def test_none_and_boolean(self):
        # Setup
        value = get_optional_value()

        # Verify
        self.assertIsNotNone(value)
        self.assertIsNone(get_missing_value())
        self.assertTrue(is_valid(value))
        self.assertFalse(is_expired(value))

    def test_collection_assertions(self):
        # Setup
        result = [3, 1, 2]
        expected = [1, 2, 3]

        # Verify
        self.assertCountEqual(result, expected)   # same elements, any order
        self.assertEqual(sorted(result), expected)
        self.assertIn(2, result)
        self.assertNotIn(99, result)

    def test_numeric_float_assertions(self):
        # Setup
        result = calculate_tax(100.0, 0.0725)

        # Verify
        self.assertAlmostEqual(result, 7.25, places=2)

    def test_exception_message_content(self):
        # Setup
        service = OrderService()

        # Exercise & Verify
        with self.assertRaises(ValueError) as ctx:
            service.create_order({"product_id": 1, "quantity": -1})
        self.assertIn("quantity", str(ctx.exception))
        self.assertIn("positive", str(ctx.exception).lower())
```

---

## 4. Error and Exception Testing

### pytest — pytest.raises Context Manager

```python
import pytest
from myapp.services.order_service import OrderService
from myapp.exceptions import OrderValidationError, PaymentError


class TestOrderServiceExceptions:

    def test_create_order_zero_quantity_raises_value_error(self):
        # Setup
        service = OrderService()
        request = {"product_id": 1, "quantity": 0}

        # Exercise & Verify
        with pytest.raises(ValueError, match="quantity must be positive"):
            service.create_order(request)

    def test_create_order_negative_quantity_raises_value_error_with_details(self):
        # Setup
        service = OrderService()
        request = {"product_id": 1, "quantity": -5}

        # Exercise & Verify — match= accepts a regex pattern
        with pytest.raises(ValueError, match=r"quantity .* positive, got -5"):
            service.create_order(request)

    def test_submit_order_payment_declined_raises_payment_error(self):
        # Setup
        service = OrderService()
        order = create_test_order(total=9999.99)

        # Exercise & Verify — inspect the raised exception for additional attributes
        with pytest.raises(PaymentError) as exc_info:
            service.submit(order)
        assert exc_info.value.error_code == "DECLINED"
        assert exc_info.value.retryable is True

    def test_create_order_invalid_product_raises_correct_exception_type(self):
        # Setup
        service = OrderService()

        # Exercise & Verify — verify exact exception type, not a subtype
        with pytest.raises(OrderValidationError):
            service.create_order({"product_id": -1, "quantity": 1})
```

### pytest — pytest.warns (Warning Testing)

```python
import pytest


class TestDeprecatedApiWarnings:

    def test_legacy_method_emits_deprecation_warning(self):
        # Setup
        service = OrderService()

        # Exercise & Verify
        with pytest.warns(DeprecationWarning, match="use create_order instead"):
            service.create_order_v1(product_id=1, qty=2)

    def test_large_batch_emits_performance_warning(self):
        # Setup
        service = OrderService()
        large_batch = [{"product_id": i, "quantity": 1} for i in range(1001)]

        # Exercise & Verify
        with pytest.warns(UserWarning, match="batch size exceeds recommended limit"):
            service.create_bulk(large_batch)
```

### unittest — assertRaises and assertRaisesRegex

```python
import unittest
from myapp.services.order_service import OrderService


class TestOrderServiceExceptionsUnittest(unittest.TestCase):

    def test_create_order_zero_quantity_raises_value_error(self):
        # Setup
        service = OrderService()
        request = {"product_id": 1, "quantity": 0}

        # Exercise & Verify
        with self.assertRaises(ValueError):
            service.create_order(request)

    def test_create_order_zero_quantity_error_message_is_descriptive(self):
        # Setup
        service = OrderService()
        request = {"product_id": 1, "quantity": 0}

        # Exercise & Verify — inspect exception message
        with self.assertRaises(ValueError) as ctx:
            service.create_order(request)
        self.assertIn("quantity must be positive", str(ctx.exception))

    def test_create_order_negative_quantity_raises_value_error_matching_pattern(self):
        # Setup
        service = OrderService()
        request = {"product_id": 1, "quantity": -5}

        # Exercise & Verify — assertRaisesRegex is the unittest equivalent of match=
        self.assertRaisesRegex(
            ValueError,
            r"quantity .* positive",
            service.create_order,
            request,
        )

    def test_large_batch_emits_performance_warning(self):
        # Setup
        service = OrderService()
        large_batch = [{"product_id": i, "quantity": 1} for i in range(1001)]

        # Exercise & Verify
        with self.assertWarns(UserWarning):
            service.create_bulk(large_batch)
```

---

## 5. Async Testing

### pytest-asyncio — @pytest.mark.asyncio

Mark async test functions with `@pytest.mark.asyncio`. Configure `asyncio_mode = "auto"` in `pyproject.toml` to apply the mark globally and avoid per-test decoration.

```python
# pyproject.toml
# [tool.pytest.ini_options]
# asyncio_mode = "auto"

import pytest
from myapp.services.async_order_service import AsyncOrderService


class TestAsyncOrderService:

    @pytest.mark.asyncio
    async def test_fetch_order_valid_id_returns_order(self):
        # Setup
        service = AsyncOrderService()

        # Exercise
        result = await service.fetch_order(order_id=1)

        # Verify
        assert result is not None
        assert result["id"] == 1

    @pytest.mark.asyncio
    async def test_fetch_order_invalid_id_raises_lookup_error(self):
        # Setup
        service = AsyncOrderService()

        # Exercise & Verify
        with pytest.raises(LookupError, match="order 999 not found"):
            await service.fetch_order(order_id=999)

    @pytest.mark.asyncio
    async def test_submit_order_concurrent_requests_all_complete(self):
        # Setup
        import asyncio
        service = AsyncOrderService()
        requests = [{"product_id": i, "quantity": 1} for i in range(5)]

        # Exercise
        results = await asyncio.gather(
            *[service.submit(req) for req in requests]
        )

        # Verify
        assert len(results) == 5
        assert all(r["status"] == "accepted" for r in results)
```

### pytest-asyncio — Async Fixtures

```python
import pytest


@pytest.fixture
async def async_db_session():
    """Async fixture with yield-based teardown."""
    # Setup
    session = await create_async_db_session("test://localhost/testdb")
    yield session
    # Teardown
    await session.close()


@pytest.fixture
async def seeded_order(async_db_session):
    """Depends on another async fixture."""
    # Setup
    order = await async_db_session.insert({"product_id": 1, "quantity": 2})
    yield order
    # Teardown
    await async_db_session.delete(order["id"])


class TestAsyncOrderRepository:

    @pytest.mark.asyncio
    async def test_find_order_by_id_existing_order_returns_order(
        self, seeded_order, async_db_session
    ):
        # Setup — fixture already provides a seeded order
        repo = AsyncOrderRepository(async_db_session)

        # Exercise
        result = await repo.find_by_id(seeded_order["id"])

        # Verify
        assert result["id"] == seeded_order["id"]
        assert result["product_id"] == 1
```

### pytest-asyncio — Testing Async Context Managers

```python
import pytest


class TestAsyncContextManager:

    @pytest.mark.asyncio
    async def test_connection_pool_context_manager_releases_connection(self, mocker):
        # Setup
        mock_pool = mocker.AsyncMock()
        mock_conn = mocker.AsyncMock()
        mock_pool.__aenter__.return_value = mock_conn

        # Exercise
        async with mock_pool as conn:
            result = await conn.execute("SELECT 1")

        # Verify
        mock_pool.__aexit__.assert_called_once()
```

### unittest — IsolatedAsyncioTestCase (Python 3.8+)

Use `unittest.IsolatedAsyncioTestCase` when you cannot use pytest-asyncio. Each test method gets its own event loop.

```python
import unittest
from myapp.services.async_order_service import AsyncOrderService


class TestAsyncOrderServiceUnittest(unittest.IsolatedAsyncioTestCase):

    async def asyncSetUp(self):
        """Async setup — called before each test."""
        self.service = AsyncOrderService()

    async def asyncTearDown(self):
        """Async teardown — called after each test."""
        await self.service.close()

    async def test_fetch_order_valid_id_returns_order(self):
        # Exercise
        result = await self.service.fetch_order(order_id=1)

        # Verify
        self.assertIsNotNone(result)
        self.assertEqual(result["id"], 1)

    async def test_fetch_order_invalid_id_raises_lookup_error(self):
        # Exercise & Verify
        with self.assertRaises(LookupError):
            await self.service.fetch_order(order_id=999)
```

---

## 6. Setup and Teardown Lifecycle

### pytest — @pytest.fixture with yield

The `yield` statement divides a fixture into setup (before `yield`) and teardown (after `yield`). Teardown runs even if the test fails.

```python
import pytest
from myapp.database import Database
from myapp.repositories.order_repository import OrderRepository


@pytest.fixture
def db_connection():
    """Function-scoped: a new connection for each test."""
    # Setup
    conn = Database.connect("sqlite:///:memory:")
    conn.create_tables()
    yield conn
    # Teardown
    conn.drop_tables()
    conn.close()


@pytest.fixture(scope="module")
def module_db_connection():
    """Module-scoped: shared across all tests in the module."""
    # Setup
    conn = Database.connect("sqlite:///:memory:")
    conn.create_tables()
    yield conn
    # Teardown
    conn.close()


@pytest.fixture(scope="session")
def session_config():
    """Session-scoped: created once, shared across all tests in the run."""
    # Setup
    config = load_test_config("tests/config/test_settings.yaml")
    yield config
    # No teardown needed for read-only config


class TestOrderRepository:

    def test_save_order_valid_order_persists_to_database(self, db_connection):
        # Setup
        repo = OrderRepository(db_connection)
        order = {"product_id": 1, "quantity": 2, "status": "pending"}

        # Exercise
        saved = repo.save(order)

        # Verify
        found = repo.find_by_id(saved["id"])
        assert found["product_id"] == 1
        assert found["status"] == "pending"
```

### pytest — Fixture Dependency Injection

Fixtures can request other fixtures as parameters. pytest resolves the dependency graph automatically.

```python
@pytest.fixture
def db_transaction(db_connection):
    """Depends on db_connection fixture. Rolls back after each test."""
    # Setup
    tx = db_connection.begin_transaction()
    yield tx
    # Teardown
    tx.rollback()


@pytest.fixture
def order_repository(db_transaction):
    """Depends on db_transaction fixture."""
    return OrderRepository(db_transaction)


class TestOrderRepositoryWithFixtureChain:

    def test_save_order_rolls_back_on_test_completion(self, order_repository, db_transaction):
        # Exercise
        order_repository.save({"product_id": 1, "quantity": 1})

        # Verify
        assert order_repository.count() == 1
        # After the test, db_transaction rolls back — next test starts clean
```

### pytest — conftest.py (Shared Fixtures)

Place fixtures in `conftest.py` to share them across multiple test files in the same directory and its subdirectories. No import is needed — pytest discovers them automatically.

```python
# tests/conftest.py  — shared across all test files under tests/

import pytest
from myapp.database import Database


@pytest.fixture(scope="session")
def db_connection():
    """Available to all tests in the tests/ directory."""
    conn = Database.connect("sqlite:///:memory:")
    conn.create_tables()
    yield conn
    conn.close()


@pytest.fixture
def db_transaction(db_connection):
    """Available to all tests in the tests/ directory."""
    tx = db_connection.begin_transaction()
    yield tx
    tx.rollback()


# tests/services/conftest.py  — only available to tests/services/

@pytest.fixture
def order_service(db_transaction):
    """Scoped to tests/services/ only."""
    from myapp.services.order_service import OrderService
    return OrderService(repository=OrderRepository(db_transaction))
```

### pytest — autouse Fixtures

Mark a fixture `autouse=True` to apply it to every test in the scope automatically, without explicit parameter injection.

```python
@pytest.fixture(autouse=True)
def reset_application_cache():
    """Runs before and after every test in the module."""
    # Setup — (empty in this case)
    yield
    # Teardown
    ApplicationCache.clear()


@pytest.fixture(autouse=True)
def freeze_time_to_fixed_date(monkeypatch):
    """Every test sees the same fixed 'now'."""
    import datetime
    fixed_now = datetime.datetime(2026, 1, 1, 12, 0, 0)
    monkeypatch.setattr(datetime, "datetime", FakeDatetime(fixed_now))
    yield
```

### pytest — request.addfinalizer

Use `request.addfinalizer` to register teardown callbacks in fixtures that cannot use `yield` (e.g., generator-based fixtures or conditional teardown).

```python
@pytest.fixture
def temp_directory(request, tmp_path):
    # Setup
    work_dir = tmp_path / "work"
    work_dir.mkdir()

    def cleanup():
        import shutil
        shutil.rmtree(work_dir, ignore_errors=True)

    request.addfinalizer(cleanup)
    return work_dir
```

### unittest — setUp / tearDown (Per-Test)

```python
import unittest
from myapp.database import Database
from myapp.repositories.order_repository import OrderRepository


class TestOrderRepositoryUnittest(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        """Called once before all tests in this class."""
        cls.db = Database.connect("sqlite:///:memory:")
        cls.db.create_tables()

    @classmethod
    def tearDownClass(cls):
        """Called once after all tests in this class."""
        cls.db.drop_tables()
        cls.db.close()

    def setUp(self):
        """Called before each individual test method."""
        self.tx = self.db.begin_transaction()
        self.repo = OrderRepository(self.tx)

    def tearDown(self):
        """Called after each individual test method, even if the test fails."""
        self.tx.rollback()

    def test_save_order_valid_order_persists(self):
        # Setup
        order = {"product_id": 1, "quantity": 2, "status": "pending"}

        # Exercise
        saved = self.repo.save(order)

        # Verify
        found = self.repo.find_by_id(saved["id"])
        self.assertEqual(found["product_id"], 1)
```

### unittest — setUpModule / tearDownModule and addCleanup

```python
import unittest

_db = None


def setUpModule():
    """Called once before all tests in this module."""
    global _db
    _db = Database.connect("sqlite:///:memory:")
    _db.create_tables()


def tearDownModule():
    """Called once after all tests in this module."""
    _db.close()


class TestOrderRepository(unittest.TestCase):

    def setUp(self):
        self.tx = _db.begin_transaction()
        self.repo = OrderRepository(self.tx)
        # addCleanup is called even if setUp fails after this point
        self.addCleanup(self.tx.rollback)

    def test_save_order_valid_order_persists(self):
        # Setup
        order = {"product_id": 1, "quantity": 2}

        # Exercise
        saved = self.repo.save(order)

        # Verify
        self.assertIsNotNone(saved["id"])
```

---

## 7. Parameterized and Data-Driven Tests

### pytest — @pytest.mark.parametrize (Single Parameter)

```python
import pytest
from myapp.validators import EmailValidator


class TestEmailValidator:

    @pytest.mark.parametrize("email", [
        "user@example.com",
        "user.name+tag@domain.co.uk",
        "user@subdomain.example.org",
    ])
    def test_is_valid_valid_email_returns_true(self, email):
        # Exercise
        result = EmailValidator.is_valid(email)

        # Verify
        assert result is True

    @pytest.mark.parametrize("email", [
        "",
        "not-an-email",
        "@no-local-part.com",
        "missing-at-sign.com",
        "double@@at.com",
    ])
    def test_is_valid_invalid_email_returns_false(self, email):
        # Exercise
        result = EmailValidator.is_valid(email)

        # Verify
        assert result is False
```

### pytest — @pytest.mark.parametrize (Multiple Parameters with ids)

```python
import pytest


class TestOrderCalculator:

    @pytest.mark.parametrize("quantity,price,expected_total", [
        (1, 10.0, 10.0),
        (2, 15.0, 30.0),
        (0, 10.0, 0.0),
        (3, 0.0, 0.0),
    ], ids=[
        "single_item",
        "multiple_items",
        "zero_quantity",
        "zero_price",
    ])
    def test_calculate_total_various_inputs_returns_correct_total(
        self, quantity, price, expected_total
    ):
        # Exercise
        result = calculate_total(quantity, price)

        # Verify
        assert result == pytest.approx(expected_total)

    @pytest.mark.parametrize("status", ["pending", "processing", "shipped"])
    @pytest.mark.parametrize("region", ["US", "EU", "APAC"])
    def test_get_estimated_delivery_valid_status_and_region_returns_date(
        self, region, status
    ):
        """Stacked parametrize generates the Cartesian product: 9 test cases."""
        # Setup
        service = DeliveryEstimateService()

        # Exercise
        result = service.get_estimate(region=region, status=status)

        # Verify
        assert result is not None
```

### pytest — Indirect Parametrize (Fixture-Based Parameterization)

Use `indirect=True` to pass parametrize values through a fixture instead of directly to the test. Useful for parameterizing database states or complex objects.

```python
import pytest


@pytest.fixture
def order_in_status(request, db_transaction):
    """Creates an order with the requested status."""
    status = request.param
    order = {"product_id": 1, "quantity": 1, "status": status}
    return OrderRepository(db_transaction).save(order)


@pytest.mark.parametrize("order_in_status", ["pending", "confirmed"], indirect=True)
def test_cancel_order_cancellable_status_changes_to_cancelled(order_in_status, db_transaction):
    # Setup
    service = OrderService(OrderRepository(db_transaction))

    # Exercise
    service.cancel(order_id=order_in_status["id"])

    # Verify
    updated = OrderRepository(db_transaction).find_by_id(order_in_status["id"])
    assert updated["status"] == "cancelled"
```

### unittest — subTest (Inline Parameterization)

```python
import unittest
from myapp.validators import EmailValidator


class TestEmailValidatorUnittest(unittest.TestCase):

    def test_is_valid_various_inputs_returns_expected(self):
        test_cases = [
            ("user@example.com", True),
            ("user@domain.co.uk", True),
            ("", False),
            ("invalid-email", False),
            ("@no-local-part.com", False),
        ]

        for email, expected in test_cases:
            with self.subTest(email=email):
                # Exercise
                result = EmailValidator.is_valid(email)

                # Verify
                self.assertEqual(result, expected)

    def test_calculate_total_various_inputs_returns_correct_total(self):
        test_cases = [
            {"quantity": 1, "price": 10.0, "expected": 10.0},
            {"quantity": 2, "price": 15.0, "expected": 30.0},
            {"quantity": 0, "price": 10.0, "expected": 0.0},
        ]

        for case in test_cases:
            with self.subTest(**case):
                # Exercise
                result = calculate_total(case["quantity"], case["price"])

                # Verify
                self.assertAlmostEqual(result, case["expected"], places=2)
```

### unittest — @parameterized.expand (Third-Party Library)

The `parameterized` library generates distinct test methods from a parameter list, visible individually in test runners. Install with `pip install parameterized`.

```python
from parameterized import parameterized
import unittest
from myapp.validators import EmailValidator


class TestEmailValidatorParameterized(unittest.TestCase):

    @parameterized.expand([
        ("valid_standard", "user@example.com", True),
        ("valid_subdomain", "user@sub.domain.co.uk", True),
        ("invalid_empty", "", False),
        ("invalid_no_at", "nodomain", False),
    ])
    def test_is_valid_various_inputs_returns_expected(self, name, email, expected):
        # Exercise
        result = EmailValidator.is_valid(email)

        # Verify
        self.assertEqual(result, expected)
    # Generates: test_is_valid_0_valid_standard, test_is_valid_1_valid_subdomain, etc.
```

---

## 8. File Naming and Location Conventions

### pytest — File, Function, and Class Naming

```
# Test file names — pytest discovers files matching these patterns by default
test_order_service.py       # Preferred: test_ prefix
order_service_test.py       # Alternative: _test suffix

# Test function names — must start with test_
def test_create_order_valid_request_returns_order():  ...

# Test class names — must start with Test (no TestCase inheritance required)
class TestOrderService: ...
class TestEmailValidator: ...
```

### pytest — Directory Structure (Centralized tests/)

```
project-root/
├── src/
│   └── myapp/
│       ├── __init__.py
│       ├── services/
│       │   ├── __init__.py
│       │   └── order_service.py
│       └── validators/
│           ├── __init__.py
│           └── email_validator.py
├── tests/
│   ├── conftest.py              # Session/module-scoped shared fixtures
│   ├── __init__.py              # Makes tests a package (required for some import modes)
│   ├── services/
│   │   ├── conftest.py          # Service-scoped shared fixtures
│   │   ├── __init__.py
│   │   └── test_order_service.py
│   └── validators/
│       ├── __init__.py
│       └── test_email_validator.py
├── pyproject.toml               # Primary config location (pytest >= 6.0)
└── pytest.ini                   # Alternative: legacy pytest config
```

**Mapping Rule**: `src/myapp/services/order_service.py` → `tests/services/test_order_service.py`

### pytest — Configuration (pyproject.toml)

```toml
[tool.pytest.ini_options]
testpaths = ["tests"]
python_files = ["test_*.py"]
python_classes = ["Test*"]
python_functions = ["test_*"]
asyncio_mode = "auto"          # pytest-asyncio: auto-mark all async tests
addopts = [
    "--strict-markers",        # Fail on unregistered markers
    "-ra",                     # Show summary for all non-passing tests
]
markers = [
    "slow: marks tests as slow (use -m 'not slow' to skip)",
    "integration: marks tests requiring external services",
]
```

### pytest — Co-located Tests (Alternative)

Some projects place tests alongside source files. pytest discovers both patterns.

```
src/
└── myapp/
    ├── services/
    │   ├── order_service.py
    │   └── test_order_service.py    # Co-located: test file beside source
    └── validators/
        ├── email_validator.py
        └── test_email_validator.py
```

Use `conftest.py` at the project root to configure `pythonpath` so source imports resolve correctly:

```toml
# pyproject.toml
[tool.pytest.ini_options]
pythonpath = ["src"]
```

### unittest — Discovery Conventions

```
# Default discovery: python -m unittest discover
# Discovers test*.py files in the current directory tree

# Explicit flags
python -m unittest discover \
  -s tests \           # Start directory
  -p "test_*.py" \     # File pattern
  -t project-root      # Top-level directory (affects package imports)

# Run a specific test module
python -m unittest tests.services.test_order_service

# Run a specific test class
python -m unittest tests.services.test_order_service.TestOrderService

# Run a specific test method
python -m unittest tests.services.test_order_service.TestOrderService.test_create_order_valid_request_returns_order
```

### unittest — Naming Requirements

```
# File names — must match the discovery pattern (default: test*.py)
test_order_service.py          # Matches default test*.py
test_email_validator.py

# Class names — must inherit from unittest.TestCase
class TestOrderService(unittest.TestCase): ...

# Method names — must start with test
def test_create_order_valid_request_returns_order(self): ...
```

### Naming Convention Summary

| Element | pytest | unittest | Convention |
|---|---|---|---|
| Test file | `test_*.py` or `*_test.py` | `test*.py` | `test_{module_name}.py` |
| Test class | `Test*` (no base) | `Test*(TestCase)` | `Test{ClassName}` |
| Test method | `test_*` | `test_*` | `test_{method}_{scenario}_{expected}` |
| conftest | `conftest.py` | N/A | Place at appropriate directory level |

### Test Name Examples Applying Convention

```python
# Pattern: test_{method_name}_{scenario}_{expected_result}

# OrderService.create_order
test_create_order_valid_request_returns_order
test_create_order_zero_quantity_raises_value_error
test_create_order_missing_product_id_raises_key_error
test_create_order_duplicate_request_raises_conflict_error

# EmailValidator.is_valid
test_is_valid_standard_email_returns_true
test_is_valid_empty_string_returns_false
test_is_valid_missing_at_symbol_returns_false

# AsyncOrderService.fetch_order
test_fetch_order_existing_id_returns_order
test_fetch_order_nonexistent_id_raises_lookup_error
test_fetch_order_cancelled_order_raises_order_cancelled_error
```

---

**Version**: 1.0.0
**Last Updated**: 2026-03-17
**Status**: Active
**Stack**: Python 3.9+ (pytest >= 7.0, pytest-mock >= 3.0, pytest-asyncio >= 0.21, unittest stdlib)
