'use client';

import { Loader2, Plus, Save, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { CalcProfile } from '@/services/customiz/redeco-quote.service';
import { deleteProfileAction, upsertProfileAction } from './actions';

export function SettingsPanel({
  basePath,
  profiles,
}: {
  basePath: string;
  profiles: CalcProfile[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [editing, setEditing] = useState<CalcProfile | null>(null);
  const [name, setName] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [unitCost, setUnitCost] = useState('0');
  const [markup, setMarkup] = useState('20');

  const startNew = (): void => {
    setEditing(null);
    setName('Profile mới');
    setIsDefault(profiles.length === 0);
    setUnitCost('0');
    setMarkup('20');
  };

  const startEdit = (p: CalcProfile): void => {
    setEditing(p);
    setName(p.name);
    setIsDefault(p.is_default);
    setUnitCost(String(p.config['default_unit_cost'] ?? 0));
    setMarkup(String(p.config['markup_pct'] ?? 20));
  };

  const onSave = async (): Promise<void> => {
    setBusy(true);
    setErr(null);
    const result = await upsertProfileAction(
      {
        id: editing?.id,
        name,
        is_default: isDefault,
        default_unit_cost: Number(unitCost) || 0,
        markup_pct: Number(markup) || 0,
      },
      basePath,
    );
    setBusy(false);
    if (!result.ok) {
      setErr(result.error);
      return;
    }
    setEditing(null);
    setName('');
    router.refresh();
  };

  const onDelete = async (id: string): Promise<void> => {
    if (!window.confirm('Xóa profile này?')) return;
    setBusy(true);
    const result = await deleteProfileAction(id, basePath);
    setBusy(false);
    if (!result.ok) {
      setErr(result.error);
      return;
    }
    router.refresh();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={startNew}
          className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-accent px-4 text-sm font-semibold text-app"
        >
          <Plus size={18} aria-hidden />
          Thêm profile
        </button>
      </div>
      {err && (
        <p className="text-sm text-danger" role="alert">
          {err}
        </p>
      )}
      {(name !== '' || editing) && (
        <div className="glass rounded-2xl border border-panel/40 p-4 space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <label htmlFor="prof-name" className="text-sm font-medium">
                Tên
              </label>
              <input
                id="prof-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="min-h-11 w-full rounded-xl border border-panel/40 bg-app px-3 text-base"
              />
            </div>
            <div className="flex items-end gap-2 min-h-11">
              <label className="inline-flex items-center gap-2 text-sm text-ink">
                <input
                  type="checkbox"
                  checked={isDefault}
                  onChange={(e) => setIsDefault(e.target.checked)}
                  className="size-4"
                />
                Mặc định
              </label>
            </div>
            <div className="space-y-1">
              <label htmlFor="prof-cost" className="text-sm font-medium">
                Đơn giá cost (stub)
              </label>
              <input
                id="prof-cost"
                value={unitCost}
                onChange={(e) => setUnitCost(e.target.value)}
                className="min-h-11 w-full rounded-xl border border-panel/40 bg-app px-3 text-base"
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="prof-markup" className="text-sm font-medium">
                Markup %
              </label>
              <input
                id="prof-markup"
                value={markup}
                onChange={(e) => setMarkup(e.target.value)}
                className="min-h-11 w-full rounded-xl border border-panel/40 bg-app px-3 text-base"
              />
            </div>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={() => void onSave()}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-accent px-4 text-sm font-semibold text-app disabled:opacity-50"
          >
            {busy ? <Loader2 size={18} className="animate-spin" aria-hidden /> : <Save size={18} aria-hidden />}
            Lưu profile
          </button>
        </div>
      )}
      <ul className="space-y-2">
        {profiles.map((p) => (
          <li
            key={p.id}
            className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between glass rounded-xl border border-panel/40 px-4 py-3"
          >
            <div>
              <p className="font-semibold text-ink">
                {p.name}
                {p.is_default ? ' · mặc định' : ''}
              </p>
              <p className="text-xs text-ink-muted">
                cost {String(p.config['default_unit_cost'] ?? 0)} · markup{' '}
                {String(p.config['markup_pct'] ?? 0)}%
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => startEdit(p)}
                className="inline-flex min-h-11 items-center rounded-xl border border-panel/40 px-3 text-sm"
              >
                Sửa
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void onDelete(p.id)}
                aria-label={`Xóa ${p.name}`}
                className="inline-flex min-h-11 items-center gap-1 rounded-xl border border-danger/40 px-3 text-sm text-danger"
              >
                <Trash2 size={16} aria-hidden />
                Xóa
              </button>
            </div>
          </li>
        ))}
      </ul>
      {profiles.length === 0 && name === '' && (
        <p className="text-sm text-ink-muted">
          Chưa có profile — nhấn «Thêm profile» hoặc chạy tính (tự tạo mặc định).
        </p>
      )}
    </div>
  );
}
