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
    <header className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-accent shrink-0" aria-hidden>
          {icon}
        </span>
        <h1 className="text-2xl font-bold truncate">{title}</h1>
        {help && helpTitle && <HelpTip title={helpTitle}>{help}</HelpTip>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}
