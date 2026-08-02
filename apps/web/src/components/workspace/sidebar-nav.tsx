'use client';

import {
  Boxes,
  Calculator,
  Factory,
  LayoutDashboard,
  Settings,
  ShoppingCart,
  UserCog,
  UserRound,
  Warehouse,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { NavLink } from '@/components/platform/nav-link';
import { SignOutButton } from '@/components/platform/sign-out-button';
import type { HubTabDef } from '@/lib/workspace-nav';

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

  return (
    <NavLink
      href={`${base}${item.href}`}
      label={item.label}
      icon={MODULE_ICONS[item.icon]}
      iconOnly={collapsed}
    />
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

      <div className={`mt-2 pt-2 border-t border-panel/40 ${collapsed ? '' : ''}`}>
        {collapsed ? (
          <SignOutButton redirectTo={loginRedirect} iconOnly />
        ) : (
          <SignOutButton redirectTo={loginRedirect} />
        )}
      </div>
    </nav>
  );
}
