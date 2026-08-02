'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { runPmAction, setPlanActiveAction } from '../actions';

export function PlanActions({
  planId,
  isActive,
}: {
  planId: string;
  isActive: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        await setPlanActiveAction({ planId, isActive: !isActive });
        setBusy(false);
        router.refresh();
      }}
      className="h-10 rounded-xl border border-panel/50 px-3 text-xs font-semibold hover:bg-glass-strong cursor-pointer disabled:opacity-60"
    >
      {isActive ? 'Tắt' : 'Bật'}
    </button>
  );
}

export function RunPmButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setMsg(null);
          const result = await runPmAction();
          setBusy(false);
          if (!result.ok) {
            setMsg(result.error);
            return;
          }
          setMsg(
            result.data.created === 0
              ? 'Không có kế hoạch đến hạn.'
              : `Đã tạo ${result.data.created} lệnh: ${result.data.orderCodes.join(', ')}`,
          );
          router.refresh();
        }}
        className="inline-flex h-11 items-center rounded-xl bg-accent px-4 text-sm font-semibold text-app cursor-pointer disabled:opacity-60"
      >
        {busy ? 'Đang chạy…' : 'Chạy PM đến hạn'}
      </button>
      {msg ? (
        <span className="text-xs text-ink-muted max-w-xs text-right" role="status">
          {msg}
        </span>
      ) : null}
    </div>
  );
}
