'use client';

import { Loader2, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { deleteRedecoRfqAction } from './actions';

export function RedecoRfqDeleteButton({
  id,
  basePath,
  redirectToList,
}: {
  id: string;
  basePath: string;
  redirectToList?: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onDelete = async (): Promise<void> => {
    if (!window.confirm('Xóa yêu cầu này? (có thể upload lại sau)')) return;
    setBusy(true);
    setError(null);
    const result = await deleteRedecoRfqAction(id, basePath);
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    if (redirectToList) {
      router.push(`${basePath}/sales/customiz/redeco-rfq`);
      router.refresh();
      return;
    }
    router.refresh();
  };

  return (
    <div className="space-y-1">
      <button
        type="button"
        disabled={busy}
        onClick={() => void onDelete()}
        aria-label="Xóa yêu cầu"
        className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-danger/40 px-3 text-sm font-medium text-danger hover:bg-danger/10 disabled:opacity-50"
      >
        {busy ? <Loader2 size={16} className="animate-spin" aria-hidden /> : <Trash2 size={16} aria-hidden />}
        Xóa
      </button>
      {error && (
        <p className="text-xs text-danger" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
