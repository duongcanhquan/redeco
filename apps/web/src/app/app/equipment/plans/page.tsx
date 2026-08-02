import { CalendarClock } from 'lucide-react';
import { DocCard, ResponsiveDocList } from '@/components/sales/responsive-doc-list';
import { StatusPill } from '@/components/ui/status-pill';
import { createServerSupabase } from '@/lib/supabase/server';
import { listEquipment, listMaintenancePlans } from '@/services/maintenance.service';
import { getWorkspaceNavContext } from '@/services/module-access.service';
import { PlanActions, RunPmButton } from './plan-actions';
import { PlanDialog } from './plan-dialog';

export const dynamic = 'force-dynamic';

export default async function MaintenancePlansPage() {
  const [supabase, nav] = await Promise.all([
    createServerSupabase(),
    getWorkspaceNavContext(),
  ]);
  const canManage = nav?.isManager ?? false;
  const asOf = new Date().toISOString().slice(0, 10);
  const [plans, equipment] = await Promise.all([
    listMaintenancePlans(supabase),
    listEquipment(supabase),
  ]);

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <CalendarClock className="text-accent" size={24} aria-hidden />
            Kế hoạch PM
          </h1>
          <p className="text-sm text-ink-muted mt-1">
            Bảo trì định kỳ theo chu kỳ ngày — bấm «Chạy PM» để sinh lệnh đến hạn.
          </p>
        </div>
        {canManage ? (
          <div className="flex flex-wrap gap-2 items-start">
            <PlanDialog
              equipment={equipment.map((e) => ({
                id: e.id,
                code: e.code,
                name: e.name,
              }))}
            />
            <RunPmButton />
          </div>
        ) : null}
      </header>

      <ResponsiveDocList
        empty={plans.length === 0}
        emptyState={
          <div className="py-16 text-center">
            <CalendarClock className="mx-auto text-ink-muted/50" size={32} aria-hidden />
            <p className="mt-4 text-ink-muted">Chưa có kế hoạch PM.</p>
          </div>
        }
        table={
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-panel/40 text-left text-ink-muted">
                <th className="py-3 pr-3 font-medium">Mã</th>
                <th className="py-3 pr-3 font-medium">Tên</th>
                <th className="py-3 pr-3 font-medium hidden md:table-cell">Thiết bị</th>
                <th className="py-3 pr-3 font-medium">Chu kỳ</th>
                <th className="py-3 pr-3 font-medium">Đến hạn</th>
                <th className="py-3 pr-3 font-medium">TT</th>
                <th className="py-3 font-medium text-right"> </th>
              </tr>
            </thead>
            <tbody>
              {plans.map((p) => {
                const overdue = p.is_active && p.next_due_on <= asOf;
                return (
                  <tr key={p.id} className="border-b border-panel/20">
                    <td className="py-3 pr-3 font-mono text-xs">{p.code}</td>
                    <td className="py-3 pr-3 font-medium">{p.name}</td>
                    <td className="py-3 pr-3 hidden md:table-cell text-ink-muted">
                      {p.eam_equipment?.code ?? '—'}
                    </td>
                    <td className="py-3 pr-3">{p.interval_days} ngày</td>
                    <td className="py-3 pr-3">{p.next_due_on}</td>
                    <td className="py-3 pr-3">
                      <StatusPill
                        status={!p.is_active ? 'draft' : overdue ? 'cancelled' : 'active'}
                        label={!p.is_active ? 'Tắt' : overdue ? 'Đến hạn' : 'OK'}
                      />
                    </td>
                    <td className="py-3 text-right">
                      {canManage ? (
                        <PlanActions planId={p.id} isActive={p.is_active} />
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        }
        cards={
          <>
            {plans.map((p) => {
              const overdue = p.is_active && p.next_due_on <= asOf;
              return (
                <DocCard
                  key={p.id}
                  code={p.code}
                  title={p.name}
                  badge={
                    <StatusPill
                      status={!p.is_active ? 'draft' : overdue ? 'cancelled' : 'active'}
                      label={!p.is_active ? 'Tắt' : overdue ? 'Đến hạn' : 'OK'}
                    />
                  }
                  meta={
                    <div className="flex flex-wrap gap-2 items-center">
                      <p>
                        {p.interval_days} ngày · hạn {p.next_due_on}
                      </p>
                      {canManage ? (
                        <PlanActions planId={p.id} isActive={p.is_active} />
                      ) : null}
                    </div>
                  }
                />
              );
            })}
          </>
        }
      />
    </div>
  );
}
