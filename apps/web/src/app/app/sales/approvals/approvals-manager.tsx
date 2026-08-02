'use client';

import { Plus, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import type { AssigneeRole } from '@optimake/domain';
import { Field, Modal, inputClass } from '@/components/platform/modal';
import type { ApprovalWorkflowRow } from '@/services/sales-config.service';
import { saveApprovalWorkflowAction } from './actions';

interface StepDraft {
  name: string;
  minAmount: string;
  assigneeRole: AssigneeRole;
}

export function ApprovalsManager({ initial }: { initial: ApprovalWorkflowRow[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ApprovalWorkflowRow | null>(null);
  const [name, setName] = useState('');
  const [isDefault, setIsDefault] = useState(true);
  const [isActive, setIsActive] = useState(true);
  const [steps, setSteps] = useState<StepDraft[]>([
    { name: 'Quản trị duyệt', minAmount: '0', assigneeRole: 'admin' },
  ]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const openEdit = (w: ApprovalWorkflowRow | null): void => {
    setEditing(w);
    setName(w?.name ?? 'Quy trình duyệt báo giá');
    setIsDefault(w?.is_default ?? true);
    setIsActive(w?.is_active ?? true);
    setSteps(
      w?.approval_workflow_steps?.length
        ? w.approval_workflow_steps.map((s) => ({
            name: s.name,
            minAmount: String(Number(s.min_amount)),
            assigneeRole: (s.assignee_role ?? 'admin') as AssigneeRole,
          }))
        : [{ name: 'Quản trị duyệt', minAmount: '0', assigneeRole: 'admin' }],
    );
    setError(null);
    setOpen(true);
  };

  const submit = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const result = await saveApprovalWorkflowAction({
      id: editing?.id,
      name,
      isDefault,
      isActive,
      steps: steps.map((s) => ({
        name: s.name,
        minAmount: Number(s.minAmount || '0'),
        assigneeRole: s.assigneeRole,
        assigneeUserId: null,
      })),
    });
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setOpen(false);
    router.refresh();
  };

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={() => openEdit(null)}
        className="inline-flex h-11 items-center gap-2 rounded-xl bg-accent px-4 font-semibold text-app text-sm cursor-pointer"
      >
        <Plus size={16} aria-hidden />
        Thêm / sửa quy trình
      </button>

      <div className="space-y-3">
        {initial.map((w) => (
          <article key={w.id} className="glass rounded-2xl p-5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="font-semibold">{w.name}</h2>
                <p className="text-xs text-ink-muted">
                  {w.is_default ? 'Mặc định · ' : ''}
                  {w.is_active ? 'Đang dùng' : 'Tắt'} · {w.approval_workflow_steps.length} bước
                </p>
              </div>
              <button
                type="button"
                onClick={() => openEdit(w)}
                className="text-sm text-accent hover:underline cursor-pointer"
              >
                Chỉnh sửa
              </button>
            </div>
            <ol className="space-y-2">
              {w.approval_workflow_steps.map((s) => (
                <li
                  key={s.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-app/50 border border-panel/40 px-3 py-2 text-sm"
                >
                  <span>
                    <span className="text-accent font-mono text-xs mr-2">#{s.step_order}</span>
                    {s.name}
                  </span>
                  <span className="text-xs text-ink-muted">
                    ≥ {Number(s.min_amount).toLocaleString('vi-VN')} đ · role{' '}
                    {s.assignee_role ?? 'user'}
                  </span>
                </li>
              ))}
            </ol>
          </article>
        ))}
      </div>

      <Modal
        title={editing ? 'Sửa quy trình duyệt' : 'Tạo quy trình duyệt'}
        open={open}
        onClose={() => setOpen(false)}
        wide
      >
        <form onSubmit={(e) => void submit(e)} className="space-y-4">
          <Field id="wf-name" label="Tên quy trình" required>
            <input
              id="wf-name"
              className={inputClass}
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </Field>
          <div className="flex flex-wrap gap-4">
            <label className="inline-flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={isDefault}
                onChange={(e) => setIsDefault(e.target.checked)}
                className="size-4 accent-accent"
              />
              Đặt làm mặc định
            </label>
            <label className="inline-flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="size-4 accent-accent"
              />
              Đang hiệu lực
            </label>
          </div>

          <div className="space-y-3">
            <p className="text-sm font-medium">Các bước (theo thứ tự)</p>
            {steps.map((s, i) => (
              <div
                key={i}
                className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-end rounded-xl border border-panel/40 p-3"
              >
                <div className="sm:col-span-4">
                  <Field id={`st-name-${i}`} label={`Bước ${i + 1}`}>
                    <input
                      id={`st-name-${i}`}
                      className={inputClass}
                      required
                      value={s.name}
                      onChange={(e) => {
                        const next = [...steps];
                        next[i] = { ...s, name: e.target.value };
                        setSteps(next);
                      }}
                    />
                  </Field>
                </div>
                <div className="sm:col-span-3">
                  <Field id={`st-min-${i}`} label="Ngưỡng tiền">
                    <input
                      id={`st-min-${i}`}
                      type="number"
                      min={0}
                      className={inputClass}
                      value={s.minAmount}
                      onChange={(e) => {
                        const next = [...steps];
                        next[i] = { ...s, minAmount: e.target.value };
                        setSteps(next);
                      }}
                    />
                  </Field>
                </div>
                <div className="sm:col-span-3">
                  <Field id={`st-role-${i}`} label="Role duyệt">
                    <select
                      id={`st-role-${i}`}
                      className={inputClass}
                      value={s.assigneeRole}
                      onChange={(e) => {
                        const next = [...steps];
                        next[i] = { ...s, assigneeRole: e.target.value as AssigneeRole };
                        setSteps(next);
                      }}
                    >
                      <option value="admin">admin</option>
                      <option value="owner">owner</option>
                      <option value="member">member</option>
                    </select>
                  </Field>
                </div>
                <div className="sm:col-span-2">
                  <button
                    type="button"
                    aria-label="Xóa bước"
                    disabled={steps.length <= 1}
                    className="h-11 w-full rounded-xl border border-danger/40 text-danger cursor-pointer disabled:opacity-40"
                    onClick={() => setSteps(steps.filter((_, j) => j !== i))}
                  >
                    <Trash2 size={15} className="mx-auto" />
                  </button>
                </div>
              </div>
            ))}
            <button
              type="button"
              className="text-sm text-accent hover:underline cursor-pointer"
              onClick={() =>
                setSteps([
                  ...steps,
                  { name: `Bước ${steps.length + 1}`, minAmount: '0', assigneeRole: 'owner' },
                ])
              }
            >
              + Thêm bước
            </button>
          </div>

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
            {busy ? 'Đang lưu…' : 'Lưu quy trình'}
          </button>
        </form>
      </Modal>
    </div>
  );
}
