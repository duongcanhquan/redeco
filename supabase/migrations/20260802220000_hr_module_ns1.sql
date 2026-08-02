-- ============================================================
-- HR Module NS1 — Core (Department, Employee, EmploymentContract)
-- Blueprint: docs/blueprints/2026-08-02-hr-ns1-blueprint.md
-- ============================================================

alter table public.tenant_settings
  drop constraint if exists tenant_settings_namespace_check;

alter table public.tenant_settings
  add constraint tenant_settings_namespace_check
  check (namespace in (
    'ai', 'sales', 'integrations', 'notifications', 'company',
    'inventory', 'production', 'accounting', 'hr'
  ));

-- 1. Departments (org tree)
create table if not exists public.hr_departments (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null references public.tenants (id),
  parent_id     uuid references public.hr_departments (id),
  code          text not null,
  name          text not null,
  kind          text not null default 'office'
                check (kind in ('company', 'division', 'workshop', 'team', 'office', 'other')),
  sort_order    int not null default 0,
  is_active     boolean not null default true,
  attributes    jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (tenant_id, code)
);

create index if not exists idx_hr_departments_tenant
  on public.hr_departments (tenant_id, sort_order, code);
create index if not exists idx_hr_departments_parent
  on public.hr_departments (tenant_id, parent_id);

create trigger trg_hr_departments_updated_at
  before update on public.hr_departments
  for each row execute function public.set_updated_at();

-- 2. Employees
create table if not exists public.hr_employees (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid not null references public.tenants (id),
  code            text not null,
  full_name       text not null,
  status          text not null default 'draft'
                  check (status in ('active', 'on_leave', 'terminated', 'draft')),
  department_id   uuid references public.hr_departments (id),
  job_title       text not null default '',
  user_id         uuid,
  hired_on        date,
  terminated_on   date,
  phone           text,
  email           text,
  attributes      jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (tenant_id, code),
  check (
    status <> 'terminated'
    or terminated_on is not null
  )
);

create index if not exists idx_hr_employees_tenant
  on public.hr_employees (tenant_id, status, code);
create index if not exists idx_hr_employees_dept
  on public.hr_employees (tenant_id, department_id);
create unique index if not exists idx_hr_employees_user
  on public.hr_employees (tenant_id, user_id)
  where user_id is not null;

create trigger trg_hr_employees_updated_at
  before update on public.hr_employees
  for each row execute function public.set_updated_at();

-- 3. Employment contracts
create table if not exists public.hr_employment_contracts (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid not null references public.tenants (id),
  employee_id     uuid not null references public.hr_employees (id) on delete cascade,
  code            text not null,
  contract_type   text not null default 'definite'
                  check (contract_type in (
                    'probation', 'definite', 'indefinite', 'seasonal', 'other'
                  )),
  status          text not null default 'draft'
                  check (status in ('draft', 'active', 'expired', 'terminated')),
  starts_on       date not null,
  ends_on         date,
  base_salary     numeric(18,2),
  attributes      jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (tenant_id, code),
  check (ends_on is null or ends_on >= starts_on)
);

create index if not exists idx_hr_contracts_tenant
  on public.hr_employment_contracts (tenant_id, employee_id, status);
create unique index if not exists idx_hr_contracts_one_active
  on public.hr_employment_contracts (tenant_id, employee_id)
  where status = 'active';

create trigger trg_hr_contracts_updated_at
  before update on public.hr_employment_contracts
  for each row execute function public.set_updated_at();

-- 4. RLS
alter table public.hr_departments enable row level security;
alter table public.hr_employees enable row level security;
alter table public.hr_employment_contracts enable row level security;

drop policy if exists hr_departments_all on public.hr_departments;
create policy hr_departments_all on public.hr_departments for all to authenticated
  using (
    tenant_id = (select public.current_tenant_id())
    and (select public.has_module_access('nhan-su'))
  )
  with check (
    tenant_id = (select public.current_tenant_id())
    and (select public.has_module_access('nhan-su'))
  );

drop policy if exists hr_employees_all on public.hr_employees;
create policy hr_employees_all on public.hr_employees for all to authenticated
  using (
    tenant_id = (select public.current_tenant_id())
    and (select public.has_module_access('nhan-su'))
  )
  with check (
    tenant_id = (select public.current_tenant_id())
    and (select public.has_module_access('nhan-su'))
  );

drop policy if exists hr_employment_contracts_all on public.hr_employment_contracts;
create policy hr_employment_contracts_all on public.hr_employment_contracts
  for all to authenticated
  using (
    tenant_id = (select public.current_tenant_id())
    and (select public.has_module_access('nhan-su'))
  )
  with check (
    tenant_id = (select public.current_tenant_id())
    and (select public.has_module_access('nhan-su'))
  );

comment on table public.hr_departments is 'HR NS1 — cây phòng ban / xưởng / tổ';
comment on table public.hr_employees is 'HR NS1 — hồ sơ nhân viên (SSOT); user_id optional';
comment on table public.hr_employment_contracts is 'HR NS1 — hợp đồng lao động';
