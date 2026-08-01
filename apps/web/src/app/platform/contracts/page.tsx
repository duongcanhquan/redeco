import { AlarmClock, ScrollText } from 'lucide-react';
import { createServerSupabase } from '@/lib/supabase/server';
import {
  buildModuleTree,
  listContracts,
  listModules,
  listTenants,
  type ContractRow,
} from '@/services/platform.service';
import { ContractStatusActions } from './contract-status-actions';
import { CreateContractDialog } from './create-contract-dialog';

export const dynamic = 'force-dynamic';

const STATUS: Record<ContractRow['status'], { label: string; cls: string }> = {
  draft: { label: 'Nháp', cls: 'bg-glass text-ink-muted' },
  active: { label: 'Hiệu lực', cls: 'bg-success/10 text-success' },
  suspended: { label: 'Tạm dừng', cls: 'bg-warning/10 text-warning' },
  terminated: { label: 'Đã hủy', cls: 'bg-danger/10 text-danger' },
};

const EXPIRING_SOON_DAYS = 30;

function daysLeft(endsOn: string): number {
  return Math.ceil((new Date(`${endsOn}T23:59:59`).getTime() - Date.now()) / 86_400_000);
}

export default async function ContractsPage() {
  const supabase = await createServerSupabase();
  const [contracts, tenants, modules] = await Promise.all([
    listContracts(supabase),
    listTenants(supabase),
    listModules(supabase),
  ]);
  const moduleTree = buildModuleTree(modules);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ScrollText className="text-accent" size={24} aria-hidden />
            Hợp đồng
          </h1>
          <p className="text-sm text-ink-muted mt-1">
            Theo dõi thời hạn, seats và module đã bán cho từng công ty.
          </p>
        </div>
        <CreateContractDialog tenants={tenants} moduleTree={moduleTree} />
      </header>

      {contracts.length === 0 ? (
        <div className="glass rounded-2xl py-16 text-center">
          <ScrollText className="mx-auto text-ink-muted" size={32} aria-hidden />
          <p className="mt-4 font-medium">Chưa có hợp đồng nào</p>
          <p className="mt-1 text-sm text-ink-muted">
            Bấm &quot;Lập hợp đồng&quot; để phân bổ module và thời hạn cho công ty.
          </p>
        </div>
      ) : (
        <div className="glass rounded-2xl overflow-hidden overflow-x-auto">
          <table className="w-full text-sm min-w-220">
            <thead>
              <tr className="border-b border-panel/40 text-left text-ink-muted">
                <th className="px-5 py-3.5 font-medium">Mã HĐ</th>
                <th className="px-5 py-3.5 font-medium">Công ty</th>
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
                        className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS[c.status].cls}`}
                      >
                        {STATUS[c.status].label}
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
      )}
    </div>
  );
}
