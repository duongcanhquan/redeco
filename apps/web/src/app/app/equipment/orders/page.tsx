import Link from 'next/link';
import { Wrench } from 'lucide-react';
import { DocCard, ResponsiveDocList } from '@/components/sales/responsive-doc-list';
import { StatusPill } from '@/components/ui/status-pill';
import { createServerSupabase, getSessionClaims } from '@/lib/supabase/server';
import { listEquipment, listMaintenanceOrders } from '@/services/maintenance.service';
import { getWorkspaceNavContext } from '@/services/module-access.service';
import { OrderDialog } from './order-dialog';

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

export default async function MaintenanceOrdersPage() {
  const [supabase, nav, claims] = await Promise.all([
    createServerSupabase(),
    getWorkspaceNavContext(),
    getSessionClaims(),
  ]);
  const base = claims?.tenantSlug ? `/${claims.tenantSlug}` : '/app';
  const canManage = nav?.isManager ?? false;
  const [orders, equipment] = await Promise.all([
    listMaintenanceOrders(supabase),
    listEquipment(supabase),
  ]);

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Wrench className="text-accent" size={24} aria-hidden />
            Lệnh bảo trì
          </h1>
          <p className="text-sm text-ink-muted mt-1">Theo dõi sửa chữa / PM / kiểm tra.</p>
        </div>
        {canManage ? (
          <OrderDialog
            equipment={equipment.map((e) => ({
              id: e.id,
              code: e.code,
              name: e.name,
            }))}
          />
        ) : null}
      </header>

      <ResponsiveDocList
        empty={orders.length === 0}
        emptyState={
          <div className="py-16 text-center">
            <Wrench className="mx-auto text-ink-muted/50" size={32} aria-hidden />
            <p className="mt-4 text-ink-muted">Chưa có lệnh bảo trì.</p>
          </div>
        }
        table={
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-panel/40 text-left text-ink-muted">
                <th className="py-3 pr-3 font-medium">Mã</th>
                <th className="py-3 pr-3 font-medium">Tiêu đề</th>
                <th className="py-3 pr-3 font-medium hidden md:table-cell">Thiết bị</th>
                <th className="py-3 pr-3 font-medium hidden lg:table-cell">Loại</th>
                <th className="py-3 font-medium">TT</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} className="border-b border-panel/20">
                  <td className="py-3 pr-3">
                    <Link
                      href={`${base}/equipment/orders/${o.id}`}
                      className="font-mono text-xs text-accent hover:underline"
                    >
                      {o.code}
                    </Link>
                  </td>
                  <td className="py-3 pr-3 font-medium">{o.title || '—'}</td>
                  <td className="py-3 pr-3 hidden md:table-cell text-ink-muted">
                    {o.eam_equipment?.code ?? '—'}
                  </td>
                  <td className="py-3 pr-3 hidden lg:table-cell text-ink-muted">
                    {KIND_LABEL[o.kind] ?? o.kind}
                  </td>
                  <td className="py-3">
                    <StatusPill
                      status={o.status}
                      label={STATUS_LABEL[o.status] ?? o.status}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        }
        cards={
          <>
            {orders.map((o) => (
              <DocCard
                key={o.id}
                code={o.code}
                title={o.title || o.code}
                badge={
                  <StatusPill
                    status={o.status}
                    label={STATUS_LABEL[o.status] ?? o.status}
                  />
                }
                meta={<p>{o.eam_equipment?.code ?? '—'}</p>}
                actions={
                  <Link
                    href={`${base}/equipment/orders/${o.id}`}
                    className="text-accent text-sm font-semibold min-h-11 inline-flex items-center"
                  >
                    Chi tiết
                  </Link>
                }
              />
            ))}
          </>
        }
      />
    </div>
  );
}
