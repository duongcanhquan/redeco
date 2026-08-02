import { Cpu } from 'lucide-react';
import { DocCard, ResponsiveDocList } from '@/components/sales/responsive-doc-list';
import { StatusPill } from '@/components/ui/status-pill';
import { createServerSupabase } from '@/lib/supabase/server';
import { listEquipment } from '@/services/maintenance.service';
import { getWorkspaceNavContext } from '@/services/module-access.service';
import { EquipmentDialog } from './equipment-dialog';

export const dynamic = 'force-dynamic';

const KIND_LABEL: Record<string, string> = {
  plant: 'Nhà máy',
  line: 'Line',
  machine: 'Máy',
  tool: 'Công cụ',
  other: 'Khác',
};

const STATUS_LABEL: Record<string, string> = {
  draft: 'Nháp',
  active: 'Đang chạy',
  idle: 'Chờ',
  down: 'Dừng',
  retired: 'Thanh lý',
};

export default async function EquipmentAssetsPage() {
  const [supabase, nav] = await Promise.all([
    createServerSupabase(),
    getWorkspaceNavContext(),
  ]);
  const canManage = nav?.isManager ?? false;
  const equipment = await listEquipment(supabase);
  const byId = new Map(equipment.map((e) => [e.id, e]));

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Cpu className="text-accent" size={24} aria-hidden />
            Danh mục thiết bị
          </h1>
          <p className="text-sm text-ink-muted mt-1">Cây nhà máy → line → máy (TB1).</p>
        </div>
        {canManage ? (
          <EquipmentDialog
            equipment={equipment.map((e) => ({
              id: e.id,
              code: e.code,
              name: e.name,
            }))}
          />
        ) : null}
      </header>

      <ResponsiveDocList
        empty={equipment.length === 0}
        emptyState={
          <div className="py-16 text-center">
            <Cpu className="mx-auto text-ink-muted/50" size={32} aria-hidden />
            <p className="mt-4 text-ink-muted">Chưa có thiết bị — thêm máy / line.</p>
          </div>
        }
        table={
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-panel/40 text-left text-ink-muted">
                <th className="py-3 pr-3 font-medium">Mã</th>
                <th className="py-3 pr-3 font-medium">Tên</th>
                <th className="py-3 pr-3 font-medium hidden md:table-cell">Loại</th>
                <th className="py-3 pr-3 font-medium">TT</th>
                <th className="py-3 pr-3 font-medium hidden lg:table-cell">Cha</th>
                <th className="py-3 font-medium hidden lg:table-cell">Vị trí</th>
              </tr>
            </thead>
            <tbody>
              {equipment.map((e) => (
                <tr key={e.id} className="border-b border-panel/20">
                  <td className="py-3 pr-3 font-mono text-xs">{e.code}</td>
                  <td className="py-3 pr-3 font-medium">{e.name}</td>
                  <td className="py-3 pr-3 hidden md:table-cell text-ink-muted">
                    {KIND_LABEL[e.kind] ?? e.kind}
                  </td>
                  <td className="py-3 pr-3">
                    <StatusPill
                      status={e.status === 'down' ? 'cancelled' : e.status}
                      label={STATUS_LABEL[e.status] ?? e.status}
                    />
                  </td>
                  <td className="py-3 pr-3 hidden lg:table-cell text-ink-muted">
                    {e.parent_id ? (byId.get(e.parent_id)?.code ?? '—') : '—'}
                  </td>
                  <td className="py-3 hidden lg:table-cell text-ink-muted">
                    {e.location_text || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        }
        cards={
          <>
            {equipment.map((e) => (
              <DocCard
                key={e.id}
                code={e.code}
                title={e.name}
                badge={
                  <StatusPill
                    status={e.status === 'down' ? 'cancelled' : e.status}
                    label={STATUS_LABEL[e.status] ?? e.status}
                  />
                }
                meta={
                  <p>
                    {KIND_LABEL[e.kind] ?? e.kind}
                    {e.location_text ? ` · ${e.location_text}` : ''}
                  </p>
                }
              />
            ))}
          </>
        }
      />
    </div>
  );
}
