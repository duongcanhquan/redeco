import { redirect } from 'next/navigation';
import { AppShell } from '@/components/layout/app-shell';
import { PlatformNav } from '@/components/platform/platform-nav';
import { getSessionClaims } from '@/lib/supabase/server';

export default async function PlatformLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const claims = await getSessionClaims();

  if (!claims?.isPlatformAdmin) {
    redirect('/login?error=forbidden');
  }

  return (
    <AppShell
      title="Optimake"
      subtitle="Quản trị nền tảng"
      renderNav={({ onNavigate }) => <PlatformNav onNavigate={onNavigate} />}
    >
      {children}
    </AppShell>
  );
}
