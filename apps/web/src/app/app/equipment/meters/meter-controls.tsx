'use client';

import { AlertCircle, Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Field, Modal, inputClass } from '@/components/platform/modal';
import { createMeterAction, recordMeterReadingAction } from '../actions';

export function MeterDialog({
  equipment,
}: {
  equipment: { id: string; code: string; name: string }[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [equipmentId, setEquipmentId] = useState(equipment[0]?.id ?? '');
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [unit, setUnit] = useState('h');
  const [warn, setWarn] = useState('');
  const [crit, setCrit] = useState('');

  const submit = async (): Promise<void> => {
    setBusy(true);
    setError(null);
    const result = await createMeterAction({
      equipmentId,
      code,
      name,
      unit,
      thresholdWarn: warn ? Number(warn) : null,
      thresholdCritical: crit ? Number(crit) : null,
    });
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setOpen(false);
    setCode('');
    setName('');
    router.refresh();
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={equipment.length === 0}
        className="inline-flex h-11 items-center gap-2 rounded-xl bg-accent px-4 text-sm font-semibold text-app cursor-pointer disabled:opacity-50"
      >
        <Plus size={17} aria-hidden />
        Thêm meter
      </button>
      <Modal
        title="Meter / cảm biến"
        icon={<Plus size={18} className="text-accent" aria-hidden />}
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
          {error ? (
            <p className="flex items-start gap-2 text-sm text-danger" role="alert">
              <AlertCircle size={16} className="mt-0.5 shrink-0" aria-hidden />
              {error}
            </p>
          ) : null}
          <Field id="m-eq" label="Thiết bị" required>
            <select
              id="m-eq"
              value={equipmentId}
              onChange={(e) => setEquipmentId(e.target.value)}
              className={inputClass}
              required
            >
              {equipment.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.code} — {e.name}
                </option>
              ))}
            </select>
          </Field>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field id="m-code" label="Mã" required>
              <input
                id="m-code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className={inputClass}
                required
                placeholder="VH-CNC01"
              />
            </Field>
            <Field id="m-unit" label="Đơn vị">
              <input
                id="m-unit"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className={inputClass}
              />
            </Field>
          </div>
          <Field id="m-name" label="Tên" required>
            <input
              id="m-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputClass}
              required
            />
          </Field>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field id="m-warn" label="Ngưỡng cảnh báo">
              <input
                id="m-warn"
                type="number"
                step="any"
                value={warn}
                onChange={(e) => setWarn(e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field id="m-crit" label="Ngưỡng critical">
              <input
                id="m-crit"
                type="number"
                step="any"
                value={crit}
                onChange={(e) => setCrit(e.target.value)}
                className={inputClass}
              />
            </Field>
          </div>
          <button
            type="submit"
            disabled={busy}
            className="w-full h-11 rounded-xl bg-accent font-semibold text-app disabled:opacity-60 cursor-pointer"
          >
            {busy ? 'Đang lưu…' : 'Lưu meter'}
          </button>
        </form>
      </Modal>
    </>
  );
}

export function RecordReadingButton({
  meterId,
  lastValue,
}: {
  meterId: string;
  lastValue: number | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [value, setValue] = useState(String(lastValue ?? ''));
  const [msg, setMsg] = useState<string | null>(null);

  const run = async (source: 'manual' | 'iot_stub'): Promise<void> => {
    setBusy(true);
    setMsg(null);
    const num =
      source === 'iot_stub'
        ? (lastValue ?? 0) + Math.round(Math.random() * 5 + 1)
        : Number(value);
    const result = await recordMeterReadingAction({ meterId, value: num, source });
    setBusy(false);
    if (!result.ok) {
      setMsg(result.error);
      return;
    }
    setMsg(
      result.data.alertLevel === 'critical'
        ? `Critical — đã tạo YC BT`
        : result.data.alertLevel === 'warn'
          ? 'Cảnh báo ngưỡng'
          : 'OK',
    );
    if (source === 'iot_stub') setValue(String(num));
    router.refresh();
  };

  return (
    <div className="flex flex-wrap items-center gap-2 justify-end">
      <input
        type="number"
        step="any"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="h-10 w-24 rounded-xl border border-panel/50 bg-panel/30 px-2 text-sm"
        aria-label="Giá trị đọc"
      />
      <button
        type="button"
        disabled={busy}
        onClick={() => void run('manual')}
        className="h-10 rounded-xl bg-accent px-3 text-xs font-semibold text-app cursor-pointer disabled:opacity-60"
      >
        Ghi
      </button>
      <button
        type="button"
        disabled={busy}
        onClick={() => void run('iot_stub')}
        className="h-10 rounded-xl border border-panel/50 px-3 text-xs font-semibold cursor-pointer disabled:opacity-60"
        title="Mô phỏng cảm biến IoT"
      >
        IoT stub
      </button>
      {msg ? <span className="text-xs text-ink-muted w-full text-right">{msg}</span> : null}
    </div>
  );
}
