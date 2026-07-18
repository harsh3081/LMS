import { InputHTMLAttributes, forwardRef } from 'react';

/** Thin styled wrapper around a native `<input type="checkbox">` — mirrors
 * Textarea.tsx's precedent (issue #30: a small new UI atom, not a heavy new
 * dependency) for issue #114's consent checkbox. Forwards the ref (needed by
 * react-hook-form's `register`) and every prop untouched, so label
 * associations (`htmlFor`/`id`) and form behavior are unaffected. Unlike
 * TextInput/Select, the caller is expected to render its own adjacent label
 * text (a checkbox's label is usually long-form, e.g. a consent statement) —
 * this component renders only the input control itself. */
export const Checkbox = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Checkbox({ className = '', ...props }, ref) {
    return (
      <input
        ref={ref}
        type="checkbox"
        className={
          'h-4 w-4 rounded border border-slate-300 text-brand-600 shadow-sm ' +
          'focus:outline-none focus:ring-2 focus:ring-brand-500/30 ' +
          'disabled:cursor-not-allowed disabled:bg-slate-100 ' +
          `${className}`
        }
        {...props}
      />
    );
  },
);
