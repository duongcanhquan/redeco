'use client';

import { AlertCircle, FilePlus2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Field, Modal, inputClass } from '@/components/platform/modal';
import {
  ItemsEditor,
  TotalBar,
  emptyItem,
  parseItems,
  type EditableItem,
  type ProductOption,
} from '@/components/sales/items-editor';
import { createQuotationAction } from './actions';

export function QuotationDialog({
  customers,
  products,
}: {
  customers: { id: string; code: string; name: string }[];
  products: ProductOption[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [customerId, setCustomerId] = useState('');
  const [validUntil, setValidUntil] = useState('');
  const [discountPct, setDiscountPct] = useState('0');
  const [notes, setNotes] = useState('');
  const [rows, setRows] = useState<EditableItem[]>([emptyItem()]);

  const submit = async (): Promise<void> => {
    setError(null);
    const parsed = parseItems(rows, products);
    if (!parsed.ok) {
      setError(parsed.error);
      return;
    }
    const docDiscount = Number(discountPct || '0');
    if (docDiscount < 0 || docDiscount > 100) {
      setError('Chiết khấu tổng phải trong 0–100%.');
      return;
    }
    setSaving(true);
    const result = await createQuotationAction({
      customerId,
      validUntil: validUntil || null,
      discountPct: docDiscount,
      notes,
      items: parsed.items,
    });
    setSaving(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setOpen(false);
    setRows([emptyItem()]);
    setCustomerId('');
    setNotes('');
    router.refresh();
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-11 items-center gap-2 rounded-xl bg-accent px-4 font-semibold text-app text-sm cursor-pointer transition-shadow hover:shadow-[0_0_18px_rgba(0,238,255,0.4)]"
      >
        <FilePlus2 size={17} aria-hidden />
        Tạo báo giá
      </button>

      <Modal
        title="Tạo báo giá"
        icon={<FilePlus2 size={18} className="text-accent" aria-hidden />}
        open={open}
        onClose={() => setOpen(false)}
        wide
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
          className="space-y-4"
        >
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <Field id="quo-customer" label="Khách hàng" required>
                <select
                  id="quo-customer"
                  required
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                  className={inputClass}
                >
                  <option value="">— Chọn khách hàng —</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.code} · {c.name}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <Field id="quo-valid" label="Hiệu lực đến">
              <input
                id="quo-valid"
                type="date"
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
                className={inputClass}
              />
            </Field>
          </div>

          <div>
            <p className="text-sm text-ink-muted mb-2">
              Dòng sản phẩm <span className="text-danger">*</span>{' '}
              <span className="text-xs">(đơn giá tự điền từ bảng giá chuẩn, có thể sửa)</span>
            </p>
            <ItemsEditor products={products} rows={rows} onChange={setRows} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
            <Field id="quo-discount" label="Chiết khấu tổng (%)">
              <input
                id="quo-discount"
                type="number"
                min={0}
                max={100}
                step="0.5"
                value={discountPct}
                onChange={(e) => setDiscountPct(e.target.value)}
                className={inputClass}
              />
            </Field>
            <div className="sm:col-span-2">
              <TotalBar rows={rows} docDiscountPct={discountPct} />
            </div>
          </div>

          <Field id="quo-notes" label="Ghi chú">
            <input
              id="quo-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className={inputClass}
              placeholder="Điều kiện thanh toán, thời gian giao dự kiến…"
            />
          </Field>

          {error && (
            <p role="alert" className="flex items-center gap-2 text-sm text-danger">
              <AlertCircle size={16} aria-hidden />
              {error}
            </p>
          )}

          <div className="flex justify-end gap-3 pt-1">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="h-11 rounded-xl border border-panel/60 px-4 text-sm text-ink-muted hover:text-ink hover:bg-glass-strong transition-colors cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={saving}
              className="h-11 rounded-xl bg-accent px-5 text-sm font-semibold text-app cursor-pointer transition-shadow hover:shadow-[0_0_18px_rgba(0,238,255,0.4)] disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {saving ? 'Đang lưu…' : 'Tạo báo giá (nháp)'}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
