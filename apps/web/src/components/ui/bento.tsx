import Link from 'next/link';
import type { ReactNode } from 'react';

/**
 * Ô KPI bento — lớn, tối giản, dễ chạm trên phone.
 * Một việc / một số / một đường dẫn.
 */
export function KpiTile({
  className = '',
  label,
  value,
  href,
  icon,
  tone = 'default',
  sub,
}: {
  className?: string;
  label: string;
  value: ReactNode;
  href: string;
  icon: ReactNode;
  tone?: 'default' | 'warning' | 'danger' | 'success';
  sub?: ReactNode;
}) {
  const toneBox =
    tone === 'warning'
      ? 'bg-warning/10 border-warning/30 text-warning'
      : tone === 'danger'
        ? 'bg-danger/10 border-danger/30 text-danger'
        : tone === 'success'
          ? 'bg-success/10 border-success/30 text-success'
          : 'bg-accent-soft border-accent/25 text-accent';

  const valueTone =
    tone === 'warning'
      ? 'text-warning'
      : tone === 'danger'
        ? 'text-danger'
        : tone === 'success'
          ? 'text-success'
          : 'text-ink';

  return (
    <Link
      href={href}
      className={`bento-tile glass glass-hover flex min-h-32 flex-col justify-between rounded-3xl p-5 sm:min-h-36 sm:p-6 ${className}`}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium leading-snug text-ink-muted sm:text-base">{label}</p>
        <span
          className={`grid size-12 shrink-0 place-items-center rounded-2xl border ${toneBox}`}
          aria-hidden
        >
          {icon}
        </span>
      </div>
      <div className="mt-4">
        <p className={`text-3xl font-bold tabular-nums break-words leading-none sm:text-4xl ${valueTone}`}>
          {value}
        </p>
        {sub ? <p className="mt-2 text-sm text-ink-muted">{sub}</p> : null}
      </div>
    </Link>
  );
}

/** Khung panel bento lớn (biểu đồ, danh sách việc). */
export function BentoPanel({
  className = '',
  title,
  description,
  action,
  children,
}: {
  className?: string;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className={`bento-panel glass flex min-h-48 flex-col rounded-3xl p-5 sm:p-6 ${className}`}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold leading-tight sm:text-xl">{title}</h2>
          {description ? (
            <p className="mt-1 text-sm text-ink-muted">{description}</p>
          ) : null}
        </div>
        {action}
      </div>
      <div className="min-h-0 flex-1">{children}</div>
    </section>
  );
}

/** Ô lối tắt thao tác — icon lớn + nhãn rõ. */
export function ActionTile({
  href,
  label,
  icon,
}: {
  href: string;
  label: string;
  icon: ReactNode;
}) {
  return (
    <Link
      href={href}
      className="glass glass-hover group flex min-h-24 items-center gap-4 rounded-3xl p-5"
    >
      <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-accent-soft text-accent">
        {icon}
      </span>
      <span className="text-base font-semibold group-hover:text-accent sm:text-lg">{label}</span>
    </Link>
  );
}
