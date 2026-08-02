-- Giữ chỗ chỉ tại kho thành phẩm (kind = fg) — khớp nơi xuất giao hàng.
-- Idempotent skip chỉ khi đã giữ đủ từng dòng.

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
  v_already numeric;
  v_new_ids uuid[] := '{}';
  v_rid uuid;
  r record;
  v_all_covered boolean := true;
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

  -- Kiểm tra đã giữ đủ chưa (theo tổng qty active / dòng sản phẩm)
  for v_line in
    select soi.product_id, soi.qty,
           coalesce((
             select sum(r.qty)
             from public.stock_reservations r
             join public.inventory_items ii on ii.id = r.item_id
             where r.tenant_id = v_tenant
               and r.source_type = 'sales_order'
               and r.source_id = p_sales_order_id
               and r.status = 'active'
               and ii.product_id = soi.product_id
           ), 0) as already
    from public.sales_order_items soi
    where soi.sales_order_id = p_sales_order_id
  loop
    if v_line.already + 0.0001 < v_line.qty then
      v_all_covered := false;
      exit;
    end if;
  end loop;

  if v_all_covered and exists (
    select 1 from public.stock_reservations r
    where r.tenant_id = v_tenant
      and r.source_type = 'sales_order'
      and r.source_id = p_sales_order_id
      and r.status = 'active'
  ) then
    return jsonb_build_object(
      'ok', true,
      'reserved_lines', '[]'::jsonb,
      'shortfalls', '[]'::jsonb,
      'skipped', true
    );
  end if;

  for v_line in
    select id, product_id, product_name, qty
    from public.sales_order_items
    where sales_order_id = p_sales_order_id
  loop
    select coalesce(sum(r.qty), 0) into v_already
    from public.stock_reservations r
    join public.inventory_items ii on ii.id = r.item_id
    where r.tenant_id = v_tenant
      and r.source_type = 'sales_order'
      and r.source_id = p_sales_order_id
      and r.status = 'active'
      and ii.product_id = v_line.product_id;

    v_need := greatest(0, v_line.qty - v_already);
    v_line_reserved := 0;
    if v_need <= 0 then
      continue;
    end if;

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

    -- Chỉ kho thành phẩm (fg) — nơi xuất giao hàng
    for v_bal in
      select sb.id, sb.warehouse_id, sb.qty_on_hand, sb.qty_reserved,
             (sb.qty_on_hand - sb.qty_reserved) as atp
      from public.stock_balances sb
      join public.warehouses w on w.id = sb.warehouse_id
      where sb.tenant_id = v_tenant
        and sb.item_id = v_item_id
        and w.is_active = true
        and w.kind = 'fg'
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
      'error', 'Không giữ chỗ đủ toàn bộ đơn tại kho thành phẩm. Bổ sung tồn hoặc tắt «Chỉ xác nhận khi giữ chỗ đủ».',
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
