import {
  AlertTriangle,
  FileText,
  ScrollText,
  Users,
  Wallet,
} from 'lucide-react';
import Link from 'next/link';
import { createServerSupabase } from '@/lib/supabase/server';
import { formatMoney } from '@/lib/format';
import { getMyRootModules } from '@/services/sales.service';

export const dynamic = 'force-dynamic';

export default async function WorkspaceDashboard() {
  const supabase = await createServerSupabase();
  const modules = await getMyRootModules(supabase);
  const hasSales = modules.some((m) => m.key === 'kinh-doanh');

  if (!hasSales) {
    return (
      <div className="glass rounded-2xl py-16 text-center">
        <AlertTriangle className="mx-auto text-warning" size={32} aria-hidden />
        <p className="mt-4 font-medium">Chưa có module nào được kích hoạt cho bạn</p>
        <p className="mt-1 text-sm text-ink-muted">
          Liên hệ quản trị công ty để được phân công module, hoặc kiểm tra hợp đồng còn hiệu lực.
        </p>
      </div>
    );
  }

  const today = new Date().toISOString().slice(0, 10);
  const [customers, quotesPending, ordersActive, unpaidInvoices] = await Promise.all([
    supabase.from('customers').select('id', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('quotations').select('id', { count: 'exact', head: true }).in('status', ['draft', 'sent']),
    supabase
      .from('sales_orders')
      .select('id', { count: 'exact', head: true })
      .in('status', ['confirmed', 'delivering']),
    supabase.from('invoices').select('total').eq('status', 'unpaid'),
  ]);
  const unpaidTotal = ((unpaidInvoices.data ?? []) as { total: number }[]).reduce(
    (s, r) => s + Number(r.total),
    0,
  );

  const stats = [
    { label: 'Khách hàng đang hoạt động', value: String(customers.count ?? 0), icon: Users, href: '/app/sales/customers' },
    { label: 'Báo giá chờ xử lý', value: String(quotesPending.count ?? 0), icon: FileText, href: '/app/sales/quotations' },
    { label: 'Đơn hàng đang chạy', value: String(ordersActive.count ?? 0), icon: ScrollText, href: '/app/sales/orders' },
    { label: 'Công nợ phải thu', value: formatMoney(unpaidTotal), icon: Wallet, href: '/app/sales/invoices', warn: unpaidTotal > 0 },
  ];

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Tổng quan</h1>
        <p className="text-sm text-ink-muted mt-1">
          Bức tranh Order-to-Cash của công ty bạn hôm nay ({new Date(today).toLocaleDateString('vi-VN')}).
        </p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {stats.map(({ label, value, icon: Icon, href, warn }) => (
          <Link key={label} href={href} className="glass glass-hover rounded-2xl p-5 flex items-start justify-between">
            <div className="min-w-0">
              <p className="text-sm text-ink-muted">{label}</p>
              <p className={`mt-2 text-2xl font-bold break-words ${warn ? 'text-warning' : 'text-ink'}`}>
                {value}
              </p>
            </div>
            <span
              className={`grid size-11 shrink-0 place-items-center rounded-xl border ${
                warn
                  ? 'bg-warning/10 border-warning/30 text-warning'
                  : 'bg-accent-soft border-accent/25 text-accent'
              }`}
            >
              <Icon size={20} aria-hidden />
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
