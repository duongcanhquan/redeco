'use client';

import { Plus, ScrollText } from 'lucide-react';
import { useMemo, useState, type FormEvent } from 'react';
import { Field, Modal, inputClass } from '@/components/platform/modal';
import type { ModuleTreeNode, TenantRow } from '@/services/platform.service';
import { createContractAction } from './actions';

function defaultCode(): string {
  const now = new Date();
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `HD-${now.getFullYear()}-${rand}`;
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function oneYearLater(): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() + 1);
  return d.toISOString().slice(0, 10);
}

export function CreateContractDialog({
  tenants,
  moduleTree,
}: {
  tenants: TenantRow[];
  moduleTree: ModuleTreeNode[];
}) {
  const [open, setOpen] = useState(false);
  const [tenantId, setTenantId] = useState('');
  const [code, setCode] = useState(defaultCode);
  const [startsOn, setStartsOn] = useState(today);
  const [endsOn, setEndsOn] = useState(oneYearLater);
  const [seats, setSeats] = useState(10);
  const [notes, setNotes] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [activateNow, setActivateNow] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Node -> node cha, để biết một node đã được "cover" bởi cha chưa
  const parentOf = useMemo(() => {
    const map = new Map<string, string | null>();
    const walk = (nodes: ModuleTreeNode[], parent: string | null) => {
      for (const n of nodes) {
        map.set(n.id, parent);
        walk(n.children, n.id);
      }
    };
    walk(moduleTree, null);
    return map;
  }, [moduleTree]);

  const isCoveredByParent = (id: string): boolean => {
    let p = parentOf.get(id) ?? null;
    while (p) {
      if (selected.has(p)) return true;
      p = parentOf.get(p) ?? null;
    }
    return false;
  };

  const toggle = (node: ModuleTreeNode) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(node.id)) {
        next.delete(node.id);
      } else {
        next.add(node.id);
        // Bỏ chọn các node con vì cha đã cover cả subtree
        const removeDescendants = (n: ModuleTreeNode) => {
          for (const c of n.children) {
            next.delete(c.id);
            removeDescendants(c);
          }
        };
        removeDescendants(node);
      }
      return next;
    });
  };

  const close = () => {
    setOpen(false);
    setError(null);
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const result = await createContractAction({
      tenantId,
      code,
      startsOn,
      endsOn,
      seats,
      notes,
      moduleIds: [...selected],
      activateNow,
    });
    setSubmitting(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setOpen(false);
    setCode(defaultCode());
    setSelected(new Set());
    setNotes('');
  };

  const renderTree = (nodes: ModuleTreeNode[], depth: number) =>
    nodes.map((node) => {
      const covered = isCoveredByParent(node.id);
      return (
        <div key={node.id} style={{ paddingLeft: depth * 18 }}>
          <label
            className={`flex items-center gap-2 py-1.5 select-none ${
              covered ? 'opacity-50' : 'cursor-pointer'
            }`}
          >
            <input
              type="checkbox"
              checked={selected.has(node.id) || covered}
              disabled={covered}
              onChange={() => toggle(node)}
              className="size-4 rounded accent-accent cursor-pointer disabled:cursor-not-allowed"
            />
            <span className="text-sm">{node.name}</span>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                node.kind === 'feature' ? 'bg-glass text-ink-muted' : 'bg-accent-soft text-accent'
              }`}
            >
              {node.kind === 'feature' ? 'tính năng' : 'module'}
            </span>
          </label>
          {node.children.length > 0 && renderTree(node.children, depth + 1)}
        </div>
      );
    });

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-app cursor-pointer transition-shadow hover:shadow-[0_0_18px_rgba(0,238,255,0.4)]"
      >
        <Plus size={16} aria-hidden />
        Lập hợp đồng
      </button>

      <Modal
        title="Lập hợp đồng mới"
        icon={<ScrollText size={18} className="text-accent" aria-hidden />}
        open={open}
        onClose={close}
      >
        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
          <Field id="ct-tenant" label="Công ty" required>
            <select
              id="ct-tenant"
              className={inputClass}
              required
              value={tenantId}
              onChange={(e) => setTenantId(e.target.value)}
            >
              <option value="">— Chọn công ty —</option>
              {tenants.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.slug})
                </option>
              ))}
            </select>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field id="ct-code" label="Mã hợp đồng" required>
              <input
                id="ct-code"
                className={`${inputClass} font-mono`}
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
            </Field>
            <Field id="ct-seats" label="Số seats" required>
              <input
                id="ct-seats"
                type="number"
                min={1}
                className={inputClass}
                required
                value={seats}
                onChange={(e) => setSeats(Number(e.target.value))}
              />
            </Field>
            <Field id="ct-start" label="Bắt đầu" required>
              <input
                id="ct-start"
                type="date"
                className={inputClass}
                required
                value={startsOn}
                onChange={(e) => setStartsOn(e.target.value)}
              />
            </Field>
            <Field id="ct-end" label="Kết thúc" required>
              <input
                id="ct-end"
                type="date"
                className={inputClass}
                required
                value={endsOn}
                onChange={(e) => setEndsOn(e.target.value)}
              />
            </Field>
          </div>

          <Field
            id="ct-modules"
            label="Module trong hợp đồng"
            required
            hint="Chọn node cha = công ty được toàn bộ nhánh con bên trong."
          >
            <div className="max-h-56 overflow-y-auto rounded-xl bg-app/70 border border-panel/50 p-3">
              {renderTree(moduleTree, 0)}
            </div>
          </Field>

          <Field id="ct-notes" label="Ghi chú">
            <textarea
              id="ct-notes"
              rows={2}
              className={`${inputClass} h-auto py-2.5 resize-none`}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </Field>

          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={activateNow}
              onChange={(e) => setActivateNow(e.target.checked)}
              className="size-4 rounded accent-accent cursor-pointer"
            />
            <span className="text-sm">Kích hoạt ngay (bỏ chọn = lưu nháp)</span>
          </label>

          {error && (
            <p role="alert" className="text-danger text-sm">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full h-12 rounded-xl bg-accent font-semibold text-app cursor-pointer transition-shadow hover:shadow-[0_0_18px_rgba(0,238,255,0.4)] disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {submitting ? 'Đang lập…' : 'Lập hợp đồng'}
          </button>
        </form>
      </Modal>
    </>
  );
}
