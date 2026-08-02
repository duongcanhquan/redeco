'use client';

import { Loader2, Save } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import {
  HUB_STATUS_LABELS,
  type HubStatus,
} from '@/lib/customiz/redeco-hub-status';
import type { QuoteCalculation } from '@/services/customiz/redeco-quote.service';
import { setHubStatusAction, syncQuotationAction } from './actions';

const STATUS_OPTS: HubStatus[] = [
  'pending',
  'review',
  'rejected',
  'to_production',
  'quoted',
];

export function DonePanel({
  basePath,
  rows,
}: {
  basePath: string;
  rows: QuoteCalculation[];
}) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [unitPrice, setUnitPrice] = useState('');
  const [qty, setQty] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const onStatus = async (id: string, status: HubStatus): Promise<void> => {
    setBusyId(id);
    setErr(null);
    const result = await setHubStatusAction(id, status, basePath);
    setBusyId(null);
    if (!result.ok) {
      setErr(result.error);
      return;
    }
    router.refresh();
  };

  const openSync = (row: QuoteCalculation): void => {
    setEditId(row.id);
    const attrSnap =
      row.input_snapshot['attributes'] &&
      typeof row.input_snapshot['attributes'] === 'object'
        ? (row.input_snapshot['attributes'] as Record<string, string>)
        : null;
    const q =
      Number.parseFloat(
        String(
          row.request?.attributes['qty_expected'] ??
            attrSnap?.['qty_expected'] ??
            '1',
        ).replace(/,/g, ''),
      ) || 1;
    setQty(String(q));
    const price = Number(row.output_snapshot.price ?? 0);
    setUnitPrice(String(Math.round((price / q) * 100) / 100));
    setMsg(null);
    setErr(null);
  };

  const onSync = async (): Promise<void> => {
    if (!editId) return;
    setBusyId(editId);
    setErr(null);
    setMsg(null);
    const result = await syncQuotationAction(
      editId,
      {
        unitPrice: Number(unitPrice) || 0,
        qty: Number(qty) || 1,
      },
      basePath,
    );
    setBusyId(null);
    if (!result.ok) {
      setErr(result.error);
      return;
    }
    setMsg(`Đã sync BG ${result.data.code}`);
    setEditId(null);
    router.refresh();
  };

  if (rows.length === 0) {
    return (
      <div className="glass rounded-2xl border border-panel/40 px-5 py-8 text-center space-y-2">
        <p className="font-semibold text-ink">Chưa có lần tính</p>
        <p className="text-sm text-ink-muted">Chạy tính ở tab «Tính báo giá».</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {err && (
        <p className="rounded-xl border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger" role="alert">
          {err}
        </p>
      )}
      {msg && (
        <p className="rounded-xl border border-success/30 bg-success/10 px-3 py-2 text-sm text-success" role="status">
          {msg}
        </p>
      )}
      <ul className="space-y-3">
        {rows.map((row) => {
          const quoteNo =
            row.request?.external_quote_no ||
            String(row.input_snapshot['external_quote_no'] ?? '—');
          return (
            <li
              key={row.id}
              className="glass rounded-2xl border border-panel/40 p-4 space-y-3"
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="font-semibold text-ink">{quoteNo}</p>
                  <p className="text-sm text-ink-muted">
                    Cost {row.output_snapshot.cost.toLocaleString('vi-VN')} · Giá{' '}
                    {row.output_snapshot.price.toLocaleString('vi-VN')} ·{' '}
                    {new Date(row.calculated_at).toLocaleString('vi-VN')}
                  </p>
                  {row.quotation_id && (
                    <p className="text-xs text-accent mt-1">
                      BG Optimake đã gắn (id: {row.quotation_id.slice(0, 8)}…)
                    </p>
                  )}
                </div>
                <label className="sr-only" htmlFor={`status-${row.id}`}>
                  Trạng thái
                </label>
                <select
                  id={`status-${row.id}`}
                  value={row.hub_status}
                  disabled={busyId === row.id}
                  onChange={(e) =>
                    void onStatus(row.id, e.target.value as HubStatus)
                  }
                  className="min-h-11 rounded-xl border border-panel/40 bg-app px-3 text-sm text-ink"
                >
                  {STATUS_OPTS.map((s) => (
                    <option key={s} value={s}>
                      {HUB_STATUS_LABELS[s]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => openSync(row)}
                  className="inline-flex min-h-11 items-center rounded-xl border border-accent/40 bg-accent-soft px-3 text-sm font-semibold text-accent"
                >
                  Tạo / sửa BG Optimake
                </button>
              </div>
              {editId === row.id && (
                <div className="grid gap-3 sm:grid-cols-3 border-t border-panel/30 pt-3">
                  <div className="space-y-1">
                    <label htmlFor={`qty-${row.id}`} className="text-sm font-medium">
                      SL
                    </label>
                    <input
                      id={`qty-${row.id}`}
                      value={qty}
                      onChange={(e) => setQty(e.target.value)}
                      className="min-h-11 w-full rounded-xl border border-panel/40 bg-app px-3 text-base"
                    />
                  </div>
                  <div className="space-y-1">
                    <label htmlFor={`price-${row.id}`} className="text-sm font-medium">
                      Đơn giá
                    </label>
                    <input
                      id={`price-${row.id}`}
                      value={unitPrice}
                      onChange={(e) => setUnitPrice(e.target.value)}
                      className="min-h-11 w-full rounded-xl border border-panel/40 bg-app px-3 text-base"
                    />
                  </div>
                  <div className="flex items-end">
                    <button
                      type="button"
                      disabled={busyId === row.id}
                      onClick={() => void onSync()}
                      className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-accent px-3 text-sm font-semibold text-app disabled:opacity-50"
                    >
                      {busyId === row.id ? (
                        <Loader2 size={18} className="animate-spin" aria-hidden />
                      ) : (
                        <Save size={18} aria-hidden />
                      )}
                      Sync
                    </button>
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
