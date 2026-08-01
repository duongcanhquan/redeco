import { Users } from 'lucide-react';
import { createServerSupabase } from '@/lib/supabase/server';
import { formatMoney } from '@/lib/format';
import { getOutstandingByCustomer, listCustomers } from '@/services/sales.service';
import { CustomerDialog } from './customer-dialog';

export const dynamic = 'force-dynamic';

const KIND_LABEL: Record<string, string> = {
  b2b: 'B2B',
  b2c: 'B2C',
  'dai-ly': 'Đại lý',
};

export default async function CustomersPage() {
  const supabase = await createServerSupabase();
  const [customers, outstanding] = await Promise.all([
    listCustomers(supabase),
    getOutstandingByCustomer(supabase),
  ]);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="text-accent" size={24} aria-hidden />
            Khách hàng
          </h1>
          <p className="text-sm text-ink-muted mt-1">
            Đối tác, hạn mức tín dụng và công nợ phải thu (từ hóa đơn chưa thanh toán).
          </p>
        </div>
        <CustomerDialog />
      </header>

      <section className="glass rounded-2xl overflow-hidden">
        {customers.length === 0 ? (
          <div className="py-16 text-center">
            <Users className="mx-auto text-ink-muted/50" size={32} aria-hidden />
            <p className="mt-4 text-ink-muted">Chưa có khách hàng nào.</p>
            <p className="text-sm text-ink-muted/70">
              Bấm “Thêm khách hàng” để bắt đầu quy trình bán hàng.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-panel/40 text-left text-ink-muted">
                  <th className="px-5 py-3.5 font-medium">Mã</th>
                  <th className="px-5 py-3.5 font-medium">Tên khách hàng</th>
                  <th className="px-5 py-3.5 font-medium">Loại</th>
                  <th className="px-5 py-3.5 font-medium">Liên hệ</th>
                  <th className="px-5 py-3.5 font-medium text-right">Hạn mức</th>
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
                    <tr key={c.id} className="border-b border-panel/20 last:border-0 hover:bg-glass-strong/40 transition-colors">
                      <td className="px-5 py-3.5 font-mono text-xs text-accent">{c.code}</td>
                      <td className="px-5 py-3.5">
                        <p className="font-medium">{c.name}</p>
                        {c.tax_code && <p className="text-xs text-ink-muted">MST: {c.tax_code}</p>}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="inline-flex rounded-lg bg-accent-soft border border-accent/25 px-2 py-0.5 text-xs text-accent">
                          {KIND_LABEL[c.kind] ?? c.kind}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-ink-muted">
                        <p className="text-xs">{c.attributes.phone || '—'}</p>
                        <p className="text-xs">{c.attributes.email || ''}</p>
                      </td>
                      <td className="px-5 py-3.5 text-right tabular-nums">
                        {c.credit_limit === null ? (
                          <span className="text-ink-muted">Không giới hạn</span>
                        ) : (
                          formatMoney(Number(c.credit_limit))
                        )}
                      </td>
                      <td
                        className={`px-5 py-3.5 text-right tabular-nums font-medium ${
                          overLimit ? 'text-danger' : debt > 0 ? 'text-warning' : 'text-ink-muted'
                        }`}
                      >
                        {formatMoney(debt)}
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
          </div>
        )}
      </section>
    </div>
  );
}
