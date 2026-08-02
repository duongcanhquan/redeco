-- ============================================================
-- HR NS2 — Shift + AttendanceLog
-- Blueprint: docs/blueprints/2026-08-02-hr-ns2-blueprint.md
-- ============================================================

create table if not exists public.hr_shifts (
  id                 uuid primary key default gen_random_uuid(),
  tenant_id          uuid not null references public.tenants (id),
  code               text not null,
  name               text not null,
  start_time         time not null,
  end_time           time not null,
  break_minutes      int not null default 0 check (break_minutes >= 0),
  is_active          boolean not null default true,
  attributes         jsonb not null default '{}'::jsonb,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  unique (tenant_id, code)
);

create index if not exists idx_hr_shifts_tenant
  on public.hr_shifts (tenant_id, is_active, code);

create trigger trg_hr_shifts_updated_at
  before update on public.hr_shifts
  for each row execute function public.set_updated_at();

create table if not exists public.hr_attendance_logs (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid not null references public.tenants (id),
  employee_id     uuid not null references public.hr_employees (id) on delete cascade,
  work_date       date not null,
  shift_id        uuid references public.hr_shifts (id),
  clock_in        timestamptz not null,
  clock_out       timestamptz,
  source          text not null default 'manual'
                  check (source in ('manual', 'device', 'import')),
  attributes      jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (tenant_id, employee_id, work_date),
  check (clock_out is null or clock_out >= clock_in)
);

create index if not exists idx_hr_attendance_tenant
  on public.hr_attendance_logs (tenant_id, work_date desc);
create index if not exists idx_hr_attendance_employee
  on public.hr_attendance_logs (tenant_id, employee_id, work_date desc);

create trigger trg_hr_attendance_updated_at
  before update on public.hr_attendance_logs
  for each row execute function public.set_updated_at();

alter table public.hr_shifts enable row level security;
alter table public.hr_attendance_logs enable row level security;

drop policy if exists hr_shifts_all on public.hr_shifts;
create policy hr_shifts_all on public.hr_shifts for all to authenticated
  using (
    tenant_id = (select public.current_tenant_id())
    and (select public.has_module_access('nhan-su'))
  )
  with check (
    tenant_id = (select public.current_tenant_id())
    and (select public.has_module_access('nhan-su'))
  );

drop policy if exists hr_attendance_logs_all on public.hr_attendance_logs;
create policy hr_attendance_logs_all on public.hr_attendance_logs for all to authenticated
  using (
    tenant_id = (select public.current_tenant_id())
    and (select public.has_module_access('nhan-su'))
  )
  with check (
    tenant_id = (select public.current_tenant_id())
    and (select public.has_module_access('nhan-su'))
  );

comment on table public.hr_shifts is 'HR NS2 — định nghĩa ca làm việc';
comment on table public.hr_attendance_logs is 'HR NS2 — chấm công vào/ra theo ngày';
