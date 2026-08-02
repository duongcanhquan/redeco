-- ============================================================
-- Production (Sản xuất) Phase SX1
-- Blueprint: docs/blueprints/2026-08-02-production-module-blueprint.md
-- ADR-010: cá nhân hóa qua tenant_settings.production + attributes
-- ============================================================

-- ------------------------------------------------------------
-- 1. bills_of_materials + bom_lines
-- ------------------------------------------------------------
create table public.bills_of_materials (
  id                 uuid primary key default gen_random_uuid(),
  tenant_id          uuid not null references public.tenants (id),
  code               text not null,
  finished_item_id   uuid not null references public.inventory_items (id),
  version            int not null default 1 check (version >= 1),
  status             text not null default 'draft'
                     check (status in ('draft', 'active', 'obsolete')),
  attributes         jsonb not null default '{}'::jsonb,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  unique (tenant_id, code)
);

create index idx_boms_tenant on public.bills_of_materials (tenant_id, status);
create index idx_boms_finished on public.bills_of_materials (tenant_id, finished_item_id, status);
create trigger trg_boms_updated_at
  before update on public.bills_of_materials
  for each row execute function public.set_updated_at();

-- Chỉ 1 BOM active / finished_item / tenant
create unique index idx_boms_one_active_per_fg
  on public.bills_of_materials (tenant_id, finished_item_id)
  where status = 'active';

create table public.bom_lines (
  id                   uuid primary key default gen_random_uuid(),
  tenant_id            uuid not null references public.tenants (id),
  bom_id               uuid not null references public.bills_of_materials (id) on delete cascade,
  component_item_id    uuid not null references public.inventory_items (id),
  qty_per              numeric(15,6) not null check (qty_per > 0),
  scrap_pct            numeric(8,4) not null default 0 check (scrap_pct >= 0 and scrap_pct <= 100),
  uom                  text not null default 'cái',
  sort_order           int not null default 0,
  attributes           jsonb not null default '{}'::jsonb,
  unique (bom_id, component_item_id)
);

create index idx_bom_lines_tenant on public.bom_lines (tenant_id, bom_id);

-- ------------------------------------------------------------
-- 2. work_orders
-- ------------------------------------------------------------
create table public.work_orders (
  id                     uuid primary key default gen_random_uuid(),
  tenant_id              uuid not null references public.tenants (id),
  code                   text not null,
  finished_item_id       uuid not null references public.inventory_items (id),
  bom_id                 uuid references public.bills_of_materials (id),
  qty_planned            numeric(15,3) not null check (qty_planned > 0),
  qty_completed          numeric(15,3) not null default 0 check (qty_completed >= 0),
  status                 text not null default 'draft'
                         check (status in (
                           'draft', 'released', 'in_progress', 'completed', 'cancelled'
                         )),
  sales_order_id         uuid references public.sales_orders (id) on delete set null,
  sales_order_item_id    uuid,
  planned_start          date,
  planned_end            date,
  warehouse_fg_id        uuid references public.warehouses (id),
  warehouse_rm_id        uuid references public.warehouses (id),
  promise_snapshot       jsonb not null default '{}'::jsonb,
  attributes             jsonb not null default '{}'::jsonb,
  released_at            timestamptz,
  completed_at           timestamptz,
  created_by             uuid references public.user_profiles (id),
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  unique (tenant_id, code),
  check (qty_completed <= qty_planned * 2)
);

create index idx_work_orders_tenant on public.work_orders (tenant_id, status, created_at desc);
create index idx_work_orders_fg on public.work_orders (tenant_id, finished_item_id, status);
create index idx_work_orders_so on public.work_orders (tenant_id, sales_order_id)
  where sales_order_id is not null;
create trigger trg_work_orders_updated_at
  before update on public.work_orders
  for each row execute function public.set_updated_at();

-- ------------------------------------------------------------
-- 3. RLS
-- ------------------------------------------------------------
alter table public.bills_of_materials enable row level security;
alter table public.bom_lines enable row level security;
alter table public.work_orders enable row level security;

create policy boms_all on public.bills_of_materials for all to authenticated
  using (
    tenant_id = (select public.current_tenant_id())
    and (select public.has_module_access('san-xuat'))
  )
  with check (
    tenant_id = (select public.current_tenant_id())
    and (select public.has_module_access('san-xuat'))
  );

create policy bom_lines_all on public.bom_lines for all to authenticated
  using (
    tenant_id = (select public.current_tenant_id())
    and (select public.has_module_access('san-xuat'))
  )
  with check (
    tenant_id = (select public.current_tenant_id())
    and (select public.has_module_access('san-xuat'))
  );

-- Sales đọc open WO cho CTP
create policy work_orders_select on public.work_orders for select to authenticated
  using (
    tenant_id = (select public.current_tenant_id())
    and (
      (select public.has_module_access('san-xuat'))
      or (select public.has_module_access('kinh-doanh'))
    )
  );

create policy work_orders_write on public.work_orders for all to authenticated
  using (
    tenant_id = (select public.current_tenant_id())
    and (select public.has_module_access('san-xuat'))
  )
  with check (
    tenant_id = (select public.current_tenant_id())
    and (select public.has_module_access('san-xuat'))
  );

-- ------------------------------------------------------------
-- 4. Open WO qty cho CTP (Sales đọc được)
-- ------------------------------------------------------------
create or replace function public.production_open_wo_qty(p_product_id uuid)
returns numeric
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_tenant uuid := public.current_tenant_id();
  v_qty numeric := 0;
begin
  if v_tenant is null then
    return 0;
  end if;
  if not (
    public.has_module_access('san-xuat')
    or public.has_module_access('kinh-doanh')
  ) then
    return 0;
  end if;

  select coalesce(sum(greatest(wo.qty_planned - wo.qty_completed, 0)), 0)
    into v_qty
  from public.work_orders wo
  join public.inventory_items ii on ii.id = wo.finished_item_id
  where wo.tenant_id = v_tenant
    and ii.product_id = p_product_id
    and wo.status in ('released', 'in_progress');

  return v_qty;
end;
$$;

revoke all on function public.production_open_wo_qty(uuid) from public;
grant execute on function public.production_open_wo_qty(uuid) to authenticated;

comment on table public.bills_of_materials is
  'BOM 1 cấp SX1. attributes JSONB + tenant_settings.production = cá nhân hóa (ADR-010).';
comment on table public.work_orders is
  'Lệnh sản xuất. CTP dùng qty_planned-qty_completed khi released/in_progress.';
