'use client';

import { Building2, LayoutDashboard, UserRound } from 'lucide-react';
import { NavLink } from '@/components/platform/nav-link';
import { SignOutButton } from '@/components/platform/sign-out-button';

const NAV_ITEMS = [
  { href: '/platform', label: 'Tổng quan', icon: LayoutDashboard, exact: true },
  { href: '/platform/companies', label: 'Khách hàng', icon: Building2, exact: false },
  { href: '/platform/account', label: 'Tài khoản', icon: UserRound, exact: false },
] as const;

export function PlatformNav({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav aria-label="Điều hướng quản trị" className="flex flex-1 flex-col gap-1 px-3 pb-4">
      {NAV_ITEMS.map(({ href, label, icon: Icon, exact }) => (
        <NavLink
          key={href}
          href={href}
          label={label}
          exact={exact}
          icon={<Icon size={18} aria-hidden />}
          onNavigate={onNavigate}
        />
      ))}
      <div className="mt-auto border-t border-panel/40 pt-3">
        <SignOutButton />
      </div>
    </nav>
  );
}
