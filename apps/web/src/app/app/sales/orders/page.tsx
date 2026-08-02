import { ScrollText, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { createServerSupabase, getSessionClaims } from '@/lib/supabase/server';
import { formatDate, formatMoney } from '@/lib/format';
import { DocSearchBar } from '@/components/sales/doc-search';
import { DocCard, ResponsiveDocList } from '@/components/sales/responsive-doc-list';
import { StatusFilterBar } from '@/components/sales/status-filter';
import { listCustomers, listProducts, listSalesOrders } from '@/services/sales.service';
import { getSalesSettings } from '@/services/tenant-settings.service';
import { OrderDialog } from './order-dialog';
import { OrderRowActions } from './order-row-actions';

export const dynamic = 'force-dynamic';

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  draft: { label: 'Nháp', cls: 'bg-glass-strong border-panel/50 text-ink-muted' },
  confirmed: { label: 'Đã xác nhận', cls: 'bg-success/10 border-success/30 text-success' },
  delivering: { label: 'Đang giao', cls: 'bg-accent-soft border-accent/25 text-accent' },
  completed: { label: 'Hoàn tất', cls: 'bg-success/10 border-success/30 text-success' },
  cancelled: { label: 'Đã hủy', cls: 'bg-danger/10 border-danger/30 text-danger' },
};

const FILTER_OPTIONS = Object.entries(STATUS_BADGE).map(([key, v]) => ({
  key,
  label: v.label,
}));

export default async function SalesOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  const { status: rawStatus, q: rawQ } = await searchParams;
  const statusFilter =
    rawStatus && rawStatus in STATUS_BADGE ? rawStatus : null;
  const q = (rawQ ?? '').trim().toLowerCase();

  const [supabase, claims] = await Promise.all([
    createServerSupabase(),
    getSessionClaims(),
  ]);
  const base = claims?.tenantSlug ? `/${claims.tenantSlug}` : '/app';

  const [orders, customers, products, salesSettings] = await Promise.all([
    listSalesOrders(supabase),
    listCustomers(supabase),
    listProducts(supabase),
    getSalesSettings(),
  ]);
  const money = (n: number) => formatMoney(n, salesSettings.currencyLabel);
  const activeProducts = products
    .filter((p) => p.is_active)
    .map((p) => ({
      id: p.id,
      sku: p.sku,
      name: p.name,
      uom: p.uom,
      base_price: Number(p.base_price),
    }));
  const activeCustomers = customers
    .filter((c) => c.status === 'active')
    .map((c) => ({ id: c.id, code: c.code, name: c.name }));

  const rows = orders.filter((o) => {
    if (statusFilter && o.status !== statusFilter) return false;
    if (!q) return true;
    return `${o.code} ${o.customers?.name ?? ''}`.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold sm:text-3xl">
            <ScrollText className="text-accent" size={28} aria-hidden />
            Đơn đặt hàng
          </h1>
          <p className="mt-1 text-base text-ink-muted">
            Xác nhận đơn · kiểm tra tín dụng · tồn kho (ATP).
          </p>
        </div>
        <OrderDialog customers={activeCustomers} products={activeProducts} />
      </header>

      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <DocSearchBar
          baseHref={`${base}/sales/orders`}
          initialQ={rawQ ?? ''}
          preserve={{ status: statusFilter }}
          placeholder="Tìm mã ĐH, tên khách…"
        />
        <StatusFilterBar
          baseHref={`${base}/sales/orders`}
          options={FILTER_OPTIONS}
          active={statusFilter}
          q={rawQ}
        />
      </div>

      <ResponsiveDocList
        empty={rows.length === 0}
        emptyState={
          <div className="py-16 text-center">
            <ScrollText className="mx-auto text-ink-muted/50" size={32} aria-hidden />
            <p className="mt-4 text-ink-muted">
              {statusFilter ? 'Không có đơn ở trạng thái này.' : 'Chưa có đơn hàng nào.'}
            </p>
            {!statusFilter && (
              <p className="text-sm text-ink-muted/70">
                Tạo trực tiếp hoặc chuyển từ báo giá đã duyệt.
              </p>
            )}
          </div>
        }
        table={
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-panel/40 text-left text-ink-muted">
                <th className="px-5 py-3.5 font-medium">Mã</th>
                <th className="px-5 py-3.5 font-medium">Khách hàng</th>
                <th className="px-5 py-3.5 font-medium hidden lg:table-cell">Dòng hàng (ATP)</th>
                <th className="px-5 py-3.5 font-medium text-right">Tổng tiền</th>
                <th className="px-5 py-3.5 font-medium hidden xl:table-cell">Giao dự kiến</th>
                <th className="px-5 py-3.5 font-medium">Trạng thái</th>
                <th className="px-5 py-3.5 font-medium text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((o) => {
                const badge = STATUS_BADGE[o.status] ?? STATUS_BADGE['draft']!;
                const items = o.sales_order_items ?? [];
                const creditPassed = o.credit_check?.passed === true;
                return (
                  <tr
                    key={o.id}
                    className="border-b border-panel/20 last:border-0 hover:bg-glass-strong/40 transition-colors align-top"
                  >
                    <td className="px-5 py-3.5">
                      <Link
                        href={`${base}/sales/orders/${o.id}`}
                        className="font-mono text-xs text-accent hover:underline"
                      >
                        {o.code}
                      </Link>
                      {creditPassed && (
                        <p className="mt-1 inline-flex items-center gap-1 text-[11px] text-success">
                          <ShieldCheck size={12} aria-hidden />
                          Credit OK
                        </p>
                      )}
                    </td>
                    <td className="px-5 py-3.5 font-medium">{o.customers?.name ?? '—'}</td>
                    <td className="px-5 py-3.5 text-ink-muted hidden lg:table-cell">
                      {items.slice(0, 3).map((it) => {
                        const short =
                          it.atp_qty !== null &&
                          it.atp_qty !== undefined &&
                          Number(it.atp_qty) < Number(it.qty);
                        return (
                          <p key={it.id} className="text-xs">
                            {it.product_name} × {Number(it.qty)}
                            {short && (
                              <span className="text-warning">
                                {' '}
                                (tồn {Number(it.atp_qty)} — thiếu)
                              </span>
                            )}
                          </p>
                        );
                      })}
                      {items.length > 3 && (
                        <p className="text-xs text-ink-muted/70">+{items.length - 3} dòng khác</p>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-right tabular-nums font-medium">
                      {money(Number(o.total))}
                    </td>
                    <td className="px-5 py-3.5 text-ink-muted hidden xl:table-cell">
                      {formatDate(o.expected_delivery_date)}
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`inline-flex rounded-lg px-2 py-0.5 text-xs border ${badge.cls}`}
                      >
                        {badge.label}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <OrderRowActions
                        orderId={o.id}
                        status={o.status}
                        hasInvoice={(o.invoices ?? []).length > 0}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        }
        cards={
          <>
            {rows.map((o) => {
              const badge = STATUS_BADGE[o.status] ?? STATUS_BADGE['draft']!;
              const items = o.sales_order_items ?? [];
              return (
                <DocCard
                  key={o.id}
                  code={o.code}
                  title={o.customers?.name ?? '—'}
                  badge={
                    <span
                      className={`inline-flex rounded-lg px-2 py-0.5 text-xs border shrink-0 ${badge.cls}`}
                    >
                      {badge.label}
                    </span>
                  }
                  meta={
                    <>
                      <p>
                        <Link
                          href={`${base}/sales/orders/${o.id}`}
                          className="text-accent hover:underline"
                        >
                          Xem chi tiết
                        </Link>
                      </p>
                      <p>
                        {items
                          .slice(0, 2)
                          .map((it) => `${it.product_name} × ${Number(it.qty)}`)
                          .join(' · ')}
                      </p>
                      <p>Giao: {formatDate(o.expected_delivery_date)}</p>
                    </>
                  }
                  amount={money(Number(o.total))}
                  actions={
                    <OrderRowActions
                      orderId={o.id}
                      status={o.status}
                      hasInvoice={(o.invoices ?? []).length > 0}
                    />
                  }
                />
              );
            })}
          </>
        }
      />
    </div>
  );
}
