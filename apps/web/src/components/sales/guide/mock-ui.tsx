import type { ReactNode } from 'react';

/** Khung màn hình giả lập — nhìn như ảnh chụp app. */
export function MockScreen({
  title,
  children,
  footer,
}: {
  title: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <figure className="rounded-2xl border border-white/20 bg-app-deep overflow-hidden shadow-[0_12px_40px_rgba(0,0,0,0.35)]">
      <figcaption className="flex items-center gap-2 px-3 py-2.5 border-b border-white/15 bg-white/5">
        <span className="flex gap-1" aria-hidden>
          <span className="size-2 rounded-full bg-danger/80" />
          <span className="size-2 rounded-full bg-warning/80" />
          <span className="size-2 rounded-full bg-success/80" />
        </span>
        <span className="text-xs font-medium text-ink truncate">{title}</span>
      </figcaption>
      <div className="p-3 sm:p-4 space-y-2 min-h-[10rem] text-ink">{children}</div>
      {footer && (
        <div className="px-3 py-2.5 border-t border-white/15 bg-white/5 text-xs font-medium text-ink-muted">
          {footer}
        </div>
      )}
    </figure>
  );
}

export function MockRow({
  left,
  right,
  tone = 'default',
}: {
  left: string;
  right?: string;
  tone?: 'default' | 'accent' | 'success' | 'warning';
}) {
  const toneCls =
    tone === 'accent'
      ? 'border-accent/40 bg-accent-soft/40'
      : tone === 'success'
        ? 'border-success/40 bg-success/15'
        : tone === 'warning'
          ? 'border-warning/40 bg-warning/15'
          : 'border-white/15 bg-white/5';
  return (
    <div
      className={`flex items-center justify-between gap-2 rounded-lg border px-3 py-2.5 text-sm ${toneCls}`}
    >
      <span className="font-semibold text-ink truncate">{left}</span>
      {right && (
        <span className="text-ink-muted font-medium tabular-nums shrink-0">{right}</span>
      )}
    </div>
  );
}

export function MockPill({
  children,
  tone = 'muted',
}: {
  children: ReactNode;
  tone?: 'muted' | 'accent' | 'success' | 'warning' | 'danger';
}) {
  const cls = {
    muted: 'bg-white/10 text-ink border-white/25',
    accent: 'bg-accent-soft text-accent border-accent/40',
    success: 'bg-success/20 text-success border-success/40',
    warning: 'bg-warning/20 text-warning border-warning/40',
    danger: 'bg-danger/20 text-danger border-danger/40',
  }[tone];
  return (
    <span
      className={`inline-flex rounded-md border px-2 py-0.5 text-[11px] font-semibold ${cls}`}
    >
      {children}
    </span>
  );
}

export function MockBtn({ children, primary }: { children: ReactNode; primary?: boolean }) {
  return (
    <span
      className={`inline-flex h-9 items-center rounded-lg px-3 text-xs font-bold ${
        primary
          ? 'bg-accent text-app'
          : 'border border-white/25 text-ink bg-white/10'
      }`}
    >
      {children}
    </span>
  );
}

/** Sơ đồ cột dọc — luồng từ trên xuống. */
export function VerticalFlow({
  steps,
}: {
  steps: { label: string; hint: string; tone?: 'default' | 'accent' | 'success' | 'warning' }[];
}) {
  return (
    <ol className="relative space-y-0 pl-2">
      {steps.map((s, i) => (
        <li key={s.label} className="relative flex gap-3 pb-4 last:pb-0">
          {i < steps.length - 1 && (
            <span
              className="absolute left-[11px] top-7 bottom-0 w-px bg-accent/40"
              aria-hidden
            />
          )}
          <span
            className={`relative z-[1] grid size-6 shrink-0 place-items-center rounded-full text-[11px] font-bold border ${
              s.tone === 'success'
                ? 'border-success text-success bg-success/20'
                : s.tone === 'warning'
                  ? 'border-warning text-warning bg-warning/20'
                  : s.tone === 'accent'
                    ? 'border-accent text-accent bg-accent-soft'
                    : 'border-white/30 text-ink bg-white/10'
            }`}
          >
            {i + 1}
          </span>
          <div className="min-w-0 pt-0.5">
            <p className="text-sm font-bold text-ink leading-tight">{s.label}</p>
            <p className="text-sm text-ink-muted mt-0.5 leading-snug">{s.hint}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

/** Biểu đồ cột giả — minh họa, không phải dữ liệu thật. */
export function MockBarChart() {
  const bars = [40, 65, 45, 80, 55, 90, 70];
  return (
    <div
      className="flex items-end gap-1.5 h-24 px-1"
      role="img"
      aria-label="Biểu đồ mẫu giá trị hóa đơn theo ngày"
    >
      {bars.map((h, i) => (
        <div
          key={i}
          className="flex-1 rounded-t-md bg-accent min-w-0"
          style={{ height: `${h}%`, opacity: 0.85 }}
        />
      ))}
    </div>
  );
}
