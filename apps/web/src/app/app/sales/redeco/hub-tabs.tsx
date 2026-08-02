'use client';

import Link from 'next/link';
import { NavPendingHint } from '@/components/platform/nav-pending';

export type HubTabItem = { key: string; label: string; href: string };

/** Tab hub REDECO — prefetch + hint pending để cảm giác bấm tức thì. */
export function RedecoHubTabs({
  items,
  activeKey,
}: {
  items: readonly HubTabItem[];
  activeKey: string;
}) {
  return (
    <nav
      aria-label="Tab Kinh doanh.REDECO"
      className="rounded-2xl border border-accent/25 bg-secondary/80 p-1 shadow-sm overflow-x-auto"
    >
      <div className="flex min-w-max gap-0.5" role="tablist">
        {items.map((t) => {
          const active = activeKey === t.key;
          return (
            <Link
              key={t.key}
              role="tab"
              aria-selected={active}
              href={t.href}
              prefetch
              className={`inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-xl px-3.5 text-sm font-semibold transition-[colors,transform] duration-100 active:scale-[0.98] ${
                active
                  ? 'bg-accent text-app shadow-sm'
                  : 'text-ink-muted hover:bg-glass hover:text-ink'
              }`}
            >
              {t.label}
              <NavPendingHint />
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
