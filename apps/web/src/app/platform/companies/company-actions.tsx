'use client';

import { CheckCircle2, Copy, KeyRound, PauseCircle, PlayCircle } from 'lucide-react';
import { useState } from 'react';
import { Modal } from '@/components/platform/modal';
import type { TenantRow } from '@/services/platform.service';
import { resetAdminPasswordAction, setTenantStatusAction } from './actions';

const btnBase =
  'inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed';

function randomPassword(): string {
  const alphabet = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789';
  const bytes = new Uint32Array(10);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('');
}

export function CompanyActions({ tenant }: { tenant: TenantRow }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetOpen, setResetOpen] = useState(false);
  const [resetResult, setResetResult] = useState<{ email: string; password: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const toggleStatus = async (): Promise<void> => {
    const next = tenant.status === 'active' ? 'suspended' : 'active';
    if (next === 'suspended' && !window.confirm(`Tạm dừng công ty "${tenant.name}"?`)) return;
    setError(null);
    setPending(true);
    const result = await setTenantStatusAction(tenant.id, next);
    setPending(false);
    if (!result.ok) setError(result.error);
  };

  const doReset = async (): Promise<void> => {
    setError(null);
    setPending(true);
    const password = randomPassword();
    const result = await resetAdminPasswordAction(tenant.id, password);
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setResetResult({ email: result.data.adminEmail, password });
  };

  const closeReset = () => {
    setResetOpen(false);
    setResetResult(null);
    setCopied(false);
    setError(null);
  };

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {tenant.status === 'active' ? (
        <button
          type="button"
          disabled={pending}
          onClick={() => void toggleStatus()}
          className={`${btnBase} bg-warning/10 text-warning hover:bg-warning/20`}
        >
          <PauseCircle size={13} aria-hidden />
          Tạm dừng
        </button>
      ) : (
        <button
          type="button"
          disabled={pending}
          onClick={() => void toggleStatus()}
          className={`${btnBase} bg-success/10 text-success hover:bg-success/20`}
        >
          <PlayCircle size={13} aria-hidden />
          Kích hoạt
        </button>
      )}
      <button
        type="button"
        disabled={pending}
        onClick={() => setResetOpen(true)}
        className={`${btnBase} bg-accent-soft text-accent hover:bg-accent/20`}
      >
        <KeyRound size={13} aria-hidden />
        Reset mật khẩu
      </button>
      {error && !resetOpen && <span className="text-danger text-xs w-full">{error}</span>}

      <Modal
        title="Đặt lại mật khẩu admin"
        icon={<KeyRound size={18} className="text-accent" aria-hidden />}
        open={resetOpen}
        onClose={closeReset}
      >
        {resetResult ? (
          <div className="space-y-4">
            <p className="flex items-center gap-2 text-success text-sm">
              <CheckCircle2 size={17} aria-hidden />
              Đã đặt lại mật khẩu. Gửi thông tin mới cho khách hàng.
            </p>
            <dl className="rounded-2xl bg-app/70 border border-panel/40 divide-y divide-panel/30 text-sm">
              <div className="flex justify-between gap-4 px-4 py-2.5">
                <dt className="text-ink-muted">Email</dt>
                <dd className="font-mono font-medium break-all">{resetResult.email}</dd>
              </div>
              <div className="flex justify-between gap-4 px-4 py-2.5">
                <dt className="text-ink-muted">Mật khẩu mới</dt>
                <dd className="font-mono font-medium">{resetResult.password}</dd>
              </div>
            </dl>
            <button
              type="button"
              onClick={() => {
                void navigator.clipboard.writeText(
                  `Email: ${resetResult.email}\nMật khẩu mới: ${resetResult.password}`,
                );
                setCopied(true);
              }}
              className="w-full inline-flex items-center justify-center gap-2 h-11 rounded-xl bg-accent-soft border border-accent/30 text-accent text-sm font-semibold cursor-pointer hover:bg-accent/20 transition-colors"
            >
              <Copy size={15} aria-hidden />
              {copied ? 'Đã copy!' : 'Copy thông tin'}
            </button>
            <p className="text-xs text-warning">Mật khẩu chỉ hiển thị một lần tại đây.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-ink-muted">
              Hệ thống sẽ sinh mật khẩu ngẫu nhiên mới cho tài khoản admin (owner) của công ty{' '}
              <span className="text-ink font-medium">{tenant.name}</span>. Mật khẩu cũ mất hiệu
              lực ngay lập tức.
            </p>
            {error && (
              <p role="alert" className="text-danger text-sm">
                {error}
              </p>
            )}
            <div className="flex gap-3">
              <button
                type="button"
                disabled={pending}
                onClick={() => void doReset()}
                className="flex-1 h-11 rounded-xl bg-accent font-semibold text-app text-sm cursor-pointer transition-shadow hover:shadow-[0_0_18px_rgba(0,238,255,0.4)] disabled:opacity-60"
              >
                {pending ? 'Đang đặt lại…' : 'Xác nhận đặt lại'}
              </button>
              <button
                type="button"
                onClick={closeReset}
                className="flex-1 h-11 rounded-xl bg-glass border border-panel/50 text-sm cursor-pointer hover:bg-glass-strong transition-colors"
              >
                Hủy
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
