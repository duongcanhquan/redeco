import type { ReactNode } from 'react';

/**
 * Desktop (≥768): bảng đầy đủ. Phone: danh sách card — tránh horizontal scroll.
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
    return <section className="glass rounded-2xl overflow-hidden">{emptyState}</section>;
  }

  return (
    <section className="glass rounded-2xl overflow-hidden">
      <div className="hidden md:block overflow-x-auto">{table}</div>
      <ul className="md:hidden divide-y divide-panel/30">{cards}</ul>
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
    <li className="px-4 py-4 space-y-2.5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-xs text-accent">{code}</p>
          <p className="font-medium truncate mt-0.5">{title}</p>
        </div>
        {badge}
      </div>
      {meta && <div className="text-xs text-ink-muted space-y-1">{meta}</div>}
      <div className="flex items-center justify-between gap-3 pt-0.5">
        {amount ? (
          <p className="text-base font-semibold tabular-nums">{amount}</p>
        ) : (
          <span />
        )}
        {actions && <div className="flex flex-wrap justify-end gap-2">{actions}</div>}
      </div>
    </li>
  );
}
