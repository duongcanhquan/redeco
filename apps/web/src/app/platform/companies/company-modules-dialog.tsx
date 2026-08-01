'use client';

import { AlertCircle, Boxes, CheckCircle2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Modal } from '@/components/platform/modal';
import { ModuleTreePicker } from '@/components/platform/module-tree-picker';
import type { ModuleTreeNode } from '@/services/platform.service';
import { setTenantModulesAction } from './actions';

/**
 * Gán module cho một công ty: cây module chia nhóm (nút sổ),
 * tick chọn = active cho khách hàng đó (ghi vào hợp đồng hiệu lực).
 */
export function CompanyModulesDialog({
  tenantId,
  tenantName,
  moduleTree,
  currentModuleIds,
}: {
  tenantId: string;
  tenantName: string;
  moduleTree: ModuleTreeNode[];
  currentModuleIds: string[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(() => new Set(currentModuleIds));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  const openDialog = (): void => {
    setSelected(new Set(currentModuleIds));
    setError(null);
    setSavedMsg(null);
    setOpen(true);
  };

  const save = async (): Promise<void> => {
    setSaving(true);
    setError(null);
    setSavedMsg(null);
    const result = await setTenantModulesAction(tenantId, [...selected]);
    setSaving(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setSavedMsg(
      result.data.contractCode
        ? `Đã lưu — module ghi vào hợp đồng ${result.data.contractCode}.`
        : 'Đã lưu.',
    );
    router.refresh();
  };

  return (
    <>
      <button
        type="button"
        onClick={openDialog}
        className="inline-flex items-center gap-1.5 h-8 rounded-lg border border-accent/40 px-2.5 text-xs font-medium text-accent hover:bg-accent-soft transition-colors cursor-pointer"
      >
        <Boxes size={13} aria-hidden />
        Gán module
      </button>

      <Modal
        title={`Gán module — ${tenantName}`}
        icon={<Boxes size={18} className="text-accent" aria-hidden />}
        open={open}
        onClose={() => setOpen(false)}
        wide
      >
        <div className="space-y-4">
          <p className="text-sm text-ink-muted">
            Bấm mũi tên để sổ từng nhóm module. Tick module gốc = cấp toàn bộ nhánh con; hoặc sổ
            ra và tick từng phần nhỏ. Thay đổi ghi vào hợp đồng đang hiệu lực (chưa có sẽ tự sinh
            hợp đồng active 1 năm).
          </p>

          <div className="max-h-[55dvh] overflow-y-auto pr-1">
            <ModuleTreePicker tree={moduleTree} selected={selected} onChange={setSelected} />
          </div>

          {error && (
            <p role="alert" className="flex items-center gap-2 text-sm text-danger">
              <AlertCircle size={16} aria-hidden />
              {error}
            </p>
          )}
          {savedMsg && (
            <p role="status" className="flex items-center gap-2 text-sm text-success">
              <CheckCircle2 size={16} aria-hidden />
              {savedMsg}
            </p>
          )}

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="h-11 rounded-xl border border-panel/60 px-4 text-sm text-ink-muted hover:text-ink hover:bg-glass-strong transition-colors cursor-pointer"
            >
              Đóng
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => void save()}
              className="h-11 rounded-xl bg-accent px-5 text-sm font-semibold text-app cursor-pointer transition-shadow hover:shadow-[0_0_18px_rgba(0,238,255,0.4)] disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {saving ? 'Đang lưu…' : `Lưu (${selected.size} node)`}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
