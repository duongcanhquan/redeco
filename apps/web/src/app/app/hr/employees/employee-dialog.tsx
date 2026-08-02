'use client';

import { AlertCircle, Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { EmployeeStatus } from '@optimake/domain';
import { Field, Modal, inputClass } from '@/components/platform/modal';
import { createEmployeeAction } from '../actions';

export function EmployeeDialog({
  departments,
}: {
  departments: { id: string; code: string; name: string }[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fullName, setFullName] = useState('');
  const [code, setCode] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [hiredOn, setHiredOn] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<EmployeeStatus>('active');

  const submit = async (): Promise<void> => {
    setBusy(true);
    setError(null);
    const result = await createEmployeeAction({
      fullName,
      code: code || undefined,
      departmentId: departmentId || undefined,
      jobTitle,
      status,
      hiredOn: hiredOn || undefined,
      phone: phone || undefined,
      email: email || undefined,
    });
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setOpen(false);
    setFullName('');
    setCode('');
    setJobTitle('');
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
        Thêm nhân viên
      </button>
      <Modal
        title="Thêm nhân viên"
        icon={<Plus size={18} className="text-accent" aria-hidden />}
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
            <Field id="emp-name" label="Họ tên" required>
              <input
                id="emp-name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className={inputClass}
                required
              />
            </Field>
            <Field id="emp-code" label="Mã NV (để trống = tự sinh)">
              <input
                id="emp-code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className={inputClass}
                placeholder="NV-0001"
              />
            </Field>
            <Field id="emp-title" label="Chức danh">
              <input
                id="emp-title"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field id="emp-dept" label="Phòng ban">
              <select
                id="emp-dept"
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
                className={inputClass}
              >
                <option value="">— Chưa gán —</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.code} · {d.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field id="emp-hired" label="Ngày vào">
              <input
                id="emp-hired"
                type="date"
                value={hiredOn}
                onChange={(e) => setHiredOn(e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field id="emp-status" label="Trạng thái">
              <select
                id="emp-status"
                value={status}
                onChange={(e) => setStatus(e.target.value as EmployeeStatus)}
                className={inputClass}
              >
                <option value="active">Đang làm</option>
                <option value="draft">Nháp</option>
                <option value="on_leave">Nghỉ phép dài</option>
              </select>
            </Field>
            <Field id="emp-phone" label="Điện thoại">
              <input
                id="emp-phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field id="emp-email" label="Email">
              <input
                id="emp-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClass}
              />
            </Field>
          </div>
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
