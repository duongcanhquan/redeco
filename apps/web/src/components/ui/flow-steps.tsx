import { ChevronRight } from 'lucide-react';
import type { ReactNode } from 'react';

export type FlowStep = {
  key: string;
  label: string;
  icon: ReactNode;
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

/** Luồng bước — ô lớn, số to, dễ đọc trên phone. */
export function FlowSteps({ steps, ariaLabel }: { steps: FlowStep[]; ariaLabel: string }) {
  return (
    <nav aria-label={ariaLabel} className="glass overflow-x-auto rounded-3xl px-3 py-3 sm:px-4">
      <ol className="flex min-w-min items-stretch gap-1.5">
        {steps.map((s, i) => (
          <li key={s.key} className="flex items-center gap-1.5">
            <div
              className={`flex min-h-16 min-w-[8.5rem] items-center gap-3 rounded-2xl border px-4 py-3 ${TONE[s.tone ?? 'default']}`}
            >
              <span className="shrink-0" aria-hidden>
                {s.icon}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium leading-tight">{s.label}</span>
                {typeof s.count === 'number' && (
                  <span className="mt-0.5 block text-2xl font-bold tabular-nums leading-none">
                    {s.count}
                  </span>
                )}
              </span>
            </div>
            {i < steps.length - 1 && (
              <ChevronRight size={18} className="mx-0.5 shrink-0 text-ink-muted/50" aria-hidden />
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
