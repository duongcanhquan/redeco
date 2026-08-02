import Link from 'next/link';
import {
  Activity,
  ArrowRight,
  CalendarClock,
  ClipboardList,
  Cpu,
  Gauge,
  Wrench,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { StatTile } from '@/components/ui/stat-tile';
import { createServerSupabase, getSessionClaims } from '@/lib/supabase/server';
import {
  listEquipment,
  listMaintenanceOrders,
  listMaintenancePlans,
  listMeters,
  listWorkRequests,
} from '@/services/maintenance.service';
import { getMyRootModules } from '@/services/sales.service';
import { getAiAssistantAvailability } from '@/services/tenant-settings.service';
import { EquipmentAiPanel } from './equipment-ai-panel';

export const dynamic = 'force-dynamic';

export default async function EquipmentHubPage() {
  const [supabase, claims] = await Promise.all([
    createServerSupabase(),
    getSessionClaims(),
  ]);
  const base = claims?.tenantSlug ? `/${claims.tenantSlug}` : '/app';
  const modules = await getMyRootModules(supabase);
  const hasMod = modules.some((m) => m.key === 'thiet-bi');

  if (!hasMod) {
    return (
      <div className="glass rounded-2xl py-16 text-center max-w-lg mx-auto">
        <Wrench className="mx-auto text-warning" size={32} aria-hidden />
        <p className="mt-4 font-medium">Chưa mở Thiết bị / Bảo trì</p>
        <p className="mt-1 text-sm text-ink-muted px-4">
          Liên hệ quản trị để cấp module Thiết bị trên hợp đồng.
        </p>
      </div>
    );
  }

  const [equipment, requests, orders, plans, meters, aiAvail] = await Promise.all([
    listEquipment(supabase),
    listWorkRequests(supabase),
    listMaintenanceOrders(supabase),
    listMaintenancePlans(supabase),
    listMeters(supabase),
    getAiAssistantAvailability(),
  ]);
  const asOf = new Date().toISOString().slice(0, 10);
  const openReq = requests.filter((r) => r.status === 'open' || r.status === 'approved').length;
  const openOrders = orders.filter(
    (o) => o.status === 'draft' || o.status === 'released' || o.status === 'in_progress',
  ).length;
  const duePlans = plans.filter((p) => p.is_active && p.next_due_on <= asOf).length;
  const downEq = equipment.filter((e) => e.status === 'down').length;
  const meterAlerts = meters.filter((m) => m.alertLevel !== 'ok').length;

  return (
    <div className="space-y-5">
      <PageHeader
        icon={<Wrench size={24} />}
        title="Thiết bị & Bảo trì"
        helpTitle="Module này làm gì?"
        help={
          <>
            <p>
              Máy móc, YC/lệnh BT, phụ tùng XK, PM, meter PdM, OEE mỏng và trợ lý AI.
            </p>
            <p>Chưa: MQTT realtime, Digital Twin 3D, camera CV.</p>
          </>
        }
        actions={
          <EquipmentAiPanel
            basePath={base}
            entitled={aiAvail.entitledEquipmentAsk}
            configured={aiAvail.configured}
            featureEnabled={aiAvail.features.equipmentAsk}
          />
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatTile icon={<Cpu size={18} />} label="Thiết bị" value={equipment.length} />
        <StatTile
          icon={<ClipboardList size={18} />}
          label="YC đang mở"
          value={openReq}
          tone={openReq > 0 ? 'warning' : 'default'}
        />
        <StatTile icon={<Wrench size={18} />} label="Lệnh đang chạy" value={openOrders} />
        <StatTile
          icon={<CalendarClock size={18} />}
          label="PM đến hạn"
          value={duePlans}
          tone={duePlans > 0 ? 'warning' : 'default'}
        />
        <StatTile
          icon={<Activity size={18} />}
          label="Meter alert"
          value={meterAlerts}
          tone={meterAlerts > 0 ? 'warning' : 'default'}
        />
        <StatTile
          icon={<Cpu size={18} />}
          label="Máy đang dừng"
          value={downEq}
          tone={downEq > 0 ? 'warning' : 'default'}
        />
      </div>

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {[
          { href: `${base}/equipment/assets`, label: 'Danh mục thiết bị', icon: Cpu },
          { href: `${base}/equipment/requests`, label: 'Yêu cầu bảo trì', icon: ClipboardList },
          { href: `${base}/equipment/orders`, label: 'Lệnh bảo trì', icon: Wrench },
          { href: `${base}/equipment/plans`, label: 'Kế hoạch PM', icon: CalendarClock },
          { href: `${base}/equipment/meters`, label: 'Meter / PdM', icon: Activity },
          { href: `${base}/equipment/oee`, label: 'OEE 30 ngày', icon: Gauge },
        ].map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="glass rounded-2xl p-4 flex items-center justify-between gap-3 min-h-14 hover:bg-glass-strong transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
          >
            <span className="flex items-center gap-3 font-medium">
              <Icon className="text-accent shrink-0" size={20} aria-hidden />
              {label}
            </span>
            <ArrowRight size={16} className="text-ink-muted shrink-0" aria-hidden />
          </Link>
        ))}
      </section>
    </div>
  );
}
