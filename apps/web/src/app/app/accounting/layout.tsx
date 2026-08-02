import { redirect } from 'next/navigation';
import { HubRouteGuard } from '@/components/workspace/hub-route-guard';
import { getWorkspaceNavContext } from '@/services/module-access.service';

export default async function AccountingLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const nav = await getWorkspaceNavContext();
  if (!nav) redirect('/login?error=forbidden');
  if (nav.accountingTabs.length === 0) {
    redirect(nav.base);
  }

  return (
    <>
      <HubRouteGuard base={nav.base} tabs={nav.accountingTabs} />
      {children}
    </>
  );
}
