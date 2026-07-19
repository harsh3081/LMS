# Issue #132 — Convert Lead to Enquiry as a right-side slide-over, not a separate page

Fast-tracked, frontend-only implementation. No backend/API changes. TDD
throughout (RED test written first for every changed behavior, then made
GREEN), mirroring this codebase's existing Vitest structure exactly. This
issue **reverses** issue #124's earlier design decision (dedicated route over
SlideOver) at the user's explicit request, for consistency with how #118 (New
Lead) and #130 (New Enquiry) already behave.

## What was built / changed

### `frontend/src/components/LeadQueue.tsx` (MODIFIED) — per-row panel-state mechanism

- Added a single piece of state: `const [openLeadId, setOpenLeadId] =
  useState<string | null>(null)`. `leadId` (not a per-row boolean) is the
  natural key here — it both identifies which row's panel is open **and** is
  the exact prop `ConvertLeadForm` needs to fetch that lead's data, so no
  second lookup/derivation is needed.
- "Convert to Enquiry" reverted from a `<Link to={`/leads/${leadId}/convert`}>`
  (issue #124) back to a `<button onClick={() => setOpenLeadId(lead.leadId)}>`
  per row.
- Exactly **one** `<SlideOver>` is rendered, outside the table's `.map()`,
  reused for whichever row's button was last clicked:
  ```tsx
  <SlideOver
    open={openLeadId !== null}
    onClose={() => setOpenLeadId(null)}
    title="Convert to Enquiry"
    maxWidthClassName="max-w-4xl"
  >
    {openLeadId !== null && (
      <ConvertLeadForm key={openLeadId} leadId={openLeadId} onConverted={() => setOpenLeadId(null)} />
    )}
  </SlideOver>
  ```
  This mirrors `LeadManagementPage`'s existing New Lead SlideOver pattern
  exactly (`open`/`onClose` state at the host level, form's own callback prop
  closes the panel).
- **Judgment call — `key={openLeadId}`**: not strictly required by the issue,
  but added so switching which lead's panel is open (in principle possible if
  a second row's trigger were clicked without first closing the panel) forces
  a fresh `ConvertLeadForm` instance rather than reusing one with a swapped
  `leadId` prop — avoids a value typed into one lead's form silently carrying
  over onto a different lead's panel. Covered by a dedicated test ("only one
  row's panel is open at a time").
- In practice the `SlideOver` backdrop would block clicking a different row's
  trigger while a panel is already open in a real browser (z-40 backdrop
  covers the table) — the "switch to a different lead" test exercises the
  state mechanism directly via Testing Library (which does not simulate
  visual stacking/hit-testing), not a literal two-clicks-in-a-row user
  journey.

### `frontend/src/components/ConvertLeadForm.tsx` (MODIFIED) — delayed-close mechanism

- `onConverted` used to fire **synchronously** right after
  `setSuccessMessage('Lead converted — Enquiry created successfully.')`.
  Wired directly to close a SlideOver, this would have made the success
  message flash and vanish instantly.
- Applied the exact same delayed-close pattern `NewLeadForm` (issue #118) and
  `NewEnquiryForm` (issue #130) already use:
  - Imports `SUCCESS_AUTO_CLOSE_MS` from `./NewLeadForm` and **re-exports**
    it (`export { SUCCESS_AUTO_CLOSE_MS };`) — mirrors `NewEnquiryForm.tsx`'s
    identical re-export exactly, so callers (LeadQueue's spec, this file's
    own spec) import the constant from `ConvertLeadForm` directly without
    reaching into `NewLeadForm`'s module. The constant itself is **not**
    duplicated — still a single source of truth (1500ms) in `NewLeadForm.tsx`.
  - Added `successTimeoutRef` (`useRef<ReturnType<typeof setTimeout> |
    null>`) and a `useEffect` cleanup that clears the pending timer on
    unmount — avoids calling `onConverted` or touching state after unmount
    (e.g. panel closed/re-opened before the timer fires).
  - `onConverted?.()` replaced with:
    ```ts
    if (onConverted) {
      successTimeoutRef.current = setTimeout(() => {
        onConverted();
      }, SUCCESS_AUTO_CLOSE_MS);
    }
    ```
    scheduled only when the prop was actually passed (unchanged for any
    future caller that doesn't pass `onConverted`).
- The form's internal 8-section field layout/logic (sections, validation,
  submit mapping) is **completely untouched** — only the success-timing
  mechanism changed, per the issue's explicit instruction.

### `frontend/src/pages/ConvertLeadPage.tsx` — DELETED

The dedicated `/leads/:leadId/convert` page from issue #124 is fully removed.
Its documented rationale (form too large for a SlideOver, needed a full page
for breathing room) is superseded by this issue's explicit user request for
slide-over consistency over the extra room a full page gave — an accepted,
explicit tradeoff (see "SlideOver width" below).

### `frontend/src/pages/DashboardPage.tsx` (MODIFIED — comment only)

Its doc comment listed `ConvertLeadPage` among pages with a "Back to
Dashboard" link pointing at `/`. Updated to remove `ConvertLeadPage` from
that list (it no longer exists) and added a note explaining why.

### `frontend/src/App.tsx` (MODIFIED)

Removed the `ConvertLeadPage` import and the `<Route
path="/leads/:leadId/convert" element={<ConvertLeadPage />} />` registration.
`/leads/:leadId/convert` no longer exists as a route (AC4).

## SlideOver width choice

`maxWidthClassName="max-w-4xl"` — wider than `LeadManagementPage`'s own New
Lead SlideOver (`max-w-3xl`, hosting NewLeadForm's 6 sections), since
ConvertLeadForm has 8 sections plus a read-only Customer Information section
pulled from a second data source (the Lead). Not as wide as `max-w-5xl`/`6xl`
would allow, to keep some visible gap between the panel's right edge and the
backdrop-covered queue behind it at typical desktop widths, consistent with
how `LeadManagementPage`'s panel doesn't consume the full viewport either.

**Explicit, accepted tradeoff**: this is necessarily more cramped than the
full-page `max-w-6xl` `Card` the old `ConvertLeadPage` used (see that file's
former doc comment, quoted from issue #124: *"Even at SlideOver's widest
supported panel (max-w-3xl/max-w-4xl), an 8-section form with a side-nav
inside a fixed-height right-docked panel would force either a cramped
single-column layout or a claustrophobic scroll region."*) That concern was
real and is not resolved by this issue — the form's 2-column grid sections
and side-nav do have less horizontal room in a `max-w-4xl` panel than they
had in a full page. The user explicitly asked for slide-over consistency
with New Lead/New Enquiry over the extra room a full page gave, overriding
#124's original reasoning; this issue does not attempt to relitigate or
mitigate that tradeoff (e.g. no responsive breakpoint tuning, no collapsed
side-nav on narrower panels) beyond picking the widest sensible
`SlideOver` width.

## Files changed

- `frontend/src/components/LeadQueue.tsx` (modified)
- `frontend/src/components/ConvertLeadForm.tsx` (modified)
- `frontend/src/pages/DashboardPage.tsx` (modified, comment only)
- `frontend/src/App.tsx` (modified)
- `frontend/src/pages/ConvertLeadPage.tsx` (deleted)
- `frontend/tests/unit/LeadQueue.spec.tsx` (modified: 2 existing tests
  retargeted from `link` role to `button` role; removed the #124
  navigation-href test; +5 new tests under a new "Convert to Enquiry
  slide-over panel (issue #132)" describe block — open-without-navigating,
  close-via-close-button, one-panel-at-a-time/lead-switch, and the
  success-message-then-auto-close flow)
- `frontend/tests/unit/ConvertLeadForm.spec.tsx` (modified: added a
  `spyOnSuccessAutoCloseTimer` helper mirroring `NewLeadForm.spec.tsx`'s;
  updated the "AC4/AC5" success test's `onConverted` assertion to use the
  timer spy instead of a bare `waitFor`; +2 new tests under a new
  "onConverted auto-close (issue #132)" describe block, mirroring
  `NewLeadForm.spec.tsx`'s "onSuccess auto-close" block exactly)
- `frontend/tests/unit/ConvertLeadPage.spec.tsx` (deleted)

No backend files were touched (confirmed via `git status --porcelain` —
only files under `frontend/` are modified/added/deleted).

## Test results

- `npx vitest run` (full frontend regression suite): **30 files / 233 tests
  passed**, 0 failed.
- `npx tsc -b --force` (forced, not incremental cache): clean, no errors.
- `npx eslint "src/**/*.{ts,tsx}" --max-warnings=0`: clean, no
  warnings/errors.
- `npx eslint "tests/**/*.{ts,tsx}" --max-warnings=0`: clean, no
  warnings/errors.
- `git status --porcelain` (worktree root): confirms only `frontend/src/*`
  and `frontend/tests/unit/*` files touched — no `backend/` changes.
- Grep audit (`leads/.*convert|ConvertLeadPage`) confirms the only remaining
  matches are: the backend HTTP endpoint path
  `/api/v1/leads/${leadId}/convert` in `api/client.ts` (a real, unrelated
  REST route — `POST .../convert`, not the removed frontend page route) and
  its own pre-existing `api-client.spec.ts` test, plus doc-comment mentions
  of the old design in `ConvertLeadForm.tsx`/`LeadQueue.tsx`/
  `LeadQueue.spec.tsx` explaining the #124→#132 history. No dangling
  references to the deleted `ConvertLeadPage` component or the removed
  `/leads/:leadId/convert` frontend route remain.

## Known gaps / follow-ups

- No Playwright/E2E test was added or run for this issue — fast-tracked,
  lightweight GitHub issue, verification scoped to the frontend Vitest
  regression suite per the orchestrating instructions.
- The SlideOver-width tradeoff (more cramped than the old full page) is
  accepted as-is, per the user's explicit request — no responsive/layout
  mitigation was attempted (see "SlideOver width choice" above).
- `LeadQueue`'s "only one panel open at a time" behavior is enforced by
  construction (single `openLeadId` state, single `SlideOver` instance) —
  there is no runtime guard against a second panel ever existing because the
  component shape makes it structurally impossible, not because of an
  explicit check.
