import Link from 'next/link';
import { ArrowLeft, FileText } from 'lucide-react';
import { notFound } from 'next/navigation';
import { DocAiReviewButton } from '@/components/sales/doc-ai-review-button';
import { PrintButton } from '@/components/sales/print-button';
import { formatDate, formatMoney } from '@/lib/format';
import { createServerSupabase, getSessionClaims } from '@/lib/supabase/server';
import {
  getQuotationById,
  getTenantContext,
  listCustomers,
  listProducts,
} from '@/services/sales.service';
import {
  getAiAssistantAvailability,
  getSalesSettings,
} from '@/services/tenant-settings.service';
import { QuotationDialog } from '../quotation-dialog';
import { QuotationRowActions } from '../quotation-actions';

export const dynamic = 'force-dynamic';

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  draft: { label: 'Nháp', cls: 'bg-glass-strong border-panel/50 text-ink-muted' },
  sent: { label: 'Chờ duyệt', cls: 'bg-warning/10 border-warning/30 text-warning' },
  approved: { label: 'Đã duyệt', cls: 'bg-success/10 border-success/30 text-success' },
  rejected: { label: 'Từ chối', cls: 'bg-danger/10 border-danger/30 text-danger' },
  converted: { label: 'Đã chuyển đơn', cls: 'bg-accent-soft border-accent/25 text-accent' },
};

export default async function QuotationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [supabase, claims, ctx, salesSettings, aiAvail] = await Promise.all([
    createServerSupabase(),
    getSessionClaims(),
    getTenantContext(),
    getSalesSettings(),
    getAiAssistantAvailability(),
  ]);
  const [q, customers, products] = await Promise.all([
    getQuotationById(supabase, id),
    listCustomers(supabase),
    listProducts(supabase),
  ]);
  if (!q) notFound();

  const base = claims?.tenantSlug ? `/${claims.tenantSlug}` : '/app';
  const badge = STATUS_BADGE[q.status] ?? STATUS_BADGE['draft']!;
  const items = q.quotation_items ?? [];
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

  return (
    <div className="space-y-5 max-w-4xl">
      <header className="space-y-3">
        <Link
          href={`${base}/sales/quotations`}
          className="inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-accent min-h-11"
        >
          <ArrowLeft size={16} aria-hidden />
          Quay lại báo giá
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <FileText className="text-accent" size={24} aria-hidden />
              {q.code}
            </h1>
            <p className="text-sm text-ink-muted mt-1">{q.customers?.name ?? '—'}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <DocAiReviewButton
              kind="quotation"
              docId={q.id}
              basePath={base}
              entitled={aiAvail.entitledQuoteReview}
              configured={aiAvail.configured}
              enabled={aiAvail.features.salesQuoteReview}
            />
            <PrintButton href={`${base}/sales/quotations/${q.id}/print`} />
            <span className={`inline-flex rounded-lg px-3 py-1 text-xs border ${badge.cls}`}>
              {badge.label}
            </span>
          </div>
        </div>
      </header>

      <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="glass rounded-2xl p-4">
          <p className="text-xs text-ink-muted">Tổng tiền</p>
          <p className="mt-1 font-semibold tabular-nums">{money(Number(q.total))}</p>
        </div>
        <div className="glass rounded-2xl p-4">
          <p className="text-xs text-ink-muted">Chiết khấu</p>
          <p className="mt-1 font-semibold tabular-nums">{Number(q.discount_pct)}%</p>
        </div>
        <div className="glass rounded-2xl p-4">
          <p className="text-xs text-ink-muted">Hiệu lực</p>
          <p className="mt-1 font-semibold">{formatDate(q.valid_until)}</p>
        </div>
        <div className="glass rounded-2xl p-4">
          <p className="text-xs text-ink-muted">Ngày tạo</p>
          <p className="mt-1 font-semibold">{formatDate(q.created_at)}</p>
        </div>
      </section>

      <section className="glass rounded-2xl overflow-hidden">
        <div className="px-5 py-3 border-b border-panel/40 font-semibold text-sm">Dòng hàng</div>
        <ul className="divide-y divide-panel/30">
          {items.map((it) => (
            <li
              key={it.id}
              className="px-5 py-3 flex flex-wrap items-center justify-between gap-2 text-sm"
            >
              <span>
                <span className="font-medium">{it.product_name}</span>
                <span className="text-ink-muted">
                  {' '}
                  × {Number(it.qty)} @ {money(Number(it.unit_price))}
                </span>
              </span>
              <span className="tabular-nums font-medium">{money(Number(it.line_total))}</span>
            </li>
          ))}
        </ul>
      </section>

      {q.notes && (
        <section className="glass rounded-2xl p-4 text-sm">
          <p className="text-xs text-ink-muted mb-1">Ghi chú</p>
          <p>{q.notes}</p>
        </section>
      )}

      {(q.quotation_approval_actions ?? []).length > 0 && (
        <section className="glass rounded-2xl p-4 space-y-2">
          <p className="text-sm font-semibold">Chuỗi duyệt</p>
          <ul className="space-y-2 text-sm">
            {(q.quotation_approval_actions ?? [])
              .slice()
              .sort((a, b) => a.step_order - b.step_order)
              .map((a) => (
                <li
                  key={a.id}
                  className="flex justify-between gap-2 rounded-xl border border-panel/40 px-3 py-2"
                >
                  <span>
                    Bước {a.step_order}: {a.step_name}
                  </span>
                  <span className="text-ink-muted">{a.status}</span>
                </li>
              ))}
          </ul>
        </section>
      )}

      <div className="flex flex-wrap justify-end gap-2">
        <QuotationRowActions
          quotationId={q.id}
          status={q.status}
          role={ctx.role}
          currentStepOrder={q.current_step_order}
          actions={q.quotation_approval_actions ?? []}
          editSlot={
            q.status === 'draft' ? (
              <QuotationDialog
                customers={activeCustomers}
                products={activeProducts}
                defaultValidDays={salesSettings.defaultQuotationValidDays}
                edit={{
                  id: q.id,
                  customerId: q.customer_id,
                  validUntil: q.valid_until,
                  discountPct: Number(q.discount_pct),
                  notes: q.notes,
                  items: items.map((it) => ({
                    productId: it.product_id,
                    qty: String(Number(it.qty)),
                    unitPrice: String(Number(it.unit_price)),
                    discountPct: String(Number(it.discount_pct)),
                  })),
                }}
              />
            ) : undefined
          }
        />
      </div>
    </div>
  );
}
