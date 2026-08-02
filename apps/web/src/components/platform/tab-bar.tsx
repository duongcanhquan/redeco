'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { NavPendingHint } from '@/components/platform/nav-pending';

export interface TabItem {
  key: string;
  label: string;
  icon: ReactNode;
  href: string;
  /** Số đếm hiển thị cạnh nhãn (vd số công ty, số hợp đồng). */
  count?: number;
}

/**
 * Thanh tab responsive: desktop/iPad hiện đủ nhãn + icon,
 * điện thoại cuộn ngang mượt, tab active nổi bật kiểu glass.
 * Prefetch + pending hint để bấm chuyển tab cảm giác tức thì.
 */
export function TabBar({ items, activeKey }: { items: TabItem[]; activeKey: string }) {
  return (
    <nav
      aria-label="Các tab nội dung"
      className="glass rounded-2xl p-1.5 flex gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {items.map((item) => {
        const active = item.key === activeKey;
        return (
          <Link
            key={item.key}
            href={item.href}
            prefetch
            aria-current={active ? 'page' : undefined}
            className={`inline-flex min-h-11 items-center gap-2 rounded-xl px-3.5 py-2.5 text-sm whitespace-nowrap transition-[colors,transform] duration-100 active:scale-[0.98] ${
              active
                ? 'bg-accent-soft text-accent font-semibold border border-accent/30'
                : 'text-ink-muted hover:text-ink hover:bg-glass-strong border border-transparent'
            }`}
          >
            {item.icon}
            <span>{item.label}</span>
            {item.count !== undefined && (
              <span
                className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                  active ? 'bg-accent/20 text-accent' : 'bg-glass text-ink-muted'
                }`}
              >
                {item.count}
              </span>
            )}
            <NavPendingHint />
          </Link>
        );
      })}
    </nav>
  );
}
