-- ============================================================
-- HR NS3 — Leave + Payroll mỏng
-- Blueprint: docs/blueprints/2026-08-02-hr-ns3-blueprint.md
-- ============================================================

create table if not exists public.hr_leave_types (
  id                   uuid primary key default gen_random_uuid(),
  tenant_id            uuid not null references public.tenants (id),
  code                 text not null,
  name                 text not null,
  is_paid              boolean not null default true,
  annual_quota_days    numeric(6,1),
  is_active            boolean not null default true,
  attributes           jsonb not null default '{}'::jsonb,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  unique (tenant_id, code)
);

create index if not exists idx_hr_leave_types_tenant
  on public.hr_leave_types (tenant_id, is_active);

create trigger trg_hr_leave_types_updated_at
  before update on public.hr_leave_types
  for each row execute function public.set_updated_at();

create table if not exists public.hr_leave_requests (
  id               uuid primary key default gen_random_uuid(),
  tenant_id        uuid not null references public.tenants (id),
  employee_id      uuid not null references public.hr_employees (id) on delete cascade,
  leave_type_id    uuid not null references public.hr_leave_types (id),
  starts_on        date not null,
  ends_on          date not null,
  days             numeric(6,1) not null check (days > 0),
  status           text not null default 'pending'
                   check (status in ('draft', 'pending', 'approved', 'rejected', 'cancelled')),
  note             text,
  decided_at       timestamptz,
  attributes       jsonb not null default '{}'::jsonb,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  check (ends_on >= starts_on)
);

create index if not exists idx_hr_leave_req_tenant
  on public.hr_leave_requests (tenant_id, status, starts_on);

create trigger trg_hr_leave_requests_updated_at
  before update on public.hr_leave_requests
  for each row execute function public.set_updated_at();

create table if not exists public.hr_payroll_runs (
  id             uuid primary key default gen_random_uuid(),
  tenant_id      uuid not null references public.tenants (id),
  code           text not null,
  period_year    int not null check (period_year >= 2000),
  period_month   int not null check (period_month between 1 and 12),
  status         text not null default 'draft'
                 check (status in ('draft', 'locked')),
  locked_at      timestamptz,
  attributes     jsonb not null default '{}'::jsonb,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (tenant_id, code),
  unique (tenant_id, period_year, period_month)
);

create index if not exists idx_hr_payroll_runs_tenant
  on public.hr_payroll_runs (tenant_id, period_year desc, period_month desc);

create trigger trg_hr_payroll_runs_updated_at
  before update on public.hr_payroll_runs
  for each row execute function public.set_updated_at();

create table if not exists public.hr_payroll_lines (
  id             uuid primary key default gen_random_uuid(),
  tenant_id      uuid not null references public.tenants (id),
  run_id         uuid not null references public.hr_payroll_runs (id) on delete cascade,
  employee_id    uuid not null references public.hr_employees (id),
  base_salary    numeric(18,2) not null default 0,
  ot_minutes     int not null default 0,
  ot_amount      numeric(18,2) not null default 0,
  deductions     numeric(18,2) not null default 0,
  net_amount     numeric(18,2) not null default 0,
  attributes     jsonb not null default '{}'::jsonb,
  created_at     timestamptz not null default now(),
  unique (run_id, employee_id)
);

create index if not exists idx_hr_payroll_lines_run
  on public.hr_payroll_lines (tenant_id, run_id);

alter table public.hr_leave_types enable row level security;
alter table public.hr_leave_requests enable row level security;
alter table public.hr_payroll_runs enable row level security;
alter table public.hr_payroll_lines enable row level security;

drop policy if exists hr_leave_types_all on public.hr_leave_types;
create policy hr_leave_types_all on public.hr_leave_types for all to authenticated
  using (
    tenant_id = (select public.current_tenant_id())
    and (select public.has_module_access('nhan-su'))
  )
  with check (
    tenant_id = (select public.current_tenant_id())
    and (select public.has_module_access('nhan-su'))
  );

drop policy if exists hr_leave_requests_all on public.hr_leave_requests;
create policy hr_leave_requests_all on public.hr_leave_requests for all to authenticated
  using (
    tenant_id = (select public.current_tenant_id())
    and (select public.has_module_access('nhan-su'))
  )
  with check (
    tenant_id = (select public.current_tenant_id())
    and (select public.has_module_access('nhan-su'))
  );

drop policy if exists hr_payroll_runs_all on public.hr_payroll_runs;
create policy hr_payroll_runs_all on public.hr_payroll_runs for all to authenticated
  using (
    tenant_id = (select public.current_tenant_id())
    and (select public.has_module_access('nhan-su'))
  )
  with check (
    tenant_id = (select public.current_tenant_id())
    and (select public.has_module_access('nhan-su'))
  );

drop policy if exists hr_payroll_lines_all on public.hr_payroll_lines;
create policy hr_payroll_lines_all on public.hr_payroll_lines for all to authenticated
  using (
    tenant_id = (select public.current_tenant_id())
    and (select public.has_module_access('nhan-su'))
  )
  with check (
    tenant_id = (select public.current_tenant_id())
    and (select public.has_module_access('nhan-su'))
  );

-- Seed default leave types per tenant: làm khi ensure — hoặc insert lazy trong service.
comment on table public.hr_leave_types is 'HR NS3 — loại phép';
comment on table public.hr_leave_requests is 'HR NS3 — đơn nghỉ phép';
comment on table public.hr_payroll_runs is 'HR NS3 — kỳ bảng lương';
comment on table public.hr_payroll_lines is 'HR NS3 — dòng lương theo NV';
