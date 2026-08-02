import Link from 'next/link';
import { Users } from 'lucide-react';
import { createServerSupabase, getSessionClaims } from '@/lib/supabase/server';
import { formatMoney } from '@/lib/format';
import { DocSearchBar } from '@/components/sales/doc-search';
import { DocCard, ResponsiveDocList } from '@/components/sales/responsive-doc-list';
import { getOutstandingByCustomer, listCustomers } from '@/services/sales.service';
import { getSalesSettings } from '@/services/tenant-settings.service';
import { CustomerDialog } from './customer-dialog';

export const dynamic = 'force-dynamic';

const KIND_LABEL: Record<string, string> = {
  b2b: 'B2B',
  b2c: 'B2C',
  'dai-ly': 'Đại lý',
};

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q: rawQ } = await searchParams;
  const q = (rawQ ?? '').trim().toLowerCase();
  const [supabase, claims] = await Promise.all([createServerSupabase(), getSessionClaims()]);
  const base = claims?.tenantSlug ? `/${claims.tenantSlug}` : '/app';
  const [customersAll, outstanding, salesSettings] = await Promise.all([
    listCustomers(supabase),
    getOutstandingByCustomer(supabase),
    getSalesSettings(),
  ]);
  const money = (n: number) => formatMoney(n, salesSettings.currencyLabel);
  const customers = q
    ? customersAll.filter((c) =>
        `${c.code} ${c.name} ${c.tax_code ?? ''}`.toLowerCase().includes(q),
      )
    : customersAll;

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
          <Users className="text-accent" size={22} aria-hidden />
          Khách hàng
        </h1>
        <CustomerDialog />
      </header>

      <DocSearchBar
        baseHref={`${base}/sales/customers`}
        initialQ={rawQ ?? ''}
        placeholder="Tìm mã, tên, MST…"
      />

      <ResponsiveDocList
        empty={customers.length === 0}
        emptyState={
          <div className="py-16 text-center">
            <Users className="mx-auto text-ink-muted/50" size={32} aria-hidden />
            <p className="mt-4 text-ink-muted">Chưa có khách hàng nào.</p>
          </div>
        }
        table={
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-panel/40 text-left text-ink-muted">
                <th className="px-5 py-3.5 font-medium">Mã</th>
                <th className="px-5 py-3.5 font-medium">Tên khách hàng</th>
                <th className="px-5 py-3.5 font-medium">Loại</th>
                <th className="px-5 py-3.5 font-medium hidden lg:table-cell">Liên hệ</th>
                <th className="px-5 py-3.5 font-medium text-right hidden xl:table-cell">
                  Hạn mức
                </th>
                <th className="px-5 py-3.5 font-medium text-right">Công nợ</th>
                <th className="px-5 py-3.5 font-medium">Trạng thái</th>
                <th className="px-5 py-3.5" aria-label="Thao tác" />
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => {
                const debt = outstanding.get(c.id) ?? 0;
                const overLimit = c.credit_limit !== null && debt > Number(c.credit_limit);
                return (
                  <tr
                    key={c.id}
                    className="border-b border-panel/20 last:border-0 hover:bg-glass-strong/40 transition-colors"
                  >
                    <td className="px-5 py-3.5 font-mono text-xs text-accent">{c.code}</td>
                    <td className="px-5 py-3.5">
                      <Link
                        href={`${base}/sales/customers/${c.id}`}
                        className="font-medium text-accent hover:underline"
                      >
                        {c.name}
                      </Link>
                      {c.tax_code && (
                        <p className="text-xs text-ink-muted">MST: {c.tax_code}</p>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="inline-flex rounded-lg bg-accent-soft border border-accent/25 px-2 py-0.5 text-xs text-accent">
                        {KIND_LABEL[c.kind] ?? c.kind}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-ink-muted hidden lg:table-cell">
                      <p className="text-xs">{c.attributes.phone || '—'}</p>
                      <p className="text-xs">{c.attributes.email || ''}</p>
                    </td>
                    <td className="px-5 py-3.5 text-right tabular-nums hidden xl:table-cell">
                      {c.credit_limit === null ? (
                        <span className="text-ink-muted">Không giới hạn</span>
                      ) : (
                        money(Number(c.credit_limit))
                      )}
                    </td>
                    <td
                      className={`px-5 py-3.5 text-right tabular-nums font-medium ${
                        overLimit ? 'text-danger' : debt > 0 ? 'text-warning' : 'text-ink-muted'
                      }`}
                    >
                      {money(debt)}
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`inline-flex rounded-lg px-2 py-0.5 text-xs border ${
                          c.status === 'active'
                            ? 'bg-success/10 border-success/30 text-success'
                            : 'bg-glass-strong border-panel/50 text-ink-muted'
                        }`}
                      >
                        {c.status === 'active' ? 'Hoạt động' : 'Ngưng'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <CustomerDialog customer={c} trigger="icon" />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        }
        cards={
          <>
            {customers.map((c) => {
              const debt = outstanding.get(c.id) ?? 0;
              return (
                <DocCard
                  key={c.id}
                  code={c.code}
                  title={c.name}
                  badge={
                    <span className="inline-flex rounded-lg bg-accent-soft border border-accent/25 px-2 py-0.5 text-xs text-accent">
                      {KIND_LABEL[c.kind] ?? c.kind}
                    </span>
                  }
                  meta={
                    <>
                      <p>
                        <Link
                          href={`${base}/sales/customers/${c.id}`}
                          className="text-accent hover:underline"
                        >
                          Xem timeline
                        </Link>
                      </p>
                      <p>{c.attributes.phone || '—'}</p>
                    </>
                  }
                  amount={money(debt)}
                  actions={<CustomerDialog customer={c} trigger="icon" />}
                />
              );
            })}
          </>
        }
      />
    </div>
  );
}
