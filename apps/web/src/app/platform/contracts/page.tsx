import { AlarmClock, Plus, ScrollText } from 'lucide-react';
import { createServerSupabase } from '@/lib/supabase/server';
import { listContracts, type ContractRow } from '@/services/platform.service';

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
  const contracts = await listContracts(supabase);

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
        <button
          type="button"
          disabled
          title="Sắp ra mắt — cần Platform API (bước tiếp theo)"
          className="inline-flex items-center gap-2 rounded-xl bg-accent-soft border border-accent/30 px-4 py-2.5 text-sm font-semibold text-accent opacity-50 cursor-not-allowed"
        >
          <Plus size={16} aria-hidden />
          Lập hợp đồng
        </button>
      </header>

      {contracts.length === 0 ? (
        <div className="glass rounded-2xl py-16 text-center">
          <ScrollText className="mx-auto text-ink-muted" size={32} aria-hidden />
          <p className="mt-4 font-medium">Chưa có hợp đồng nào</p>
          <p className="mt-1 text-sm text-ink-muted">
            Sau khi có công ty, superadmin lập hợp đồng và phân bổ module tại đây.
          </p>
        </div>
      ) : (
        <div className="glass rounded-2xl overflow-hidden overflow-x-auto">
          <table className="w-full text-sm min-w-160">
            <thead>
              <tr className="border-b border-panel/40 text-left text-ink-muted">
                <th className="px-5 py-3.5 font-medium">Mã HĐ</th>
                <th className="px-5 py-3.5 font-medium">Công ty</th>
                <th className="px-5 py-3.5 font-medium">Thời hạn</th>
                <th className="px-5 py-3.5 font-medium">Seats</th>
                <th className="px-5 py-3.5 font-medium">Trạng thái</th>
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
