import type { ReactNode } from 'react';
import { HelpTip } from './help-tip';

/** Tiêu đề trang gọn: icon + tên + ? hướng dẫn + nút bên phải. */
export function PageHeader({
  icon,
  title,
  helpTitle,
  help,
  actions,
}: {
  icon: ReactNode;
  title: string;
  helpTitle?: string;
  help?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-2 sm:gap-3">
      <div className="flex min-w-0 items-center gap-2">
        <span className="shrink-0 text-accent" aria-hidden>
          {icon}
        </span>
        <h1 className="truncate text-xl font-bold sm:text-2xl">{title}</h1>
        {help && helpTitle && <HelpTip title={helpTitle}>{help}</HelpTip>}
      </div>
      {actions && (
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
          {actions}
        </div>
      )}
    </header>
  );
}
