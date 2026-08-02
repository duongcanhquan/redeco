import type { ReactNode } from 'react';

/**
 * Desktop (≥768): bảng đầy đủ. Phone: danh sách card lớn — dễ đọc, dễ chạm.
 */
export function ResponsiveDocList({
  empty,
  emptyState,
  table,
  cards,
}: {
  empty: boolean;
  emptyState: ReactNode;
  table: ReactNode;
  cards: ReactNode;
}) {
  if (empty) {
    return <section className="glass overflow-hidden rounded-3xl">{emptyState}</section>;
  }

  return (
    <section className="glass overflow-hidden rounded-3xl">
      <div className="hidden md:block overflow-x-auto">{table}</div>
      <ul className="divide-y divide-panel/30 md:hidden">{cards}</ul>
    </section>
  );
}

export function DocCard({
  code,
  title,
  badge,
  meta,
  amount,
  actions,
}: {
  code: string;
  title: string;
  badge: ReactNode;
  meta?: ReactNode;
  amount?: string;
  actions?: ReactNode;
}) {
  return (
    <li className="space-y-3 px-4 py-5 sm:px-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-sm font-medium text-accent">{code}</p>
          <p className="mt-1 truncate text-base font-semibold sm:text-lg">{title}</p>
        </div>
        {badge}
      </div>
      {meta && <div className="space-y-1 text-sm text-ink-muted">{meta}</div>}
      <div className="flex items-center justify-between gap-3 pt-1">
        {amount ? (
          <p className="text-xl font-bold tabular-nums">{amount}</p>
        ) : (
          <span />
        )}
        {actions && (
          <div className="flex flex-wrap justify-end gap-2">{actions}</div>
        )}
      </div>
    </li>
  );
}
