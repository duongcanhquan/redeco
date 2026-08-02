'use client';

import { AlertCircle, Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { WarehouseKind } from '@optimake/domain';
import { Field, Modal, inputClass } from '@/components/platform/modal';
import { createWarehouseAction } from '../actions';

export function WarehouseDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [kind, setKind] = useState<WarehouseKind>('fg');

  const submit = async (): Promise<void> => {
    setBusy(true);
    setError(null);
    const result = await createWarehouseAction({ code, name, kind });
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
        className="inline-flex h-11 items-center gap-2 rounded-xl bg-accent px-4 text-sm font-semibold text-app cursor-pointer"
      >
        <Plus size={17} aria-hidden />
        Thêm kho
      </button>
      <Modal
        title="Thêm kho"
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
          <Field id="wh-code" label="Mã kho" required>
            <input
              id="wh-code"
              required
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className={inputClass}
              placeholder="KHO-PHU"
            />
          </Field>
          <Field id="wh-name" label="Tên kho" required>
            <input
              id="wh-name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field id="wh-kind" label="Loại kho" required>
            <select
              id="wh-kind"
              value={kind}
              onChange={(e) => setKind(e.target.value as WarehouseKind)}
              className={inputClass}
            >
              <option value="fg">Thành phẩm</option>
              <option value="raw">Nguyên vật liệu</option>
              <option value="wip">Bán thành phẩm</option>
              <option value="spare">Phụ tùng</option>
              <option value="other">Khác</option>
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
            {busy ? 'Đang lưu…' : 'Tạo kho'}
          </button>
        </form>
      </Modal>
    </>
  );
}
