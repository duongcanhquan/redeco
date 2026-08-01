import { Boxes, Building2, CalendarClock, Settings, Users } from 'lucide-react';
import { ModuleTreePicker } from '@/components/platform/module-tree-picker';
import { formatDate } from '@/lib/format';
import { getTenantContext } from '@/services/sales.service';
import { getEntitledModuleTree, getSeatInfo } from '@/services/tenant-admin.service';

export const dynamic = 'force-dynamic';

export default async function TenantSettingsPage() {
  const ctx = await getTenantContext();
  const [{ data: tenant }, { tree, entitledIds }, seat] = await Promise.all([
    ctx.supabase.from('tenants').select('name, slug').eq('id', ctx.tenantId).single(),
    getEntitledModuleTree(ctx.supabase, ctx.tenantId),
    getSeatInfo(ctx.supabase, ctx.tenantId),
  ]);
  const info = tenant as { name: string; slug: string } | null;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Settings className="text-accent" size={24} aria-hidden />
          Cài đặt công ty
        </h1>
        <p className="text-sm text-ink-muted mt-1">
          Gói dịch vụ và các module Optimake đã cài đặt cho công ty bạn.
        </p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <section className="glass rounded-2xl p-5 flex items-start gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-accent-soft border border-accent/25 text-accent">
            <Building2 size={20} aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="text-sm text-ink-muted">Công ty</p>
            <p className="font-bold truncate">{info?.name ?? '—'}</p>
            <p className="font-mono text-xs text-ink-muted truncate">{info?.slug}.optimake.com</p>
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
              {seat.total !== null && <span className="text-ink-muted font-normal"> / {seat.total}</span>}
            </p>
            <p className="text-xs text-ink-muted">tài khoản đang hoạt động</p>
          </div>
        </section>
      </div>

      <section className="glass rounded-2xl p-5">
        <h2 className="font-semibold flex items-center gap-2 mb-1">
          <Boxes size={18} className="text-accent" aria-hidden />
          Module đã cài đặt
        </h2>
        <p className="text-sm text-ink-muted mb-4">
          Các module/tính năng trong gói của công ty. Muốn mở thêm module, liên hệ Optimake.
        </p>
        <ModuleTreePicker
          tree={tree}
          selected={entitledIds}
          readOnly
          emptyText="Chưa có module nào được cài đặt cho công ty."
        />
      </section>
    </div>
  );
}
