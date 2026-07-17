import { TextareaHTMLAttributes, forwardRef } from 'react';

/** Thin styled wrapper around the native <textarea> — mirrors TextInput
 * exactly (same classes, same ref-forwarding for react-hook-form's
 * `register`), for free-text fields that need more than one line (issue
 * #30, LogFollowupForm's remarks field). */
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea({ className = '', rows = 4, ...props }, ref) {
    return (
      <textarea
        ref={ref}
        rows={rows}
        className={
          'block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm ' +
          'text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-brand-500 ' +
          'focus:outline-none focus:ring-2 focus:ring-brand-500/30 ' +
          'disabled:cursor-not-allowed disabled:bg-slate-100 ' +
          `${className}`
        }
        {...props}
      />
    );
  },
);
