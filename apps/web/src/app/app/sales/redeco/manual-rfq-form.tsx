'use client';

import { Loader2, Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { ATTR_KEYS, type RedecoRfqAttrKey } from '@/lib/customiz/redeco-rfq-parse';
import { createManualRfqAction } from './actions';

/** Nhãn khớp cột Excel REDECO (A–R). */
export const EXCEL_FIELD_LABELS: { key: 'externalQuoteNo' | RedecoRfqAttrKey; label: string }[] =
  [
    { key: 'externalQuoteNo', label: 'Số báo giá (A)' },
    { key: 'status_customer', label: 'Trạng thái KH (B)' },
    { key: 'buyer_contact', label: 'Người PH mua hàng (C)' },
    { key: 'end_customer', label: 'Khách hàng (D)' },
    { key: 'customer_site_abbr', label: 'Cơ sở KH (E)' },
    { key: 'customer_item_code', label: 'Mã hàng KH (F)' },
    { key: 'system_item_code', label: 'Mã hàng (G)' },
    { key: 'request_quote_ref', label: 'BG yêu cầu số (H)' },
    { key: 'product_name', label: 'Tên sản phẩm (I)' },
    { key: 'model_or_end_code', label: 'Kiểu mẫu (J)' },
    { key: 'spec', label: 'Quy cách (K)' },
    { key: 'manufacturer', label: 'Nhà SX (L)' },
    { key: 'uom', label: 'Đơn vị (M)' },
    { key: 'qty_expected', label: 'SL dự kiến (N)' },
    { key: 'po_qty_last_year', label: 'PO năm trước (O)' },
    { key: 'request_date', label: 'Ngày yêu cầu (P)' },
    { key: 'quotation_closing_date', label: 'Closing date (Q)' },
    { key: 'closing_time', label: 'Giờ đóng (R)' },
  ];

export function ManualRfqForm({ basePath }: { basePath: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const onSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setOk(null);
    const fd = new FormData(e.currentTarget);
    const attributes = {} as Partial<Record<RedecoRfqAttrKey, string>>;
    for (const k of ATTR_KEYS) {
      attributes[k] = String(fd.get(k) ?? '');
    }
    const result = await createManualRfqAction(
      {
        externalQuoteNo: String(fd.get('externalQuoteNo') ?? ''),
        attributes,
      },
      basePath,
    );
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setOk('Đã lưu đề xuất.');
    e.currentTarget.reset();
    router.refresh();
  };

  return (
    <form
      onSubmit={(ev) => void onSubmit(ev)}
      className="space-y-4"
    >
      <p className="text-sm text-ink-muted leading-relaxed">
        Nhập thủ công — các trường trùng cột file Excel (dòng tiêu đề 5).
      </p>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {EXCEL_FIELD_LABELS.map((f) => (
          <div key={f.key} className="space-y-1.5">
            <label htmlFor={`manual-${f.key}`} className="block text-sm font-medium text-ink">
              {f.label}
              {f.key === 'externalQuoteNo' ? ' *' : ''}
            </label>
            <input
              id={`manual-${f.key}`}
              name={f.key}
              required={f.key === 'externalQuoteNo'}
              className="min-h-11 w-full rounded-xl border border-panel/40 bg-app px-3 text-base text-ink"
            />
          </div>
        ))}
      </div>
      {error && (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      )}
      {ok && (
        <p className="text-sm text-success" role="status">
          {ok}
        </p>
      )}
      <button
        type="submit"
        disabled={busy}
        className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-accent px-4 text-sm font-semibold text-app disabled:opacity-50"
      >
        {busy ? <Loader2 size={18} className="animate-spin" aria-hidden /> : <Plus size={18} aria-hidden />}
        Lưu đề xuất
      </button>
    </form>
  );
}
