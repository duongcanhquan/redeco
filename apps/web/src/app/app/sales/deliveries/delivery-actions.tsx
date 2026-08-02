'use client';

import { PackageCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { shipDeliveryAction } from './actions';

export function ShipDeliveryButton({ deliveryId }: { deliveryId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ship = async (): Promise<void> => {
    setBusy(true);
    setError(null);
    const result = await shipDeliveryAction(deliveryId);
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.refresh();
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={busy}
        onClick={() => void ship()}
        className="inline-flex items-center gap-1.5 h-11 min-h-11 rounded-lg border border-success/40 px-2.5 text-xs font-medium text-success hover:bg-success/10 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <PackageCheck size={13} aria-hidden />
        {busy ? 'Đang xuất kho…' : 'Xuất kho'}
      </button>
      {error && (
        <p role="alert" className="text-xs text-danger max-w-64 text-right">
          {error}
        </p>
      )}
    </div>
  );
}
