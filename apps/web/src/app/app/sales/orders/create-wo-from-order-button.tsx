'use client';

import { Factory } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { createWorkOrdersFromOrderAction } from './actions';

export function CreateWoFromOrderButton({
  orderId,
  shortfallCount,
}: {
  orderId: string;
  shortfallCount: number;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  if (shortfallCount <= 0) return null;

  return (
    <div className="space-y-2">
      <button
        type="button"
        disabled={busy}
        className="inline-flex items-center gap-2 h-11 px-4 rounded-xl border border-accent/40 text-accent text-sm font-semibold hover:bg-accent/10 disabled:opacity-60"
        onClick={() => {
          void (async () => {
            if (
              !confirm(
                `Tạo ${shortfallCount} lệnh sản xuất (nháp) cho phần hàng còn thiếu?`,
              )
            ) {
              return;
            }
            setBusy(true);
            setMsg(null);
            const r = await createWorkOrdersFromOrderAction(orderId);
            setBusy(false);
            if (!r.ok) {
              setMsg(r.error);
              return;
            }
            const codes = r.data.created.map((c) => c.code).join(', ');
            setMsg(`Đã tạo: ${codes}`);
            router.refresh();
          })();
        }}
      >
        <Factory size={16} aria-hidden />
        {busy ? 'Đang tạo…' : `Tạo lệnh SX (${shortfallCount} dòng thiếu)`}
      </button>
      {msg && (
        <p className={`text-sm ${msg.startsWith('Đã') ? 'text-success' : 'text-danger'}`}>{msg}</p>
      )}
    </div>
  );
}
