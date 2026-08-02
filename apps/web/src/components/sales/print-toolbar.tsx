'use client';

import { Printer } from 'lucide-react';
import { useEffect } from 'react';

/** Thanh in trên trang chứng từ — tự mở hộp thoại in khi ?autoprint=1 */
export function PrintToolbar({ title }: { title: string }) {
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    if (q.get('autoprint') === '1') {
      const t = window.setTimeout(() => window.print(), 300);
      return () => window.clearTimeout(t);
    }
    return undefined;
  }, []);

  return (
    <div className="no-print mb-4 flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-ink-muted">{title}</p>
      <button
        type="button"
        onClick={() => window.print()}
        className="inline-flex items-center gap-2 h-11 px-4 rounded-xl bg-accent font-semibold text-app focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
      >
        <Printer size={16} aria-hidden />
        In / Lưu PDF
      </button>
    </div>
  );
}
