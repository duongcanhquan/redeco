'use client';

import { CircleHelp, X } from 'lucide-react';
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';

/**
 * Nút ? — mở hướng dẫn ngắn (popup). Dùng thay đoạn mô tả dài trên màn hình.
 */
export function HelpTip({
  title,
  children,
  label = 'Xem hướng dẫn',
}: {
  title: string;
  children: ReactNode;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <span className="relative inline-flex align-middle">
      <button
        ref={btnRef}
        type="button"
        className="inline-grid size-11 place-items-center rounded-full border border-panel/50 text-ink-muted hover:text-accent hover:border-accent/40 transition-colors cursor-pointer"
        aria-label={label}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
      >
        <CircleHelp size={18} aria-hidden />
      </button>

      {open && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-[40] cursor-default bg-app/40"
            aria-label="Đóng hướng dẫn"
            onClick={() => setOpen(false)}
          />
          <div
            id={panelId}
            role="dialog"
            aria-modal="true"
            aria-labelledby={`${panelId}-title`}
            className="absolute left-0 sm:left-auto sm:right-0 top-full mt-2 z-[50] w-[min(20rem,calc(100vw-2rem))] rounded-2xl border border-panel/50 bg-app-deep p-4 shadow-lg"
          >
            <div className="flex items-start justify-between gap-2 mb-2">
              <p id={`${panelId}-title`} className="font-semibold text-sm leading-snug">
                {title}
              </p>
              <button
                type="button"
                className="grid size-9 shrink-0 place-items-center rounded-lg text-ink-muted hover:text-ink cursor-pointer"
                aria-label="Đóng"
                onClick={() => {
                  setOpen(false);
                  btnRef.current?.focus();
                }}
              >
                <X size={16} aria-hidden />
              </button>
            </div>
            <div className="text-sm text-ink-muted space-y-2 leading-relaxed">{children}</div>
          </div>
        </>
      )}
    </span>
  );
}
