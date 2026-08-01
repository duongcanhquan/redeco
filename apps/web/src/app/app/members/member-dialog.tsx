'use client';

import { AlertCircle, CheckCircle2, Copy, Dices, UserPlus, UserRoundPen } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { Field, Modal, inputClass } from '@/components/platform/modal';
import { ModuleTreePicker } from '@/components/platform/module-tree-picker';
import type { ModuleTreeNode } from '@/services/platform.service';
import type { MemberRow } from '@/services/tenant-admin.service';
import { createMemberAction, updateMemberAction } from './actions';

function randomPassword(): string {
  const alphabet = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789';
  const bytes = new Uint32Array(10);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('');
}

/**
 * Tạo/sửa thành viên: chọn vai trò theo chức năng và phân công module
 * từ cây module CÔNG TY ĐANG CÓ (nhóm có nút sổ, tick cha = cả nhánh).
 */
export function MemberDialog({
  member,
  entitledTree,
}: {
  member?: MemberRow;
  entitledTree: ModuleTreeNode[];
}) {
  const router = useRouter();
  const editing = Boolean(member);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdInfo, setCreatedInfo] = useState<{ email: string; password: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const [fullName, setFullName] = useState(member?.full_name ?? '');
  const [email, setEmail] = useState(member?.attributes.email ?? '');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'admin' | 'member'>(
    member?.role === 'admin' ? 'admin' : 'member',
  );
  const [moduleIds, setModuleIds] = useState<Set<string>>(
    () => new Set((member?.user_module_assignments ?? []).map((a) => a.module_id)),
  );

  const openDialog = (): void => {
    setError(null);
    setCreatedInfo(null);
    setCopied(false);
    if (!editing) setPassword(randomPassword());
    setOpen(true);
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    if (member) {
      const result = await updateMemberAction(member.id, { role, moduleIds: [...moduleIds] });
      setSaving(false);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setOpen(false);
      router.refresh();
      return;
    }
    const result = await createMemberAction({
      fullName,
      email,
      password,
      role,
      moduleIds: [...moduleIds],
    });
    setSaving(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setCreatedInfo({ email: result.data.email, password });
    router.refresh();
  };

  const copyCredentials = async (): Promise<void> => {
    if (!createdInfo) return;
    await navigator.clipboard.writeText(
      `Email: ${createdInfo.email}\nMật khẩu: ${createdInfo.password}`,
    );
    setCopied(true);
  };

  return (
    <>
      {editing ? (
        <button
          type="button"
          onClick={openDialog}
          aria-label={`Sửa thành viên ${member?.full_name ?? ''}`}
          className="inline-flex items-center gap-1.5 h-8 rounded-lg border border-panel/60 px-2.5 text-xs font-medium text-ink-muted hover:text-ink hover:bg-glass-strong transition-colors cursor-pointer"
        >
          <UserRoundPen size={13} aria-hidden />
          Sửa
        </button>
      ) : (
        <button
          type="button"
          onClick={openDialog}
          className="inline-flex h-11 items-center gap-2 rounded-xl bg-accent px-4 font-semibold text-app text-sm cursor-pointer transition-shadow hover:shadow-[0_0_18px_rgba(0,238,255,0.4)]"
        >
          <UserPlus size={17} aria-hidden />
          Thêm thành viên
        </button>
      )}

      <Modal
        title={
          createdInfo
            ? 'Tạo thành viên thành công'
            : editing
              ? `Sửa thành viên — ${member?.full_name ?? ''}`
              : 'Thêm thành viên'
        }
        icon={<UserPlus size={18} className="text-accent" aria-hidden />}
        open={open}
        onClose={() => setOpen(false)}
        wide={!createdInfo}
      >
        {createdInfo ? (
          <div className="space-y-4">
            <p className="flex items-center gap-2 text-success text-sm">
              <CheckCircle2 size={17} aria-hidden />
              Gửi thông tin đăng nhập dưới đây cho thành viên.
            </p>
            <dl className="rounded-2xl bg-app/70 border border-panel/40 divide-y divide-panel/30 text-sm">
              {[
                ['Email đăng nhập', createdInfo.email],
                ['Mật khẩu', createdInfo.password],
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
                onClick={() => setOpen(false)}
                className="flex-1 h-11 rounded-xl bg-glass border border-panel/50 text-sm cursor-pointer hover:bg-glass-strong transition-colors"
              >
                Đóng
              </button>
            </div>
            <p className="text-xs text-warning">Lưu ý: mật khẩu chỉ hiển thị một lần tại đây.</p>
          </div>
        ) : (
          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
            {!editing && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field id="mem-name" label="Họ tên" required>
                    <input
                      id="mem-name"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className={inputClass}
                      placeholder="Trần Thị B"
                    />
                  </Field>
                  <Field id="mem-email" label="Email đăng nhập" required>
                    <input
                      id="mem-email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className={inputClass}
                      placeholder="nhanvien@congty.com"
                    />
                  </Field>
                </div>
                <Field id="mem-password" label="Mật khẩu" required hint="Ít nhất 6 ký tự.">
                  <div className="flex gap-2">
                    <input
                      id="mem-password"
                      type="text"
                      required
                      minLength={6}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className={`${inputClass} font-mono`}
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
              </>
            )}

            <Field
              id="mem-role"
              label="Vai trò"
              required
              hint="Quản trị thấy toàn bộ module công ty được cấp; Thành viên chỉ thấy module được phân công bên dưới."
            >
              <select
                id="mem-role"
                value={role}
                onChange={(e) => setRole(e.target.value as 'admin' | 'member')}
                className={inputClass}
              >
                <option value="member">Thành viên (theo phân công)</option>
                <option value="admin">Quản trị công ty</option>
              </select>
            </Field>

            {role === 'member' && (
              <Field
                id="mem-modules"
                label="Phân công module"
                hint="Chỉ hiện các module công ty đang được cấp. Bấm mũi tên để sổ nhóm; tick module gốc = giao cả nhánh."
              >
                <div className="max-h-60 overflow-y-auto rounded-xl bg-app/40 p-1">
                  <ModuleTreePicker
                    tree={entitledTree}
                    selected={moduleIds}
                    onChange={setModuleIds}
                    emptyText="Công ty chưa được cấp module nào — liên hệ Optimake."
                  />
                </div>
              </Field>
            )}

            {error && (
              <p role="alert" className="flex items-center gap-2 text-sm text-danger">
                <AlertCircle size={16} aria-hidden />
                {error}
              </p>
            )}

            <div className="flex justify-end gap-3 pt-1">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="h-11 rounded-xl border border-panel/60 px-4 text-sm text-ink-muted hover:text-ink hover:bg-glass-strong transition-colors cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={saving}
                className="h-11 rounded-xl bg-accent px-5 text-sm font-semibold text-app cursor-pointer transition-shadow hover:shadow-[0_0_18px_rgba(0,238,255,0.4)] disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {saving ? 'Đang lưu…' : editing ? 'Lưu thay đổi' : 'Tạo thành viên'}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </>
  );
}
