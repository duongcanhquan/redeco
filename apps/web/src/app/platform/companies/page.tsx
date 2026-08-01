import { Building2 } from 'lucide-react';
import { createServerSupabase } from '@/lib/supabase/server';
import { listTenants } from '@/services/platform.service';
import { CreateCompanyDialog } from './create-company-dialog';

export const dynamic = 'force-dynamic';

export default async function CompaniesPage() {
  const supabase = await createServerSupabase();
  const tenants = await listTenants(supabase);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Building2 className="text-accent" size={24} aria-hidden />
            Công ty
          </h1>
          <p className="text-sm text-ink-muted mt-1">
            Các doanh nghiệp đang vận hành trên nền tảng.
          </p>
        </div>
        <CreateCompanyDialog />
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
          <table className="w-full text-sm min-w-130">
            <thead>
              <tr className="border-b border-panel/40 text-left text-ink-muted">
                <th className="px-5 py-3.5 font-medium">Tên công ty</th>
                <th className="px-5 py-3.5 font-medium">Subdomain</th>
                <th className="px-5 py-3.5 font-medium">Trạng thái</th>
                <th className="px-5 py-3.5 font-medium">Ngày tạo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-panel/30">
              {tenants.map((t) => (
                <tr key={t.id} className="hover:bg-glass transition-colors">
                  <td className="px-5 py-3.5 font-medium">{t.name}</td>
                  <td className="px-5 py-3.5 font-mono text-ink-muted">{t.slug}</td>
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
                  </td>
                  <td className="px-5 py-3.5 text-ink-muted">
                    {new Date(t.created_at).toLocaleDateString('vi-VN')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
