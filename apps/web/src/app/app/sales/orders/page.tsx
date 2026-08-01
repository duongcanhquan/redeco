import { ScrollText, ShieldCheck } from 'lucide-react';
import { createServerSupabase } from '@/lib/supabase/server';
import { formatDate, formatMoney } from '@/lib/format';
import { listCustomers, listProducts, listSalesOrders } from '@/services/sales.service';
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

export default async function SalesOrdersPage() {
  const supabase = await createServerSupabase();
  const [orders, customers, products] = await Promise.all([
    listSalesOrders(supabase),
    listCustomers(supabase),
    listProducts(supabase),
  ]);
  const activeProducts = products
    .filter((p) => p.is_active)
    .map((p) => ({ id: p.id, sku: p.sku, name: p.name, uom: p.uom, base_price: Number(p.base_price) }));
  const activeCustomers = customers
    .filter((c) => c.status === 'active')
    .map((c) => ({ id: c.id, code: c.code, name: c.name }));

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ScrollText className="text-accent" size={24} aria-hidden />
            Đơn đặt hàng
          </h1>
          <p className="text-sm text-ink-muted mt-1">
            Xác nhận đơn tự động kiểm tra hạn mức tín dụng (chặn nếu vượt) và tồn kho khả dụng (ATP).
          </p>
        </div>
        <OrderDialog customers={activeCustomers} products={activeProducts} />
      </header>

      <section className="glass rounded-2xl overflow-hidden">
        {orders.length === 0 ? (
          <div className="py-16 text-center">
            <ScrollText className="mx-auto text-ink-muted/50" size={32} aria-hidden />
            <p className="mt-4 text-ink-muted">Chưa có đơn hàng nào.</p>
            <p className="text-sm text-ink-muted/70">
              Tạo trực tiếp hoặc chuyển từ báo giá đã duyệt.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-panel/40 text-left text-ink-muted">
                  <th className="px-5 py-3.5 font-medium">Mã</th>
                  <th className="px-5 py-3.5 font-medium">Khách hàng</th>
                  <th className="px-5 py-3.5 font-medium">Dòng hàng (ATP)</th>
                  <th className="px-5 py-3.5 font-medium text-right">Tổng tiền</th>
                  <th className="px-5 py-3.5 font-medium">Giao dự kiến</th>
                  <th className="px-5 py-3.5 font-medium">Trạng thái</th>
                  <th className="px-5 py-3.5 font-medium text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => {
                  const badge = STATUS_BADGE[o.status] ?? STATUS_BADGE['draft']!;
                  const items = o.sales_order_items ?? [];
                  const creditPassed = o.credit_check?.passed === true;
                  return (
                    <tr key={o.id} className="border-b border-panel/20 last:border-0 hover:bg-glass-strong/40 transition-colors align-top">
                      <td className="px-5 py-3.5">
                        <p className="font-mono text-xs text-accent">{o.code}</p>
                        {creditPassed && (
                          <p
                            className="mt-1 inline-flex items-center gap-1 text-[11px] text-success"
                            title="Đã đạt kiểm tra hạn mức tín dụng khi xác nhận"
                          >
                            <ShieldCheck size={12} aria-hidden />
                            Credit OK
                          </p>
                        )}
                      </td>
                      <td className="px-5 py-3.5 font-medium">{o.customers?.name ?? '—'}</td>
                      <td className="px-5 py-3.5 text-ink-muted">
                        {items.slice(0, 3).map((it) => {
                          const short =
                            it.atp_qty !== null &&
                            it.atp_qty !== undefined &&
                            Number(it.atp_qty) < Number(it.qty);
                          return (
                            <p key={it.id} className="text-xs">
                              {it.product_name} × {Number(it.qty)}
                              {short && (
                                <span className="text-warning"> (tồn {Number(it.atp_qty)} — thiếu)</span>
                              )}
                            </p>
                          );
                        })}
                        {items.length > 3 && (
                          <p className="text-xs text-ink-muted/70">+{items.length - 3} dòng khác</p>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-right tabular-nums font-medium">
                        {formatMoney(Number(o.total))}
                      </td>
                      <td className="px-5 py-3.5 text-ink-muted">
                        {formatDate(o.expected_delivery_date)}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex rounded-lg px-2 py-0.5 text-xs border ${badge.cls}`}>
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
          </div>
        )}
      </section>
    </div>
  );
}
