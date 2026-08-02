-- ============================================================
-- Giữ chỗ tồn khi xác nhận đơn bán (K2 tối thiểu)
-- RPC security definer: Sales có thể giữ chỗ dù RLS stock_* chỉ ghi cho module Kho.
-- ============================================================

create index if not exists idx_stock_reservations_source
  on public.stock_reservations (tenant_id, source_type, source_id, status);

-- Cho Kinh doanh đọc chỗ đã giữ (không ghi trực tiếp)
drop policy if exists stock_reservations_select_sales on public.stock_reservations;
create policy stock_reservations_select_sales on public.stock_reservations
  for select to authenticated
  using (
    tenant_id = (select public.current_tenant_id())
    and (
      (select public.has_module_access('kho'))
      or (select public.has_module_access('kinh-doanh'))
    )
  );

-- Policy ALL cũ vẫn giữ cho kho (ghi). SELECT sales bổ sung song song.

/**
 * Giữ chỗ theo dòng đơn. Trả jsonb:
 * { "ok": true, "reserved_lines": [{"product_id","qty"}], "shortfalls": [...] }
 * hoặc { "ok": false, "error": "..." }
 * p_require_full = true → không đủ thì hủy toàn bộ giữ chỗ vừa tạo và báo lỗi.
 */
create or replace function public.inventory_reserve_for_sales_order(
  p_sales_order_id uuid,
  p_require_full boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tenant uuid := public.current_tenant_id();
  v_order record;
  v_line record;
  v_item_id uuid;
  v_need numeric;
  v_take numeric;
  v_atp numeric;
  v_bal record;
  v_reserved jsonb := '[]'::jsonb;
  v_short jsonb := '[]'::jsonb;
  v_line_reserved numeric;
  v_new_ids uuid[] := '{}';
  v_rid uuid;
  r record;
begin
  if v_tenant is null then
    return jsonb_build_object('ok', false, 'error', 'Chưa xác thực tenant.');
  end if;
  if not (
    public.has_module_access('kho')
    or public.has_module_access('kinh-doanh')
  ) then
    return jsonb_build_object('ok', false, 'error', 'Không có quyền giữ chỗ tồn.');
  end if;

  select id, tenant_id, status into v_order
  from public.sales_orders
  where id = p_sales_order_id;
  if v_order.id is null or v_order.tenant_id <> v_tenant then
    return jsonb_build_object('ok', false, 'error', 'Không tìm thấy đơn hàng.');
  end if;

  -- Idempotent: đã có giữ chỗ active thì bỏ qua (không tạo trùng)
  if exists (
    select 1 from public.stock_reservations r
    where r.tenant_id = v_tenant
      and r.source_type = 'sales_order'
      and r.source_id = p_sales_order_id
      and r.status = 'active'
  ) then
    return jsonb_build_object('ok', true, 'reserved_lines', '[]'::jsonb, 'shortfalls', '[]'::jsonb, 'skipped', true);
  end if;

  for v_line in
    select id, product_id, product_name, qty
    from public.sales_order_items
    where sales_order_id = p_sales_order_id
  loop
    v_need := v_line.qty;
    v_line_reserved := 0;

    select id into v_item_id
    from public.inventory_items
    where tenant_id = v_tenant and product_id = v_line.product_id
    limit 1;

    if v_item_id is null then
      v_short := v_short || jsonb_build_array(jsonb_build_object(
        'product_id', v_line.product_id,
        'product_name', v_line.product_name,
        'shortfall', v_need,
        'reason', 'no_item'
      ));
      continue;
    end if;

    for v_bal in
      select sb.id, sb.warehouse_id, sb.qty_on_hand, sb.qty_reserved,
             (sb.qty_on_hand - sb.qty_reserved) as atp
      from public.stock_balances sb
      join public.warehouses w on w.id = sb.warehouse_id
      where sb.tenant_id = v_tenant
        and sb.item_id = v_item_id
        and w.is_active = true
        and (sb.qty_on_hand - sb.qty_reserved) > 0
      order by (sb.qty_on_hand - sb.qty_reserved) desc
    loop
      exit when v_need <= 0;
      v_atp := v_bal.atp;
      v_take := least(v_need, v_atp);
      if v_take <= 0 then
        continue;
      end if;

      insert into public.stock_reservations (
        tenant_id, item_id, warehouse_id, qty,
        source_type, source_id, status
      ) values (
        v_tenant, v_item_id, v_bal.warehouse_id, v_take,
        'sales_order', p_sales_order_id, 'active'
      ) returning id into v_rid;

      v_new_ids := array_append(v_new_ids, v_rid);

      update public.stock_balances
      set qty_reserved = qty_reserved + v_take
      where id = v_bal.id
        and qty_reserved + v_take <= qty_on_hand;

      if not found then
        -- race: rollback giữ chỗ dòng này
        delete from public.stock_reservations where id = v_rid;
        v_new_ids := array_remove(v_new_ids, v_rid);
        continue;
      end if;

      v_need := v_need - v_take;
      v_line_reserved := v_line_reserved + v_take;
    end loop;

    if v_line_reserved > 0 then
      v_reserved := v_reserved || jsonb_build_array(jsonb_build_object(
        'product_id', v_line.product_id,
        'product_name', v_line.product_name,
        'qty', v_line_reserved
      ));
    end if;

    if v_need > 0 then
      v_short := v_short || jsonb_build_array(jsonb_build_object(
        'product_id', v_line.product_id,
        'product_name', v_line.product_name,
        'shortfall', v_need
      ));
    end if;
  end loop;

  if p_require_full and jsonb_array_length(v_short) > 0 then
    -- hoàn tác giữ chỗ vừa tạo trong lần gọi này
    for r in
      select id, item_id, warehouse_id, qty
      from public.stock_reservations
      where id = any (v_new_ids)
    loop
      update public.stock_balances
      set qty_reserved = greatest(0, qty_reserved - r.qty)
      where tenant_id = v_tenant
        and item_id = r.item_id
        and warehouse_id = r.warehouse_id;
      delete from public.stock_reservations where id = r.id;
    end loop;
    return jsonb_build_object(
      'ok', false,
      'error', 'Không giữ chỗ đủ toàn bộ đơn. Bổ sung tồn hoặc tắt «Chỉ xác nhận khi giữ chỗ đủ».',
      'shortfalls', v_short
    );
  end if;

  return jsonb_build_object(
    'ok', true,
    'reserved_lines', v_reserved,
    'shortfalls', v_short
  );
end;
$$;

revoke all on function public.inventory_reserve_for_sales_order(uuid, boolean) from public;
grant execute on function public.inventory_reserve_for_sales_order(uuid, boolean) to authenticated;

/**
 * Hủy / nhả giữ chỗ active của đơn → trừ qty_reserved.
 */
create or replace function public.inventory_release_sales_order_reservations(
  p_sales_order_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tenant uuid := public.current_tenant_id();
  r record;
begin
  if v_tenant is null then
    return false;
  end if;
  if not (
    public.has_module_access('kho')
    or public.has_module_access('kinh-doanh')
  ) then
    return false;
  end if;

  for r in
    select id, item_id, warehouse_id, qty
    from public.stock_reservations
    where tenant_id = v_tenant
      and source_type = 'sales_order'
      and source_id = p_sales_order_id
      and status = 'active'
  loop
    update public.stock_balances
    set qty_reserved = greatest(0, qty_reserved - r.qty)
    where tenant_id = v_tenant
      and item_id = r.item_id
      and warehouse_id = r.warehouse_id;

    update public.stock_reservations
    set status = 'cancelled'
    where id = r.id;
  end loop;

  return true;
end;
$$;

revoke all on function public.inventory_release_sales_order_reservations(uuid) from public;
grant execute on function public.inventory_release_sales_order_reservations(uuid) to authenticated;

/**
 * Xuất giao: chuyển reservation active → consumed và trừ qty_reserved
 * (trước khi trừ tồn vật lý qua inventory_apply_line).
 */
create or replace function public.inventory_consume_sales_order_reservations(
  p_sales_order_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tenant uuid := public.current_tenant_id();
  r record;
begin
  if v_tenant is null then
    return false;
  end if;
  if not (
    public.has_module_access('kho')
    or public.has_module_access('kinh-doanh')
  ) then
    return false;
  end if;

  for r in
    select id, item_id, warehouse_id, qty
    from public.stock_reservations
    where tenant_id = v_tenant
      and source_type = 'sales_order'
      and source_id = p_sales_order_id
      and status = 'active'
  loop
    update public.stock_balances
    set qty_reserved = greatest(0, qty_reserved - r.qty)
    where tenant_id = v_tenant
      and item_id = r.item_id
      and warehouse_id = r.warehouse_id;

    update public.stock_reservations
    set status = 'consumed'
    where id = r.id;
  end loop;

  return true;
end;
$$;

revoke all on function public.inventory_consume_sales_order_reservations(uuid) from public;
grant execute on function public.inventory_consume_sales_order_reservations(uuid) to authenticated;

comment on function public.inventory_reserve_for_sales_order is
  'Giữ chỗ tồn cho đơn bán (partial hoặc full). Security definer.';
comment on function public.inventory_release_sales_order_reservations is
  'Nhả giữ chỗ khi hủy đơn.';
comment on function public.inventory_consume_sales_order_reservations is
  'Tiêu thụ giữ chỗ trước khi xuất giao hàng.';
