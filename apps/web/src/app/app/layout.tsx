import { redirect } from 'next/navigation';
import { NavProgress } from '@/components/platform/nav-progress';
import { WorkspaceShell } from '@/components/workspace/workspace-shell';
import type { SidebarModuleItem } from '@/components/workspace/sidebar-nav';
import { getWorkspaceNavContext } from '@/services/module-access.service';

/** Module chưa có màn — chỉ hiện tên, gợi ý qua title. */
const MODULE_COMING_SOON: Record<string, string> = {
  'hanh-chinh': 'Đang thiết kế',
};

export default async function WorkspaceLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const nav = await getWorkspaceNavContext();
  if (!nav) {
    redirect('/login?error=forbidden');
  }

  const {
    base,
    companyName,
    isManager,
    rootModules,
    salesTabs,
    inventoryTabs,
    productionTabs,
    accountingTabs,
    hrTabs,
    equipmentTabs,
    hasAi,
  } = nav;
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
  if (hrTabs.length > 0) {
    modules.push({
      key: 'nhan-su',
      label: 'Nhân sự',
      href: '/hr',
      icon: 'hr',
      tabs: hrTabs,
    });
  }
  if (equipmentTabs.length > 0) {
    modules.push({
      key: 'thiet-bi',
      label: 'Thiết bị',
      href: '/equipment',
      icon: 'tb',
      tabs: equipmentTabs,
    });
  }
  if (hasAi) {
    modules.push({
      key: 'ai',
      label: 'Trợ lý AI',
      href: '/ai',
      icon: 'ai',
      tabs: [{ key: 'overview', label: 'Tổng quan', path: '/ai', matchPrefixes: ['/ai'] }],
    });
  }

  for (const m of rootModules) {
    // `ai` cấu hình qua Cài đặt — không hiện sidebar «sắp ra mắt»
    if (
      ['kinh-doanh', 'kho', 'san-xuat', 'ke-toan', 'nhan-su', 'thiet-bi', 'ai', 'customiz'].includes(
        m.key,
      )
    ) {
      continue;
    }
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
