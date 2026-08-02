import { ClipboardList } from 'lucide-react';
import { DocCard, ResponsiveDocList } from '@/components/sales/responsive-doc-list';
import { StatusPill } from '@/components/ui/status-pill';
import { createServerSupabase } from '@/lib/supabase/server';
import { listEquipment, listWorkRequests } from '@/services/maintenance.service';
import { getWorkspaceNavContext } from '@/services/module-access.service';
import { ConvertRequestButton, WorkRequestStatusButtons } from './convert-button';
import { WorkRequestDialog } from './request-dialog';

export const dynamic = 'force-dynamic';

const STATUS_LABEL: Record<string, string> = {
  open: 'Mở',
  approved: 'Duyệt',
  rejected: 'Từ chối',
  converted: 'Đã tạo lệnh',
  cancelled: 'Huỷ',
};

const PRI_LABEL: Record<string, string> = {
  low: 'Thấp',
  medium: 'TB',
  high: 'Cao',
  urgent: 'Khẩn',
};

export default async function WorkRequestsPage() {
  const [supabase, nav] = await Promise.all([
    createServerSupabase(),
    getWorkspaceNavContext(),
  ]);
  const canManage = nav?.isManager ?? false;
  const [requests, equipment] = await Promise.all([
    listWorkRequests(supabase),
    listEquipment(supabase),
  ]);

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ClipboardList className="text-accent" size={24} aria-hidden />
            Yêu cầu bảo trì
          </h1>
          <p className="text-sm text-ink-muted mt-1">Báo sự cố từ hiện trường → tạo lệnh sửa chữa.</p>
        </div>
        <WorkRequestDialog
          equipment={equipment.map((e) => ({
            id: e.id,
            code: e.code,
            name: e.name,
          }))}
        />
      </header>

      <ResponsiveDocList
        empty={requests.length === 0}
        emptyState={
          <div className="py-16 text-center">
            <ClipboardList className="mx-auto text-ink-muted/50" size={32} aria-hidden />
            <p className="mt-4 text-ink-muted">Chưa có yêu cầu bảo trì.</p>
          </div>
        }
        table={
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-panel/40 text-left text-ink-muted">
                <th className="py-3 pr-3 font-medium">Mã</th>
                <th className="py-3 pr-3 font-medium">Tiêu đề</th>
                <th className="py-3 pr-3 font-medium hidden md:table-cell">Thiết bị</th>
                <th className="py-3 pr-3 font-medium">Ưu tiên</th>
                <th className="py-3 pr-3 font-medium">TT</th>
                <th className="py-3 font-medium text-right"> </th>
              </tr>
            </thead>
            <tbody>
              {requests.map((r) => (
                <tr key={r.id} className="border-b border-panel/20">
                  <td className="py-3 pr-3 font-mono text-xs">{r.code}</td>
                  <td className="py-3 pr-3 font-medium">{r.title}</td>
                  <td className="py-3 pr-3 hidden md:table-cell text-ink-muted">
                    {r.eam_equipment?.code ?? '—'}
                  </td>
                  <td className="py-3 pr-3">{PRI_LABEL[r.priority] ?? r.priority}</td>
                  <td className="py-3 pr-3">
                    <StatusPill
                      status={r.status === 'converted' ? 'completed' : r.status}
                      label={STATUS_LABEL[r.status] ?? r.status}
                    />
                  </td>
                  <td className="py-3 text-right">
                    {canManage && (r.status === 'open' || r.status === 'approved') ? (
                      <div className="flex flex-col items-end gap-2">
                        <WorkRequestStatusButtons requestId={r.id} status={r.status} />
                        <ConvertRequestButton requestId={r.id} />
                      </div>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        }
        cards={
          <>
            {requests.map((r) => (
              <DocCard
                key={r.id}
                code={r.code}
                title={r.title}
                badge={
                  <StatusPill
                    status={r.status === 'converted' ? 'completed' : r.status}
                    label={STATUS_LABEL[r.status] ?? r.status}
                  />
                }
                meta={
                  <div className="flex flex-wrap items-center gap-2">
                    <p>{r.eam_equipment?.code ?? '—'}</p>
                    {canManage && (r.status === 'open' || r.status === 'approved') ? (
                      <>
                        <WorkRequestStatusButtons requestId={r.id} status={r.status} />
                        <ConvertRequestButton requestId={r.id} />
                      </>
                    ) : null}
                  </div>
                }
              />
            ))}
          </>
        }
      />
    </div>
  );
}
