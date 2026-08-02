'use client';

import { AlertCircle, ClipboardList, Plus, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Field, Modal, inputClass } from '@/components/platform/modal';
import { postInventoryTxnAction } from '../actions';

type Line = { itemId: string; qty: string };

export function TxnDialog({
  warehouses,
  items,
}: {
  warehouses: { id: string; code: string; name: string }[];
  items: { id: string; sku: string; name: string }[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txnType, setTxnType] = useState<'receipt' | 'issue'>('receipt');
  const [warehouseId, setWarehouseId] = useState(warehouses[0]?.id ?? '');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<Line[]>([{ itemId: '', qty: '1' }]);

  const submit = async (): Promise<void> => {
    setError(null);
    const parsed = [];
    for (const [i, line] of lines.entries()) {
      if (!line.itemId) {
        setError(`Dòng ${i + 1}: chọn hàng.`);
        return;
      }
      const qty = Number(line.qty);
      if (!(qty > 0)) {
        setError(`Dòng ${i + 1}: số lượng > 0.`);
        return;
      }
      parsed.push({ itemId: line.itemId, qty });
    }
    setBusy(true);
    const result = await postInventoryTxnAction({
      warehouseId,
      txnType,
      notes,
      lines: parsed,
    });
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setOpen(false);
    setLines([{ itemId: '', qty: '1' }]);
    setNotes('');
    router.refresh();
  };

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setWarehouseId(warehouses[0]?.id ?? '');
          setOpen(true);
        }}
        className="inline-flex h-11 items-center gap-2 rounded-xl bg-accent px-4 text-sm font-semibold text-app cursor-pointer"
      >
        <Plus size={17} aria-hidden />
        Tạo phiếu
      </button>

      <Modal
        title="Phiếu nhập / xuất"
        icon={<ClipboardList size={18} className="text-accent" aria-hidden />}
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field id="txn-type" label="Loại phiếu" required>
              <select
                id="txn-type"
                value={txnType}
                onChange={(e) => setTxnType(e.target.value as 'receipt' | 'issue')}
                className={inputClass}
              >
                <option value="receipt">Nhập kho (NK)</option>
                <option value="issue">Xuất kho (XK)</option>
              </select>
            </Field>
            <Field id="txn-wh" label="Kho" required>
              <select
                id="txn-wh"
                required
                value={warehouseId}
                onChange={(e) => setWarehouseId(e.target.value)}
                className={inputClass}
              >
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.code} · {w.name}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <div className="space-y-2">
            <p className="text-sm text-ink-muted">Dòng hàng</p>
            {lines.map((line, idx) => (
              <div key={idx} className="flex flex-wrap gap-2 items-center">
                <select
                  value={line.itemId}
                  onChange={(e) => {
                    const next = [...lines];
                    next[idx] = { ...line, itemId: e.target.value };
                    setLines(next);
                  }}
                  className={`${inputClass} flex-1 min-w-[12rem]`}
                  required
                >
                  <option value="">— Chọn hàng —</option>
                  {items.map((it) => (
                    <option key={it.id} value={it.id}>
                      {it.sku} · {it.name}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  min={0.001}
                  step="any"
                  value={line.qty}
                  onChange={(e) => {
                    const next = [...lines];
                    next[idx] = { ...line, qty: e.target.value };
                    setLines(next);
                  }}
                  className={`${inputClass} w-28`}
                  required
                  aria-label={`Số lượng dòng ${idx + 1}`}
                />
                <button
                  type="button"
                  aria-label="Xóa dòng"
                  disabled={lines.length <= 1}
                  onClick={() => setLines(lines.filter((_, i) => i !== idx))}
                  className="size-11 grid place-items-center rounded-xl border border-panel/50 text-ink-muted hover:text-danger disabled:opacity-40 cursor-pointer"
                >
                  <Trash2 size={16} aria-hidden />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => setLines([...lines, { itemId: '', qty: '1' }])}
              className="text-sm text-accent hover:underline inline-flex items-center gap-1 min-h-11"
            >
              <Plus size={14} aria-hidden />
              Thêm dòng
            </button>
          </div>

          <Field id="txn-notes" label="Ghi chú">
            <input
              id="txn-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className={inputClass}
              placeholder="Nhập mua / xuất sản xuất…"
            />
          </Field>

          {error && (
            <p role="alert" className="text-sm text-danger flex items-center gap-2">
              <AlertCircle size={16} aria-hidden />
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={busy || items.length === 0}
            className="h-11 w-full rounded-xl bg-accent font-semibold text-app disabled:opacity-60"
          >
            {busy ? 'Đang ghi sổ…' : 'Ghi sổ phiếu'}
          </button>
          {items.length === 0 && (
            <p className="text-xs text-warning text-center">
              Chưa có mã hàng kho — mở hub Kho và bấm Đồng bộ từ SP bán hàng.
            </p>
          )}
        </form>
      </Modal>
    </>
  );
}
