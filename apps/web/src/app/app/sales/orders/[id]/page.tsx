import Link from 'next/link';
import { ArrowLeft, ScrollText, ShieldCheck } from 'lucide-react';
import { notFound } from 'next/navigation';
import { DocAiReviewButton } from '@/components/sales/doc-ai-review-button';
import { PrintButton } from '@/components/sales/print-button';
import { formatDate, formatMoney } from '@/lib/format';
import { createServerSupabase, getSessionClaims } from '@/lib/supabase/server';
import { getSalesOrderWoQtyByProduct } from '@/services/production.service';
import { getMyRootModules, getSalesOrderById } from '@/services/sales.service';
import {
  getAiAssistantAvailability,
  getSalesSettings,
} from '@/services/tenant-settings.service';
import { CreateWoFromOrderButton } from '../create-wo-from-order-button';
import { OrderRowActions } from '../order-row-actions';

export const dynamic = 'force-dynamic';

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  draft: { label: 'Nháp', cls: 'bg-glass-strong border-panel/50 text-ink-muted' },
  confirmed: { label: 'Đã xác nhận', cls: 'bg-success/10 border-success/30 text-success' },
  delivering: { label: 'Đang giao', cls: 'bg-accent-soft border-accent/25 text-accent' },
  completed: { label: 'Hoàn tất', cls: 'bg-success/10 border-success/30 text-success' },
  cancelled: { label: 'Đã hủy', cls: 'bg-danger/10 border-danger/30 text-danger' },
};

export default async function SalesOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [supabase, claims, salesSettings, aiAvail] = await Promise.all([
    createServerSupabase(),
    getSessionClaims(),
    getSalesSettings(),
    getAiAssistantAvailability(),
  ]);
  const [o, modules] = await Promise.all([
    getSalesOrderById(supabase, id),
    getMyRootModules(supabase),
  ]);
  if (!o) notFound();

  const hasSx = modules.some((m) => m.key === 'san-xuat');
  const woQtyByProduct =
    hasSx && (o.status === 'confirmed' || o.status === 'delivering')
      ? await getSalesOrderWoQtyByProduct(supabase, id)
      : new Map<string, number>();

  const base = claims?.tenantSlug ? `/${claims.tenantSlug}` : '/app';
  const badge = STATUS_BADGE[o.status] ?? STATUS_BADGE['draft']!;
  const items = o.sales_order_items ?? [];
  const money = (n: number) => formatMoney(n, salesSettings.currencyLabel);
  const creditPassed = o.credit_check?.passed === true;
  const promiseLines = o.promise_check?.lines ?? [];
  const ctpShort = promiseLines.find((l) => l.shortfall > 0);
  const canCreateWo = o.status === 'confirmed' || o.status === 'delivering';
  const shortfallCount = canCreateWo
    ? items.filter((it) => {
        const atp = it.atp_qty == null ? 0 : Number(it.atp_qty);
        const woQty = woQtyByProduct.get(it.product_id) ?? 0;
        return Number(it.qty) - atp - woQty > 0;
      }).length
    : 0;

  return (
    <div className="space-y-5 max-w-4xl">
      <header className="space-y-3">
        <Link
          href={`${base}/sales/orders`}
          className="inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-accent min-h-11"
        >
          <ArrowLeft size={16} aria-hidden />
          Quay lại đơn hàng
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <ScrollText className="text-accent" size={24} aria-hidden />
              {o.code}
            </h1>
            <p className="text-sm text-ink-muted mt-1">{o.customers?.name ?? '—'}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <DocAiReviewButton
              kind="order"
              docId={o.id}
              basePath={base}
              entitled={aiAvail.entitledOrderReview}
              configured={aiAvail.configured}
              enabled={aiAvail.features.salesOrderReview}
            />
            <PrintButton href={`${base}/sales/orders/${o.id}/print`} />
            <span className={`inline-flex rounded-lg px-3 py-1 text-xs border ${badge.cls}`}>
              {badge.label}
            </span>
          </div>
        </div>
      </header>

      {hasSx && shortfallCount > 0 && (
        <section className="glass rounded-2xl p-4 space-y-2">
          <p className="text-sm font-medium">Thiếu hàng — gắn Sản xuất</p>
          <p className="text-xs text-ink-muted">
            Tạo lệnh sản xuất nháp cho phần còn thiếu, rồi xử lý ở menu Sản xuất.
          </p>
          <CreateWoFromOrderButton orderId={o.id} shortfallCount={shortfallCount} />
          <Link
            href={`${base}/production/work-orders`}
            className="text-sm text-accent hover:underline inline-block min-h-11 leading-[2.75rem]"
          >
            Mở danh sách lệnh SX →
          </Link>
        </section>
      )}

      <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="glass rounded-2xl p-4">
          <p className="text-xs text-ink-muted">Tổng tiền</p>
          <p className="mt-1 font-semibold tabular-nums">{money(Number(o.total))}</p>
        </div>
        <div className="glass rounded-2xl p-4">
          <p className="text-xs text-ink-muted">Giao dự kiến</p>
          <p className="mt-1 font-semibold">{formatDate(o.expected_delivery_date)}</p>
        </div>
        <div className="glass rounded-2xl p-4">
          <p className="text-xs text-ink-muted">Credit</p>
          <p className="mt-1 font-semibold flex items-center gap-1">
            {creditPassed ? (
              <>
                <ShieldCheck size={16} className="text-success" aria-hidden />
                Đạt
              </>
            ) : (
              <span className="text-ink-muted">Chưa / không đạt</span>
            )}
          </p>
        </div>
        <div className="glass rounded-2xl p-4">
          <p className="text-xs text-ink-muted">CTP (Sản xuất)</p>
          <p className="mt-1 text-sm font-medium">
            {ctpShort
              ? ctpShort.ctpStatus
              : o.promise_check?.allCovered
                ? 'Đủ ATP'
                : '—'}
          </p>
          {ctpShort?.reason && (
            <p className="text-[11px] text-ink-muted mt-0.5">{ctpShort.reason}</p>
          )}
        </div>
      </section>

      <section className="glass rounded-2xl overflow-hidden">
        <div className="px-5 py-3 border-b border-panel/40 font-semibold text-sm">
          Dòng hàng & ATP
        </div>
        <ul className="divide-y divide-panel/30">
          {items.map((it) => {
            const short =
              it.atp_qty !== null &&
              it.atp_qty !== undefined &&
              Number(it.atp_qty) < Number(it.qty);
            return (
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
                  {it.atp_qty !== null && it.atp_qty !== undefined && (
                    <span className={short ? 'text-warning' : 'text-ink-muted'}>
                      {' '}
                      · ATP {Number(it.atp_qty)}
                      {short ? ' (thiếu)' : ''}
                    </span>
                  )}
                </span>
                <span className="tabular-nums font-medium">{money(Number(it.line_total))}</span>
              </li>
            );
          })}
        </ul>
      </section>

      {o.notes && (
        <section className="glass rounded-2xl p-4 text-sm">
          <p className="text-xs text-ink-muted mb-1">Ghi chú</p>
          <p>{o.notes}</p>
        </section>
      )}

      <div className="flex justify-end">
        <OrderRowActions
          orderId={o.id}
          status={o.status}
          hasInvoice={(o.invoices ?? []).length > 0}
        />
      </div>
    </div>
  );
}
