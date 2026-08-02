-- ============================================================
-- Inventory (Kho) Phase K1
-- Blueprint: docs/blueprints/2026-08-02-inventory-module-blueprint.md
-- Plan: docs/superpowers/plans/2026-08-02-inventory-k1.md
-- ============================================================

-- ------------------------------------------------------------
-- 1. warehouses
-- ------------------------------------------------------------
create table public.warehouses (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references public.tenants (id),
  code        text not null,
  name        text not null,
  kind        text not null default 'fg'
              check (kind in ('raw', 'wip', 'fg', 'spare', 'other')),
  is_active   boolean not null default true,
  attributes  jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (tenant_id, code)
);

create index idx_warehouses_tenant on public.warehouses (tenant_id, kind);
create trigger trg_warehouses_updated_at
  before update on public.warehouses
  for each row execute function public.set_updated_at();

-- ------------------------------------------------------------
-- 2. inventory_items — mirror products (K1); product_id unique khi có
-- ------------------------------------------------------------
create table public.inventory_items (
  id           uuid primary key default gen_random_uuid(),
  tenant_id    uuid not null references public.tenants (id),
  product_id   uuid references public.products (id) on delete set null,
  sku          text not null,
  name         text not null,
  uom          text not null default 'cái',
  item_type    text not null default 'fg'
               check (item_type in ('raw', 'wip', 'fg', 'consumable', 'tool')),
  base_price   numeric(18,2) not null default 0 check (base_price >= 0),
  is_active    boolean not null default true,
  attributes   jsonb not null default '{}'::jsonb,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (tenant_id, sku)
);

create unique index idx_inventory_items_product
  on public.inventory_items (tenant_id, product_id)
  where product_id is not null;

create index idx_inventory_items_tenant on public.inventory_items (tenant_id, item_type);
create trigger trg_inventory_items_updated_at
  before update on public.inventory_items
  for each row execute function public.set_updated_at();

-- ------------------------------------------------------------
-- 3. stock_balances
-- ------------------------------------------------------------
create table public.stock_balances (
  id             uuid primary key default gen_random_uuid(),
  tenant_id      uuid not null references public.tenants (id),
  warehouse_id   uuid not null references public.warehouses (id),
  item_id        uuid not null references public.inventory_items (id),
  qty_on_hand    numeric(15,3) not null default 0 check (qty_on_hand >= 0),
  qty_reserved   numeric(15,3) not null default 0 check (qty_reserved >= 0),
  updated_at     timestamptz not null default now(),
  unique (warehouse_id, item_id),
  check (qty_reserved <= qty_on_hand)
);

create index idx_stock_balances_tenant on public.stock_balances (tenant_id, item_id);
create trigger trg_stock_balances_updated_at
  before update on public.stock_balances
  for each row execute function public.set_updated_at();

-- ------------------------------------------------------------
-- 4. stock_reservations
-- ------------------------------------------------------------
create table public.stock_reservations (
  id             uuid primary key default gen_random_uuid(),
  tenant_id      uuid not null references public.tenants (id),
  item_id        uuid not null references public.inventory_items (id),
  warehouse_id   uuid not null references public.warehouses (id),
  qty            numeric(15,3) not null check (qty > 0),
  source_type    text not null check (source_type in ('sales_order', 'work_order')),
  source_id      uuid not null,
  status         text not null default 'active'
                 check (status in ('active', 'released', 'consumed', 'cancelled')),
  expires_at     timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index idx_stock_reservations_tenant
  on public.stock_reservations (tenant_id, status, item_id);
create trigger trg_stock_reservations_updated_at
  before update on public.stock_reservations
  for each row execute function public.set_updated_at();

-- ------------------------------------------------------------
-- 5. inventory_transactions + lines
-- ------------------------------------------------------------
create table public.inventory_transactions (
  id               uuid primary key default gen_random_uuid(),
  tenant_id        uuid not null references public.tenants (id),
  code             text not null,
  txn_type         text not null check (txn_type in ('receipt', 'issue', 'transfer', 'adjustment')),
  status           text not null default 'draft'
                   check (status in ('draft', 'posted', 'void')),
  warehouse_id     uuid not null references public.warehouses (id),
  warehouse_to_id  uuid references public.warehouses (id),
  notes            text,
  posted_at        timestamptz,
  created_by       uuid references public.user_profiles (id),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (tenant_id, code)
);

create index idx_inventory_tx_tenant on public.inventory_transactions (tenant_id, status, txn_type);
create trigger trg_inventory_tx_updated_at
  before update on public.inventory_transactions
  for each row execute function public.set_updated_at();

create table public.inventory_transaction_lines (
  id               uuid primary key default gen_random_uuid(),
  tenant_id        uuid not null references public.tenants (id),
  transaction_id   uuid not null references public.inventory_transactions (id) on delete cascade,
  item_id          uuid not null references public.inventory_items (id),
  qty              numeric(15,3) not null check (qty > 0),
  sort_order       int not null default 0
);

create index idx_inventory_tx_lines_tenant
  on public.inventory_transaction_lines (tenant_id, transaction_id);

-- ------------------------------------------------------------
-- 6. RLS — ghi cần kho; đọc tồn cho phép kinh-doanh (ATP Sales)
-- ------------------------------------------------------------
alter table public.warehouses enable row level security;
alter table public.inventory_items enable row level security;
alter table public.stock_balances enable row level security;
alter table public.stock_reservations enable row level security;
alter table public.inventory_transactions enable row level security;
alter table public.inventory_transaction_lines enable row level security;

create policy warehouses_select on public.warehouses for select to authenticated
  using (
    tenant_id = (select public.current_tenant_id())
    and (
      (select public.has_module_access('kho'))
      or (select public.has_module_access('kinh-doanh'))
    )
  );
create policy warehouses_write on public.warehouses for all to authenticated
  using (
    tenant_id = (select public.current_tenant_id())
    and (select public.has_module_access('kho'))
  )
  with check (
    tenant_id = (select public.current_tenant_id())
    and (select public.has_module_access('kho'))
  );

create policy inventory_items_select on public.inventory_items for select to authenticated
  using (
    tenant_id = (select public.current_tenant_id())
    and (
      (select public.has_module_access('kho'))
      or (select public.has_module_access('kinh-doanh'))
    )
  );
create policy inventory_items_write on public.inventory_items for all to authenticated
  using (
    tenant_id = (select public.current_tenant_id())
    and (select public.has_module_access('kho'))
  )
  with check (
    tenant_id = (select public.current_tenant_id())
    and (select public.has_module_access('kho'))
  );

create policy stock_balances_select on public.stock_balances for select to authenticated
  using (
    tenant_id = (select public.current_tenant_id())
    and (
      (select public.has_module_access('kho'))
      or (select public.has_module_access('kinh-doanh'))
    )
  );
create policy stock_balances_write on public.stock_balances for all to authenticated
  using (
    tenant_id = (select public.current_tenant_id())
    and (select public.has_module_access('kho'))
  )
  with check (
    tenant_id = (select public.current_tenant_id())
    and (select public.has_module_access('kho'))
  );

create policy stock_reservations_all on public.stock_reservations for all to authenticated
  using (
    tenant_id = (select public.current_tenant_id())
    and (select public.has_module_access('kho'))
  )
  with check (
    tenant_id = (select public.current_tenant_id())
    and (select public.has_module_access('kho'))
  );

create policy inventory_tx_all on public.inventory_transactions for all to authenticated
  using (
    tenant_id = (select public.current_tenant_id())
    and (select public.has_module_access('kho'))
  )
  with check (
    tenant_id = (select public.current_tenant_id())
    and (select public.has_module_access('kho'))
  );

create policy inventory_tx_lines_all on public.inventory_transaction_lines for all to authenticated
  using (
    tenant_id = (select public.current_tenant_id())
    and (select public.has_module_access('kho'))
  )
  with check (
    tenant_id = (select public.current_tenant_id())
    and (select public.has_module_access('kho'))
  );

-- ------------------------------------------------------------
-- 7. Helpers
-- ------------------------------------------------------------

-- ATP = sum(on_hand - reserved) mọi kho active (hoặc theo warehouse)
create or replace function public.inventory_get_atp(p_product_id uuid)
returns numeric
language sql
stable
security invoker
set search_path = ''
as $$
  select coalesce(sum(sb.qty_on_hand - sb.qty_reserved), 0)::numeric
  from public.stock_balances sb
  join public.inventory_items ii on ii.id = sb.item_id
  join public.warehouses w on w.id = sb.warehouse_id
  where ii.product_id = p_product_id
    and ii.tenant_id = public.current_tenant_id()
    and w.is_active = true;
$$;

comment on function public.inventory_get_atp(uuid) is
  'ATP theo product_id (Sales). = Σ (on_hand - reserved) các kho active.';

-- Đồng bộ product_stock = ATP (tương thích Sales cũ)
create or replace function public.inventory_sync_product_stock(p_product_id uuid)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_atp numeric;
  v_tenant uuid;
begin
  select tenant_id into v_tenant from public.products where id = p_product_id;
  if v_tenant is null then return; end if;
  v_atp := public.inventory_get_atp(p_product_id);
  insert into public.product_stock (product_id, tenant_id, qty_on_hand)
  values (p_product_id, v_tenant, greatest(v_atp, 0))
  on conflict (product_id) do update
    set qty_on_hand = greatest(excluded.qty_on_hand, 0),
        updated_at = now();
end;
$$;

-- Đảm bảo kho mặc định + item từ products (idempotent / tenant hiện tại)
create or replace function public.inventory_ensure_defaults()
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_tenant uuid := public.current_tenant_id();
  v_fg uuid;
  v_raw uuid;
  r record;
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

comment on function public.inventory_ensure_defaults() is
  'Tạo KHO-TP/KHO-NVL + sync items/balances từ products (một lần / idempotent balance insert).';

-- Post phiếu: cập nhật tồn nguyên tử
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
  v_tenant uuid := public.current_tenant_id();
  updated int;
begin
  if p_qty_delta = 0 then return true; end if;

  if p_qty_delta > 0 then
    insert into public.stock_balances (tenant_id, warehouse_id, item_id, qty_on_hand, qty_reserved)
    values (v_tenant, p_warehouse_id, p_item_id, p_qty_delta, 0)
    on conflict (warehouse_id, item_id) do update
      set qty_on_hand = public.stock_balances.qty_on_hand + excluded.qty_on_hand,
          updated_at = now();
    return true;
  end if;

  -- Xuất: cần đủ ATP (on_hand - reserved)
  update public.stock_balances
  set qty_on_hand = qty_on_hand + p_qty_delta,
      updated_at = now()
  where warehouse_id = p_warehouse_id
    and item_id = p_item_id
    and (qty_on_hand - qty_reserved) >= abs(p_qty_delta);
  get diagnostics updated = row_count;
  return updated > 0;
end;
$$;
