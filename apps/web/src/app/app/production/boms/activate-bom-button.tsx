'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { activateBomAction } from '../actions';

export function ActivateBomButton({ bomId }: { bomId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  return (
    <div className="inline-flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={busy}
        className="h-10 min-w-[7rem] rounded-lg border border-accent/40 px-3 text-xs font-semibold text-accent hover:bg-accent/10 disabled:opacity-60"
        onClick={() => {
          void (async () => {
            if (!confirm('Dùng định mức này? Định mức đang dùng khác của cùng sản phẩm sẽ ngừng.')) {
              return;
            }
            setBusy(true);
            setErr(null);
            const r = await activateBomAction(bomId);
            setBusy(false);
            if (!r.ok) {
              setErr(r.error);
              return;
            }
            router.refresh();
          })();
        }}
      >
        {busy ? '…' : 'Dùng'}
      </button>
      {err && (
        <span className="text-[11px] text-danger max-w-[12rem] text-right">{err}</span>
      )}
    </div>
  );
}
