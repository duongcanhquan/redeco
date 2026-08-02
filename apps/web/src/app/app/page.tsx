import {
  AlertTriangle,
  ArrowRight,
  FileText,
  ScrollText,
  ShoppingCart,
  Users,
  Wallet,
} from 'lucide-react';
import Link from 'next/link';
import { BentoBarChart, BentoStackBars } from '@/components/sales/bento-charts';
import { BentoPanel, KpiTile } from '@/components/ui/bento';
import { formatMoney } from '@/lib/format';
import { createServerSupabase, getSessionClaims } from '@/lib/supabase/server';
import { getSalesDashboardData } from '@/services/sales-analytics.service';
import { getMyRootModules } from '@/services/sales.service';

export const dynamic = 'force-dynamic';

export default async function WorkspaceDashboard() {
  const [supabase, claims] = await Promise.all([createServerSupabase(), getSessionClaims()]);
  const base = claims?.tenantSlug ? `/${claims.tenantSlug}` : '/app';
  const modules = await getMyRootModules(supabase);
  const hasSales = modules.some((m) => m.key === 'kinh-doanh');

  if (!hasSales) {
    return (
      <div className="glass rounded-3xl py-16 text-center">
        <AlertTriangle className="mx-auto text-warning" size={36} aria-hidden />
        <p className="mt-4 text-lg font-semibold">Chưa có module nào được kích hoạt cho bạn</p>
        <p className="mt-2 px-4 text-base text-ink-muted">
          Liên hệ quản trị công ty để được phân công module, hoặc kiểm tra hợp đồng còn hiệu lực.
        </p>
      </div>
    );
  }

  const data = await getSalesDashboardData(supabase, base);
  const revenueSum = data.revenue14d.reduce((s, p) => s + p.amount, 0);

  return (
    <div className="space-y-5 sm:space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">Tổng quan</h1>
          <p className="mt-1 text-base text-ink-muted">Nhấn vào từng ô để thao tác nhanh.</p>
        </div>
        <Link
          href={`${base}/sales`}
          className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-accent/40 bg-accent-soft px-5 text-base font-semibold text-accent transition-colors hover:bg-accent/20"
        >
          <ShoppingCart size={18} aria-hidden />
          Hub Kinh doanh
          <ArrowRight size={16} aria-hidden />
        </Link>
      </header>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-12">
        <KpiTile
          className="lg:col-span-3"
          label="Khách hàng"
          value={data.kpis.activeCustomers}
          href={`${base}/sales/customers`}
          icon={<Users size={22} aria-hidden />}
        />
        <KpiTile
          className="lg:col-span-3"
          label="Báo giá chờ"
          value={data.kpis.quotesPending}
          href={`${base}/sales/quotations`}
          icon={<FileText size={22} aria-hidden />}
          tone={data.kpis.quotesPending > 0 ? 'warning' : 'default'}
        />
        <KpiTile
          className="lg:col-span-3"
          label="Đơn đang chạy"
          value={data.kpis.ordersActive}
          href={`${base}/sales/orders`}
          icon={<ScrollText size={22} aria-hidden />}
        />
        <KpiTile
          className="lg:col-span-3"
          label="Công nợ"
          value={formatMoney(data.kpis.unpaidTotal)}
          href={`${base}/sales/invoices`}
          icon={<Wallet size={22} aria-hidden />}
          tone={data.kpis.unpaidTotal > 0 ? 'warning' : 'default'}
          sub={data.kpis.overdueCount > 0 ? `${data.kpis.overdueCount} quá hạn` : undefined}
        />

        <BentoPanel
          className="sm:col-span-2 lg:col-span-7"
          title="Hóa đơn 14 ngày"
          action={
            <span className="text-lg font-bold tabular-nums text-accent sm:text-xl">
              {formatMoney(revenueSum)}
            </span>
          }
        >
          <BentoBarChart
            points={data.revenue14d.map((p) => ({ label: p.label, amount: p.amount }))}
            ariaLabel="Biểu đồ hóa đơn 14 ngày"
          />
        </BentoPanel>

        <BentoPanel className="sm:col-span-2 lg:col-span-5" title="Pipeline đơn">
          <BentoStackBars slices={data.pipeline} ariaLabel="Pipeline đơn hàng" />
        </BentoPanel>
      </div>
    </div>
  );
}
