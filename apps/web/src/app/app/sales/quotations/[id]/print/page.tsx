import { notFound } from 'next/navigation';
import { PrintSheet } from '@/components/sales/print-sheet';
import { formatDate, formatMoney } from '@/lib/format';
import { createServerSupabase, getSessionClaims } from '@/lib/supabase/server';
import { getQuotationById } from '@/services/sales.service';
import { getSalesSettings } from '@/services/tenant-settings.service';

export const dynamic = 'force-dynamic';

const STATUS_LABEL: Record<string, string> = {
  draft: 'Nháp',
  sent: 'Chờ duyệt',
  approved: 'Đã duyệt',
  rejected: 'Từ chối',
  converted: 'Đã chuyển đơn',
};

export default async function PrintQuotationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [supabase, claims, settings] = await Promise.all([
    createServerSupabase(),
    getSessionClaims(),
    getSalesSettings(),
  ]);
  const q = await getQuotationById(supabase, id);
  if (!q) notFound();

  const { data: tenant } = await supabase
    .from('tenants')
    .select('name')
    .eq('id', claims?.tenantId ?? '')
    .maybeSingle();
  const company = (tenant as { name?: string } | null)?.name ?? 'Công ty';
  const money = (n: number) => formatMoney(n, settings.currencyLabel);
  const items = q.quotation_items ?? [];

  return (
    <PrintSheet
      docTitle="BÁO GIÁ"
      docCode={q.code}
      companyName={company}
      meta={[
        { label: 'Khách hàng', value: q.customers?.name ?? '—' },
        { label: 'Ngày tạo', value: formatDate(q.created_at) },
        { label: 'Hiệu lực đến', value: formatDate(q.valid_until) },
        { label: 'Trạng thái', value: STATUS_LABEL[q.status] ?? q.status },
      ]}
      footer={q.notes ? <p>Ghi chú: {q.notes}</p> : null}
    >
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Hàng hóa</th>
            <th>SL</th>
            <th>Đơn giá</th>
            <th>CK%</th>
            <th>Thành tiền</th>
          </tr>
        </thead>
        <tbody>
          {items.map((it, i) => (
            <tr key={it.id}>
              <td>{i + 1}</td>
              <td>{it.product_name}</td>
              <td>{Number(it.qty)}</td>
              <td>{money(Number(it.unit_price))}</td>
              <td>{Number(it.discount_pct)}</td>
              <td>{money(Number(it.line_total))}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-right font-bold text-lg mt-4">
        Tổng: {money(Number(q.total))}
        {Number(q.discount_pct) > 0 ? ` (CK đơn ${q.discount_pct}%)` : ''}
      </p>
    </PrintSheet>
  );
}
