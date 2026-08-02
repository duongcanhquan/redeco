import { HubTabBar } from '@/components/workspace/hub-tab-bar';
import { getWorkspaceNavContext } from '@/services/module-access.service';

export default async function SalesLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const nav = await getWorkspaceNavContext();
  if (!nav || nav.salesTabs.length === 0) {
    return <>{children}</>;
  }

  return (
    <div className="space-y-4">
      <HubTabBar base={nav.base} tabs={nav.salesTabs} />
      {children}
    </div>
  );
}
