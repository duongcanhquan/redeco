import { FileText, Wallet } from 'lucide-react';
import { createServerSupabase } from '@/lib/supabase/server';
import { formatDate, formatMoney } from '@/lib/format';
import { listInvoices } from '@/services/sales.service';
import { MarkPaidButton } from './invoice-actions';

export const dynamic = 'force-dynamic';

export default async function InvoicesPage() {
  const supabase = await createServerSupabase();
  const invoices = await listInvoices(supabase);
  const unpaidTotal = invoices
    .filter((i) => i.status === 'unpaid')
    .reduce((s, i) => s + Number(i.total), 0);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="text-accent" size={24} aria-hidden />
            Hóa đơn
          </h1>
          <p className="text-sm text-ink-muted mt-1">
            Sinh từ đơn đã giao (trang Đơn hàng). Hóa đơn chưa thu tạo thành công nợ khách hàng.
          </p>
        </div>
        <div className="glass rounded-2xl px-4 py-2.5 flex items-center gap-2.5">
          <Wallet size={18} className={unpaidTotal > 0 ? 'text-warning' : 'text-success'} aria-hidden />
          <div>
            <p className="text-xs text-ink-muted">Tổng công nợ phải thu</p>
            <p className={`font-bold tabular-nums ${unpaidTotal > 0 ? 'text-warning' : 'text-success'}`}>
              {formatMoney(unpaidTotal)}
            </p>
          </div>
        </div>
      </header>

      <section className="glass rounded-2xl overflow-hidden">
        {invoices.length === 0 ? (
          <div className="py-16 text-center">
            <FileText className="mx-auto text-ink-muted/50" size={32} aria-hidden />
            <p className="mt-4 text-ink-muted">Chưa có hóa đơn nào.</p>
            <p className="text-sm text-ink-muted/70">
              Vào Đơn hàng → đơn đang giao / hoàn tất → “Xuất hóa đơn”.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-panel/40 text-left text-ink-muted">
                  <th className="px-5 py-3.5 font-medium">Số hóa đơn</th>
                  <th className="px-5 py-3.5 font-medium">Đơn hàng</th>
                  <th className="px-5 py-3.5 font-medium">Khách hàng</th>
                  <th className="px-5 py-3.5 font-medium">Ngày phát hành</th>
                  <th className="px-5 py-3.5 font-medium text-right">Số tiền</th>
                  <th className="px-5 py-3.5 font-medium">Trạng thái</th>
                  <th className="px-5 py-3.5 font-medium text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr key={inv.id} className="border-b border-panel/20 last:border-0 hover:bg-glass-strong/40 transition-colors">
                    <td className="px-5 py-3.5 font-mono text-xs text-accent">{inv.code}</td>
                    <td className="px-5 py-3.5 font-mono text-xs">{inv.sales_orders?.code ?? '—'}</td>
                    <td className="px-5 py-3.5 font-medium">{inv.customers?.name ?? '—'}</td>
                    <td className="px-5 py-3.5 text-ink-muted">{formatDate(inv.issued_on)}</td>
                    <td className="px-5 py-3.5 text-right tabular-nums font-medium">
                      {formatMoney(Number(inv.total))}
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`inline-flex rounded-lg px-2 py-0.5 text-xs border ${
                          inv.status === 'paid'
                            ? 'bg-success/10 border-success/30 text-success'
                            : 'bg-warning/10 border-warning/30 text-warning'
                        }`}
                      >
                        {inv.status === 'paid' ? 'Đã thanh toán' : 'Chưa thanh toán'}
                      </span>
                      {inv.paid_at && (
                        <p className="mt-0.5 text-[11px] text-ink-muted">
                          {new Date(inv.paid_at).toLocaleString('vi-VN')}
                        </p>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      {inv.status === 'unpaid' && <MarkPaidButton invoiceId={inv.id} />}
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
