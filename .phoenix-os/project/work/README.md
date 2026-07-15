# Short-Term Memory (STM)

Task-, branch-, and worktree-local context for in-flight work.

Each in-flight issue gets a subdirectory named after its ID. The files
written there are the impl templates declared in your project's
`CLAUDE.md` (or `COPILOT.md`) `templates.impl` section — see that
section for the authoritative list, and the recipes under
`docs/wiki/usage/recipes/` for which recipe writes which file.

This directory is provisioned by the Phoenix OS installer so the path
exists before any agent or recipe attempts to write into it.
