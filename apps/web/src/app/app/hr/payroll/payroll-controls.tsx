'use client';

import { AlertCircle, Lock, RefreshCw } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Field, inputClass } from '@/components/platform/modal';
import { generatePayrollRunAction, lockPayrollRunAction } from '../actions';

export function PayrollGenerateForm({
  canManage,
}: {
  canManage: boolean;
}) {
  const router = useRouter();
  const now = new Date();
  const [year, setYear] = useState(String(now.getFullYear()));
  const [month, setMonth] = useState(String(now.getMonth() + 1));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  if (!canManage) {
    return (
      <p className="text-sm text-ink-muted glass rounded-2xl border border-panel/40 px-4 py-3">
        Chỉ owner/admin được tính bảng lương.
      </p>
    );
  }

  const submit = async (): Promise<void> => {
    setBusy(true);
    setError(null);
    setOkMsg(null);
    const result = await generatePayrollRunAction({
      year: Number(year),
      month: Number(month),
    });
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setOkMsg(`Đã tạo/cập nhật ${result.data.code}`);
    router.replace(`?run=${result.data.id}`);
    router.refresh();
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
      className="glass rounded-2xl border border-panel/40 p-4 flex flex-wrap items-end gap-3"
    >
      <Field id="py" label="Năm">
        <input
          id="py"
          type="number"
          min={2020}
          value={year}
          onChange={(e) => setYear(e.target.value)}
          className={`${inputClass} w-28`}
        />
      </Field>
      <Field id="pm" label="Tháng">
        <input
          id="pm"
          type="number"
          min={1}
          max={12}
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className={`${inputClass} w-24`}
        />
      </Field>
      <button
        type="submit"
        disabled={busy}
        className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-accent px-4 text-sm font-semibold text-app disabled:opacity-60"
      >
        <RefreshCw size={16} aria-hidden />
        {busy ? 'Đang tính…' : 'Tính bảng lương'}
      </button>
      {error && (
        <p role="alert" className="w-full text-sm text-danger flex items-center gap-2">
          <AlertCircle size={16} aria-hidden />
          {error}
        </p>
      )}
      {okMsg && <p className="w-full text-sm text-success">{okMsg}</p>}
    </form>
  );
}

export function LockPayrollButton({
  runId,
  locked,
  canManage,
}: {
  runId: string;
  locked: boolean;
  canManage: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (locked) {
    return (
      <span className="text-xs text-ink-muted inline-flex items-center gap-1">
        <Lock size={14} aria-hidden /> Đã khóa
      </span>
    );
  }
  if (!canManage) return null;

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={busy}
        onClick={async () => {
          if (!window.confirm('Khóa kỳ lương? Sau khi khóa không tính lại được.')) return;
          setBusy(true);
          setError(null);
          const result = await lockPayrollRunAction(runId);
          setBusy(false);
          if (!result.ok) {
            setError(result.error);
            return;
          }
          router.refresh();
        }}
        className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-panel/40 px-3 text-sm cursor-pointer disabled:opacity-50"
      >
        <Lock size={14} aria-hidden />
        Khóa sổ
      </button>
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
