'use client';

import { Boxes, ChevronDown } from 'lucide-react';
import { useState } from 'react';
import type { ModuleTreeNode } from '@/services/platform.service';

/** Danh mục module CHỈ ĐỌC: mỗi module gốc là một nhóm có nút sổ xuống. */
export function ModuleCatalogView({ tree }: { tree: ModuleTreeNode[] }) {
  const [open, setOpen] = useState<Set<string>>(() => new Set(tree.map((t) => t.id)));

  const toggle = (id: string): void => {
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const countSubtree = (node: ModuleTreeNode): number =>
    1 + node.children.reduce((s, c) => s + countSubtree(c), 0);

  const renderNode = (node: ModuleTreeNode, depth: number) => (
    <div key={node.id} style={{ paddingLeft: depth * 18 }}>
      <div className={`flex items-center gap-2 py-1.5 ${node.is_active ? '' : 'opacity-45'}`}>
        <span className="size-1.5 rounded-full bg-accent/60 shrink-0" aria-hidden />
        <span className="text-sm">{node.name}</span>
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
            node.kind === 'feature' ? 'bg-glass text-ink-muted' : 'bg-accent-soft text-accent'
          }`}
        >
          {node.kind === 'feature' ? 'tính năng' : 'module'}
        </span>
        {!node.is_active && (
          <span className="rounded-full bg-glass px-2 py-0.5 text-[10px] text-ink-muted">đã tắt</span>
        )}
        {node.description && (
          <span className="text-xs text-ink-muted truncate hidden sm:inline">
            — {node.description}
          </span>
        )}
      </div>
      {node.children.map((c) => renderNode(c, depth + 1))}
    </div>
  );

  return (
    <div className="space-y-3">
      {tree.map((group) => {
        const isOpen = open.has(group.id);
        return (
          <section key={group.id} className="glass rounded-2xl overflow-hidden">
            <button
              type="button"
              onClick={() => toggle(group.id)}
              aria-expanded={isOpen}
              className="flex w-full items-center gap-3 px-5 py-4 text-left cursor-pointer hover:bg-glass-strong/40 transition-colors"
            >
              <span className="grid size-10 place-items-center rounded-xl bg-accent-soft border border-accent/25 text-accent shrink-0">
                <Boxes size={19} aria-hidden />
              </span>
              <span className="flex-1 min-w-0">
                <span className={`block font-semibold ${group.is_active ? '' : 'opacity-50'}`}>
                  {group.name}
                </span>
                <span className="block text-xs text-ink-muted truncate">
                  {group.description ?? `key: ${group.key}`}
                </span>
              </span>
              <span className="text-[11px] rounded-full bg-glass px-2.5 py-1 text-ink-muted shrink-0">
                {countSubtree(group)} node
              </span>
              <ChevronDown
                size={18}
                aria-hidden
                className={`text-ink-muted shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`}
              />
            </button>
            {isOpen && (
              <div className="border-t border-panel/40 px-5 py-3">
                {group.children.length === 0 ? (
                  <p className="text-sm text-ink-muted py-1">Chưa có phần con.</p>
                ) : (
                  group.children.map((c) => renderNode(c, 0))
                )}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
