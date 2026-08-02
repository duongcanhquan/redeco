import Link from 'next/link';

export type StatusOption = {
  key: string;
  label: string;
};

function hrefWith(baseHref: string, status: string | null, q?: string | null): string {
  const params = new URLSearchParams();
  if (status) params.set('status', status);
  if (q?.trim()) params.set('q', q.trim());
  const qs = params.toString();
  return qs ? `${baseHref}?${qs}` : baseHref;
}

/**
 * Chip lọc trạng thái — mobile-friendly (touch ≥ 44px), dùng query ?status=
 */
export function StatusFilterBar({
  baseHref,
  options,
  active,
  q,
  allLabel = 'Tất cả',
}: {
  baseHref: string;
  options: readonly StatusOption[];
  active: string | null;
  /** Giữ từ khóa tìm khi đổi filter */
  q?: string | null;
  allLabel?: string;
}) {
  const chip = (href: string, label: string, isActive: boolean) => (
    <Link
      href={href}
      aria-current={isActive ? 'page' : undefined}
      className={`inline-flex min-h-11 items-center rounded-xl border px-3.5 text-sm transition-colors ${
        isActive
          ? 'border-accent/40 bg-accent-soft text-accent font-semibold'
          : 'border-panel/40 bg-app/40 text-ink-muted hover:border-accent/30 hover:text-ink'
      }`}
    >
      {label}
    </Link>
  );

  return (
    <nav aria-label="Lọc theo trạng thái" className="flex flex-wrap gap-2">
      {chip(hrefWith(baseHref, null, q), allLabel, !active)}
      {options.map((o) => chip(hrefWith(baseHref, o.key, q), o.label, active === o.key))}
    </nav>
  );
}
