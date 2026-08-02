'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { Field, inputClass } from '@/components/platform/modal';
import { createWorkOrderAction } from '../actions';

export function CreateWoForm({
  fgItems,
}: {
  fgItems: { id: string; label: string }[];
}) {
  const router = useRouter();
  const [finishedItemId, setFinishedItemId] = useState(fgItems[0]?.id ?? '');
  const [qtyPlanned, setQtyPlanned] = useState(1);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const submit = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const result = await createWorkOrderAction({ finishedItemId, qtyPlanned });
    setBusy(false);
    if (!result.ok) {
      setMsg(result.error);
      return;
    }
    setMsg(`Đã tạo ${result.data.code}`);
    router.refresh();
  };

  if (fgItems.length === 0) {
    return (
      <p className="glass rounded-2xl p-4 text-sm text-warning">
        Chưa có thành phẩm kho — đồng bộ Kho trước khi tạo LSX.
      </p>
    );
  }

  return (
    <form
      onSubmit={(e) => void submit(e)}
      className="glass rounded-2xl p-4 sm:p-5 space-y-4"
    >
      <p className="text-sm font-semibold">Tạo lệnh SX (nháp)</p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Field id="wo-fg" label="Thành phẩm" required>
          <select
            id="wo-fg"
            className={inputClass}
            required
            value={finishedItemId}
            onChange={(e) => setFinishedItemId(e.target.value)}
          >
            {fgItems.map((i) => (
              <option key={i.id} value={i.id}>
                {i.label}
              </option>
            ))}
          </select>
        </Field>
        <Field id="wo-qty" label="SL kế hoạch" required>
          <input
            id="wo-qty"
            type="number"
            min={0.001}
            step="any"
            className={inputClass}
            required
            value={qtyPlanned}
            onChange={(e) => setQtyPlanned(Number(e.target.value))}
          />
        </Field>
        <div className="flex items-end">
          <button
            type="submit"
            disabled={busy}
            className="h-11 w-full rounded-xl bg-accent px-5 font-semibold text-app disabled:opacity-60"
          >
            {busy ? 'Đang tạo…' : 'Tạo LSX'}
          </button>
        </div>
      </div>
      {msg && (
        <p
          role="alert"
          className={`text-sm ${msg.startsWith('Đã') ? 'text-success' : 'text-danger'}`}
        >
          {msg}
        </p>
      )}
    </form>
  );
}
