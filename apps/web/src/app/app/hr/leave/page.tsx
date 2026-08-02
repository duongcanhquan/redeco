import { FileText } from 'lucide-react';
import { createServerSupabase } from '@/lib/supabase/server';
import { DocCard, ResponsiveDocList } from '@/components/sales/responsive-doc-list';
import {
  ensureDefaultLeaveTypes,
  listEmployees,
  listLeaveRequests,
  listLeaveTypes,
} from '@/services/hr.service';
import { getWorkspaceNavContext } from '@/services/module-access.service';
import { LeaveDecideButtons } from './leave-decide';
import { LeaveRequestDialog } from './leave-dialog';

export const dynamic = 'force-dynamic';

const STATUS: Record<string, string> = {
  pending: 'Chờ duyệt',
  approved: 'Đã duyệt',
  rejected: 'Từ chối',
  draft: 'Nháp',
  cancelled: 'Huỷ',
};

export default async function HrLeavePage() {
  const [supabase, nav] = await Promise.all([
    createServerSupabase(),
    getWorkspaceNavContext(),
  ]);
  const canManage = nav?.isManager ?? false;
  await ensureDefaultLeaveTypes();
  const [requests, employees, leaveTypes] = await Promise.all([
    listLeaveRequests(supabase),
    listEmployees(supabase),
    listLeaveTypes(supabase),
  ]);

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="text-accent" size={24} aria-hidden />
            Nghỉ phép
          </h1>
          <p className="text-sm text-ink-muted mt-1">
            Đơn nghỉ + duyệt đơn giản. Quota phép năm chi tiết — pha sau.
          </p>
        </div>
        {canManage ? (
          <LeaveRequestDialog
            employees={employees.map((e) => ({
              id: e.id,
              code: e.code,
              full_name: e.full_name,
            }))}
            leaveTypes={leaveTypes.map((t) => ({
              id: t.id,
              code: t.code,
              name: t.name,
            }))}
          />
        ) : null}
      </header>

      <ResponsiveDocList
        empty={requests.length === 0}
        emptyState={
          <div className="py-16 text-center">
            <FileText className="mx-auto text-ink-muted/50" size={32} aria-hidden />
            <p className="mt-4 text-ink-muted">Chưa có đơn nghỉ.</p>
          </div>
        }
        table={
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-panel/40 text-left text-ink-muted">
                <th className="px-4 py-3 font-medium">NV</th>
                <th className="px-4 py-3 font-medium">Loại</th>
                <th className="px-4 py-3 font-medium">Thời gian</th>
                <th className="px-4 py-3 font-medium text-right">Ngày</th>
                <th className="px-4 py-3 font-medium">TT</th>
                <th className="px-4 py-3 font-medium"> </th>
              </tr>
            </thead>
            <tbody>
              {requests.map((r) => (
                <tr
                  key={r.id}
                  className="border-b border-panel/20 last:border-0 hover:bg-glass-strong/40"
                >
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs text-accent">
                      {r.hr_employees?.code}
                    </span>{' '}
                    {r.hr_employees?.full_name}
                  </td>
                  <td className="px-4 py-3">{r.hr_leave_types?.name ?? '—'}</td>
                  <td className="px-4 py-3 tabular-nums text-ink-muted">
                    {r.starts_on} → {r.ends_on}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">{r.days}</td>
                  <td className="px-4 py-3 text-xs">{STATUS[r.status] ?? r.status}</td>
                  <td className="px-4 py-3">
                    {r.status === 'pending' && canManage ? (
                      <LeaveDecideButtons id={r.id} />
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
                code={r.hr_employees?.code ?? '—'}
                title={r.hr_employees?.full_name ?? '—'}
                badge={
                  <span className="text-xs text-ink-muted">
                    {STATUS[r.status] ?? r.status}
                  </span>
                }
                meta={
                  <p>
                    {r.hr_leave_types?.name} · {r.starts_on} → {r.ends_on} ({r.days}n)
                  </p>
                }
                actions={
                  r.status === 'pending' && canManage ? (
                    <LeaveDecideButtons id={r.id} />
                  ) : undefined
                }
              />
            ))}
          </>
        }
      />
    </div>
  );
}
