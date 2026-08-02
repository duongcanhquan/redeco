import { Receipt } from 'lucide-react';
import { createServerSupabase } from '@/lib/supabase/server';
import { formatMoney } from '@/lib/format';
import { formatMinutesAsHours } from '@optimake/domain';
import {
  listPayrollLines,
  listPayrollRuns,
} from '@/services/hr.service';
import { getWorkspaceNavContext } from '@/services/module-access.service';
import { LockPayrollButton, PayrollGenerateForm } from './payroll-controls';

export const dynamic = 'force-dynamic';

export default async function HrPayrollPage({
  searchParams,
}: {
  searchParams: Promise<{ run?: string }>;
}) {
  const { run: runId } = await searchParams;
  const [supabase, nav] = await Promise.all([
    createServerSupabase(),
    getWorkspaceNavContext(),
  ]);
  const canManage = nav?.isManager ?? false;
  const runs = await listPayrollRuns(supabase);
  const selected = runId
    ? runs.find((r) => r.id === runId)
    : runs[0];
  const lines = selected ? await listPayrollLines(supabase, selected.id) : [];

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Receipt className="text-accent" size={24} aria-hidden />
          Bảng lương
        </h1>
        <p className="text-sm text-ink-muted mt-1">
          Lương CB (HĐ active) + OT từ chấm công. BHXH / piece-rate — pha sau.
        </p>
      </header>

      <PayrollGenerateForm canManage={canManage} />

      {runs.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {runs.map((r) => (
            <a
              key={r.id}
              href={`?run=${r.id}`}
              className={`inline-flex min-h-11 items-center rounded-xl border px-3 text-sm ${
                selected?.id === r.id
                  ? 'border-accent/40 bg-accent-soft text-accent font-semibold'
                  : 'border-panel/40'
              }`}
            >
              {r.period_month}/{r.period_year} · {r.status === 'locked' ? 'Khóa' : 'Nháp'}
            </a>
          ))}
        </div>
      )}

      {selected && (
        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="font-mono text-sm text-accent">{selected.code}</p>
            <LockPayrollButton
              runId={selected.id}
              locked={selected.status === 'locked'}
              canManage={canManage}
            />
          </div>
          <div className="glass rounded-2xl border border-panel/40 overflow-hidden">
            {lines.length === 0 ? (
              <p className="px-5 py-10 text-center text-ink-muted">
                Chưa có dòng — bấm Tính bảng lương.
              </p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-panel/40 text-left text-ink-muted">
                    <th className="px-4 py-3 font-medium">NV</th>
                    <th className="px-4 py-3 font-medium text-right">Lương CB</th>
                    <th className="px-4 py-3 font-medium text-right hidden md:table-cell">
                      OT
                    </th>
                    <th className="px-4 py-3 font-medium text-right">Thực nhận</th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((l) => (
                    <tr key={l.id} className="border-b border-panel/20 last:border-0">
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs text-accent">
                          {l.hr_employees?.code}
                        </span>{' '}
                        {l.hr_employees?.full_name}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {formatMoney(Number(l.base_salary))}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-ink-muted hidden md:table-cell">
                        {formatMinutesAsHours(l.ot_minutes)} ·{' '}
                        {formatMoney(Number(l.ot_amount))}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums font-semibold">
                        {formatMoney(Number(l.net_amount))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
