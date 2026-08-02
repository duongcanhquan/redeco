'use client';

import {
  Boxes,
  Calculator,
  ChevronDown,
  Factory,
  LayoutDashboard,
  Settings,
  ShoppingCart,
  UserCog,
  UserRound,
  Warehouse,
} from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { NavLink } from '@/components/platform/nav-link';
import { SignOutButton } from '@/components/platform/sign-out-button';
import { hubTabIcon } from '@/lib/hub-nav-icons';
import type { HubTabDef } from '@/lib/workspace-nav';
import { stripWorkspaceBase } from '@/lib/workspace-nav';

export interface SidebarModuleItem {
  key: string;
  label: string;
  href: string;
  icon: 'sales' | 'kho' | 'sx' | 'kt' | 'other';
  tabs: HubTabDef[];
  comingSoonHint?: string;
}

const MODULE_ICONS: Record<SidebarModuleItem['icon'], ReactNode> = {
  sales: <ShoppingCart size={18} aria-hidden />,
  kho: <Warehouse size={18} aria-hidden />,
  sx: <Factory size={18} aria-hidden />,
  kt: <Calculator size={18} aria-hidden />,
  other: <Boxes size={18} aria-hidden />,
};

function ModuleBlock({
  item,
  base,
  collapsed,
}: {
  item: SidebarModuleItem;
  base: string;
  collapsed: boolean;
}) {
  const pathname = usePathname() ?? '';
  const appPath = stripWorkspaceBase(pathname, base);
  const inModule = appPath === item.href || appPath.startsWith(`${item.href}/`);
  const [open, setOpen] = useState(inModule);

  useEffect(() => {
    if (inModule) setOpen(true);
  }, [inModule]);

  if (item.comingSoonHint) {
    return (
      <span
        title={`${item.label} — ${item.comingSoonHint}`}
        className={`flex items-center rounded-xl text-sm text-ink-muted/50 cursor-not-allowed ${
          collapsed ? 'justify-center size-11 mx-auto' : 'gap-2.5 px-2.5 py-2'
        }`}
      >
        {MODULE_ICONS[item.icon]}
        {!collapsed && <span className="truncate">{item.label}</span>}
      </span>
    );
  }

  const subTabs = item.tabs.filter((t) => t.key !== 'tong-quan');

  if (collapsed) {
    return (
      <NavLink
        href={`${base}${item.href}`}
        label={item.label}
        icon={MODULE_ICONS[item.icon]}
        iconOnly
      />
    );
  }

  return (
    <div className="space-y-0.5">
      <div className="flex items-stretch gap-0.5">
        <div className="min-w-0 flex-1">
          <NavLink
            href={`${base}${item.href}`}
            label={item.label}
            icon={MODULE_ICONS[item.icon]}
          />
        </div>
        {subTabs.length > 0 && (
          <button
            type="button"
            aria-expanded={open}
            aria-label={open ? `Thu gọn ${item.label}` : `Mở rộng ${item.label}`}
            onClick={() => setOpen((v) => !v)}
            className="grid size-10 shrink-0 place-items-center rounded-xl text-ink-muted hover:text-accent hover:bg-glass-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
          >
            <ChevronDown
              size={18}
              aria-hidden
              className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
            />
          </button>
        )}
      </div>
      {open && subTabs.length > 0 && (
        <div className="ml-1 space-y-0.5 border-l border-panel/30 pl-1.5">
          {subTabs.map((t) => (
            <NavLink
              key={t.key}
              href={`${base}${t.path}`}
              label={t.label}
              icon={hubTabIcon(t.key, 15)}
              nested
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function SidebarNav({
  base,
  isManager,
  modules,
  loginRedirect,
  collapsed = false,
}: {
  base: string;
  isManager: boolean;
  modules: SidebarModuleItem[];
  loginRedirect: string;
  collapsed?: boolean;
}) {
  return (
    <nav
      aria-label="Điều hướng workspace"
      className={`flex flex-col gap-0.5 pb-4 pt-1 ${collapsed ? 'px-1.5' : 'px-2.5'}`}
    >
      <NavLink
        href={base}
        exact
        label="Tổng quan"
        icon={<LayoutDashboard size={18} aria-hidden />}
        iconOnly={collapsed}
      />

      {modules.length > 0 && (
        <>
          {!collapsed && (
            <p className="px-2.5 pt-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
              Phân hệ
            </p>
          )}
          {collapsed && <div className="my-1.5 h-px bg-panel/40 mx-2" aria-hidden />}
          {modules.map((m) => (
            <ModuleBlock key={m.key} item={m} base={base} collapsed={collapsed} />
          ))}
        </>
      )}

      {!collapsed ? (
        <p className="px-2.5 pt-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
          Công ty
        </p>
      ) : (
        <div className="my-1.5 h-px bg-panel/40 mx-2" aria-hidden />
      )}
      {isManager && (
        <NavLink
          href={`${base}/members`}
          label="Thành viên"
          icon={<UserCog size={18} aria-hidden />}
          iconOnly={collapsed}
        />
      )}
      <NavLink
        href={`${base}/settings`}
        label="Cài đặt"
        icon={<Settings size={18} aria-hidden />}
        iconOnly={collapsed}
      />
      <NavLink
        href={`${base}/account`}
        label="Tài khoản"
        icon={<UserRound size={18} aria-hidden />}
        iconOnly={collapsed}
      />

      <div className="mt-2 border-t border-panel/40 pt-2">
        {collapsed ? (
          <SignOutButton redirectTo={loginRedirect} iconOnly />
        ) : (
          <SignOutButton redirectTo={loginRedirect} />
        )}
      </div>
    </nav>
  );
}
