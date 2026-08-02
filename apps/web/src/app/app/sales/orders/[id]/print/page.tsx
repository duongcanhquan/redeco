import { notFound } from 'next/navigation';
import { PrintSheet } from '@/components/sales/print-sheet';
import { formatDate, formatMoney } from '@/lib/format';
import { createServerSupabase, getSessionClaims } from '@/lib/supabase/server';
import { getSalesOrderById } from '@/services/sales.service';
import { getSalesSettings } from '@/services/tenant-settings.service';

export const dynamic = 'force-dynamic';

const STATUS_LABEL: Record<string, string> = {
  draft: 'Nháp',
  confirmed: 'Đã xác nhận',
  delivering: 'Đang giao',
  completed: 'Hoàn tất',
  cancelled: 'Đã hủy',
};

export default async function PrintOrderPage({
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
  const o = await getSalesOrderById(supabase, id);
  if (!o) notFound();

  const { data: tenant } = await supabase
    .from('tenants')
    .select('name')
    .eq('id', claims?.tenantId ?? '')
    .maybeSingle();
  const company = (tenant as { name?: string } | null)?.name ?? 'Công ty';
  const money = (n: number) => formatMoney(n, settings.currencyLabel);
  const items = o.sales_order_items ?? [];

  return (
    <PrintSheet
      docTitle="ĐƠN HÀNG"
      docCode={o.code}
      companyName={company}
      meta={[
        { label: 'Khách hàng', value: o.customers?.name ?? '—' },
        { label: 'Ngày tạo', value: formatDate(o.created_at) },
        { label: 'Giao dự kiến', value: formatDate(o.expected_delivery_date) },
        { label: 'Trạng thái', value: STATUS_LABEL[o.status] ?? o.status },
      ]}
      footer={o.notes ? <p>Ghi chú: {o.notes}</p> : null}
    >
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Hàng hóa</th>
            <th>SL</th>
            <th>Đơn giá</th>
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
              <td>{money(Number(it.line_total))}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-right font-bold text-lg mt-4">
        Tổng: {money(Number(o.total))}
        {Number(o.discount_pct) > 0 ? ` (CK đơn ${o.discount_pct}%)` : ''}
      </p>
    </PrintSheet>
  );
}
