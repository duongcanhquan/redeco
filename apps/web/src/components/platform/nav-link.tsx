'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

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
  // Workspace gốc /{slug} cũng chỉ active khi khớp exact (tránh highlight cả cây /{slug}/…).
  const isRootWorkspace =
    href === '/platform' || href === '/app' || /^\/[a-z0-9-]+$/i.test(href);
  const active = exact || isRootWorkspace ? pathname === href : pathname.startsWith(href);

  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors duration-200 cursor-pointer whitespace-nowrap ${
        active
          ? 'bg-accent-soft text-accent font-semibold border border-accent/30'
          : 'text-ink-muted hover:bg-glass-strong hover:text-ink border border-transparent'
      }`}
    >
      {icon}
      <span>{label}</span>
    </Link>
  );
}
