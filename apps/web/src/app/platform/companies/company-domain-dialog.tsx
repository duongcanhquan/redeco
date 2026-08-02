'use client';

import { CheckCircle2, Globe } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { Field, Modal, inputClass } from '@/components/platform/modal';
import { slugifyTenantName } from '@/lib/tenant-slug';
import { updateTenantSlugAction } from './actions';

/**
 * Đổi tên miền (đường dẫn) của công ty: optimake.com/{slug}.
 * Đồng bộ claim tenant_slug cho toàn bộ user để proxy định tuyến đúng.
 */
export function CompanyDomainDialog({
  tenantId,
  tenantName,
  currentSlug,
}: {
  tenantId: string;
  tenantName: string;
  currentSlug: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [slug, setSlug] = useState(currentSlug);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedSlug, setSavedSlug] = useState<string | null>(null);

  const openDialog = (): void => {
    setSlug(currentSlug);
    setError(null);
    setSavedSlug(null);
    setOpen(true);
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const result = await updateTenantSlugAction(tenantId, slug);
    setSaving(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setSavedSlug(result.data.slug);
    router.refresh();
  };

  return (
    <>
      <button
        type="button"
        onClick={openDialog}
        className="inline-flex items-center gap-1.5 h-8 rounded-lg border border-panel/50 px-2.5 text-xs font-medium text-ink-muted hover:bg-glass-strong hover:text-ink transition-colors cursor-pointer"
      >
        <Globe size={13} aria-hidden />
        Tên miền
      </button>

      <Modal
        title={`Tên miền — ${tenantName}`}
        icon={<Globe size={18} className="text-accent" aria-hidden />}
        open={open}
        onClose={() => setOpen(false)}
      >
        {savedSlug ? (
          <div className="space-y-4">
            <p className="flex items-center gap-2 text-success text-sm">
              <CheckCircle2 size={17} aria-hidden />
              Đã đổi tên miền. Địa chỉ đăng nhập mới của công ty:
            </p>
            <a
              href={`/${savedSlug}/login`}
              target="_blank"
              rel="noopener"
              className="block rounded-xl bg-app/70 border border-panel/40 px-4 py-3 font-mono text-sm break-all text-accent hover:underline"
            >
              /{savedSlug}/login
            </a>
            <p className="text-xs text-warning">
              User đang đăng nhập sẽ được tự động chuyển sang địa chỉ mới ở lần tải trang kế tiếp.
            </p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="w-full h-11 rounded-xl bg-glass border border-panel/50 text-sm cursor-pointer hover:bg-glass-strong transition-colors"
            >
              Đóng
            </button>
          </div>
        ) : (
          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
            <Field
              id="tenant-slug"
              label="Tên miền công ty"
              required
              hint={`Địa chỉ đăng nhập: /${slug || '…'}/login — chữ thường, số, dấu gạch ngang.`}
            >
              <input
                id="tenant-slug"
                className={`${inputClass} font-mono`}
                required
                value={slug}
                onChange={(e) => setSlug(slugifyTenantName(e.target.value))}
                placeholder="cong-ty-abc"
              />
            </Field>

            {error && (
              <p role="alert" className="text-danger text-sm">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={saving || slug.trim() === currentSlug}
              className="w-full h-12 rounded-xl bg-accent font-semibold text-app cursor-pointer transition-shadow hover:shadow-[0_0_18px_rgba(0,238,255,0.4)] disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {saving ? 'Đang lưu…' : 'Đổi tên miền'}
            </button>
          </form>
        )}
      </Modal>
    </>
  );
}
