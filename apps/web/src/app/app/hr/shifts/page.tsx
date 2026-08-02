import { ClipboardList } from 'lucide-react';
import { formatMinutesAsHours, shiftStandardMinutes, parseTimeToMinutes } from '@optimake/domain';
import { createServerSupabase } from '@/lib/supabase/server';
import { DocCard, ResponsiveDocList } from '@/components/sales/responsive-doc-list';
import { listShifts } from '@/services/hr.service';
import { getWorkspaceNavContext } from '@/services/module-access.service';
import { ShiftDialog } from './shift-dialog';

export const dynamic = 'force-dynamic';

export default async function HrShiftsPage() {
  const [supabase, nav] = await Promise.all([
    createServerSupabase(),
    getWorkspaceNavContext(),
  ]);
  const canManage = nav?.isManager ?? false;
  const shifts = await listShifts(supabase);

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ClipboardList className="text-accent" size={24} aria-hidden />
            Ca làm việc
          </h1>
          <p className="text-sm text-ink-muted mt-1">
            Định nghĩa ca để tính công chuẩn / muộn / OT khi chấm công.
          </p>
        </div>
        {canManage ? <ShiftDialog /> : null}
      </header>

      <ResponsiveDocList
        empty={shifts.length === 0}
        emptyState={
          <div className="py-16 text-center">
            <ClipboardList className="mx-auto text-ink-muted/50" size={32} aria-hidden />
            <p className="mt-4 text-ink-muted">Chưa có ca — thêm ca hành chính hoặc ca xoay.</p>
          </div>
        }
        table={
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-panel/40 text-left text-ink-muted">
                <th className="px-5 py-3.5 font-medium">Mã</th>
                <th className="px-5 py-3.5 font-medium">Tên</th>
                <th className="px-5 py-3.5 font-medium">Giờ</th>
                <th className="px-5 py-3.5 font-medium hidden md:table-cell">Nghỉ</th>
                <th className="px-5 py-3.5 font-medium text-right">Chuẩn</th>
              </tr>
            </thead>
            <tbody>
              {shifts.map((s) => {
                const start = parseTimeToMinutes(String(s.start_time).slice(0, 5)) ?? 0;
                const end = parseTimeToMinutes(String(s.end_time).slice(0, 5)) ?? 0;
                const std = shiftStandardMinutes({
                  startMinutes: start,
                  endMinutes: end,
                  breakMinutes: s.break_minutes,
                });
                return (
                  <tr
                    key={s.id}
                    className="border-b border-panel/20 last:border-0 hover:bg-glass-strong/40"
                  >
                    <td className="px-5 py-3.5 font-mono text-xs text-accent">{s.code}</td>
                    <td className="px-5 py-3.5 font-medium">{s.name}</td>
                    <td className="px-5 py-3.5 tabular-nums">
                      {String(s.start_time).slice(0, 5)} – {String(s.end_time).slice(0, 5)}
                    </td>
                    <td className="px-5 py-3.5 hidden md:table-cell">{s.break_minutes}′</td>
                    <td className="px-5 py-3.5 text-right tabular-nums font-semibold">
                      {formatMinutesAsHours(std)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        }
        cards={
          <>
            {shifts.map((s) => (
              <DocCard
                key={s.id}
                code={s.code}
                title={s.name}
                badge={<span className="text-xs text-ink-muted">Ca</span>}
                meta={
                  <p>
                    {String(s.start_time).slice(0, 5)} – {String(s.end_time).slice(0, 5)} · nghỉ{' '}
                    {s.break_minutes}′
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
