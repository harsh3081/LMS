# Python Tech Stack Knowledge

## Overview

Core Python language knowledge. This file covers language conventions, idioms, and standard library usage. It contains principles, reasoning, and decision guidance — not step-by-step instructions.

**Memory Type**: Long-term memory (LT) — Tech stack guidance for agents.

**Role**: Agents read this memory for Python language conventions, patterns, and decision guidance. Loaded via tech stack tags in `spec.md`.

**Memory Path**: `${config.memory.tech-stack}/python.md`

**Consuming Agents**: `phoenix:engineering-manager` (tags), `phoenix:tech-lead` (primary), `phoenix:developer` (implementation), `phoenix:bug-analyzer` (analysis)

**Context Triggers**: Loaded when `spec.md` contains a `python` tech stack tag.

**Related knowledge**: `fastapi.md` for FastAPI projects, `../testing/patterns-python.md` for pytest patterns, `../testing/standards.md` for coverage methodology, `stack-decision-heuristics.md` and `corporate-defaults.md` for technology selection.

## Project Structure

- Use a `src/` layout (package under `src/`) over a flat layout — **why**: prevents accidentally importing the in-development package from the working directory, forces tests to run against the installed package, and matches packaging-tool expectations
- One module = one cohesive responsibility; avoid a catch-all `utils.py` — **why**: catch-all modules accumulate unrelated helpers, develop hidden coupling, and become impossible to name or test
- Package by feature over package by layer for larger codebases — **why**: feature-based packaging keeps related code together, reducing cross-package imports and making a single feature easy to reason about
- Keep configuration and settings separate from business logic — **why**: configuration changes across environments; business logic should not
- Declare the public API explicitly with `__all__` and shallow import paths — **why**: signals what is supported vs. internal, and lets you refactor internals without breaking consumers

## Naming Conventions

- Modules and packages: short, all-lowercase `snake_case`, no hyphens (`order_service`) — **why**: hyphens are not valid in import statements; underscores keep modules importable
- Classes and exceptions: `PascalCase` (`OrderService`, `PaymentError`)
- Functions and variables: `snake_case` (`calculate_total`, `order_count`)
- Constants: `UPPER_SNAKE_CASE` (`MAX_RETRY_COUNT`)
- Internal-by-convention: single leading underscore (`_internal`); reserve name-mangling double underscore (`__x`) for genuine subclass-collision avoidance — **why**: the single underscore communicates intent without the surprises that name mangling introduces
- Booleans: prefix with `is_`, `has_`, `can_`, `should_` (`is_active`, `has_permission`)

> **Why**: PEP 8 is the universal baseline across the Python ecosystem. Following it matches formatter/linter defaults, reduces cognitive load on unfamiliar code, and keeps diffs free of style churn.

## Type Hints

**Intent**: Use static typing to catch errors before runtime and to document contracts at the boundary.

- Annotate all public function signatures, including return types — **why**: type hints are the machine-checkable contract; unannotated public APIs force callers to read the implementation
- Run a static type checker (mypy or pyright) in CI — **why**: hints are not enforced at runtime; only a checker turns them into a real safety net
- Use built-in generics (`list[int]`, `dict[str, int]`) on 3.9+ instead of `typing.List` — **why**: the `typing` aliases are deprecated for this purpose; built-ins are clearer and need no import
- Prefer `X | None` over `Optional[X]` on 3.10+ — **why**: the union syntax is more readable and consistent with other unions
- Prefer `Protocol` (structural typing) over abstract base classes when you only need an interface shape — **why**: Protocols decouple the consumer from the provider's inheritance hierarchy, matching Python's duck-typing model
- Avoid `Any`; reach for `object`, a `Protocol`, or a generic instead — **why**: `Any` silently disables type checking for everything it touches, defeating the purpose of annotations
- Model structured data with `dataclass`, `TypedDict`, or Pydantic rather than bare `dict` — **why**: bare dicts have no checked shape; typos in keys surface only at runtime

### Context: Python 3.12+

- Use the PEP 695 type-parameter syntax (`def first[T](items: list[T]) -> T`) — **why**: generics read inline without separate `TypeVar` declarations, reducing boilerplate and import noise

## Error Handling

- Catch specific exception types; never use a bare `except:` or broad `except Exception` — **why**: bare excepts also swallow `KeyboardInterrupt` and `SystemExit`, and broad catches hide bugs and unrelated failures
- Embrace EAFP (try/except) over LBYL for expected-absence checks, but keep the `try` block narrow — **why**: EAFP avoids the race conditions inherent in check-then-act; a narrow block prevents masking errors from unrelated statements
- Never swallow exceptions silently (`except ...: pass`); log or re-raise — **why**: silent swallowing creates invisible failures that surface later as data corruption or unexpected behavior
- Define a custom exception hierarchy rooted in a base application exception — **why**: gives a single catch point for application errors and enables consistent error response formatting
- Preserve the cause chain with `raise NewError(...) from err` — **why**: keeps the original traceback; re-raising a fresh exception without `from` discards the root cause and makes diagnosis harder
- Use context managers (`with`) or `try/finally` for all resource cleanup — **why**: guarantees files, connections, and locks are released even when an exception is raised, preventing resource leaks
- Include actionable context in messages (entity ID, operation, input) — **why**: "Order not found" is useless in logs; "Order 12345 not found during payment processing" is actionable

### Context: Python 3.11+

- Use `except*` and `ExceptionGroup` to handle multiple concurrent failures — **why**: structured concurrency (e.g. `TaskGroup`) raises grouped exceptions; `except*` handles each failure type without losing the others

## Idioms and Data Structures

- Prefer comprehensions over manual append loops for building collections, but extract complex logic into named functions — **why**: comprehensions express intent concisely, but nested or branch-heavy ones become unreadable and should be named
- Use generators (`yield`, generator expressions) for large or streaming data — **why**: lazy evaluation keeps memory constant instead of materializing the whole sequence
- Iterate with `enumerate`, `zip`, and `dict.items()` rather than index manipulation — **why**: clearer intent and fewer off-by-one and `IndexError` bugs
- Use `dataclasses` (or `attrs`) for data carriers — **why**: auto-generates `__init__`, `__repr__`, and `__eq__`, eliminating boilerplate and hand-written-equality bugs
- Use `pathlib.Path` over `os.path` string manipulation — **why**: object-oriented path handling is cross-platform and avoids fragile string concatenation
- Use f-strings for string formatting (outside logging calls) — **why**: faster and more readable than `%` or `.format()`
- Never use a mutable default argument (`def f(items=[])`) — **why**: the default is created once at definition time and shared across all calls, so mutations leak between invocations; use `None` and create inside the function

## Concurrency

**Intent**: Choose the concurrency model that matches the workload, respecting the Global Interpreter Lock (GIL).

- For I/O-bound workloads, use `asyncio` or threads — **why**: I/O releases the GIL, so concurrency improves throughput while one task waits on the network or disk
- For CPU-bound workloads, use `multiprocessing` / `ProcessPoolExecutor` or native extensions — **why**: the GIL serializes Python bytecode, so threads do not parallelize CPU work; separate processes do
- Prefer `concurrent.futures` executors over manually managing threads or processes — **why**: executors provide pool management, result handling, and exception propagation that raw workers lack
- Never call blocking code directly inside `async` functions; offload via `run_in_executor` or use an async library — **why**: a single blocking call stalls the entire event loop, freezing all concurrent tasks

### Context: Python 3.11+

- Use `asyncio.TaskGroup` instead of `asyncio.gather` for spawning concurrent tasks — **why**: TaskGroup provides structured concurrency with automatic cancellation of siblings on failure and grouped exception propagation

### Context: Python 3.13+

- Treat the free-threaded (no-GIL) build as experimental — **why**: it is not yet production-default; do not assume thread-based CPU parallelism without explicit validation on the target runtime

## Modern Python Features

**Intent**: Use language features that reduce boilerplate and improve safety, based on the project's Python version.

### Context: Python 3.10+

- Use structural pattern matching (`match`/`case`) for dispatching on shape — **why**: deconstructs and branches on data structures in one readable construct, replacing brittle `if/elif` chains
- Use `X | Y` union syntax in annotations — **why**: removes the `typing.Union` / `Optional` import and reads naturally

### Context: Python 3.11+

- Read TOML config with the stdlib `tomllib` — **why**: no third-party dependency needed to parse `pyproject.toml` or config files
- Use the `Self` type for fluent/builder return types — **why**: correctly types methods that return their own instance, including in subclasses

## Dependency Management

**Intent**: Builds must be reproducible, isolated, version-locked, and auditable for security vulnerabilities.

- Always work inside an isolated virtual environment per project — **why**: prevents global site-packages pollution and version conflicts between projects
- Declare project metadata and dependencies in `pyproject.toml` (PEP 621) — **why**: the standardized, tool-agnostic manifest; replaces scattered `setup.py`/`setup.cfg` conventions
- Commit a lock file and install from it in CI and production — **why**: pinning the full resolved dependency tree makes builds reproducible across machines and days
- Separate runtime dependencies from development/test dependencies — **why**: production images stay minimal and free of test tooling and its attack surface
- Audit dependencies for known vulnerabilities regularly — **why**: unpatched libraries are a common attack vector; automated scanners make stale dependencies easy to exploit

**Recommended options**: uv or Poetry (modern, lockfile-based resolution); pip-tools (`requirements.in` → locked `requirements.txt`); pip + `requirements.txt` (simple/legacy). Use `pip-audit` or Safety for vulnerability scanning.

## Testing

**Intent**: Tests must be isolated, readable, and cover critical paths per coverage thresholds defined in `../testing/standards.md`.

- Follow the Arrange-Act-Assert pattern — **why**: consistent structure makes tests scannable; readers instantly see setup, execution, and verification
- Use pytest fixtures for setup/teardown rather than `setUp`/`tearDown` classes — **why**: fixtures compose, scope explicitly (function/module/session), and inject only what a test needs
- Parametrize tests to cover boundary and edge cases (`None`, empty collections, limits) — **why**: most production bugs occur at boundaries, not on the happy path; parametrization covers them without duplicated test bodies
- Mock external dependencies with `unittest.mock` / `pytest-mock` — **why**: tests that hit real databases or APIs are slow, flaky, and test integration rather than logic

**Recommended options**: pytest (test framework), pytest-cov (coverage), pytest-mock (mocking), Hypothesis (property-based testing). See `../testing/patterns-python.md` for project patterns.

> Coverage threshold is a reference. See `../testing/standards.md` for project-specific thresholds and methodology.

## Performance

- Profile before optimizing (`cProfile`, `timeit`) — **why**: intuition about Python hotspots is frequently wrong; measuring directs effort where it matters
- Prefer built-in types and the standard library — **why**: core containers and many stdlib functions are implemented in C and outperform hand-rolled Python equivalents
- Use generators and iterators for large datasets — **why**: streaming avoids loading the entire dataset into memory at once
- Improve the algorithm before micro-optimizing — **why**: an O(n) → O(log n) change dwarfs any constant-factor tuning
- Use `__slots__` on classes with many instances — **why**: removes the per-instance `__dict__`, cutting memory footprint substantially in high-cardinality objects
- Cache pure, expensive calls with `functools.lru_cache` / `functools.cache` — **why**: memoizes repeated computations with identical inputs without manual cache management
- For numeric or array-heavy hot paths, use vectorized libraries (NumPy) or native extensions — **why**: vectorized C operations are orders of magnitude faster than per-element Python loops

## Logging

**Intent**: Produce logs that are structured, traceable, and safe.

- Use the `logging` module; never use `print` for diagnostics — **why**: `print` cannot be leveled, filtered, routed to handlers, or disabled in production
- Obtain a module-level logger with `logging.getLogger(__name__)` — **why**: hierarchical logger names enable per-module level control and clear log provenance
- Pass log arguments lazily (`log.info("Order %s created", order_id)`) rather than pre-formatting — **why**: the message is only formatted when the level is enabled, avoiding wasted work for suppressed log lines
- Use structured/JSON logging in containerized and production environments — **why**: log aggregators parse JSON natively; unstructured text needs fragile regex parsing
- Include correlation IDs in log records — **why**: enables tracing a single request across services and threads in distributed systems
- Never log secrets, tokens, or PII — **why**: logs are stored long-term with broad access; leaked credentials and PII are common breach and compliance-violation vectors

**Recommended options**: stdlib `logging` (always), `structlog` or `python-json-logger` (structured/JSON output).

## Security

**Intent**: Defend against the OWASP Top 10 at the code level.

- Validate and sanitize all external inputs — **why**: unvalidated input is the root cause of injection, path traversal, and deserialization attacks
- Use parameterized queries exclusively; never build SQL with string formatting — **why**: string-built SQL is the #1 cause of SQL injection; parameterization makes it structurally impossible
- Never run `eval`, `exec`, or `pickle.load` on untrusted input — **why**: all three execute arbitrary code; untrusted pickle deserialization is a direct remote-code-execution path
- Use the `secrets` module (not `random`) for tokens, keys, and password resets — **why**: `random` is a predictable PRNG unsuitable for security; `secrets` is cryptographically secure
- Call `subprocess` with an argument list and avoid `shell=True` on user input — **why**: `shell=True` with interpolated input enables shell command injection
- Parse untrusted XML with `defusedxml` — **why**: stdlib XML parsers are vulnerable to billion-laughs and XXE entity-expansion attacks
- Never hardcode secrets; inject via environment variables or a secret manager — **why**: secrets in source leak through version history, CI logs, and forks
- Keep dependencies patched — **why**: known CVEs in libraries are actively exploited

## Code Standards

- Follow PEP 8; enforce it with an autoformatter plus a linter in CI — **why**: removes style debate, keeps diffs focused on logic, and catches whole classes of defects mechanically
- Keep functions short and single-purpose (aim for ~30 lines) — **why**: long functions are harder to test, name, and reason about; shorter ones encourage reuse
- Prefer explicit over implicit, per the Zen of Python — **why**: implicit behavior (hidden globals, magic) makes code unpredictable and hard to debug
- Avoid wildcard imports (`from module import *`) — **why**: pollutes the namespace, shadows names unpredictably, and hides where symbols come from
- Type-annotate public APIs (see Type Hints) — **why**: documents contracts and enables static checking
- Prefer passing collaborators in (dependency injection) over module-level globals and singletons — **why**: explicit dependencies make code testable without monkeypatching module state

## Anti-Patterns to Avoid

| Anti-pattern | Why it's harmful |
|-------------|-----------------|
| Mutable default arguments (`def f(x=[])`) | The default is created once and shared across calls; mutations leak between invocations |
| Bare `except:` or broad `except Exception` | Swallows `KeyboardInterrupt`/`SystemExit` and hides unrelated bugs |
| Catching an exception then `pass` | Creates invisible failures that corrupt state silently |
| `from module import *` | Namespace pollution, name shadowing, unclear provenance |
| `eval`/`exec`/`pickle` on untrusted input | Arbitrary code execution / deserialization RCE |
| Mutating a list or dict while iterating it | Skips elements or raises `RuntimeError` |
| `== None` / `== True` instead of `is None` / truthiness | Identity-vs-equality confusion; PEP 8 violation |
| `type(x) == SomeClass` instead of `isinstance(x, SomeClass)` | Fails for subclasses; breaks polymorphism |
| Catch-all `utils.py` / god modules | Low cohesion, hidden coupling, impossible to navigate |
| Overusing `Any` in type hints | Silently disables static checking wherever it spreads |

## Recommended Options

Pick based on project context, not as a mandated single choice.

| Concern | Options | Notes |
|---------|---------|-------|
| **Dependency management** | uv, Poetry, pip-tools | uv is fastest and modern; Poetry is mature; pip-tools is the minimal lockfile path |
| **Formatting** | Ruff formatter, Black | Ruff is fast and unifies lint + format; Black is the established standard |
| **Linting** | Ruff, Flake8, Pylint | Ruff replaces most plugins; Pylint for deeper, slower analysis |
| **Type checking** | mypy, pyright | pyright is faster with stronger inference; mypy is the reference implementation |
| **Testing** | pytest, unittest | pytest is the ecosystem standard; unittest only when stdlib-only is required |
| **Data validation** | Pydantic, attrs, dataclasses | Pydantic at I/O boundaries; dataclasses for internal carriers |
| **HTTP client** | httpx, requests | httpx for async + HTTP/2; requests for simple synchronous use |
| **Web framework** | FastAPI, Django, Flask | FastAPI for async + typed APIs; Django for batteries-included; Flask for minimal services |
| **Vulnerability scanning** | pip-audit, Safety | Run in CI against the lock file |

## Context-Aware Decision Guide

| Context | Guidance |
|---------|----------|
| **Python 3.8 / 3.9 (legacy)** | No `match`/`case`, no PEP 604 (`X \| Y`) unions, no PEP 695 generics. Use `Optional`/`Union` from `typing`; on 3.8 use `typing.List` etc. Plan an upgrade path. |
| **Python 3.10** | Use structural pattern matching, `X \| Y` unions, parenthesized context managers. |
| **Python 3.11+ (recommended baseline)** | Add `TaskGroup`, `ExceptionGroup`/`except*`, `tomllib`, `Self`, and the CPython performance gains. Baseline for the Modern Python Features above. |
| **Python 3.12+** | Add PEP 695 inline type parameters. |
| **Python 3.13+** | Free-threaded (no-GIL) build is experimental — do not rely on thread-based CPU parallelism in production. |
| **Library / SDK** | Target the lowest Python version your consumers need. Minimize dependencies, avoid framework lock-in, and ship type information (`py.typed` marker). |
| **CLI tool** | Use `argparse` (stdlib), or Click/Typer for richer ergonomics. Expose via `console_scripts` entry points in `pyproject.toml`. |

## References

- [PEP 8 — Style Guide for Python Code](https://peps.python.org/pep-0008/)
- [PEP 20 — The Zen of Python](https://peps.python.org/pep-0020/)
- [PEP 484 — Type Hints](https://peps.python.org/pep-0484/)
- [PEP 621 — Project metadata in pyproject.toml](https://peps.python.org/pep-0621/)
- [Python Standard Library](https://docs.python.org/3/library/)
