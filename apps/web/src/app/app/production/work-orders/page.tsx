import { ClipboardList } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { StatusPill } from '@/components/ui/status-pill';
import { createServerSupabase, getSessionClaims } from '@/lib/supabase/server';
import { listInventoryItems } from '@/services/inventory.service';
import { listWorkOrders } from '@/services/production.service';
import { getMyRootModules } from '@/services/sales.service';
import { CreateWoForm } from './create-wo-form';
import { WorkOrderActions } from './work-order-actions';

export const dynamic = 'force-dynamic';

const STATUS_LABEL: Record<string, string> = {
  draft: 'Nháp',
  released: 'Đã phát hành',
  in_progress: 'Đang làm',
  completed: 'Xong',
  cancelled: 'Huỷ',
};

export default async function WorkOrdersPage() {
  const [supabase, claims] = await Promise.all([
    createServerSupabase(),
    getSessionClaims(),
  ]);
  const base = claims?.tenantSlug ? `/${claims.tenantSlug}` : '/app';
  const modules = await getMyRootModules(supabase);
  if (!modules.some((m) => m.key === 'san-xuat')) {
    return (
      <p className="text-sm text-ink-muted glass rounded-2xl p-6">Chưa mở Sản xuất.</p>
    );
  }

  const [orders, items] = await Promise.all([
    listWorkOrders(supabase),
    listInventoryItems(supabase),
  ]);
  const fgItems = items.filter((i) => i.item_type === 'fg' || i.product_id);

  return (
    <div className="space-y-5">
      <PageHeader
        icon={<ClipboardList size={24} />}
        title="Lệnh sản xuất"
        helpTitle="Lệnh sản xuất"
        help={<p>Phát hành có thể bị chặn nếu thiếu nguyên liệu (tuỳ Cài đặt).</p>}
      />

      <CreateWoForm
        fgItems={fgItems.map((i) => ({ id: i.id, label: `${i.sku} — ${i.name}` }))}
      />

      <section className="glass rounded-2xl overflow-hidden">
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-ink-muted border-b border-panel/40 bg-app/30">
              <tr>
                <th className="px-4 py-3 font-medium">Mã</th>
                <th className="px-4 py-3 font-medium">Thành phẩm</th>
                <th className="px-4 py-3 font-medium">Kế hoạch / Đã làm</th>
                <th className="px-4 py-3 font-medium">Hẹn xong</th>
                <th className="px-4 py-3 font-medium">Trạng thái</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} className="border-b border-panel/20 align-top">
                  <td className="px-4 py-3 font-mono font-medium">{o.code}</td>
                  <td className="px-4 py-3">
                    {o.inventory_items?.sku ?? '—'}
                    <span className="block text-xs text-ink-muted">
                      {o.inventory_items?.name}
                    </span>
                  </td>
                  <td className="px-4 py-3 tabular-nums">
                    {o.qty_planned} / {o.qty_completed}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{o.planned_end ?? '—'}</td>
                  <td className="px-4 py-3">
                    <StatusPill status={o.status} label={STATUS_LABEL[o.status] ?? o.status} />
                  </td>
                  <td className="px-4 py-3">
                    <WorkOrderActions
                      workOrderId={o.id}
                      status={o.status}
                      qtyPlanned={Number(o.qty_planned)}
                      qtyCompleted={Number(o.qty_completed)}
                    />
                  </td>
                </tr>
              ))}
              {orders.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-ink-muted">
                    Chưa có lệnh.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <ul className="lg:hidden divide-y divide-panel/30">
          {orders.map((o) => (
            <li key={o.id} className="p-4 space-y-2">
              <div className="flex justify-between gap-2">
                <p className="font-mono font-semibold">{o.code}</p>
                <StatusPill status={o.status} label={STATUS_LABEL[o.status] ?? o.status} />
              </div>
              <p className="text-sm text-ink-muted">
                {o.inventory_items?.name} · {o.qty_completed}/{o.qty_planned}
              </p>
              <WorkOrderActions
                workOrderId={o.id}
                status={o.status}
                qtyPlanned={Number(o.qty_planned)}
                qtyCompleted={Number(o.qty_completed)}
              />
            </li>
          ))}
        </ul>
      </section>
      <p className="text-xs">
        <a href={`${base}/production`} className="text-accent hover:underline">
          ← Sản xuất
        </a>
      </p>
    </div>
  );
}
