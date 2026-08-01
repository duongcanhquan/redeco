'use client';

import { Ban, PauseCircle, PlayCircle } from 'lucide-react';
import { useState } from 'react';
import type { ContractRow } from '@/services/platform.service';
import { setContractStatusAction } from './actions';

const btnBase =
  'inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed';

export function ContractStatusActions({ contract }: { contract: ContractRow }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        <button
          type="button"
          disabled={pending}
          onClick={() => void change('terminated')}
          className={`${btnBase} bg-danger/10 text-danger hover:bg-danger/20`}
        >
          <Ban size={13} aria-hidden />
          Chấm dứt
        </button>
      )}
      {error && <span className="text-danger text-xs w-full">{error}</span>}
    </div>
  );
}
