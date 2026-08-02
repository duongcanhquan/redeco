import { Gauge } from 'lucide-react';
import { DocCard, ResponsiveDocList } from '@/components/sales/responsive-doc-list';
import { createServerSupabase } from '@/lib/supabase/server';
import { computeEquipmentOeeRows } from '@/services/maintenance.service';

export const dynamic = 'force-dynamic';

function pct(n: number): string {
  return `${Math.round(n * 1000) / 10}%`;
}

export default async function OeePage() {
  const supabase = await createServerSupabase();
  const to = new Date().toISOString().slice(0, 10);
  const fromDate = new Date();
  fromDate.setUTCDate(fromDate.getUTCDate() - 29);
  const from = fromDate.toISOString().slice(0, 10);
  const rows = await computeEquipmentOeeRows(supabase, from, to);
  const avg =
    rows.length === 0 ? 0 : rows.reduce((s, r) => s + r.oee, 0) / rows.length;

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Gauge className="text-accent" size={24} aria-hidden />
          OEE (30 ngày)
        </h1>
        <p className="text-sm text-ink-muted mt-1">
          {from} → {to}. Availability từ downtime lệnh BT; Performance & Quality = 100%
          (TB3 stub — chưa gắn sản lượng máy).
        </p>
        <p className="mt-2 text-sm font-semibold">
          Trung bình OEE: <span className="text-accent tabular-nums">{pct(avg)}</span>
        </p>
      </header>

      <ResponsiveDocList
        empty={rows.length === 0}
        emptyState={
          <div className="py-16 text-center">
            <Gauge className="mx-auto text-ink-muted/50" size={32} aria-hidden />
            <p className="mt-4 text-ink-muted">Chưa có thiết bị active để tính OEE.</p>
          </div>
        }
        table={
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-panel/40 text-left text-ink-muted">
                <th className="py-3 pr-3 font-medium">Máy</th>
                <th className="py-3 pr-3 font-medium">A</th>
                <th className="py-3 pr-3 font-medium hidden md:table-cell">P</th>
                <th className="py-3 pr-3 font-medium hidden md:table-cell">Q</th>
                <th className="py-3 pr-3 font-medium">OEE</th>
                <th className="py-3 font-medium hidden lg:table-cell">Downtime</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.equipmentId} className="border-b border-panel/20">
                  <td className="py-3 pr-3">
                    <span className="font-mono text-xs">{r.equipmentCode}</span>
                    <span className="text-ink-muted ml-2">{r.equipmentName}</span>
                  </td>
                  <td className="py-3 pr-3 tabular-nums">{pct(r.availability)}</td>
                  <td className="py-3 pr-3 tabular-nums hidden md:table-cell">
                    {pct(r.performance)}
                  </td>
                  <td className="py-3 pr-3 tabular-nums hidden md:table-cell">
                    {pct(r.quality)}
                  </td>
                  <td className="py-3 pr-3 font-semibold tabular-nums text-accent">
                    {pct(r.oee)}
                  </td>
                  <td className="py-3 hidden lg:table-cell text-ink-muted">
                    {r.downtimeMinutes} phút / KH {r.plannedMinutes} phút
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        }
        cards={
          <>
            {rows.map((r) => (
              <DocCard
                key={r.equipmentId}
                code={r.equipmentCode}
                title={r.equipmentName}
                badge={<span className="text-accent font-semibold">{pct(r.oee)}</span>}
                meta={
                  <p>
                    A {pct(r.availability)} · downtime {r.downtimeMinutes} phút
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
