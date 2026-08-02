'use client';

import { AlertCircle, FilePlus2, Pencil } from 'lucide-react';
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
import { createQuotationAction, updateQuotationAction } from './actions';

function defaultValidDate(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + Math.max(1, days));
  return d.toISOString().slice(0, 10);
}

export type QuotationEditSeed = {
  id: string;
  customerId: string;
  validUntil: string | null;
  discountPct: number;
  notes: string | null;
  items: EditableItem[];
};

export function QuotationDialog({
  customers,
  products,
  defaultValidDays = 30,
  edit = null,
}: {
  customers: { id: string; code: string; name: string }[];
  products: ProductOption[];
  defaultValidDays?: number;
  /** null = tạo mới; có giá trị = sửa nháp */
  edit?: QuotationEditSeed | null;
}) {
  const router = useRouter();
  const isEdit = Boolean(edit);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [customerId, setCustomerId] = useState('');
  const [validUntil, setValidUntil] = useState(() => defaultValidDate(defaultValidDays));
  const [discountPct, setDiscountPct] = useState('0');
  const [autoRule, setAutoRule] = useState(true);
  const [notes, setNotes] = useState('');
  const [rows, setRows] = useState<EditableItem[]>([emptyItem()]);

  const resetCreate = (): void => {
    setCustomerId('');
    setValidUntil(defaultValidDate(defaultValidDays));
    setDiscountPct('0');
    setAutoRule(true);
    setNotes('');
    setRows([emptyItem()]);
  };

  const openDialog = (): void => {
    setError(null);
    if (edit) {
      setCustomerId(edit.customerId);
      setValidUntil(edit.validUntil ?? defaultValidDate(defaultValidDays));
      setDiscountPct(String(edit.discountPct));
      setAutoRule(false);
      setNotes(edit.notes ?? '');
      setRows(edit.items.length > 0 ? edit.items : [emptyItem()]);
    } else {
      resetCreate();
    }
    setOpen(true);
  };

  const submit = async (): Promise<void> => {
    setError(null);
    const parsed = parseItems(rows, products);
    if (!parsed.ok) {
      setError(parsed.error);
      return;
    }
    const docDiscount = Number(discountPct || '0');
    if (!autoRule && (docDiscount < 0 || docDiscount > 100)) {
      setError('Chiết khấu tổng phải trong 0–100%.');
      return;
    }
    setSaving(true);
    const payload = {
      customerId,
      validUntil: validUntil || null,
      discountPct: autoRule ? null : docDiscount,
      autoApplyDiscountRule: autoRule,
      notes,
      items: parsed.items,
    };
    const result = isEdit && edit
      ? await updateQuotationAction(edit.id, payload)
      : await createQuotationAction(payload);
    setSaving(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setOpen(false);
    if (!isEdit) resetCreate();
    router.refresh();
  };

  return (
    <>
      {isEdit ? (
        <button
          type="button"
          onClick={openDialog}
          className="inline-flex items-center gap-1.5 h-11 min-h-11 rounded-lg border border-panel/50 px-2.5 text-xs font-medium text-ink-muted hover:text-ink hover:bg-glass-strong transition-colors cursor-pointer"
          aria-label="Sửa báo giá nháp"
        >
          <Pencil size={13} aria-hidden />
          Sửa
        </button>
      ) : (
        <button
          type="button"
          onClick={openDialog}
          className="inline-flex h-11 items-center gap-2 rounded-xl bg-accent px-4 font-semibold text-app text-sm cursor-pointer transition-shadow hover:shadow-[0_0_18px_rgba(0,238,255,0.4)]"
        >
          <FilePlus2 size={17} aria-hidden />
          Tạo báo giá
        </button>
      )}

      <Modal
        title={isEdit ? 'Sửa báo giá (nháp)' : 'Tạo báo giá'}
        icon={
          isEdit ? (
            <Pencil size={18} className="text-accent" aria-hidden />
          ) : (
            <FilePlus2 size={18} className="text-accent" aria-hidden />
          )
        }
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
              Dòng sản phẩm <span className="text-danger">*</span>
            </p>
            <ItemsEditor products={products} rows={rows} onChange={setRows} />
          </div>

          <label className="inline-flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={autoRule}
              onChange={(e) => setAutoRule(e.target.checked)}
              className="size-4 accent-accent"
            />
            Tự áp quy tắc chiết khấu / KM phù hợp nhất
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
            <Field id="quo-discount" label="Chiết khấu tổng (%)">
              <input
                id="quo-discount"
                type="number"
                min={0}
                max={100}
                step="0.5"
                disabled={autoRule}
                value={discountPct}
                onChange={(e) => setDiscountPct(e.target.value)}
                className={`${inputClass} disabled:opacity-50`}
              />
            </Field>
            <div className="sm:col-span-2">
              <TotalBar rows={rows} docDiscountPct={autoRule ? '0' : discountPct} />
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
              {saving ? 'Đang lưu…' : isEdit ? 'Lưu thay đổi' : 'Tạo báo giá (nháp)'}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
