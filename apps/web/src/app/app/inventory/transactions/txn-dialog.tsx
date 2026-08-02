'use client';

import { AlertCircle, ClipboardList, Plus, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { Field, Modal, inputClass } from '@/components/platform/modal';
import { postInventoryTxnAction } from '../actions';

type Line = {
  itemId: string;
  qty: string;
  locationId: string;
  lotCode: string;
  expiryDate: string;
};

type ItemOpt = {
  id: string;
  sku: string;
  name: string;
  trackLot: boolean;
};

type LocOpt = {
  id: string;
  warehouseId: string;
  code: string;
  name: string;
};

export function TxnDialog({
  warehouses,
  items,
  locations,
}: {
  warehouses: { id: string; code: string; name: string }[];
  items: ItemOpt[];
  locations: LocOpt[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txnType, setTxnType] = useState<'receipt' | 'issue'>('receipt');
  const [warehouseId, setWarehouseId] = useState(warehouses[0]?.id ?? '');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<Line[]>([
    { itemId: '', qty: '1', locationId: '', lotCode: '', expiryDate: '' },
  ]);

  const locsForWh = useMemo(
    () => locations.filter((l) => l.warehouseId === warehouseId),
    [locations, warehouseId],
  );

  const emptyLine = (): Line => ({
    itemId: '',
    qty: '1',
    locationId: '',
    lotCode: '',
    expiryDate: '',
  });

  const submit = async (): Promise<void> => {
    setError(null);
    const parsed: {
      itemId: string;
      qty: number;
      locationId?: string;
      lotCode?: string;
      expiryDate?: string;
    }[] = [];
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
      const item = items.find((it) => it.id === line.itemId);
      if (txnType === 'receipt' && item?.trackLot && !line.lotCode.trim()) {
        setError(`Dòng ${i + 1}: hàng theo dõi lô — nhập mã lô.`);
        return;
      }
      parsed.push({
        itemId: line.itemId,
        qty,
        locationId: line.locationId || undefined,
        lotCode: line.lotCode.trim() || undefined,
        expiryDate: line.expiryDate || undefined,
      });
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
    setLines([emptyLine()]);
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
                onChange={(e) => {
                  setWarehouseId(e.target.value);
                  setLines((prev) => prev.map((l) => ({ ...l, locationId: '' })));
                }}
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

          <div className="space-y-3">
            <p className="text-sm text-ink-muted">
              Dòng hàng — vị trí trống = mặc định (nhập) hoặc FIFO/FEFO (xuất).
            </p>
            {lines.map((line, idx) => {
              const item = items.find((it) => it.id === line.itemId);
              return (
                <div
                  key={idx}
                  className="rounded-xl border border-panel/40 p-3 space-y-2"
                >
                  <div className="flex flex-wrap gap-2 items-center">
                    <select
                      value={line.itemId}
                      onChange={(e) => {
                        const next = [...lines];
                        next[idx] = { ...line, itemId: e.target.value };
                        setLines(next);
                      }}
                      className={`${inputClass} flex-1 min-w-[12rem]`}
                      required
                      aria-label={`Hàng dòng ${idx + 1}`}
                    >
                      <option value="">— Chọn hàng —</option>
                      {items.map((it) => (
                        <option key={it.id} value={it.id}>
                          {it.sku} · {it.name}
                          {it.trackLot ? ' (lô)' : ''}
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
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <Field id={`loc-${idx}`} label="Vị trí (Bin)">
                      <select
                        id={`loc-${idx}`}
                        value={line.locationId}
                        onChange={(e) => {
                          const next = [...lines];
                          next[idx] = { ...line, locationId: e.target.value };
                          setLines(next);
                        }}
                        className={inputClass}
                      >
                        <option value="">— Mặc định / tự chia —</option>
                        {locsForWh.map((loc) => (
                          <option key={loc.id} value={loc.id}>
                            {loc.code} · {loc.name}
                          </option>
                        ))}
                      </select>
                    </Field>
                    {(txnType === 'receipt' || item?.trackLot) && (
                      <>
                        <Field
                          id={`lot-${idx}`}
                          label="Mã lô"
                          required={txnType === 'receipt' && Boolean(item?.trackLot)}
                        >
                          <input
                            id={`lot-${idx}`}
                            value={line.lotCode}
                            onChange={(e) => {
                              const next = [...lines];
                              next[idx] = { ...line, lotCode: e.target.value };
                              setLines(next);
                            }}
                            className={inputClass}
                            placeholder={item?.trackLot ? 'Bắt buộc nếu theo dõi lô' : 'Tuỳ chọn'}
                          />
                        </Field>
                        <Field id={`exp-${idx}`} label="Hạn dùng">
                          <input
                            id={`exp-${idx}`}
                            type="date"
                            value={line.expiryDate}
                            onChange={(e) => {
                              const next = [...lines];
                              next[idx] = { ...line, expiryDate: e.target.value };
                              setLines(next);
                            }}
                            className={inputClass}
                          />
                        </Field>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
            <button
              type="button"
              onClick={() => setLines([...lines, emptyLine()])}
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
