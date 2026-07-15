# JIRA Authentication

This document defines the implementation methods (HOW) for JIRA authentication in Phoenix OS.

**Memory Type**: Long-term memory (LT) - Provides implementation patterns for agents.

**Role**: Agents read this memory to understand HOW to execute JIRA operations. Commands do NOT pass this to agents; agents discover and read it independently.

**Memory Path**: `${config.memory.tools.jira.authentication}`

**CRITICAL REQUIREMENT**: Authentication is **user-managed**. Whoever installed `acli` logs in themselves (`acli jira auth login`) so that agents can use the authenticated session. Agents do **not** manage credentials — they only verify that `acli` is authenticated (pre-flight) before any JIRA operation, and stop if it is not.

---

## Pre-flight Verification

Confirm `acli` is authenticated before any JIRA operation:

```bash
# acli: confirm the configured account
acli jira auth status
```

If the status check fails, `acli` is not authenticated. Stop and ask the user to authenticate `acli` for the JIRA site, then retry.

---

## Required Project Permissions

The account that authenticated `acli` must have the following permissions in the target project for the operations documented in `issue-operations.md`:

- **Browse Projects** — fetch issues, run JQL queries
- **Create Issues** — create new issues
- **Edit Issues** — update issues, set parent, assign
- **Add Comments** — post comments on issues
- **Transition Issues** — move issues through workflow states

---

## Error Handling

```
❌ Error: Not authenticated

acli is not authenticated for the JIRA site.

To fix:
- Authenticate acli for the JIRA site (user-managed), then re-run the pre-flight: acli jira auth status
```

```
❌ Error: Permission denied

The authenticated account lacks permission for this operation on the target project.

To fix:
- Ensure the account has the required project permissions (see Required Project Permissions above)
```

---

**Version**: 1.0.0
**Last Updated**: 2026-06-17
**Status**: Active
**Platform**: JIRA (Cloud)
