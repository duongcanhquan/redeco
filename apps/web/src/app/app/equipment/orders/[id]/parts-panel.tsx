'use client';

import { AlertCircle, Package } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Field, Modal, inputClass } from '@/components/platform/modal';
import {
  addPartLineAction,
  cancelPartLineAction,
  issuePartsAction,
} from '../../actions';

export function PartsPanel({
  orderId,
  canManage,
  canIssue,
  parts,
  items,
  warehouses,
}: {
  orderId: string;
  canManage: boolean;
  canIssue: boolean;
  parts: {
    id: string;
    sku: string;
    name: string;
    qty_planned: number;
    qty_issued: number;
    status: string;
    warehouseCode: string;
  }[];
  items: { id: string; sku: string; name: string }[];
  warehouses: { id: string; code: string; name: string }[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [itemId, setItemId] = useState(items[0]?.id ?? '');
  const [warehouseId, setWarehouseId] = useState(warehouses[0]?.id ?? '');
  const [qty, setQty] = useState('1');

  const plannedCount = parts.filter((p) => p.status === 'planned').length;

  const add = async (): Promise<void> => {
    setBusy(true);
    setError(null);
    const result = await addPartLineAction({
      orderId,
      itemId,
      warehouseId,
      qtyPlanned: Number(qty) || 0,
    });
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setOpen(false);
    setQty('1');
    router.refresh();
  };

  const issue = async (): Promise<void> => {
    setBusy(true);
    setError(null);
    setMsg(null);
    const result = await issuePartsAction(orderId);
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setMsg(`Đã xuất: ${result.data.txnCodes.join(', ')}`);
    router.refresh();
  };

  return (
    <section className="glass rounded-2xl p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-semibold flex items-center gap-2">
          <Package size={18} className="text-accent" aria-hidden />
          Phụ tùng
        </h2>
        {canManage ? (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setOpen(true)}
              disabled={items.length === 0 || warehouses.length === 0}
              className="h-11 rounded-xl border border-panel/50 px-3 text-sm font-semibold hover:bg-glass-strong cursor-pointer disabled:opacity-50"
            >
              Thêm dòng
            </button>
            {canIssue && plannedCount > 0 ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => void issue()}
                className="h-11 rounded-xl bg-accent px-4 text-sm font-semibold text-app cursor-pointer disabled:opacity-60"
              >
                {busy ? 'Đang xuất…' : 'Xuất kho phụ tùng'}
              </button>
            ) : null}
          </div>
        ) : null}
      </div>

      {items.length === 0 || warehouses.length === 0 ? (
        <p className="text-sm text-ink-muted">
          Cần danh mục hàng + kho (module Kho hoặc dữ liệu đã đồng bộ) để xuất phụ tùng.
        </p>
      ) : null}

      {parts.length === 0 ? (
        <p className="text-sm text-ink-muted">Chưa khai báo phụ tùng trên lệnh.</p>
      ) : (
        <ul className="space-y-2">
          {parts.map((p) => (
            <li
              key={p.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-panel/30 px-3 py-3 min-h-11"
            >
              <div className="text-sm">
                <p className="font-medium">
                  {p.sku} — {p.name}
                </p>
                <p className="text-ink-muted text-xs mt-0.5">
                  {p.warehouseCode} · KH {p.qty_planned} · Đã XK {p.qty_issued} ·{' '}
                  {p.status === 'issued'
                    ? 'Đã xuất'
                    : p.status === 'cancelled'
                      ? 'Huỷ'
                      : 'Chờ xuất'}
                </p>
              </div>
              {canManage && p.status === 'planned' ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={async () => {
                    setBusy(true);
                    await cancelPartLineAction({ partLineId: p.id, orderId });
                    setBusy(false);
                    router.refresh();
                  }}
                  className="h-10 rounded-xl border border-danger/40 px-3 text-xs font-semibold text-danger cursor-pointer"
                >
                  Huỷ dòng
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      {error ? (
        <p className="flex items-start gap-2 text-sm text-danger" role="alert">
          <AlertCircle size={16} className="mt-0.5 shrink-0" aria-hidden />
          {error}
        </p>
      ) : null}
      {msg ? (
        <p className="text-sm text-success" role="status">
          {msg}
        </p>
      ) : null}

      <Modal
        title="Thêm phụ tùng"
        icon={<Package size={18} className="text-accent" aria-hidden />}
        open={open}
        onClose={() => setOpen(false)}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void add();
          }}
          className="space-y-4"
        >
          <Field id="pt-item" label="Mã hàng" required>
            <select
              id="pt-item"
              value={itemId}
              onChange={(e) => setItemId(e.target.value)}
              className={inputClass}
              required
            >
              {items.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.sku} — {i.name}
                </option>
              ))}
            </select>
          </Field>
          <Field id="pt-wh" label="Kho xuất" required>
            <select
              id="pt-wh"
              value={warehouseId}
              onChange={(e) => setWarehouseId(e.target.value)}
              className={inputClass}
              required
            >
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.code} — {w.name}
                </option>
              ))}
            </select>
          </Field>
          <Field id="pt-qty" label="Số lượng" required>
            <input
              id="pt-qty"
              type="number"
              min={0.001}
              step="any"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              className={inputClass}
              required
            />
          </Field>
          <button
            type="submit"
            disabled={busy}
            className="w-full h-11 rounded-xl bg-accent font-semibold text-app disabled:opacity-60 cursor-pointer"
          >
            {busy ? 'Đang lưu…' : 'Thêm'}
          </button>
        </form>
      </Modal>
    </section>
  );
}
