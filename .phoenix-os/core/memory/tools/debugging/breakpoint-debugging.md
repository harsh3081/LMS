# Breakpoint Debugging

Tool-specific implementation details for interactive debugging with breakpoints across different environments and platforms.

## Overview

This document provides platform and tool-specific techniques for **Breakpoint Debugging** analysis method. It complements the intent-driven methodology defined in `${config.memory.practices.bug-fixing.analysis-methods}`.

---

## Debugging Platforms

### VS Code Debugger

**Setup** (`.vscode/launch.json`):
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Current File",
      "program": "${file}",
      "skipFiles": ["<node_internals>/**"]
    },
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Tests",
      "program": "${workspaceFolder}/node_modules/jest/bin/jest",
      "args": ["--runInBand", "${fileBasename}"],
      "console": "integratedTerminal"
    }
  ]
}
```

**Setting Breakpoints**:
- Click left margin (gutter) next to line number
- Or press `F9` on line
- Red dot appears indicating breakpoint

**Running Debugger**:
1. Press `F5` or click "Run and Debug"
2. Select configuration
3. Execution pauses at breakpoints

**Debugger Controls**:
- `F5`: Continue to next breakpoint
- `F10`: Step Over (execute current line)
- `F11`: Step Into (enter function)
- `Shift+F11`: Step Out (exit function)
- `Shift+F5`: Stop debugging

**Viewing Variables**:
- **Variables Panel**: Shows local/global variables automatically
- **Watch Panel**: Add expressions to monitor
- **Hover**: Hover over variable to see value inline

**Debug Console**:
- Evaluate expressions while paused
- Execute commands
- Access: View → Debug Console

---

### IntelliJ IDEA / WebStorm

**Setting Breakpoints**:
- Click left gutter next to line number
- Or press `Ctrl+F8` (Windows) / `Cmd+F8` (Mac)

**Running Debugger**:
1. Right-click file → "Debug"
2. Or press `Shift+F9`
3. Select configuration

**Debugger Controls**:
- `F9`: Resume program
- `F8`: Step Over
- `F7`: Step Into
- `Shift+F8`: Step Out
- `Ctrl+F8`: Toggle breakpoint

**Advanced Features**:
- **Conditional Breakpoints**: Right-click breakpoint → Add condition
- **Logpoint**: Right-click breakpoint → More → Evaluate and log
- **Exception Breakpoints**: Add breakpoint for any exception

---

### Chrome DevTools (Browser)

**Opening DevTools**:
- `F12` or `Ctrl+Shift+I` (Windows)
- `Cmd+Option+I` (Mac)
- Right-click → "Inspect"

**Setting Breakpoints**:
1. Go to Sources tab
2. Open file from file tree
3. Click line number gutter

**Debugger Controls**:
- `F8` or Resume button: Continue
- `F10` or Step Over button: Step over
- `F11` or Step Into button: Step into
- `Shift+F11` or Step Out button: Step out

**Viewing Variables**:
- **Scope Panel**: Shows local/closure/global variables
- **Watch Panel**: Add watch expressions
- **Console**: Evaluate expressions while paused

**Conditional Breakpoints**:
1. Right-click line number
2. Select "Add conditional breakpoint"
3. Enter condition (e.g., `user === null`)

**Logpoints**:
1. Right-click line number
2. Select "Add logpoint"
3. Enter message (can include variables)

---

### Node.js Inspector (CLI)

**Starting Debugger**:
```bash
# Run with inspector
node --inspect script.js

# Run and break at start
node --inspect-brk script.js

# Specific port
node --inspect=9229 script.js
```

**Connecting**:
- Chrome: Go to `chrome://inspect`
- VS Code: Attach to Node Process debugger
- Command line: Use built-in REPL

**CLI Debugger Commands**:
```bash
# Start with built-in debugger
node inspect script.js

# Commands while debugging:
# c (cont): Continue execution
# n (next): Step over (next line)
# s (step): Step into function
# o (out): Step out of function
# pause: Pause execution
# watch('expr'): Watch expression
# repl: Enter REPL mode
# restart: Restart script
# kill: Kill script
# list(n): Show n lines of code
# backtrace: Show call stack
```

---

### Python Debugger (pdb)

**Starting Debugger**:
```python
# Add to code where you want to break
import pdb; pdb.set_trace()

# Or run script with debugger
python -m pdb script.py
```

**Debugger Commands**:
```
h (help)      : Show help
l (list)      : Show current code
n (next)      : Step over
s (step)      : Step into
r (return)    : Continue until function returns
c (continue)  : Continue execution
w (where)     : Show call stack
p variable    : Print variable value
pp variable   : Pretty-print variable
a (args)      : Print function arguments
b lineno      : Set breakpoint
cl [bpno]     : Clear breakpoint
q (quit)      : Quit debugger
```

**Python Debugger++ (pdb++)**:
```bash
# Install improved debugger
pip install pdbpp

# Use same as pdb but with better interface
import pdb; pdb.set_trace()
```

---

### Java Debugger (jdb)

**Starting Debugger**:
```bash
# Compile with debug info
javac -g MyClass.java

# Run with debugging enabled
java -Xdebug -agentlib:jdwp=transport=dt_socket,server=y,suspend=y,address=5005 MyClass

# Connect with jdb
jdb -attach 5005
```

**Debugger Commands**:
```
run             : Start execution
cont            : Continue execution
step            : Step into
next            : Step over
step up         : Step out
print expr      : Evaluate expression
dump expr       : Show object details
locals          : Show local variables
threads         : List threads
where           : Show call stack
stop at class:line : Set breakpoint
clear class:line    : Remove breakpoint
quit            : Exit debugger
```

---

### Ruby Debugger

**Using byebug**:
```ruby
# Install
gem install byebug

# Add to code
require 'byebug'
byebug
```

**Debugger Commands**:
```
c (continue)  : Continue execution
n (next)      : Step over
s (step)      : Step into
finish        : Continue until function returns
b line        : Set breakpoint
info break    : Show breakpoints
delete n      : Delete breakpoint
p variable    : Print variable
pp variable   : Pretty print
where         : Show call stack
quit          : Exit debugger
```

---

## Advanced Breakpoint Techniques

### Conditional Breakpoints

**Intent**: Only break when specific condition is true

**VS Code**:
1. Right-click breakpoint
2. Select "Edit Breakpoint" → "Expression"
3. Enter condition: `count > 100`

**Chrome DevTools**:
1. Right-click line number
2. "Add conditional breakpoint"
3. Enter condition: `user === null`

**IntelliJ**:
1. Right-click breakpoint
2. Enter condition in "Condition" field

**Why Use**:
- Break only in specific scenarios
- Skip common cases, focus on edge cases
- Avoid breaking in loops unless condition met

**Examples**:
```javascript
// Break only when user is null
user === null

// Break only on 100th iteration
i === 100

// Break only when error occurs
error !== null

// Break only for specific user
user.id === '12345'
```

---

### Logpoints (Non-breaking Breakpoints)

**Intent**: Log values without stopping execution

**VS Code**:
1. Right-click gutter
2. Select "Add Logpoint"
3. Enter message: `User: {user.name}, Count: {count}`

**Chrome DevTools**:
1. Right-click line number
2. "Add logpoint"
3. Enter message with variables

**Why Use**:
- Observe values without interrupting flow
- Log in production-like scenarios
- Faster than adding console.log()
- Easy to enable/disable

---

### Hit Count Breakpoints

**Intent**: Break only after Nth occurrence

**IntelliJ**:
1. Right-click breakpoint
2. Check "Condition"
3. Set "Pass count" to N

**Why Use**:
- Skip initial iterations
- Focus on later loop iterations
- Investigate behavior after warm-up

---

### Exception Breakpoints

**Intent**: Break whenever exception is thrown

**VS Code**:
1. Breakpoints panel → Add → Exception Breakpoints
2. Select exception types

**Chrome DevTools**:
1. Sources tab → right panel
2. Check "Pause on exceptions"
3. Optionally check "Pause on caught exceptions"

**IntelliJ**:
1. Run → View Breakpoints
2. Add → Java Exception Breakpoints
3. Enter exception class

**Why Use**:
- Catch exceptions at source
- Investigate exception state
- Find swallowed exceptions

---

### Function Breakpoints

**Intent**: Break when specific function is called

**Chrome DevTools**:
```javascript
// In Console
debug(functionName)

// To remove
undebug(functionName)
```

**VS Code**:
1. Breakpoints panel → Add → Function Breakpoint
2. Enter function name

**Why Use**:
- Break regardless of where function is called
- Useful when function called from many places
- Don't need to find function definition

---

## Remote Debugging

### Node.js Remote Debugging

**Start Remote App**:
```bash
# On remote server
node --inspect=0.0.0.0:9229 app.js
```

**Connect from VS Code**:
`.vscode/launch.json`:
```json
{
  "type": "node",
  "request": "attach",
  "name": "Attach to Remote",
  "address": "remote-server.com",
  "port": 9229,
  "localRoot": "${workspaceFolder}",
  "remoteRoot": "/app"
}
```

**Security**: Use SSH tunnel for production
```bash
ssh -L 9229:localhost:9229 user@remote-server.com
```

---

### Chrome Remote Debugging

**Start Chrome with Remote Debugging**:
```bash
# Windows
chrome.exe --remote-debugging-port=9222

# Mac
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --remote-debugging-port=9222

# Linux
google-chrome --remote-debugging-port=9222
```

**Connect**:
1. Open another Chrome instance
2. Go to `chrome://inspect`
3. Configure port and connect

---

### Docker Container Debugging

**Node.js in Docker**:

`docker-compose.yml`:
```yaml
version: '3'
services:
  app:
    image: node:18
    command: node --inspect=0.0.0.0:9229 app.js
    ports:
      - "9229:9229"
      - "3000:3000"
    volumes:
      - ./app:/app
```

**Attach with VS Code**:
```json
{
  "type": "node",
  "request": "attach",
  "name": "Docker Attach",
  "port": 9229,
  "restart": true,
  "remoteRoot": "/app"
}
```

---

## Debugger Best Practices

### 1. Strategic Breakpoint Placement

**Start Wide, Then Narrow**:
```
1. Set breakpoint at function entry
2. Observe inputs
3. Step through to identify problem area
4. Set new breakpoint at problem line
5. Remove initial breakpoint
6. Restart and iterate
```

**Key Locations**:
- Function entry points
- Before and after conditional branches
- Inside loop (with condition)
- Error handling blocks
- Return statements

---

### 2. Use Watch Expressions

**Add to Watch**:
- Complex expressions you check repeatedly
- Object properties that should/shouldn't change
- Array lengths
- State flags

**Examples**:
```javascript
user.isAuthenticated
items.length > 0
config.debug === true
lastError !== null
```

---

### 3. Inspect Call Stack

**Why**:
- Understand execution path
- See who called current function
- Trace data flow backwards

**How**:
- **VS Code**: Call Stack panel shows stack
- **Chrome**: Call Stack panel in debugger
- **CLI**: Use `backtrace` or `where` command

---

### 4. Modify Values During Debug

**VS Code / Chrome**:
- In Variables panel, click value to edit
- Or use Debug Console to assign new values

**Why**:
- Test different scenarios without code changes
- Bypass problematic state
- Verify hypothesis quickly

**Example**:
```javascript
// In debug console
user = { id: 123, name: 'Test' }
count = 0
```

---

### 5. Use REPL/Debug Console

**Access**:
- VS Code: Debug Console panel
- Chrome: Console tab while paused
- Node CLI: `repl` command

**Why**:
- Evaluate expressions in current context
- Call functions with different inputs
- Inspect complex object structures

---

## Context Adaptations

### Production Debugging

**Constraints**:
- Cannot pause execution (impacts users)
- Cannot connect debugger (security)

**Alternatives**:
- Use logging (see `${config.memory.tools.debugging.logging-patterns}`)
- Use APM tools (New Relic, Datadog)
- Use error tracking (Sentry, Rollbar)
- Enable debug mode temporarily (if safe)

---

### Performance-Critical Code

**Constraints**:
- Debugger slows execution significantly
- Timing-sensitive code behaves differently

**Alternatives**:
- Use logpoints (less overhead)
- Use conditional breakpoints (fewer pauses)
- Sample execution (break occasionally, not always)
- Use profiling tools instead

---

### Minified/Obfuscated Code

**Challenges**:
- Variable names are mangled
- Code is compressed (hard to read)
- Line numbers don't match source

**Solutions**:
- **Source Maps**: Use source maps to debug original code
  - VS Code/Chrome automatically load `.map` files
- **Un-minify**: Use un-minify tools in DevTools
- **Debug Non-minified**: Switch to development build

---

### Multi-threaded/Async Code

**Challenges**:
- Multiple threads executing
- Async operations complete out of order

**Techniques**:
- **Thread breakpoints**: Break in specific thread only
- **Async stack traces**: Enable async stack traces
  - Chrome: Settings → Enable async stack traces
- **Event breakpoints**: Break on specific events

---

## Troubleshooting

### Breakpoint Not Hit

**Possible Causes**:
1. Code not executed
2. Source map issues (debugging minified code)
3. Debugger not attached
4. Breakpoint in unreachable code

**Solutions**:
1. Add logging before breakpoint to confirm execution
2. Disable source maps temporarily
3. Verify debugger is attached (check indicator)
4. Check if condition prevents reaching line

---

### Cannot See Variable Values

**Possible Causes**:
1. Variable optimized away by compiler
2. Variable out of scope
3. Source map mismatch

**Solutions**:
1. Disable optimizations (e.g., `--no-optimize` flag)
2. Break earlier when variable is in scope
3. Use debug build instead of production build
4. Check source map configuration

---

### Debugger Too Slow

**Possible Causes**:
1. Many breakpoints
2. Expression evaluation on every step
3. Large objects being inspected

**Solutions**:
1. Disable unnecessary breakpoints
2. Remove complex watch expressions
3. Use conditional breakpoints
4. Limit object inspection depth

---

### Remote Debugging Connection Fails

**Possible Causes**:
1. Firewall blocking port
2. Wrong IP/port
3. Application not started with debug flag

**Solutions**:
1. Check firewall rules
2. Verify connection details
3. Confirm `--inspect` flag used
4. Use SSH tunnel for security

---

## See Also

- **Bug Analysis Methods**: `${config.memory.practices.bug-fixing.analysis-methods}` - Intent-driven analysis methodology
- **Logging Patterns**: `${config.memory.tools.debugging.logging-patterns}` - Logging techniques
- **Testing Standards**: `${config.memory.practices.best-practices.testing}` - Testing best practices

---

**Version**: 1.0.0
**Last Updated**: 2025-11-25
**Status**: Active
**Purpose**: Tool-specific implementations for breakpoint debugging
