'use client';

import {
  Boxes,
  Calculator,
  ChevronDown,
  ChevronRight,
  Factory,
  LayoutDashboard,
  Settings,
  ShoppingCart,
  UserCog,
  UserRound,
  Warehouse,
} from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import { NavLink } from '@/components/platform/nav-link';
import { SignOutButton } from '@/components/platform/sign-out-button';
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
  isManager,
}: {
  item: SidebarModuleItem;
  base: string;
  isManager: boolean;
}) {
  const pathname = usePathname() ?? '';
  const appPath = stripWorkspaceBase(pathname, base);
  const inModule = appPath === item.href || appPath.startsWith(`${item.href}/`);
  const [open, setOpen] = useState(inModule);

  if (item.comingSoonHint) {
    return (
      <span
        title={item.comingSoonHint}
        className="flex flex-col gap-0.5 rounded-xl px-3 py-2.5 text-sm text-ink-muted/60 cursor-not-allowed"
      >
        <span className="flex items-center gap-3">
          {MODULE_ICONS[item.icon]}
          <span>{item.label}</span>
        </span>
        <span className="pl-8 text-[11px] text-ink-muted/45 truncate">{item.comingSoonHint}</span>
      </span>
    );
  }

  const subTabs = item.tabs.filter((t) => t.key !== 'tong-quan');

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
        {isManager && subTabs.length > 0 && (
          <button
            type="button"
            aria-expanded={open}
            aria-label={open ? `Thu gọn ${item.label}` : `Mở rộng ${item.label}`}
            onClick={() => setOpen((v) => !v)}
            className="grid size-11 shrink-0 place-items-center rounded-xl text-ink-muted hover:text-accent hover:bg-glass-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
          >
            <ChevronDown
              size={18}
              aria-hidden
              className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
            />
          </button>
        )}
      </div>
      {isManager && open && subTabs.length > 0 && (
        <div className="ml-3 pl-2 border-l border-panel/40 space-y-0.5">
          {subTabs.map((t) => (
            <NavLink
              key={t.key}
              href={`${base}${t.path}`}
              label={t.label}
              icon={<ChevronRight size={14} className="text-ink-muted/50" aria-hidden />}
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
}: {
  base: string;
  isManager: boolean;
  modules: SidebarModuleItem[];
  loginRedirect: string;
}) {
  return (
    <nav
      aria-label="Điều hướng workspace"
      className="flex lg:flex-col gap-1.5 px-4 pb-4 overflow-x-auto lg:overflow-visible lg:flex-1"
    >
      <NavLink
        href={base}
        exact
        label="Tổng quan"
        icon={<LayoutDashboard size={18} aria-hidden />}
      />

      {modules.length > 0 && (
        <>
          <p className="hidden lg:block px-3 pt-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
            Phân hệ
          </p>
          {modules.map((m) => (
            <ModuleBlock key={m.key} item={m} base={base} isManager={isManager} />
          ))}
        </>
      )}

      <p className="hidden lg:block px-3 pt-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
        Công ty
      </p>
      {isManager && (
        <NavLink
          href={`${base}/members`}
          label="Thành viên"
          icon={<UserCog size={18} aria-hidden />}
        />
      )}
      <NavLink
        href={`${base}/settings`}
        label="Cài đặt"
        icon={<Settings size={18} aria-hidden />}
      />
      <NavLink
        href={`${base}/account`}
        label="Tài khoản"
        icon={<UserRound size={18} aria-hidden />}
      />

      <div className="hidden lg:block lg:mt-auto lg:pt-4 lg:border-t lg:border-panel/40">
        <SignOutButton redirectTo={loginRedirect} />
      </div>
    </nav>
  );
}
