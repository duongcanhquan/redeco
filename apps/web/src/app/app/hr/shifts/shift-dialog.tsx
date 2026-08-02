'use client';

import { AlertCircle, Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Field, Modal, inputClass } from '@/components/platform/modal';
import { createShiftAction } from '../actions';

export function ShiftDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('17:00');
  const [breakMinutes, setBreakMinutes] = useState('60');

  const submit = async (): Promise<void> => {
    setBusy(true);
    setError(null);
    const result = await createShiftAction({
      code,
      name,
      startTime,
      endTime,
      breakMinutes: Number(breakMinutes),
    });
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
        Thêm ca
      </button>
      <Modal
        title="Định nghĩa ca"
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
          <Field id="sh-code" label="Mã" required>
            <input
              id="sh-code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className={inputClass}
              required
              placeholder="CA1"
            />
          </Field>
          <Field id="sh-name" label="Tên" required>
            <input
              id="sh-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputClass}
              required
              placeholder="Ca hành chính"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field id="sh-start" label="Bắt đầu" required>
              <input
                id="sh-start"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className={inputClass}
                required
              />
            </Field>
            <Field id="sh-end" label="Kết thúc" required>
              <input
                id="sh-end"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className={inputClass}
                required
              />
            </Field>
          </div>
          <Field id="sh-break" label="Nghỉ giữa ca (phút)" required>
            <input
              id="sh-break"
              type="number"
              min={0}
              value={breakMinutes}
              onChange={(e) => setBreakMinutes(e.target.value)}
              className={inputClass}
              required
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
