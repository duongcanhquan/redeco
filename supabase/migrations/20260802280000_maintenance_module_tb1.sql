-- ============================================================
-- Maintenance / EAM Phase TB1 — Equipment, WR, MO, Plans
-- Blueprint: docs/blueprints/2026-08-02-maintenance-tb1-blueprint.md
-- ============================================================

alter table public.tenant_settings
  drop constraint if exists tenant_settings_namespace_check;

alter table public.tenant_settings
  add constraint tenant_settings_namespace_check
  check (namespace in (
    'ai', 'sales', 'integrations', 'notifications', 'company',
    'inventory', 'production', 'accounting', 'hr', 'maintenance'
  ));

-- ------------------------------------------------------------
-- 1. Equipment hierarchy
-- ------------------------------------------------------------
create table public.eam_equipment (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid not null references public.tenants (id),
  parent_id       uuid references public.eam_equipment (id),
  code            text not null,
  name            text not null,
  kind            text not null default 'machine'
                  check (kind in ('plant', 'line', 'machine', 'tool', 'other')),
  status          text not null default 'draft'
                  check (status in ('draft', 'active', 'idle', 'down', 'retired')),
  criticality     text not null default 'medium'
                  check (criticality in ('low', 'medium', 'high', 'critical')),
  location_text   text not null default '',
  installed_on    date,
  attributes      jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (tenant_id, code)
);

create index idx_eam_equipment_tenant
  on public.eam_equipment (tenant_id, status, kind);
create index idx_eam_equipment_parent
  on public.eam_equipment (tenant_id, parent_id);

create trigger trg_eam_equipment_updated_at
  before update on public.eam_equipment
  for each row execute function public.set_updated_at();

-- ------------------------------------------------------------
-- 2. Work requests
-- ------------------------------------------------------------
create table public.eam_work_requests (
  id                     uuid primary key default gen_random_uuid(),
  tenant_id              uuid not null references public.tenants (id),
  equipment_id           uuid not null references public.eam_equipment (id),
  code                   text not null,
  title                  text not null,
  description            text not null default '',
  priority               text not null default 'medium'
                         check (priority in ('low', 'medium', 'high', 'urgent')),
  status                 text not null default 'open'
                         check (status in (
                           'open', 'approved', 'rejected', 'converted', 'cancelled'
                         )),
  reported_on            date not null default (timezone('Asia/Ho_Chi_Minh', now()))::date,
  reported_by            uuid references public.user_profiles (id),
  maintenance_order_id   uuid,
  attributes             jsonb not null default '{}'::jsonb,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  unique (tenant_id, code)
);

create index idx_eam_wr_tenant
  on public.eam_work_requests (tenant_id, status, reported_on desc);
create index idx_eam_wr_equipment
  on public.eam_work_requests (tenant_id, equipment_id);

create trigger trg_eam_wr_updated_at
  before update on public.eam_work_requests
  for each row execute function public.set_updated_at();

-- ------------------------------------------------------------
-- 3. Maintenance plans (PM)
-- ------------------------------------------------------------
create table public.eam_maintenance_plans (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid not null references public.tenants (id),
  equipment_id    uuid not null references public.eam_equipment (id),
  code            text not null,
  name            text not null,
  interval_days   int not null check (interval_days > 0),
  next_due_on     date not null,
  last_generated_on date,
  is_active       boolean not null default true,
  checklist       jsonb not null default '[]'::jsonb,
  attributes      jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (tenant_id, code)
);

create index idx_eam_plans_tenant
  on public.eam_maintenance_plans (tenant_id, is_active, next_due_on);
create index idx_eam_plans_equipment
  on public.eam_maintenance_plans (tenant_id, equipment_id);

create trigger trg_eam_plans_updated_at
  before update on public.eam_maintenance_plans
  for each row execute function public.set_updated_at();

-- ------------------------------------------------------------
-- 4. Maintenance orders + tasks
-- ------------------------------------------------------------
create table public.eam_maintenance_orders (
  id                  uuid primary key default gen_random_uuid(),
  tenant_id           uuid not null references public.tenants (id),
  equipment_id        uuid not null references public.eam_equipment (id),
  work_request_id     uuid references public.eam_work_requests (id),
  plan_id             uuid references public.eam_maintenance_plans (id),
  code                text not null,
  kind                text not null default 'corrective'
                      check (kind in ('corrective', 'preventive', 'inspection')),
  status              text not null default 'draft'
                      check (status in (
                        'draft', 'released', 'in_progress', 'completed', 'cancelled'
                      )),
  priority            text not null default 'medium'
                      check (priority in ('low', 'medium', 'high', 'urgent')),
  title               text not null default '',
  scheduled_on        date,
  started_at          timestamptz,
  completed_at        timestamptz,
  downtime_minutes    int not null default 0 check (downtime_minutes >= 0),
  attributes          jsonb not null default '{}'::jsonb,
  created_by          uuid references public.user_profiles (id),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (tenant_id, code)
);

create index idx_eam_mo_tenant
  on public.eam_maintenance_orders (tenant_id, status, created_at desc);
create index idx_eam_mo_equipment
  on public.eam_maintenance_orders (tenant_id, equipment_id);
create index idx_eam_mo_plan
  on public.eam_maintenance_orders (tenant_id, plan_id)
  where plan_id is not null;

create trigger trg_eam_mo_updated_at
  before update on public.eam_maintenance_orders
  for each row execute function public.set_updated_at();

-- FK WR → MO (deferred until MO table exists)
alter table public.eam_work_requests
  add constraint eam_work_requests_mo_fk
  foreign key (maintenance_order_id) references public.eam_maintenance_orders (id);

create table public.eam_maintenance_tasks (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null references public.tenants (id),
  order_id      uuid not null references public.eam_maintenance_orders (id) on delete cascade,
  sort_order    int not null default 0,
  title         text not null,
  is_done       boolean not null default false,
  done_at       timestamptz,
  notes         text not null default '',
  attributes    jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now()
);

create index idx_eam_tasks_order
  on public.eam_maintenance_tasks (tenant_id, order_id, sort_order);

-- ------------------------------------------------------------
-- 5. RLS
-- ------------------------------------------------------------
alter table public.eam_equipment enable row level security;
alter table public.eam_work_requests enable row level security;
alter table public.eam_maintenance_plans enable row level security;
alter table public.eam_maintenance_orders enable row level security;
alter table public.eam_maintenance_tasks enable row level security;

create policy eam_equipment_all on public.eam_equipment for all to authenticated
  using (
    tenant_id = (select public.current_tenant_id())
    and (select public.has_module_access('thiet-bi'))
  )
  with check (
    tenant_id = (select public.current_tenant_id())
    and (select public.has_module_access('thiet-bi'))
  );

create policy eam_wr_all on public.eam_work_requests for all to authenticated
  using (
    tenant_id = (select public.current_tenant_id())
    and (select public.has_module_access('thiet-bi'))
  )
  with check (
    tenant_id = (select public.current_tenant_id())
    and (select public.has_module_access('thiet-bi'))
  );

create policy eam_plans_all on public.eam_maintenance_plans for all to authenticated
  using (
    tenant_id = (select public.current_tenant_id())
    and (select public.has_module_access('thiet-bi'))
  )
  with check (
    tenant_id = (select public.current_tenant_id())
    and (select public.has_module_access('thiet-bi'))
  );

create policy eam_mo_all on public.eam_maintenance_orders for all to authenticated
  using (
    tenant_id = (select public.current_tenant_id())
    and (select public.has_module_access('thiet-bi'))
  )
  with check (
    tenant_id = (select public.current_tenant_id())
    and (select public.has_module_access('thiet-bi'))
  );

create policy eam_tasks_all on public.eam_maintenance_tasks for all to authenticated
  using (
    tenant_id = (select public.current_tenant_id())
    and (select public.has_module_access('thiet-bi'))
  )
  with check (
    tenant_id = (select public.current_tenant_id())
    and (select public.has_module_access('thiet-bi'))
  );

comment on table public.eam_equipment is 'TB1: cây thiết bị nhà máy';
comment on table public.eam_work_requests is 'TB1: yêu cầu bảo trì hiện trường';
comment on table public.eam_maintenance_orders is 'TB1: lệnh bảo trì CMMS';
comment on table public.eam_maintenance_plans is 'TB1: kế hoạch PM định kỳ';
