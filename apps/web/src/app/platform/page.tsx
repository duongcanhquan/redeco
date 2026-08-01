import {
  AlarmClock,
  Boxes,
  Building2,
  CalendarDays,
  ScrollText,
  Sparkles,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { createServerSupabase } from '@/lib/supabase/server';
import {
  getPlatformOverview,
  listModules,
  buildModuleTree,
  type ContractRow,
} from '@/services/platform.service';

export const dynamic = 'force-dynamic';

const STATUS_LABEL: Record<ContractRow['status'], { label: string; cls: string }> = {
  draft: { label: 'Nháp', cls: 'text-ink-muted bg-glass' },
  active: { label: 'Hiệu lực', cls: 'text-success bg-success/10' },
  suspended: { label: 'Tạm dừng', cls: 'text-warning bg-warning/10' },
  terminated: { label: 'Đã hủy', cls: 'text-danger bg-danger/10' },
};

export default async function PlatformDashboard() {
  const supabase = await createServerSupabase();
  const [overview, modules] = await Promise.all([
    getPlatformOverview(supabase),
    listModules(supabase),
  ]);
  const tree = buildModuleTree(modules);

  const stats = [
    { label: 'Công ty', value: overview.tenantCount, icon: Building2, href: '/platform/companies' },
    { label: 'Hợp đồng hiệu lực', value: overview.activeContractCount, icon: ScrollText, href: '/platform/contracts' },
    { label: 'Sắp hết hạn (30 ngày)', value: overview.expiringSoonCount, icon: AlarmClock, href: '/platform/contracts', warn: overview.expiringSoonCount > 0 },
    { label: 'Tổng seats đang bán', value: overview.totalSeats, icon: Users, href: '/platform/contracts' },
  ];

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Tổng quan nền tảng</h1>
        <p className="text-sm text-ink-muted mt-1">
          Toàn cảnh các công ty, hợp đồng và danh mục module của hệ thống.
        </p>
      </header>

      {/* Bento grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {stats.map(({ label, value, icon: Icon, href, warn }) => (
          <Link
            key={label}
            href={href}
            className="glass glass-hover rounded-2xl p-5 flex items-start justify-between"
          >
            <div>
              <p className="text-sm text-ink-muted">{label}</p>
              <p className={`mt-2 text-3xl font-bold ${warn ? 'text-warning' : 'text-ink'}`}>
                {value}
              </p>
            </div>
            <span
              className={`grid size-11 place-items-center rounded-xl border ${
                warn
                  ? 'bg-warning/10 border-warning/30 text-warning'
                  : 'bg-accent-soft border-accent/25 text-accent'
              }`}
            >
              <Icon size={20} aria-hidden />
            </span>
          </Link>
        ))}

        {/* Hợp đồng gần đây — card lớn */}
        <section className="glass rounded-2xl p-5 sm:col-span-2 xl:col-span-3 xl:row-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold flex items-center gap-2">
              <ScrollText size={18} className="text-accent" aria-hidden />
              Hợp đồng gần đây
            </h2>
            <Link href="/platform/contracts" className="text-sm text-accent hover:underline">
              Xem tất cả
            </Link>
          </div>

          {overview.recentContracts.length === 0 ? (
            <div className="py-10 text-center">
              <Sparkles className="mx-auto text-ink-muted" size={28} aria-hidden />
              <p className="mt-3 text-sm text-ink-muted">
                Chưa có hợp đồng nào. Hãy tạo công ty đầu tiên rồi lập hợp đồng cho họ.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-panel/40">
              {overview.recentContracts.map((c) => (
                <li key={c.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-3">
                  <span className="font-medium">{c.code}</span>
                  <span className="text-sm text-ink-muted">{c.tenants?.name ?? '—'}</span>
                  <span className="ml-auto inline-flex items-center gap-1 text-xs text-ink-muted">
                    <CalendarDays size={14} aria-hidden />
                    {c.starts_on} → {c.ends_on}
                  </span>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_LABEL[c.status].cls}`}
                  >
                    {STATUS_LABEL[c.status].label}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Danh mục module */}
        <section className="glass rounded-2xl p-5 sm:col-span-2 xl:col-span-1 xl:row-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold flex items-center gap-2">
              <Boxes size={18} className="text-accent" aria-hidden />
              Danh mục module
            </h2>
            <Link href="/platform/modules" className="text-sm text-accent hover:underline">
              Chi tiết
            </Link>
          </div>
          <p className="text-sm text-ink-muted mb-3">
            {overview.moduleCount} node ({tree.length} module gốc)
          </p>
          <ul className="space-y-2">
            {tree.map((root) => (
              <li
                key={root.id}
                className="flex items-center justify-between rounded-xl bg-glass px-3 py-2.5 border border-panel/30"
              >
                <span className="text-sm font-medium">{root.name}</span>
                <span className="text-xs text-ink-muted">
                  {countDescendants(root)} thành phần
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}

interface TreeNode {
  children: TreeNode[];
}

function countDescendants(node: TreeNode): number {
  return node.children.reduce((sum, child) => sum + 1 + countDescendants(child), 0);
}
