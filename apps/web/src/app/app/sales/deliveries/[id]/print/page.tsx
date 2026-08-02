import { notFound } from 'next/navigation';
import { PrintSheet } from '@/components/sales/print-sheet';
import { formatDate } from '@/lib/format';
import { createServerSupabase, getSessionClaims } from '@/lib/supabase/server';
import { getDeliveryById, getSalesOrderById } from '@/services/sales.service';

export const dynamic = 'force-dynamic';

const STATUS_LABEL: Record<string, string> = {
  pending: 'Chờ xuất kho',
  shipped: 'Đã xuất kho',
};

export default async function PrintDeliveryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [supabase, claims] = await Promise.all([
    createServerSupabase(),
    getSessionClaims(),
  ]);
  const d = await getDeliveryById(supabase, id);
  if (!d) notFound();

  const order = await getSalesOrderById(supabase, d.sales_order_id);
  const { data: tenant } = await supabase
    .from('tenants')
    .select('name')
    .eq('id', claims?.tenantId ?? '')
    .maybeSingle();
  const company = (tenant as { name?: string } | null)?.name ?? 'Công ty';
  const customer =
    d.sales_orders?.customers?.name ?? order?.customers?.name ?? '—';
  const items = order?.sales_order_items ?? [];

  return (
    <PrintSheet
      docTitle="PHIẾU GIAO HÀNG"
      docCode={d.code}
      companyName={company}
      meta={[
        { label: 'Khách hàng', value: customer },
        { label: 'Đơn hàng', value: d.sales_orders?.code ?? order?.code ?? '—' },
        { label: 'Ngày xuất', value: formatDate(d.shipped_at ?? d.created_at) },
        { label: 'Trạng thái', value: STATUS_LABEL[d.status] ?? d.status },
      ]}
      footer={d.notes ? <p>Ghi chú: {d.notes}</p> : null}
    >
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Hàng hóa</th>
            <th>SL giao</th>
          </tr>
        </thead>
        <tbody>
          {items.map((it, i) => (
            <tr key={it.id}>
              <td>{i + 1}</td>
              <td>{it.product_name}</td>
              <td>{Number(it.qty)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </PrintSheet>
  );
}
