'use client';

import Link from 'next/link';
import { NavPendingHint } from '@/components/platform/nav-pending';

const SECTIONS = [
  { key: 'filters', label: 'Bộ lọc báo giá' },
  { key: 'calc', label: 'Tính toán báo giá' },
] as const;

export type SettingsSection = (typeof SECTIONS)[number]['key'];

export function SettingsSubTabs({
  hubBase,
  section,
}: {
  hubBase: string;
  section: SettingsSection;
}) {
  return (
    <nav
      aria-label="Phần cài đặt"
      className="rounded-xl border border-panel/40 bg-panel/20 p-1 overflow-x-auto"
    >
      <div className="flex min-w-max gap-0.5">
        {SECTIONS.map((s) => {
          const active = section === s.key;
          return (
            <Link
              key={s.key}
              href={`${hubBase}?tab=settings&section=${s.key}`}
              prefetch
              aria-current={active ? 'page' : undefined}
              className={`inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-lg px-3.5 text-sm font-semibold transition-[colors,transform] duration-100 active:scale-[0.98] ${
                active
                  ? 'bg-accent-soft text-accent border border-accent/30'
                  : 'text-ink-muted hover:bg-glass hover:text-ink border border-transparent'
              }`}
            >
              {s.label}
              <NavPendingHint />
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
