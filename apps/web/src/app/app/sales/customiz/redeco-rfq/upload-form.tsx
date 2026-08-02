'use client';

import { Loader2, Upload } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { importRedecoRfqAction } from './actions';

export function RedecoRfqUploadForm({ basePath }: { basePath: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);
    const fd = new FormData(e.currentTarget);
    const result = await importRedecoRfqAction(fd, basePath);
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    const { imported, duplicate, errors } = result.data;
    setMessage(
      `Đã nhập ${imported} dòng` +
        (duplicate ? ` · ${duplicate} trùng` : '') +
        (errors.length ? ` · ${errors.length} lỗi bỏ qua` : '') +
        '.',
    );
    e.currentTarget.reset();
    router.refresh();
  };

  return (
    <form
      onSubmit={(ev) => void onSubmit(ev)}
      className="space-y-3"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="min-w-0 flex-1 space-y-1.5">
          <label htmlFor="redeco-rfq-file" className="block text-sm font-medium text-ink">
            File Excel yêu cầu báo giá (.xls / .xlsx)
          </label>
          <input
            id="redeco-rfq-file"
            name="file"
            type="file"
            accept=".xls,.xlsx,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            required
            disabled={busy}
            className="block w-full text-sm text-ink file:mr-3 file:rounded-xl file:border-0 file:bg-accent-soft file:px-3 file:py-2 file:text-sm file:font-semibold file:text-accent"
          />
          <p className="text-xs text-ink-muted leading-relaxed">
            Đọc tiêu đề dòng 5, dữ liệu từ dòng 6 (cột A–R). Dòng trùng số BG vẫn nhập và gắn tag
            «Trùng».
          </p>
        </div>
        <button
          type="submit"
          disabled={busy}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-accent px-4 text-sm font-semibold text-app disabled:opacity-50"
        >
          {busy ? <Loader2 size={18} className="animate-spin" aria-hidden /> : <Upload size={18} aria-hidden />}
          Tải lên
        </button>
      </div>
      {message && (
        <p className="rounded-xl border border-success/30 bg-success/10 px-3 py-2 text-sm text-success" role="status">
          {message}
        </p>
      )}
      {error && (
        <p className="rounded-xl border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}
