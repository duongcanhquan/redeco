'use client';

import { AlertCircle, Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Field, Modal, inputClass } from '@/components/platform/modal';
import { createLeaveRequestAction } from '../actions';

export function LeaveRequestDialog({
  employees,
  leaveTypes,
}: {
  employees: { id: string; code: string; full_name: string }[];
  leaveTypes: { id: string; code: string; name: string }[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [employeeId, setEmployeeId] = useState(employees[0]?.id ?? '');
  const [leaveTypeId, setLeaveTypeId] = useState(leaveTypes[0]?.id ?? '');
  const [startsOn, setStartsOn] = useState('');
  const [endsOn, setEndsOn] = useState('');
  const [note, setNote] = useState('');

  const submit = async (): Promise<void> => {
    setBusy(true);
    setError(null);
    const result = await createLeaveRequestAction({
      employeeId,
      leaveTypeId,
      startsOn,
      endsOn,
      note,
    });
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setOpen(false);
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
        Tạo đơn nghỉ
      </button>
      <Modal
        title="Đơn nghỉ phép"
        open={open}
        onClose={() => setOpen(false)}
        icon={<Plus size={18} className="text-accent" aria-hidden />}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
          className="space-y-4"
        >
          <Field id="lv-emp" label="Nhân viên" required>
            <select
              id="lv-emp"
              className={inputClass}
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              required
            >
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.code} · {e.full_name}
                </option>
              ))}
            </select>
          </Field>
          <Field id="lv-type" label="Loại phép" required>
            <select
              id="lv-type"
              className={inputClass}
              value={leaveTypeId}
              onChange={(e) => setLeaveTypeId(e.target.value)}
              required
            >
              {leaveTypes.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.code} · {t.name}
                </option>
              ))}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field id="lv-start" label="Từ ngày" required>
              <input
                id="lv-start"
                type="date"
                className={inputClass}
                value={startsOn}
                onChange={(e) => setStartsOn(e.target.value)}
                required
              />
            </Field>
            <Field id="lv-end" label="Đến ngày" required>
              <input
                id="lv-end"
                type="date"
                className={inputClass}
                value={endsOn}
                onChange={(e) => setEndsOn(e.target.value)}
                required
              />
            </Field>
          </div>
          <Field id="lv-note" label="Ghi chú">
            <input
              id="lv-note"
              className={inputClass}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </Field>
          {error && (
            <p role="alert" className="text-sm text-danger flex items-center gap-2">
              <AlertCircle size={16} aria-hidden />
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={busy || employees.length === 0 || leaveTypes.length === 0}
            className="h-11 w-full rounded-xl bg-accent font-semibold text-app disabled:opacity-60"
          >
            {busy ? 'Đang gửi…' : 'Gửi duyệt'}
          </button>
        </form>
      </Modal>
    </>
  );
}
