'use client';

import { AlertCircle, Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { DepartmentKind } from '@optimake/domain';
import { Field, Modal, inputClass } from '@/components/platform/modal';
import { createDepartmentAction } from '../actions';

const KINDS: { value: DepartmentKind; label: string }[] = [
  { value: 'company', label: 'Công ty' },
  { value: 'division', label: 'Khối / ban' },
  { value: 'workshop', label: 'Xưởng' },
  { value: 'team', label: 'Tổ đội' },
  { value: 'office', label: 'Phòng ban' },
  { value: 'other', label: 'Khác' },
];

export function DepartmentDialog({
  departments,
}: {
  departments: { id: string; code: string; name: string }[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [kind, setKind] = useState<DepartmentKind>('workshop');
  const [parentId, setParentId] = useState('');

  const submit = async (): Promise<void> => {
    setBusy(true);
    setError(null);
    const result = await createDepartmentAction({
      code,
      name,
      kind,
      parentId: parentId || undefined,
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
        Thêm phòng ban
      </button>
      <Modal
        title="Thêm phòng ban"
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
          <Field id="dept-code" label="Mã" required>
            <input
              id="dept-code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className={inputClass}
              required
              placeholder="XUONG-A"
            />
          </Field>
          <Field id="dept-name" label="Tên" required>
            <input
              id="dept-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputClass}
              required
            />
          </Field>
          <Field id="dept-kind" label="Loại" required>
            <select
              id="dept-kind"
              value={kind}
              onChange={(e) => setKind(e.target.value as DepartmentKind)}
              className={inputClass}
            >
              {KINDS.map((k) => (
                <option key={k.value} value={k.value}>
                  {k.label}
                </option>
              ))}
            </select>
          </Field>
          <Field id="dept-parent" label="Thuộc (cha)">
            <select
              id="dept-parent"
              value={parentId}
              onChange={(e) => setParentId(e.target.value)}
              className={inputClass}
            >
              <option value="">— Gốc —</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.code} · {d.name}
                </option>
              ))}
            </select>
          </Field>
          {error && (
            <p role="alert" className="text-sm text-danger flex items-center gap-2">
              <AlertCircle size={16} aria-hidden />
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={busy}
            className="h-11 w-full rounded-xl bg-accent font-semibold text-app disabled:opacity-60"
          >
            {busy ? 'Đang lưu…' : 'Lưu'}
          </button>
        </form>
      </Modal>
    </>
  );
}
