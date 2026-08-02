'use client';

import { AlertCircle, Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type {
  EquipmentCriticality,
  EquipmentKind,
  EquipmentStatus,
} from '@optimake/domain';
import { Field, Modal, inputClass } from '@/components/platform/modal';
import { createEquipmentAction } from '../actions';

const KINDS: { value: EquipmentKind; label: string }[] = [
  { value: 'plant', label: 'Nhà máy' },
  { value: 'line', label: 'Dây chuyền' },
  { value: 'machine', label: 'Máy' },
  { value: 'tool', label: 'Công cụ' },
  { value: 'other', label: 'Khác' },
];

const STATUSES: { value: EquipmentStatus; label: string }[] = [
  { value: 'active', label: 'Đang chạy' },
  { value: 'idle', label: 'Chờ' },
  { value: 'down', label: 'Dừng / hỏng' },
  { value: 'draft', label: 'Nháp' },
  { value: 'retired', label: 'Thanh lý' },
];

const CRIT: { value: EquipmentCriticality; label: string }[] = [
  { value: 'low', label: 'Thấp' },
  { value: 'medium', label: 'Trung bình' },
  { value: 'high', label: 'Cao' },
  { value: 'critical', label: 'Rất cao' },
];

export function EquipmentDialog({
  equipment,
}: {
  equipment: { id: string; code: string; name: string }[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [kind, setKind] = useState<EquipmentKind>('machine');
  const [status, setStatus] = useState<EquipmentStatus>('active');
  const [criticality, setCriticality] = useState<EquipmentCriticality>('medium');
  const [parentId, setParentId] = useState('');
  const [locationText, setLocationText] = useState('');

  const submit = async (): Promise<void> => {
    setBusy(true);
    setError(null);
    const result = await createEquipmentAction({
      code,
      name,
      kind,
      status,
      criticality,
      parentId: parentId || undefined,
      locationText: locationText || undefined,
    });
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setOpen(false);
    setCode('');
    setName('');
    setParentId('');
    setLocationText('');
    router.refresh();
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-11 items-center gap-2 rounded-xl bg-accent px-4 text-sm font-semibold text-app cursor-pointer"
      >
        <Plus size={17} aria-hidden />
        Thêm thiết bị
      </button>
      <Modal
        title="Thêm thiết bị"
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
          <Field id="eq-code" label="Mã" required>
            <input
              id="eq-code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className={inputClass}
              required
              placeholder="CNC-01"
            />
          </Field>
          <Field id="eq-name" label="Tên" required>
            <input
              id="eq-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputClass}
              required
            />
          </Field>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field id="eq-kind" label="Loại" required>
              <select
                id="eq-kind"
                value={kind}
                onChange={(e) => setKind(e.target.value as EquipmentKind)}
                className={inputClass}
              >
                {KINDS.map((k) => (
                  <option key={k.value} value={k.value}>
                    {k.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field id="eq-status" label="Trạng thái" required>
              <select
                id="eq-status"
                value={status}
                onChange={(e) => setStatus(e.target.value as EquipmentStatus)}
                className={inputClass}
              >
                {STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <Field id="eq-crit" label="Mức quan trọng">
            <select
              id="eq-crit"
              value={criticality}
              onChange={(e) => setCriticality(e.target.value as EquipmentCriticality)}
              className={inputClass}
            >
              {CRIT.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </Field>
          <Field id="eq-parent" label="Thuộc (cha)">
            <select
              id="eq-parent"
              value={parentId}
              onChange={(e) => setParentId(e.target.value)}
              className={inputClass}
            >
              <option value="">— Không —</option>
              {equipment.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.code} — {e.name}
                </option>
              ))}
            </select>
          </Field>
          <Field id="eq-loc" label="Vị trí">
            <input
              id="eq-loc"
              value={locationText}
              onChange={(e) => setLocationText(e.target.value)}
              className={inputClass}
              placeholder="Xưởng A / Line 1"
            />
          </Field>
          <button
            type="submit"
            disabled={busy}
            className="w-full h-11 rounded-xl bg-accent font-semibold text-app disabled:opacity-60 cursor-pointer"
          >
            {busy ? 'Đang lưu…' : 'Lưu thiết bị'}
          </button>
        </form>
      </Modal>
    </>
  );
}
