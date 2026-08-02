import Link from 'next/link';
import { ArrowLeft, History, Users } from 'lucide-react';
import { notFound } from 'next/navigation';
import { formatDate, formatMoney } from '@/lib/format';
import { getSessionClaims } from '@/lib/supabase/server';
import { getCustomerDetail } from '@/services/sales.service';

export const dynamic = 'force-dynamic';

const KIND_LABEL: Record<string, string> = {
  b2b: 'B2B',
  b2c: 'B2C',
  'dai-ly': 'Đại lý',
};

const KIND_EVENT: Record<string, string> = {
  quotation: 'Báo giá',
  sales_order: 'Đơn hàng',
  delivery: 'Giao hàng',
  invoice: 'Hóa đơn',
  payment: 'Thanh toán',
};

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [detail, claims] = await Promise.all([getCustomerDetail(id), getSessionClaims()]);
  if (!detail) notFound();

  const base = claims?.tenantSlug ? `/${claims.tenantSlug}` : '/app';
  const { customer, outstanding, timeline } = detail;
  const overLimit =
    customer.credit_limit !== null && outstanding > Number(customer.credit_limit);

  return (
    <div className="space-y-6 max-w-4xl">
      <header className="space-y-3">
        <Link
          href={`${base}/sales/customers`}
          className="inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-accent transition-colors"
        >
          <ArrowLeft size={16} aria-hidden />
          Quay lại danh sách
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Users className="text-accent" size={24} aria-hidden />
              {customer.name}
            </h1>
            <p className="text-sm text-ink-muted mt-1 font-mono">
              {customer.code} · {KIND_LABEL[customer.kind] ?? customer.kind}
            </p>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              customer.status === 'active'
                ? 'bg-success/10 text-success'
                : 'bg-warning/10 text-warning'
            }`}
          >
            {customer.status === 'active' ? 'Đang hoạt động' : 'Ngưng'}
          </span>
        </div>
      </header>

      <section className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="glass rounded-2xl p-4">
          <p className="text-xs text-ink-muted">Hạn mức tín dụng</p>
          <p className="mt-1 font-semibold tabular-nums">
            {customer.credit_limit === null
              ? 'Không giới hạn'
              : formatMoney(Number(customer.credit_limit))}
          </p>
        </div>
        <div className="glass rounded-2xl p-4">
          <p className="text-xs text-ink-muted">Công nợ phải thu</p>
          <p
            className={`mt-1 font-semibold tabular-nums ${overLimit ? 'text-danger' : ''}`}
          >
            {formatMoney(outstanding)}
          </p>
        </div>
        <div className="glass rounded-2xl p-4">
          <p className="text-xs text-ink-muted">Liên hệ</p>
          <p className="mt-1 text-sm truncate">{customer.attributes.phone || '—'}</p>
          <p className="text-xs text-ink-muted truncate">{customer.attributes.email || ''}</p>
        </div>
      </section>

      <section className="glass rounded-2xl p-5 space-y-4">
        <h2 className="font-semibold flex items-center gap-2">
          <History size={18} className="text-accent" aria-hidden />
          Lịch sử giao dịch
        </h2>
        {timeline.length === 0 ? (
          <p className="text-sm text-ink-muted py-8 text-center">Chưa có giao dịch nào.</p>
        ) : (
          <ol className="relative border-l border-panel/50 ml-2 space-y-4">
            {timeline.map((ev) => (
              <li key={`${ev.kind}-${ev.id}`} className="pl-5 relative">
                <span
                  aria-hidden
                  className="absolute -left-1.5 top-1.5 size-3 rounded-full bg-accent shadow-[0_0_8px_rgba(0,238,255,0.5)]"
                />
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium">{ev.title}</p>
                    <p className="text-xs text-ink-muted">
                      {KIND_EVENT[ev.kind] ?? ev.kind} · {ev.status}
                    </p>
                  </div>
                  <div className="text-right">
                    {ev.amount !== null && (
                      <p className="text-sm font-medium tabular-nums">{formatMoney(ev.amount)}</p>
                    )}
                    <p className="text-xs text-ink-muted">{formatDate(ev.at.slice(0, 10))}</p>
                  </div>
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
