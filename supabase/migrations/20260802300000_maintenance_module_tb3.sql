-- ============================================================
-- Maintenance TB3 — meters / PdM readings + AI catalog seed note
-- Blueprint: docs/blueprints/2026-08-02-maintenance-tb3-blueprint.md
-- (AI module nodes seeded via scripts/seed-modules.cjs)
-- ============================================================

create table public.eam_meters (
  id                    uuid primary key default gen_random_uuid(),
  tenant_id             uuid not null references public.tenants (id),
  equipment_id          uuid not null references public.eam_equipment (id),
  code                  text not null,
  name                  text not null,
  unit                  text not null default 'h',
  threshold_warn        numeric(18,4),
  threshold_critical    numeric(18,4),
  last_value            numeric(18,4),
  last_reading_at       timestamptz,
  is_active             boolean not null default true,
  attributes            jsonb not null default '{}'::jsonb,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  unique (tenant_id, code),
  check (
    threshold_warn is null
    or threshold_critical is null
    or threshold_critical >= threshold_warn
  )
);

create index idx_eam_meters_equipment
  on public.eam_meters (tenant_id, equipment_id, is_active);

create trigger trg_eam_meters_updated_at
  before update on public.eam_meters
  for each row execute function public.set_updated_at();

create table public.eam_meter_readings (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null references public.tenants (id),
  meter_id      uuid not null references public.eam_meters (id) on delete cascade,
  value         numeric(18,4) not null,
  read_at       timestamptz not null default now(),
  source        text not null default 'manual'
                check (source in ('manual', 'iot_stub')),
  work_request_id uuid references public.eam_work_requests (id),
  attributes    jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now()
);

create index idx_eam_readings_meter
  on public.eam_meter_readings (tenant_id, meter_id, read_at desc);

alter table public.eam_meters enable row level security;
alter table public.eam_meter_readings enable row level security;

create policy eam_meters_all on public.eam_meters for all to authenticated
  using (
    tenant_id = (select public.current_tenant_id())
    and (select public.has_module_access('thiet-bi'))
  )
  with check (
    tenant_id = (select public.current_tenant_id())
    and (select public.has_module_access('thiet-bi'))
  );

create policy eam_readings_all on public.eam_meter_readings for all to authenticated
  using (
    tenant_id = (select public.current_tenant_id())
    and (select public.has_module_access('thiet-bi'))
  )
  with check (
    tenant_id = (select public.current_tenant_id())
    and (select public.has_module_access('thiet-bi'))
  );

-- Planned hours / day for OEE (default 8) on equipment.attributes.planned_hours_per_day

comment on table public.eam_meters is 'TB3: đồng hồ / cảm biến ảo cho PdM ngưỡng';
comment on table public.eam_meter_readings is 'TB3: lần đọc meter (manual hoặc iot_stub)';
