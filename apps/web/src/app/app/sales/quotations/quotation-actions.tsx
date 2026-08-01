'use client';

import { ArrowRightCircle, CheckCircle2, Send, XCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { QuotationStatus } from '@optimake/domain';
import { convertQuotationAction, setQuotationStatusAction } from './actions';

const btn =
  'inline-flex items-center gap-1.5 h-8 rounded-lg border px-2.5 text-xs font-medium transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed';

export function QuotationRowActions({
  quotationId,
  status,
  canApprove,
}: {
  quotationId: string;
  status: QuotationStatus;
  canApprove: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async (fn: () => Promise<{ ok: boolean; error?: string }>): Promise<void> => {
    setBusy(true);
    setError(null);
    const result = await fn();
    setBusy(false);
    if (!result.ok) {
      setError(result.error ?? 'Lỗi không xác định.');
      return;
    }
    router.refresh();
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center justify-end gap-1.5 flex-wrap">
        {status === 'draft' && (
          <button
            type="button"
            disabled={busy}
            onClick={() => void run(() => setQuotationStatusAction(quotationId, 'sent'))}
            className={`${btn} border-accent/40 text-accent hover:bg-accent-soft`}
          >
            <Send size={13} aria-hidden />
            Gửi duyệt
          </button>
        )}
        {status === 'sent' && canApprove && (
          <>
            <button
              type="button"
              disabled={busy}
              onClick={() => void run(() => setQuotationStatusAction(quotationId, 'approved'))}
              className={`${btn} border-success/40 text-success hover:bg-success/10`}
            >
              <CheckCircle2 size={13} aria-hidden />
              Duyệt
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void run(() => setQuotationStatusAction(quotationId, 'rejected'))}
              className={`${btn} border-danger/40 text-danger hover:bg-danger/10`}
            >
              <XCircle size={13} aria-hidden />
              Từ chối
            </button>
          </>
        )}
        {status === 'sent' && !canApprove && (
          <span className="text-xs text-ink-muted">Chờ quản trị duyệt</span>
        )}
        {status === 'approved' && (
          <button
            type="button"
            disabled={busy}
            onClick={() => void run(() => convertQuotationAction(quotationId))}
            className={`${btn} border-accent/40 text-accent hover:bg-accent-soft`}
          >
            <ArrowRightCircle size={13} aria-hidden />
            Chuyển thành đơn hàng
          </button>
        )}
      </div>
      {error && (
        <p role="alert" className="text-xs text-danger max-w-56 text-right">
          {error}
        </p>
      )}
    </div>
  );
}
