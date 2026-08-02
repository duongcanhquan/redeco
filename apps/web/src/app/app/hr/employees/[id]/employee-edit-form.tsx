'use client';

import { AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { EmployeeStatus } from '@optimake/domain';
import { Field, inputClass } from '@/components/platform/modal';
import { updateEmployeeAction } from '../../actions';

export function EmployeeEditForm({
  employee,
  departments,
}: {
  employee: {
    id: string;
    full_name: string;
    status: EmployeeStatus;
    department_id: string | null;
    job_title: string;
    hired_on: string | null;
    terminated_on: string | null;
    phone: string | null;
    email: string | null;
  };
  departments: { id: string; code: string; name: string }[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fullName, setFullName] = useState(employee.full_name);
  const [jobTitle, setJobTitle] = useState(employee.job_title);
  const [departmentId, setDepartmentId] = useState(employee.department_id ?? '');
  const [status, setStatus] = useState<EmployeeStatus>(employee.status);
  const [hiredOn, setHiredOn] = useState(employee.hired_on ?? '');
  const [terminatedOn, setTerminatedOn] = useState(employee.terminated_on ?? '');
  const [phone, setPhone] = useState(employee.phone ?? '');
  const [email, setEmail] = useState(employee.email ?? '');

  const submit = async (): Promise<void> => {
    setBusy(true);
    setError(null);
    const result = await updateEmployeeAction({
      id: employee.id,
      fullName,
      jobTitle,
      departmentId: departmentId || null,
      status,
      hiredOn: hiredOn || null,
      terminatedOn: terminatedOn || null,
      phone: phone || null,
      email: email || null,
    });
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.refresh();
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
      className="glass rounded-2xl border border-panel/40 p-4 space-y-4"
    >
      <h2 className="text-sm font-semibold">Hồ sơ</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field id="edit-name" label="Họ tên" required>
          <input
            id="edit-name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className={inputClass}
            required
          />
        </Field>
        <Field id="edit-title" label="Chức danh">
          <input
            id="edit-title"
            value={jobTitle}
            onChange={(e) => setJobTitle(e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field id="edit-dept" label="Phòng ban">
          <select
            id="edit-dept"
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
        <Field id="edit-status" label="Trạng thái">
          <select
            id="edit-status"
            value={status}
            onChange={(e) => setStatus(e.target.value as EmployeeStatus)}
            className={inputClass}
          >
            <option value="active">Đang làm</option>
            <option value="draft">Nháp</option>
            <option value="on_leave">Nghỉ dài</option>
            <option value="terminated">Đã nghỉ</option>
          </select>
        </Field>
        <Field id="edit-hired" label="Ngày vào">
          <input
            id="edit-hired"
            type="date"
            value={hiredOn}
            onChange={(e) => setHiredOn(e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field id="edit-term" label="Ngày nghỉ">
          <input
            id="edit-term"
            type="date"
            value={terminatedOn}
            onChange={(e) => setTerminatedOn(e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field id="edit-phone" label="Điện thoại">
          <input
            id="edit-phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field id="edit-email" label="Email">
          <input
            id="edit-email"
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
        className="h-11 rounded-xl bg-accent px-5 text-sm font-semibold text-app disabled:opacity-60"
      >
        {busy ? 'Đang lưu…' : 'Cập nhật hồ sơ'}
      </button>
    </form>
  );
}
