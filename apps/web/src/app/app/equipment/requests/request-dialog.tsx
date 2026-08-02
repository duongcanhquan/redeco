'use client';

import { AlertCircle, Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { WorkRequestPriority } from '@optimake/domain';
import { Field, Modal, inputClass } from '@/components/platform/modal';
import { createWorkRequestAction } from '../actions';

const PRI: { value: WorkRequestPriority; label: string }[] = [
  { value: 'low', label: 'Thấp' },
  { value: 'medium', label: 'Trung bình' },
  { value: 'high', label: 'Cao' },
  { value: 'urgent', label: 'Khẩn' },
];

export function WorkRequestDialog({
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
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<WorkRequestPriority>('medium');

  const submit = async (): Promise<void> => {
    setBusy(true);
    setError(null);
    const result = await createWorkRequestAction({
      equipmentId,
      title,
      description,
      priority,
    });
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setOpen(false);
    setTitle('');
    setDescription('');
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
        Tạo yêu cầu
      </button>
      <Modal
        title="Yêu cầu bảo trì"
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
          <Field id="wr-eq" label="Thiết bị" required>
            <select
              id="wr-eq"
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
          <Field id="wr-title" label="Tiêu đề" required>
            <input
              id="wr-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={inputClass}
              required
              placeholder="Máy kêu lạ / không khởi động"
            />
          </Field>
          <Field id="wr-desc" label="Mô tả">
            <textarea
              id="wr-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={`${inputClass} min-h-24`}
              rows={3}
            />
          </Field>
          <Field id="wr-pri" label="Ưu tiên">
            <select
              id="wr-pri"
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
          <button
            type="submit"
            disabled={busy}
            className="w-full h-11 rounded-xl bg-accent font-semibold text-app disabled:opacity-60 cursor-pointer"
          >
            {busy ? 'Đang lưu…' : 'Gửi yêu cầu'}
          </button>
        </form>
      </Modal>
    </>
  );
}
