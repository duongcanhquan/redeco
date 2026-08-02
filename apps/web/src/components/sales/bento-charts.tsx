/**
 * Biểu đồ nhẹ cho bento Sales — SVG/CSS thuần, không thêm lib chart.
 * Màu lấy từ CSS variables (--color-*), không hard-code hex trong JSX.
 */

import Link from 'next/link';

export type BarPoint = {
  label: string;
  amount: number;
};

export type StackSlice = {
  key: string;
  label: string;
  count: number;
  tone: 'accent' | 'warning' | 'success' | 'danger' | 'muted';
  /** Drill-down — ví dụ /demo/sales/orders?status=confirmed */
  href?: string;
};

const TONE_VAR: Record<StackSlice['tone'], string> = {
  accent: 'var(--color-accent)',
  warning: 'var(--color-warning)',
  success: 'var(--color-success)',
  danger: 'var(--color-danger)',
  muted: 'var(--color-ink-muted)',
};

export function BentoBarChart({
  points,
  ariaLabel,
}: {
  points: BarPoint[];
  ariaLabel: string;
}) {
  const max = Math.max(1, ...points.map((p) => p.amount));
  const w = 560;
  const h = 140;
  const padX = 8;
  const padY = 12;
  const gap = 4;
  const barW = Math.max(6, (w - padX * 2 - gap * (points.length - 1)) / Math.max(points.length, 1));

  return (
    <div className="w-full" role="img" aria-label={ariaLabel}>
      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="w-full h-36 sm:h-40"
        preserveAspectRatio="none"
      >
        {points.map((p, i) => {
          const bh = ((p.amount / max) * (h - padY * 2 - 18)) || 2;
          const x = padX + i * (barW + gap);
          const y = h - padY - 16 - bh;
          return (
            <g key={`${p.label}-${i}`}>
              <rect
                x={x}
                y={y}
                width={barW}
                height={Math.max(bh, 2)}
                rx={3}
                fill="var(--color-accent)"
                opacity={p.amount > 0 ? 0.9 : 0.25}
              >
                <title>
                  {p.label}: {p.amount.toLocaleString('vi-VN')}
                </title>
              </rect>
              {i % 2 === 0 || points.length <= 8 ? (
                <text
                  x={x + barW / 2}
                  y={h - 4}
                  textAnchor="middle"
                  fill="var(--color-ink-muted)"
                  fontSize="9"
                >
                  {p.label}
                </text>
              ) : null}
            </g>
          );
        })}
      </svg>
      {/* Fallback danh sách cho screen reader / empty */}
      <ul className="sr-only">
        {points.map((p) => (
          <li key={p.label}>
            {p.label}: {p.amount}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function BentoStackBars({
  slices,
  ariaLabel,
}: {
  slices: StackSlice[];
  ariaLabel: string;
}) {
  const total = slices.reduce((s, x) => s + x.count, 0);
  const maxCount = Math.max(1, ...slices.map((s) => s.count));

  return (
    <div className="space-y-3" role="img" aria-label={ariaLabel}>
      {/* Thanh stacked tổng quan */}
      <div
        className="flex h-3 w-full overflow-hidden rounded-full bg-app/60 border border-panel/40"
        aria-hidden
      >
        {total === 0 ? (
          <div className="w-full bg-panel/30" />
        ) : (
          slices.map((s) =>
            s.count > 0 ? (
              <div
                key={s.key}
                style={{
                  width: `${(s.count / total) * 100}%`,
                  background: TONE_VAR[s.tone],
                }}
                title={`${s.label}: ${s.count}`}
              />
            ) : null,
          )
        )}
      </div>

      <ul className="space-y-2.5">
        {slices.map((s) => {
          const body = (
            <>
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className="size-2.5 rounded-sm shrink-0"
                  style={{ background: TONE_VAR[s.tone] }}
                  aria-hidden
                />
                <span className="text-sm truncate">{s.label}</span>
              </div>
              <span className="text-sm font-semibold tabular-nums">{s.count}</span>
              <div className="col-span-2 h-1.5 rounded-full bg-app/50 overflow-hidden">
                <div
                  className="h-full rounded-full transition-[width] duration-300 ease-out"
                  style={{
                    width: `${(s.count / maxCount) * 100}%`,
                    background: TONE_VAR[s.tone],
                    opacity: 0.85,
                  }}
                />
              </div>
            </>
          );
          return (
            <li key={s.key}>
              {s.href ? (
                <Link
                  href={s.href}
                  className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-1 items-center rounded-lg px-1 py-1 -mx-1 min-h-11 hover:bg-glass-strong transition-colors"
                >
                  {body}
                </Link>
              ) : (
                <div className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-1 items-center">{body}</div>
              )}
            </li>
          );
        })}
      </ul>
      {total === 0 && (
        <p className="text-xs text-ink-muted text-center pt-1">Chưa có dữ liệu.</p>
      )}
    </div>
  );
}
