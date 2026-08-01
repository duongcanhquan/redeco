'use client';

import { Plus, Trash2 } from 'lucide-react';
import { computeDocTotal, computeLineTotal } from '@optimake/domain';
import { formatMoney } from '@/lib/format';
import { inputClass } from '@/components/platform/modal';

export interface ProductOption {
  id: string;
  sku: string;
  name: string;
  uom: string;
  base_price: number;
}

/** Dòng đang soạn — giữ string để gõ tự nhiên, parse khi submit. */
export interface EditableItem {
  productId: string;
  qty: string;
  unitPrice: string;
  discountPct: string;
}

export function emptyItem(): EditableItem {
  return { productId: '', qty: '1', unitPrice: '', discountPct: '0' };
}

/** Parse + validate các dòng; trả về items chuẩn hoặc thông báo lỗi. */
export function parseItems(
  rows: EditableItem[],
  products: ProductOption[],
):
  | { ok: true; items: { productId: string; productName: string; qty: number; unitPrice: number; discountPct: number }[] }
  | { ok: false; error: string } {
  if (rows.length === 0) return { ok: false, error: 'Thêm ít nhất một dòng sản phẩm.' };
  const items = [];
  for (const [i, row] of rows.entries()) {
    const product = products.find((p) => p.id === row.productId);
    if (!product) return { ok: false, error: `Dòng ${i + 1}: chưa chọn sản phẩm.` };
    const qty = Number(row.qty);
    const unitPrice = Number(row.unitPrice);
    const discountPct = Number(row.discountPct || '0');
    if (!Number.isFinite(qty) || qty <= 0) {
      return { ok: false, error: `Dòng ${i + 1}: số lượng phải lớn hơn 0.` };
    }
    if (!Number.isFinite(unitPrice) || unitPrice < 0) {
      return { ok: false, error: `Dòng ${i + 1}: đơn giá không hợp lệ.` };
    }
    if (!Number.isFinite(discountPct) || discountPct < 0 || discountPct > 100) {
      return { ok: false, error: `Dòng ${i + 1}: chiết khấu phải trong 0–100%.` };
    }
    items.push({
      productId: product.id,
      productName: product.name,
      qty,
      unitPrice,
      discountPct,
    });
  }
  return { ok: true, items };
}

export function totalsOf(rows: EditableItem[], docDiscountPct: string): number {
  const lineTotals = rows
    .filter((r) => r.productId)
    .map((r) =>
      computeLineTotal({
        qty: Number(r.qty) || 0,
        unitPrice: Number(r.unitPrice) || 0,
        discountPct: Number(r.discountPct) || 0,
      }),
    );
  return computeDocTotal(lineTotals, Number(docDiscountPct) || 0);
}

export function ItemsEditor({
  products,
  rows,
  onChange,
}: {
  products: ProductOption[];
  rows: EditableItem[];
  onChange: (rows: EditableItem[]) => void;
}) {
  const update = (index: number, patch: Partial<EditableItem>): void => {
    onChange(rows.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  };

  return (
    <div className="space-y-2.5">
      <div className="hidden sm:grid grid-cols-[1fr_80px_130px_70px_36px] gap-2 px-1 text-xs text-ink-muted">
        <span>Sản phẩm</span>
        <span className="text-right">SL</span>
        <span className="text-right">Đơn giá (đ)</span>
        <span className="text-right">CK %</span>
        <span />
      </div>

      {rows.map((row, i) => (
        <div
          key={i}
          className="grid grid-cols-2 sm:grid-cols-[1fr_80px_130px_70px_36px] gap-2 items-center rounded-xl sm:rounded-none bg-glass-strong/30 sm:bg-transparent p-2 sm:p-0"
        >
          <select
            aria-label={`Sản phẩm dòng ${i + 1}`}
            value={row.productId}
            onChange={(e) => {
              const product = products.find((p) => p.id === e.target.value);
              update(i, {
                productId: e.target.value,
                unitPrice:
                  row.unitPrice === '' && product ? String(product.base_price) : row.unitPrice,
              });
            }}
            className={`${inputClass} col-span-2 sm:col-span-1`}
          >
            <option value="">— Chọn sản phẩm —</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.sku} · {p.name}
              </option>
            ))}
          </select>
          <input
            aria-label={`Số lượng dòng ${i + 1}`}
            type="number"
            min={0}
            step="1"
            value={row.qty}
            onChange={(e) => update(i, { qty: e.target.value })}
            className={`${inputClass} text-right`}
          />
          <input
            aria-label={`Đơn giá dòng ${i + 1}`}
            type="number"
            min={0}
            step="1000"
            value={row.unitPrice}
            onChange={(e) => update(i, { unitPrice: e.target.value })}
            className={`${inputClass} text-right`}
            placeholder="Đơn giá"
          />
          <input
            aria-label={`Chiết khấu dòng ${i + 1}`}
            type="number"
            min={0}
            max={100}
            step="0.5"
            value={row.discountPct}
            onChange={(e) => update(i, { discountPct: e.target.value })}
            className={`${inputClass} text-right`}
          />
          <button
            type="button"
            aria-label={`Xóa dòng ${i + 1}`}
            onClick={() => onChange(rows.filter((_, j) => j !== i))}
            className="grid size-9 place-items-center rounded-xl text-ink-muted hover:bg-danger/15 hover:text-danger transition-colors cursor-pointer justify-self-end sm:justify-self-auto"
          >
            <Trash2 size={16} aria-hidden />
          </button>
        </div>
      ))}

      <button
        type="button"
        onClick={() => onChange([...rows, emptyItem()])}
        className="inline-flex items-center gap-1.5 rounded-xl border border-dashed border-panel/60 px-3 py-2 text-sm text-ink-muted hover:text-accent hover:border-accent/50 transition-colors cursor-pointer"
      >
        <Plus size={15} aria-hidden />
        Thêm dòng
      </button>
    </div>
  );
}

export function TotalBar({ rows, docDiscountPct }: { rows: EditableItem[]; docDiscountPct: string }) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-accent-soft border border-accent/25 px-4 py-3">
      <span className="text-sm text-ink-muted">Tổng cộng (sau chiết khấu)</span>
      <span className="font-bold text-accent tabular-nums">
        {formatMoney(totalsOf(rows, docDiscountPct))}
      </span>
    </div>
  );
}
