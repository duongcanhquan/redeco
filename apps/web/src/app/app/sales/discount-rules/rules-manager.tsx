'use client';

import { Plus, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import type { CustomerKind, DiscountRuleConditions } from '@optimake/domain';
import { Field, Modal, inputClass } from '@/components/platform/modal';
import type { DiscountRuleRow } from '@/services/sales-config.service';
import { deleteDiscountRuleAction, upsertDiscountRuleAction } from './actions';

export function DiscountRulesManager({ initial }: { initial: DiscountRuleRow[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<DiscountRuleRow | null>(null);
  const [name, setName] = useState('');
  const [priority, setPriority] = useState(100);
  const [discountPct, setDiscountPct] = useState(5);
  const [minTotal, setMinTotal] = useState('');
  const [kinds, setKinds] = useState<CustomerKind[]>([]);
  const [validFrom, setValidFrom] = useState('');
  const [validUntil, setValidUntil] = useState('');
  const [active, setActive] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const reset = (row?: DiscountRuleRow | null): void => {
    setEditing(row ?? null);
    setName(row?.name ?? '');
    setPriority(row?.priority ?? 100);
    setDiscountPct(Number(row?.discount_pct ?? 5));
    setMinTotal(
      typeof row?.conditions.min_doc_total === 'number' ? String(row.conditions.min_doc_total) : '',
    );
    setKinds(row?.conditions.customer_kinds ?? []);
    setValidFrom(row?.valid_from ?? '');
    setValidUntil(row?.valid_until ?? '');
    setActive(row?.is_active ?? true);
    setError(null);
  };

  const toggleKind = (k: CustomerKind): void => {
    setKinds((prev) => (prev.includes(k) ? prev.filter((x) => x !== k) : [...prev, k]));
  };

  const submit = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const conditions: DiscountRuleConditions = {};
    if (kinds.length) conditions.customer_kinds = kinds;
    if (minTotal.trim()) conditions.min_doc_total = Number(minTotal);
    const result = await upsertDiscountRuleAction({
      id: editing?.id,
      name,
      priority,
      isActive: active,
      validFrom: validFrom || null,
      validUntil: validUntil || null,
      discountPct,
      conditions,
    });
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setOpen(false);
    router.refresh();
  };

  const remove = async (id: string): Promise<void> => {
    if (!confirm('Xóa quy tắc này?')) return;
    await deleteDiscountRuleAction(id);
    router.refresh();
  };

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={() => {
          reset(null);
          setOpen(true);
        }}
        className="inline-flex h-11 items-center gap-2 rounded-xl bg-accent px-4 font-semibold text-app text-sm cursor-pointer"
      >
        <Plus size={16} aria-hidden />
        Thêm quy tắc
      </button>

      <div className="glass rounded-2xl overflow-hidden overflow-x-auto">
        <table className="w-full text-sm min-w-180">
          <thead>
            <tr className="border-b border-panel/40 text-left text-ink-muted">
              <th className="px-5 py-3.5 font-medium">Tên</th>
              <th className="px-5 py-3.5 font-medium">Ưu tiên</th>
              <th className="px-5 py-3.5 font-medium">CK %</th>
              <th className="px-5 py-3.5 font-medium">Điều kiện</th>
              <th className="px-5 py-3.5 font-medium">Hiệu lực</th>
              <th className="px-5 py-3.5" />
            </tr>
          </thead>
          <tbody className="divide-y divide-panel/30">
            {initial.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-12 text-center text-ink-muted">
                  Chưa có quy tắc — báo giá dùng chiết khấu nhập tay.
                </td>
              </tr>
            ) : (
              initial.map((r) => (
                <tr key={r.id} className="hover:bg-glass transition-colors">
                  <td className="px-5 py-3.5 font-medium">
                    {r.name}
                    {!r.is_active && (
                      <span className="ml-2 text-xs text-warning">tắt</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 tabular-nums">{r.priority}</td>
                  <td className="px-5 py-3.5 tabular-nums">{Number(r.discount_pct)}%</td>
                  <td className="px-5 py-3.5 text-xs text-ink-muted">
                    {(r.conditions.customer_kinds ?? []).join(', ') || 'Mọi loại KH'}
                    {typeof r.conditions.min_doc_total === 'number' &&
                      ` · ≥ ${r.conditions.min_doc_total.toLocaleString('vi-VN')}`}
                  </td>
                  <td className="px-5 py-3.5 text-xs text-ink-muted">
                    {r.valid_from || '…'} → {r.valid_until || '…'}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <button
                      type="button"
                      className="text-accent text-xs mr-3 cursor-pointer hover:underline"
                      onClick={() => {
                        reset(r);
                        setOpen(true);
                      }}
                    >
                      Sửa
                    </button>
                    <button
                      type="button"
                      aria-label={`Xóa ${r.name}`}
                      className="text-danger cursor-pointer"
                      onClick={() => void remove(r.id)}
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Modal
        title={editing ? 'Sửa quy tắc' : 'Thêm quy tắc chiết khấu'}
        open={open}
        onClose={() => setOpen(false)}
      >
        <form onSubmit={(e) => void submit(e)} className="space-y-4">
          <Field id="dr-name" label="Tên" required>
            <input
              id="dr-name"
              className={inputClass}
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field id="dr-pri" label="Ưu tiên (số nhỏ = mạnh)" required>
              <input
                id="dr-pri"
                type="number"
                className={inputClass}
                value={priority}
                onChange={(e) => setPriority(Number(e.target.value))}
              />
            </Field>
            <Field id="dr-pct" label="Chiết khấu %" required>
              <input
                id="dr-pct"
                type="number"
                min={0}
                max={100}
                step={0.1}
                className={inputClass}
                value={discountPct}
                onChange={(e) => setDiscountPct(Number(e.target.value))}
              />
            </Field>
          </div>
          <Field id="dr-min" label="Tổng tối thiểu (để trống = không ràng buộc)">
            <input
              id="dr-min"
              type="number"
              min={0}
              className={inputClass}
              value={minTotal}
              onChange={(e) => setMinTotal(e.target.value)}
            />
          </Field>
          <fieldset>
            <legend className="text-sm text-ink-muted mb-2">Loại khách hàng</legend>
            <div className="flex flex-wrap gap-3">
              {(['b2b', 'b2c', 'dai-ly'] as CustomerKind[]).map((k) => (
                <label key={k} className="inline-flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={kinds.includes(k)}
                    onChange={() => toggleKind(k)}
                    className="size-4 accent-accent"
                  />
                  {k}
                </label>
              ))}
            </div>
            <p className="text-xs text-ink-muted mt-1">Bỏ trống = áp mọi loại.</p>
          </fieldset>
          <div className="grid grid-cols-2 gap-3">
            <Field id="dr-from" label="Từ ngày">
              <input
                id="dr-from"
                type="date"
                className={inputClass}
                value={validFrom}
                onChange={(e) => setValidFrom(e.target.value)}
              />
            </Field>
            <Field id="dr-until" label="Đến ngày">
              <input
                id="dr-until"
                type="date"
                className={inputClass}
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
              />
            </Field>
          </div>
          <label className="inline-flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
              className="size-4 accent-accent"
            />
            Đang hiệu lực
          </label>
          {error && (
            <p role="alert" className="text-danger text-sm">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={busy}
            className="w-full h-12 rounded-xl bg-accent font-semibold text-app cursor-pointer disabled:opacity-60"
          >
            {busy ? 'Đang lưu…' : 'Lưu quy tắc'}
          </button>
        </form>
      </Modal>
    </div>
  );
}
