import Link from 'next/link';
import { Users } from 'lucide-react';
import { createServerSupabase, getSessionClaims } from '@/lib/supabase/server';
import { DocSearchBar } from '@/components/sales/doc-search';
import { DocCard, ResponsiveDocList } from '@/components/sales/responsive-doc-list';
import { listDepartments, listEmployees } from '@/services/hr.service';
import { getWorkspaceNavContext } from '@/services/module-access.service';
import { EmployeeDialog } from './employee-dialog';

export const dynamic = 'force-dynamic';

const STATUS_LABEL: Record<string, string> = {
  active: 'Đang làm',
  on_leave: 'Nghỉ dài',
  terminated: 'Đã nghỉ',
  draft: 'Nháp',
};

export default async function HrEmployeesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q: rawQ } = await searchParams;
  const q = (rawQ ?? '').trim().toLowerCase();
  const [supabase, claims, nav] = await Promise.all([
    createServerSupabase(),
    getSessionClaims(),
    getWorkspaceNavContext(),
  ]);
  const canManage = nav?.isManager ?? false;
  const base = claims?.tenantSlug ? `/${claims.tenantSlug}` : '/app';
  const [employees, departments] = await Promise.all([
    listEmployees(supabase),
    listDepartments(supabase),
  ]);
  const rows = q
    ? employees.filter((e) =>
        `${e.code} ${e.full_name} ${e.job_title} ${e.hr_departments?.code ?? ''}`
          .toLowerCase()
          .includes(q),
      )
    : employees;

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="text-accent" size={24} aria-hidden />
            Nhân viên
          </h1>
        </div>
        {canManage ? (
          <EmployeeDialog
            departments={departments.map((d) => ({
              id: d.id,
              code: d.code,
              name: d.name,
            }))}
          />
        ) : null}
      </header>

      <DocSearchBar
        baseHref={`${base}/hr/employees`}
        initialQ={rawQ ?? ''}
        placeholder="Tìm mã, tên, chức danh…"
      />

      <ResponsiveDocList
        empty={rows.length === 0}
        emptyState={
          <div className="py-16 text-center">
            <Users className="mx-auto text-ink-muted/50" size={32} aria-hidden />
            <p className="mt-4 text-ink-muted">Chưa có nhân viên.</p>
          </div>
        }
        table={
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-panel/40 text-left text-ink-muted">
                <th className="px-5 py-3.5 font-medium">Mã</th>
                <th className="px-5 py-3.5 font-medium">Họ tên</th>
                <th className="px-5 py-3.5 font-medium hidden md:table-cell">Chức danh</th>
                <th className="px-5 py-3.5 font-medium hidden lg:table-cell">Phòng ban</th>
                <th className="px-5 py-3.5 font-medium">TT</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((e) => (
                <tr
                  key={e.id}
                  className="border-b border-panel/20 last:border-0 hover:bg-glass-strong/40"
                >
                  <td className="px-5 py-3.5">
                    <Link
                      href={`${base}/hr/employees/${e.id}`}
                      className="font-mono text-xs text-accent hover:underline"
                    >
                      {e.code}
                    </Link>
                  </td>
                  <td className="px-5 py-3.5 font-medium">
                    <Link href={`${base}/hr/employees/${e.id}`} className="hover:text-accent">
                      {e.full_name}
                    </Link>
                  </td>
                  <td className="px-5 py-3.5 text-ink-muted hidden md:table-cell">
                    {e.job_title || '—'}
                  </td>
                  <td className="px-5 py-3.5 text-ink-muted hidden lg:table-cell">
                    {e.hr_departments?.code ?? '—'}
                  </td>
                  <td className="px-5 py-3.5 text-xs">
                    {STATUS_LABEL[e.status] ?? e.status}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        }
        cards={
          <>
            {rows.map((e) => (
              <Link key={e.id} href={`${base}/hr/employees/${e.id}`} className="block">
                <DocCard
                  code={e.code}
                  title={e.full_name}
                  badge={
                    <span className="text-xs text-ink-muted">
                      {STATUS_LABEL[e.status] ?? e.status}
                    </span>
                  }
                  meta={
                    <p>
                      {e.job_title || '—'} · {e.hr_departments?.code ?? '—'}
                    </p>
                  }
                />
              </Link>
            ))}
          </>
        }
      />
    </div>
  );
}
