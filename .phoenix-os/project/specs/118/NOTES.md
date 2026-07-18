# Issue #118 — New Lead as a right-side slide-over panel from the Dashboard

Fast-tracked, frontend-only implementation. No backend/API changes. TDD
throughout (RED test written first for every new/changed behavior, then made
GREEN), mirroring this codebase's existing Vitest structure exactly.

## What was built

- **`frontend/src/components/ui/SlideOver.tsx`** (NEW) — the first
  modal/overlay/slide-over primitive in this codebase. Generic and reusable,
  Tailwind + plain React state/effects only, no new npm dependency.
  - Props: `{ open: boolean; onClose: () => void; title: string; children: ReactNode }`.
  - Docked to the right edge, `fixed inset-y-0 right-0`, full viewport
    height, `max-w-xl` (chosen over `max-w-md`/`max-w-lg` because the New
    Lead form has 6 sections plus a section nav — needed the extra width for
    readability).
  - Semi-transparent backdrop (`bg-slate-900/40`) covers the rest of the
    viewport; clicking it calls `onClose`. The click handler lives only on
    the backdrop `div`, not a document-level listener, so clicks inside the
    panel never bubble into a close.
  - Visible "×" close button in the header next to `title`
    (`aria-label="Close"`).
  - Escape closes the panel: a `keydown` listener is attached to `document`
    only while `open`, removed on close/unmount via the effect's cleanup
    function — verified by a dedicated test that unmounts the component and
    then fires Escape, asserting `onClose` was NOT called again.
  - `role="dialog"`, `aria-modal="true"`, `aria-labelledby` pointing at a
    `useId()`-generated id on the title `<h2>`.
  - Focus management: on open, focus moves to the close button (the first
    interactive element in the panel). On close, focus is restored to
    whatever element had focus immediately before open (captured via
    `document.activeElement` in the same effect) — in practice, the
    Dashboard's "New Lead" trigger button.
  - **Not implemented (documented gap)**: a full Tab-cycling focus trap
    (keeping focus from leaving the panel while open). Judged
    disproportionate complexity for this Story per the issue's own guidance
    ("a reasonable nice-to-have but not required if it adds significant
    complexity"). A user tabbing past the last focusable element in the
    panel will currently reach the rest of the page (backdrop/Dashboard)
    rather than wrapping back to the top of the panel.
  - **Not implemented (documented gap)**: an exit/close CSS transition. The
    panel only exists in the DOM while `open` is `true` (`return null`
    otherwise) — closing is instant, not animated. The `transition-transform
    duration-300` classes are present on the panel and it always renders in
    its resting (`translate-x-0`) position; there's no two-phase
    mount-then-animate step for the *enter* transition either, because doing
    that correctly with `requestAnimationFrame` produced React "not wrapped
    in act" warnings under Vitest and the added complexity wasn't
    justified for what is fundamentally a CSS/visual concern with no
    behavioral test coverage either way. If literal slide animation timing
    matters, a follow-up could add a `requestAnimationFrame`-driven
    two-phase state (mount at `translate-x-full`, flip to `translate-x-0`
    next frame) for the open transition, and a `setTimeout`-delayed unmount
    for the close transition. "Professional" is instead delivered via the
    backdrop, fixed right-dock positioning, close affordances, and visual
    consistency with the rest of the app (Card-like padding, brand colors).

- **`frontend/src/components/NewLeadForm.tsx`** (MODIFIED) — added an
  optional `onSuccess?: () => void` prop (`NewLeadFormProps`). Unchanged
  when the prop is omitted (the standalone `/leads/new` page does not pass
  it, so its existing behavior — success message stays until the DSE
  submits again or navigates away — is untouched).
  - **UX decision**: when `onSuccess` is provided, it fires
    `SUCCESS_AUTO_CLOSE_MS` (1500ms, exported as a named constant) after a
    successful creation, via `setTimeout`, *after* the existing
    `setSuccessMessage('Lead created successfully.')` + `reset()` calls —
    i.e. show the success confirmation briefly, then auto-close. Chosen
    over "auto-close immediately + parent toast" because (a) this codebase
    has no toast/snackbar component anywhere, so that path would have
    required building a *second* new UI primitive for this Story, and (b)
    it reuses NewLeadForm's own existing, already-tested success-message
    UI rather than duplicating that confirmation elsewhere.
  - The pending timer is tracked in a ref and cleared on unmount (e.g. the
    panel is closed/re-opened before the timer fires), so `onSuccess` is
    never called against an unmounted form.

- **`frontend/src/pages/LandingPage.tsx`** (MODIFIED) — the "New Lead" entry
  point changed from `<Link to="/leads/new">` to `<button onClick={() =>
  setIsNewLeadOpen(true)}>`. Renders `<SlideOver open={isNewLeadOpen}
  onClose={...} title="New Lead"><NewLeadForm onSuccess={() =>
  setIsNewLeadOpen(false)} /></SlideOver>` at the bottom of the page, inside
  `AppShell`, alongside the existing Dashboard content (which stays mounted
  underneath/behind the panel — verified by a test that opens the panel and
  asserts the Dashboard heading and "My Leads" table are still present in
  the DOM). The feature-flag gating (`config?.newLeadEnabled !== false`)
  is unchanged, just now wraps a `<button>` instead of a `<Link>`.

- **`frontend/src/pages/NewLeadPage.tsx`** (MODIFIED) — removed the
  `<LeadQueue />` import/render and the "My Leads" `<h2>` heading. The route
  now renders only the `<h1>New Lead</h1>` + `<Card><NewLeadForm /></Card>`,
  matching AC5 ("no longer redundantly re-displays the 'My Leads' table").
  The route itself is unchanged/still registered — direct navigation and
  bookmarking to `/leads/new` still work.

- **`frontend/src/components/ui/index.ts`** (MODIFIED) — exports `SlideOver`
  and `SlideOverProps` alongside the existing `ui/` barrel exports.

## Cache-invalidation verification (AC4)

Read `frontend/src/hooks/useLeads.ts` before assuming anything: `useCreateLead`'s
`onSuccess` does **not** invalidate-and-refetch — it directly
`queryClient.setQueryData<Lead[]>(LEADS_QUERY_KEY, (existing) => [created, ...(existing ?? [])])`,
prepending the created Lead into the cache synchronously. Since
`LandingPage` already renders `<LeadQueue />` reading that same
`LEADS_QUERY_KEY` via `useLeads()`, no extra wiring was needed for the panel
case — confirmed by a test (`LandingPage.spec.tsx`, "the form inside the
panel works end-to-end...") that creates a Lead through the panel and
asserts (a) the new Lead's name appears in the still-visible table and (b)
`getMyLeads` (the network read) was called exactly once — the initial
mount fetch, proving the update came from the mutation's cache write, not a
second network round-trip/page reload.

## Judgment calls

- **Panel width**: `max-w-xl` rather than `max-w-md`/`max-w-lg`, given the
  form's 6 sections + side nav.
- **Success-then-close over immediate-close-with-toast**: see NewLeadForm
  section above — avoided introducing a second new UI primitive (toast) in
  the same Story as the first new UI primitive (SlideOver).
- **No focus trap, no unmount/enter animation**: both flagged in the issue
  itself as acceptable simplifications; implemented the parts explicitly
  required (focus-in-on-open, focus-restore-on-close, Escape, backdrop
  click, close button, ARIA wiring) and documented the rest as gaps above
  rather than guessing at scope.
- **Test timer strategy**: `vi.useFakeTimers()` (this codebase's existing
  pattern, see `useSchedulerSlots.spec.tsx`) combined with a full
  `userEvent` form-fill + React Query in the same test reliably hung/timed
  out in this environment. Instead, tests that need to observe the
  `SUCCESS_AUTO_CLOSE_MS` timer use `vi.spyOn(window, 'setTimeout')` scoped
  to exactly that delay value — every other `setTimeout` call (including
  Testing Library's own internal polling) passes through to the real
  implementation untouched. This keeps the assertion fully deterministic
  (the captured callback is invoked directly; no real 1.5s wall-clock wait
  anywhere in the suite) without destabilizing the rest of the interaction.
  `SUCCESS_AUTO_CLOSE_MS` is exported from `NewLeadForm.tsx` specifically so
  tests reference the real constant rather than a duplicated magic number.

## Files changed

- `frontend/src/components/ui/SlideOver.tsx` (new)
- `frontend/src/components/ui/index.ts`
- `frontend/src/components/NewLeadForm.tsx`
- `frontend/src/pages/LandingPage.tsx`
- `frontend/src/pages/NewLeadPage.tsx`
- `frontend/tests/unit/SlideOver.spec.tsx` (new, 11 tests)
- `frontend/tests/unit/NewLeadForm.spec.tsx` (+2 tests: onSuccess auto-close)
- `frontend/tests/unit/LandingPage.spec.tsx` (1 test updated from `Link`→`button`
  assertion; +3 new tests: open-without-navigating, close-button closes,
  end-to-end create-through-panel)
- `frontend/tests/unit/NewLeadPage.spec.tsx` (rewritten: form-still-renders,
  table-no-longer-renders, create-still-works — replaces the old
  queue-reflection test, which now conceptually lives in
  `LandingPage.spec.tsx` since the queue itself moved there)

No backend files were touched (confirmed via `git status` — only files under
`frontend/` are modified/added).

## Test results

- `npx vitest run`: **29 files / 210 tests passed**, 0 failed (full frontend
  regression suite, including all pre-existing specs).
- `npx vitest run --coverage`: thresholds (80% lines / 75% branches,
  vite.config.ts) met — overall 97.99% lines / 91.22% branches. Exit code 0,
  no threshold failures.
- `npx tsc -b --force` (forced, not incremental cache): clean, no errors.
- `npx eslint "src/**/*.{ts,tsx}" --max-warnings=0`: clean, no
  warnings/errors.
- `git status --porcelain` (worktree root): confirms only `frontend/` files
  touched — no `backend/` changes.

## Known gaps / follow-ups

- SlideOver's focus trap and enter/exit CSS animation are intentionally not
  implemented (see "What was built" above) — candidates for a future,
  separate enhancement if/when this primitive is reused elsewhere and the
  gaps start to matter in practice.
- No Playwright/E2E test was added or run for this issue. This was a
  fast-tracked, lightweight GitHub issue (not sourced from a BRD, no frozen
  spec/eval artifacts of its own under `.phoenix-os/project/specs/118/`
  beyond this NOTES.md) and the orchestrating instructions scoped
  verification to the frontend Vitest regression suite only.
