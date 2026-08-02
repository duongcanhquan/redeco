import { Building2 } from 'lucide-react';
import { createServerSupabase } from '@/lib/supabase/server';
import { DocCard, ResponsiveDocList } from '@/components/sales/responsive-doc-list';
import { listDepartments } from '@/services/hr.service';
import { getWorkspaceNavContext } from '@/services/module-access.service';
import { DepartmentDialog } from './department-dialog';

export const dynamic = 'force-dynamic';

const KIND_LABEL: Record<string, string> = {
  company: 'Công ty',
  division: 'Khối',
  workshop: 'Xưởng',
  team: 'Tổ',
  office: 'Phòng',
  other: 'Khác',
};

export default async function HrDepartmentsPage() {
  const [supabase, nav] = await Promise.all([
    createServerSupabase(),
    getWorkspaceNavContext(),
  ]);
  const canManage = nav?.isManager ?? false;
  const departments = await listDepartments(supabase);
  const byId = new Map(departments.map((d) => [d.id, d]));

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Building2 className="text-accent" size={24} aria-hidden />
            Phòng ban / xưởng
          </h1>
          <p className="text-sm text-ink-muted mt-1">Cơ cấu tổ chức NS1 (cây phân cấp).</p>
        </div>
        {canManage ? (
          <DepartmentDialog
            departments={departments.map((d) => ({
              id: d.id,
              code: d.code,
              name: d.name,
            }))}
          />
        ) : null}
      </header>

      <ResponsiveDocList
        empty={departments.length === 0}
        emptyState={
          <div className="py-16 text-center">
            <Building2 className="mx-auto text-ink-muted/50" size={32} aria-hidden />
            <p className="mt-4 text-ink-muted">Chưa có phòng ban — thêm xưởng / tổ đội.</p>
          </div>
        }
        table={
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-panel/40 text-left text-ink-muted">
                <th className="px-5 py-3.5 font-medium">Mã</th>
                <th className="px-5 py-3.5 font-medium">Tên</th>
                <th className="px-5 py-3.5 font-medium">Loại</th>
                <th className="px-5 py-3.5 font-medium hidden md:table-cell">Thuộc</th>
                <th className="px-5 py-3.5 font-medium">TT</th>
              </tr>
            </thead>
            <tbody>
              {departments.map((d) => (
                <tr
                  key={d.id}
                  className="border-b border-panel/20 last:border-0 hover:bg-glass-strong/40"
                >
                  <td className="px-5 py-3.5 font-mono text-xs text-accent">{d.code}</td>
                  <td className="px-5 py-3.5 font-medium">{d.name}</td>
                  <td className="px-5 py-3.5 text-ink-muted">
                    {KIND_LABEL[d.kind] ?? d.kind}
                  </td>
                  <td className="px-5 py-3.5 text-ink-muted hidden md:table-cell">
                    {d.parent_id ? (byId.get(d.parent_id)?.code ?? '—') : '—'}
                  </td>
                  <td className="px-5 py-3.5">
                    <span
                      className={`text-xs rounded-lg px-2 py-0.5 border ${
                        d.is_active
                          ? 'border-success/30 bg-success/10 text-success'
                          : 'border-panel/40 text-ink-muted'
                      }`}
                    >
                      {d.is_active ? 'Đang dùng' : 'Ngưng'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        }
        cards={
          <>
            {departments.map((d) => (
              <DocCard
                key={d.id}
                code={d.code}
                title={d.name}
                badge={
                  <span className="text-xs text-ink-muted">
                    {KIND_LABEL[d.kind] ?? d.kind}
                  </span>
                }
                meta={
                  <p>
                    Cha{' '}
                    {d.parent_id ? (byId.get(d.parent_id)?.code ?? '—') : 'gốc'} ·{' '}
                    {d.is_active ? 'Đang dùng' : 'Ngưng'}
                  </p>
                }
              />
            ))}
          </>
        }
      />
    </div>
  );
}
