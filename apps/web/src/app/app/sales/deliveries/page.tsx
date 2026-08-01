import { Truck } from 'lucide-react';
import { createServerSupabase } from '@/lib/supabase/server';
import { formatDate } from '@/lib/format';
import { listDeliveries } from '@/services/sales.service';
import { ShipDeliveryButton } from './delivery-actions';

export const dynamic = 'force-dynamic';

export default async function DeliveriesPage() {
  const supabase = await createServerSupabase();
  const deliveries = await listDeliveries(supabase);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Truck className="text-accent" size={24} aria-hidden />
          Lệnh giao hàng
        </h1>
        <p className="text-sm text-ink-muted mt-1">
          Tạo từ trang Đơn hàng (đơn đã xác nhận). “Xuất kho” trừ tồn nguyên tử — chặn nếu thiếu hàng.
        </p>
      </header>

      <section className="glass rounded-2xl overflow-hidden">
        {deliveries.length === 0 ? (
          <div className="py-16 text-center">
            <Truck className="mx-auto text-ink-muted/50" size={32} aria-hidden />
            <p className="mt-4 text-ink-muted">Chưa có lệnh giao hàng nào.</p>
            <p className="text-sm text-ink-muted/70">
              Vào Đơn hàng → đơn đã xác nhận → “Tạo lệnh giao hàng”.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-panel/40 text-left text-ink-muted">
                  <th className="px-5 py-3.5 font-medium">Mã lệnh</th>
                  <th className="px-5 py-3.5 font-medium">Đơn hàng</th>
                  <th className="px-5 py-3.5 font-medium">Khách hàng</th>
                  <th className="px-5 py-3.5 font-medium">Ngày tạo</th>
                  <th className="px-5 py-3.5 font-medium">Xuất kho lúc</th>
                  <th className="px-5 py-3.5 font-medium">Trạng thái</th>
                  <th className="px-5 py-3.5 font-medium text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {deliveries.map((d) => (
                  <tr key={d.id} className="border-b border-panel/20 last:border-0 hover:bg-glass-strong/40 transition-colors">
                    <td className="px-5 py-3.5 font-mono text-xs text-accent">{d.code}</td>
                    <td className="px-5 py-3.5 font-mono text-xs">{d.sales_orders?.code ?? '—'}</td>
                    <td className="px-5 py-3.5 font-medium">
                      {d.sales_orders?.customers?.name ?? '—'}
                    </td>
                    <td className="px-5 py-3.5 text-ink-muted">{formatDate(d.created_at)}</td>
                    <td className="px-5 py-3.5 text-ink-muted">
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
                      {d.status === 'pending' && <ShipDeliveryButton deliveryId={d.id} />}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
