'use client';

import { Menu, PanelLeftClose, PanelLeftOpen, X } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { LogoMark } from '@/components/brand/logo';
import {
  SidebarNav,
  type SidebarModuleItem,
} from '@/components/workspace/sidebar-nav';

const STORAGE_KEY = 'optimake.sidebar.collapsed';

export function WorkspaceShell({
  companyName,
  base,
  isManager,
  modules,
  loginRedirect,
  children,
}: {
  companyName: string;
  base: string;
  isManager: boolean;
  modules: SidebarModuleItem[];
  loginRedirect: string;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(STORAGE_KEY) === '1');
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileOpen]);

  const toggleCollapsed = (): void => {
    setCollapsed((v) => {
      const next = !v;
      try {
        localStorage.setItem(STORAGE_KEY, next ? '1' : '0');
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  return (
    <div className="flex min-h-dvh flex-col bg-app lg:flex-row">
      {/* Thanh trên — phone / tablet */}
      <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b border-panel/40 bg-app-deep/90 px-3 backdrop-blur-md lg:hidden no-print">
        <button
          type="button"
          aria-expanded={mobileOpen}
          aria-controls="workspace-mobile-nav"
          aria-label={mobileOpen ? 'Đóng menu' : 'Mở menu'}
          onClick={() => setMobileOpen((v) => !v)}
          className="grid size-11 place-items-center rounded-xl text-ink hover:bg-glass-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
        >
          {mobileOpen ? <X size={22} aria-hidden /> : <Menu size={22} aria-hidden />}
        </button>
        <LogoMark size={32} />
        <p className="min-w-0 flex-1 truncate text-sm font-bold">{companyName}</p>
      </header>

      {/* Overlay mobile */}
      {mobileOpen && (
        <button
          type="button"
          aria-label="Đóng menu"
          className="fixed inset-0 z-40 bg-app/70 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Drawer mobile / tablet */}
      <aside
        id="workspace-mobile-nav"
        className={`fixed inset-y-0 left-0 z-50 flex w-[min(18rem,88vw)] flex-col border-r border-panel/40 bg-app-deep shadow-xl transition-transform duration-200 ease-out lg:hidden no-print ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex shrink-0 items-center gap-2.5 px-3 py-3.5 border-b border-panel/40">
          <LogoMark size={32} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold">{companyName}</p>
            <p className="text-[11px] text-ink-muted">
              <span className="text-accent">O</span>ptimake
            </p>
          </div>
          <button
            type="button"
            aria-label="Đóng menu"
            onClick={() => setMobileOpen(false)}
            className="grid size-11 place-items-center rounded-xl text-ink-muted hover:text-ink hover:bg-glass-strong"
          >
            <X size={20} aria-hidden />
          </button>
        </div>
        <SidebarNav
          base={base}
          isManager={isManager}
          modules={modules}
          loginRedirect={loginRedirect}
          collapsed={false}
        />
      </aside>

      {/* Sidebar desktop */}
      <aside
        className={`glass sticky top-0 z-20 hidden h-dvh shrink-0 flex-col border-r border-panel/40 bg-app-deep/60 no-print lg:flex transition-[width] duration-200 ease-out ${
          collapsed ? 'w-[4.25rem]' : 'w-56 xl:w-60'
        }`}
      >
        <div
          className={`flex shrink-0 items-center gap-2 border-b border-panel/30 ${
            collapsed ? 'flex-col px-1.5 py-3' : 'px-3 py-3.5'
          }`}
        >
          <LogoMark size={collapsed ? 32 : 36} />
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold sm:text-base">{companyName}</p>
              <p className="text-[11px] text-ink-muted">
                <span className="text-accent">O</span>ptimake
              </p>
            </div>
          )}
          <button
            type="button"
            onClick={toggleCollapsed}
            aria-label={collapsed ? 'Mở rộng menu' : 'Thu gọn menu'}
            aria-pressed={collapsed}
            className="grid size-10 shrink-0 place-items-center rounded-xl text-ink-muted hover:text-accent hover:bg-glass-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
          >
            {collapsed ? (
              <PanelLeftOpen size={18} aria-hidden />
            ) : (
              <PanelLeftClose size={18} aria-hidden />
            )}
          </button>
        </div>
        <SidebarNav
          base={base}
          isManager={isManager}
          modules={modules}
          loginRedirect={loginRedirect}
          collapsed={collapsed}
        />
      </aside>

      <main className="min-w-0 flex-1 px-3 py-3 sm:px-4 sm:py-4 md:px-5 md:py-5 lg:px-6 lg:py-5 xl:px-8 max-w-[90rem] w-full mx-auto">
        {children}
      </main>
    </div>
  );
}
