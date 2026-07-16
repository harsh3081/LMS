import { ReactNode } from 'react';

export interface FormFieldProps {
  /** Visible label text. */
  label: string;
  /** Must match the wrapped control's `id` — preserves the exact
   * label→control association the existing tests rely on
   * (getByLabel/getByLabelText). */
  htmlFor: string;
  /** Field-level validation error message, rendered with role="alert"
   * exactly as before this restyle. */
  error?: string;
  children: ReactNode;
}

/** Layout-only wrapper: label + control + inline error, consistently
 * spaced. Does not alter the label/control DOM relationship (still a plain
 * <label htmlFor> next to the control), so accessible name resolution is
 * unaffected. */
export function FormField({ label, htmlFor, error, children }: FormFieldProps) {
  return (
    <div className="mb-4">
      <label htmlFor={htmlFor} className="mb-1 block text-sm font-medium text-slate-700">
        {label}
      </label>
      {children}
      {error && (
        <span role="alert" className="mt-1 block text-sm text-red-600">
          {error}
        </span>
      )}
    </div>
  );
}
