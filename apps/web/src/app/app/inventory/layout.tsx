import { redirect } from 'next/navigation';
import { HubRouteGuard } from '@/components/workspace/hub-route-guard';
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
    <>
      <HubRouteGuard base={nav.base} tabs={nav.inventoryTabs} />
      {children}
    </>
  );
}
