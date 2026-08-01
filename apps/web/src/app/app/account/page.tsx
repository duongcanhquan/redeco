'use client';

import { CheckCircle2, KeyRound, UserRound } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { createClient } from '@/lib/supabase/client';
import { SignOutButton } from '@/components/platform/sign-out-button';

export default function WorkspaceAccountPage() {
  const [email, setEmail] = useState<string>('');
  const [fullName, setFullName] = useState<string>('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'ok' | 'error'; text: string } | null>(null);

  useEffect(() => {
    void createClient()
      .auth.getUser()
      .then(({ data }) => {
        setEmail(data.user?.email ?? '');
        const name = data.user?.user_metadata['full_name'];
        setFullName(typeof name === 'string' ? name : '');
      });
  }, []);

  const handleChangePassword = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setMessage(null);

    if (password.length < 6) {
      setMessage({ type: 'error', text: 'Mật khẩu mới phải có ít nhất 6 ký tự.' });
      return;
    }
    if (password !== confirm) {
      setMessage({ type: 'error', text: 'Xác nhận mật khẩu không khớp. Vui lòng nhập lại.' });
      return;
    }

    setSaving(true);
    const { error } = await createClient().auth.updateUser({ password });
    setSaving(false);

    if (error) {
      setMessage({ type: 'error', text: `Đổi mật khẩu thất bại: ${error.message}` });
      return;
    }
    setPassword('');
    setConfirm('');
    setMessage({ type: 'ok', text: 'Đã đổi mật khẩu thành công.' });
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <header>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <UserRound className="text-accent" size={24} aria-hidden />
          Tài khoản
        </h1>
      </header>

      <section className="glass rounded-2xl p-5 flex items-center gap-4">
        <span className="grid size-12 place-items-center rounded-2xl bg-accent-soft border border-accent/30 text-accent">
          <UserRound size={24} aria-hidden />
        </span>
        <div>
          <p className="font-semibold">{fullName || email || '…'}</p>
          <p className="text-sm text-ink-muted">{email}</p>
        </div>
      </section>

      <section className="glass rounded-2xl p-5">
        <h2 className="font-semibold flex items-center gap-2 mb-4">
          <KeyRound size={18} className="text-accent" aria-hidden />
          Đổi mật khẩu
        </h2>
        <form onSubmit={(e) => void handleChangePassword(e)} className="space-y-4">
          <div>
            <label htmlFor="new-password" className="block text-sm text-ink-muted mb-1.5">
              Mật khẩu mới <span className="text-danger">*</span>
            </label>
            <input
              id="new-password"
              type="password"
              autoComplete="new-password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full h-12 rounded-xl bg-app-deep/60 border border-panel/60 px-4 text-ink outline-none transition-colors focus:border-accent focus-visible:outline-2 focus-visible:outline-accent"
            />
            <p className="mt-1 text-xs text-ink-muted">Ít nhất 6 ký tự.</p>
          </div>
          <div>
            <label htmlFor="confirm-password" className="block text-sm text-ink-muted mb-1.5">
              Nhập lại mật khẩu mới <span className="text-danger">*</span>
            </label>
            <input
              id="confirm-password"
              type="password"
              autoComplete="new-password"
              required
              minLength={6}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="w-full h-12 rounded-xl bg-app-deep/60 border border-panel/60 px-4 text-ink outline-none transition-colors focus:border-accent focus-visible:outline-2 focus-visible:outline-accent"
            />
          </div>

          {message && (
            <p
              role="alert"
              className={`flex items-center gap-2 text-sm ${
                message.type === 'ok' ? 'text-success' : 'text-danger'
              }`}
            >
              {message.type === 'ok' && <CheckCircle2 size={16} aria-hidden />}
              {message.text}
            </p>
          )}

          <button
            type="submit"
            disabled={saving}
            className="h-12 w-full sm:w-auto rounded-xl bg-accent px-6 font-semibold text-app cursor-pointer transition-shadow hover:shadow-[0_0_18px_rgba(0,238,255,0.4)] disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {saving ? 'Đang lưu…' : 'Cập nhật mật khẩu'}
          </button>
        </form>
      </section>

      <section className="glass rounded-2xl p-5 lg:hidden">
        <SignOutButton />
      </section>
    </div>
  );
}
