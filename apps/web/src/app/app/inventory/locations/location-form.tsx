'use client';

import { Loader2, Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import type { LocationKind } from '@/services/inventory.service';
import { createLocationAction } from './actions';

const KINDS: { value: LocationKind; label: string }[] = [
  { value: 'zone', label: 'Khu vực (Zone)' },
  { value: 'row', label: 'Dãy (Row)' },
  { value: 'rack', label: 'Kệ (Rack)' },
  { value: 'level', label: 'Tầng (Level)' },
  { value: 'bin', label: 'Vị trí (Bin)' },
];

export function LocationCreateForm({
  basePath,
  warehouses,
}: {
  basePath: string;
  warehouses: { id: string; code: string; name: string }[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const onSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    const fd = new FormData(e.currentTarget);
    const tagsRaw = String(fd.get('tags') ?? '');
    const tags = tagsRaw
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
    const result = await createLocationAction(
      {
        warehouseId: String(fd.get('warehouseId') ?? ''),
        code: String(fd.get('code') ?? ''),
        name: String(fd.get('name') ?? ''),
        kind: String(fd.get('kind') ?? 'bin') as LocationKind,
        tags,
      },
      basePath,
    );
    setBusy(false);
    if (!result.ok) {
      setErr(result.error);
      return;
    }
    setOpen(false);
    e.currentTarget.reset();
    router.refresh();
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-accent px-4 text-sm font-semibold text-app"
      >
        <Plus size={18} aria-hidden />
        Thêm vị trí
      </button>
    );
  }

  return (
    <form
      onSubmit={(ev) => void onSubmit(ev)}
      className="glass rounded-2xl border border-panel/40 p-4 space-y-3"
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="loc-wh" className="text-sm font-medium">
            Kho
          </label>
          <select
            id="loc-wh"
            name="warehouseId"
            required
            className="min-h-11 w-full rounded-xl border border-panel/40 bg-app px-3 text-base"
          >
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>
                {w.code} — {w.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <label htmlFor="loc-kind" className="text-sm font-medium">
            Loại
          </label>
          <select
            id="loc-kind"
            name="kind"
            defaultValue="bin"
            className="min-h-11 w-full rounded-xl border border-panel/40 bg-app px-3 text-base"
          >
            {KINDS.map((k) => (
              <option key={k.value} value={k.value}>
                {k.label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <label htmlFor="loc-code" className="text-sm font-medium">
            Mã
          </label>
          <input
            id="loc-code"
            name="code"
            required
            placeholder="A-01-01"
            className="min-h-11 w-full rounded-xl border border-panel/40 bg-app px-3 text-base"
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="loc-name" className="text-sm font-medium">
            Tên
          </label>
          <input
            id="loc-name"
            name="name"
            className="min-h-11 w-full rounded-xl border border-panel/40 bg-app px-3 text-base"
          />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <label htmlFor="loc-tags" className="text-sm font-medium">
            Tag (phẩy tách) — vd: nguy-hiem, cho-qc
          </label>
          <input
            id="loc-tags"
            name="tags"
            className="min-h-11 w-full rounded-xl border border-panel/40 bg-app px-3 text-base"
          />
        </div>
      </div>
      {err && (
        <p className="text-sm text-danger" role="alert">
          {err}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          disabled={busy}
          className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-accent px-4 text-sm font-semibold text-app disabled:opacity-50"
        >
          {busy ? <Loader2 size={18} className="animate-spin" aria-hidden /> : <Plus size={18} aria-hidden />}
          Lưu
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="inline-flex min-h-11 items-center rounded-xl border border-panel/40 px-4 text-sm"
        >
          Hủy
        </button>
      </div>
    </form>
  );
}
