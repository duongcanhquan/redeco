import type { ReactNode } from 'react';

export function StatTile({
  icon,
  label,
  value,
  tone = 'default',
}: {
  icon: ReactNode;
  label: string;
  value: ReactNode;
  tone?: 'default' | 'warning' | 'danger' | 'success';
}) {
  const valueTone =
    tone === 'warning'
      ? 'text-warning'
      : tone === 'danger'
        ? 'text-danger'
        : tone === 'success'
          ? 'text-success'
          : '';

  return (
    <div className="glass rounded-2xl p-4 min-h-28 flex flex-col justify-between">
      <div className="flex items-center gap-2 text-ink-muted">
        <span className="text-accent" aria-hidden>
          {icon}
        </span>
        <p className="text-xs font-medium">{label}</p>
      </div>
      <p className={`mt-2 text-2xl font-bold tabular-nums ${valueTone}`}>{value}</p>
    </div>
  );
}
