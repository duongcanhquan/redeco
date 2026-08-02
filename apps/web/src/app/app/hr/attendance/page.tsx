import { ClipboardList } from 'lucide-react';
import { formatMinutesAsHours } from '@optimake/domain';
import { createServerSupabase } from '@/lib/supabase/server';
import { DocCard, ResponsiveDocList } from '@/components/sales/responsive-doc-list';
import {
  computeTimesheetForLog,
  listAttendanceLogs,
  listEmployees,
  listShifts,
} from '@/services/hr.service';
import { getWorkspaceNavContext } from '@/services/module-access.service';
import { AttendanceDialog } from './attendance-dialog';

export const dynamic = 'force-dynamic';

function readCachedTimesheet(attrs: unknown): {
  worked_minutes?: number;
  late_minutes?: number;
  ot_minutes?: number;
  early_leave_minutes?: number;
} | null {
  if (!attrs || typeof attrs !== 'object') return null;
  const t = (attrs as { timesheet?: unknown }).timesheet;
  if (!t || typeof t !== 'object') return null;
  return t as {
    worked_minutes?: number;
    late_minutes?: number;
    ot_minutes?: number;
    early_leave_minutes?: number;
  };
}

export default async function HrAttendancePage() {
  const [supabase, nav] = await Promise.all([
    createServerSupabase(),
    getWorkspaceNavContext(),
  ]);
  const canManage = nav?.isManager ?? false;
  const [logs, employees, shifts] = await Promise.all([
    listAttendanceLogs(supabase),
    listEmployees(supabase),
    listShifts(supabase),
  ]);

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ClipboardList className="text-accent" size={24} aria-hidden />
            Chấm công
          </h1>
          <p className="text-sm text-ink-muted mt-1">
            Nhập tay giờ vào/ra (múi giờ VN). Có giờ ra bắt buộc chọn ca để tính OT.
          </p>
        </div>
        {canManage ? (
          <AttendanceDialog
            employees={employees.map((e) => ({
              id: e.id,
              code: e.code,
              full_name: e.full_name,
            }))}
            shifts={shifts.map((s) => ({ id: s.id, code: s.code, name: s.name }))}
          />
        ) : null}
      </header>

      <ResponsiveDocList
        empty={logs.length === 0}
        emptyState={
          <div className="py-16 text-center">
            <ClipboardList className="mx-auto text-ink-muted/50" size={32} aria-hidden />
            <p className="mt-4 text-ink-muted">Chưa có bản ghi chấm công.</p>
          </div>
        }
        table={
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-panel/40 text-left text-ink-muted">
                <th className="px-4 py-3 font-medium">Ngày</th>
                <th className="px-4 py-3 font-medium">NV</th>
                <th className="px-4 py-3 font-medium hidden md:table-cell">Ca</th>
                <th className="px-4 py-3 font-medium">Vào–Ra</th>
                <th className="px-4 py-3 font-medium text-right">Công</th>
                <th className="px-4 py-3 font-medium text-right hidden lg:table-cell">
                  Muộn / OT
                </th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => {
                const cached = readCachedTimesheet(
                  (log as { attributes?: unknown }).attributes,
                );
                let worked = cached?.worked_minutes;
                let late = cached?.late_minutes;
                let ot = cached?.ot_minutes;
                if (
                  worked === undefined &&
                  log.hr_shifts &&
                  log.clock_out
                ) {
                  const ts = computeTimesheetForLog(log, log.hr_shifts);
                  worked = ts.workedMinutes;
                  late = ts.lateMinutes;
                  ot = ts.otMinutes;
                }
                const inT = new Date(log.clock_in).toLocaleTimeString('vi-VN', {
                  hour: '2-digit',
                  minute: '2-digit',
                  timeZone: 'Asia/Ho_Chi_Minh',
                });
                const outT = log.clock_out
                  ? new Date(log.clock_out).toLocaleTimeString('vi-VN', {
                      hour: '2-digit',
                      minute: '2-digit',
                      timeZone: 'Asia/Ho_Chi_Minh',
                    })
                  : '—';
                return (
                  <tr
                    key={log.id}
                    className="border-b border-panel/20 last:border-0 hover:bg-glass-strong/40"
                  >
                    <td className="px-4 py-3 tabular-nums">{log.work_date}</td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs text-accent">
                        {log.hr_employees?.code}
                      </span>{' '}
                      {log.hr_employees?.full_name}
                    </td>
                    <td className="px-4 py-3 text-ink-muted hidden md:table-cell">
                      {log.hr_shifts?.code ?? '—'}
                    </td>
                    <td className="px-4 py-3 tabular-nums">
                      {inT} – {outT}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums font-semibold">
                      {worked != null ? formatMinutesAsHours(worked) : '—'}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-ink-muted hidden lg:table-cell">
                      {late != null || ot != null
                        ? `${late ?? 0}′ / ${ot != null ? formatMinutesAsHours(ot) : '—'}`
                        : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        }
        cards={
          <>
            {logs.map((log) => (
              <DocCard
                key={log.id}
                code={log.hr_employees?.code ?? '—'}
                title={log.hr_employees?.full_name ?? '—'}
                badge={
                  <span className="text-xs text-ink-muted">{log.work_date}</span>
                }
                meta={
                  <p>
                    {log.work_date} · ca {log.hr_shifts?.code ?? '—'}
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
