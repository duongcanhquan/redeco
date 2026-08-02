import { redirect } from 'next/navigation';
import { AppShell } from '@/components/layout/app-shell';
import { SidebarNav, type SidebarModuleItem } from '@/components/workspace/sidebar-nav';
import { createServerSupabase, getSessionClaims } from '@/lib/supabase/server';
import { getWorkspaceNavContext } from '@/services/module-access.service';

/** Gợi ý phân hệ chưa có màn hình */
const MODULE_COMING_SOON: Record<string, string> = {
  'nhan-su': 'Hồ sơ · chấm công — đang thiết kế',
  'hanh-chinh': 'Văn bản · tài sản — đang thiết kế',
  'thiet-bi': 'Máy móc · bảo trì — đang thiết kế',
};

export default async function WorkspaceLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const [claims, nav] = await Promise.all([getSessionClaims(), getWorkspaceNavContext()]);
  if (!claims?.tenantId || !nav) {
    redirect('/login?error=forbidden');
  }

  const supabase = await createServerSupabase();
  const { data: tenant } = await supabase
    .from('tenants')
    .select('name, slug')
    .eq('id', claims.tenantId)
    .single();

  const slug = claims.tenantSlug ?? (tenant as { slug?: string } | null)?.slug ?? null;
  const { base, isManager, rootModules, salesTabs, inventoryTabs, productionTabs, accountingTabs } =
    nav;

  const modules: SidebarModuleItem[] = [];
  if (salesTabs.length > 0) {
    modules.push({
      key: 'kinh-doanh',
      label: 'Kinh doanh',
      href: '/sales',
      icon: 'sales',
      tabs: salesTabs,
    });
  }
  if (inventoryTabs.length > 0) {
    modules.push({
      key: 'kho',
      label: 'Kho',
      href: '/inventory',
      icon: 'kho',
      tabs: inventoryTabs,
    });
  }
  if (productionTabs.length > 0) {
    modules.push({
      key: 'san-xuat',
      label: 'Sản xuất',
      href: '/production',
      icon: 'sx',
      tabs: productionTabs,
    });
  }
  if (accountingTabs.length > 0) {
    modules.push({
      key: 'ke-toan',
      label: 'Kế toán',
      href: '/accounting',
      icon: 'kt',
      tabs: accountingTabs,
    });
  }

  for (const m of rootModules) {
    if (['kinh-doanh', 'kho', 'san-xuat', 'ke-toan'].includes(m.key)) continue;
    const hint = MODULE_COMING_SOON[m.key];
    if (hint) {
      modules.push({
        key: m.key,
        label: m.name,
        href: '#',
        icon: 'other',
        tabs: [],
        comingSoonHint: hint,
      });
    }
  }

  const companyName = (tenant as { name: string } | null)?.name ?? 'Công ty';
  const loginRedirect = slug ? `/${slug}/login` : '/login';

  return (
    <AppShell
      title={companyName}
      subtitle={
        <>
          <span className="text-accent">O</span>ptimake Workspace
        </>
      }
      renderNav={({ onNavigate }) => (
        <SidebarNav
          base={base}
          isManager={isManager}
          modules={modules}
          loginRedirect={loginRedirect}
          onNavigate={onNavigate}
        />
      )}
    >
      {children}
    </AppShell>
  );
}
