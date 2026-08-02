'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { convertWorkRequestAction, setWorkRequestStatusAction } from '../actions';

export function ConvertRequestButton({ requestId }: { requestId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setError(null);
          const result = await convertWorkRequestAction(requestId);
          setBusy(false);
          if (!result.ok) {
            setError(result.error);
            return;
          }
          router.refresh();
        }}
        className="h-10 min-w-[7rem] rounded-xl border border-panel/50 px-3 text-xs font-semibold hover:bg-glass-strong cursor-pointer disabled:opacity-60"
      >
        {busy ? 'Đang tạo…' : 'Tạo lệnh BT'}
      </button>
      {error ? (
        <span className="text-xs text-danger max-w-[10rem] text-right" role="alert">
          {error}
        </span>
      ) : null}
    </div>
  );
}

export function WorkRequestStatusButtons({
  requestId,
  status,
}: {
  requestId: string;
  status: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (status !== 'open' && status !== 'approved') return null;

  const run = async (next: 'approved' | 'rejected' | 'cancelled'): Promise<void> => {
    setBusy(true);
    setError(null);
    const result = await setWorkRequestStatusAction({
      workRequestId: requestId,
      status: next,
    });
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.refresh();
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex flex-wrap gap-1 justify-end">
        {status === 'open' ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => void run('approved')}
            className="h-10 rounded-xl border border-panel/50 px-2 text-xs font-semibold cursor-pointer disabled:opacity-60"
          >
            Duyệt
          </button>
        ) : null}
        <button
          type="button"
          disabled={busy}
          onClick={() => void run('rejected')}
          className="h-10 rounded-xl border border-danger/40 px-2 text-xs font-semibold text-danger cursor-pointer disabled:opacity-60"
        >
          Từ chối
        </button>
      </div>
      {error ? (
        <span className="text-xs text-danger max-w-[10rem] text-right" role="alert">
          {error}
        </span>
      ) : null}
    </div>
  );
}
