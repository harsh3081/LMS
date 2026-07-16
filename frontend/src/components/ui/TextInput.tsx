import { InputHTMLAttributes, forwardRef } from 'react';

/** Thin styled wrapper around the native <input>. Forwards the ref (needed
 * by react-hook-form's `register`) and every prop — id/name/onChange/onBlur
 * are untouched, so label associations and form behavior are unaffected. */
export const TextInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function TextInput({ className = '', ...props }, ref) {
    return (
      <input
        ref={ref}
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
