import { ButtonHTMLAttributes, forwardRef } from 'react';

type Variant = 'primary' | 'secondary';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

const base =
  'inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-semibold ' +
  'shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ' +
  'disabled:cursor-not-allowed disabled:opacity-60';

const variantStyles: Record<Variant, string> = {
  primary: 'bg-brand-600 text-white hover:bg-brand-700 focus:ring-brand-500',
  secondary:
    'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 focus:ring-brand-500',
};

/** Exposed so non-<button> elements (e.g. a react-router <Link> styled as a
 * primary action) can share the exact same visual treatment without
 * duplicating Tailwind class strings. */
export const buttonStyles = { base, ...variantStyles };

/** Thin styled wrapper around the native <button>. Forwards every prop
 * (type, disabled, onClick, aria-*, etc.) untouched so accessible role/name
 * and existing behavior are fully preserved — only appearance changes. */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', className = '', ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      className={`${base} ${variantStyles[variant]} ${className}`.trim()}
      {...props}
    />
  );
});
