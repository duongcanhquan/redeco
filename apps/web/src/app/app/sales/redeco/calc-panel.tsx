'use client';

import { Calculator, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { runCalcAction } from './actions';
import type { CalcProfile } from '@/services/customiz/redeco-quote.service';
import type { RedecoRfqRequest } from '@/services/customiz/redeco-rfq.service';

export function CalcPanel({
  basePath,
  requests,
  profiles,
  selectedRequestId,
}: {
  basePath: string;
  requests: RedecoRfqRequest[];
  profiles: CalcProfile[];
  selectedRequestId?: string;
}) {
  const router = useRouter();
  const [requestId, setRequestId] = useState(
    selectedRequestId && requests.some((r) => r.id === selectedRequestId)
      ? selectedRequestId
      : (requests[0]?.id ?? ''),
  );
  const [profileId, setProfileId] = useState(
    profiles.find((p) => p.is_default)?.id ?? profiles[0]?.id ?? '',
  );
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const selected = requests.find((r) => r.id === requestId);

  const onRun = async (): Promise<void> => {
    if (!requestId) {
      setErr('Chọn một đề xuất.');
      return;
    }
    setBusy(true);
    setErr(null);
    setMsg(null);
    const result = await runCalcAction(
      requestId,
      profileId || undefined,
      basePath,
    );
    setBusy(false);
    if (!result.ok) {
      setErr(result.error);
      return;
    }
    setMsg('Đã lưu kết quả tính — xem tab «Báo giá đã xong».');
    router.push(`${basePath}/sales/redeco?tab=done`);
    router.refresh();
  };

  if (requests.length === 0) {
    return (
      <div className="glass rounded-2xl border border-panel/40 px-5 py-8 text-center space-y-2">
        <p className="font-semibold text-ink">Chưa có đề xuất</p>
        <p className="text-sm text-ink-muted">
          Import Excel hoặc thêm tay ở tab «Đề xuất báo giá».
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="glass rounded-2xl border border-panel/40 p-4 sm:p-5 space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label htmlFor="calc-request" className="text-sm font-medium text-ink">
              Đề xuất
            </label>
            <select
              id="calc-request"
              value={requestId}
              onChange={(e) => setRequestId(e.target.value)}
              className="min-h-11 w-full rounded-xl border border-panel/40 bg-app px-3 text-base text-ink"
            >
              {requests.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.external_quote_no} — {r.attributes.end_customer || '—'}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="calc-profile" className="text-sm font-medium text-ink">
              Profile tính
            </label>
            <select
              id="calc-profile"
              value={profileId}
              onChange={(e) => setProfileId(e.target.value)}
              className="min-h-11 w-full rounded-xl border border-panel/40 bg-app px-3 text-base text-ink"
            >
              {profiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                  {p.is_default ? ' (mặc định)' : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        {selected && (
          <dl className="grid gap-2 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-ink-muted">Sản phẩm</dt>
              <dd className="font-medium text-ink">
                {selected.attributes.product_name || '—'}
              </dd>
            </div>
            <div>
              <dt className="text-ink-muted">SL</dt>
              <dd className="font-medium text-ink">
                {selected.attributes.qty_expected || '—'}{' '}
                {selected.attributes.uom || ''}
              </dd>
            </div>
          </dl>
        )}

        <button
          type="button"
          disabled={busy}
          onClick={() => void onRun()}
          className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-accent px-4 text-sm font-semibold text-app disabled:opacity-50"
        >
          {busy ? (
            <Loader2 size={18} className="animate-spin" aria-hidden />
          ) : (
            <Calculator size={18} aria-hidden />
          )}
          Tính &amp; lưu
        </button>
        {msg && (
          <p className="text-sm text-success" role="status">
            {msg}
          </p>
        )}
        {err && (
          <p className="text-sm text-danger" role="alert">
            {err}
          </p>
        )}
        <p className="text-xs text-ink-muted leading-relaxed">
          Engine hiện là stub (đơn giá profile × SL × markup). Công thức REDECO đầy đủ =
          phase H4.
        </p>
      </div>
    </div>
  );
}
