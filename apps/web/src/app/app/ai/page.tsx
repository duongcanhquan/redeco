import Link from 'next/link';
import {
  Bot,
  CheckCircle2,
  CircleAlert,
  Factory,
  KeyRound,
  Settings,
  ShoppingCart,
  UserCog,
  Warehouse,
  Wrench,
} from 'lucide-react';
import { redirect } from 'next/navigation';
import { PageHeader } from '@/components/ui/page-header';
import { StatTile } from '@/components/ui/stat-tile';
import { hasAiModule } from '@/lib/ai-access';
import { getWorkspaceNavContext } from '@/services/module-access.service';
import {
  countAiUsageToday,
  listRecentAiUsage,
} from '@/services/ai-usage.service';
import { getAiAssistantAvailability } from '@/services/tenant-settings.service';
import { getTenantContext } from '@/services/sales-context';

export const dynamic = 'force-dynamic';

function StatusPill({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={`inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium ${
        ok ? 'bg-success/15 text-success' : 'bg-warning/15 text-warning'
      }`}
    >
      {ok ? <CheckCircle2 size={14} aria-hidden /> : <CircleAlert size={14} aria-hidden />}
      {label}
    </span>
  );
}

export default async function AiHubPage() {
  const nav = await getWorkspaceNavContext();
  if (!nav) redirect('/login?error=forbidden');
  if (!hasAiModule(nav.moduleKeys)) {
    return (
      <div className="glass rounded-2xl py-16 text-center max-w-lg mx-auto">
        <Bot className="mx-auto text-warning" size={32} aria-hidden />
        <p className="mt-4 font-medium">Chưa mở Trợ lý AI</p>
        <p className="mt-1 text-sm text-ink-muted px-4">
          Superadmin cần cấp module «Trợ lý AI» trên hợp đồng.
        </p>
      </div>
    );
  }

  const ctx = await getTenantContext();
  const [avail, usage, recent] = await Promise.all([
    getAiAssistantAvailability(),
    countAiUsageToday(ctx.supabase),
    listRecentAiUsage(ctx.supabase, 15),
  ]);

  const checklist = [
    {
      ok: avail.entitled,
      label: 'Entitlement AI trên HĐ',
      hint: 'Superadmin → Hợp đồng',
    },
    {
      ok: avail.configured,
      label: 'API key đã lưu',
      hint: 'Cài đặt → AI & API',
    },
    {
      ok: avail.features.copilot || avail.features.inventoryAsk || avail.features.productionAsk || avail.features.hrAsk || avail.features.equipmentAsk,
      label: 'Đã bật ít nhất 1 tính năng hỏi đáp',
      hint: 'Cài đặt → AI → Áp dụng theo phân hệ',
    },
  ];

  const modules = [
    {
      key: 'kd',
      icon: ShoppingCart,
      title: 'Kinh doanh',
      entitled: avail.entitledHubChat,
      enabled: avail.features.copilot,
      href: `${nav.base}/sales`,
    },
    {
      key: 'kho',
      icon: Warehouse,
      title: 'Kho',
      entitled: avail.entitledInventoryAsk,
      enabled: avail.features.inventoryAsk,
      href: `${nav.base}/inventory`,
    },
    {
      key: 'sx',
      icon: Factory,
      title: 'Sản xuất',
      entitled: avail.entitledProductionAsk,
      enabled: avail.features.productionAsk,
      href: `${nav.base}/production`,
    },
    {
      key: 'hr',
      icon: UserCog,
      title: 'Nhân sự',
      entitled: avail.entitledHrAsk,
      enabled: avail.features.hrAsk,
      href: `${nav.base}/hr`,
    },
    {
      key: 'tb',
      icon: Wrench,
      title: 'Thiết bị',
      entitled: avail.entitledEquipmentAsk,
      enabled: avail.features.equipmentAsk,
      href: `${nav.base}/equipment`,
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        icon={<Bot size={24} />}
        title="Trợ lý AI"
        helpTitle="AI vận hành thế nào?"
        help={
          <>
            <p>Hai lớp: entitlement trên HĐ + cấu hình key/tính năng của công ty.</p>
            <p>Mỗi lần gọi LLM được ghi nhật ký (hạn mức user/giờ và tenant/ngày).</p>
          </>
        }
        actions={
          nav.isManager ? (
            <Link
              href={`${nav.base}/settings?tab=ai`}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-panel/40 px-4 text-sm font-medium"
            >
              <Settings size={16} aria-hidden />
              Cài đặt AI
            </Link>
          ) : null
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatTile
          icon={<KeyRound size={18} />}
          label="API key"
          value={avail.configured ? 'Đã có' : 'Thiếu'}
          tone={avail.configured ? 'default' : 'warning'}
        />
        <StatTile
          icon={<Bot size={18} />}
          label="Gọi OK hôm nay"
          value={usage.okCalls}
        />
        <StatTile
          icon={<CircleAlert size={18} />}
          label="Gọi lỗi hôm nay"
          value={usage.failCalls}
          tone={usage.failCalls > 0 ? 'warning' : 'default'}
        />
        <StatTile
          icon={<CheckCircle2 size={18} />}
          label="Hạn mức ngày"
          value={`${usage.okCalls}/${usage.limit}`}
        />
      </div>

      <section className="glass rounded-2xl border border-panel/40 p-4 sm:p-5 space-y-3">
        <h2 className="font-semibold">Checklist sẵn sàng</h2>
        <ul className="space-y-2">
          {checklist.map((c) => (
            <li
              key={c.label}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-panel/30 px-3 py-2.5"
            >
              <span className="text-sm">{c.label}</span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-ink-muted">{c.hint}</span>
                <StatusPill ok={c.ok} label={c.ok ? 'OK' : 'Thiếu'} />
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {modules.map((m) => {
          const Icon = m.icon;
          const live = m.entitled && m.enabled && avail.configured;
          return (
            <Link
              key={m.key}
              href={m.href}
              className="glass glass-hover rounded-2xl p-4 min-h-24 flex flex-col gap-2"
            >
              <div className="flex items-center gap-3">
                <span className="grid size-11 place-items-center rounded-xl bg-accent-soft text-accent">
                  <Icon size={22} aria-hidden />
                </span>
                <div>
                  <p className="font-semibold">{m.title}</p>
                  <p className="text-xs text-ink-muted">
                    {live ? 'Sẵn sàng hỏi AI trên hub' : 'Chưa đủ entitlement / bật feature / key'}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <StatusPill ok={m.entitled} label="Entitled" />
                <StatusPill ok={m.enabled} label="Feature bật" />
              </div>
            </Link>
          );
        })}
      </section>

      <section className="glass rounded-2xl border border-panel/40 overflow-hidden">
        <h2 className="px-4 py-3 text-sm font-semibold border-b border-panel/30">
          Nhật ký gần đây
        </h2>
        {recent.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-ink-muted">Chưa có lần gọi nào.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-panel/40 text-left text-ink-muted">
                  <th className="px-4 py-2.5 font-medium">Thời gian</th>
                  <th className="px-4 py-2.5 font-medium">Module</th>
                  <th className="px-4 py-2.5 font-medium">Feature</th>
                  <th className="px-4 py-2.5 font-medium">TT</th>
                  <th className="px-4 py-2.5 font-medium text-right">ms</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((r) => (
                  <tr key={r.id} className="border-b border-panel/20 last:border-0">
                    <td className="px-4 py-2.5 tabular-nums text-ink-muted whitespace-nowrap">
                      {new Date(r.created_at).toLocaleString('vi-VN', {
                        timeZone: 'Asia/Ho_Chi_Minh',
                      })}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-xs">{r.module_key}</td>
                    <td className="px-4 py-2.5 font-mono text-xs">{r.feature_key}</td>
                    <td className="px-4 py-2.5">
                      {r.ok ? (
                        <span className="text-success">OK</span>
                      ) : (
                        <span className="text-danger">Lỗi</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums">
                      {r.latency_ms ?? '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
