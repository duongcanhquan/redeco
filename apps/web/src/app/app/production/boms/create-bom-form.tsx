'use client';

import { Plus, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { Field, inputClass } from '@/components/platform/modal';
import { HelpTip } from '@/components/ui/help-tip';
import { createBomAction } from '../actions';

type LineDraft = { key: string; componentItemId: string; qtyPer: number };

export function CreateBomForm({
  fgItems,
  rmItems,
}: {
  fgItems: { id: string; label: string }[];
  rmItems: { id: string; label: string }[];
}) {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [finishedItemId, setFinishedItemId] = useState(fgItems[0]?.id ?? '');
  const [lines, setLines] = useState<LineDraft[]>([
    {
      key: '1',
      componentItemId: rmItems[0]?.id ?? '',
      qtyPer: 1,
    },
  ]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const submit = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const cleaned = lines.filter((l) => l.componentItemId && l.qtyPer > 0);
    if (cleaned.length === 0) {
      setBusy(false);
      setMsg('Thêm ít nhất một nguyên liệu.');
      return;
    }
    const result = await createBomAction({
      code,
      finishedItemId,
      lines: cleaned.map((l) => ({
        componentItemId: l.componentItemId,
        qtyPer: l.qtyPer,
      })),
    });
    setBusy(false);
    if (!result.ok) {
      setMsg(result.error);
      return;
    }
    setCode('');
    setLines([
      {
        key: String(Date.now()),
        componentItemId: rmItems[0]?.id ?? '',
        qtyPer: 1,
      },
    ]);
    router.refresh();
  };

  if (fgItems.length === 0) {
    return (
      <p className="glass rounded-2xl p-4 text-sm text-warning">
        Chưa có thành phẩm trong Kho. Vào Kho để đồng bộ sản phẩm trước.
      </p>
    );
  }

  return (
    <form
      onSubmit={(e) => void submit(e)}
      className="glass rounded-2xl p-4 sm:p-5 space-y-4"
    >
      <div className="flex items-center gap-2">
        <p className="text-sm font-semibold">Tạo định mức mới</p>
        <HelpTip title="Định mức là gì?">
          <p>Danh sách nguyên liệu cần cho một sản phẩm thành phẩm.</p>
          <p>Có thể thêm nhiều dòng nguyên liệu. Sau đó bấm Kích hoạt để dùng.</p>
        </HelpTip>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field id="bom-code" label="Mã" required>
          <input
            id="bom-code"
            className={inputClass}
            required
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="DM-01"
          />
        </Field>
        <Field id="bom-fg" label="Thành phẩm" required>
          <select
            id="bom-fg"
            className={inputClass}
            required
            value={finishedItemId}
            onChange={(e) => setFinishedItemId(e.target.value)}
          >
            {fgItems.map((i) => (
              <option key={i.id} value={i.id}>
                {i.label}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-semibold text-ink-muted uppercase tracking-wide">
          Nguyên liệu
        </p>
        {lines.map((line, idx) => (
          <div
            key={line.key}
            className="grid grid-cols-1 sm:grid-cols-[1fr_8rem_auto] gap-2 items-end"
          >
            <Field
              id={`bom-rm-${line.key}`}
              label={idx === 0 ? 'Mặt hàng' : `Mặt hàng ${idx + 1}`}
            >
              <select
                id={`bom-rm-${line.key}`}
                className={inputClass}
                required
                value={line.componentItemId}
                onChange={(e) =>
                  setLines((prev) =>
                    prev.map((l) =>
                      l.key === line.key ? { ...l, componentItemId: e.target.value } : l,
                    ),
                  )
                }
              >
                {rmItems.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field id={`bom-qty-${line.key}`} label={idx === 0 ? 'SL / 1 SP' : 'Số lượng'}>
              <input
                id={`bom-qty-${line.key}`}
                type="number"
                min={0.000001}
                step="any"
                className={inputClass}
                required
                value={line.qtyPer}
                onChange={(e) =>
                  setLines((prev) =>
                    prev.map((l) =>
                      l.key === line.key ? { ...l, qtyPer: Number(e.target.value) } : l,
                    ),
                  )
                }
              />
            </Field>
            <button
              type="button"
              className="h-11 w-11 grid place-items-center rounded-xl border border-panel/40 text-ink-muted hover:text-danger disabled:opacity-40"
              aria-label="Xóa dòng"
              disabled={lines.length <= 1}
              onClick={() => setLines((prev) => prev.filter((l) => l.key !== line.key))}
            >
              <Trash2 size={16} aria-hidden />
            </button>
          </div>
        ))}
        <button
          type="button"
          className="inline-flex items-center gap-2 h-11 px-3 rounded-xl border border-accent/40 text-accent text-sm font-medium"
          onClick={() =>
            setLines((prev) => [
              ...prev,
              {
                key: String(Date.now()),
                componentItemId: rmItems[0]?.id ?? '',
                qtyPer: 1,
              },
            ])
          }
        >
          <Plus size={16} aria-hidden />
          Thêm nguyên liệu
        </button>
      </div>

      {msg && (
        <p role="alert" className="text-sm text-danger">
          {msg}
        </p>
      )}
      <button
        type="submit"
        disabled={busy}
        className="h-11 min-w-40 rounded-xl bg-accent px-5 font-semibold text-app disabled:opacity-60"
      >
        {busy ? 'Đang tạo…' : 'Tạo định mức'}
      </button>
    </form>
  );
}
