import { Activity } from 'lucide-react';
import { DocCard, ResponsiveDocList } from '@/components/sales/responsive-doc-list';
import { StatusPill } from '@/components/ui/status-pill';
import { createServerSupabase } from '@/lib/supabase/server';
import { listEquipment, listMeters } from '@/services/maintenance.service';
import { getWorkspaceNavContext } from '@/services/module-access.service';
import { MeterDialog, RecordReadingButton } from './meter-controls';

export const dynamic = 'force-dynamic';

const ALERT_LABEL: Record<string, string> = {
  ok: 'OK',
  warn: 'Cảnh báo',
  critical: 'Critical',
};

export default async function MetersPage() {
  const [supabase, nav] = await Promise.all([
    createServerSupabase(),
    getWorkspaceNavContext(),
  ]);
  const canManage = nav?.isManager ?? false;
  const [meters, equipment] = await Promise.all([
    listMeters(supabase),
    listEquipment(supabase),
  ]);

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Activity className="text-accent" size={24} aria-hidden />
            Meter / PdM
          </h1>
          <p className="text-sm text-ink-muted mt-1">
            Đọc chỉ số + ngưỡng. Critical tự tạo yêu cầu bảo trì. IoT stub mô phỏng cảm biến.
          </p>
        </div>
        {canManage ? (
          <MeterDialog
            equipment={equipment.map((e) => ({
              id: e.id,
              code: e.code,
              name: e.name,
            }))}
          />
        ) : null}
      </header>

      <ResponsiveDocList
        empty={meters.length === 0}
        emptyState={
          <div className="py-16 text-center">
            <Activity className="mx-auto text-ink-muted/50" size={32} aria-hidden />
            <p className="mt-4 text-ink-muted">Chưa có meter — thêm đồng hồ chạy máy / rung…</p>
          </div>
        }
        table={
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-panel/40 text-left text-ink-muted">
                <th className="py-3 pr-3 font-medium">Mã</th>
                <th className="py-3 pr-3 font-medium">Thiết bị</th>
                <th className="py-3 pr-3 font-medium">Giá trị</th>
                <th className="py-3 pr-3 font-medium">Ngưỡng</th>
                <th className="py-3 pr-3 font-medium">Alert</th>
                <th className="py-3 font-medium text-right">Đọc</th>
              </tr>
            </thead>
            <tbody>
              {meters.map((m) => (
                <tr key={m.id} className="border-b border-panel/20">
                  <td className="py-3 pr-3 font-mono text-xs">{m.code}</td>
                  <td className="py-3 pr-3">{m.eam_equipment?.code ?? '—'}</td>
                  <td className="py-3 pr-3 tabular-nums">
                    {m.last_value != null ? `${m.last_value} ${m.unit}` : '—'}
                  </td>
                  <td className="py-3 pr-3 text-ink-muted text-xs">
                    W {m.threshold_warn ?? '—'} / C {m.threshold_critical ?? '—'}
                  </td>
                  <td className="py-3 pr-3">
                    <StatusPill
                      status={
                        m.alertLevel === 'critical'
                          ? 'cancelled'
                          : m.alertLevel === 'warn'
                            ? 'partial'
                            : 'active'
                      }
                      label={ALERT_LABEL[m.alertLevel] ?? m.alertLevel}
                    />
                  </td>
                  <td className="py-3 text-right">
                    {canManage && m.is_active ? (
                      <RecordReadingButton meterId={m.id} lastValue={m.last_value} />
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        }
        cards={
          <>
            {meters.map((m) => (
              <DocCard
                key={m.id}
                code={m.code}
                title={m.name}
                badge={
                  <StatusPill
                    status={
                      m.alertLevel === 'critical'
                        ? 'cancelled'
                        : m.alertLevel === 'warn'
                          ? 'partial'
                          : 'active'
                    }
                    label={ALERT_LABEL[m.alertLevel] ?? m.alertLevel}
                  />
                }
                meta={
                  <div className="space-y-2">
                    <p>
                      {m.eam_equipment?.code} ·{' '}
                      {m.last_value != null ? `${m.last_value} ${m.unit}` : 'chưa đọc'}
                    </p>
                    {canManage && m.is_active ? (
                      <RecordReadingButton meterId={m.id} lastValue={m.last_value} />
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
