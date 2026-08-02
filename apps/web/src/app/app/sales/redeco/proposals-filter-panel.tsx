'use client';

import { ChevronDown, Search } from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import {
  CLASSIFICATION_LABELS,
  CLASSIFICATION_TAGS,
} from '@/lib/customiz/redeco-rfq-filter';

export function ProposalsFilterPanel({
  hubBase,
  defaults,
}: {
  hubBase: string;
  defaults: {
    q?: string;
    tag?: string;
    month?: string;
    from?: string;
    to?: string;
  };
}) {
  const hasActive = Boolean(
    defaults.q || defaults.tag || defaults.month || defaults.from || defaults.to,
  );
  const [open, setOpen] = useState(hasActive);

  const summary = useMemo(() => {
    const parts: string[] = [];
    if (defaults.q) parts.push(`«${defaults.q}»`);
    if (defaults.tag) parts.push(`tag: ${defaults.tag}`);
    if (defaults.month) parts.push(`tháng ${defaults.month}`);
    if (defaults.from || defaults.to) {
      parts.push(`${defaults.from || '…'} → ${defaults.to || '…'}`);
    }
    return parts.length ? parts.join(' · ') : 'Không lọc';
  }, [defaults]);

  return (
    <section className="glass rounded-2xl border border-panel/40 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full min-h-11 items-center gap-3 px-4 py-3 sm:px-5 text-left hover:bg-glass transition-colors duration-150"
      >
        <Search size={18} className="text-accent shrink-0" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-ink">Lọc & tìm kiếm</p>
          {!open && (
            <p className="text-xs text-ink-muted truncate mt-0.5">{summary}</p>
          )}
        </div>
        {hasActive && !open && (
          <span className="rounded-lg bg-accent-soft px-2 py-0.5 text-xs font-semibold text-accent shrink-0">
            Đang lọc
          </span>
        )}
        <ChevronDown
          size={18}
          aria-hidden
          className={`text-ink-muted shrink-0 transition-transform duration-200 ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>

      {open && (
        <div className="border-t border-panel/30 p-4 sm:p-5">
          <form
            method="get"
            action={hubBase}
            className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6"
          >
            <input type="hidden" name="tab" value="proposals" />
            <div className="space-y-1.5 lg:col-span-2">
              <label htmlFor="rfq-q" className="text-sm font-medium text-ink">
                Tìm kiếm
              </label>
              <input
                id="rfq-q"
                name="q"
                defaultValue={defaults.q ?? ''}
                placeholder="Số BG, khách, sản phẩm…"
                className="min-h-11 w-full rounded-xl border border-panel/40 bg-app px-3 text-base text-ink"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="rfq-tag" className="text-sm font-medium text-ink">
                Tag
              </label>
              <select
                id="rfq-tag"
                name="tag"
                defaultValue={defaults.tag ?? ''}
                className="min-h-11 w-full rounded-xl border border-panel/40 bg-app px-3 text-base text-ink"
              >
                <option value="">Tất cả</option>
                <option value="trung">Trùng</option>
                {CLASSIFICATION_TAGS.map((t) => (
                  <option key={t} value={t}>
                    {CLASSIFICATION_LABELS[t]}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="rfq-month" className="text-sm font-medium text-ink">
                Tháng
              </label>
              <input
                id="rfq-month"
                name="month"
                type="month"
                defaultValue={defaults.month ?? ''}
                className="min-h-11 w-full rounded-xl border border-panel/40 bg-app px-3 text-base text-ink"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="rfq-from" className="text-sm font-medium text-ink">
                Từ ngày
              </label>
              <input
                id="rfq-from"
                name="from"
                type="date"
                defaultValue={defaults.from ?? ''}
                className="min-h-11 w-full rounded-xl border border-panel/40 bg-app px-3 text-base text-ink"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="rfq-to" className="text-sm font-medium text-ink">
                Đến ngày
              </label>
              <input
                id="rfq-to"
                name="to"
                type="date"
                defaultValue={defaults.to ?? ''}
                className="min-h-11 w-full rounded-xl border border-panel/40 bg-app px-3 text-base text-ink"
              />
            </div>
            <div className="flex flex-wrap items-end gap-2 sm:col-span-2 lg:col-span-6">
              <button
                type="submit"
                className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-accent px-4 text-sm font-semibold text-app"
              >
                <Search size={18} aria-hidden />
                Tìm kiếm
              </button>
              <Link
                href={`${hubBase}?tab=proposals`}
                prefetch
                className="inline-flex min-h-11 items-center rounded-xl border border-panel/40 px-4 text-sm font-medium text-ink-muted hover:text-ink"
              >
                Xóa lọc
              </Link>
              <Link
                href={`${hubBase}?tab=import`}
                prefetch
                className="inline-flex min-h-11 items-center rounded-xl border border-accent/35 bg-accent-soft px-4 text-sm font-semibold text-accent ms-auto"
              >
                Nhập đề xuất mới
              </Link>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}
