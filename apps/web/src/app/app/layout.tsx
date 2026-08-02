import {
  Boxes,
  FileText,
  GitBranch,
  LayoutDashboard,
  Package,
  Percent,
  ScrollText,
  Settings,
  Truck,
  UserCog,
  UserRound,
  Users,
} from 'lucide-react';
import { redirect } from 'next/navigation';
import { LogoMark } from '@/components/brand/logo';
import { NavLink } from '@/components/platform/nav-link';
import { SignOutButton } from '@/components/platform/sign-out-button';
import { createServerSupabase, getSessionClaims } from '@/lib/supabase/server';
import { getMyRootModules } from '@/services/sales.service';

// Route UI đã có cho từng module key (các module khác hiện "sắp ra mắt")
const SALES_LINKS = [
  { path: '/sales/customers', label: 'Khách hàng', icon: Users },
  { path: '/sales/products', label: 'Sản phẩm & kho', icon: Package },
  { path: '/sales/quotations', label: 'Báo giá', icon: FileText },
  { path: '/sales/orders', label: 'Đơn hàng', icon: ScrollText },
  { path: '/sales/deliveries', label: 'Giao hàng', icon: Truck },
  { path: '/sales/invoices', label: 'Hóa đơn', icon: FileText },
] as const;

const SALES_CONFIG_LINKS = [
  { path: '/sales/discount-rules', label: 'Chiết khấu / KM', icon: Percent },
  { path: '/sales/approvals', label: 'Quy trình duyệt', icon: GitBranch },
] as const;

export default async function WorkspaceLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const [supabase, claims] = await Promise.all([createServerSupabase(), getSessionClaims()]);
  if (!claims?.tenantId) {
    redirect('/login?error=forbidden');
  }

  const [{ data: tenant }, { data: profile }, modules] = await Promise.all([
    supabase.from('tenants').select('name, slug').eq('id', claims.tenantId).single(),
    supabase.from('user_profiles').select('role').eq('id', claims.userId).single(),
    getMyRootModules(supabase),
  ]);
  const role = (profile as { role?: string } | null)?.role ?? 'member';
  const isManager = role === 'owner' || role === 'admin';
  const hasSales = modules.some((m) => m.key === 'kinh-doanh');
  const otherModules = modules.filter((m) => m.key !== 'kinh-doanh');

  // Mọi URL workspace nằm dưới tên miền công ty: /{slug}/...
  const slug = claims.tenantSlug ?? (tenant as { slug?: string } | null)?.slug ?? null;
  const base = slug ? `/${slug}` : '/app';

  return (
    <div className="flex min-h-dvh flex-col lg:flex-row bg-app">
      <aside className="glass lg:sticky lg:top-0 lg:h-dvh lg:w-64 lg:flex lg:flex-col shrink-0 border-b lg:border-b-0 lg:border-r border-panel/40 bg-app-deep/60">
        <div className="flex items-center gap-3 px-5 py-5">
          <LogoMark size={40} />
          <div className="min-w-0">
            <p className="font-bold leading-tight tracking-wide truncate">
              {(tenant as { name: string } | null)?.name ?? 'Công ty'}
            </p>
            <p className="text-xs text-ink-muted">
              <span className="text-accent">O</span>ptimake Workspace
            </p>
          </div>
        </div>

        <nav
          aria-label="Điều hướng workspace"
          className="flex lg:flex-col gap-1.5 px-4 pb-4 overflow-x-auto lg:overflow-visible lg:flex-1"
        >
          <NavLink href={base} exact label="Tổng quan" icon={<LayoutDashboard size={18} aria-hidden />} />

          {hasSales && (
            <>
              <p className="hidden lg:block px-3 pt-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
                Kinh doanh
              </p>
              {SALES_LINKS.map(({ path, label, icon: Icon }) => (
                <NavLink
                  key={path}
                  href={`${base}${path}`}
                  label={label}
                  icon={<Icon size={18} aria-hidden />}
                />
              ))}
              {isManager &&
                SALES_CONFIG_LINKS.map(({ path, label, icon: Icon }) => (
                  <NavLink
                    key={path}
                    href={`${base}${path}`}
                    label={label}
                    icon={<Icon size={18} aria-hidden />}
                  />
                ))}
            </>
          )}

          {otherModules.length > 0 && (
            <>
              <p className="hidden lg:block px-3 pt-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
                Module khác
              </p>
              {otherModules.map((m) => (
                <span
                  key={m.id}
                  title="Sắp ra mắt"
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-ink-muted/60 whitespace-nowrap cursor-not-allowed"
                >
                  <Boxes size={18} aria-hidden />
                  <span>{m.name}</span>
                </span>
              ))}
            </>
          )}

          <p className="hidden lg:block px-3 pt-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
            Công ty
          </p>
          {isManager && (
            <NavLink href={`${base}/members`} label="Thành viên" icon={<UserCog size={18} aria-hidden />} />
          )}
          <NavLink href={`${base}/settings`} label="Cài đặt" icon={<Settings size={18} aria-hidden />} />
          <NavLink href={`${base}/account`} label="Tài khoản" icon={<UserRound size={18} aria-hidden />} />

          <div className="hidden lg:block lg:mt-auto lg:pt-4 lg:border-t lg:border-panel/40">
            {/* Đăng xuất LUÔN quay về trang login của chính công ty */}
            <SignOutButton redirectTo={slug ? `/${slug}/login` : '/login'} />
          </div>
        </nav>
      </aside>

      <main className="flex-1 px-4 py-6 sm:px-6 lg:px-10 lg:py-8 max-w-7xl w-full mx-auto">
        {children}
      </main>
    </div>
  );
}
