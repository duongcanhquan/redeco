import { Percent } from 'lucide-react';
import { redirect } from 'next/navigation';
import { getSessionClaims } from '@/lib/supabase/server';
import { getTenantContext } from '@/services/sales-context';
import { listDiscountRules } from '@/services/sales-config.service';
import { DiscountRulesManager } from './rules-manager';

export const dynamic = 'force-dynamic';

export default async function DiscountRulesPage() {
  const [ctx, claims] = await Promise.all([getTenantContext(), getSessionClaims()]);
  if (ctx.role !== 'owner' && ctx.role !== 'admin') {
    redirect(claims?.tenantSlug ? `/${claims.tenantSlug}/sales` : '/app/sales');
  }
  const rules = await listDiscountRules();

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Percent className="text-accent" size={24} aria-hidden />
          Quy tắc chiết khấu / KM
        </h1>
      </header>
      <DiscountRulesManager initial={rules} />
    </div>
  );
}
