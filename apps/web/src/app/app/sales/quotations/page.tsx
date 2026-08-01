import { FileText } from 'lucide-react';
import { createServerSupabase } from '@/lib/supabase/server';
import { formatDate, formatMoney } from '@/lib/format';
import {
  getTenantContext,
  listCustomers,
  listProducts,
  listQuotations,
} from '@/services/sales.service';
import { QuotationDialog } from './quotation-dialog';
import { QuotationRowActions } from './quotation-actions';

export const dynamic = 'force-dynamic';

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  draft: { label: 'Nháp', cls: 'bg-glass-strong border-panel/50 text-ink-muted' },
  sent: { label: 'Chờ duyệt', cls: 'bg-warning/10 border-warning/30 text-warning' },
  approved: { label: 'Đã duyệt', cls: 'bg-success/10 border-success/30 text-success' },
  rejected: { label: 'Từ chối', cls: 'bg-danger/10 border-danger/30 text-danger' },
  converted: { label: 'Đã chuyển đơn', cls: 'bg-accent-soft border-accent/25 text-accent' },
};

export default async function QuotationsPage() {
  const supabase = await createServerSupabase();
  const [ctx, quotations, customers, products] = await Promise.all([
    getTenantContext(),
    listQuotations(supabase),
    listCustomers(supabase),
    listProducts(supabase),
  ]);
  const canApprove = ctx.role === 'owner' || ctx.role === 'admin';
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
            <FileText className="text-accent" size={24} aria-hidden />
            Báo giá
          </h1>
          <p className="text-sm text-ink-muted mt-1">
            Quy trình: Nháp → Gửi duyệt → Duyệt (owner/admin) → Chuyển thành đơn hàng.
          </p>
        </div>
        <QuotationDialog customers={activeCustomers} products={activeProducts} />
      </header>

      <section className="glass rounded-2xl overflow-hidden">
        {quotations.length === 0 ? (
          <div className="py-16 text-center">
            <FileText className="mx-auto text-ink-muted/50" size={32} aria-hidden />
            <p className="mt-4 text-ink-muted">Chưa có báo giá nào.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-panel/40 text-left text-ink-muted">
                  <th className="px-5 py-3.5 font-medium">Mã</th>
                  <th className="px-5 py-3.5 font-medium">Khách hàng</th>
                  <th className="px-5 py-3.5 font-medium">Dòng hàng</th>
                  <th className="px-5 py-3.5 font-medium text-right">Tổng tiền</th>
                  <th className="px-5 py-3.5 font-medium">Hiệu lực</th>
                  <th className="px-5 py-3.5 font-medium">Trạng thái</th>
                  <th className="px-5 py-3.5 font-medium text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {quotations.map((q) => {
                  const badge = STATUS_BADGE[q.status] ?? STATUS_BADGE['draft']!;
                  const items = q.quotation_items ?? [];
                  return (
                    <tr key={q.id} className="border-b border-panel/20 last:border-0 hover:bg-glass-strong/40 transition-colors align-top">
                      <td className="px-5 py-3.5 font-mono text-xs text-accent">{q.code}</td>
                      <td className="px-5 py-3.5 font-medium">{q.customers?.name ?? '—'}</td>
                      <td className="px-5 py-3.5 text-ink-muted">
                        {items.slice(0, 2).map((it) => (
                          <p key={it.id} className="text-xs">
                            {it.product_name} × {Number(it.qty)}
                          </p>
                        ))}
                        {items.length > 2 && (
                          <p className="text-xs text-ink-muted/70">+{items.length - 2} dòng khác</p>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-right tabular-nums font-medium">
                        {formatMoney(Number(q.total))}
                        {Number(q.discount_pct) > 0 && (
                          <p className="text-xs text-ink-muted">CK {Number(q.discount_pct)}%</p>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-ink-muted">{formatDate(q.valid_until)}</td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex rounded-lg px-2 py-0.5 text-xs border ${badge.cls}`}>
                          {badge.label}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <QuotationRowActions
                          quotationId={q.id}
                          status={q.status}
                          canApprove={canApprove}
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
