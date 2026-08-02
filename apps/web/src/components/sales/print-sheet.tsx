import type { ReactNode } from 'react';
import { PrintToolbar } from './print-toolbar';

export function PrintSheet({
  docTitle,
  docCode,
  companyName,
  meta,
  children,
  footer,
}: {
  docTitle: string;
  docCode: string;
  companyName: string;
  meta: { label: string; value: string }[];
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="max-w-3xl mx-auto">
      <PrintToolbar title={`${docTitle} ${docCode}`} />
      <article className="print-sheet space-y-5">
        <header className="flex flex-wrap justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <p className="text-xs uppercase tracking-wider text-slate-500">Optimake</p>
            <p className="text-lg font-bold print-accent">{companyName}</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-semibold text-slate-500">{docTitle}</p>
            <p className="text-xl font-bold font-mono">{docCode}</p>
          </div>
        </header>

        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
          {meta.map((m) => (
            <div key={m.label}>
              <dt className="text-slate-500">{m.label}</dt>
              <dd className="font-medium">{m.value}</dd>
            </div>
          ))}
        </dl>

        {children}

        {footer && <footer className="pt-4 border-t border-slate-200 text-sm">{footer}</footer>}

        <p className="text-[11px] text-slate-400 pt-6">
          In từ Optimake · {new Date().toLocaleString('vi-VN')}
        </p>
      </article>
    </div>
  );
}
