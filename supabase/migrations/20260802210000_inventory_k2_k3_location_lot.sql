-- Inventory K2+K3: Location hierarchy + Lot + StockQuant + allocate FIFO/FEFO
-- Blueprint: docs/blueprints/2026-08-02-inventory-k2-k3-location-lot.md

-- ------------------------------------------------------------
-- 1. warehouse_locations
-- ------------------------------------------------------------
create table public.warehouse_locations (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null references public.tenants (id),
  warehouse_id  uuid not null references public.warehouses (id) on delete cascade,
  parent_id     uuid references public.warehouse_locations (id) on delete set null,
  code          text not null,
  name          text not null,
  kind          text not null default 'bin'
                check (kind in ('zone', 'row', 'rack', 'level', 'bin')),
  tags          jsonb not null default '[]'::jsonb,
  is_active     boolean not null default true,
  sort_order    int not null default 0,
  attributes    jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (warehouse_id, code)
);

create index idx_warehouse_locations_tenant
  on public.warehouse_locations (tenant_id, warehouse_id, kind);
create index idx_warehouse_locations_parent
  on public.warehouse_locations (warehouse_id, parent_id);

create trigger trg_warehouse_locations_updated_at
  before update on public.warehouse_locations
  for each row execute function public.set_updated_at();

alter table public.warehouse_locations enable row level security;

create policy warehouse_locations_select on public.warehouse_locations for select to authenticated
  using (
    tenant_id = (select public.current_tenant_id())
    and (
      (select public.has_module_access('kho'))
      or (select public.has_module_access('kinh-doanh'))
      or (select public.has_module_access('san-xuat'))
    )
  );
create policy warehouse_locations_write on public.warehouse_locations for all to authenticated
  using (
    tenant_id = (select public.current_tenant_id())
    and (select public.has_module_access('kho'))
  )
  with check (
    tenant_id = (select public.current_tenant_id())
    and (select public.has_module_access('kho'))
  );

-- ------------------------------------------------------------
-- 2. inventory_lots
-- ------------------------------------------------------------
create table public.inventory_lots (
  id             uuid primary key default gen_random_uuid(),
  tenant_id      uuid not null references public.tenants (id),
  item_id        uuid not null references public.inventory_items (id),
  lot_code       text not null,
  expiry_date    date,
  received_at    timestamptz not null default now(),
  supplier_ref   text,
  attributes     jsonb not null default '{}'::jsonb,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (tenant_id, item_id, lot_code)
);

create index idx_inventory_lots_tenant_item
  on public.inventory_lots (tenant_id, item_id, expiry_date, received_at);

create trigger trg_inventory_lots_updated_at
  before update on public.inventory_lots
  for each row execute function public.set_updated_at();

alter table public.inventory_lots enable row level security;

create policy inventory_lots_select on public.inventory_lots for select to authenticated
  using (
    tenant_id = (select public.current_tenant_id())
    and (
      (select public.has_module_access('kho'))
      or (select public.has_module_access('kinh-doanh'))
      or (select public.has_module_access('san-xuat'))
    )
  );
create policy inventory_lots_write on public.inventory_lots for all to authenticated
  using (
    tenant_id = (select public.current_tenant_id())
    and (select public.has_module_access('kho'))
  )
  with check (
    tenant_id = (select public.current_tenant_id())
    and (select public.has_module_access('kho'))
  );

-- ------------------------------------------------------------
-- 3. Item tracking flags
-- ------------------------------------------------------------
alter table public.inventory_items
  add column if not exists track_lot boolean not null default false,
  add column if not exists pick_strategy text not null default 'fifo'
    check (pick_strategy in ('fifo', 'fefo', 'lifo'));

-- ------------------------------------------------------------
-- 4. stock_quants (tồn chi tiết)
-- ------------------------------------------------------------
create table public.stock_quants (
  id             uuid primary key default gen_random_uuid(),
  tenant_id      uuid not null references public.tenants (id),
  warehouse_id   uuid not null references public.warehouses (id),
  location_id    uuid not null references public.warehouse_locations (id),
  item_id        uuid not null references public.inventory_items (id),
  lot_id         uuid references public.inventory_lots (id),
  qty            numeric(15,3) not null default 0 check (qty >= 0),
  updated_at     timestamptz not null default now()
);

-- Unique: một quant / (warehouse, location, item, lot) — lot null = sentinel via unique index
create unique index idx_stock_quants_key_with_lot
  on public.stock_quants (warehouse_id, location_id, item_id, lot_id)
  where lot_id is not null;

create unique index idx_stock_quants_key_no_lot
  on public.stock_quants (warehouse_id, location_id, item_id)
  where lot_id is null;

create index idx_stock_quants_tenant_item
  on public.stock_quants (tenant_id, item_id, warehouse_id);

create trigger trg_stock_quants_updated_at
  before update on public.stock_quants
  for each row execute function public.set_updated_at();

alter table public.stock_quants enable row level security;

create policy stock_quants_select on public.stock_quants for select to authenticated
  using (
    tenant_id = (select public.current_tenant_id())
    and (
      (select public.has_module_access('kho'))
      or (select public.has_module_access('kinh-doanh'))
      or (select public.has_module_access('san-xuat'))
    )
  );
create policy stock_quants_write on public.stock_quants for all to authenticated
  using (
    tenant_id = (select public.current_tenant_id())
    and (select public.has_module_access('kho'))
  )
  with check (
    tenant_id = (select public.current_tenant_id())
    and (select public.has_module_access('kho'))
  );

-- ------------------------------------------------------------
-- 5. Transaction lines: location + lot
-- ------------------------------------------------------------
alter table public.inventory_transaction_lines
  add column if not exists location_id uuid references public.warehouse_locations (id),
  add column if not exists lot_id uuid references public.inventory_lots (id);

-- ------------------------------------------------------------
-- 6. Default bin per warehouse + migrate balances → quants
-- ------------------------------------------------------------
insert into public.warehouse_locations (tenant_id, warehouse_id, code, name, kind, tags, attributes)
select w.tenant_id, w.id, '__DEFAULT__', 'Vị trí mặc định', 'bin',
       '["system"]'::jsonb, '{"system": true}'::jsonb
from public.warehouses w
on conflict (warehouse_id, code) do nothing;

insert into public.stock_quants (tenant_id, warehouse_id, location_id, item_id, lot_id, qty)
select sb.tenant_id, sb.warehouse_id, loc.id, sb.item_id, null, sb.qty_on_hand
from public.stock_balances sb
join public.warehouse_locations loc
  on loc.warehouse_id = sb.warehouse_id and loc.code = '__DEFAULT__'
where sb.qty_on_hand > 0
  and not exists (
    select 1 from public.stock_quants q
    where q.warehouse_id = sb.warehouse_id
      and q.location_id = loc.id
      and q.item_id = sb.item_id
      and q.lot_id is null
  );

-- ------------------------------------------------------------
-- 7. Rollup balances from quants
-- ------------------------------------------------------------
create or replace function public.inventory_rollup_balance(
  p_warehouse_id uuid,
  p_item_id uuid
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_tenant uuid := public.current_tenant_id();
  v_qty numeric;
  v_reserved numeric;
begin
  select coalesce(sum(q.qty), 0) into v_qty
  from public.stock_quants q
  where q.warehouse_id = p_warehouse_id and q.item_id = p_item_id;

  select coalesce(qty_reserved, 0) into v_reserved
  from public.stock_balances
  where warehouse_id = p_warehouse_id and item_id = p_item_id;

  v_reserved := coalesce(v_reserved, 0);

  insert into public.stock_balances (tenant_id, warehouse_id, item_id, qty_on_hand, qty_reserved)
  values (v_tenant, p_warehouse_id, p_item_id, v_qty, least(v_reserved, v_qty))
  on conflict (warehouse_id, item_id) do update
    set qty_on_hand = excluded.qty_on_hand,
        qty_reserved = least(public.stock_balances.qty_reserved, excluded.qty_on_hand),
        updated_at = now();
end;
$$;

-- ------------------------------------------------------------
-- 8. Apply quant delta + rollup (K2+)
-- ------------------------------------------------------------
create or replace function public.inventory_apply_quant(
  p_warehouse_id uuid,
  p_location_id uuid,
  p_item_id uuid,
  p_lot_id uuid,
  p_qty_delta numeric
)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_tenant uuid := public.current_tenant_id();
  v_loc uuid;
  updated int;
begin
  if p_qty_delta = 0 then return true; end if;

  v_loc := p_location_id;
  if v_loc is null then
    select id into v_loc from public.warehouse_locations
    where warehouse_id = p_warehouse_id and code = '__DEFAULT__' limit 1;
  end if;
  if v_loc is null then
    raise exception 'Chưa có vị trí mặc định cho kho';
  end if;

  if p_qty_delta > 0 then
    if p_lot_id is null then
      update public.stock_quants
      set qty = qty + p_qty_delta, updated_at = now()
      where warehouse_id = p_warehouse_id
        and location_id = v_loc
        and item_id = p_item_id
        and lot_id is null;
      get diagnostics updated = row_count;
      if updated = 0 then
        insert into public.stock_quants (tenant_id, warehouse_id, location_id, item_id, lot_id, qty)
        values (v_tenant, p_warehouse_id, v_loc, p_item_id, null, p_qty_delta);
      end if;
    else
      update public.stock_quants
      set qty = qty + p_qty_delta, updated_at = now()
      where warehouse_id = p_warehouse_id
        and location_id = v_loc
        and item_id = p_item_id
        and lot_id = p_lot_id;
      get diagnostics updated = row_count;
      if updated = 0 then
        insert into public.stock_quants (tenant_id, warehouse_id, location_id, item_id, lot_id, qty)
        values (v_tenant, p_warehouse_id, v_loc, p_item_id, p_lot_id, p_qty_delta);
      end if;
    end if;
    perform public.inventory_rollup_balance(p_warehouse_id, p_item_id);
    return true;
  end if;

  -- Issue: trừ đúng quant
  if p_lot_id is null then
    update public.stock_quants
    set qty = qty + p_qty_delta, updated_at = now()
    where warehouse_id = p_warehouse_id
      and location_id = v_loc
      and item_id = p_item_id
      and lot_id is null
      and qty >= abs(p_qty_delta);
  else
    update public.stock_quants
    set qty = qty + p_qty_delta, updated_at = now()
    where warehouse_id = p_warehouse_id
      and location_id = v_loc
      and item_id = p_item_id
      and lot_id = p_lot_id
      and qty >= abs(p_qty_delta);
  end if;
  get diagnostics updated = row_count;
  if updated = 0 then return false; end if;

  delete from public.stock_quants where qty = 0 and warehouse_id = p_warehouse_id and item_id = p_item_id;
  perform public.inventory_rollup_balance(p_warehouse_id, p_item_id);
  return true;
end;
$$;

-- Keep legacy inventory_apply_line working via default bin + rollup
create or replace function public.inventory_apply_line(
  p_warehouse_id uuid,
  p_item_id uuid,
  p_qty_delta numeric
)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_loc uuid;
begin
  select id into v_loc from public.warehouse_locations
  where warehouse_id = p_warehouse_id and code = '__DEFAULT__' limit 1;
  return public.inventory_apply_quant(p_warehouse_id, v_loc, p_item_id, null, p_qty_delta);
end;
$$;

-- Ensure defaults also creates default bins
create or replace function public.inventory_ensure_defaults()
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_tenant uuid := public.current_tenant_id();
  v_fg uuid;
  r record;
  w record;
begin
  if v_tenant is null then
    raise exception 'Không có tenant context';
  end if;

  insert into public.warehouses (tenant_id, code, name, kind)
  values (v_tenant, 'KHO-TP', 'Kho thành phẩm', 'fg')
  on conflict (tenant_id, code) do nothing;

  insert into public.warehouses (tenant_id, code, name, kind)
  values (v_tenant, 'KHO-NVL', 'Kho nguyên vật liệu', 'raw')
  on conflict (tenant_id, code) do nothing;

  for w in select id from public.warehouses where tenant_id = v_tenant
  loop
    insert into public.warehouse_locations (tenant_id, warehouse_id, code, name, kind, tags, attributes)
    values (v_tenant, w.id, '__DEFAULT__', 'Vị trí mặc định', 'bin', '["system"]'::jsonb, '{"system": true}'::jsonb)
    on conflict (warehouse_id, code) do nothing;
  end loop;

  select id into v_fg from public.warehouses
  where tenant_id = v_tenant and code = 'KHO-TP';

  for r in
    select p.id, p.sku, p.name, p.uom, p.base_price, p.is_active,
           coalesce(ps.qty_on_hand, 0) as qty
    from public.products p
    left join public.product_stock ps on ps.product_id = p.id
    where p.tenant_id = v_tenant
  loop
    insert into public.inventory_items (
      tenant_id, product_id, sku, name, uom, item_type, base_price, is_active
    ) values (
      v_tenant, r.id, r.sku, r.name, r.uom, 'fg', r.base_price, r.is_active
    )
    on conflict (tenant_id, sku) do update
      set product_id = excluded.product_id,
          name = excluded.name,
          uom = excluded.uom,
          base_price = excluded.base_price,
          is_active = excluded.is_active;

    insert into public.stock_balances (tenant_id, warehouse_id, item_id, qty_on_hand, qty_reserved)
    select v_tenant, v_fg, ii.id, r.qty, 0
    from public.inventory_items ii
    where ii.tenant_id = v_tenant and ii.product_id = r.id
    on conflict (warehouse_id, item_id) do nothing;
  end loop;
end;
$$;

comment on table public.warehouse_locations is 'K2: Zone/Row/Rack/Level/Bin dưới warehouse';
comment on table public.inventory_lots is 'K3: Lô/mẻ theo item';
comment on table public.stock_quants is 'K2+K3: tồn chi tiết theo vị trí + lô; stock_balances = rollup';
comment on function public.inventory_apply_quant is 'Cộng/trừ stock_quants rồi rollup stock_balances';
