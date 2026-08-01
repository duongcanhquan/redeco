'use client';

import { X } from 'lucide-react';
import { useEffect, type ReactNode } from 'react';

export function Modal({
  title,
  icon,
  open,
  onClose,
  children,
  wide = false,
}: {
  title: string;
  icon?: ReactNode;
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  /** Modal rộng cho form có bảng dòng hàng (báo giá, đơn hàng). */
  wide?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <button
        type="button"
        aria-label="Đóng"
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm cursor-default"
      />
      <div
        className={`glass relative w-full ${wide ? 'sm:max-w-3xl' : 'sm:max-w-lg'} max-h-[92dvh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-app-deep/90 p-6 shadow-2xl`}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-semibold text-lg flex items-center gap-2">
            {icon}
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng hộp thoại"
            className="grid size-9 place-items-center rounded-xl text-ink-muted hover:bg-glass-strong hover:text-ink transition-colors cursor-pointer"
          >
            <X size={18} aria-hidden />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/** Input chuẩn cho form trong console. */
export function Field({
  id,
  label,
  hint,
  required,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm text-ink-muted mb-1.5">
        {label} {required && <span className="text-danger">*</span>}
      </label>
      {children}
      {hint && <p className="mt-1 text-xs text-ink-muted">{hint}</p>}
    </div>
  );
}

export const inputClass =
  'w-full h-11 rounded-xl bg-app/70 border border-panel/60 px-3.5 text-sm text-ink outline-none transition-colors focus:border-accent focus-visible:outline-2 focus-visible:outline-accent disabled:opacity-50';
