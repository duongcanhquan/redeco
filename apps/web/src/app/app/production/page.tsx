import Link from 'next/link';
import {
  ArrowRight,
  Factory,
  Layers,
  ClipboardList,
  FileEdit,
  Play,
  Cog,
  CheckCircle2,
  Settings,
} from 'lucide-react';
import { BentoStackBars } from '@/components/sales/bento-charts';
import { FlowSteps } from '@/components/ui/flow-steps';
import { PageHeader } from '@/components/ui/page-header';
import { StatTile } from '@/components/ui/stat-tile';
import { createServerSupabase, getSessionClaims } from '@/lib/supabase/server';
import { listBoms, listWorkOrders } from '@/services/production.service';
import { getMyRootModules } from '@/services/sales.service';

export const dynamic = 'force-dynamic';

export default async function ProductionHubPage() {
  const [supabase, claims] = await Promise.all([
    createServerSupabase(),
    getSessionClaims(),
  ]);
  const base = claims?.tenantSlug ? `/${claims.tenantSlug}` : '/app';
  const modules = await getMyRootModules(supabase);
  const hasSx = modules.some((m) => m.key === 'san-xuat');

  if (!hasSx) {
    return (
      <div className="glass rounded-2xl py-16 text-center max-w-lg mx-auto">
        <Factory className="mx-auto text-warning" size={32} aria-hidden />
        <p className="mt-4 font-medium">Chưa mở Sản xuất</p>
        <p className="mt-1 text-sm text-ink-muted px-4">Liên hệ quản trị để bật module Sản xuất.</p>
      </div>
    );
  }

  const [boms, orders] = await Promise.all([listBoms(supabase), listWorkOrders(supabase)]);

  const draft = orders.filter((o) => o.status === 'draft').length;
  const released = orders.filter((o) => o.status === 'released').length;
  const running = orders.filter((o) => o.status === 'in_progress').length;
  const done = orders.filter((o) => o.status === 'completed').length;
  const activeBoms = boms.filter((b) => b.status === 'active').length;

  return (
    <div className="space-y-5">
      <PageHeader
        icon={<Factory size={24} />}
        title="Sản xuất"
        helpTitle="Làm việc thế nào?"
        help={
          <>
            <p>1. Tạo định mức (nguyên liệu cho mỗi sản phẩm).</p>
            <p>2. Tạo lệnh sản xuất → phát hành → xuất NVL → nhập thành phẩm.</p>
            <p>Ngày hẹn giao cho bán hàng lấy từ lệnh đang chạy và thời gian chờ của công ty.</p>
          </>
        }
        actions={
          <Link
            href={`${base}/settings?tab=production`}
            className="inline-flex items-center gap-2 h-11 px-3 rounded-xl border border-panel/40 text-sm hover:border-accent/40"
          >
            <Settings size={16} aria-hidden />
            Cài đặt
          </Link>
        }
      />

      <FlowSteps
        ariaLabel="Luồng lệnh sản xuất"
        steps={[
          {
            key: 'draft',
            label: 'Nháp',
            icon: <FileEdit size={18} />,
            count: draft,
            tone: draft > 0 ? 'default' : 'default',
          },
          {
            key: 'released',
            label: 'Đã phát hành',
            icon: <Play size={18} />,
            count: released,
            tone: released > 0 ? 'accent' : 'default',
          },
          {
            key: 'run',
            label: 'Đang làm',
            icon: <Cog size={18} />,
            count: running,
            tone: running > 0 ? 'warning' : 'default',
          },
          {
            key: 'done',
            label: 'Xong',
            icon: <CheckCircle2 size={18} />,
            count: done,
            tone: done > 0 ? 'success' : 'default',
          },
        ]}
      />

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <StatTile icon={<Layers size={18} />} label="Định mức đang dùng" value={activeBoms} />
        <StatTile
          icon={<ClipboardList size={18} />}
          label="Lệnh đang mở"
          value={draft + released + running}
        />
        <StatTile
          icon={<CheckCircle2 size={18} />}
          label="Đã hoàn thành"
          value={done}
          tone="success"
        />
      </div>

      <section className="glass rounded-2xl p-4">
        <h2 className="text-sm font-semibold mb-2">Phân loại lệnh</h2>
        <BentoStackBars
          ariaLabel="Phân loại lệnh sản xuất"
          slices={[
            { key: 'd', label: 'Nháp', count: draft, tone: 'muted' },
            { key: 'r', label: 'Phát hành', count: released, tone: 'accent' },
            { key: 'i', label: 'Đang làm', count: running, tone: 'warning' },
            { key: 'c', label: 'Xong', count: done, tone: 'success' },
          ]}
        />
      </section>

      <section className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Link
          href={`${base}/production/boms`}
          className="glass glass-hover rounded-2xl p-4 min-h-24 flex items-center gap-3 group"
        >
          <span className="grid size-11 place-items-center rounded-xl bg-accent-soft text-accent">
            <Layers size={22} aria-hidden />
          </span>
          <span className="font-semibold group-hover:text-accent flex items-center gap-1">
            Định mức nguyên liệu
            <ArrowRight size={14} aria-hidden />
          </span>
        </Link>
        <Link
          href={`${base}/production/work-orders`}
          className="glass glass-hover rounded-2xl p-4 min-h-24 flex items-center gap-3 group"
        >
          <span className="grid size-11 place-items-center rounded-xl bg-accent-soft text-accent">
            <ClipboardList size={22} aria-hidden />
          </span>
          <span className="font-semibold group-hover:text-accent flex items-center gap-1">
            Lệnh sản xuất
            <ArrowRight size={14} aria-hidden />
          </span>
        </Link>
      </section>
    </div>
  );
}
