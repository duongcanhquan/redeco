import type { ReactNode } from 'react';

/** Nhóm cài đặt trong một tab — một mục đích, một tiêu đề. */
export function SettingsGroup({
  title,
  description,
  icon,
  children,
}: {
  title: string;
  description?: string;
  icon?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="glass rounded-2xl p-5 sm:p-6 space-y-4">
      <header className="space-y-1">
        <h2 className="font-semibold flex items-center gap-2 text-base">
          {icon}
          {title}
        </h2>
        {description && <p className="text-sm text-ink-muted">{description}</p>}
      </header>
      {children}
    </section>
  );
}
