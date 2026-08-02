import type { ReactNode } from 'react';

const TONE: Record<string, string> = {
  draft: 'bg-panel/40 text-ink-muted',
  open: 'bg-accent-soft text-accent',
  sent: 'bg-accent-soft text-accent',
  confirmed: 'bg-success/15 text-success',
  released: 'bg-accent-soft text-accent',
  in_progress: 'bg-warning/15 text-warning',
  completed: 'bg-success/15 text-success',
  paid: 'bg-success/15 text-success',
  partial: 'bg-warning/15 text-warning',
  void: 'bg-danger/15 text-danger',
  cancelled: 'bg-danger/15 text-danger',
  active: 'bg-success/15 text-success',
  obsolete: 'bg-panel/40 text-ink-muted',
  posted: 'bg-success/15 text-success',
  unpaid: 'bg-warning/15 text-warning',
};

/** Nhãn trạng thái ngắn + màu — không chỉ dựa vào màu (có chữ). */
export function StatusPill({
  status,
  label,
  icon,
}: {
  status: string;
  label: string;
  icon?: ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold ${TONE[status] ?? 'bg-panel/40 text-ink'}`}
    >
      {icon}
      {label}
    </span>
  );
}
