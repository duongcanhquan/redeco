import { GitBranch } from 'lucide-react';
import { redirect } from 'next/navigation';
import { getSessionClaims } from '@/lib/supabase/server';
import { getTenantContext } from '@/services/sales-context';
import { listApprovalWorkflows } from '@/services/sales-config.service';
import { ApprovalsManager } from './approvals-manager';

export const dynamic = 'force-dynamic';

export default async function ApprovalsPage() {
  const [ctx, claims] = await Promise.all([getTenantContext(), getSessionClaims()]);
  if (ctx.role !== 'owner' && ctx.role !== 'admin') {
    redirect(claims?.tenantSlug ? `/${claims.tenantSlug}/sales` : '/app/sales');
  }
  const workflows = await listApprovalWorkflows();

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <GitBranch className="text-accent" size={24} aria-hidden />
          Quy trình duyệt báo giá (N cấp)
        </h1>
      </header>
      <ApprovalsManager initial={workflows} />
    </div>
  );
}
