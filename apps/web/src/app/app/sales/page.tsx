import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  FileText,
  ScrollText,
  ShoppingCart,
  Users,
  Wallet,
} from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { BentoBarChart, BentoStackBars } from '@/components/sales/bento-charts';
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
      <div className="glass rounded-2xl py-16 text-center">
        <AlertTriangle className="mx-auto text-warning" size={32} aria-hidden />
        <p className="mt-4 font-medium">Chưa có quyền module Kinh doanh</p>
        <p className="mt-1 text-sm text-ink-muted">
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
    <div className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <ShoppingCart className="text-accent" size={22} aria-hidden />
          <h1 className="text-xl sm:text-2xl font-bold">Kinh doanh</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`${base}/sales/huong-dan`}
            className="inline-flex h-11 min-h-11 items-center gap-2 rounded-xl border border-accent/40 bg-accent-soft/40 px-4 text-sm font-semibold text-accent hover:bg-accent-soft transition-colors active:scale-[0.98]"
          >
            <BookOpen size={18} aria-hidden />
            HDSD
          </Link>
          <p className="text-xs text-ink-muted tabular-nums hidden sm:block">
            {new Date().toLocaleDateString('vi-VN', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
            })}
          </p>
        </div>
      </header>

      {/* Bento Nhật: lưới bất đối xứng, mỗi ô một việc */}
      <div className="grid grid-cols-2 lg:grid-cols-12 gap-3 sm:gap-4">
        {/* KPI dải trên */}
        <KpiTile
          className="col-span-1 lg:col-span-3"
          label="Khách hoạt động"
          value={String(kpis.activeCustomers)}
          href={`${base}/sales/customers`}
          icon={<Users size={18} aria-hidden />}
        />
        <KpiTile
          className="col-span-1 lg:col-span-3"
          label="Báo giá chờ"
          value={String(kpis.quotesPending)}
          href={`${base}/sales/quotations?status=sent`}
          icon={<FileText size={18} aria-hidden />}
          tone={kpis.quotesPending > 0 ? 'warning' : 'default'}
        />
        <KpiTile
          className="col-span-1 lg:col-span-3"
          label="Đơn đang chạy"
          value={String(kpis.ordersActive)}
          href={`${base}/sales/orders?status=confirmed`}
          icon={<ScrollText size={18} aria-hidden />}
          sub="Xem thêm tại pipeline"
        />
        <KpiTile
          className="col-span-1 lg:col-span-3"
          label="Công nợ phải thu"
          value={formatMoney(kpis.unpaidTotal)}
          href={`${base}/sales/invoices?status=unpaid`}
          icon={<Wallet size={18} aria-hidden />}
          tone={kpis.unpaidTotal > 0 ? 'warning' : 'default'}
          sub={
            kpis.overdueCount > 0
              ? `${kpis.unpaidCount} HĐ · ${kpis.overdueCount} quá hạn`
              : `${kpis.unpaidCount} hóa đơn`
          }
        />

        {/* Biểu đồ doanh thu hóa đơn 14 ngày — ô lớn */}
        <section className="col-span-2 lg:col-span-7 glass rounded-2xl p-4 sm:p-5 flex flex-col min-h-52">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div>
              <h2 className="font-semibold text-sm sm:text-base">Giá trị hóa đơn 14 ngày</h2>
              <p className="text-xs text-ink-muted mt-0.5">Tổng phát sinh theo ngày tạo HĐ</p>
            </div>
            <p className="text-right">
              <span className="block text-lg font-bold text-accent tabular-nums">
                {formatMoney(revenueSum)}
              </span>
              <span className="text-[11px] text-ink-muted">cộng dồn</span>
            </p>
          </div>
          <div className="flex-1 flex items-end">
            <BentoBarChart
              points={revenue14d.map((p) => ({ label: p.label, amount: p.amount }))}
              ariaLabel="Biểu đồ cột giá trị hóa đơn 14 ngày"
            />
          </div>
        </section>

        {/* Pipeline đơn hàng */}
        <section className="col-span-2 lg:col-span-5 glass rounded-2xl p-4 sm:p-5 min-h-52">
          <h2 className="font-semibold text-sm sm:text-base mb-1">Pipeline đơn hàng</h2>
          <p className="text-xs text-ink-muted mb-4">Phân bố trạng thái Sales Order</p>
          <BentoStackBars
            slices={pipeline}
            ariaLabel="Biểu đồ phân bố trạng thái đơn hàng"
          />
        </section>

        {/* Trạng thái báo giá */}
        <section className="col-span-2 lg:col-span-5 glass rounded-2xl p-4 sm:p-5">
          <h2 className="font-semibold text-sm sm:text-base mb-1">Phễu báo giá</h2>
          <p className="text-xs text-ink-muted mb-4">Từ nháp đến chuyển đơn</p>
          <BentoStackBars slices={quoteStatuses} ariaLabel="Phễu trạng thái báo giá" />
        </section>

        {/* Hàng đợi việc */}
        <section className="col-span-2 lg:col-span-7 glass rounded-2xl p-4 sm:p-5 space-y-4">
          <h2 className="font-semibold text-sm sm:text-base">Việc cần làm</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <QueueCol title="Chờ duyệt BG" items={queues.approvals} empty="Không có BG chờ" />
            <QueueCol title="Chờ xuất kho" items={queues.deliveries} empty="Không có lệnh chờ" />
            <QueueCol title="Công nợ mở" items={queues.debts} empty="Không có công nợ" />
          </div>
        </section>

        {/* Tồn thấp */}
        <section className="col-span-2 lg:col-span-5 glass rounded-2xl p-4 sm:p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="font-semibold text-sm sm:text-base">Tồn thấp (ATP ≤ 5)</h2>
              <p className="text-xs text-ink-muted">{kpis.lowStockCount} SKU cần chú ý</p>
            </div>
            <Link
              href={`${base}/sales/products`}
              className="text-xs text-accent hover:underline inline-flex items-center gap-1 min-h-11"
            >
              Kho <ArrowRight size={12} aria-hidden />
            </Link>
          </div>
          {lowStock.length === 0 ? (
            <p className="text-sm text-ink-muted py-6 text-center">Tồn ổn định.</p>
          ) : (
            <ul className="space-y-2">
              {lowStock.map((p) => (
                <li
                  key={p.sku}
                  className="flex items-center justify-between gap-2 rounded-xl bg-app/50 border border-panel/40 px-3 py-2 text-sm"
                >
                  <span className="min-w-0">
                    <span className="block font-medium truncate">{p.name}</span>
                    <span className="text-xs font-mono text-ink-muted">{p.sku}</span>
                  </span>
                  <span
                    className={`tabular-nums font-semibold ${
                      p.qty <= 0 ? 'text-danger' : 'text-warning'
                    }`}
                  >
                    {p.qty}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

      </div>
    </div>
  );
}

function KpiTile({
  className,
  label,
  value,
  href,
  icon,
  tone = 'default',
  sub,
}: {
  className?: string;
  label: string;
  value: string;
  href: string;
  icon: ReactNode;
  tone?: 'default' | 'warning';
  sub?: string;
}) {
  return (
    <Link
      href={href}
      className={`${className} glass glass-hover rounded-2xl p-4 flex flex-col justify-between min-h-28`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs sm:text-sm text-ink-muted leading-snug">{label}</p>
        <span
          className={`grid size-9 place-items-center rounded-lg border shrink-0 ${
            tone === 'warning'
              ? 'bg-warning/10 border-warning/30 text-warning'
              : 'bg-accent-soft border-accent/25 text-accent'
          }`}
        >
          {icon}
        </span>
      </div>
      <div>
        <p
          className={`mt-2 text-xl sm:text-2xl font-bold tabular-nums break-words ${
            tone === 'warning' ? 'text-warning' : 'text-ink'
          }`}
        >
          {value}
        </p>
        {sub && <p className="text-[11px] text-ink-muted mt-0.5">{sub}</p>}
      </div>
    </Link>
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
    <div className="rounded-xl border border-panel/40 bg-app/30 p-3 min-h-40">
      <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted mb-2">{title}</p>
      {items.length === 0 ? (
        <p className="text-xs text-ink-muted/80 py-4 text-center">{empty}</p>
      ) : (
        <ul className="space-y-2">
          {items.map((it) => (
            <li key={it.id}>
              <Link
                href={it.href}
                className="block rounded-lg px-2 py-1.5 hover:bg-glass-strong transition-colors min-h-11"
              >
                <span className="flex items-center justify-between gap-1">
                  <span className="font-mono text-[11px] text-accent">{it.code}</span>
                </span>
                <span className="block text-sm truncate">{it.title}</span>
                <span className="block text-[11px] text-ink-muted truncate">{it.meta}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
