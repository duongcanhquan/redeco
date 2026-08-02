import Link from 'next/link';
import {
  ArrowRight,
  Building2,
  ClipboardList,
  Clock,
  FileText,
  Receipt,
  UserRound,
  Users,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { StatTile } from '@/components/ui/stat-tile';
import { createServerSupabase, getSessionClaims } from '@/lib/supabase/server';
import {
  listActiveContractsExpiring,
  listDepartments,
  listEmployees,
} from '@/services/hr.service';
import { getMyRootModules } from '@/services/sales.service';
import { getAiAssistantAvailability } from '@/services/tenant-settings.service';
import { HrAiPanel } from './hr-ai-panel';

export const dynamic = 'force-dynamic';

export default async function HrHubPage() {
  const [supabase, claims] = await Promise.all([
    createServerSupabase(),
    getSessionClaims(),
  ]);
  const base = claims?.tenantSlug ? `/${claims.tenantSlug}` : '/app';
  const modules = await getMyRootModules(supabase);
  const hasHr = modules.some((m) => m.key === 'nhan-su');

  if (!hasHr) {
    return (
      <div className="glass rounded-2xl py-16 text-center max-w-lg mx-auto">
        <Users className="mx-auto text-warning" size={32} aria-hidden />
        <p className="mt-4 font-medium">Chưa mở Nhân sự</p>
        <p className="mt-1 text-sm text-ink-muted px-4">
          Liên hệ quản trị để cấp module Nhân sự trên hợp đồng.
        </p>
      </div>
    );
  }

  const asOf = new Date().toISOString().slice(0, 10);
  const [departments, employees, expiring, aiAvail] = await Promise.all([
    listDepartments(supabase),
    listEmployees(supabase),
    listActiveContractsExpiring(supabase, 30, asOf),
    getAiAssistantAvailability(),
  ]);
  const active = employees.filter((e) => e.status === 'active').length;

  return (
    <div className="space-y-5">
      <PageHeader
        icon={<Users size={24} />}
        title="Nhân sự"
        helpTitle="Module Nhân sự làm gì?"
        help={
          <>
            <p>Phòng ban, nhân viên, HĐLĐ, ca, chấm công, nghỉ phép và bảng lương mỏng.</p>
            <p>ATS / đào tạo / BHXH đầy đủ — các pha sau.</p>
          </>
        }
        actions={
          <HrAiPanel
            basePath={base}
            entitled={aiAvail.entitledHrAsk}
            configured={aiAvail.configured}
            featureEnabled={aiAvail.features.hrAsk}
          />
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatTile icon={<Building2 size={18} />} label="Phòng ban" value={departments.length} />
        <StatTile icon={<Users size={18} />} label="Nhân viên" value={employees.length} />
        <StatTile icon={<UserRound size={18} />} label="Đang làm" value={active} />
        <StatTile
          icon={<FileText size={18} />}
          label="HĐ sắp hết (30 ngày)"
          value={expiring}
          tone={expiring > 0 ? 'warning' : 'default'}
        />
      </div>

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {[
          { href: `${base}/hr/departments`, label: 'Phòng ban / xưởng', icon: Building2 },
          { href: `${base}/hr/employees`, label: 'Danh sách nhân viên', icon: Users },
          { href: `${base}/hr/shifts`, label: 'Ca làm việc', icon: Clock },
          { href: `${base}/hr/attendance`, label: 'Chấm công', icon: ClipboardList },
          { href: `${base}/hr/leave`, label: 'Nghỉ phép', icon: FileText },
          { href: `${base}/hr/payroll`, label: 'Bảng lương', icon: Receipt },
        ].map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="glass glass-hover rounded-2xl p-4 min-h-24 flex items-center gap-3 group"
          >
            <span className="grid size-11 place-items-center rounded-xl bg-accent-soft text-accent">
              <Icon size={22} aria-hidden />
            </span>
            <span className="font-semibold group-hover:text-accent flex items-center gap-1">
              {label}
              <ArrowRight size={14} aria-hidden />
            </span>
          </Link>
        ))}
      </section>
    </div>
  );
}
