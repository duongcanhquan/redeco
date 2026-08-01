'use client';

import { Boxes, CheckCircle2, ChevronDown } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { ModuleTreeNode } from '@/services/platform.service';

/**
 * Cây module chia theo NHÓM (mỗi module gốc = 1 nhóm có nút sổ xuống).
 * Chế độ chọn: checkbox subtree — tick node cha = phủ toàn bộ nhánh con (ADR-008).
 * Chế độ xem: readOnly — chỉ hiển thị node được cấp (dấu check).
 */
export function ModuleTreePicker({
  tree,
  selected,
  onChange,
  readOnly = false,
  emptyText = 'Chưa có module nào.',
}: {
  tree: ModuleTreeNode[];
  selected: Set<string>;
  onChange?: (next: Set<string>) => void;
  readOnly?: boolean;
  emptyText?: string;
}) {
  // Nhóm đầu tiên mở sẵn để người dùng thấy ngay cách thao tác
  const [openGroups, setOpenGroups] = useState<Set<string>>(
    () => new Set(tree.length > 0 ? [tree[0]!.id] : []),
  );

  const parentOf = useMemo(() => {
    const map = new Map<string, string | null>();
    const walk = (nodes: ModuleTreeNode[], parent: string | null) => {
      for (const n of nodes) {
        map.set(n.id, parent);
        walk(n.children, n.id);
      }
    };
    walk(tree, null);
    return map;
  }, [tree]);

  const isCoveredByParent = (id: string): boolean => {
    let p = parentOf.get(id) ?? null;
    while (p) {
      if (selected.has(p)) return true;
      p = parentOf.get(p) ?? null;
    }
    return false;
  };

  const countSubtree = (node: ModuleTreeNode): number =>
    1 + node.children.reduce((s, c) => s + countSubtree(c), 0);

  const countSelectedIn = (node: ModuleTreeNode): number => {
    const own = selected.has(node.id) || isCoveredByParent(node.id) ? 1 : 0;
    return own + node.children.reduce((s, c) => s + countSelectedIn(c), 0);
  };

  const toggleNode = (node: ModuleTreeNode): void => {
    if (readOnly || !onChange) return;
    const next = new Set(selected);
    if (next.has(node.id)) {
      next.delete(node.id);
    } else {
      next.add(node.id);
      // Cha đã phủ cả nhánh -> bỏ các node con dư thừa
      const removeDescendants = (n: ModuleTreeNode) => {
        for (const c of n.children) {
          next.delete(c.id);
          removeDescendants(c);
        }
      };
      removeDescendants(node);
    }
    onChange(next);
  };

  const toggleGroup = (id: string): void => {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const renderNode = (node: ModuleTreeNode, depth: number) => {
    const covered = isCoveredByParent(node.id);
    const checked = selected.has(node.id) || covered;
    if (readOnly && !checked && countSelectedIn(node) === 0) return null;

    return (
      <div key={node.id} style={{ paddingLeft: depth * 18 }}>
        <label
          className={`flex items-center gap-2 py-1.5 select-none ${
            readOnly ? '' : covered ? 'opacity-60' : 'cursor-pointer'
          }`}
        >
          {readOnly ? (
            <CheckCircle2
              size={15}
              className={checked ? 'text-success shrink-0' : 'text-ink-muted/30 shrink-0'}
              aria-hidden
            />
          ) : (
            <input
              type="checkbox"
              checked={checked}
              disabled={covered}
              onChange={() => toggleNode(node)}
              className="size-4 rounded accent-accent cursor-pointer disabled:cursor-not-allowed"
            />
          )}
          <span className="text-sm">{node.name}</span>
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
              node.kind === 'feature' ? 'bg-glass text-ink-muted' : 'bg-accent-soft text-accent'
            }`}
          >
            {node.kind === 'feature' ? 'tính năng' : 'module'}
          </span>
        </label>
        {node.children.map((c) => renderNode(c, depth + 1))}
      </div>
    );
  };

  if (tree.length === 0) {
    return <p className="text-sm text-ink-muted py-4 text-center">{emptyText}</p>;
  }

  return (
    <div className="space-y-2">
      {tree.map((group) => {
        const total = countSubtree(group);
        const picked = countSelectedIn(group);
        const isOpen = openGroups.has(group.id);
        const groupChecked = selected.has(group.id);

        return (
          <div
            key={group.id}
            className={`rounded-xl border transition-colors ${
              picked > 0 ? 'border-accent/35 bg-accent-soft/30' : 'border-panel/50 bg-app/50'
            }`}
          >
            {/* Header nhóm: nút sổ + checkbox module gốc + đếm */}
            <div className="flex items-center gap-2 px-3 py-2.5">
              {readOnly ? (
                <CheckCircle2
                  size={17}
                  className={picked > 0 ? 'text-success shrink-0' : 'text-ink-muted/30 shrink-0'}
                  aria-hidden
                />
              ) : (
                <input
                  type="checkbox"
                  checked={groupChecked}
                  onChange={() => toggleNode(group)}
                  aria-label={`Cấp toàn bộ module ${group.name}`}
                  className="size-4 rounded accent-accent cursor-pointer"
                />
              )}
              <Boxes size={16} className="text-accent shrink-0" aria-hidden />
              <button
                type="button"
                onClick={() => toggleGroup(group.id)}
                aria-expanded={isOpen}
                className="flex flex-1 items-center justify-between gap-2 text-left cursor-pointer min-w-0"
              >
                <span className="font-medium text-sm truncate">{group.name}</span>
                <span className="flex items-center gap-2 shrink-0">
                  <span
                    className={`text-[11px] rounded-full px-2 py-0.5 ${
                      picked > 0 ? 'bg-accent-soft text-accent' : 'bg-glass text-ink-muted'
                    }`}
                  >
                    {groupChecked ? `Tất cả (${total})` : `${picked}/${total}`}
                  </span>
                  <ChevronDown
                    size={16}
                    aria-hidden
                    className={`text-ink-muted transition-transform ${isOpen ? 'rotate-180' : ''}`}
                  />
                </span>
              </button>
            </div>

            {/* Thân nhóm: các node con */}
            {isOpen && (
              <div className="border-t border-panel/40 px-3 py-2">
                {group.children.length === 0 ? (
                  <p className="text-xs text-ink-muted py-1">Module này chưa có phần con.</p>
                ) : (
                  group.children.map((c) => renderNode(c, 0))
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
