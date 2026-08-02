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

export default async function SalesHubPage() {
  const [supabase, claims] = await Promise.all([createServerSupabase(), getSessionClaims()]);
  const base = claims?.tenantSlug ? `/${claims.tenantSlug}` : '/app';
  const modules = await getMyRootModules(supabase);
  const hasSales = modules.some((m) => m.key === 'kinh-doanh');

  if (!hasSales) {
    return (
      <div className="glass rounded-3xl py-16 text-center">
        <AlertTriangle className="mx-auto text-warning" size={36} aria-hidden />
        <p className="mt-4 text-lg font-semibold">Chưa có quyền module Kinh doanh</p>
        <p className="mt-2 px-4 text-base text-ink-muted">
          Liên hệ quản trị công ty để được phân công module.
        </p>
      </div>
    );
  }

  const data = await getSalesDashboardData(supabase, base);
  const { kpis, revenue14d, queues, lowStock } = data;
  const revenueSum = revenue14d.reduce((s, p) => s + p.amount, 0);
  const pipeline = data.pipeline.map((s) => ({
    ...s,
    href: `${base}/sales/orders?status=${s.key}`,
  }));
  const quoteStatuses = data.quoteStatuses.map((s) => ({
    ...s,
    href: `${base}/sales/quotations?status=${s.key}`,
  }));

  return (
    <div className="space-y-5 sm:space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <ShoppingCart className="text-accent" size={28} aria-hidden />
          <h1 className="text-2xl font-bold sm:text-3xl">Kinh doanh</h1>
        </div>
        <p className="text-sm text-ink-muted tabular-nums">
          {new Date().toLocaleDateString('vi-VN', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
          })}
        </p>
      </header>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-12">
        <KpiTile
          className="lg:col-span-3"
          label="Khách hoạt động"
          value={String(kpis.activeCustomers)}
          href={`${base}/sales/customers`}
          icon={<Users size={22} aria-hidden />}
        />
        <KpiTile
          className="lg:col-span-3"
          label="Báo giá chờ"
          value={String(kpis.quotesPending)}
          href={`${base}/sales/quotations?status=sent`}
          icon={<FileText size={22} aria-hidden />}
          tone={kpis.quotesPending > 0 ? 'warning' : 'default'}
        />
        <KpiTile
          className="lg:col-span-3"
          label="Đơn đang chạy"
          value={String(kpis.ordersActive)}
          href={`${base}/sales/orders?status=confirmed`}
          icon={<ScrollText size={22} aria-hidden />}
          sub="Xem thêm tại pipeline"
        />
        <KpiTile
          className="lg:col-span-3"
          label="Công nợ phải thu"
          value={formatMoney(kpis.unpaidTotal)}
          href={`${base}/sales/invoices?status=unpaid`}
          icon={<Wallet size={22} aria-hidden />}
          tone={kpis.unpaidTotal > 0 ? 'warning' : 'default'}
          sub={
            kpis.overdueCount > 0
              ? `${kpis.unpaidCount} HĐ · ${kpis.overdueCount} quá hạn`
              : `${kpis.unpaidCount} hóa đơn`
          }
        />

        <BentoPanel
          className="sm:col-span-2 lg:col-span-7"
          title="Giá trị hóa đơn 14 ngày"
          description="Tổng phát sinh theo ngày tạo HĐ"
          action={
            <p className="text-right">
              <span className="block text-xl font-bold tabular-nums text-accent sm:text-2xl">
                {formatMoney(revenueSum)}
              </span>
              <span className="text-sm text-ink-muted">cộng dồn</span>
            </p>
          }
        >
          <BentoBarChart
            points={revenue14d.map((p) => ({ label: p.label, amount: p.amount }))}
            ariaLabel="Biểu đồ cột giá trị hóa đơn 14 ngày"
          />
        </BentoPanel>

        <BentoPanel
          className="sm:col-span-2 lg:col-span-5"
          title="Pipeline đơn hàng"
          description="Phân bố trạng thái Sales Order"
        >
          <BentoStackBars slices={pipeline} ariaLabel="Biểu đồ phân bố trạng thái đơn hàng" />
        </BentoPanel>

        <BentoPanel
          className="sm:col-span-2 lg:col-span-5"
          title="Phễu báo giá"
          description="Từ nháp đến chuyển đơn"
        >
          <BentoStackBars slices={quoteStatuses} ariaLabel="Phễu trạng thái báo giá" />
        </BentoPanel>

        <BentoPanel className="sm:col-span-2 lg:col-span-7" title="Việc cần làm">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <QueueCol title="Chờ duyệt BG" items={queues.approvals} empty="Không có BG chờ" />
            <QueueCol title="Chờ xuất kho" items={queues.deliveries} empty="Không có lệnh chờ" />
            <QueueCol title="Công nợ mở" items={queues.debts} empty="Không có công nợ" />
          </div>
        </BentoPanel>

        <BentoPanel
          className="sm:col-span-2 lg:col-span-5"
          title="Tồn thấp (ATP ≤ 5)"
          description={`${kpis.lowStockCount} SKU cần chú ý`}
          action={
            <Link
              href={`${base}/sales/products`}
              className="inline-flex min-h-11 items-center gap-1 text-sm font-medium text-accent hover:underline"
            >
              Kho <ArrowRight size={14} aria-hidden />
            </Link>
          }
        >
          {lowStock.length === 0 ? (
            <p className="py-8 text-center text-base text-ink-muted">Tồn ổn định.</p>
          ) : (
            <ul className="space-y-2.5">
              {lowStock.map((p) => (
                <li
                  key={p.sku}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-panel/40 bg-app/50 px-4 py-3"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-base font-semibold">{p.name}</span>
                    <span className="font-mono text-sm text-ink-muted">{p.sku}</span>
                  </span>
                  <span
                    className={`text-xl font-bold tabular-nums ${
                      p.qty <= 0 ? 'text-danger' : 'text-warning'
                    }`}
                  >
                    {p.qty}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </BentoPanel>
      </div>
    </div>
  );
}

function QueueCol({
  title,
  items,
  empty,
}: {
  title: string;
  items: { id: string; code: string; title: string; meta: string; href: string; tone: string }[];
  empty: string;
}) {
  return (
    <div className="min-h-44 rounded-2xl border border-panel/40 bg-app/30 p-4">
      <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-muted">{title}</p>
      {items.length === 0 ? (
        <p className="py-6 text-center text-sm text-ink-muted/80">{empty}</p>
      ) : (
        <ul className="space-y-2">
          {items.map((it) => (
            <li key={it.id}>
              <Link
                href={it.href}
                className="block min-h-14 rounded-xl px-3 py-2.5 transition-colors hover:bg-glass-strong"
              >
                <span className="font-mono text-sm text-accent">{it.code}</span>
                <span className="mt-0.5 block truncate text-base font-medium">{it.title}</span>
                <span className="block truncate text-sm text-ink-muted">{it.meta}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
