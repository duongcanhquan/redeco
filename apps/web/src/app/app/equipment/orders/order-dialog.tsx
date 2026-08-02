'use client';

import { AlertCircle, Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { MaintenanceOrderKind, WorkRequestPriority } from '@optimake/domain';
import { Field, Modal, inputClass } from '@/components/platform/modal';
import { createMaintenanceOrderAction } from '../actions';

const KINDS: { value: MaintenanceOrderKind; label: string }[] = [
  { value: 'corrective', label: 'Sửa chữa' },
  { value: 'preventive', label: 'Định kỳ' },
  { value: 'inspection', label: 'Kiểm tra' },
];

const PRI: { value: WorkRequestPriority; label: string }[] = [
  { value: 'low', label: 'Thấp' },
  { value: 'medium', label: 'Trung bình' },
  { value: 'high', label: 'Cao' },
  { value: 'urgent', label: 'Khẩn' },
];

export function OrderDialog({
  equipment,
}: {
  equipment: { id: string; code: string; name: string }[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [equipmentId, setEquipmentId] = useState(equipment[0]?.id ?? '');
  const [title, setTitle] = useState('');
  const [kind, setKind] = useState<MaintenanceOrderKind>('corrective');
  const [priority, setPriority] = useState<WorkRequestPriority>('medium');
  const [tasks, setTasks] = useState('');

  const submit = async (): Promise<void> => {
    setBusy(true);
    setError(null);
    const result = await createMaintenanceOrderAction({
      equipmentId,
      title,
      kind,
      priority,
      taskTitles: tasks
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
    setTitle('');
    setTasks('');
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
        Tạo lệnh
      </button>
      <Modal
        title="Lệnh bảo trì"
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
          <Field id="mo-eq" label="Thiết bị" required>
            <select
              id="mo-eq"
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
          <Field id="mo-title" label="Tiêu đề" required>
            <input
              id="mo-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={inputClass}
              required
            />
          </Field>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field id="mo-kind" label="Loại">
              <select
                id="mo-kind"
                value={kind}
                onChange={(e) => setKind(e.target.value as MaintenanceOrderKind)}
                className={inputClass}
              >
                {KINDS.map((k) => (
                  <option key={k.value} value={k.value}>
                    {k.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field id="mo-pri" label="Ưu tiên">
              <select
                id="mo-pri"
                value={priority}
                onChange={(e) => setPriority(e.target.value as WorkRequestPriority)}
                className={inputClass}
              >
                {PRI.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <Field id="mo-tasks" label="Checklist (mỗi dòng một việc)">
            <textarea
              id="mo-tasks"
              value={tasks}
              onChange={(e) => setTasks(e.target.value)}
              className={`${inputClass} min-h-24`}
              rows={3}
              placeholder={'Kiểm tra dầu\nVệ sinh lọc'}
            />
          </Field>
          <button
            type="submit"
            disabled={busy}
            className="w-full h-11 rounded-xl bg-accent font-semibold text-app disabled:opacity-60 cursor-pointer"
          >
            {busy ? 'Đang lưu…' : 'Lưu lệnh nháp'}
          </button>
        </form>
      </Modal>
    </>
  );
}
