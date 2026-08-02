import {
  Bell,
  Bot,
  Boxes,
  Building2,
  CalendarClock,
  Plug,
  Settings,
  ShoppingCart,
  Users,
} from 'lucide-react';
import { ModuleTreePicker } from '@/components/platform/module-tree-picker';
import { TabBar } from '@/components/platform/tab-bar';
import { formatDate } from '@/lib/format';
import { getSessionClaims } from '@/lib/supabase/server';
import { getMyRootModules, getTenantContext } from '@/services/sales.service';
import { getEntitledModuleTree, getSeatInfo } from '@/services/tenant-admin.service';
import {
  getAiSettings,
  getIntegrationsSettings,
  getNotificationsSettings,
  getSalesSettings,
} from '@/services/tenant-settings.service';
import { AiSettingsForm } from './ai-settings-form';
import { IntegrationsForm } from './integrations-form';
import { NotificationsForm } from './notifications-form';
import { SalesSettingsForm } from './sales-settings-form';
import { SettingsGroup } from './settings-group';

export const dynamic = 'force-dynamic';

type TabKey = 'overview' | 'ai' | 'sales' | 'integrations' | 'notifications';

export default async function TenantSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab: rawTab } = await searchParams;
  const ctx = await getTenantContext();
  const claims = await getSessionClaims();
  const base = claims?.tenantSlug ? `/${claims.tenantSlug}` : '/app';
  const isManager = ctx.role === 'owner' || ctx.role === 'admin';

  const [{ data: tenant }, { tree, entitledIds }, seat, modules] = await Promise.all([
    ctx.supabase.from('tenants').select('name, slug').eq('id', ctx.tenantId).single(),
    getEntitledModuleTree(ctx.supabase, ctx.tenantId),
    getSeatInfo(ctx.supabase, ctx.tenantId),
    getMyRootModules(ctx.supabase),
  ]);
  const info = tenant as { name: string; slug: string } | null;
  const hasSales = modules.some((m) => m.key === 'kinh-doanh');

  const tab: TabKey =
    rawTab === 'ai' ||
    rawTab === 'sales' ||
    rawTab === 'integrations' ||
    rawTab === 'notifications'
      ? rawTab
      : 'overview';

  // Member chỉ xem Tổng quan; tab khác fallback overview
  const activeTab: TabKey = !isManager && tab !== 'overview' ? 'overview' : tab;
  // Sales tab chỉ khi có module
  const safeTab: TabKey =
    activeTab === 'sales' && !hasSales ? 'overview' : activeTab;

  const tabs = [
    {
      key: 'overview',
      label: 'Tổng quan',
      icon: <Building2 size={16} aria-hidden />,
      href: `${base}/settings`,
    },
    ...(isManager
      ? [
          {
            key: 'ai',
            label: 'AI & API',
            icon: <Bot size={16} aria-hidden />,
            href: `${base}/settings?tab=ai`,
          },
          ...(hasSales
            ? [
                {
                  key: 'sales',
                  label: 'Kinh doanh',
                  icon: <ShoppingCart size={16} aria-hidden />,
                  href: `${base}/settings?tab=sales`,
                },
              ]
            : []),
          {
            key: 'integrations',
            label: 'Tích hợp',
            icon: <Plug size={16} aria-hidden />,
            href: `${base}/settings?tab=integrations`,
          },
          {
            key: 'notifications',
            label: 'Thông báo',
            icon: <Bell size={16} aria-hidden />,
            href: `${base}/settings?tab=notifications`,
          },
        ]
      : []),
  ];

  const [ai, sales, integrations, notifications] = isManager
    ? await Promise.all([
        safeTab === 'ai' ? getAiSettings() : Promise.resolve(null),
        safeTab === 'sales' && hasSales ? getSalesSettings() : Promise.resolve(null),
        safeTab === 'integrations' ? getIntegrationsSettings() : Promise.resolve(null),
        safeTab === 'notifications' ? getNotificationsSettings() : Promise.resolve(null),
      ])
    : [null, null, null, null];

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Settings className="text-accent" size={24} aria-hidden />
          Cài đặt công ty
        </h1>
        <p className="text-sm text-ink-muted mt-1 max-w-2xl">
          Cấu hình riêng của doanh nghiệp bạn: gói dịch vụ, API AI, tham số từng module và tích
          hợp. Mỗi tab một nhóm việc — không trộn API với quy trình bán hàng.
        </p>
      </header>

      <TabBar items={tabs} activeKey={safeTab} />

      {safeTab === 'overview' && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <section className="glass rounded-2xl p-5 flex items-start gap-3">
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-accent-soft border border-accent/25 text-accent">
                <Building2 size={20} aria-hidden />
              </span>
              <div className="min-w-0">
                <p className="text-sm text-ink-muted">Công ty</p>
                <p className="font-bold truncate">{info?.name ?? '—'}</p>
                <p className="font-mono text-xs text-ink-muted truncate">
                  /{info?.slug}/login
                </p>
              </div>
            </section>
            <section className="glass rounded-2xl p-5 flex items-start gap-3">
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-accent-soft border border-accent/25 text-accent">
                <CalendarClock size={20} aria-hidden />
              </span>
              <div>
                <p className="text-sm text-ink-muted">Hợp đồng</p>
                {seat.contractCode ? (
                  <>
                    <p className="font-bold font-mono">{seat.contractCode}</p>
                    <p className="text-xs text-ink-muted">Hiệu lực đến {formatDate(seat.endsOn)}</p>
                  </>
                ) : (
                  <p className="font-medium text-warning text-sm mt-1">
                    Chưa có hợp đồng hiệu lực — liên hệ Optimake.
                  </p>
                )}
              </div>
            </section>
            <section className="glass rounded-2xl p-5 flex items-start gap-3">
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-accent-soft border border-accent/25 text-accent">
                <Users size={20} aria-hidden />
              </span>
              <div>
                <p className="text-sm text-ink-muted">Người dùng (seats)</p>
                <p className="font-bold">
                  {seat.used}
                  {seat.total !== null && (
                    <span className="text-ink-muted font-normal"> / {seat.total}</span>
                  )}
                </p>
                <p className="text-xs text-ink-muted">tài khoản đang hoạt động</p>
              </div>
            </section>
          </div>

          <SettingsGroup
            title="Module đã cài đặt"
            description="Do Optimake cấp theo hợp đồng. Muốn mở thêm module — liên hệ hỗ trợ. Cài đặt chi tiết từng module nằm ở các tab tương ứng (vd Kinh doanh)."
            icon={<Boxes size={18} className="text-accent" aria-hidden />}
          >
            <ModuleTreePicker
              tree={tree}
              selected={entitledIds}
              readOnly
              emptyText="Chưa có module nào được cài đặt cho công ty."
            />
          </SettingsGroup>

          {!isManager && (
            <p className="text-sm text-ink-muted glass rounded-2xl px-4 py-3">
              Bạn đang xem với quyền thành viên. Chỉ quản trị công ty (owner/admin) mới sửa được AI
              API, tham số module và tích hợp.
            </p>
          )}
        </div>
      )}

      {safeTab === 'ai' && ai && <AiSettingsForm initial={ai} />}
      {safeTab === 'sales' && sales && (
        <SalesSettingsForm initial={sales} basePath={base} />
      )}
      {safeTab === 'integrations' && integrations && (
        <IntegrationsForm initial={integrations} />
      )}
      {safeTab === 'notifications' && notifications && (
        <NotificationsForm initial={notifications} />
      )}
    </div>
  );
}
