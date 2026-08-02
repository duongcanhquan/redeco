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
  nested = false,
  iconOnly = false,
}: {
  href: string;
  icon: ReactNode;
  label: string;
  exact?: boolean;
  nested?: boolean;
  /** Chỉ hiện icon (sidebar thu gọn) */
  iconOnly?: boolean;
}) {
  const pathname = usePathname();
  const isRootWorkspace =
    href === '/platform' || href === '/app' || /^\/[a-z0-9-]+$/i.test(href);
  const active = exact || isRootWorkspace ? pathname === href : pathname.startsWith(href);

  if (iconOnly) {
    return (
      <Link
        href={href}
        prefetch
        aria-current={active ? 'page' : undefined}
        aria-label={label}
        title={label}
        className={`grid size-11 place-items-center rounded-xl transition-colors duration-100 cursor-pointer active:scale-[0.98] mx-auto ${
          active
            ? 'bg-accent-soft text-accent border border-accent/30'
            : 'text-ink-muted hover:bg-glass-strong hover:text-ink border border-transparent'
        }`}
      >
        {icon}
        <span className="sr-only">{label}</span>
      </Link>
    );
  }

  return (
    <Link
      href={href}
      prefetch
      aria-current={active ? 'page' : undefined}
      title={label}
      className={`flex items-start gap-2 rounded-xl text-sm transition-[colors,transform,opacity] duration-100 cursor-pointer active:scale-[0.98] ${
        nested ? 'px-2 py-2 min-h-10' : 'px-2.5 py-2.5 min-h-11 gap-2.5'
      } ${
        active
          ? 'bg-accent-soft text-accent font-semibold border border-accent/30'
          : 'text-ink-muted hover:bg-glass-strong hover:text-ink border border-transparent'
      }`}
    >
      <span className="shrink-0 mt-0.5">{icon}</span>
      <span className="min-w-0 flex-1 leading-snug whitespace-normal break-words">{label}</span>
      <NavPendingHint />
    </Link>
  );
}
