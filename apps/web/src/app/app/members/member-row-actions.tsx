'use client';

import { Copy, KeyRound, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Modal } from '@/components/platform/modal';
import { removeMemberAction, resetMemberPasswordAction } from './actions';

function randomPassword(): string {
  const alphabet = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789';
  const bytes = new Uint32Array(10);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('');
}

const btn =
  'inline-flex items-center gap-1.5 h-8 rounded-lg border px-2.5 text-xs font-medium transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed';

export function MemberRowActions({
  userId,
  memberName,
}: {
  userId: string;
  memberName: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState<string | null>(null);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [copied, setCopied] = useState(false);

  const resetPassword = async (): Promise<void> => {
    setBusy(true);
    setError(null);
    const password = randomPassword();
    const result = await resetMemberPasswordAction(userId, password);
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setCopied(false);
    setNewPassword(password);
  };

  const remove = async (): Promise<void> => {
    setBusy(true);
    setError(null);
    const result = await removeMemberAction(userId);
    setBusy(false);
    setConfirmRemove(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.refresh();
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center justify-end gap-1.5 flex-wrap">
        <button
          type="button"
          disabled={busy}
          onClick={() => void resetPassword()}
          className={`${btn} border-panel/60 text-ink-muted hover:text-ink hover:bg-glass-strong`}
        >
          <KeyRound size={13} aria-hidden />
          Reset mật khẩu
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => setConfirmRemove(true)}
          className={`${btn} border-danger/40 text-danger hover:bg-danger/10`}
        >
          <Trash2 size={13} aria-hidden />
          Xóa
        </button>
      </div>
      {error && (
        <p role="alert" className="text-xs text-danger max-w-56 text-right">
          {error}
        </p>
      )}

      <Modal
        title={`Mật khẩu mới — ${memberName}`}
        icon={<KeyRound size={18} className="text-accent" aria-hidden />}
        open={newPassword !== null}
        onClose={() => setNewPassword(null)}
      >
        <div className="space-y-4">
          <p className="text-sm text-ink-muted">
            Gửi mật khẩu mới này cho thành viên (chỉ hiển thị một lần).
          </p>
          <p className="rounded-xl bg-app/70 border border-panel/40 px-4 py-3 font-mono font-semibold text-center break-all">
            {newPassword}
          </p>
          <button
            type="button"
            onClick={() => {
              if (newPassword) void navigator.clipboard.writeText(newPassword);
              setCopied(true);
            }}
            className="w-full inline-flex items-center justify-center gap-2 h-11 rounded-xl bg-accent-soft border border-accent/30 text-accent text-sm font-semibold cursor-pointer hover:bg-accent/20 transition-colors"
          >
            <Copy size={15} aria-hidden />
            {copied ? 'Đã copy!' : 'Copy mật khẩu'}
          </button>
        </div>
      </Modal>

      <Modal
        title="Xóa thành viên?"
        icon={<Trash2 size={18} className="text-danger" aria-hidden />}
        open={confirmRemove}
        onClose={() => setConfirmRemove(false)}
      >
        <div className="space-y-4">
          <p className="text-sm text-ink-muted">
            Tài khoản của <strong className="text-ink">{memberName}</strong> sẽ bị xóa vĩnh viễn và
            không đăng nhập được nữa. Dữ liệu nghiệp vụ (báo giá, đơn hàng…) vẫn giữ nguyên.
          </p>
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setConfirmRemove(false)}
              className="h-11 rounded-xl border border-panel/60 px-4 text-sm text-ink-muted hover:text-ink hover:bg-glass-strong transition-colors cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void remove()}
              className="h-11 rounded-xl bg-danger px-5 text-sm font-semibold text-white cursor-pointer hover:opacity-90 transition-opacity disabled:opacity-60"
            >
              {busy ? 'Đang xóa…' : 'Xóa vĩnh viễn'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
