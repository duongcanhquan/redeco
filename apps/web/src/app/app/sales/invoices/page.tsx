import { AlertTriangle, FileText, Wallet } from 'lucide-react';
import { PrintButton } from '@/components/sales/print-button';
import { DocCard, ResponsiveDocList } from '@/components/sales/responsive-doc-list';
import { StatusFilterBar } from '@/components/sales/status-filter';
import { daysSinceDate, formatDate, formatMoney, isDebtOverdue } from '@/lib/format';
import { createServerSupabase, getSessionClaims } from '@/lib/supabase/server';
import { listInvoices } from '@/services/sales.service';
import { getSalesSettings } from '@/services/tenant-settings.service';
import { MarkPaidButton } from './invoice-actions';

export const dynamic = 'force-dynamic';

const FILTER_OPTIONS = [
  { key: 'unpaid', label: 'Chưa thanh toán' },
  { key: 'paid', label: 'Đã thanh toán' },
  { key: 'overdue', label: 'Quá hạn cảnh báo' },
] as const;

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status: rawStatus } = await searchParams;
  const statusFilter =
    rawStatus === 'paid' || rawStatus === 'unpaid' || rawStatus === 'overdue'
      ? rawStatus
      : null;

  const [supabase, claims, salesSettings] = await Promise.all([
    createServerSupabase(),
    getSessionClaims(),
    getSalesSettings(),
  ]);
  const base = claims?.tenantSlug ? `/${claims.tenantSlug}` : '/app';
  const invoices = await listInvoices(supabase);
  const money = (n: number) => formatMoney(n, salesSettings.currencyLabel);
  const warnDays = salesSettings.debtWarningDays;

  const withFlags = invoices.map((inv) => ({
    ...inv,
    overdue: isDebtOverdue(inv.issued_on, inv.status, warnDays),
    ageDays: daysSinceDate(inv.issued_on),
  }));

  const rows =
    statusFilter === 'overdue'
      ? withFlags.filter((i) => i.overdue)
      : statusFilter
        ? withFlags.filter((i) => i.status === statusFilter)
        : withFlags;

  const unpaidTotal = invoices
    .filter((i) => i.status === 'unpaid')
    .reduce((s, i) => s + Number(i.total), 0);
  const overdueCount = withFlags.filter((i) => i.overdue).length;

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="text-accent" size={24} aria-hidden />
            Hóa đơn
          </h1>
          <p className="text-sm text-ink-muted mt-1">
            Sinh từ đơn đã giao. Cảnh báo tuổi nợ sau {warnDays} ngày kể từ ngày phát hành
            (Cài đặt → Kinh doanh).
          </p>
        </div>
        <div className="glass rounded-2xl px-4 py-2.5 flex items-center gap-2.5 min-h-11">
          <Wallet
            size={18}
            className={unpaidTotal > 0 ? 'text-warning' : 'text-success'}
            aria-hidden
          />
          <div>
            <p className="text-xs text-ink-muted">Tổng công nợ phải thu</p>
            <p
              className={`font-bold tabular-nums ${
                unpaidTotal > 0 ? 'text-warning' : 'text-success'
              }`}
            >
              {money(unpaidTotal)}
            </p>
            {overdueCount > 0 && (
              <p className="text-[11px] text-danger flex items-center gap-1 mt-0.5">
                <AlertTriangle size={11} aria-hidden />
                {overdueCount} quá hạn cảnh báo
              </p>
            )}
          </div>
        </div>
      </header>

      <StatusFilterBar
        baseHref={`${base}/sales/invoices`}
        options={[...FILTER_OPTIONS]}
        active={statusFilter}
      />

      <ResponsiveDocList
        empty={rows.length === 0}
        emptyState={
          <div className="py-16 text-center">
            <FileText className="mx-auto text-ink-muted/50" size={32} aria-hidden />
            <p className="mt-4 text-ink-muted">
              {statusFilter ? 'Không có hóa đơn ở bộ lọc này.' : 'Chưa có hóa đơn nào.'}
            </p>
          </div>
        }
        table={
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-panel/40 text-left text-ink-muted">
                <th className="px-5 py-3.5 font-medium">Số hóa đơn</th>
                <th className="px-5 py-3.5 font-medium hidden lg:table-cell">Đơn hàng</th>
                <th className="px-5 py-3.5 font-medium">Khách hàng</th>
                <th className="px-5 py-3.5 font-medium hidden xl:table-cell">Ngày PH</th>
                <th className="px-5 py-3.5 font-medium text-right">Số tiền</th>
                <th className="px-5 py-3.5 font-medium">Trạng thái</th>
                <th className="px-5 py-3.5 font-medium text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((inv) => (
                <tr
                  key={inv.id}
                  className="border-b border-panel/20 last:border-0 hover:bg-glass-strong/40 transition-colors"
                >
                  <td className="px-5 py-3.5 font-mono text-xs text-accent">{inv.code}</td>
                  <td className="px-5 py-3.5 font-mono text-xs hidden lg:table-cell">
                    {inv.sales_orders?.code ?? '—'}
                  </td>
                  <td className="px-5 py-3.5 font-medium">{inv.customers?.name ?? '—'}</td>
                  <td className="px-5 py-3.5 text-ink-muted hidden xl:table-cell">
                    {formatDate(inv.issued_on)}
                    {inv.status === 'unpaid' && (
                      <p className="text-[11px]">{inv.ageDays} ngày</p>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-right tabular-nums font-medium">
                    {money(Number(inv.total))}
                  </td>
                  <td className="px-5 py-3.5">
                    <span
                      className={`inline-flex rounded-lg px-2 py-0.5 text-xs border ${
                        inv.status === 'paid'
                          ? 'bg-success/10 border-success/30 text-success'
                          : inv.overdue
                            ? 'bg-danger/10 border-danger/30 text-danger'
                            : 'bg-warning/10 border-warning/30 text-warning'
                      }`}
                    >
                      {inv.status === 'paid'
                        ? 'Đã thanh toán'
                        : inv.overdue
                          ? 'Quá hạn cảnh báo'
                          : 'Chưa thanh toán'}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <div className="inline-flex flex-wrap items-center justify-end gap-2">
                      <PrintButton
                        href={`${base}/sales/invoices/${inv.id}/print`}
                        label="In"
                      />
                      {inv.status === 'unpaid' && <MarkPaidButton invoiceId={inv.id} />}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        }
        cards={
          <>
            {rows.map((inv) => (
              <DocCard
                key={inv.id}
                code={inv.code}
                title={inv.customers?.name ?? '—'}
                badge={
                  <span
                    className={`inline-flex rounded-lg px-2 py-0.5 text-xs border shrink-0 ${
                      inv.status === 'paid'
                        ? 'bg-success/10 border-success/30 text-success'
                        : inv.overdue
                          ? 'bg-danger/10 border-danger/30 text-danger'
                          : 'bg-warning/10 border-warning/30 text-warning'
                    }`}
                  >
                    {inv.status === 'paid' ? 'Đã TT' : inv.overdue ? 'Quá hạn' : 'Công nợ'}
                  </span>
                }
                meta={
                  <>
                    <p>Đơn: {inv.sales_orders?.code ?? '—'}</p>
                    <p>
                      PH: {formatDate(inv.issued_on)}
                      {inv.status === 'unpaid' ? ` · ${inv.ageDays} ngày` : ''}
                    </p>
                  </>
                }
                amount={money(Number(inv.total))}
                actions={
                  <div className="inline-flex flex-wrap items-center justify-end gap-2">
                    <PrintButton
                      href={`${base}/sales/invoices/${inv.id}/print`}
                      label="In"
                    />
                    {inv.status === 'unpaid' && <MarkPaidButton invoiceId={inv.id} />}
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
