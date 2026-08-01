'use client';

import {
  Building2,
  CheckCircle2,
  Copy,
  Dices,
  Plus,
} from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Field, Modal, inputClass } from '@/components/platform/modal';
import { ModuleTreePicker } from '@/components/platform/module-tree-picker';
import type { ModuleTreeNode } from '@/services/platform.service';
import { createCompanyAction } from './actions';

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

function randomPassword(): string {
  const alphabet = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789';
  const bytes = new Uint32Array(10);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('');
}

interface CreatedInfo {
  companyName: string;
  slug: string;
  email: string;
  password: string;
}

export function CreateCompanyDialog({ moduleTree }: { moduleTree: ModuleTreeNode[] }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [password, setPassword] = useState('');
  const [seats, setSeats] = useState(10);
  const [selectedModules, setSelectedModules] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<CreatedInfo | null>(null);
  const [copied, setCopied] = useState(false);

  const reset = () => {
    setName('');
    setSlug('');
    setSlugTouched(false);
    setAdminName('');
    setAdminEmail('');
    setPassword('');
    setSeats(10);
    setSelectedModules(new Set());
    setError(null);
    setCreated(null);
    setCopied(false);
  };

  const close = () => {
    setOpen(false);
    reset();
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const result = await createCompanyAction({
      name,
      slug,
      adminFullName: adminName,
      adminEmail,
      adminPassword: password,
      moduleIds: [...selectedModules],
      seats,
    });
    setSubmitting(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setCreated({ companyName: name, slug, email: adminEmail, password });
  };

  const copyCredentials = async (): Promise<void> => {
    if (!created) return;
    await navigator.clipboard.writeText(
      `Công ty: ${created.companyName}\nĐịa chỉ đăng nhập: ${location.origin}/${created.slug}/login\nEmail: ${created.email}\nMật khẩu: ${created.password}`,
    );
    setCopied(true);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-app cursor-pointer transition-shadow hover:shadow-[0_0_18px_rgba(0,238,255,0.4)]"
      >
        <Plus size={16} aria-hidden />
        Tạo công ty
      </button>

      <Modal
        title={created ? 'Tạo công ty thành công' : 'Tạo công ty mới'}
        icon={<Building2 size={18} className="text-accent" aria-hidden />}
        open={open}
        onClose={close}
        wide={!created}
      >
        {created ? (
          <div className="space-y-4">
            <p className="flex items-center gap-2 text-success text-sm">
              <CheckCircle2 size={17} aria-hidden />
              Đã tạo công ty và tài khoản admin. Gửi thông tin dưới đây cho khách hàng.
            </p>
            <dl className="rounded-2xl bg-app/70 border border-panel/40 divide-y divide-panel/30 text-sm">
              {[
                ['Công ty', created.companyName],
                ['Địa chỉ đăng nhập', `/${created.slug}/login`],
                ['Email đăng nhập', created.email],
                ['Mật khẩu', created.password],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4 px-4 py-2.5">
                  <dt className="text-ink-muted">{k}</dt>
                  <dd className="font-mono font-medium text-right break-all">{v}</dd>
                </div>
              ))}
            </dl>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => void copyCredentials()}
                className="flex-1 inline-flex items-center justify-center gap-2 h-11 rounded-xl bg-accent-soft border border-accent/30 text-accent text-sm font-semibold cursor-pointer hover:bg-accent/20 transition-colors"
              >
                <Copy size={15} aria-hidden />
                {copied ? 'Đã copy!' : 'Copy thông tin'}
              </button>
              <button
                type="button"
                onClick={close}
                className="flex-1 h-11 rounded-xl bg-glass border border-panel/50 text-sm cursor-pointer hover:bg-glass-strong transition-colors"
              >
                Đóng
              </button>
            </div>
            <p className="text-xs text-warning">
              Lưu ý: mật khẩu chỉ hiển thị một lần tại đây.
            </p>
          </div>
        ) : (
          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
            <Field id="company-name" label="Tên công ty" required>
              <input
                id="company-name"
                className={inputClass}
                required
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (!slugTouched) setSlug(slugify(e.target.value));
                }}
                placeholder="Công ty TNHH ABC"
              />
            </Field>
            <Field
              id="company-slug"
              label="Tên miền công ty"
              required
              hint={slug ? `Địa chỉ truy cập: optimake.com/${slug}` : 'Chữ thường, số, dấu gạch ngang.'}
            >
              <input
                id="company-slug"
                className={`${inputClass} font-mono`}
                required
                value={slug}
                onChange={(e) => {
                  setSlugTouched(true);
                  setSlug(e.target.value);
                }}
                placeholder="cong-ty-abc"
              />
            </Field>
            <Field id="admin-name" label="Tên admin công ty" required>
              <input
                id="admin-name"
                className={inputClass}
                required
                value={adminName}
                onChange={(e) => setAdminName(e.target.value)}
                placeholder="Nguyễn Văn A"
              />
            </Field>
            <Field id="admin-email" label="Email admin (tài khoản đăng nhập)" required>
              <input
                id="admin-email"
                type="email"
                className={inputClass}
                required
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                placeholder="admin@congty.com"
              />
            </Field>
            <Field id="admin-password" label="Mật khẩu admin" required hint="Ít nhất 6 ký tự.">
              <div className="flex gap-2">
                <input
                  id="admin-password"
                  type="text"
                  className={`${inputClass} font-mono`}
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="off"
                />
                <button
                  type="button"
                  onClick={() => setPassword(randomPassword())}
                  title="Sinh mật khẩu ngẫu nhiên"
                  className="shrink-0 inline-flex items-center gap-1.5 h-11 rounded-xl bg-accent-soft border border-accent/30 px-3.5 text-accent text-sm cursor-pointer hover:bg-accent/20 transition-colors"
                >
                  <Dices size={15} aria-hidden />
                  Ngẫu nhiên
                </button>
              </div>
            </Field>

            <Field
              id="company-modules"
              label="Cấp module cho công ty"
              hint="Bấm mũi tên để sổ từng nhóm; tick module gốc = cấp cả nhánh con. Tự sinh hợp đồng active 1 năm. Bỏ trống = cấp sau ở nút “Gán module”."
            >
              <div className="max-h-64 overflow-y-auto rounded-xl bg-app/40 p-1">
                <ModuleTreePicker
                  tree={moduleTree}
                  selected={selectedModules}
                  onChange={setSelectedModules}
                />
              </div>
            </Field>

            {selectedModules.size > 0 && (
              <Field id="company-seats" label="Số người dùng tối đa (seats)" required>
                <input
                  id="company-seats"
                  type="number"
                  min={1}
                  className={inputClass}
                  required
                  value={seats}
                  onChange={(e) => setSeats(Number(e.target.value))}
                />
              </Field>
            )}

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
              {submitting ? 'Đang tạo…' : 'Tạo công ty + tài khoản admin'}
            </button>
          </form>
        )}
      </Modal>
    </>
  );
}
