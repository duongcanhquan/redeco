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
      <div className="glass rounded-2xl py-16 text-center">
        <AlertTriangle className="mx-auto text-warning" size={32} aria-hidden />
        <p className="mt-4 font-medium">Chưa có module nào được kích hoạt cho bạn</p>
        <p className="mt-1 text-sm text-ink-muted">
          Liên hệ quản trị công ty để được phân công module, hoặc kiểm tra hợp đồng còn hiệu lực.
        </p>
      </div>
    );
  }

  const data = await getSalesDashboardData(supabase, base);
  const revenueSum = data.revenue14d.reduce((s, p) => s + p.amount, 0);

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Tổng quan</h1>
        </div>
        <Link
          href={`${base}/sales`}
          className="inline-flex h-11 items-center gap-2 rounded-xl border border-accent/40 bg-accent-soft px-4 text-sm font-semibold text-accent hover:bg-accent/20 transition-colors"
        >
          <ShoppingCart size={16} aria-hidden />
          Hub Kinh doanh
          <ArrowRight size={14} aria-hidden />
        </Link>
      </header>

      <div className="grid grid-cols-2 lg:grid-cols-12 gap-3 sm:gap-4">
        <Link
          href={`${base}/sales/customers`}
          className="col-span-1 lg:col-span-3 glass glass-hover rounded-2xl p-4 min-h-28"
        >
          <p className="text-xs text-ink-muted flex items-center gap-1.5">
            <Users size={14} aria-hidden /> Khách hàng
          </p>
          <p className="mt-2 text-2xl font-bold tabular-nums">{data.kpis.activeCustomers}</p>
        </Link>
        <Link
          href={`${base}/sales/quotations`}
          className="col-span-1 lg:col-span-3 glass glass-hover rounded-2xl p-4 min-h-28"
        >
          <p className="text-xs text-ink-muted flex items-center gap-1.5">
            <FileText size={14} aria-hidden /> Báo giá chờ
          </p>
          <p
            className={`mt-2 text-2xl font-bold tabular-nums ${
              data.kpis.quotesPending > 0 ? 'text-warning' : ''
            }`}
          >
            {data.kpis.quotesPending}
          </p>
        </Link>
        <Link
          href={`${base}/sales/orders`}
          className="col-span-1 lg:col-span-3 glass glass-hover rounded-2xl p-4 min-h-28"
        >
          <p className="text-xs text-ink-muted flex items-center gap-1.5">
            <ScrollText size={14} aria-hidden /> Đơn đang chạy
          </p>
          <p className="mt-2 text-2xl font-bold tabular-nums">{data.kpis.ordersActive}</p>
        </Link>
        <Link
          href={`${base}/sales/invoices`}
          className="col-span-1 lg:col-span-3 glass glass-hover rounded-2xl p-4 min-h-28"
        >
          <p className="text-xs text-ink-muted flex items-center gap-1.5">
            <Wallet size={14} aria-hidden /> Công nợ
          </p>
          <p
            className={`mt-2 text-xl sm:text-2xl font-bold tabular-nums break-words ${
              data.kpis.unpaidTotal > 0 ? 'text-warning' : ''
            }`}
          >
            {formatMoney(data.kpis.unpaidTotal)}
          </p>
          {data.kpis.overdueCount > 0 && (
            <p className="text-[11px] text-danger mt-0.5">{data.kpis.overdueCount} quá hạn</p>
          )}
        </Link>

        <section className="col-span-2 lg:col-span-7 glass rounded-2xl p-4 sm:p-5">
          <div className="flex justify-between gap-2 mb-2">
            <h2 className="font-semibold text-sm">Hóa đơn 14 ngày</h2>
            <span className="text-sm font-bold text-accent tabular-nums">
              {formatMoney(revenueSum)}
            </span>
          </div>
          <BentoBarChart
            points={data.revenue14d.map((p) => ({ label: p.label, amount: p.amount }))}
            ariaLabel="Biểu đồ hóa đơn 14 ngày"
          />
        </section>

        <section className="col-span-2 lg:col-span-5 glass rounded-2xl p-4 sm:p-5">
          <h2 className="font-semibold text-sm mb-3">Pipeline đơn</h2>
          <BentoStackBars slices={data.pipeline} ariaLabel="Pipeline đơn hàng" />
        </section>
      </div>
    </div>
  );
}
