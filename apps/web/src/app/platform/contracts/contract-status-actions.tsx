'use client';

import { Ban, CalendarPlus, PauseCircle, PlayCircle } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Field, Modal, inputClass } from '@/components/platform/modal';
import type { ContractRow } from '@/services/platform.service';
import { extendContractAction, setContractStatusAction } from './actions';

const btnBase =
  'inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed';

export function ContractStatusActions({ contract }: { contract: ContractRow }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [extendOpen, setExtendOpen] = useState(false);
  const [newEndsOn, setNewEndsOn] = useState(contract.ends_on);
  const [newSeats, setNewSeats] = useState(contract.seats);

  const change = async (status: 'active' | 'suspended' | 'terminated'): Promise<void> => {
    if (status === 'terminated' && !window.confirm(`Chấm dứt hợp đồng ${contract.code}?`)) {
      return;
    }
    setError(null);
    setPending(true);
    const result = await setContractStatusAction(contract.id, status);
    setPending(false);
    if (!result.ok) setError(result.error);
  };

  const handleExtend = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setError(null);
    setPending(true);
    const result = await extendContractAction(contract.id, newEndsOn, newSeats);
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setExtendOpen(false);
  };

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {(contract.status === 'draft' || contract.status === 'suspended') && (
        <button
          type="button"
          disabled={pending}
          onClick={() => void change('active')}
          className={`${btnBase} bg-success/10 text-success hover:bg-success/20`}
        >
          <PlayCircle size={13} aria-hidden />
          Kích hoạt
        </button>
      )}
      {contract.status === 'active' && (
        <button
          type="button"
          disabled={pending}
          onClick={() => void change('suspended')}
          className={`${btnBase} bg-warning/10 text-warning hover:bg-warning/20`}
        >
          <PauseCircle size={13} aria-hidden />
          Tạm dừng
        </button>
      )}
      {contract.status !== 'terminated' && (
        <>
          <button
            type="button"
            disabled={pending}
            onClick={() => setExtendOpen(true)}
            className={`${btnBase} bg-accent-soft text-accent hover:bg-accent/20`}
          >
            <CalendarPlus size={13} aria-hidden />
            Gia hạn
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => void change('terminated')}
            className={`${btnBase} bg-danger/10 text-danger hover:bg-danger/20`}
          >
            <Ban size={13} aria-hidden />
            Chấm dứt
          </button>
        </>
      )}
      {error && !extendOpen && <span className="text-danger text-xs w-full">{error}</span>}

      <Modal
        title={`Gia hạn hợp đồng ${contract.code}`}
        icon={<CalendarPlus size={18} className="text-accent" aria-hidden />}
        open={extendOpen}
        onClose={() => setExtendOpen(false)}
      >
        <form onSubmit={(e) => void handleExtend(e)} className="space-y-4">
          <p className="text-sm text-ink-muted">
            Thời hạn hiện tại: {contract.starts_on} → {contract.ends_on} · {contract.seats} seats
          </p>
          <div className="grid grid-cols-2 gap-3">
            <Field id={`ext-end-${contract.id}`} label="Ngày kết thúc mới" required>
              <input
                id={`ext-end-${contract.id}`}
                type="date"
                className={inputClass}
                required
                min={contract.starts_on}
                value={newEndsOn}
                onChange={(e) => setNewEndsOn(e.target.value)}
              />
            </Field>
            <Field id={`ext-seats-${contract.id}`} label="Số seats" required>
              <input
                id={`ext-seats-${contract.id}`}
                type="number"
                min={1}
                className={inputClass}
                required
                value={newSeats}
                onChange={(e) => setNewSeats(Number(e.target.value))}
              />
            </Field>
          </div>
          {error && (
            <p role="alert" className="text-danger text-sm">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={pending}
            className="w-full h-12 rounded-xl bg-accent font-semibold text-app cursor-pointer transition-shadow hover:shadow-[0_0_18px_rgba(0,238,255,0.4)] disabled:opacity-60"
          >
            {pending ? 'Đang lưu…' : 'Lưu gia hạn'}
          </button>
        </form>
      </Modal>
    </div>
  );
}
