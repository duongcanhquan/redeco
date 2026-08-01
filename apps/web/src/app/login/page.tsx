'use client';

import { Suspense, useState, type FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

const RING_SEGMENTS = Array.from({ length: 50 }, (_, i) => i);

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(
    searchParams.get('error') === 'forbidden'
      ? 'Tài khoản của bạn không có quyền truy cập khu vực này.'
      : null,
  );
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setLoading(false);
      setError(
        signInError.message === 'Invalid login credentials'
          ? 'Email hoặc mật khẩu không đúng.'
          : `Đăng nhập thất bại: ${signInError.message}`,
      );
      return;
    }

    const isPlatformAdmin = data.user.app_metadata['is_platform_admin'] === true;
    const next = searchParams.get('next');
    if (isPlatformAdmin) {
      router.replace(next?.startsWith('/platform') ? next : '/platform');
    } else {
      // Người dùng công ty: workspace theo subdomain sẽ mở ở phase sau
      setLoading(false);
      setError('Tài khoản hợp lệ nhưng khu làm việc công ty đang được xây dựng.');
    }
  };

  return (
    <main className="min-h-dvh flex items-center justify-center overflow-hidden py-24">
      <div className="login-scene">
        {RING_SEGMENTS.map((i) => (
          <span key={i} style={{ '--i': i } as React.CSSProperties} aria-hidden />
        ))}

        <div className="login-box">
          <h1 className="login-title">Đăng nhập</h1>
          <form onSubmit={(e) => void handleSubmit(e)} noValidate>
            <div className="input-box">
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <label htmlFor="email">Email</label>
            </div>
            <div className="input-box">
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <label htmlFor="password">Mật khẩu</label>
            </div>

            {error && (
              <p role="alert" className="text-danger text-sm text-center -mt-2 mb-3">
                {error}
              </p>
            )}

            <div className="text-center -mt-1 mb-3">
              <a
                href="mailto:superadmin@gmail.com?subject=Quên mật khẩu REDECO"
                className="text-ink-muted text-sm hover:underline"
              >
                Quên mật khẩu?
              </a>
            </div>

            <button type="submit" className="login-btn" disabled={loading}>
              {loading ? 'Đang đăng nhập…' : 'Đăng nhập'}
            </button>

            <div className="text-center mt-5 mb-3">
              <span className="text-ink-muted text-sm">Chưa có tài khoản? </span>
              <a href="mailto:superadmin@gmail.com" className="text-accent text-sm font-semibold hover:underline">
                Liên hệ quản trị
              </a>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
