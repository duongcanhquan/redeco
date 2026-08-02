import { redirect } from 'next/navigation';
import { LogoMark } from '@/components/brand/logo';
import { NavProgress } from '@/components/platform/nav-progress';
import { SidebarNav, type SidebarModuleItem } from '@/components/workspace/sidebar-nav';
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
  const nav = await getWorkspaceNavContext();
  if (!nav) {
    redirect('/login?error=forbidden');
  }

  const { base, companyName, isManager, rootModules, salesTabs, inventoryTabs, productionTabs, accountingTabs } =
    nav;
  const slug = base.startsWith('/') && base !== '/app' ? base.slice(1) : null;

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

  return (
    <div className="flex min-h-dvh flex-col lg:flex-row bg-app">
      <NavProgress />
      <aside className="glass lg:sticky lg:top-0 lg:h-dvh lg:w-64 lg:flex lg:flex-col shrink-0 border-b lg:border-b-0 lg:border-r border-panel/40 bg-app-deep/60 no-print">
        <div className="flex items-center gap-3 px-5 py-5">
          <LogoMark size={40} />
          <div className="min-w-0">
            <p className="font-bold leading-tight tracking-wide truncate">{companyName}</p>
            <p className="text-xs text-ink-muted">
              <span className="text-accent">O</span>ptimake Workspace
            </p>
          </div>
        </div>

        <SidebarNav
          base={base}
          isManager={isManager}
          modules={modules}
          loginRedirect={slug ? `/${slug}/login` : '/login'}
        />
      </aside>

      <main className="flex-1 px-4 py-6 sm:px-6 lg:px-10 lg:py-8 max-w-7xl w-full mx-auto">
        {children}
      </main>
    </div>
  );
}
