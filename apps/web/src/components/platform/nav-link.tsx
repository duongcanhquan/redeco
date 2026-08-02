'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { NavPendingHint } from '@/components/platform/nav-pending';

export function NavLink({
  href,
  icon,
  label,
  exact = false,
}: {
  href: string;
  icon: ReactNode;
  label: string;
  /** Route gốc của khu vực (vd /{slug}, /platform) chỉ active khi khớp chính xác */
  exact?: boolean;
}) {
  const pathname = usePathname();
  const isRootWorkspace =
    href === '/platform' || href === '/app' || /^\/[a-z0-9-]+$/i.test(href);
  const active = exact || isRootWorkspace ? pathname === href : pathname.startsWith(href);

  return (
    <Link
      href={href}
      prefetch
      aria-current={active ? 'page' : undefined}
      className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-[colors,transform,opacity] duration-100 cursor-pointer whitespace-nowrap active:scale-[0.98] ${
        active
          ? 'bg-accent-soft text-accent font-semibold border border-accent/30'
          : 'text-ink-muted hover:bg-glass-strong hover:text-ink border border-transparent'
      }`}
    >
      {icon}
      <span className="min-w-0 truncate">{label}</span>
      <NavPendingHint />
    </Link>
  );
}
