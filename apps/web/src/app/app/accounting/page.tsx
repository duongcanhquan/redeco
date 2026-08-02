import Link from 'next/link';
import {
  Calculator,
  RefreshCw,
  Settings,
  Wallet,
  Clock,
  AlertTriangle,
  CircleDollarSign,
  Package,
} from 'lucide-react';
import { daysPastDue } from '@optimake/domain';
import { BentoBarChart, BentoStackBars } from '@/components/sales/bento-charts';
import { FlowSteps } from '@/components/ui/flow-steps';
import { PageHeader } from '@/components/ui/page-header';
import { StatTile } from '@/components/ui/stat-tile';
import { StatusPill } from '@/components/ui/status-pill';
import { formatMoney } from '@/lib/format';
import { createServerSupabase, getSessionClaims } from '@/lib/supabase/server';
import {
  arAgingBuckets,
  listArInvoices,
  listValuationEntries,
  processPendingAccountingOutbox,
} from '@/services/accounting.service';
import { getMyRootModules } from '@/services/sales.service';
import { getAccountingSettings, getSalesSettings } from '@/services/tenant-settings.service';

export const dynamic = 'force-dynamic';

const STATUS_LABEL: Record<string, string> = {
  open: 'Chưa thu',
  partial: 'Thu một phần',
  paid: 'Đã thu',
  void: 'Huỷ',
};

export default async function AccountingHubPage() {
  const [supabase, claims] = await Promise.all([
    createServerSupabase(),
    getSessionClaims(),
  ]);
  const base = claims?.tenantSlug ? `/${claims.tenantSlug}` : '/app';
  const modules = await getMyRootModules(supabase);
  const hasKt = modules.some((m) => m.key === 'ke-toan');

  if (!hasKt) {
    return (
      <div className="glass rounded-2xl py-16 text-center max-w-lg mx-auto">
        <Calculator className="mx-auto text-warning" size={32} aria-hidden />
        <p className="mt-4 font-medium">Chưa mở Kế toán</p>
        <p className="mt-1 text-sm text-ink-muted px-4">
          Công ty có thể chỉ dùng Bán hàng / Kho — không bắt buộc mở Kế toán.
        </p>
      </div>
    );
  }

  const sync = await processPendingAccountingOutbox();
  const [settings, salesSettings, arRows] = await Promise.all([
    getAccountingSettings(),
    getSalesSettings(),
    listArInvoices(supabase),
  ]);
  const valuations = settings.cogsEnabled ? await listValuationEntries(supabase) : [];
  const asOf = new Date().toISOString().slice(0, 10);
  const aging = arAgingBuckets(arRows, asOf);
  const currency = salesSettings.currencyLabel;
  const openRows = arRows.filter((r) => r.status === 'open' || r.status === 'partial');
  const paidRows = arRows.filter((r) => r.status === 'paid');

  return (
    <div className="space-y-5">
      <PageHeader
        icon={<Calculator size={24} />}
        title="Kế toán"
        helpTitle="Màn này làm gì?"
        help={
          <>
            <p>Theo dõi tiền khách còn nợ theo hóa đơn bán hàng.</p>
            <p>Có thể bật thêm giá vốn từ phiếu xuất kho — không bắt buộc.</p>
            <p>Chỉnh bật/tắt từng phần ở Cài đặt.</p>
          </>
        }
        actions={
          <Link
            href={`${base}/settings?tab=accounting`}
            className="inline-flex items-center gap-2 h-11 px-3 rounded-xl border border-panel/40 text-sm hover:border-accent/40"
          >
            <Settings size={16} aria-hidden />
            Cài đặt
          </Link>
        }
      />

      {sync.ok && sync.data.processed > 0 && (
        <p className="text-sm text-success glass rounded-xl px-4 py-3 flex items-center gap-2">
          <RefreshCw size={16} aria-hidden />
          Vừa cập nhật {sync.data.processed} hóa đơn từ Bán hàng.
        </p>
      )}

      {!settings.arEnabled ? (
        <p className="text-sm text-warning glass rounded-xl px-4 py-3">
          Theo dõi công nợ đang tắt. Bật lại ở Cài đặt → Kế toán.
        </p>
      ) : (
        <>
          <FlowSteps
            ariaLabel="Phân loại tuổi nợ theo số hóa đơn"
            steps={[
              {
                key: 'ok',
                label: 'Còn hạn',
                icon: <Clock size={18} />,
                count: aging.nCurrent,
                tone: 'success',
              },
              {
                key: 'd30',
                label: 'Quá 1–30 ngày',
                icon: <AlertTriangle size={18} />,
                count: aging.n1_30,
                tone: aging.n1_30 > 0 ? 'warning' : 'default',
              },
              {
                key: 'd60',
                label: 'Quá 31–60',
                icon: <AlertTriangle size={18} />,
                count: aging.n31_60,
                tone: aging.n31_60 > 0 ? 'warning' : 'default',
              },
              {
                key: 'late',
                label: 'Quá 60+',
                icon: <CircleDollarSign size={18} />,
                count: aging.n60p,
                tone: aging.n60p > 0 ? 'danger' : 'default',
              },
            ]}
          />

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatTile
              icon={<Wallet size={18} />}
              label="Còn hạn"
              value={formatMoney(aging.current, currency)}
            />
            <StatTile
              icon={<AlertTriangle size={18} />}
              label="Quá 1–30 ngày"
              value={formatMoney(aging.d1_30, currency)}
              tone={aging.d1_30 > 0 ? 'warning' : 'default'}
            />
            <StatTile
              icon={<AlertTriangle size={18} />}
              label="Quá 31–60 ngày"
              value={formatMoney(aging.d31_60, currency)}
              tone={aging.d31_60 > 0 ? 'warning' : 'default'}
            />
            <StatTile
              icon={<CircleDollarSign size={18} />}
              label="Quá trên 60 ngày"
              value={formatMoney(aging.d60p, currency)}
              tone={aging.d60p > 0 ? 'danger' : 'default'}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <section className="glass rounded-2xl p-4">
              <h2 className="text-sm font-semibold mb-2">Tuổi nợ (tiền)</h2>
              <BentoBarChart
                ariaLabel="Biểu đồ tuổi nợ"
                points={[
                  { label: 'Còn hạn', amount: aging.current },
                  { label: '1–30', amount: aging.d1_30 },
                  { label: '31–60', amount: aging.d31_60 },
                  { label: '60+', amount: aging.d60p },
                ]}
              />
            </section>
            <section className="glass rounded-2xl p-4">
              <h2 className="text-sm font-semibold mb-2">Trạng thái hóa đơn</h2>
              <BentoStackBars
                ariaLabel="Phân loại hóa đơn"
                slices={[
                  { key: 'o', label: 'Chưa thu', count: openRows.length, tone: 'warning' },
                  { key: 'p', label: 'Đã thu', count: paidRows.length, tone: 'success' },
                ]}
              />
            </section>
          </div>

          <section className="glass rounded-2xl overflow-hidden">
            <div className="px-4 py-3 border-b border-panel/40 flex items-center gap-2">
              <Wallet size={18} className="text-accent" aria-hidden />
              <h2 className="font-semibold">Công nợ khách</h2>
            </div>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-ink-muted border-b border-panel/30 bg-app/30">
                  <tr>
                    <th className="px-4 py-3 font-medium">Mã HĐ</th>
                    <th className="px-4 py-3 font-medium">Khách hàng</th>
                    <th className="px-4 py-3 font-medium">Số tiền</th>
                    <th className="px-4 py-3 font-medium">Đến hạn</th>
                    <th className="px-4 py-3 font-medium">Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {arRows.map((r) => {
                    const overdue = daysPastDue(r.due_on, asOf);
                    return (
                      <tr key={r.id} className="border-b border-panel/20">
                        <td className="px-4 py-3 font-mono font-medium">{r.code}</td>
                        <td className="px-4 py-3">{r.customers?.name ?? '—'}</td>
                        <td className="px-4 py-3 tabular-nums font-semibold">
                          {formatMoney(Number(r.amount), currency)}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs">
                          {r.due_on}
                          {r.status !== 'paid' && overdue > 0 && (
                            <span className="block text-danger font-sans">Muộn {overdue} ngày</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <StatusPill
                            status={r.status}
                            label={STATUS_LABEL[r.status] ?? r.status}
                          />
                        </td>
                      </tr>
                    );
                  })}
                  {arRows.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-10 text-center text-ink-muted">
                        Chưa có dữ liệu — xuất hóa đơn ở Bán hàng rồi quay lại đây.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <ul className="md:hidden divide-y divide-panel/30">
              {arRows.map((r) => (
                <li key={r.id} className="p-4 space-y-1">
                  <div className="flex justify-between gap-2">
                    <p className="font-mono font-semibold">{r.code}</p>
                    <StatusPill status={r.status} label={STATUS_LABEL[r.status] ?? r.status} />
                  </div>
                  <p className="text-sm text-ink-muted">{r.customers?.name}</p>
                  <p className="font-semibold tabular-nums">
                    {formatMoney(Number(r.amount), currency)}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}

      {settings.cogsEnabled ? (
        <section className="glass rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-panel/40 flex items-center gap-2">
            <Package size={18} className="text-accent" aria-hidden />
            <h2 className="font-semibold">Giá vốn (từ xuất kho)</h2>
          </div>
          {valuations.length === 0 ? (
            <p className="px-4 py-8 text-sm text-ink-muted text-center">
              Chưa có — cần phiếu xuất đã ghi sổ ở Kho.
            </p>
          ) : (
            <ul className="divide-y divide-panel/30">
              {valuations.slice(0, 12).map((v) => (
                <li key={v.id} className="px-4 py-3 flex justify-between gap-3 text-sm">
                  <span>
                    <span className="font-medium">
                      {v.inventory_items?.sku ?? '—'} · {v.inventory_items?.name}
                    </span>
                    <span className="block text-xs text-ink-muted">SL {v.qty}</span>
                  </span>
                  <span className="tabular-nums font-semibold shrink-0">
                    {formatMoney(Number(v.amount), currency)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}
    </div>
  );
}
