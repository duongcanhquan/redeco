'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import {
  issueMaterialsAction,
  receiveFgAction,
  releaseWorkOrderAction,
} from '../actions';

const btn =
  'inline-flex items-center justify-center h-10 min-w-[5.5rem] rounded-lg border px-2.5 text-xs font-semibold transition-colors disabled:opacity-50';

export function WorkOrderActions({
  workOrderId,
  status,
  qtyPlanned,
  qtyCompleted,
}: {
  workOrderId: string;
  status: string;
  qtyPlanned: number;
  qtyCompleted: number;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const remain = Math.max(0, qtyPlanned - qtyCompleted);

  const run = async (fn: () => Promise<{ ok: boolean; error?: string }>): Promise<void> => {
    setBusy(true);
    setErr(null);
    const r = await fn();
    setBusy(false);
    if (!r.ok) {
      setErr(r.error ?? 'Lỗi');
      return;
    }
    router.refresh();
  };

  return (
    <div className="flex flex-wrap gap-2 justify-end">
      {status === 'draft' && (
        <button
          type="button"
          disabled={busy}
          className={`${btn} border-accent/40 text-accent hover:bg-accent/10`}
          onClick={() => void run(() => releaseWorkOrderAction(workOrderId))}
        >
          Phát hành
        </button>
      )}
      {(status === 'released' || status === 'in_progress') && (
        <>
          {status === 'released' && (
            <button
              type="button"
              disabled={busy}
              className={`${btn} border-panel/50 hover:bg-panel/20`}
              onClick={() => {
                if (!confirm('Xuất nguyên liệu theo định mức?')) return;
                void run(() => issueMaterialsAction(workOrderId));
              }}
            >
              Xuất NVL
            </button>
          )}
          {remain > 0 && (
            <button
              type="button"
              disabled={busy}
              className={`${btn} border-accent/40 text-accent hover:bg-accent/10`}
              onClick={() => {
                const raw = window.prompt(`Nhập thành phẩm (còn tối đa ${remain})`, String(remain));
                if (raw == null) return;
                const qty = Number(raw);
                if (!(qty > 0)) {
                  setErr('Số lượng không hợp lệ.');
                  return;
                }
                void run(() => receiveFgAction(workOrderId, qty));
              }}
            >
              Nhập TP
            </button>
          )}
        </>
      )}
      {err && <p className="basis-full text-[11px] text-danger text-right">{err}</p>}
    </div>
  );
}
