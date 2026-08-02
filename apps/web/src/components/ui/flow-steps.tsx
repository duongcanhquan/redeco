import { ChevronRight } from 'lucide-react';
import type { ReactNode } from 'react';

export type FlowStep = {
  key: string;
  label: string;
  icon: ReactNode;
  /** Số lượng / trạng thái phụ */
  count?: number;
  tone?: 'default' | 'accent' | 'warning' | 'success' | 'danger';
};

const TONE: Record<NonNullable<FlowStep['tone']>, string> = {
  default: 'border-panel/40 text-ink',
  accent: 'border-accent/40 text-accent bg-accent-soft/40',
  warning: 'border-warning/40 text-warning',
  success: 'border-success/40 text-success',
  danger: 'border-danger/40 text-danger',
};

/** Luồng phân loại ngang — dễ đọc trên phone (scroll) và desktop. */
export function FlowSteps({ steps, ariaLabel }: { steps: FlowStep[]; ariaLabel: string }) {
  return (
    <nav
      aria-label={ariaLabel}
      className="glass rounded-2xl px-3 py-3 overflow-x-auto"
    >
      <ol className="flex items-stretch gap-1 min-w-min">
        {steps.map((s, i) => (
          <li key={s.key} className="flex items-center gap-1">
            <div
              className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 min-h-11 min-w-[7.5rem] ${TONE[s.tone ?? 'default']}`}
            >
              <span className="shrink-0" aria-hidden>
                {s.icon}
              </span>
              <span className="min-w-0">
                <span className="block text-xs font-medium leading-tight truncate">{s.label}</span>
                {typeof s.count === 'number' && (
                  <span className="block text-lg font-bold tabular-nums leading-tight">
                    {s.count}
                  </span>
                )}
              </span>
            </div>
            {i < steps.length - 1 && (
              <ChevronRight
                size={16}
                className="text-ink-muted shrink-0 mx-0.5 opacity-80"
                aria-hidden
              />
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
