import { Truck } from 'lucide-react';
import { PrintButton } from '@/components/sales/print-button';
import { DocCard, ResponsiveDocList } from '@/components/sales/responsive-doc-list';
import { StatusFilterBar } from '@/components/sales/status-filter';
import { formatDate } from '@/lib/format';
import { createServerSupabase, getSessionClaims } from '@/lib/supabase/server';
import { listDeliveries } from '@/services/sales.service';
import { ShipDeliveryButton } from './delivery-actions';

export const dynamic = 'force-dynamic';

const FILTER_OPTIONS = [
  { key: 'pending', label: 'Chờ xuất kho' },
  { key: 'shipped', label: 'Đã xuất kho' },
] as const;

export default async function DeliveriesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status: rawStatus } = await searchParams;
  const statusFilter =
    rawStatus === 'pending' || rawStatus === 'shipped' ? rawStatus : null;

  const [supabase, claims] = await Promise.all([
    createServerSupabase(),
    getSessionClaims(),
  ]);
  const base = claims?.tenantSlug ? `/${claims.tenantSlug}` : '/app';
  const deliveries = await listDeliveries(supabase);
  const rows = statusFilter
    ? deliveries.filter((d) => d.status === statusFilter)
    : deliveries;

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Truck className="text-accent" size={24} aria-hidden />
          Lệnh giao hàng
        </h1>
      </header>

      <StatusFilterBar
        baseHref={`${base}/sales/deliveries`}
        options={[...FILTER_OPTIONS]}
        active={statusFilter}
      />

      <ResponsiveDocList
        empty={rows.length === 0}
        emptyState={
          <div className="py-16 text-center">
            <Truck className="mx-auto text-ink-muted/50" size={32} aria-hidden />
            <p className="mt-4 text-ink-muted">
              {statusFilter
                ? 'Không có lệnh ở trạng thái này.'
                : 'Chưa có lệnh giao hàng nào.'}
            </p>
          </div>
        }
        table={
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-panel/40 text-left text-ink-muted">
                <th className="px-5 py-3.5 font-medium">Mã lệnh</th>
                <th className="px-5 py-3.5 font-medium">Đơn hàng</th>
                <th className="px-5 py-3.5 font-medium">Khách hàng</th>
                <th className="px-5 py-3.5 font-medium hidden lg:table-cell">Ngày tạo</th>
                <th className="px-5 py-3.5 font-medium hidden xl:table-cell">Xuất kho lúc</th>
                <th className="px-5 py-3.5 font-medium">Trạng thái</th>
                <th className="px-5 py-3.5 font-medium text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((d) => (
                <tr
                  key={d.id}
                  className="border-b border-panel/20 last:border-0 hover:bg-glass-strong/40 transition-colors"
                >
                  <td className="px-5 py-3.5 font-mono text-xs text-accent">{d.code}</td>
                  <td className="px-5 py-3.5 font-mono text-xs">
                    {d.sales_orders?.code ?? '—'}
                  </td>
                  <td className="px-5 py-3.5 font-medium">
                    {d.sales_orders?.customers?.name ?? '—'}
                  </td>
                  <td className="px-5 py-3.5 text-ink-muted hidden lg:table-cell">
                    {formatDate(d.created_at)}
                  </td>
                  <td className="px-5 py-3.5 text-ink-muted hidden xl:table-cell">
                    {d.shipped_at ? new Date(d.shipped_at).toLocaleString('vi-VN') : '—'}
                  </td>
                  <td className="px-5 py-3.5">
                    <span
                      className={`inline-flex rounded-lg px-2 py-0.5 text-xs border ${
                        d.status === 'shipped'
                          ? 'bg-success/10 border-success/30 text-success'
                          : 'bg-warning/10 border-warning/30 text-warning'
                      }`}
                    >
                      {d.status === 'shipped' ? 'Đã xuất kho' : 'Chờ xuất kho'}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <div className="inline-flex flex-wrap items-center justify-end gap-2">
                      <PrintButton
                        href={`${base}/sales/deliveries/${d.id}/print`}
                        label="In"
                      />
                      {d.status === 'pending' && <ShipDeliveryButton deliveryId={d.id} />}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        }
        cards={
          <>
            {rows.map((d) => (
              <DocCard
                key={d.id}
                code={d.code}
                title={d.sales_orders?.customers?.name ?? '—'}
                badge={
                  <span
                    className={`inline-flex rounded-lg px-2 py-0.5 text-xs border shrink-0 ${
                      d.status === 'shipped'
                        ? 'bg-success/10 border-success/30 text-success'
                        : 'bg-warning/10 border-warning/30 text-warning'
                    }`}
                  >
                    {d.status === 'shipped' ? 'Đã XK' : 'Chờ XK'}
                  </span>
                }
                meta={<p>Đơn: {d.sales_orders?.code ?? '—'}</p>}
                actions={
                  <div className="inline-flex flex-wrap items-center justify-end gap-2">
                    <PrintButton
                      href={`${base}/sales/deliveries/${d.id}/print`}
                      label="In"
                    />
                    {d.status === 'pending' && <ShipDeliveryButton deliveryId={d.id} />}
                  </div>
                }
              />
            ))}
          </>
        }
      />
    </div>
  );
}
