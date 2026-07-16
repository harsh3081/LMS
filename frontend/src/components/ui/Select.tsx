import { SelectHTMLAttributes, forwardRef } from 'react';

/** Thin styled wrapper around the native <select>. Forwards the ref (needed
 * by react-hook-form's `register`), id/name/onChange/onBlur and children
 * (<option> elements) untouched. */
export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  function Select({ className = '', ...props }, ref) {
    return (
      <select
        ref={ref}
        className={
          'block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm ' +
          'text-slate-900 shadow-sm focus:border-brand-500 focus:outline-none ' +
          'focus:ring-2 focus:ring-brand-500/30 disabled:cursor-not-allowed disabled:bg-slate-100 ' +
          `${className}`
        }
        {...props}
      />
    );
  },
);
