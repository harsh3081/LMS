# Interview Loop Behavior Block

Reusable behavior block for resolving open questions in phase artifacts before user approval. All three planning-phase orchestrators (start-work, prepare, design) invoke this block identically after artifact generation and before the approval prompt.

---

## Agent Output Contract

The agent MUST return two things alongside its artifact:

1. **The artifact file** — written to disk at the agreed path.
2. **A structured question list** — returned in the following format immediately after the artifact summary:

```
OPEN_QUESTIONS:
- Q1: {question text}
  OPTIONS:
    1. {option text} [RECOMMENDED]
    2. {option text}
    ...
    N. Defer / Ignore
  ARTIFACT_LOCATION: {file path relative to specs base}
  MARKER: {the exact blockquote marker text embedded in the artifact}
- Q2: {question text}
  OPTIONS:
    1. {option text} [RECOMMENDED]
    ...
    N. Defer / Ignore
  ARTIFACT_LOCATION: {file path}
  MARKER: {exact marker text}
(empty list if no open questions)
```

The agent is responsible for detection because it has the deepest understanding of the codebase, memory, and context. The orchestrator is responsible for presenting questions and recording decisions (separation of concerns).

**Open question markers in artifacts** use visible blockquote syntax so users see them during review:

```
> **[OPEN QUESTION]**: {question text}
```

**Graceful degradation**: If the agent returns no `OPEN_QUESTIONS:` block at all, treat as zero questions — proceed to approval with this warning:

```
Warning: Agent returned no OPEN_QUESTIONS block. Treating as zero open questions.
```

---

## Orchestrator Interview Loop

### Step IL-1: Receive Question List

Read the `OPEN_QUESTIONS:` block from the agent's output. Parse each question entry with its options, artifact location, and marker text. Build an ordered list.

### Step IL-2: Zero-Question Skip Check

If the question list is empty (zero entries):

```
No open questions found. Proceeding to approval.
```

Skip to the approval prompt. Do not run Steps IL-3 through IL-7.

### Step IL-3: Present Questions One at a Time

For each question in order, present:

```
--- Open Question {n} of {total} ---
{question text}

  1. {option text} [Recommended]
  2. {option text}
  ...
  N. Defer / Ignore

Your choice:
```

Wait for the user to enter a number. Do not proceed to the next question until a valid selection is made.

### Step IL-4: Record User Decision

For each question, based on the user's selection:

- **If the user selects a numbered option (not Defer/Ignore)**:
  - Status = `Resolved`
  - Decision text = the chosen option text

- **If the user selects the "Defer / Ignore" option**:
  - Status = `Ignored (used recommendation)`
  - Decision text = the recommended option text (option marked `[RECOMMENDED]`)
  - Increment the deferred count

### Step IL-5: Update Artifact Inline

After recording the decision, update the artifact file at `ARTIFACT_LOCATION`:

- **On resolution**: Replace the marker

  ```
  > **[OPEN QUESTION]**: {question text}
  ```

  with

  ```
  > **[RESOLVED]**: {chosen option text}
  ```

- **On defer/ignore**: Replace the marker

  ```
  > **[OPEN QUESTION]**: {question text}
  ```

  with

  ```
  > **[DEFERRED]**: {question text} — recommendation auto-applied: {chosen option}
  ```

Verify the replacement by reading the file back and confirming the `[OPEN QUESTION]` marker no longer appears for this question.

### Step IL-6: Append Entry to decisions.md

After each question is resolved or deferred, append a decision entry to `${config.specs.base-path}${config.specs.naming}/decisions.md` under the correct phase section. See `decision-tracking.md` for the exact entry format and file structure.

Each entry records: phase identifier, artifact file name, timestamp (ISO 8601), question text, all options presented, the decision made, and the status (Resolved or Ignored/Deferred).

### Step IL-7: Deferral Warning and Acknowledgment

After all questions have been processed, check the deferred count:

- **If deferred count = 0**: Proceed directly to the approval prompt.
- **If deferred count > 0**:

  ```
  Warning: {N} question(s) were deferred (recommendation auto-applied).
  You must acknowledge this before approval is offered.

  Type "acknowledge" to continue:
  ```

  Wait for the user to type `acknowledge` (case-insensitive). Do not offer the approval prompt until acknowledgment is received.

---

## Zero-Question Skip

When the agent returns an empty `OPEN_QUESTIONS:` list, the orchestrator outputs exactly:

```
No open questions found. Proceeding to approval.
```

Then immediately presents the approval prompt. No user interaction for questions occurs.

---

## Re-invocation After Revision

When the user requests a revision of an artifact:

1. The agent re-generates the artifact — this may introduce new open questions.
2. The orchestrator receives a fresh `OPEN_QUESTIONS:` list from the agent's revised output.
3. The interview loop runs again from Step IL-1 on the fresh question list.
4. Previously resolved questions that reappear (because the revision changed context) are presented again.
5. Previously resolved questions that do not reappear are already replaced inline and require no further action.

The decisions.md file is appended to with any new decisions — entries from previous runs of the loop for the same phase are not removed.

---

## Deferral Handling Detail

A deferred question means the user selected "Defer / Ignore". The orchestrator:

1. Auto-chooses the recommended option for the deferred question.
2. Records the decision in decisions.md with status `Ignored (used recommendation)`.
3. Updates the artifact inline with `> **[DEFERRED]**: {question text} — recommendation auto-applied: {chosen option}`.
4. Increments the deferred count.

After all questions, if deferred count > 0, surfaces the warning (Step IL-7) and requires explicit acknowledgment before proceeding to the approval prompt.

---

## Command File Reference Pattern

Each planning phase command file references this behavior block by path and supplies the phase-specific context:

```
Invoke the interview loop defined in:
  ${config.behaviors.implementation.path}interview-loop.md

Context for this invocation:
- Phase: {phase number and name}
- Artifacts covered: {list of artifact files}
- decisions.md path: ${config.specs.base-path}${config.specs.naming}/decisions.md
- Phase section in decisions.md: ## Phase {N}: {Phase Name} ({artifact list})
```

Do not duplicate the loop instructions inline. Reference this file by path. Invoke the loop once per phase after all artifacts for that phase are generated.

---

## See Also

- `${config.memory.practices.implementation.path}decision-tracking.md` — decisions.md file structure and entry format
- `${config.commands.core}phoenix/impl/start-work.md` — Phase 2 orchestrator (uses this block at Step 4c)
- `${config.commands.core}phoenix/impl/prepare.md` — Phase 3 orchestrator (uses this block at Step 3b)
- `${config.commands.core}phoenix/impl/design.md` — Phase 4 orchestrator (uses this block in place of Step 5b)
