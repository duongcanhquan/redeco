import { redirect } from 'next/navigation';
import { HubTabBar } from '@/components/workspace/hub-tab-bar';
import { getWorkspaceNavContext } from '@/services/module-access.service';

export default async function InventoryLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const nav = await getWorkspaceNavContext();
  if (!nav) redirect('/login?error=forbidden');
  if (nav.inventoryTabs.length === 0) {
    redirect(nav.base);
  }

  return (
    <div className="space-y-4">
      <HubTabBar base={nav.base} tabs={nav.inventoryTabs} />
      {children}
    </div>
  );
}
