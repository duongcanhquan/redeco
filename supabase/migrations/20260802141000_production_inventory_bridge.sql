-- Cho phép module Sản xuất ghi phiếu kho / tồn khi xuất NVL & nhập TP (SX1).
-- Kho vẫn là nguồn tồn; san-xuat gọi cùng bảng với RLS mở rộng.

create policy inventory_tx_sx_write on public.inventory_transactions for all to authenticated
  using (
    tenant_id = (select public.current_tenant_id())
    and (select public.has_module_access('san-xuat'))
  )
  with check (
    tenant_id = (select public.current_tenant_id())
    and (select public.has_module_access('san-xuat'))
  );

create policy inventory_tx_lines_sx_write on public.inventory_transaction_lines for all to authenticated
  using (
    tenant_id = (select public.current_tenant_id())
    and (select public.has_module_access('san-xuat'))
  )
  with check (
    tenant_id = (select public.current_tenant_id())
    and (select public.has_module_access('san-xuat'))
  );

create policy stock_balances_sx_write on public.stock_balances for all to authenticated
  using (
    tenant_id = (select public.current_tenant_id())
    and (select public.has_module_access('san-xuat'))
  )
  with check (
    tenant_id = (select public.current_tenant_id())
    and (select public.has_module_access('san-xuat'))
  );

-- Đọc kho mặc định khi tạo LSX
create policy warehouses_sx_select on public.warehouses for select to authenticated
  using (
    tenant_id = (select public.current_tenant_id())
    and (select public.has_module_access('san-xuat'))
  );

create policy inventory_items_sx_select on public.inventory_items for select to authenticated
  using (
    tenant_id = (select public.current_tenant_id())
    and (select public.has_module_access('san-xuat'))
  );
