'use client';

import { CheckCircle2, Pencil } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import type { SettingRow } from '@/services/platform.service';
import { updateSettingAction } from './actions';

export function SettingEditor({ setting }: { setting: SettingRow }) {
  const [editing, setEditing] = useState(false);
  const [raw, setRaw] = useState(JSON.stringify(setting.value, null, 2));
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setError(null);
    try {
      JSON.parse(raw);
    } catch {
      setError('Giá trị không phải JSON hợp lệ.');
      return;
    }
    setPending(true);
    const result = await updateSettingAction(setting.key, raw);
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setEditing(false);
    setSaved(true);
  };

  if (!editing) {
    return (
      <div>
        <pre className="mt-3 rounded-xl bg-app-deep/70 border border-panel/30 p-3 text-sm overflow-x-auto">
          {JSON.stringify(setting.value, null, 2)}
        </pre>
        <div className="mt-2 flex items-center justify-between">
          <p className="text-xs text-ink-muted">
            Cập nhật: {new Date(setting.updated_at).toLocaleString('vi-VN')}
          </p>
          <div className="flex items-center gap-2">
            {saved && (
              <span className="inline-flex items-center gap-1 text-xs text-success">
                <CheckCircle2 size={13} aria-hidden />
                Đã lưu
              </span>
            )}
            <button
              type="button"
              onClick={() => {
                setRaw(JSON.stringify(setting.value, null, 2));
                setSaved(false);
                setEditing(true);
              }}
              className="inline-flex items-center gap-1.5 rounded-lg bg-accent-soft px-2.5 py-1.5 text-xs font-medium text-accent cursor-pointer hover:bg-accent/20 transition-colors"
            >
              <Pencil size={12} aria-hidden />
              Sửa
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="mt-3 space-y-3">
      <textarea
        aria-label={`Giá trị JSON của ${setting.key}`}
        rows={4}
        spellCheck={false}
        className="w-full rounded-xl bg-app-deep/70 border border-panel/60 p-3 font-mono text-sm text-ink outline-none transition-colors focus:border-accent"
        value={raw}
        onChange={(e) => setRaw(e.target.value)}
      />
      {error && (
        <p role="alert" className="text-danger text-sm">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="flex-1 h-10 rounded-xl bg-accent text-sm font-semibold text-app cursor-pointer transition-shadow hover:shadow-[0_0_18px_rgba(0,238,255,0.4)] disabled:opacity-60"
        >
          {pending ? 'Đang lưu…' : 'Lưu'}
        </button>
        <button
          type="button"
          onClick={() => {
            setEditing(false);
            setError(null);
          }}
          className="flex-1 h-10 rounded-xl bg-glass border border-panel/50 text-sm cursor-pointer hover:bg-glass-strong transition-colors"
        >
          Hủy
        </button>
      </div>
    </form>
  );
}
