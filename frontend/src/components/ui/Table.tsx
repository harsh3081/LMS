import {
  HTMLAttributes,
  TableHTMLAttributes,
  TdHTMLAttributes,
  ThHTMLAttributes,
} from 'react';

/** Thin styled wrappers around native table elements. Every wrapper spreads
 * its props onto the underlying element untouched (aria-label, key, etc.),
 * so table/row/columnheader/cell roles and accessible names are unaffected
 * — only visual styling is added. Wrapped in an overflow-x-auto container
 * for basic responsiveness on narrow viewports. */
export function Table({ className = '', ...props }: TableHTMLAttributes<HTMLTableElement>) {
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 shadow-card">
      <table className={`min-w-full divide-y divide-slate-200 text-sm ${className}`.trim()} {...props} />
    </div>
  );
}

export function TableHead(props: HTMLAttributes<HTMLTableSectionElement>) {
  return <thead className="bg-slate-50" {...props} />;
}

export function TableBody(props: HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className="divide-y divide-slate-100 bg-white" {...props} />;
}

export function TableRow(props: HTMLAttributes<HTMLTableRowElement>) {
  return <tr className="hover:bg-slate-50" {...props} />;
}

export function TableHeaderCell({
  className = '',
  ...props
}: ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      scope="col"
      className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 ${className}`.trim()}
      {...props}
    />
  );
}

export function TableCell({ className = '', ...props }: TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={`px-4 py-3 text-slate-700 ${className}`.trim()} {...props} />;
}
