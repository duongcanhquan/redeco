import { HubTabBar } from '@/components/workspace/hub-tab-bar';
import { getWorkspaceNavContext } from '@/services/module-access.service';

export default async function AccountingLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const nav = await getWorkspaceNavContext();
  if (!nav || nav.accountingTabs.length === 0) {
    return <>{children}</>;
  }

  return (
    <div className="space-y-4">
      <HubTabBar base={nav.base} tabs={nav.accountingTabs} />
      {children}
    </div>
  );
}
