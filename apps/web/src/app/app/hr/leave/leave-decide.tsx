'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { decideLeaveRequestAction } from '../actions';

export function LeaveDecideButtons({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const act = async (decision: 'approved' | 'rejected'): Promise<void> => {
    setBusy(true);
    setError(null);
    const result = await decideLeaveRequestAction({ id, decision });
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.refresh();
  };

  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => void act('approved')}
          className="min-h-11 rounded-xl border border-success/40 px-3 text-sm text-success disabled:opacity-50 cursor-pointer"
        >
          Duyệt
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => void act('rejected')}
          className="min-h-11 rounded-xl border border-danger/40 px-3 text-sm text-danger disabled:opacity-50 cursor-pointer"
        >
          Từ chối
        </button>
      </div>
      {error && (
        <p role="alert" className="text-xs text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
