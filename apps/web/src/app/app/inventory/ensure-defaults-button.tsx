'use client';

import { RefreshCw } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ensureInventoryDefaultsAction } from './actions';

export function EnsureDefaultsButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const run = async (): Promise<void> => {
    setBusy(true);
    setMsg(null);
    const result = await ensureInventoryDefaultsAction();
    setBusy(false);
    if (!result.ok) {
      setMsg(result.error);
      return;
    }
    router.refresh();
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={busy}
        onClick={() => void run()}
        className="inline-flex h-11 items-center gap-2 rounded-xl border border-panel/50 px-4 text-sm font-medium hover:bg-glass-strong transition-colors cursor-pointer disabled:opacity-60"
      >
        <RefreshCw size={16} className={busy ? 'animate-spin' : ''} aria-hidden />
        {busy ? 'Đang đồng bộ…' : 'Đồng bộ từ SP bán hàng'}
      </button>
      {msg && (
        <p role="alert" className="text-xs text-danger">
          {msg}
        </p>
      )}
    </div>
  );
}
