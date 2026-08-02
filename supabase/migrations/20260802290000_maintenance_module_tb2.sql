-- ============================================================
-- Maintenance TB2 — spare parts + inventory bridge for thiet-bi
-- Blueprint: docs/blueprints/2026-08-02-maintenance-tb2-blueprint.md
-- ============================================================

create table public.eam_maintenance_part_lines (
  id                   uuid primary key default gen_random_uuid(),
  tenant_id            uuid not null references public.tenants (id),
  order_id             uuid not null references public.eam_maintenance_orders (id) on delete cascade,
  item_id              uuid not null references public.inventory_items (id),
  warehouse_id         uuid not null references public.warehouses (id),
  qty_planned          numeric(15,3) not null check (qty_planned > 0),
  qty_issued           numeric(15,3) not null default 0 check (qty_issued >= 0),
  status               text not null default 'planned'
                       check (status in ('planned', 'issued', 'cancelled')),
  inventory_txn_id     uuid references public.inventory_transactions (id),
  attributes           jsonb not null default '{}'::jsonb,
  created_at           timestamptz not null default now(),
  check (qty_issued <= qty_planned)
);

create index idx_eam_parts_order
  on public.eam_maintenance_part_lines (tenant_id, order_id);
create index idx_eam_parts_item
  on public.eam_maintenance_part_lines (tenant_id, item_id);

alter table public.eam_maintenance_part_lines enable row level security;

create policy eam_parts_all on public.eam_maintenance_part_lines for all to authenticated
  using (
    tenant_id = (select public.current_tenant_id())
    and (select public.has_module_access('thiet-bi'))
  )
  with check (
    tenant_id = (select public.current_tenant_id())
    and (select public.has_module_access('thiet-bi'))
  );

-- ------------------------------------------------------------
-- Inventory bridge: thiet-bi may post issue + read masters
-- ------------------------------------------------------------
create policy inventory_tx_tb_write on public.inventory_transactions for all to authenticated
  using (
    tenant_id = (select public.current_tenant_id())
    and (select public.has_module_access('thiet-bi'))
  )
  with check (
    tenant_id = (select public.current_tenant_id())
    and (select public.has_module_access('thiet-bi'))
  );

create policy inventory_tx_lines_tb_write on public.inventory_transaction_lines for all to authenticated
  using (
    tenant_id = (select public.current_tenant_id())
    and (select public.has_module_access('thiet-bi'))
  )
  with check (
    tenant_id = (select public.current_tenant_id())
    and (select public.has_module_access('thiet-bi'))
  );

create policy stock_balances_tb_write on public.stock_balances for all to authenticated
  using (
    tenant_id = (select public.current_tenant_id())
    and (select public.has_module_access('thiet-bi'))
  )
  with check (
    tenant_id = (select public.current_tenant_id())
    and (select public.has_module_access('thiet-bi'))
  );

create policy warehouses_tb_select on public.warehouses for select to authenticated
  using (
    tenant_id = (select public.current_tenant_id())
    and (select public.has_module_access('thiet-bi'))
  );

create policy inventory_items_tb_select on public.inventory_items for select to authenticated
  using (
    tenant_id = (select public.current_tenant_id())
    and (select public.has_module_access('thiet-bi'))
  );

drop policy if exists stock_quants_write on public.stock_quants;
create policy stock_quants_write on public.stock_quants for all to authenticated
  using (
    tenant_id = (select public.current_tenant_id())
    and (
      (select public.has_module_access('kho'))
      or (select public.has_module_access('san-xuat'))
      or (select public.has_module_access('thiet-bi'))
    )
  )
  with check (
    tenant_id = (select public.current_tenant_id())
    and (
      (select public.has_module_access('kho'))
      or (select public.has_module_access('san-xuat'))
      or (select public.has_module_access('thiet-bi'))
    )
  );

drop policy if exists inventory_lots_write on public.inventory_lots;
create policy inventory_lots_write on public.inventory_lots for all to authenticated
  using (
    tenant_id = (select public.current_tenant_id())
    and (
      (select public.has_module_access('kho'))
      or (select public.has_module_access('san-xuat'))
      or (select public.has_module_access('thiet-bi'))
    )
  )
  with check (
    tenant_id = (select public.current_tenant_id())
    and (
      (select public.has_module_access('kho'))
      or (select public.has_module_access('san-xuat'))
      or (select public.has_module_access('thiet-bi'))
    )
  );

drop policy if exists inventory_lots_select on public.inventory_lots;
create policy inventory_lots_select on public.inventory_lots for select to authenticated
  using (
    tenant_id = (select public.current_tenant_id())
    and (
      (select public.has_module_access('kho'))
      or (select public.has_module_access('san-xuat'))
      or (select public.has_module_access('kinh-doanh'))
      or (select public.has_module_access('thiet-bi'))
    )
  );

drop policy if exists stock_quants_select on public.stock_quants;
create policy stock_quants_select on public.stock_quants for select to authenticated
  using (
    tenant_id = (select public.current_tenant_id())
    and (
      (select public.has_module_access('kho'))
      or (select public.has_module_access('kinh-doanh'))
      or (select public.has_module_access('san-xuat'))
      or (select public.has_module_access('thiet-bi'))
    )
  );

-- warehouse_locations: allow thiet-bi read (needed for default bin)
drop policy if exists warehouse_locations_select on public.warehouse_locations;
create policy warehouse_locations_select on public.warehouse_locations for select to authenticated
  using (
    tenant_id = (select public.current_tenant_id())
    and (
      (select public.has_module_access('kho'))
      or (select public.has_module_access('san-xuat'))
      or (select public.has_module_access('thiet-bi'))
      or (select public.has_module_access('kinh-doanh'))
    )
  );

comment on table public.eam_maintenance_part_lines is 'TB2: phụ tùng kế hoạch/đã xuất trên lệnh bảo trì';
