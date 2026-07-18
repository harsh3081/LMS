import { ReactNode, useEffect, useId, useRef, useState } from 'react';

export interface SlideOverProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

/**
 * Generic, reusable right-docked slide-over panel primitive (issue #118,
 * AC1/AC3) — the first modal/overlay component in this codebase (see
 * .phoenix-os/project/specs/118/NOTES.md). Built with Tailwind + plain React
 * state/effects only, no new npm dependency (no headlessui/radix/etc.).
 *
 * Behavior:
 * - Docked to the right edge, fixed position, full viewport height, capped
 *   at `max-w-xl` (the New Lead form has 6 sections — a wider panel keeps it
 *   readable, mirroring NewLeadPage's own `max-w-2xl` card).
 * - Semi-transparent backdrop covers the rest of the viewport; clicking it
 *   closes the panel. Clicking inside the panel itself does not (the click
 *   handler lives on the backdrop element only, not a document-level
 *   listener, so panel-content clicks never bubble into a "close").
 * - A visible "×" close button sits in the header next to `title`.
 * - Escape closes the panel — a `keydown` listener is attached to
 *   `document` only while `open`, and removed on close/unmount (effect
 *   cleanup), so no stray listeners accumulate across renders.
 * - Slide-in is a CSS transform transition (`translate-x-full` ->
 *   `translate-x-0`) and the backdrop cross-fades (`opacity-0` ->
 *   `opacity-100`), driven by an `entered` state flipped one animation
 *   frame after mount (a class that is already at its final value on the
 *   very first render never visibly animates — there is no property change
 *   for the CSS transition to observe). There is no exit-animation-then-
 *   unmount step — closing sets `open` to false and the component returns
 *   `null` immediately (kept deliberately simple; see NOTES.md "known
 *   gaps").
 * - Accessibility: `role="dialog"`, `aria-modal="true"`,
 *   `aria-labelledby` pointing at the title element (id generated via
 *   `useId`). On open, focus moves to the close button (the first
 *   interactive element in the panel); on close, focus returns to whatever
 *   element had focus immediately before open (typically the trigger
 *   button) via a captured ref. A full Tab-cycling focus trap is NOT
 *   implemented (documented gap in NOTES.md) — this was judged
 *   disproportionate complexity for this Story.
 */
export function SlideOver({ open, onClose, title, children }: SlideOverProps) {
  const titleId = useId();
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);
  // Mount off-screen (translate-x-full) then flip to translate-x-0 on the
  // next frame, so the transition-transform below actually has a state
  // change to animate — a class that is `translate-x-0` from the very first
  // render never visibly slides in, since CSS transitions only animate
  // property changes, not the jump from "unmounted" to a static class.
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    if (!open) return;

    previouslyFocusedRef.current = document.activeElement as HTMLElement | null;
    closeButtonRef.current?.focus();

    const raf = requestAnimationFrame(() => setEntered(true));

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose();
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      cancelAnimationFrame(raf);
      setEntered(false);
      document.removeEventListener('keydown', handleKeyDown);
      previouslyFocusedRef.current?.focus();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  return (
    <>
      <div
        data-testid="slide-over-backdrop"
        aria-hidden="true"
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-slate-900/40 transition-opacity duration-300 ease-out ${
          entered ? 'opacity-100' : 'opacity-0'
        }`}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`fixed inset-y-0 right-0 z-50 flex w-full max-w-xl flex-col bg-white shadow-xl transition-transform duration-300 ease-out ${
          entered ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 id={titleId} className="text-lg font-semibold text-slate-900">
            {title}
          </h2>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <span aria-hidden="true" className="text-xl leading-none">
              &times;
            </span>
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">{children}</div>
      </div>
    </>
  );
}
