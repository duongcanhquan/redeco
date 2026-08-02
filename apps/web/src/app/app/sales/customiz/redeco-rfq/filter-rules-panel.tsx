'use client';

import { ArrowDown, ArrowUp, Loader2, Plus, Save, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ATTR_KEYS } from '@/lib/customiz/redeco-rfq-parse';
import {
  CLASSIFICATION_LABELS,
  CLASSIFICATION_TAGS,
  FILTER_OPS,
  type ClassificationTag,
  type FilterCondition,
  type FilterOp,
  type FilterRule,
} from '@/lib/customiz/redeco-rfq-filter';
import { reclassifyAllAction, saveFilterRulesAction } from './actions';

const FIELD_OPTIONS: { value: string; label: string }[] = [
  { value: 'external_quote_no', label: 'Số báo giá (A)' },
  { value: 'status_customer', label: 'Trạng thái (B)' },
  { value: 'buyer_contact', label: 'Người PH mua hàng (C)' },
  { value: 'end_customer', label: 'Khách hàng (D)' },
  { value: 'customer_site_abbr', label: 'Cơ sở KH (E)' },
  { value: 'customer_item_code', label: 'Mã hàng KH (F)' },
  { value: 'system_item_code', label: 'Mã hàng (G)' },
  { value: 'product_name', label: 'Tên sản phẩm (I)' },
  { value: 'model_or_end_code', label: 'Kiểu mẫu (J)' },
  { value: 'spec', label: 'Quy cách (K)' },
  { value: 'manufacturer', label: 'Nhà SX (L)' },
  { value: 'uom', label: 'Đơn vị (M)' },
  { value: 'qty_expected', label: 'SL dự kiến (N)' },
  { value: 'po_qty_last_year', label: 'PO năm trước (O)' },
  { value: 'request_date', label: 'Ngày yêu cầu (P)' },
  { value: 'quotation_closing_date', label: 'Closing date (Q)' },
  { value: 'closing_time', label: 'Giờ đóng (R)' },
];

const OP_LABELS: Record<FilterOp, string> = {
  eq: 'bằng',
  neq: 'khác',
  contains: 'chứa',
  gt: '>',
  gte: '≥',
  lt: '<',
  lte: '≤',
  empty: 'trống',
  not_empty: 'không trống',
};

function newRule(priority: number): FilterRule {
  return {
    id: crypto.randomUUID(),
    name: `Quy tắc ${priority}`,
    enabled: true,
    priority,
    logic: 'and',
    conditions: [{ field: 'end_customer', op: 'contains', value: '' }],
    thenTag: 'tiem-nang',
  };
}

export function FilterRulesPanel({
  basePath,
  initialRules,
}: {
  basePath: string;
  initialRules: FilterRule[];
}) {
  const router = useRouter();
  const [rules, setRules] = useState<FilterRule[]>(initialRules);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const ordered = [...rules].sort((a, b) => a.priority - b.priority);

  const updateRule = (id: string, patch: Partial<FilterRule>): void => {
    setRules((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };

  const updateCondition = (
    ruleId: string,
    idx: number,
    patch: Partial<FilterCondition>,
  ): void => {
    setRules((prev) =>
      prev.map((r) => {
        if (r.id !== ruleId) return r;
        const conditions = r.conditions.map((c, i) =>
          i === idx ? { ...c, ...patch } : c,
        );
        return { ...r, conditions };
      }),
    );
  };

  const move = (id: string, dir: -1 | 1): void => {
    const sorted = [...rules].sort((a, b) => a.priority - b.priority);
    const i = sorted.findIndex((r) => r.id === id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= sorted.length) return;
    const a = sorted[i];
    const b = sorted[j];
    if (!a || !b) return;
    const pa = a.priority;
    updateRule(a.id, { priority: b.priority });
    setRules((prev) =>
      prev.map((r) => {
        if (r.id === a.id) return { ...r, priority: b.priority };
        if (r.id === b.id) return { ...r, priority: pa };
        return r;
      }),
    );
  };

  const onSave = async (): Promise<void> => {
    setBusy(true);
    setErr(null);
    setMsg(null);
    const result = await saveFilterRulesAction(JSON.stringify(rules), basePath);
    setBusy(false);
    if (!result.ok) {
      setErr(result.error);
      return;
    }
    setMsg('Đã lưu bộ lọc.');
    router.refresh();
  };

  const onReclassify = async (): Promise<void> => {
    setBusy(true);
    setErr(null);
    setMsg(null);
    const saveFirst = await saveFilterRulesAction(JSON.stringify(rules), basePath);
    if (!saveFirst.ok) {
      setBusy(false);
      setErr(saveFirst.error);
      return;
    }
    const result = await reclassifyAllAction(basePath);
    setBusy(false);
    if (!result.ok) {
      setErr(result.error);
      return;
    }
    setMsg(`Đã chạy lại lọc — cập nhật ${result.data.updated} yêu cầu.`);
    router.refresh();
  };

  return (
    <section className="glass rounded-2xl border border-panel/40 p-4 sm:p-5 space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-base font-bold text-ink sm:text-lg">Bộ lọc phân loại</h2>
          <p className="text-sm text-ink-muted mt-1 leading-relaxed">
            Quy tắc theo thứ tự ưu tiên (↑↓). Điều kiện AND/OR → gắn tag Tiềm năng / Cần cân nhắc /
            Không tiềm năng. Tag «Trùng» vẫn độc lập. Áp dụng khi import và khi «Chạy lại lọc».
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() =>
              setRules((prev) => [
                ...prev,
                newRule(
                  prev.length === 0
                    ? 10
                    : Math.max(...prev.map((r) => r.priority)) + 10,
                ),
              ])
            }
            className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-panel/40 px-3 text-sm font-medium text-ink hover:border-accent/40"
          >
            <Plus size={16} aria-hidden />
            Thêm quy tắc
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void onSave()}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-accent px-3 text-sm font-semibold text-app disabled:opacity-50"
          >
            {busy ? <Loader2 size={16} className="animate-spin" aria-hidden /> : <Save size={16} aria-hidden />}
            Lưu
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void onReclassify()}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-accent/40 px-3 text-sm font-medium text-accent disabled:opacity-50"
          >
            Chạy lại lọc
          </button>
        </div>
      </div>

      {msg && (
        <p className="rounded-xl border border-success/30 bg-success/10 px-3 py-2 text-sm text-success" role="status">
          {msg}
        </p>
      )}
      {err && (
        <p className="rounded-xl border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger" role="alert">
          {err}
        </p>
      )}

      {ordered.length === 0 && (
        <p className="text-sm text-ink-muted">Chưa có quy tắc — thêm để tự phân loại khi import.</p>
      )}

      <ul className="space-y-3">
        {ordered.map((rule) => (
          <li
            key={rule.id}
            className="rounded-xl border border-panel/40 bg-app/40 p-3 sm:p-4 space-y-3"
          >
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                aria-label="Tăng ưu tiên"
                onClick={() => move(rule.id, -1)}
                className="grid size-10 place-items-center rounded-xl text-ink-muted hover:bg-glass-strong"
              >
                <ArrowUp size={16} aria-hidden />
              </button>
              <button
                type="button"
                aria-label="Giảm ưu tiên"
                onClick={() => move(rule.id, 1)}
                className="grid size-10 place-items-center rounded-xl text-ink-muted hover:bg-glass-strong"
              >
                <ArrowDown size={16} aria-hidden />
              </button>
              <input
                className="min-h-11 min-w-0 flex-1 rounded-xl border border-panel/40 bg-app px-3 text-sm text-ink"
                value={rule.name}
                onChange={(e) => updateRule(rule.id, { name: e.target.value })}
                aria-label="Tên quy tắc"
              />
              <label className="inline-flex min-h-11 items-center gap-2 text-sm text-ink-muted px-1">
                <input
                  type="checkbox"
                  checked={rule.enabled}
                  onChange={(e) => updateRule(rule.id, { enabled: e.target.checked })}
                  className="size-4 accent-accent"
                />
                Bật
              </label>
              <button
                type="button"
                aria-label={`Xóa ${rule.name}`}
                onClick={() => setRules((prev) => prev.filter((r) => r.id !== rule.id))}
                className="grid size-10 place-items-center rounded-xl text-danger hover:bg-danger/10"
              >
                <Trash2 size={16} aria-hidden />
              </button>
            </div>

            <div className="flex flex-wrap gap-2 items-center text-sm">
              <span className="text-ink-muted">Nếu</span>
              <select
                className="min-h-11 rounded-xl border border-panel/40 bg-app px-2 text-ink"
                value={rule.logic}
                onChange={(e) =>
                  updateRule(rule.id, { logic: e.target.value === 'or' ? 'or' : 'and' })
                }
                aria-label="Logic điều kiện"
              >
                <option value="and">tất cả (AND)</option>
                <option value="or">một trong (OR)</option>
              </select>
              <span className="text-ink-muted">thì gắn</span>
              <select
                className="min-h-11 rounded-xl border border-panel/40 bg-app px-2 text-ink"
                value={rule.thenTag}
                onChange={(e) =>
                  updateRule(rule.id, {
                    thenTag: e.target.value as ClassificationTag,
                  })
                }
                aria-label="Tag kết quả"
              >
                {CLASSIFICATION_TAGS.map((t) => (
                  <option key={t} value={t}>
                    {CLASSIFICATION_LABELS[t]}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              {rule.conditions.map((c, idx) => (
                <div key={`${rule.id}-c-${idx}`} className="flex flex-wrap gap-2 items-center">
                  <select
                    className="min-h-11 rounded-xl border border-panel/40 bg-app px-2 text-sm text-ink max-w-[12rem]"
                    value={c.field}
                    onChange={(e) =>
                      updateCondition(rule.id, idx, { field: e.target.value })
                    }
                    aria-label="Trường"
                  >
                    {FIELD_OPTIONS.map((f) => (
                      <option key={f.value} value={f.value}>
                        {f.label}
                      </option>
                    ))}
                    {!FIELD_OPTIONS.some((f) => f.value === c.field) &&
                      ATTR_KEYS.includes(c.field as (typeof ATTR_KEYS)[number]) && (
                        <option value={c.field}>{c.field}</option>
                      )}
                  </select>
                  <select
                    className="min-h-11 rounded-xl border border-panel/40 bg-app px-2 text-sm text-ink"
                    value={c.op}
                    onChange={(e) =>
                      updateCondition(rule.id, idx, { op: e.target.value as FilterOp })
                    }
                    aria-label="Toán tử"
                  >
                    {FILTER_OPS.map((op) => (
                      <option key={op} value={op}>
                        {OP_LABELS[op]}
                      </option>
                    ))}
                  </select>
                  {c.op !== 'empty' && c.op !== 'not_empty' && (
                    <input
                      className="min-h-11 min-w-[8rem] flex-1 rounded-xl border border-panel/40 bg-app px-3 text-sm text-ink"
                      value={c.value ?? ''}
                      onChange={(e) =>
                        updateCondition(rule.id, idx, { value: e.target.value })
                      }
                      placeholder="Giá trị"
                      aria-label="Giá trị điều kiện"
                    />
                  )}
                  <button
                    type="button"
                    aria-label="Xóa điều kiện"
                    onClick={() =>
                      updateRule(rule.id, {
                        conditions: rule.conditions.filter((_, i) => i !== idx),
                      })
                    }
                    className="grid size-10 place-items-center rounded-xl text-ink-muted hover:text-danger"
                  >
                    <Trash2 size={14} aria-hidden />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() =>
                  updateRule(rule.id, {
                    conditions: [
                      ...rule.conditions,
                      { field: 'end_customer', op: 'contains', value: '' },
                    ],
                  })
                }
                className="text-sm font-medium text-accent hover:underline min-h-11 px-1"
              >
                + Thêm điều kiện
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
