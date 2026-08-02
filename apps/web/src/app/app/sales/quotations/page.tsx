import { FileText } from 'lucide-react';
import Link from 'next/link';
import { createServerSupabase, getSessionClaims } from '@/lib/supabase/server';
import { formatDate, formatMoney } from '@/lib/format';
import { DocSearchBar } from '@/components/sales/doc-search';
import { DocCard, ResponsiveDocList } from '@/components/sales/responsive-doc-list';
import { StatusFilterBar } from '@/components/sales/status-filter';
import {
  getTenantContext,
  listCustomers,
  listProducts,
  listQuotations,
} from '@/services/sales.service';
import { getSalesSettings } from '@/services/tenant-settings.service';
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

const FILTER_OPTIONS = Object.entries(STATUS_BADGE).map(([key, v]) => ({
  key,
  label: v.label,
}));

export default async function QuotationsPage({
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

  const [ctx, quotations, customers, products, salesSettings] = await Promise.all([
    getTenantContext(),
    listQuotations(supabase),
    listCustomers(supabase),
    listProducts(supabase),
    getSalesSettings(),
  ]);
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

  const rows = quotations.filter((row) => {
    if (statusFilter && row.status !== statusFilter) return false;
    if (!q) return true;
    const hay = `${row.code} ${row.customers?.name ?? ''}`.toLowerCase();
    return hay.includes(q);
  });
  const money = (n: number) => formatMoney(n, salesSettings.currencyLabel);

  const editSeed = (q: (typeof rows)[number]) => ({
    id: q.id,
    customerId: q.customer_id,
    validUntil: q.valid_until,
    discountPct: Number(q.discount_pct),
    notes: q.notes,
    items: (q.quotation_items ?? []).map((it) => ({
      productId: it.product_id,
      qty: String(Number(it.qty)),
      unitPrice: String(Number(it.unit_price)),
      discountPct: String(Number(it.discount_pct)),
    })),
  });

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="text-accent" size={24} aria-hidden />
            Báo giá
          </h1>
          <p className="text-sm text-ink-muted mt-1">
            Nháp → Gửi duyệt (chuỗi N cấp) → Duyệt từng bước → Chuyển thành đơn hàng.
          </p>
        </div>
        <QuotationDialog
          customers={activeCustomers}
          products={activeProducts}
          defaultValidDays={salesSettings.defaultQuotationValidDays}
        />
      </header>

      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <DocSearchBar
          baseHref={`${base}/sales/quotations`}
          initialQ={rawQ ?? ''}
          preserve={{ status: statusFilter }}
          placeholder="Tìm mã BG, tên khách…"
        />
        <StatusFilterBar
          baseHref={`${base}/sales/quotations`}
          options={FILTER_OPTIONS}
          active={statusFilter}
          q={rawQ}
        />
      </div>

      <ResponsiveDocList
        empty={rows.length === 0}
        emptyState={
          <div className="py-16 text-center">
            <FileText className="mx-auto text-ink-muted/50" size={32} aria-hidden />
            <p className="mt-4 text-ink-muted">
              {statusFilter ? 'Không có báo giá ở trạng thái này.' : 'Chưa có báo giá nào.'}
            </p>
          </div>
        }
        table={
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-panel/40 text-left text-ink-muted">
                <th className="px-5 py-3.5 font-medium">Mã</th>
                <th className="px-5 py-3.5 font-medium">Khách hàng</th>
                <th className="px-5 py-3.5 font-medium hidden lg:table-cell">Dòng hàng</th>
                <th className="px-5 py-3.5 font-medium text-right">Tổng tiền</th>
                <th className="px-5 py-3.5 font-medium hidden xl:table-cell">Hiệu lực</th>
                <th className="px-5 py-3.5 font-medium">Trạng thái</th>
                <th className="px-5 py-3.5 font-medium text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((q) => {
                const badge = STATUS_BADGE[q.status] ?? STATUS_BADGE['draft']!;
                const items = q.quotation_items ?? [];
                return (
                  <tr
                    key={q.id}
                    className="border-b border-panel/20 last:border-0 hover:bg-glass-strong/40 transition-colors align-top"
                  >
                    <td className="px-5 py-3.5">
                      <Link
                        href={`${base}/sales/quotations/${q.id}`}
                        className="font-mono text-xs text-accent hover:underline"
                      >
                        {q.code}
                      </Link>
                    </td>
                    <td className="px-5 py-3.5 font-medium">{q.customers?.name ?? '—'}</td>
                    <td className="px-5 py-3.5 text-ink-muted hidden lg:table-cell">
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
                      {money(Number(q.total))}
                      {Number(q.discount_pct) > 0 && (
                        <p className="text-xs text-ink-muted">CK {Number(q.discount_pct)}%</p>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-ink-muted hidden xl:table-cell">
                      {formatDate(q.valid_until)}
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`inline-flex rounded-lg px-2 py-0.5 text-xs border ${badge.cls}`}
                      >
                        {badge.label}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
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
                              edit={editSeed(q)}
                            />
                          ) : undefined
                        }
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
            {rows.map((q) => {
              const badge = STATUS_BADGE[q.status] ?? STATUS_BADGE['draft']!;
              const items = q.quotation_items ?? [];
              return (
                <DocCard
                  key={q.id}
                  code={q.code}
                  title={q.customers?.name ?? '—'}
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
                          href={`${base}/sales/quotations/${q.id}`}
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
                        {items.length > 2 ? ` · +${items.length - 2}` : ''}
                      </p>
                      <p>Hiệu lực: {formatDate(q.valid_until)}</p>
                    </>
                  }
                  amount={money(Number(q.total))}
                  actions={
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
                            edit={editSeed(q)}
                          />
                        ) : undefined
                      }
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
