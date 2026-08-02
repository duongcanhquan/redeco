'use client';

import { Menu, X } from 'lucide-react';
import { useEffect, useId, useState, type ReactNode } from 'react';
import { LogoMark } from '@/components/brand/logo';

function useIsDesktopNav() {
  const [isDesktop, setIsDesktop] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const sync = () => setIsDesktop(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);
  return isDesktop;
}

/**
 * Shell workspace/platform: desktop = sidebar cố định;
 * điện thoại = thanh trên gọn + menu hamburger (drawer).
 */
export function AppShell({
  title,
  subtitle,
  renderNav,
  children,
}: {
  title: string;
  subtitle: ReactNode;
  renderNav: (ctx: { onNavigate: () => void }) => ReactNode;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const isDesktop = useIsDesktopNav();
  const panelId = useId();
  const close = () => setOpen(false);
  const drawerOpen = open || isDesktop;

  useEffect(() => {
    if (!open || isDesktop) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, isDesktop]);

  return (
    <div className="flex min-h-dvh flex-col lg:flex-row bg-app">
      {/* Thanh trên — chỉ điện thoại / tablet hẹp */}
      <header className="sticky top-0 z-40 flex items-center gap-3 border-b border-panel/40 bg-app-deep/90 px-3 py-2.5 backdrop-blur-md lg:hidden no-print">
        <button
          type="button"
          aria-label="Mở menu"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen(true)}
          className="grid size-11 shrink-0 place-items-center rounded-xl text-ink hover:bg-glass-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
        >
          <Menu size={22} aria-hidden />
        </button>
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          <LogoMark size={32} />
          <div className="min-w-0">
            <p className="truncate text-sm font-bold leading-tight tracking-wide">{title}</p>
            <p className="truncate text-[11px] text-ink-muted">{subtitle}</p>
          </div>
        </div>
      </header>

      {/* Overlay drawer mobile */}
      {open && !isDesktop && (
        <button
          type="button"
          aria-label="Đóng menu"
          onClick={close}
          className="fixed inset-0 z-50 bg-black/55 backdrop-blur-sm lg:hidden"
        />
      )}

      {/* Sidebar desktop + drawer mobile */}
      <aside
        id={panelId}
        aria-label="Menu điều hướng"
        aria-hidden={drawerOpen ? undefined : true}
        className={`glass no-print fixed inset-y-0 left-0 z-50 flex w-[min(18rem,88vw)] flex-col border-r border-panel/40 bg-app-deep/95 transition-transform duration-200 ease-out lg:static lg:z-auto lg:h-dvh lg:w-64 lg:shrink-0 lg:translate-x-0 lg:pointer-events-auto lg:sticky lg:top-0 ${
          open
            ? 'translate-x-0 pointer-events-auto'
            : '-translate-x-full pointer-events-none lg:translate-x-0'
        }`}
      >
        <div className="flex items-center gap-3 px-4 py-4 lg:px-5 lg:py-5">
          <LogoMark size={40} />
          <div className="min-w-0 flex-1">
            <p className="truncate font-bold leading-tight tracking-wide">{title}</p>
            <p className="truncate text-xs text-ink-muted">{subtitle}</p>
          </div>
          <button
            type="button"
            aria-label="Đóng menu"
            onClick={close}
            className="grid size-11 shrink-0 place-items-center rounded-xl text-ink-muted hover:bg-glass-strong hover:text-ink lg:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
          >
            <X size={20} aria-hidden />
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain">
          {renderNav({ onNavigate: close })}
        </div>
      </aside>

      <main className="mx-auto w-full max-w-7xl flex-1 px-3 py-4 sm:px-6 sm:py-6 lg:px-10 lg:py-8">
        {children}
      </main>
    </div>
  );
}
