# Logging Patterns for Debugging

Tool-specific implementation details for using logging and tracing to analyze bugs across different platforms and languages.

## Overview

This document provides practical logging patterns and techniques for **Logging and Tracing** analysis method. It complements the intent-driven methodology defined in `${config.memory.practices.bug-fixing.analysis-methods}`.

---

## Logging Fundamentals

### What to Log

**Essential Information**:
- **Function Entry**: Log when entering functions with parameters
- **Function Exit**: Log when exiting functions with return values
- **State Changes**: Log when state is modified
- **Decisions**: Log which branch of conditional was taken
- **External Calls**: Log API requests, database queries
- **Errors**: Log errors with full context

**Format Pattern**:
```
[LEVEL] [TIMESTAMP] [CONTEXT] Message {data}
```

---

## JavaScript/Node.js Logging

### Console Logging (Development)

**Basic Patterns**:
```javascript
// Function entry
function validateUser(user) {
  console.log('[validateUser] Entry:', { user });

  // Decision logging
  if (!user) {
    console.log('[validateUser] Validation failed: user is null/undefined');
    return false;
  }

  // Variable inspection
  console.log('[validateUser] Checking email:', user.email);

  // Function exit
  const result = user.email && user.email.includes('@');
  console.log('[validateUser] Exit:', { result });
  return result;
}
```

**Advanced Console Methods**:
```javascript
// Table format for arrays/objects
console.table([
  { name: 'Alice', age: 30 },
  { name: 'Bob', age: 25 }
]);

// Grouping related logs
console.group('User Validation');
console.log('Checking user:', user);
console.log('Email valid:', isValidEmail);
console.groupEnd();

// Timing operations
console.time('database-query');
await db.query('SELECT * FROM users');
console.timeEnd('database-query');

// Assert conditions
console.assert(user !== null, 'User should not be null');

// Stack traces
console.trace('Execution path to here');

// Count occurrences
console.count('api-call'); // api-call: 1
// ... later
console.count('api-call'); // api-call: 2
```

---

### Structured Logging (Production)

**Winston (Node.js)**:
```javascript
const winston = require('winston');

const logger = winston.createLogger({
  level: 'debug',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});

// Usage
logger.info('User validation started', {
  userId: user.id,
  email: user.email
});

logger.error('Validation failed', {
  userId: user.id,
  error: err.message,
  stack: err.stack
});
```

**Pino (High Performance)**:
```javascript
const pino = require('pino');
const logger = pino({
  level: 'debug',
  transport: {
    target: 'pino-pretty'
  }
});

// Usage
logger.info({ user: user.id }, 'Processing request');
logger.error({ err, userId: user.id }, 'Request failed');
```

---

### Debug Module (Conditional Logging)

**Setup**:
```javascript
const debug = require('debug');
const log = debug('app:auth');

// Usage
log('Validating user %s', user.id);
log('Token expires at %s', expiresAt);
```

**Enable**:
```bash
# Enable all debug logs
DEBUG=* node app.js

# Enable specific namespace
DEBUG=app:auth node app.js

# Enable multiple namespaces
DEBUG=app:auth,app:db node app.js

# Exclude namespaces
DEBUG=app:*,-app:db node app.js
```

---

## Python Logging

### Basic Logging

**Setup**:
```python
import logging

# Configure logging
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

logger = logging.getLogger(__name__)
```

**Usage**:
```python
def validate_user(user):
    logger.debug(f"validate_user entry: user={user}")

    if user is None:
        logger.warning("User is None, validation failed")
        return False

    logger.debug(f"Checking email: {user.get('email')}")

    result = '@' in user.get('email', '')
    logger.debug(f"validate_user exit: result={result}")
    return result
```

**Log Levels**:
```python
logger.debug('Detailed information for diagnosing')
logger.info('General informational messages')
logger.warning('Warning messages')
logger.error('Error messages')
logger.critical('Critical error messages')
```

---

### Advanced Python Logging

**Multiple Handlers**:
```python
import logging
from logging.handlers import RotatingFileHandler

logger = logging.getLogger(__name__)
logger.setLevel(logging.DEBUG)

# Console handler
console = logging.StreamHandler()
console.setLevel(logging.INFO)
console.setFormatter(logging.Formatter('%(levelname)s - %(message)s'))

# File handler with rotation
file_handler = RotatingFileHandler(
    'app.log',
    maxBytes=10485760,  # 10MB
    backupCount=5
)
file_handler.setLevel(logging.DEBUG)
file_handler.setFormatter(logging.Formatter(
    '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
))

logger.addHandler(console)
logger.addHandler(file_handler)
```

**Structured Logging (python-json-logger)**:
```python
from pythonjsonlogger import jsonlogger

logHandler = logging.StreamHandler()
formatter = jsonlogger.JsonFormatter(
    '%(asctime)s %(name)s %(levelname)s %(message)s'
)
logHandler.setFormatter(formatter)
logger.addHandler(logHandler)

# Usage
logger.info('User action', extra={
    'user_id': user.id,
    'action': 'login',
    'ip': request.remote_addr
})
```

---

## Java Logging

### SLF4J with Logback

**Setup (logback.xml)**:
```xml
<configuration>
  <appender name="STDOUT" class="ch.qos.logback.core.ConsoleAppender">
    <encoder>
      <pattern>%d{HH:mm:ss.SSS} [%thread] %-5level %logger{36} - %msg%n</pattern>
    </encoder>
  </appender>

  <root level="debug">
    <appender-ref ref="STDOUT" />
  </root>
</configuration>
```

**Usage**:
```java
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class UserValidator {
    private static final Logger logger = LoggerFactory.getLogger(UserValidator.class);

    public boolean validateUser(User user) {
        logger.debug("validateUser entry: user={}", user);

        if (user == null) {
            logger.warn("User is null, validation failed");
            return false;
        }

        logger.debug("Checking email: {}", user.getEmail());

        boolean result = user.getEmail() != null && user.getEmail().contains("@");
        logger.debug("validateUser exit: result={}", result);
        return result;
    }
}
```

---

### Log4j2

**Configuration (log4j2.xml)**:
```xml
<?xml version="1.0" encoding="UTF-8"?>
<Configuration status="WARN">
  <Appenders>
    <Console name="Console" target="SYSTEM_OUT">
      <PatternLayout pattern="%d{HH:mm:ss.SSS} [%t] %-5level %logger{36} - %msg%n"/>
    </Console>
  </Appenders>
  <Loggers>
    <Root level="debug">
      <AppenderRef ref="Console"/>
    </Root>
  </Loggers>
</Configuration>
```

---

## Browser Console Logging

### Chrome DevTools Filtering

**Filter by Level**:
```javascript
console.log('Info message');    // Blue
console.warn('Warning');        // Yellow
console.error('Error');         // Red
console.debug('Debug details'); // Gray
```

**Filter in DevTools**:
- Click filter dropdown → Select levels to show
- Use filter text box: `"user"` shows logs containing "user"
- Regular expressions: `/user-\d+/`

---

### Conditional Logging

```javascript
// Only log in development
if (process.env.NODE_ENV === 'development') {
  console.log('Debug info:', data);
}

// Log only for specific user
if (user.id === DEBUG_USER_ID) {
  console.log('Debug for user:', user);
}

// Log only when condition met
if (count > 100) {
  console.log('Count exceeded threshold:', count);
}
```

---

## Strategic Logging Patterns

### Pattern 1: Function Boundary Logging

**Intent**: Track function entry/exit and parameters/results

```javascript
function processOrder(order) {
  const logContext = { orderId: order.id };
  logger.info('processOrder entry', logContext);

  try {
    // ... processing
    const result = { success: true, orderId: order.id };
    logger.info('processOrder exit', { ...logContext, result });
    return result;
  } catch (error) {
    logger.error('processOrder error', { ...logContext, error: error.message });
    throw error;
  }
}
```

---

### Pattern 2: State Change Logging

**Intent**: Track when and how state changes

```javascript
class ShoppingCart {
  constructor() {
    this.items = [];
    logger.debug('ShoppingCart initialized', { items: this.items });
  }

  addItem(item) {
    const before = this.items.length;
    this.items.push(item);
    const after = this.items.length;

    logger.info('Item added to cart', {
      itemId: item.id,
      beforeCount: before,
      afterCount: after
    });
  }

  removeItem(itemId) {
    const before = this.items.length;
    this.items = this.items.filter(item => item.id !== itemId);
    const after = this.items.length;

    logger.info('Item removed from cart', {
      itemId,
      beforeCount: before,
      afterCount: after,
      wasRemoved: before !== after
    });
  }
}
```

---

### Pattern 3: Decision Path Logging

**Intent**: Track which conditional branches are taken

```javascript
function determineDiscount(user, order) {
  logger.debug('Calculating discount', {
    userId: user.id,
    orderTotal: order.total
  });

  if (user.isPremium) {
    logger.info('Premium discount applied', { discount: 0.20 });
    return 0.20;
  }

  if (order.total > 100) {
    logger.info('Large order discount applied', { discount: 0.10 });
    return 0.10;
  }

  if (user.firstOrder) {
    logger.info('First order discount applied', { discount: 0.05 });
    return 0.05;
  }

  logger.info('No discount applied');
  return 0;
}
```

---

### Pattern 4: Loop Iteration Logging

**Intent**: Track loop execution, especially first/last iterations

```javascript
function processItems(items) {
  logger.info('Processing items', { count: items.length });

  items.forEach((item, index) => {
    const isFirst = index === 0;
    const isLast = index === items.length - 1;

    if (isFirst || isLast || index % 100 === 0) {
      logger.debug('Processing item', {
        index,
        itemId: item.id,
        isFirst,
        isLast
      });
    }

    // Process item...
  });

  logger.info('Items processed', { count: items.length });
}
```

---

### Pattern 5: Async Operation Logging

**Intent**: Track async operations with correlation IDs

```javascript
async function fetchUserData(userId) {
  const correlationId = generateId();
  const context = { userId, correlationId };

  logger.info('Fetching user data', context);

  try {
    const user = await api.getUser(userId);
    logger.info('User data fetched', { ...context, user: user.id });

    const orders = await api.getUserOrders(userId);
    logger.info('User orders fetched', { ...context, orderCount: orders.length });

    return { user, orders };
  } catch (error) {
    logger.error('Failed to fetch user data', {
      ...context,
      error: error.message
    });
    throw error;
  }
}
```

---

### Pattern 6: Race Condition Detection

**Intent**: Add timestamps to detect timing issues

```javascript
async function checkRaceCondition() {
  const startTime = Date.now();

  logger.info('Starting async operations', { startTime });

  const operation1 = asyncOp1().then(result => {
    const time = Date.now();
    logger.info('Operation 1 complete', { time, duration: time - startTime, result });
    return result;
  });

  const operation2 = asyncOp2().then(result => {
    const time = Date.now();
    logger.info('Operation 2 complete', { time, duration: time - startTime, result });
    return result;
  });

  const results = await Promise.all([operation1, operation2]);
  const endTime = Date.now();

  logger.info('All operations complete', {
    endTime,
    totalDuration: endTime - startTime
  });

  return results;
}
```

---

## Context-Specific Logging

### Development Environment

**Characteristics**:
- Verbose logging acceptable
- Include all debug information
- Log to console for immediate visibility

**Configuration**:
```javascript
const logger = createLogger({
  level: 'debug',
  format: format.combine(
    format.colorize(),
    format.simple()
  ),
  transports: [new transports.Console()]
});
```

---

### Production Environment

**Characteristics**:
- Minimal logging (performance)
- Structured format (parsing)
- Include context for correlation
- Log to files/services (not console)

**Configuration**:
```javascript
const logger = createLogger({
  level: 'info',
  format: format.json(),
  transports: [
    new transports.File({ filename: 'error.log', level: 'error' }),
    new transports.File({ filename: 'combined.log' })
  ]
});
```

**What to Log in Production**:
- ✅ Errors with full context
- ✅ Important state changes
- ✅ External API calls (with duration)
- ✅ User actions (audit trail)
- ❌ Debug-level details
- ❌ Sensitive information (passwords, tokens)
- ❌ High-frequency events (every request)

---

### Debugging Specific Issue

**Characteristics**:
- Temporary detailed logging
- Focus on suspect area
- Remove after fix

**Pattern**:
```javascript
// Temporary debug logging
const DEBUG_ISSUE_123 = process.env.DEBUG_ISSUE_123 === 'true';

function suspectFunction(data) {
  if (DEBUG_ISSUE_123) {
    console.log('[DEBUG-123] Function entry:', data);
  }

  // ... function logic

  if (DEBUG_ISSUE_123) {
    console.log('[DEBUG-123] Intermediate state:', state);
  }

  // ... more logic

  if (DEBUG_ISSUE_123) {
    console.log('[DEBUG-123] Function exit:', result);
  }
}
```

**Enable**:
```bash
DEBUG_ISSUE_123=true node app.js
```

---

## Log Analysis Techniques

### Pattern Matching

**Search for specific patterns**:
```bash
# Find all errors
grep "ERROR" app.log

# Find user-specific logs
grep "userId=12345" app.log

# Find logs in time range
grep "2023-11-25 14:" app.log

# Count occurrences
grep -c "API call failed" app.log
```

---

### Timeline Construction

**Reconstruct execution timeline**:
```bash
# Sort by timestamp
sort app.log | less

# Extract timestamps and key events
grep "processOrder" app.log | awk '{print $1, $2, $NF}'

# Find gap between events
grep "processOrder\|orderComplete" app.log
```

---

### Correlation ID Tracking

**Follow request through system**:
```bash
# Extract all logs for specific correlation ID
grep "correlationId=abc123" app.log

# Across multiple log files
grep -r "correlationId=abc123" logs/

# Track timing
grep "correlationId=abc123" app.log | grep -E "start|complete"
```

---

## Performance Considerations

### Log Sampling

**Intent**: Log only percentage of events for high-frequency operations

```javascript
const SAMPLE_RATE = 0.01; // 1%

function highFrequencyOperation() {
  if (Math.random() < SAMPLE_RATE) {
    logger.debug('High frequency operation sampled');
  }

  // ... operation
}
```

---

### Conditional Compilation

**Intent**: Remove debug logs in production builds

```javascript
// Development
if (__DEV__) {
  console.log('Debug info:', data);
}

// Build time replacement (webpack, etc.)
// __DEV__ becomes false in production
// Dead code elimination removes the block
```

---

### Lazy Evaluation

**Intent**: Avoid expensive logging when log level is disabled

```javascript
// Bad: String constructed even if debug disabled
logger.debug('User data: ' + JSON.stringify(largeObject));

// Good: Function only called if debug enabled
logger.debug(() => `User data: ${JSON.stringify(largeObject)}`);
```

---

## Best Practices

### ✅ Do

- Use structured logging (JSON) in production
- Include context (user ID, request ID, etc.)
- Log errors with full stack traces
- Use appropriate log levels
- Add correlation IDs for distributed tracing
- Log state before and after changes
- Include timestamps for timing analysis

---

### ❌ Don't

- Log sensitive information (passwords, tokens, PII)
- Log at high frequency without sampling
- Use string concatenation for log messages
- Log without context (who, what, when, where)
- Leave debug logging in production code
- Swallow exceptions without logging
- Log inside tight loops without conditions

---

## Security Considerations

### Redact Sensitive Data

```javascript
function sanitizeForLogging(user) {
  return {
    id: user.id,
    email: maskEmail(user.email),
    // Never log password
  };
}

function maskEmail(email) {
  const [name, domain] = email.split('@');
  return `${name[0]}***@${domain}`;
}

logger.info('User logged in', sanitizeForLogging(user));
```

---

### Log Injection Prevention

```javascript
// Bad: User input in log message
logger.info(`User searched for: ${userInput}`);

// Good: User input as structured data
logger.info('User search', { query: userInput });

// Good: Sanitize if string format required
logger.info(`User searched for: ${sanitize(userInput)}`);
```

---

## See Also

- **Bug Analysis Methods**: `${config.memory.practices.bug-fixing.analysis-methods}` - Intent-driven analysis methodology
- **Breakpoint Debugging**: `${config.memory.tools.debugging.breakpoint-debugging}` - Interactive debugging techniques
- **Testing Standards**: `${config.memory.practices.best-practices.testing}` - Testing best practices

---

**Version**: 1.0.0
**Last Updated**: 2025-11-25
**Status**: Active
**Purpose**: Tool-specific implementations for logging and tracing
