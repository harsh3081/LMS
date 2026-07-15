# Pytest Mocking Patterns

This document defines mocking patterns for the Python testing ecosystem, covering unittest.mock, pytest-mock, monkeypatch, and responses.

## Framework: unittest.mock (built-in)

### 1. Function/Method Mocking
```python
from unittest.mock import Mock, MagicMock, patch

# Create mock
mock_fn = Mock()
mock_fn = MagicMock()  # Supports magic methods (__len__, __iter__, etc.)
mock_fn = Mock(return_value='result')

# Mock class method
with patch.object(MyClass, 'method', return_value='mocked'):
    result = instance.method()
```

### 2. Spy/Observation
```python
from unittest.mock import patch

# Spy with wraps (calls real implementation + records calls)
with patch.object(service, 'method', wraps=service.method) as spy:
    service.method('arg')
    spy.assert_called_once_with('arg')
```

### 3. Stub with Return Values
```python
mock_fn.return_value = 'static'
mock_fn.side_effect = ['first', 'second', 'third']  # Sequential returns
mock_fn.side_effect = lambda x: x * 2  # Computed return
```

### 4. Stub with Exceptions
```python
mock_fn.side_effect = ValueError('test error')
mock_fn.side_effect = [ValueError('first'), 'success']  # Error then success
```

### 5. Argument Matching
```python
from unittest.mock import call, ANY

mock_fn.assert_called_with('exact_arg')
mock_fn.assert_called_with(ANY)  # Any single argument
mock_fn.assert_called_with(ANY, key='value')

# Check call args manually
assert mock_fn.call_args == call('arg1', key='value')
assert mock_fn.call_args_list == [call('first'), call('second')]
```

### 6. Call Verification
```python
mock_fn.assert_called()
mock_fn.assert_called_once()
mock_fn.assert_called_with('arg')
mock_fn.assert_called_once_with('arg')
mock_fn.assert_not_called()
assert mock_fn.call_count == 3
```

### 7. Module/Import Mocking
```python
# Patch module-level function
with patch('myapp.module.function_name') as mock_fn:
    mock_fn.return_value = 'mocked'
    result = module.function_name()

# Decorator form
@patch('myapp.module.function_name')
def test_something(mock_fn):
    mock_fn.return_value = 'mocked'

# Patch where it's looked up, not where it's defined
@patch('myapp.views.requests.get')  # NOT 'requests.get'
def test_view(mock_get):
    pass
```

### 8. HTTP/API Mocking
```python
from unittest.mock import patch, Mock

@patch('myapp.service.requests.get')
def test_api_call(mock_get):
    mock_response = Mock()
    mock_response.status_code = 200
    mock_response.json.return_value = {'data': 'test'}
    mock_get.return_value = mock_response

    result = service.fetch_data()
    assert result == {'data': 'test'}
```

### 9. Timer/Date Mocking
```python
from unittest.mock import patch
from datetime import datetime

@patch('myapp.module.datetime')
def test_with_frozen_time(mock_datetime):
    mock_datetime.now.return_value = datetime(2026, 1, 1)
    mock_datetime.side_effect = lambda *a, **kw: datetime(*a, **kw)
```

### 10. Partial Mocking
```python
# Patch specific attribute while keeping rest real
with patch.object(service, 'external_call', return_value='mocked'):
    # Other methods on service are real
    result = service.process()  # Calls real process(), which calls mocked external_call()
```

## Framework: pytest-mock

### 1. Function/Method Mocking
```python
def test_function(mocker):
    mock_fn = mocker.patch('myapp.module.function_name')
    mock_fn.return_value = 'mocked'

    # mocker.patch.object for instance methods
    mocker.patch.object(MyClass, 'method', return_value='mocked')
```

### 2. Spy/Observation
```python
def test_spy(mocker):
    spy = mocker.spy(service, 'method')
    service.method('arg')
    spy.assert_called_once_with('arg')
```

### 3. Stub with Return Values
```python
def test_stub(mocker):
    mock_fn = mocker.patch('myapp.module.fetch_data')
    mock_fn.return_value = {'data': 'test'}
    mock_fn.side_effect = ['first', 'second']
```

### 4-6. (Same patterns as unittest.mock, using mocker fixture)

### 7. Module/Import Mocking
```python
def test_module_mock(mocker):
    # Auto-cleanup: no need for manual restore
    mock_module = mocker.patch('myapp.external_service')
    mock_module.call_api.return_value = {'status': 'ok'}
```

### Cleanup
```python
# pytest-mock auto-cleans after each test via fixture scope
# No manual cleanup needed — this is a key advantage over raw unittest.mock
```

## Framework: monkeypatch (pytest built-in)

### Environment & Attribute Patching
```python
def test_env(monkeypatch):
    monkeypatch.setenv('API_KEY', 'test-key')
    monkeypatch.delenv('SECRET', raising=False)

def test_attribute(monkeypatch):
    monkeypatch.setattr(module, 'CONSTANT', 42)
    monkeypatch.setattr('myapp.config.DEBUG', True)

def test_dict(monkeypatch):
    monkeypatch.setitem(config_dict, 'key', 'value')
    monkeypatch.delitem(config_dict, 'old_key', raising=False)
```

## Framework: responses (HTTP Mocking Layer)

### HTTP/API Mocking
```python
import responses

@responses.activate
def test_api_call():
    responses.add(
        responses.GET,
        'https://api.example.com/users',
        json=[{'id': 1, 'name': 'Test'}],
        status=200,
    )

    result = service.fetch_users()
    assert len(result) == 1
    assert responses.calls[0].request.url == 'https://api.example.com/users'

@responses.activate
def test_api_error():
    responses.add(
        responses.GET,
        'https://api.example.com/users',
        json={'error': 'Not Found'},
        status=404,
    )

    with pytest.raises(ApiError):
        service.fetch_users()
```

## Anti-Patterns

- **Don't mock the system under test** — only mock its dependencies
- **Don't over-mock** — if a dependency is simple and deterministic, use the real implementation
- **Patch where it's looked up** — `@patch('myapp.views.requests')` not `@patch('requests')`
- **Don't forget to start/stop patches** — prefer context managers or pytest-mock fixture for auto-cleanup
- **Don't assert on mock internals** — assert on observable behavior
- **Don't use MagicMock when Mock suffices** — MagicMock can hide attribute errors

---

**Version**: 1.0.0
**Last Updated**: 2026-03-18
**Status**: Active
