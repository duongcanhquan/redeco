'use client';

import { AlertCircle, PackagePlus, Pencil } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Field, Modal, inputClass } from '@/components/platform/modal';
import type { ProductRow } from '@/services/sales.service';
import { createProductAction, updateProductAction } from './actions';

export function ProductDialog({ product }: { product?: ProductRow }) {
  const router = useRouter();
  const editing = Boolean(product);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [sku, setSku] = useState(product?.sku ?? '');
  const [name, setName] = useState(product?.name ?? '');
  const [uom, setUom] = useState(product?.uom ?? 'cái');
  const [basePrice, setBasePrice] = useState(String(product?.base_price ?? ''));
  const [stock, setStock] = useState(String(product?.product_stock?.qty_on_hand ?? '0'));
  const [isActive, setIsActive] = useState(product?.is_active ?? true);

  const submit = async (): Promise<void> => {
    setError(null);
    const price = Number(basePrice);
    const qty = Number(stock);
    if (!Number.isFinite(price) || price < 0) {
      setError('Đơn giá chuẩn phải là số không âm.');
      return;
    }
    if (!Number.isFinite(qty) || qty < 0) {
      setError('Tồn kho phải là số không âm.');
      return;
    }
    setSaving(true);
    const base = { sku, name, uom, basePrice: price };
    const result = product
      ? await updateProductAction(product.id, { ...base, isActive, stock: qty })
      : await createProductAction({ ...base, initialStock: qty });
    setSaving(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setOpen(false);
    router.refresh();
  };

  return (
    <>
      {editing ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={`Sửa sản phẩm ${product?.name}`}
          className="grid size-9 place-items-center rounded-xl text-ink-muted hover:bg-glass-strong hover:text-ink transition-colors cursor-pointer"
        >
          <Pencil size={16} aria-hidden />
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex h-11 items-center gap-2 rounded-xl bg-accent px-4 font-semibold text-app text-sm cursor-pointer transition-shadow hover:shadow-[0_0_18px_rgba(0,238,255,0.4)]"
        >
          <PackagePlus size={17} aria-hidden />
          Thêm sản phẩm
        </button>
      )}

      <Modal
        title={editing ? `Sửa sản phẩm — ${product?.sku}` : 'Thêm sản phẩm'}
        icon={<PackagePlus size={18} className="text-accent" aria-hidden />}
        open={open}
        onClose={() => setOpen(false)}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
          className="space-y-4"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field id="prod-sku" label="SKU" required hint="Mã duy nhất, tự viết hoa.">
              <input
                id="prod-sku"
                required
                disabled={editing}
                value={sku}
                onChange={(e) => setSku(e.target.value.toUpperCase())}
                className={inputClass}
                placeholder="SP-001"
              />
            </Field>
            <Field id="prod-uom" label="Đơn vị tính">
              <input
                id="prod-uom"
                value={uom}
                onChange={(e) => setUom(e.target.value)}
                className={inputClass}
                placeholder="cái / bộ / kg"
              />
            </Field>
          </div>

          <Field id="prod-name" label="Tên sản phẩm" required>
            <input
              id="prod-name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputClass}
              placeholder="Băng chuyền con lăn 6m"
            />
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field id="prod-price" label="Đơn giá chuẩn (đ)" required hint="Dùng làm giá mặc định khi báo giá.">
              <input
                id="prod-price"
                type="number"
                min={0}
                step="1000"
                required
                value={basePrice}
                onChange={(e) => setBasePrice(e.target.value)}
                className={inputClass}
                placeholder="25000000"
              />
            </Field>
            <Field id="prod-stock" label="Tồn kho thành phẩm" hint="Nguồn dữ liệu cho kiểm tra ATP.">
              <input
                id="prod-stock"
                type="number"
                min={0}
                step="1"
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                className={inputClass}
              />
            </Field>
          </div>

          {editing && (
            <label className="flex items-center gap-2.5 text-sm cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="size-4 accent-accent cursor-pointer"
              />
              Đang kinh doanh (hiện trong danh sách chọn khi báo giá)
            </label>
          )}

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
              {saving ? 'Đang lưu…' : editing ? 'Lưu thay đổi' : 'Tạo sản phẩm'}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
