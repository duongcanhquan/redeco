'use client';

import { ArrowRightCircle, CheckCircle2, Loader2, Send, XCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { startTransition, useState, type ReactNode } from 'react';
import type { QuotationStatus } from '@optimake/domain';
import type { QuotationApprovalActionRow } from '@/services/sales.service';
import { convertQuotationAction, setQuotationStatusAction } from './actions';

const btn =
  'inline-flex items-center gap-1.5 h-11 min-h-11 rounded-lg border px-2.5 text-xs font-medium transition-[colors,transform,opacity] duration-100 cursor-pointer active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed';

export function QuotationRowActions({
  quotationId,
  status,
  role,
  currentStepOrder,
  actions,
  editSlot,
}: {
  quotationId: string;
  status: QuotationStatus;
  role: 'owner' | 'admin' | 'member';
  currentStepOrder: number | null;
  actions: QuotationApprovalActionRow[];
  /** Nút Sửa (chỉ draft) — truyền từ page để gắn QuotationDialog */
  editSlot?: ReactNode;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pending = [...actions]
    .filter((a) => a.status === 'pending')
    .sort((a, b) => a.step_order - b.step_order);
  const current = actions.find((a) => a.step_order === currentStepOrder) ?? pending[0];
  const totalSteps = actions.length;
  const doneSteps = actions.filter((a) => a.status === 'approved').length;

  // UI hint: owner luôn thấy nút; admin/member dựa vào bước (server vẫn enforce)
  const canAct =
    status === 'sent' &&
    (role === 'owner' || role === 'admin' || role === 'member');

  const run = async (fn: () => Promise<{ ok: boolean; error?: string }>): Promise<void> => {
    setBusy(true);
    setError(null);
    try {
      const result = await fn();
      if (!result.ok) {
        setError(result.error ?? 'Lỗi không xác định.');
        return;
      }
      startTransition(() => {
        router.refresh();
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center justify-end gap-1.5 flex-wrap">
        {busy && (
          <Loader2 size={16} className="animate-spin text-accent shrink-0" aria-label="Đang xử lý" />
        )}
        {status === 'draft' && (
          <>
            {editSlot}
            <button
              type="button"
              disabled={busy}
              onClick={() => void run(() => setQuotationStatusAction(quotationId, 'sent'))}
              className={`${btn} border-accent/40 text-accent hover:bg-accent-soft`}
            >
              <Send size={13} aria-hidden />
              Gửi duyệt
            </button>
          </>
        )}
        {status === 'sent' && (
          <>
            {totalSteps > 0 && (
              <span className="text-[11px] text-ink-muted mr-1">
                Bước {Math.min(doneSteps + 1, totalSteps)}/{totalSteps}
                {current ? `: ${current.step_name}` : ''}
              </span>
            )}
            {canAct && (
              <>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void run(() => setQuotationStatusAction(quotationId, 'approved'))}
                  className={`${btn} border-success/40 text-success hover:bg-success/10`}
                >
                  <CheckCircle2 size={13} aria-hidden />
                  Duyệt bước
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
          </>
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
