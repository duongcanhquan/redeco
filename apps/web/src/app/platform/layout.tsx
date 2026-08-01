import {
  Boxes,
  Building2,
  LayoutDashboard,
  ScrollText,
  Settings2,
  UserRound,
} from 'lucide-react';
import { redirect } from 'next/navigation';
import { LogoMark } from '@/components/brand/logo';
import { createServerSupabase } from '@/lib/supabase/server';
import { NavLink } from '@/components/platform/nav-link';
import { SignOutButton } from '@/components/platform/sign-out-button';

const NAV_ITEMS = [
  { href: '/platform', label: 'Tổng quan', icon: LayoutDashboard },
  { href: '/platform/companies', label: 'Công ty', icon: Building2 },
  { href: '/platform/contracts', label: 'Hợp đồng', icon: ScrollText },
  { href: '/platform/modules', label: 'Module', icon: Boxes },
  { href: '/platform/settings', label: 'Tham số', icon: Settings2 },
  { href: '/platform/account', label: 'Tài khoản', icon: UserRound },
] as const;

export default async function PlatformLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.app_metadata['is_platform_admin'] !== true) {
    redirect('/login?error=forbidden');
  }

  return (
    <div className="flex min-h-dvh flex-col lg:flex-row bg-app">
      {/* Sidebar desktop / header mobile */}
      <aside className="glass lg:sticky lg:top-0 lg:h-dvh lg:w-64 lg:flex lg:flex-col shrink-0 border-b lg:border-b-0 lg:border-r border-panel/40 bg-app-deep/60">
        <div className="flex items-center gap-3 px-5 py-5">
          <LogoMark size={40} />
          <div>
            <p className="font-bold leading-tight tracking-wide">
              <span className="text-accent">O</span>ptimake
            </p>
            <p className="text-xs text-ink-muted">Quản trị nền tảng</p>
          </div>
        </div>

        <nav
          aria-label="Điều hướng quản trị"
          className="flex lg:flex-col gap-1.5 px-4 pb-4 overflow-x-auto lg:overflow-visible lg:flex-1"
        >
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
            <NavLink key={href} href={href} label={label} icon={<Icon size={18} aria-hidden />} />
          ))}
          <div className="hidden lg:block lg:mt-auto lg:pt-4 lg:border-t lg:border-panel/40">
            <SignOutButton />
          </div>
        </nav>
      </aside>

      <main className="flex-1 px-4 py-6 sm:px-6 lg:px-10 lg:py-8 max-w-7xl w-full mx-auto">
        {children}
      </main>
    </div>
  );
}
