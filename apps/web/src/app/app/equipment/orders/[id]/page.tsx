import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Wrench } from 'lucide-react';
import { StatusPill } from '@/components/ui/status-pill';
import { createServerSupabase, getSessionClaims } from '@/lib/supabase/server';
import { listInventoryItems, listWarehouses } from '@/services/inventory.service';
import { getMaintenanceOrder } from '@/services/maintenance.service';
import { getWorkspaceNavContext } from '@/services/module-access.service';
import { OrderControls } from './order-controls';
import { PartsPanel } from './parts-panel';

export const dynamic = 'force-dynamic';

const STATUS_LABEL: Record<string, string> = {
  draft: 'Nháp',
  released: 'Phát hành',
  in_progress: 'Đang làm',
  completed: 'Xong',
  cancelled: 'Huỷ',
};

const KIND_LABEL: Record<string, string> = {
  corrective: 'Sửa chữa',
  preventive: 'Định kỳ',
  inspection: 'Kiểm tra',
};

export default async function MaintenanceOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [supabase, nav, claims] = await Promise.all([
    createServerSupabase(),
    getWorkspaceNavContext(),
    getSessionClaims(),
  ]);
  const base = claims?.tenantSlug ? `/${claims.tenantSlug}` : '/app';
  const order = await getMaintenanceOrder(supabase, id);
  if (!order) notFound();

  const tasks = order.eam_maintenance_tasks ?? [];
  const partLines = order.eam_maintenance_part_lines ?? [];
  const canManage = nav?.isManager ?? false;

  let items: { id: string; sku: string; name: string }[] = [];
  let warehouses: { id: string; code: string; name: string }[] = [];
  try {
    const [itemRows, whRows] = await Promise.all([
      listInventoryItems(supabase),
      listWarehouses(supabase),
    ]);
    items = itemRows
      .filter((i) => i.is_active)
      .map((i) => ({ id: i.id, sku: i.sku, name: i.name }));
    warehouses = whRows
      .filter((w) => w.is_active)
      .map((w) => ({ id: w.id, code: w.code, name: w.name }));
  } catch {
    // Không có quyền đọc Kho / chưa có dữ liệu
  }

  return (
    <div className="space-y-5 max-w-3xl">
      <Link
        href={`${base}/equipment/orders`}
        className="inline-flex items-center gap-2 text-sm text-ink-muted hover:text-accent min-h-11"
      >
        <ArrowLeft size={16} aria-hidden />
        Lệnh bảo trì
      </Link>

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Wrench className="text-accent" size={24} aria-hidden />
            {order.code}
          </h1>
          <p className="text-sm text-ink-muted mt-1">{order.title}</p>
          <p className="text-sm text-ink-muted mt-1">
            {order.eam_equipment?.code} — {order.eam_equipment?.name} ·{' '}
            {KIND_LABEL[order.kind] ?? order.kind}
          </p>
        </div>
        <StatusPill status={order.status} label={STATUS_LABEL[order.status] ?? order.status} />
      </header>

      <section className="glass rounded-2xl p-4 space-y-3">
        <h2 className="font-semibold">Checklist</h2>
        <OrderControls
          orderId={order.id}
          status={order.status}
          canManage={canManage}
          tasks={tasks.map((t) => ({
            id: t.id,
            title: t.title,
            is_done: t.is_done,
          }))}
        />
      </section>

      <PartsPanel
        orderId={order.id}
        canManage={canManage}
        canIssue={order.status === 'released' || order.status === 'in_progress'}
        parts={partLines.map((p) => ({
          id: p.id,
          sku: p.inventory_items?.sku ?? '—',
          name: p.inventory_items?.name ?? '',
          qty_planned: Number(p.qty_planned),
          qty_issued: Number(p.qty_issued),
          status: p.status,
          warehouseCode: p.warehouses?.code ?? '—',
        }))}
        items={items}
        warehouses={warehouses}
      />

      {order.downtime_minutes > 0 ? (
        <p className="text-sm text-ink-muted">Thời gian dừng: {order.downtime_minutes} phút</p>
      ) : null}
    </div>
  );
}
