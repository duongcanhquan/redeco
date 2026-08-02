'use client';

import { AlertCircle, Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Field, Modal, inputClass } from '@/components/platform/modal';
import { createPlanAction } from '../actions';

export function PlanDialog({
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
  const [intervalDays, setIntervalDays] = useState('30');
  const [nextDueOn, setNextDueOn] = useState(new Date().toISOString().slice(0, 10));
  const [checklist, setChecklist] = useState('');

  const submit = async (): Promise<void> => {
    setBusy(true);
    setError(null);
    const result = await createPlanAction({
      equipmentId,
      code,
      name,
      intervalDays: Number(intervalDays) || 0,
      nextDueOn,
      checklist: checklist
        .split('\n')
        .map((t) => t.trim())
        .filter(Boolean),
    });
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setOpen(false);
    setCode('');
    setName('');
    setChecklist('');
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
        Thêm kế hoạch
      </button>
      <Modal
        title="Kế hoạch PM"
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
          <Field id="pm-eq" label="Thiết bị" required>
            <select
              id="pm-eq"
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
            <Field id="pm-code" label="Mã" required>
              <input
                id="pm-code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className={inputClass}
                required
                placeholder="PM-CNC-30D"
              />
            </Field>
            <Field id="pm-interval" label="Chu kỳ (ngày)" required>
              <input
                id="pm-interval"
                type="number"
                min={1}
                value={intervalDays}
                onChange={(e) => setIntervalDays(e.target.value)}
                className={inputClass}
                required
              />
            </Field>
          </div>
          <Field id="pm-name" label="Tên" required>
            <input
              id="pm-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputClass}
              required
            />
          </Field>
          <Field id="pm-due" label="Ngày đến hạn tiếp theo" required>
            <input
              id="pm-due"
              type="date"
              value={nextDueOn}
              onChange={(e) => setNextDueOn(e.target.value)}
              className={inputClass}
              required
            />
          </Field>
          <Field id="pm-cl" label="Checklist (mỗi dòng)">
            <textarea
              id="pm-cl"
              value={checklist}
              onChange={(e) => setChecklist(e.target.value)}
              className={`${inputClass} min-h-24`}
              rows={3}
            />
          </Field>
          <button
            type="submit"
            disabled={busy}
            className="w-full h-11 rounded-xl bg-accent font-semibold text-app disabled:opacity-60 cursor-pointer"
          >
            {busy ? 'Đang lưu…' : 'Lưu kế hoạch'}
          </button>
        </form>
      </Modal>
    </>
  );
}
