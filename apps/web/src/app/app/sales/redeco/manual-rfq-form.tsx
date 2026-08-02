'use client';

import { Loader2, Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { createManualRfqAction } from './actions';

export function ManualRfqForm({ basePath }: { basePath: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    const result = await createManualRfqAction(
      {
        externalQuoteNo: String(fd.get('externalQuoteNo') ?? ''),
        attributes: {
          end_customer: String(fd.get('end_customer') ?? ''),
          product_name: String(fd.get('product_name') ?? ''),
          qty_expected: String(fd.get('qty_expected') ?? ''),
          uom: String(fd.get('uom') ?? ''),
          spec: String(fd.get('spec') ?? ''),
        },
      },
      basePath,
    );
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setOpen(false);
    e.currentTarget.reset();
    router.refresh();
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-panel/40 px-4 text-sm font-semibold text-ink hover:bg-glass"
      >
        <Plus size={18} aria-hidden />
        Thêm tay
      </button>
    );
  }

  return (
    <form
      onSubmit={(ev) => void onSubmit(ev)}
      className="glass rounded-2xl border border-panel/40 p-4 sm:p-5 space-y-3"
    >
      <p className="text-sm font-semibold text-ink">Thêm đề xuất báo giá</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <label htmlFor="manual-quote-no" className="text-sm font-medium text-ink">
            Số BG / mã đề xuất
          </label>
          <input
            id="manual-quote-no"
            name="externalQuoteNo"
            required
            className="min-h-11 w-full rounded-xl border border-panel/40 bg-app px-3 text-base text-ink"
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="manual-customer" className="text-sm font-medium text-ink">
            Khách hàng
          </label>
          <input
            id="manual-customer"
            name="end_customer"
            className="min-h-11 w-full rounded-xl border border-panel/40 bg-app px-3 text-base text-ink"
          />
        </div>
        <div className="space-y-1 sm:col-span-2">
          <label htmlFor="manual-product" className="text-sm font-medium text-ink">
            Tên sản phẩm
          </label>
          <input
            id="manual-product"
            name="product_name"
            className="min-h-11 w-full rounded-xl border border-panel/40 bg-app px-3 text-base text-ink"
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="manual-qty" className="text-sm font-medium text-ink">
            SL dự kiến
          </label>
          <input
            id="manual-qty"
            name="qty_expected"
            className="min-h-11 w-full rounded-xl border border-panel/40 bg-app px-3 text-base text-ink"
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="manual-uom" className="text-sm font-medium text-ink">
            Đơn vị
          </label>
          <input
            id="manual-uom"
            name="uom"
            className="min-h-11 w-full rounded-xl border border-panel/40 bg-app px-3 text-base text-ink"
          />
        </div>
        <div className="space-y-1 sm:col-span-2">
          <label htmlFor="manual-spec" className="text-sm font-medium text-ink">
            Quy cách
          </label>
          <input
            id="manual-spec"
            name="spec"
            className="min-h-11 w-full rounded-xl border border-panel/40 bg-app px-3 text-base text-ink"
          />
        </div>
      </div>
      {error && (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          disabled={busy}
          className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-accent px-4 text-sm font-semibold text-app disabled:opacity-50"
        >
          {busy ? <Loader2 size={18} className="animate-spin" aria-hidden /> : <Plus size={18} aria-hidden />}
          Lưu đề xuất
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => setOpen(false)}
          className="inline-flex min-h-11 items-center rounded-xl border border-panel/40 px-4 text-sm font-medium"
        >
          Hủy
        </button>
      </div>
    </form>
  );
}
