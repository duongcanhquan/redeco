import { Building2 } from 'lucide-react';
import { createServerSupabase } from '@/lib/supabase/server';
import {
  buildModuleTree,
  entitledModuleIdsOf,
  listModules,
  listTenants,
  type ModuleTreeNode,
} from '@/services/platform.service';
import { CompanyActions } from './company-actions';
import { CompanyModulesDialog } from './company-modules-dialog';
import { CreateCompanyDialog } from './create-company-dialog';

export const dynamic = 'force-dynamic';

/** Tên các module gốc mà công ty được cấp (gốc được tick hoặc có node con được tick). */
function entitledRootNames(tree: ModuleTreeNode[], ids: Set<string>): string[] {
  const hasAny = (node: ModuleTreeNode): boolean =>
    ids.has(node.id) || node.children.some(hasAny);
  return tree.filter(hasAny).map((root) => root.name);
}

export default async function CompaniesPage() {
  const supabase = await createServerSupabase();
  const [tenants, modules] = await Promise.all([listTenants(supabase), listModules(supabase)]);
  const moduleTree = buildModuleTree(modules.filter((m) => m.is_active));

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Building2 className="text-accent" size={24} aria-hidden />
            Công ty
          </h1>
          <p className="text-sm text-ink-muted mt-1">
            Các doanh nghiệp đang vận hành trên nền tảng — cấp module ngay khi tạo hoặc qua nút
            “Gán module”.
          </p>
        </div>
        <CreateCompanyDialog moduleTree={moduleTree} />
      </header>

      {tenants.length === 0 ? (
        <div className="glass rounded-2xl py-16 text-center">
          <Building2 className="mx-auto text-ink-muted" size={32} aria-hidden />
          <p className="mt-4 font-medium">Chưa có công ty nào</p>
          <p className="mt-1 text-sm text-ink-muted">
            Bấm &quot;Tạo công ty&quot; để tạo khách hàng đầu tiên kèm tài khoản admin.
          </p>
        </div>
      ) : (
        <div className="glass rounded-2xl overflow-hidden overflow-x-auto">
          <table className="w-full text-sm min-w-210">
            <thead>
              <tr className="border-b border-panel/40 text-left text-ink-muted">
                <th className="px-5 py-3.5 font-medium">Tên công ty</th>
                <th className="px-5 py-3.5 font-medium">Admin</th>
                <th className="px-5 py-3.5 font-medium">Thành viên</th>
                <th className="px-5 py-3.5 font-medium">Module được cấp</th>
                <th className="px-5 py-3.5 font-medium">Trạng thái</th>
                <th className="px-5 py-3.5 font-medium">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-panel/30">
              {tenants.map((t) => {
                const entitledIds = entitledModuleIdsOf(t);
                const rootNames = entitledRootNames(moduleTree, entitledIds);
                return (
                  <tr key={t.id} className="hover:bg-glass transition-colors align-top">
                    <td className="px-5 py-3.5">
                      <p className="font-medium">{t.name}</p>
                      <p className="font-mono text-xs text-ink-muted">{t.slug}.optimake.com</p>
                    </td>
                    <td className="px-5 py-3.5 text-ink-muted break-all">
                      {t.attributes.admin_email ?? '—'}
                    </td>
                    <td className="px-5 py-3.5">{t.user_profiles?.[0]?.count ?? 0}</td>
                    <td className="px-5 py-3.5">
                      {rootNames.length === 0 ? (
                        <span className="text-xs text-ink-muted">Chưa cấp module</span>
                      ) : (
                        <span className="flex flex-wrap gap-1.5">
                          {rootNames.map((name) => (
                            <span
                              key={name}
                              className="rounded-lg bg-accent-soft border border-accent/25 px-2 py-0.5 text-xs text-accent whitespace-nowrap"
                            >
                              {name}
                            </span>
                          ))}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          t.status === 'active'
                            ? 'bg-success/10 text-success'
                            : 'bg-warning/10 text-warning'
                        }`}
                      >
                        {t.status === 'active' ? 'Hoạt động' : 'Tạm dừng'}
                      </span>
                      <p className="mt-1 text-[11px] text-ink-muted">
                        Tạo {new Date(t.created_at).toLocaleDateString('vi-VN')}
                      </p>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <CompanyModulesDialog
                          tenantId={t.id}
                          tenantName={t.name}
                          moduleTree={moduleTree}
                          currentModuleIds={[...entitledIds]}
                        />
                        <CompanyActions tenant={t} />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
