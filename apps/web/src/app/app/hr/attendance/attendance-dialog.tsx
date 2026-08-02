'use client';

import { AlertCircle, Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Field, Modal, inputClass } from '@/components/platform/modal';
import { upsertAttendanceAction } from '../actions';

export function AttendanceDialog({
  employees,
  shifts,
}: {
  employees: { id: string; code: string; full_name: string }[];
  shifts: { id: string; code: string; name: string }[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [employeeId, setEmployeeId] = useState(employees[0]?.id ?? '');
  const [shiftId, setShiftId] = useState(shifts[0]?.id ?? '');
  const [workDate, setWorkDate] = useState(() =>
    new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Ho_Chi_Minh',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date()),
  );
  const [clockInTime, setClockInTime] = useState('08:00');
  const [clockOutTime, setClockOutTime] = useState('');

  const submit = async (): Promise<void> => {
    if (clockOutTime && !shiftId) {
      setError('Chọn ca làm việc khi có giờ ra để tính giờ công / OT.');
      return;
    }
    if (clockOutTime && shifts.length === 0) {
      setError('Chưa có ca — tạo ca trước khi nhập giờ ra.');
      return;
    }
    setBusy(true);
    setError(null);
    const result = await upsertAttendanceAction({
      employeeId,
      workDate,
      shiftId: shiftId || undefined,
      clockInTime,
      clockOutTime: clockOutTime || null,
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
        Nhập chấm công
      </button>
      <Modal
        title="Chấm công thủ công"
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
          <Field id="att-emp" label="Nhân viên" required>
            <select
              id="att-emp"
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              className={inputClass}
              required
            >
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.code} · {e.full_name}
                </option>
              ))}
            </select>
          </Field>
          <Field
            id="att-shift"
            label="Ca"
            required={Boolean(clockOutTime)}
            hint={
              clockOutTime
                ? 'Bắt buộc khi có giờ ra (tính OT / muộn).'
                : 'Tuỳ chọn nếu chỉ ghi giờ vào.'
            }
          >
            <select
              id="att-shift"
              value={shiftId}
              onChange={(e) => setShiftId(e.target.value)}
              className={inputClass}
              required={Boolean(clockOutTime)}
            >
              <option value="">— Chọn ca —</option>
              {shifts.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.code} · {s.name}
                </option>
              ))}
            </select>
          </Field>
          <Field id="att-date" label="Ngày" required>
            <input
              id="att-date"
              type="date"
              value={workDate}
              onChange={(e) => setWorkDate(e.target.value)}
              className={inputClass}
              required
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field id="att-in" label="Giờ vào" required>
              <input
                id="att-in"
                type="time"
                value={clockInTime}
                onChange={(e) => setClockInTime(e.target.value)}
                className={inputClass}
                required
              />
            </Field>
            <Field id="att-out" label="Giờ ra">
              <input
                id="att-out"
                type="time"
                value={clockOutTime}
                onChange={(e) => setClockOutTime(e.target.value)}
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
            disabled={busy || employees.length === 0}
            className="h-11 w-full rounded-xl bg-accent font-semibold text-app disabled:opacity-60"
          >
            {busy ? 'Đang lưu…' : 'Lưu (ghi đè nếu trùng ngày)'}
          </button>
        </form>
      </Modal>
    </>
  );
}
