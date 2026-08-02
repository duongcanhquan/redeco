'use client';

import { Menu, X } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useId, useState } from 'react';

const LINKS = [
  { href: '#noi-dau', label: 'Vấn đề' },
  { href: '#modules', label: 'Nền tảng' },
  { href: '#ca-nhan-hoa', label: 'Cá nhân hóa' },
  { href: '#ai', label: 'AI' },
  { href: '#quy-trinh', label: 'Quy trình' },
] as const;

/** Menu hamburger trang chủ — chỉ hiện dưới md. */
export function LandingMobileNav() {
  const [open, setOpen] = useState(false);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open]);

  return (
    <div className="md:hidden">
      <button
        type="button"
        aria-label={open ? 'Đóng menu' : 'Mở menu'}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
        className="grid size-11 place-items-center rounded-xl text-ink hover:bg-glass-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
      >
        {open ? <X size={22} aria-hidden /> : <Menu size={22} aria-hidden />}
      </button>

      {open && (
        <>
          <button
            type="button"
            aria-label="Đóng menu"
            onClick={() => setOpen(false)}
            className="fixed inset-0 top-[4.5rem] z-40 bg-black/50 backdrop-blur-sm"
          />
          <nav
            id={panelId}
            aria-label="Menu trang chủ"
            className="absolute left-0 right-0 top-full z-50 mt-2 rounded-2xl border border-panel/40 bg-app-deep/95 p-2 shadow-xl backdrop-blur-md"
          >
            {LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="flex min-h-11 items-center rounded-xl px-4 text-sm text-ink-muted transition-colors hover:bg-glass-strong hover:text-ink"
              >
                {l.label}
              </a>
            ))}
            <Link
              href="/login"
              onClick={() => setOpen(false)}
              className="mt-1 flex min-h-11 items-center justify-center rounded-xl bg-accent px-4 text-sm font-semibold text-app"
            >
              Đăng nhập
            </Link>
          </nav>
        </>
      )}
    </div>
  );
}
