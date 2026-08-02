import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, UserRound } from 'lucide-react';
import { createServerSupabase, getSessionClaims } from '@/lib/supabase/server';
import { formatMoney } from '@/lib/format';
import {
  getEmployee,
  listContractsForEmployee,
  listDepartments,
} from '@/services/hr.service';
import { getWorkspaceNavContext } from '@/services/module-access.service';
import { ContractDialog } from './contract-dialog';
import { EmployeeEditForm } from './employee-edit-form';

export const dynamic = 'force-dynamic';

const TYPE_LABEL: Record<string, string> = {
  probation: 'Thử việc',
  definite: 'Có thời hạn',
  indefinite: 'Không TH',
  seasonal: 'Thời vụ',
  other: 'Khác',
};

const CT_STATUS: Record<string, string> = {
  draft: 'Nháp',
  active: 'Hiệu lực',
  expired: 'Hết hạn',
  terminated: 'Chấm dứt',
};

export default async function HrEmployeeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [supabase, claims, nav] = await Promise.all([
    createServerSupabase(),
    getSessionClaims(),
    getWorkspaceNavContext(),
  ]);
  const canManage = nav?.isManager ?? false;
  const base = claims?.tenantSlug ? `/${claims.tenantSlug}` : '/app';
  const [employee, departments, contracts] = await Promise.all([
    getEmployee(supabase, id),
    listDepartments(supabase),
    listContractsForEmployee(supabase, id),
  ]);
  if (!employee) notFound();

  return (
    <div className="space-y-5">
      <Link
        href={`${base}/hr/employees`}
        className="inline-flex min-h-11 items-center gap-2 text-sm text-ink-muted hover:text-accent"
      >
        <ArrowLeft size={16} aria-hidden />
        Danh sách nhân viên
      </Link>

      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <UserRound className="text-accent" size={24} aria-hidden />
            {employee.full_name}
          </h1>
          <p className="text-sm text-ink-muted mt-1 font-mono">{employee.code}</p>
        </div>
        {canManage ? <ContractDialog employeeId={employee.id} /> : null}
      </header>

      {canManage ? (
        <EmployeeEditForm
          employee={employee}
          departments={departments.map((d) => ({
            id: d.id,
            code: d.code,
            name: d.name,
          }))}
        />
      ) : (
        <div className="glass rounded-2xl border border-panel/40 p-5 text-sm space-y-2">
          <p>
            <span className="text-ink-muted">Chức danh:</span> {employee.job_title || '—'}
          </p>
          <p>
            <span className="text-ink-muted">Phòng:</span>{' '}
            {employee.hr_departments
              ? `${employee.hr_departments.code} — ${employee.hr_departments.name}`
              : '—'}
          </p>
          <p>
            <span className="text-ink-muted">Trạng thái:</span> {employee.status}
          </p>
        </div>
      )}
      <section className="glass rounded-2xl border border-panel/40 overflow-hidden">
        <h2 className="px-5 py-3 text-sm font-semibold border-b border-panel/30">
          Hợp đồng lao động
        </h2>
        {contracts.length === 0 ? (
          <p className="px-5 py-10 text-center text-ink-muted">Chưa có hợp đồng.</p>
        ) : (
          <ul className="divide-y divide-panel/30">
            {contracts.map((c) => (
              <li
                key={c.id}
                className="px-5 py-4 flex flex-wrap items-center justify-between gap-2"
              >
                <div>
                  <p className="font-mono text-xs text-accent">{c.code}</p>
                  <p className="text-sm">
                    {TYPE_LABEL[c.contract_type] ?? c.contract_type} ·{' '}
                    {c.starts_on}
                    {c.ends_on ? ` → ${c.ends_on}` : ' → không TH'}
                  </p>
                </div>
                <div className="text-right text-sm">
                  <p>{CT_STATUS[c.status] ?? c.status}</p>
                  {c.base_salary != null && (
                    <p className="text-ink-muted tabular-nums">
                      {formatMoney(Number(c.base_salary))}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
