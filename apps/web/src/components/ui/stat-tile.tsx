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
    <div className="glass flex min-h-32 flex-col justify-between rounded-3xl p-5 sm:min-h-36 sm:p-6">
      <div className="flex items-center gap-2.5 text-ink-muted">
        <span className="grid size-11 place-items-center rounded-2xl bg-accent-soft text-accent" aria-hidden>
          {icon}
        </span>
        <p className="text-sm font-medium sm:text-base">{label}</p>
      </div>
      <p className={`mt-4 text-3xl font-bold tabular-nums leading-none sm:text-4xl ${valueTone}`}>
        {value}
      </p>
    </div>
  );
}
