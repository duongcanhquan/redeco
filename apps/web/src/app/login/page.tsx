'use client';

import { Suspense, useEffect, useState, type FormEvent } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Building2 } from 'lucide-react';
import { Logo } from '@/components/brand/logo';
import { createClient } from '@/lib/supabase/client';

const RING_SEGMENTS = Array.from({ length: 50 }, (_, i) => i);
const REMEMBER_EMAIL_KEY = 'optimake.remember_email';

/** /{slug}/login -> slug công ty; /login (superadmin/chung) -> null */
function slugFromPath(pathname: string): string | null {
  const match = /^\/([a-z0-9]+(?:-[a-z0-9]+)*)\/login$/.exec(pathname);
  return match?.[1] ?? null;
}

function LoginForm() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const companySlug = slugFromPath(pathname);
  // undefined = đang tra cứu, null = tên miền không tồn tại, string = tên công ty
  const [companyName, setCompanyName] = useState<string | null | undefined>(undefined);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState<string | null>(
    searchParams.get('error') === 'forbidden'
      ? 'Tài khoản của bạn không có quyền truy cập khu vực này.'
      : null,
  );
  const [loading, setLoading] = useState(false);

  // Tự điền email đã ghi nhớ (sau frame đầu để không lệch với HTML prerender)
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const saved = localStorage.getItem(REMEMBER_EMAIL_KEY);
      if (saved) setEmail(saved);
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  // Trang login riêng của công ty: hiển thị tên công ty theo slug trên URL
  useEffect(() => {
    if (!companySlug) return;
    let cancelled = false;
    void createClient()
      .rpc('tenant_public_name', { p_slug: companySlug })
      .then(({ data }) => {
        if (cancelled) return;
        setCompanyName(typeof data === 'string' && data ? data : null);
      });
    return () => {
      cancelled = true;
    };
  }, [companySlug]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setError(null);
    setLoading(true);

    if (remember) {
      localStorage.setItem(REMEMBER_EMAIL_KEY, email);
    } else {
      localStorage.removeItem(REMEMBER_EMAIL_KEY);
    }

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
    const tenantId = data.user.app_metadata['tenant_id'];
    const slugClaim = data.user.app_metadata['tenant_slug'];
    const tenantSlug = typeof slugClaim === 'string' && slugClaim ? slugClaim : null;
    const next = searchParams.get('next');
    if (isPlatformAdmin) {
      router.replace(next?.startsWith('/platform') ? next : '/platform');
    } else if (typeof tenantId === 'string' && tenantId) {
      // Luôn về workspace dưới tên miền của công ty mình
      const home = tenantSlug ? `/${tenantSlug}` : '/app';
      router.replace(next?.startsWith(`${home}/`) || next === home ? next : home);
    } else {
      setLoading(false);
      setError('Tài khoản chưa được gán vào công ty nào. Liên hệ quản trị hệ thống.');
    }
  };

  return (
    <main className="min-h-dvh flex items-center justify-center overflow-hidden px-3 py-16 sm:py-20">
      <div className="flex w-full max-w-md flex-col items-center gap-5 sm:gap-6">
        {/* Brand Optimake — ngoài vòng tròn login */}
        <Logo markSize={48} textClassName="text-3xl sm:text-4xl tracking-tight" />

        <div className="login-scene">
          {RING_SEGMENTS.map((i) => (
            <span key={i} style={{ '--i': i } as React.CSSProperties} aria-hidden />
          ))}

          <div className="login-box">
            {companySlug && companyName !== null && (
              <p className="mb-2 flex items-center justify-center gap-1.5 px-2 text-center">
                <Building2 size={16} className="shrink-0 text-accent" aria-hidden />
                <span className="text-sm font-semibold leading-snug text-ink tracking-tight sm:text-base">
                  {companyName ?? companySlug}
                </span>
              </p>
            )}
            {companySlug && companyName === null && (
              <p
                role="alert"
                className="mb-2 rounded-lg border border-warning/30 bg-warning/10 px-2.5 py-1.5 text-center text-xs text-warning"
              >
                Không tìm thấy công ty “{companySlug}”. Kiểm tra lại địa chỉ hoặc liên hệ Optimake.
              </p>
            )}
            <h1 className="sr-only">
              {companySlug
                ? `Đăng nhập ${companyName ?? companySlug}`
                : 'Đăng nhập Optimake'}
            </h1>
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
                <p role="alert" className="-mt-1 mb-2 text-center text-xs text-danger sm:text-sm">
                  {error}
                </p>
              )}

              <div className="mb-3 flex items-center">
                <label className="flex min-h-10 cursor-pointer select-none items-center gap-2">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                    className="size-3.5 cursor-pointer rounded accent-accent"
                  />
                  <span className="text-xs text-ink-muted sm:text-sm">Ghi nhớ đăng nhập</span>
                </label>
              </div>

              <button type="submit" className="login-btn" disabled={loading}>
                {loading ? 'Đang đăng nhập…' : 'Đăng nhập'}
              </button>
            </form>
          </div>
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
