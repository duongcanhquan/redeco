import { redirect } from 'next/navigation';
import { NavProgress } from '@/components/platform/nav-progress';
import { WorkspaceShell } from '@/components/workspace/workspace-shell';
import type { SidebarModuleItem } from '@/components/workspace/sidebar-nav';
import { getWorkspaceNavContext } from '@/services/module-access.service';

/** Module chưa có màn — chỉ hiện tên, gợi ý qua title. */
const MODULE_COMING_SOON: Record<string, string> = {
  'nhan-su': 'Đang thiết kế',
  'hanh-chinh': 'Đang thiết kế',
  'thiet-bi': 'Đang thiết kế',
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
    // `ai` cấu hình qua Cài đặt — không hiện sidebar «sắp ra mắt»
    if (['kinh-doanh', 'kho', 'san-xuat', 'ke-toan', 'ai'].includes(m.key)) continue;
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
    <>
      <NavProgress />
      <WorkspaceShell
        companyName={companyName}
        base={base}
        isManager={isManager}
        modules={modules}
        loginRedirect={slug ? `/${slug}/login` : '/login'}
      >
        {children}
      </WorkspaceShell>
    </>
  );
}
