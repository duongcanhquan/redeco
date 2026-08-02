import { notFound } from 'next/navigation';
import { PrintSheet } from '@/components/sales/print-sheet';
import { formatDate, formatMoney } from '@/lib/format';
import { createServerSupabase, getSessionClaims } from '@/lib/supabase/server';
import { getInvoiceById, getSalesOrderById } from '@/services/sales.service';
import { getSalesSettings } from '@/services/tenant-settings.service';

export const dynamic = 'force-dynamic';

export default async function PrintInvoicePage({
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
  const inv = await getInvoiceById(supabase, id);
  if (!inv) notFound();

  const order = await getSalesOrderById(supabase, inv.sales_order_id);
  const { data: tenant } = await supabase
    .from('tenants')
    .select('name')
    .eq('id', claims?.tenantId ?? '')
    .maybeSingle();
  const company = (tenant as { name?: string } | null)?.name ?? 'Công ty';
  const money = (n: number) => formatMoney(n, settings.currencyLabel);
  const items = order?.sales_order_items ?? [];

  return (
    <PrintSheet
      docTitle="HÓA ĐƠN"
      docCode={inv.code}
      companyName={company}
      meta={[
        { label: 'Khách hàng', value: inv.customers?.name ?? '—' },
        { label: 'Đơn hàng', value: inv.sales_orders?.code ?? order?.code ?? '—' },
        { label: 'Ngày phát hành', value: formatDate(inv.issued_on) },
        {
          label: 'Thanh toán',
          value: inv.status === 'paid' ? `Đã thu ${formatDate(inv.paid_at)}` : 'Chưa thu',
        },
      ]}
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
      <p className="text-right font-bold text-lg mt-4">Tổng thanh toán: {money(Number(inv.total))}</p>
    </PrintSheet>
  );
}
