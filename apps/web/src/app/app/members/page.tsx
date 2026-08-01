import { ShieldCheck, UserRound, Users } from 'lucide-react';
import { redirect } from 'next/navigation';
import type { ModuleTreeNode } from '@/services/platform.service';
import { getTenantContext } from '@/services/sales.service';
import { getEntitledModuleTree, getSeatInfo, listMembers } from '@/services/tenant-admin.service';
import { MemberDialog } from './member-dialog';
import { MemberRowActions } from './member-row-actions';

export const dynamic = 'force-dynamic';

const ROLE_LABEL: Record<string, string> = {
  owner: 'Chủ công ty',
  admin: 'Quản trị',
  member: 'Thành viên',
};

function rootNamesFor(tree: ModuleTreeNode[], ids: Set<string>): string[] {
  const hasAny = (node: ModuleTreeNode): boolean => ids.has(node.id) || node.children.some(hasAny);
  return tree.filter(hasAny).map((r) => r.name);
}

export default async function MembersPage() {
  const ctx = await getTenantContext();
  if (ctx.role !== 'owner' && ctx.role !== 'admin') redirect('/app');

  const [members, { tree }, seat] = await Promise.all([
    listMembers(ctx.supabase),
    getEntitledModuleTree(ctx.supabase, ctx.tenantId),
    getSeatInfo(ctx.supabase, ctx.tenantId),
  ]);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="text-accent" size={24} aria-hidden />
            Thành viên
          </h1>
          <p className="text-sm text-ink-muted mt-1">
            Tạo tài khoản theo chức năng và phân công module từ những module công ty đang có.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span
            className={`rounded-xl border px-3 py-2 text-sm ${
              seat.total !== null && seat.used >= seat.total
                ? 'bg-warning/10 border-warning/30 text-warning'
                : 'bg-glass border-panel/50 text-ink-muted'
            }`}
          >
            Seats: <strong className="text-ink">{seat.used}</strong>
            {seat.total !== null ? ` / ${seat.total}` : ' (chưa có hợp đồng)'}
          </span>
          <MemberDialog entitledTree={tree} />
        </div>
      </header>

      <section className="glass rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-190">
            <thead>
              <tr className="border-b border-panel/40 text-left text-ink-muted">
                <th className="px-5 py-3.5 font-medium">Thành viên</th>
                <th className="px-5 py-3.5 font-medium">Vai trò</th>
                <th className="px-5 py-3.5 font-medium">Module được giao</th>
                <th className="px-5 py-3.5 font-medium">Tham gia</th>
                <th className="px-5 py-3.5 font-medium text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-panel/30">
              {members.map((m) => {
                const isManager = m.role === 'owner' || m.role === 'admin';
                const assignedIds = new Set(
                  (m.user_module_assignments ?? []).map((a) => a.module_id),
                );
                const names = rootNamesFor(tree, assignedIds);
                const isSelf = m.id === ctx.userId;
                return (
                  <tr key={m.id} className="hover:bg-glass transition-colors align-top">
                    <td className="px-5 py-3.5">
                      <p className="font-medium flex items-center gap-2">
                        {isManager ? (
                          <ShieldCheck size={15} className="text-accent shrink-0" aria-hidden />
                        ) : (
                          <UserRound size={15} className="text-ink-muted shrink-0" aria-hidden />
                        )}
                        {m.full_name ?? '—'}
                        {isSelf && <span className="text-xs text-ink-muted">(bạn)</span>}
                      </p>
                      <p className="text-xs text-ink-muted break-all">
                        {m.attributes.email ?? ''}
                      </p>
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`inline-flex rounded-lg px-2 py-0.5 text-xs border ${
                          isManager
                            ? 'bg-accent-soft border-accent/25 text-accent'
                            : 'bg-glass-strong border-panel/50 text-ink-muted'
                        }`}
                      >
                        {ROLE_LABEL[m.role] ?? m.role}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      {isManager ? (
                        <span className="text-xs text-ink-muted">
                          Toàn bộ module công ty được cấp
                        </span>
                      ) : names.length === 0 ? (
                        <span className="text-xs text-warning">Chưa phân công</span>
                      ) : (
                        <span className="flex flex-wrap gap-1.5">
                          {names.map((n) => (
                            <span
                              key={n}
                              className="rounded-lg bg-accent-soft border border-accent/25 px-2 py-0.5 text-xs text-accent whitespace-nowrap"
                            >
                              {n}
                            </span>
                          ))}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-ink-muted">
                      {new Date(m.created_at).toLocaleDateString('vi-VN')}
                    </td>
                    <td className="px-5 py-3.5">
                      {m.role !== 'owner' && !isSelf ? (
                        <div className="flex flex-wrap items-center justify-end gap-1.5">
                          <MemberDialog member={m} entitledTree={tree} />
                          <MemberRowActions userId={m.id} memberName={m.full_name ?? 'thành viên'} />
                        </div>
                      ) : (
                        <span className="block text-right text-xs text-ink-muted">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
