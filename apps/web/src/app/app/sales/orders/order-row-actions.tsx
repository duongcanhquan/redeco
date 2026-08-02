'use client';

import {
  BadgeCheck,
  CircleX,
  FileText,
  PackageCheck,
  PackageX,
  Truck,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { SalesOrderStatus } from '@optimake/domain';
import { Modal } from '@/components/platform/modal';
import { formatMoney } from '@/lib/format';
import type { ConfirmOrderOutput } from '@/services/sales.service';
import {
  cancelSalesOrderAction,
  confirmSalesOrderAction,
  createDeliveryFromOrderAction,
  createInvoiceFromOrderAction,
} from './actions';

const CTP_LABEL: Record<string, string> = {
  not_needed: 'Đủ tồn — không cần CTP',
  estimated: 'Ước CTP (LSX / lead time)',
  available: 'Có thể hẹn giao (CTP)',
  unavailable: 'Chưa tính được CTP',
};

const btn =
  'inline-flex items-center gap-1.5 h-11 min-h-11 rounded-lg border px-2.5 text-xs font-medium transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed';

export function OrderRowActions({
  orderId,
  status,
  hasInvoice,
}: {
  orderId: string;
  status: SalesOrderStatus;
  hasInvoice: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [atpResult, setAtpResult] = useState<ConfirmOrderOutput | null>(null);

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

  const confirm = async (): Promise<void> => {
    setBusy(true);
    setError(null);
    const result = await confirmSalesOrderAction(orderId);
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setAtpResult(result.data);
    router.refresh();
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center justify-end gap-1.5 flex-wrap">
        {status === 'draft' && (
          <>
            <button
              type="button"
              disabled={busy}
              onClick={() => void confirm()}
              className={`${btn} border-success/40 text-success hover:bg-success/10`}
            >
              <BadgeCheck size={13} aria-hidden />
              Xác nhận (credit + ATP/CTP)
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void run(() => cancelSalesOrderAction(orderId))}
              className={`${btn} border-danger/40 text-danger hover:bg-danger/10`}
            >
              <CircleX size={13} aria-hidden />
              Hủy
            </button>
          </>
        )}
        {status === 'confirmed' && (
          <>
            <button
              type="button"
              disabled={busy}
              onClick={() => void run(() => createDeliveryFromOrderAction(orderId))}
              className={`${btn} border-accent/40 text-accent hover:bg-accent-soft`}
            >
              <Truck size={13} aria-hidden />
              Tạo lệnh giao hàng
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void run(() => cancelSalesOrderAction(orderId))}
              className={`${btn} border-danger/40 text-danger hover:bg-danger/10`}
            >
              <CircleX size={13} aria-hidden />
              Hủy
            </button>
          </>
        )}
        {(status === 'confirmed' || status === 'delivering' || status === 'completed') &&
          !hasInvoice && (
          <button
            type="button"
            disabled={busy}
            onClick={() => void run(() => createInvoiceFromOrderAction(orderId))}
            className={`${btn} border-accent/40 text-accent hover:bg-accent-soft`}
          >
            <FileText size={13} aria-hidden />
            Xuất hóa đơn
          </button>
        )}
      </div>
      {error && (
        <p role="alert" className="text-xs text-danger max-w-64 text-right">
          {error}
        </p>
      )}

      <Modal
        title="Kết quả xác nhận đơn"
        icon={<BadgeCheck size={18} className="text-success" aria-hidden />}
        open={atpResult !== null}
        onClose={() => setAtpResult(null)}
      >
        {atpResult && (
          <div className="space-y-4">
            <div className="rounded-xl bg-success/10 border border-success/30 px-4 py-3 text-sm">
              <p className="font-medium text-success flex items-center gap-2">
                <BadgeCheck size={16} aria-hidden />
                Đạt kiểm tra hạn mức tín dụng
              </p>
              <p className="text-ink-muted mt-1 text-xs">
                Công nợ hiện tại {fmt(atpResult.credit.outstanding)} + đơn này{' '}
                {fmt(atpResult.credit.orderTotal)}
                {atpResult.credit.creditLimit === null
                  ? ' (khách không giới hạn hạn mức)'
                  : ` ≤ hạn mức ${fmt(atpResult.credit.creditLimit)}`}
                .
              </p>
            </div>

            <div>
              <p className="text-sm font-medium mb-2">Tồn khả dụng (ATP)</p>
              <ul className="space-y-1.5">
                {atpResult.atp.map((line, idx) => {
                  const promise = atpResult.promise.lines[idx];
                  return (
                    <li
                      key={line.productName}
                      className={`flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm border ${
                        line.enough
                          ? 'bg-success/5 border-success/20'
                          : 'bg-warning/10 border-warning/30'
                      }`}
                    >
                      <span className="flex items-center gap-2 min-w-0">
                        {line.enough ? (
                          <PackageCheck size={15} className="text-success shrink-0" aria-hidden />
                        ) : (
                          <PackageX size={15} className="text-warning shrink-0" aria-hidden />
                        )}
                        <span className="truncate">{line.productName}</span>
                      </span>
                      <span className="text-xs text-ink-muted text-right max-w-[14rem]">
                        cần {line.requested} / ATP {line.available}
                        {!line.enough && promise && (
                          <>
                            <br />
                            {CTP_LABEL[promise.ctpStatus] ?? promise.ctpStatus}
                            {promise.reason ? ` — ${promise.reason}` : ''}
                          </>
                        )}
                      </span>
                    </li>
                  );
                })}
              </ul>
              {!atpResult.promise.allCovered && (
                <p
                  role="note"
                  className="mt-3 rounded-xl border border-warning/30 bg-warning/10 px-3 py-2.5 text-xs text-warning"
                >
                  Thiếu hàng: đơn vẫn xác nhận (giao sau) nếu Cài đặt cho phép. Ngày hẹn giao
                  theo năng lực nhà máy (CTP) sẽ có khi bật module Sản xuất + Kho.
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={() => setAtpResult(null)}
              className="h-11 w-full rounded-xl bg-accent font-semibold text-app text-sm cursor-pointer transition-shadow hover:shadow-[0_0_18px_rgba(0,238,255,0.4)]"
            >
              Đã hiểu
            </button>
          </div>
        )}
      </Modal>
    </div>
  );
}

function fmt(n: number): string {
  return formatMoney(n);
}
