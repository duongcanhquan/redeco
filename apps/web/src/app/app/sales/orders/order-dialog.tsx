'use client';

import { AlertCircle, ScrollText } from 'lucide-react';
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
import { createSalesOrderAction } from './actions';

export function OrderDialog({
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
  const [expectedDate, setExpectedDate] = useState('');
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
    const result = await createSalesOrderAction({
      customerId,
      expectedDeliveryDate: expectedDate || null,
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
        <ScrollText size={17} aria-hidden />
        Tạo đơn hàng
      </button>

      <Modal
        title="Tạo đơn đặt hàng"
        icon={<ScrollText size={18} className="text-accent" aria-hidden />}
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
              <Field id="so-customer" label="Khách hàng" required>
                <select
                  id="so-customer"
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
            <Field id="so-date" label="Ngày giao dự kiến">
              <input
                id="so-date"
                type="date"
                value={expectedDate}
                onChange={(e) => setExpectedDate(e.target.value)}
                className={inputClass}
              />
            </Field>
          </div>

          <div>
            <p className="text-sm text-ink-muted mb-2">
              Dòng sản phẩm <span className="text-danger">*</span>
            </p>
            <ItemsEditor products={products} rows={rows} onChange={setRows} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
            <Field id="so-discount" label="Chiết khấu tổng (%)">
              <input
                id="so-discount"
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

          <Field id="so-notes" label="Ghi chú">
            <input
              id="so-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className={inputClass}
              placeholder="Yêu cầu đóng gói, địa điểm giao…"
            />
          </Field>

          <p className="text-xs text-ink-muted">
            Đơn tạo ở trạng thái <strong>nháp</strong>. Khi bấm “Xác nhận” hệ thống sẽ kiểm tra hạn
            mức tín dụng (chặn nếu vượt) và tồn kho khả dụng (ATP) từng dòng.
          </p>

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
              {saving ? 'Đang lưu…' : 'Tạo đơn (nháp)'}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
