'use client';

import {
  Boxes,
  Package,
  Pencil,
  Plus,
  Power,
  Puzzle,
} from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Field, Modal, inputClass } from '@/components/platform/modal';
import type { ModuleTreeNode } from '@/services/platform.service';
import { createModuleAction, setModuleActiveAction, updateModuleAction } from './actions';

function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

type DialogState =
  | { mode: 'add'; parent: ModuleTreeNode | null }
  | { mode: 'edit'; node: ModuleTreeNode }
  | null;

export function ModulesManager({ tree }: { tree: ModuleTreeNode[] }) {
  const [dialog, setDialog] = useState<DialogState>(null);
  const [name, setName] = useState('');
  const [keySegment, setKeySegment] = useState('');
  const [keyTouched, setKeyTouched] = useState(false);
  const [description, setDescription] = useState('');
  const [kind, setKind] = useState<'module' | 'feature'>('module');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openAdd = (parent: ModuleTreeNode | null) => {
    setName('');
    setKeySegment('');
    setKeyTouched(false);
    setDescription('');
    setKind(parent ? 'feature' : 'module');
    setError(null);
    setDialog({ mode: 'add', parent });
  };

  const openEdit = (node: ModuleTreeNode) => {
    setName(node.name);
    setDescription(node.description ?? '');
    setError(null);
    setDialog({ mode: 'edit', node });
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    if (!dialog) return;
    setError(null);
    setPending(true);
    const result =
      dialog.mode === 'add'
        ? await createModuleAction({
            parentId: dialog.parent?.id ?? null,
            keySegment,
            name,
            description,
            kind,
          })
        : await updateModuleAction(dialog.node.id, { name, description });
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setDialog(null);
  };

  const toggleActive = async (node: ModuleTreeNode): Promise<void> => {
    if (
      node.is_active &&
      !window.confirm(`Tắt "${node.name}"? Node và nhánh con sẽ ẩn khỏi hệ thống các công ty.`)
    ) {
      return;
    }
    await setModuleActiveAction(node.id, !node.is_active);
  };

  const renderNodes = (nodes: ModuleTreeNode[]) => (
    <ul className="space-y-1 border-l border-panel/40 pl-4">
      {nodes.map((node) => (
        <li key={node.id}>
          <div className={`group flex items-center gap-2 py-1 ${node.is_active ? '' : 'opacity-45'}`}>
            <Puzzle
              size={14}
              className={node.kind === 'feature' ? 'text-ink-muted' : 'text-accent'}
              aria-hidden
            />
            <span className="text-sm">{node.name}</span>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                node.kind === 'feature' ? 'bg-glass text-ink-muted' : 'bg-accent-soft text-accent'
              }`}
            >
              {node.kind === 'feature' ? 'tính năng' : 'module'}
            </span>
            {!node.is_active && (
              <span className="rounded-full bg-danger/10 px-2 py-0.5 text-[10px] font-medium text-danger">
                đã tắt
              </span>
            )}
            <NodeButtons node={node} onAdd={openAdd} onEdit={openEdit} onToggle={toggleActive} />
          </div>
          {node.children.length > 0 && renderNodes(node.children)}
        </li>
      ))}
    </ul>
  );

  return (
    <>
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => openAdd(null)}
          className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-app cursor-pointer transition-shadow hover:shadow-[0_0_18px_rgba(0,238,255,0.4)]"
        >
          <Plus size={16} aria-hidden />
          Thêm module gốc
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {tree.map((root) => (
          <section key={root.id} className={`glass rounded-2xl p-5 ${root.is_active ? '' : 'opacity-60'}`}>
            <div className="group flex items-center gap-3 mb-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent-soft border border-accent/25 text-accent">
                <Package size={19} aria-hidden />
              </span>
              <div className="min-w-0">
                <h2 className="font-semibold flex items-center gap-2">
                  {root.name}
                  {!root.is_active && (
                    <span className="rounded-full bg-danger/10 px-2 py-0.5 text-[10px] font-medium text-danger">
                      đã tắt
                    </span>
                  )}
                </h2>
                <p className="text-xs text-ink-muted font-mono">{root.key}</p>
              </div>
              <div className="ml-auto">
                <NodeButtons node={root} onAdd={openAdd} onEdit={openEdit} onToggle={toggleActive} />
              </div>
            </div>
            {root.description && <p className="text-sm text-ink-muted mb-3">{root.description}</p>}
            {root.children.length > 0 ? (
              renderNodes(root.children)
            ) : (
              <p className="text-xs text-ink-muted italic">Chưa có thành phần con.</p>
            )}
          </section>
        ))}
      </div>

      <Modal
        title={
          dialog?.mode === 'edit'
            ? `Sửa: ${dialog.node.name}`
            : dialog?.parent
              ? `Thêm vào "${dialog.parent.name}"`
              : 'Thêm module gốc'
        }
        icon={<Boxes size={18} className="text-accent" aria-hidden />}
        open={dialog !== null}
        onClose={() => setDialog(null)}
      >
        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
          <Field id="md-name" label="Tên hiển thị" required>
            <input
              id="md-name"
              className={inputClass}
              required
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (dialog?.mode === 'add' && !keyTouched) setKeySegment(slugify(e.target.value));
              }}
              placeholder="Báo cáo bán hàng"
            />
          </Field>

          {dialog?.mode === 'add' && (
            <>
              <Field
                id="md-key"
                label="Khóa (key)"
                required
                hint={
                  dialog.parent
                    ? `Key đầy đủ: ${dialog.parent.key}.${keySegment || '…'}`
                    : 'Chữ thường, số, dấu gạch ngang.'
                }
              >
                <input
                  id="md-key"
                  className={`${inputClass} font-mono`}
                  required
                  value={keySegment}
                  onChange={(e) => {
                    setKeyTouched(true);
                    setKeySegment(e.target.value);
                  }}
                  placeholder="bao-cao-ban-hang"
                />
              </Field>
              <Field id="md-kind" label="Loại" required>
                <select
                  id="md-kind"
                  className={inputClass}
                  value={kind}
                  onChange={(e) => setKind(e.target.value as 'module' | 'feature')}
                >
                  <option value="module">Module / Phần (có thể chứa thành phần con)</option>
                  <option value="feature">Tính năng (node lá)</option>
                </select>
              </Field>
            </>
          )}

          <Field id="md-desc" label="Mô tả">
            <textarea
              id="md-desc"
              rows={2}
              className={`${inputClass} h-auto py-2.5 resize-none`}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </Field>

          {error && (
            <p role="alert" className="text-danger text-sm">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="w-full h-12 rounded-xl bg-accent font-semibold text-app cursor-pointer transition-shadow hover:shadow-[0_0_18px_rgba(0,238,255,0.4)] disabled:opacity-60"
          >
            {pending ? 'Đang lưu…' : dialog?.mode === 'edit' ? 'Lưu thay đổi' : 'Thêm vào danh mục'}
          </button>
        </form>
      </Modal>
    </>
  );
}

function NodeButtons({
  node,
  onAdd,
  onEdit,
  onToggle,
}: {
  node: ModuleTreeNode;
  onAdd: (parent: ModuleTreeNode) => void;
  onEdit: (node: ModuleTreeNode) => void;
  onToggle: (node: ModuleTreeNode) => Promise<void>;
}) {
  const iconBtn =
    'grid size-7 place-items-center rounded-lg text-ink-muted hover:text-accent hover:bg-accent-soft transition-colors cursor-pointer';
  return (
    <span className="inline-flex items-center gap-0.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
      <button type="button" title="Thêm thành phần con" className={iconBtn} onClick={() => onAdd(node)}>
        <Plus size={14} aria-hidden />
        <span className="sr-only">Thêm thành phần con vào {node.name}</span>
      </button>
      <button type="button" title="Sửa tên/mô tả" className={iconBtn} onClick={() => onEdit(node)}>
        <Pencil size={13} aria-hidden />
        <span className="sr-only">Sửa {node.name}</span>
      </button>
      <button
        type="button"
        title={node.is_active ? 'Tắt node này' : 'Bật lại'}
        className={`${iconBtn} ${node.is_active ? 'hover:text-danger hover:bg-danger/10' : 'hover:text-success hover:bg-success/10'}`}
        onClick={() => void onToggle(node)}
      >
        <Power size={13} aria-hidden />
        <span className="sr-only">
          {node.is_active ? 'Tắt' : 'Bật'} {node.name}
        </span>
      </button>
    </span>
  );
}
