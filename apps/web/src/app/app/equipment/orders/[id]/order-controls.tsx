'use client';

import type { MaintenanceOrderStatus } from '@optimake/domain';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { setTaskDoneAction, transitionOrderAction } from '../../actions';

export function OrderControls({
  orderId,
  status,
  canManage,
  tasks,
}: {
  orderId: string;
  status: MaintenanceOrderStatus;
  canManage: boolean;
  tasks: { id: string; title: string; is_done: boolean }[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [downtime, setDowntime] = useState('0');

  const go = async (to: MaintenanceOrderStatus): Promise<void> => {
    setBusy(true);
    setError(null);
    const result = await transitionOrderAction({
      orderId,
      to,
      downtimeMinutes: to === 'completed' ? Number(downtime) || 0 : undefined,
    });
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.refresh();
  };

  const toggleTask = async (taskId: string, isDone: boolean): Promise<void> => {
    setBusy(true);
    setError(null);
    const result = await setTaskDoneAction({ taskId, isDone, orderId });
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.refresh();
  };

  const nextButtons: { to: MaintenanceOrderStatus; label: string }[] = [];
  if (status === 'draft') nextButtons.push({ to: 'released', label: 'Phát hành' });
  if (status === 'released') nextButtons.push({ to: 'in_progress', label: 'Bắt đầu' });
  if (status === 'in_progress') nextButtons.push({ to: 'completed', label: 'Hoàn thành' });
  if (status === 'draft' || status === 'released' || status === 'in_progress') {
    nextButtons.push({ to: 'cancelled', label: 'Huỷ' });
  }

  return (
    <div className="space-y-4">
      <ul className="space-y-2">
        {tasks.map((t) => (
          <li
            key={t.id}
            className="glass rounded-xl px-3 py-3 flex items-start gap-3 min-h-11"
          >
            <input
              type="checkbox"
              id={`task-${t.id}`}
              checked={t.is_done}
              disabled={!canManage || busy || status === 'completed' || status === 'cancelled'}
              onChange={(e) => void toggleTask(t.id, e.target.checked)}
              className="mt-1 size-5 accent-[var(--color-accent)] cursor-pointer"
            />
            <label htmlFor={`task-${t.id}`} className="text-sm flex-1 cursor-pointer">
              {t.title}
            </label>
          </li>
        ))}
        {tasks.length === 0 ? (
          <li className="text-sm text-ink-muted">Chưa có checklist.</li>
        ) : null}
      </ul>

      {canManage && nextButtons.length > 0 ? (
        <div className="flex flex-wrap gap-2 items-end">
          {status === 'in_progress' ? (
            <label className="text-sm text-ink-muted">
              Phút dừng máy
              <input
                type="number"
                min={0}
                value={downtime}
                onChange={(e) => setDowntime(e.target.value)}
                className="mt-1 block h-11 w-28 rounded-xl border border-panel/50 bg-panel/30 px-3"
              />
            </label>
          ) : null}
          {nextButtons.map((b) => (
            <button
              key={b.to}
              type="button"
              disabled={busy}
              onClick={() => void go(b.to)}
              className={`h-11 min-w-[7rem] rounded-xl px-4 text-sm font-semibold cursor-pointer disabled:opacity-60 ${
                b.to === 'cancelled'
                  ? 'border border-danger/40 text-danger'
                  : 'bg-accent text-app'
              }`}
            >
              {busy ? '…' : b.label}
            </button>
          ))}
        </div>
      ) : null}

      {error ? (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
