'use client';

import { ChevronDown } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

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
 * Lọc trạng thái: phone = dropdown 1 hàng (gọn, rõ);
 * tablet+ = chip lớn dễ chạm.
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
  q?: string | null;
  allLabel?: string;
}) {
  const router = useRouter();
  const activeLabel =
    options.find((o) => o.key === active)?.label ?? allLabel;

  return (
    <>
      <div className="relative w-full sm:hidden">
        <label htmlFor="status-filter-select" className="sr-only">
          Lọc theo trạng thái
        </label>
        <select
          id="status-filter-select"
          value={active ?? ''}
          aria-label="Lọc theo trạng thái"
          onChange={(e) => {
            const v = e.target.value;
            router.push(hrefWith(baseHref, v || null, q));
          }}
          className="glass w-full min-h-12 appearance-none rounded-2xl border border-panel/40 bg-app-deep/80 py-3 pl-4 pr-10 text-base font-medium text-ink outline-none focus:border-accent focus-visible:ring-2 focus-visible:ring-accent/50"
        >
          <option value="">{allLabel}</option>
          {options.map((o) => (
            <option key={o.key} value={o.key}>
              {o.label}
            </option>
          ))}
        </select>
        <ChevronDown
          size={18}
          aria-hidden
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted"
        />
        <span className="sr-only">Đang lọc: {activeLabel}</span>
      </div>

      <nav
        aria-label="Lọc theo trạng thái"
        className="hidden flex-wrap gap-2 sm:flex"
      >
        <FilterChip
          href={hrefWith(baseHref, null, q)}
          label={allLabel}
          active={!active}
        />
        {options.map((o) => (
          <FilterChip
            key={o.key}
            href={hrefWith(baseHref, o.key, q)}
            label={o.label}
            active={active === o.key}
          />
        ))}
      </nav>
    </>
  );
}

function FilterChip({
  href,
  label,
  active,
}: {
  href: string;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={`inline-flex min-h-12 items-center rounded-2xl border px-4 text-sm font-medium transition-colors sm:text-base ${
        active
          ? 'border-accent/40 bg-accent-soft font-semibold text-accent'
          : 'border-panel/40 bg-app/40 text-ink-muted hover:border-accent/30 hover:text-ink'
      }`}
    >
      {label}
    </Link>
  );
}
