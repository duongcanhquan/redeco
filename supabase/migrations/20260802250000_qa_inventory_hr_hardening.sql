-- ============================================================
-- QA hardening: Inventory K2+ + HR (CRITICAL/HIGH from QA audit)
-- ============================================================

-- 1) ATP Sales = FG warehouses only (align reserve/ship)
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
    and w.is_active = true
    and w.kind = 'fg';
$$;

comment on function public.inventory_get_atp(uuid) is
  'ATP theo product (Sales) = Σ (on_hand - reserved) chỉ kho kind=fg active.';

-- 1b) Rollup: không xoá on_hand khi chưa có dòng quant (tránh wipe trước seed)
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
  v_qcount int;
  v_existing numeric;
begin
  select coalesce(sum(q.qty), 0), count(*)::int
    into v_qty, v_qcount
  from public.stock_quants q
  where q.warehouse_id = p_warehouse_id and q.item_id = p_item_id;

  select coalesce(qty_reserved, 0), coalesce(qty_on_hand, 0)
    into v_reserved, v_existing
  from public.stock_balances
  where warehouse_id = p_warehouse_id and item_id = p_item_id;

  v_reserved := coalesce(v_reserved, 0);
  v_existing := coalesce(v_existing, 0);

  -- Chưa có quant: giữ on_hand hiện có (legacy/seed), chỉ clamp reserved
  if v_qcount = 0 then
    if v_existing > 0 or v_reserved > 0 then
      insert into public.stock_balances (tenant_id, warehouse_id, item_id, qty_on_hand, qty_reserved)
      values (v_tenant, p_warehouse_id, p_item_id, v_existing, least(v_reserved, v_existing))
      on conflict (warehouse_id, item_id) do update
        set qty_reserved = least(public.stock_balances.qty_reserved, public.stock_balances.qty_on_hand),
            updated_at = now();
    end if;
    return;
  end if;

  insert into public.stock_balances (tenant_id, warehouse_id, item_id, qty_on_hand, qty_reserved)
  values (v_tenant, p_warehouse_id, p_item_id, v_qty, least(v_reserved, v_qty))
  on conflict (warehouse_id, item_id) do update
    set qty_on_hand = excluded.qty_on_hand,
        qty_reserved = least(public.stock_balances.qty_reserved, excluded.qty_on_hand),
        updated_at = now();
end;
$$;

-- 2) Apply quant: issue must respect warehouse ATP (on_hand - reserved)
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
  v_atp numeric;
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

  -- Issue: không vượt ATP (trừ giữ chỗ) tại kho
  select coalesce(qty_on_hand - qty_reserved, 0) into v_atp
  from public.stock_balances
  where warehouse_id = p_warehouse_id and item_id = p_item_id;
  if v_atp is null then v_atp := 0; end if;
  if v_atp < abs(p_qty_delta) then
    return false;
  end if;

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

  delete from public.stock_quants
  where qty = 0 and warehouse_id = p_warehouse_id and item_id = p_item_id;
  perform public.inventory_rollup_balance(p_warehouse_id, p_item_id);
  return true;
end;
$$;

-- 3) ensure_defaults: seed quant khi có balance; reconcile balance→default quant
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
  v_item uuid;
  v_loc uuid;
  v_bal numeric;
  v_qsum numeric;
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

    select ii.id into v_item from public.inventory_items ii
    where ii.tenant_id = v_tenant and ii.product_id = r.id limit 1;

    if v_item is not null and v_fg is not null then
      insert into public.stock_balances (tenant_id, warehouse_id, item_id, qty_on_hand, qty_reserved)
      values (v_tenant, v_fg, v_item, r.qty, 0)
      on conflict (warehouse_id, item_id) do nothing;

      select id into v_loc from public.warehouse_locations
      where warehouse_id = v_fg and code = '__DEFAULT__' limit 1;

      if v_loc is not null then
        select coalesce(sum(qty), 0) into v_qsum
        from public.stock_quants
        where warehouse_id = v_fg and item_id = v_item;

        select qty_on_hand into v_bal
        from public.stock_balances
        where warehouse_id = v_fg and item_id = v_item;

        -- Seed default quant nếu chưa có quant nhưng balance > 0
        if coalesce(v_qsum, 0) = 0 and coalesce(v_bal, 0) > 0 then
          insert into public.stock_quants (
            tenant_id, warehouse_id, location_id, item_id, lot_id, qty
          ) values (v_tenant, v_fg, v_loc, v_item, null, v_bal);
        end if;
      end if;
    end if;
  end loop;

  -- Reconcile: mọi balance có tồn nhưng không có quant → seed __DEFAULT__
  for r in
    select sb.warehouse_id, sb.item_id, sb.qty_on_hand, sb.tenant_id
    from public.stock_balances sb
    where sb.tenant_id = v_tenant
      and sb.qty_on_hand > 0
      and not exists (
        select 1 from public.stock_quants sq
        where sq.warehouse_id = sb.warehouse_id and sq.item_id = sb.item_id
      )
  loop
    select id into v_loc from public.warehouse_locations
    where warehouse_id = r.warehouse_id and code = '__DEFAULT__' limit 1;
    if v_loc is not null then
      insert into public.stock_quants (
        tenant_id, warehouse_id, location_id, item_id, lot_id, qty
      ) values (r.tenant_id, r.warehouse_id, v_loc, r.item_id, null, r.qty_on_hand);
    end if;
  end loop;
end;
$$;

-- 4) Production may write quants/lots (bridge after K2+)
drop policy if exists stock_quants_write on public.stock_quants;
create policy stock_quants_write on public.stock_quants for all to authenticated
  using (
    tenant_id = (select public.current_tenant_id())
    and (
      (select public.has_module_access('kho'))
      or (select public.has_module_access('san-xuat'))
    )
  )
  with check (
    tenant_id = (select public.current_tenant_id())
    and (
      (select public.has_module_access('kho'))
      or (select public.has_module_access('san-xuat'))
    )
  );

drop policy if exists inventory_lots_write on public.inventory_lots;
create policy inventory_lots_write on public.inventory_lots for all to authenticated
  using (
    tenant_id = (select public.current_tenant_id())
    and (
      (select public.has_module_access('kho'))
      or (select public.has_module_access('san-xuat'))
    )
  )
  with check (
    tenant_id = (select public.current_tenant_id())
    and (
      (select public.has_module_access('kho'))
      or (select public.has_module_access('san-xuat'))
    )
  );

-- Ensure lots read policy exists for san-xuat (select often covered by ALL; keep if separate)
drop policy if exists inventory_lots_select on public.inventory_lots;
create policy inventory_lots_select on public.inventory_lots for select to authenticated
  using (
    tenant_id = (select public.current_tenant_id())
    and (
      (select public.has_module_access('kho'))
      or (select public.has_module_access('san-xuat'))
      or (select public.has_module_access('kinh-doanh'))
    )
  );
