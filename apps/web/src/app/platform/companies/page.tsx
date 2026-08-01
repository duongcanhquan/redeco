import { AlarmClock, Boxes, Building2, ScrollText } from 'lucide-react';
import { createServerSupabase } from '@/lib/supabase/server';
import { TabBar } from '@/components/platform/tab-bar';
import {
  buildModuleTree,
  entitledModuleIdsOf,
  listContracts,
  listModules,
  listTenants,
  type ContractRow,
  type ModuleTreeNode,
  type TenantRow,
} from '@/services/platform.service';
import { ContractStatusActions } from '../contracts/contract-status-actions';
import { CreateContractDialog } from '../contracts/create-contract-dialog';
import { ModuleCatalogView } from '../modules/module-catalog-view';
import { CompanyActions } from './company-actions';
import { CompanyDomainDialog } from './company-domain-dialog';
import { CompanyModulesDialog } from './company-modules-dialog';
import { CreateCompanyDialog } from './create-company-dialog';

export const dynamic = 'force-dynamic';

type TabKey = 'companies' | 'contracts' | 'modules';

/** Tên các module gốc mà công ty được cấp (gốc được tick hoặc có node con được tick). */
function entitledRootNames(tree: ModuleTreeNode[], ids: Set<string>): string[] {
  const hasAny = (node: ModuleTreeNode): boolean =>
    ids.has(node.id) || node.children.some(hasAny);
  return tree.filter(hasAny).map((root) => root.name);
}

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab: rawTab } = await searchParams;
  const tab: TabKey =
    rawTab === 'contracts' || rawTab === 'modules' ? rawTab : 'companies';

  const supabase = await createServerSupabase();
  const [tenants, contracts, modules] = await Promise.all([
    listTenants(supabase),
    listContracts(supabase),
    listModules(supabase),
  ]);
  const moduleTree = buildModuleTree(modules.filter((m) => m.is_active));
  const fullTree = buildModuleTree(modules);

  const tabs = [
    {
      key: 'companies',
      label: 'Khách hàng',
      icon: <Building2 size={16} aria-hidden />,
      href: '/platform/companies',
      count: tenants.length,
    },
    {
      key: 'contracts',
      label: 'Hợp đồng',
      icon: <ScrollText size={16} aria-hidden />,
      href: '/platform/companies?tab=contracts',
      count: contracts.length,
    },
    {
      key: 'modules',
      label: 'Danh mục module',
      icon: <Boxes size={16} aria-hidden />,
      href: '/platform/companies?tab=modules',
      count: fullTree.length,
    },
  ];

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Building2 className="text-accent" size={24} aria-hidden />
            Khách hàng
          </h1>
          <p className="text-sm text-ink-muted mt-1">
            Thêm khách hàng, cấp module, theo dõi hợp đồng — tất cả trong một nơi.
          </p>
        </div>
        {tab === 'companies' && <CreateCompanyDialog moduleTree={moduleTree} />}
        {tab === 'contracts' && (
          <CreateContractDialog tenants={tenants} moduleTree={moduleTree} />
        )}
      </header>

      <TabBar items={tabs} activeKey={tab} />

      {tab === 'companies' && <CompaniesSection tenants={tenants} moduleTree={moduleTree} />}
      {tab === 'contracts' && <ContractsSection contracts={contracts} />}
      {tab === 'modules' && (
        <div className="space-y-3">
          <p className="text-sm text-ink-muted">
            Hệ thống có sẵn các module dưới đây (chỉ xem — sẽ phát triển thêm về sau). Việc cấp
            module cho từng khách hàng thực hiện ở tab <strong>Khách hàng</strong> → nút “Gán
            module”.
          </p>
          <ModuleCatalogView tree={fullTree} />
        </div>
      )}
    </div>
  );
}

// ------------------------------------------------------------
// Tab 1: Khách hàng
// ------------------------------------------------------------

function CompaniesSection({
  tenants,
  moduleTree,
}: {
  tenants: TenantRow[];
  moduleTree: ModuleTreeNode[];
}) {
  if (tenants.length === 0) {
    return (
      <div className="glass rounded-2xl py-16 text-center">
        <Building2 className="mx-auto text-ink-muted" size={32} aria-hidden />
        <p className="mt-4 font-medium">Chưa có khách hàng nào</p>
        <p className="mt-1 text-sm text-ink-muted">
          Bấm &quot;Tạo công ty&quot; để tạo khách hàng đầu tiên kèm tài khoản admin và module.
        </p>
      </div>
    );
  }

  return (
    <div className="glass rounded-2xl overflow-hidden overflow-x-auto">
      <table className="w-full text-sm min-w-210">
        <thead>
          <tr className="border-b border-panel/40 text-left text-ink-muted">
            <th className="px-5 py-3.5 font-medium">Khách hàng</th>
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
                  <p className="font-mono text-xs text-ink-muted">optimake.com/{t.slug}</p>
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
                    <CompanyDomainDialog
                      tenantId={t.id}
                      tenantName={t.name}
                      currentSlug={t.slug}
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
  );
}

// ------------------------------------------------------------
// Tab 2: Hợp đồng
// ------------------------------------------------------------

const CONTRACT_STATUS: Record<ContractRow['status'], { label: string; cls: string }> = {
  draft: { label: 'Nháp', cls: 'bg-glass text-ink-muted' },
  active: { label: 'Hiệu lực', cls: 'bg-success/10 text-success' },
  suspended: { label: 'Tạm dừng', cls: 'bg-warning/10 text-warning' },
  terminated: { label: 'Đã hủy', cls: 'bg-danger/10 text-danger' },
};

const EXPIRING_SOON_DAYS = 30;

function daysLeft(endsOn: string): number {
  return Math.ceil((new Date(`${endsOn}T23:59:59`).getTime() - Date.now()) / 86_400_000);
}

function ContractsSection({ contracts }: { contracts: ContractRow[] }) {
  if (contracts.length === 0) {
    return (
      <div className="glass rounded-2xl py-16 text-center">
        <ScrollText className="mx-auto text-ink-muted" size={32} aria-hidden />
        <p className="mt-4 font-medium">Chưa có hợp đồng nào</p>
        <p className="mt-1 text-sm text-ink-muted">
          Hợp đồng tự sinh khi cấp module, hoặc bấm &quot;Lập hợp đồng&quot; để lập thủ công.
        </p>
      </div>
    );
  }

  return (
    <div className="glass rounded-2xl overflow-hidden overflow-x-auto">
      <table className="w-full text-sm min-w-220">
        <thead>
          <tr className="border-b border-panel/40 text-left text-ink-muted">
            <th className="px-5 py-3.5 font-medium">Mã HĐ</th>
            <th className="px-5 py-3.5 font-medium">Khách hàng</th>
            <th className="px-5 py-3.5 font-medium">Module</th>
            <th className="px-5 py-3.5 font-medium">Thời hạn</th>
            <th className="px-5 py-3.5 font-medium">Seats</th>
            <th className="px-5 py-3.5 font-medium">Trạng thái</th>
            <th className="px-5 py-3.5 font-medium">Thao tác</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-panel/30">
          {contracts.map((c) => {
            const remaining = daysLeft(c.ends_on);
            const expiringSoon =
              c.status === 'active' && remaining >= 0 && remaining <= EXPIRING_SOON_DAYS;
            return (
              <tr key={c.id} className="hover:bg-glass transition-colors">
                <td className="px-5 py-3.5 font-medium">{c.code}</td>
                <td className="px-5 py-3.5">{c.tenants?.name ?? '—'}</td>
                <td className="px-5 py-3.5">
                  <div className="flex flex-wrap gap-1 max-w-52">
                    {(c.contract_entitlements ?? []).map((e, i) =>
                      e.modules ? (
                        <span
                          key={i}
                          className="rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-medium text-accent whitespace-nowrap"
                        >
                          {e.modules.name}
                        </span>
                      ) : null,
                    )}
                  </div>
                </td>
                <td className="px-5 py-3.5 text-ink-muted">
                  <span className="whitespace-nowrap">
                    {c.starts_on} → {c.ends_on}
                  </span>
                  {expiringSoon && (
                    <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-warning/10 px-2 py-0.5 text-xs font-medium text-warning">
                      <AlarmClock size={12} aria-hidden />
                      còn {remaining} ngày
                    </span>
                  )}
                </td>
                <td className="px-5 py-3.5">{c.seats}</td>
                <td className="px-5 py-3.5">
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${CONTRACT_STATUS[c.status].cls}`}
                  >
                    {CONTRACT_STATUS[c.status].label}
                  </span>
                </td>
                <td className="px-5 py-3.5">
                  <ContractStatusActions contract={c} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
