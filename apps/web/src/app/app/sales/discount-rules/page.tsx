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
    redirect(claims?.tenantSlug ? `/${claims.tenantSlug}/sales/quotations` : '/app');
  }
  const rules = await listDiscountRules();

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Percent className="text-accent" size={24} aria-hidden />
          Quy tắc chiết khấu / KM
        </h1>
        <p className="text-sm text-ink-muted mt-1">
          Rule thắng = ưu tiên số nhỏ hơn trong các rule khớp điều kiện (loại KH, tổng tiền, thời
          hạn…). Tự áp khi tạo báo giá.
        </p>
      </header>
      <DiscountRulesManager initial={rules} />
    </div>
  );
}
