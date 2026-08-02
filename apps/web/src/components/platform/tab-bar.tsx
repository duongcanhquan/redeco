'use client';

import { ChevronDown } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';

export interface TabItem {
  key: string;
  label: string;
  icon: ReactNode;
  href: string;
  /** Số đếm hiển thị cạnh nhãn (vd số công ty, số hợp đồng). */
  count?: number;
}

/**
 * Thanh tab: điện thoại = dropdown 1 hàng (tiết kiệm diện tích);
 * tablet/desktop = hàng chip cuộn ngang.
 */
export function TabBar({ items, activeKey }: { items: TabItem[]; activeKey: string }) {
  const router = useRouter();
  const active = items.find((i) => i.key === activeKey) ?? items[0];

  if (items.length === 0) return null;

  return (
    <>
      {/* Phone: chọn mục bằng select — rõ, một chạm, không chiếm chiều cao */}
      <div className="relative md:hidden">
        <label htmlFor="hub-tab-select" className="sr-only">
          Chọn mục trong phân hệ
        </label>
        <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-accent">
          {active?.icon}
        </div>
        <select
          id="hub-tab-select"
          value={activeKey}
          aria-label="Chọn mục trong phân hệ"
          onChange={(e) => {
            const next = items.find((i) => i.key === e.target.value);
            if (next) router.push(next.href);
          }}
          className="glass w-full min-h-11 appearance-none rounded-2xl border border-panel/40 bg-app-deep/80 py-2.5 pl-11 pr-10 text-sm font-medium text-ink outline-none focus:border-accent focus-visible:ring-2 focus-visible:ring-accent/50"
        >
          {items.map((item) => (
            <option key={item.key} value={item.key}>
              {item.count !== undefined ? `${item.label} (${item.count})` : item.label}
            </option>
          ))}
        </select>
        <ChevronDown
          size={18}
          aria-hidden
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted"
        />
      </div>

      {/* Tablet / desktop */}
      <nav
        aria-label="Các tab nội dung"
        className="glass hidden rounded-2xl p-1.5 md:flex gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {items.map((item) => {
          const isActive = item.key === activeKey;
          return (
            <Link
              key={item.key}
              href={item.href}
              aria-current={isActive ? 'page' : undefined}
              className={`inline-flex min-h-11 items-center gap-2 rounded-xl px-3.5 py-2.5 text-sm whitespace-nowrap transition-colors ${
                isActive
                  ? 'bg-accent-soft text-accent font-semibold border border-accent/30'
                  : 'text-ink-muted hover:text-ink hover:bg-glass-strong border border-transparent'
              }`}
            >
              {item.icon}
              <span>{item.label}</span>
              {item.count !== undefined && (
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                    isActive ? 'bg-accent/20 text-accent' : 'bg-glass text-ink-muted'
                  }`}
                >
                  {item.count}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
