'use client';

import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import type { PickStrategy } from '@optimake/domain';
import { updateInventoryItemLotPolicyAction } from '../actions';

type ItemRow = {
  id: string;
  sku: string;
  name: string;
  trackLot: boolean;
  pickStrategy: PickStrategy;
};

export function ItemLotPolicyList({
  items,
  canManage = false,
}: {
  items: ItemRow[];
  canManage?: boolean;
}) {
  if (items.length === 0) {
    return (
      <p className="px-5 py-10 text-center text-ink-muted">
        Chưa có mã hàng kho — bấm Đồng bộ trên hub Kho.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-panel/30">
      {items.map((item) => (
        <ItemLotPolicyRow key={item.id} item={item} canManage={canManage} />
      ))}
    </ul>
  );
}

function ItemLotPolicyRow({
  item,
  canManage,
}: {
  item: ItemRow;
  canManage: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [trackLot, setTrackLot] = useState(item.trackLot);
  const [pickStrategy, setPickStrategy] = useState<PickStrategy>(item.pickStrategy);
  const [err, setErr] = useState<string | null>(null);

  const save = (next: { trackLot: boolean; pickStrategy: PickStrategy }): void => {
    if (!canManage) return;
    setErr(null);
    startTransition(async () => {
      const result = await updateInventoryItemLotPolicyAction({
        itemId: item.id,
        trackLot: next.trackLot,
        pickStrategy: next.pickStrategy,
      });
      if (!result.ok) {
        setErr(result.error);
        setTrackLot(item.trackLot);
        setPickStrategy(item.pickStrategy);
        return;
      }
      router.refresh();
    });
  };

  return (
    <li className="px-5 py-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="font-mono text-sm text-accent">{item.sku}</p>
        <p className="font-medium truncate">{item.name}</p>
        {err && (
          <p className="text-sm text-danger mt-1" role="alert">
            {err}
          </p>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <label className="inline-flex min-h-11 items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={trackLot}
            disabled={pending || !canManage}
            onChange={(e) => {
              const next = e.target.checked;
              setTrackLot(next);
              save({ trackLot: next, pickStrategy });
            }}
            className="size-4 accent-[var(--color-accent)]"
          />
          Theo dõi lô
        </label>
        <label className="inline-flex min-h-11 items-center gap-2 text-sm">
          <span className="text-ink-muted">Xuất</span>
          <select
            value={pickStrategy}
            disabled={pending || !canManage}
            aria-label={`Chiến lược xuất ${item.sku}`}
            onChange={(e) => {
              const next = e.target.value as PickStrategy;
              setPickStrategy(next);
              save({ trackLot, pickStrategy: next });
            }}
            className="min-h-11 rounded-xl border border-panel/40 bg-app px-3 text-base"
          >
            <option value="fifo">FIFO</option>
            <option value="fefo">FEFO</option>
            <option value="lifo">LIFO</option>
          </select>
        </label>
        {pending && (
          <Loader2 size={16} className="animate-spin text-ink-muted" aria-hidden />
        )}
      </div>
    </li>
  );
}
