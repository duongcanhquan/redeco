-- ============================================================
-- Migration 0004: Module Kinh doanh — Phase 1 (Order-to-Cash)
-- Blueprint: docs/blueprints/2026-08-01-sales-module-blueprint.md
-- customers, products(+stock), quotations, sales_orders,
-- delivery_notes, invoices. RLS = tenant isolation + quyền module.
-- ============================================================

-- ------------------------------------------------------------
-- 0. Helper: user hiện tại có quyền dùng module (theo key)?
--    Dựa my_module_ids() => đã gồm: hợp đồng hiệu lực + phân công.
-- ------------------------------------------------------------

create or replace function public.has_module_access(p_key text)
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select exists (
    select 1
    from public.modules m
    where m.key = p_key
      and m.id in (select public.my_module_ids())
  )
$$;

comment on function public.has_module_access(text) is
  'True nếu user hiện tại được dùng module theo key (hợp đồng hiệu lực + phân công, ngữ nghĩa subtree).';

-- ------------------------------------------------------------
-- 1. products + product_stock (chủ quyền tương lai: module Kho)
-- ------------------------------------------------------------

create table public.products (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references public.tenants (id),
  sku         text not null,
  name        text not null,
  uom         text not null default 'cái',
  base_price  numeric(18,2) not null default 0 check (base_price >= 0),
  is_active   boolean not null default true,
  attributes  jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (tenant_id, sku)
);

create index idx_products_tenant on public.products (tenant_id, is_active);
create index idx_products_attributes on public.products using gin (attributes jsonb_path_ops);

create trigger trg_products_updated_at
  before update on public.products
  for each row execute function public.set_updated_at();

create table public.product_stock (
  product_id   uuid primary key references public.products (id) on delete cascade,
  tenant_id    uuid not null references public.tenants (id),
  qty_on_hand  numeric(15,3) not null default 0 check (qty_on_hand >= 0),
  updated_at   timestamptz not null default now()
);

create index idx_product_stock_tenant on public.product_stock (tenant_id);

create trigger trg_product_stock_updated_at
  before update on public.product_stock
  for each row execute function public.set_updated_at();

-- ------------------------------------------------------------
-- 2. customers — CRM cơ bản
-- ------------------------------------------------------------

create table public.customers (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null references public.tenants (id),
  code          text not null,
  name          text not null,
  kind          text not null default 'b2b' check (kind in ('b2b', 'b2c', 'dai-ly')),
  tax_code      text,
  credit_limit  numeric(18,2) check (credit_limit >= 0),
  status        text not null default 'active' check (status in ('active', 'inactive')),
  attributes    jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (tenant_id, code)
);

comment on table public.customers is
  'Khách hàng/đối tác. Công nợ = tổng invoices unpaid (derived). credit_limit null = không giới hạn.';

create index idx_customers_tenant on public.customers (tenant_id, status);
create index idx_customers_attributes on public.customers using gin (attributes jsonb_path_ops);

create trigger trg_customers_updated_at
  before update on public.customers
  for each row execute function public.set_updated_at();

-- ------------------------------------------------------------
-- 3. quotations + quotation_items — báo giá
-- ------------------------------------------------------------

create table public.quotations (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null references public.tenants (id),
  code          text not null,
  customer_id   uuid not null references public.customers (id),
  status        text not null default 'draft'
                check (status in ('draft', 'sent', 'approved', 'rejected', 'converted')),
  valid_until   date,
  discount_pct  numeric(5,2) not null default 0 check (discount_pct between 0 and 100),
  total         numeric(18,2) not null default 0,
  notes         text,
  attributes    jsonb not null default '{}'::jsonb,
  created_by    uuid references public.user_profiles (id),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (tenant_id, code)
);

create index idx_quotations_tenant on public.quotations (tenant_id, status);

create trigger trg_quotations_updated_at
  before update on public.quotations
  for each row execute function public.set_updated_at();

create table public.quotation_items (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null references public.tenants (id),
  quotation_id  uuid not null references public.quotations (id) on delete cascade,
  product_id    uuid not null references public.products (id),
  product_name  text not null,
  qty           numeric(15,3) not null check (qty > 0),
  unit_price    numeric(18,2) not null check (unit_price >= 0),
  discount_pct  numeric(5,2) not null default 0 check (discount_pct between 0 and 100),
  line_total    numeric(18,2) not null default 0,
  sort_order    int not null default 0
);

create index idx_quotation_items_tenant on public.quotation_items (tenant_id, quotation_id);

-- ------------------------------------------------------------
-- 4. sales_orders + sales_order_items — đơn đặt hàng
-- ------------------------------------------------------------

create table public.sales_orders (
  id                      uuid primary key default gen_random_uuid(),
  tenant_id               uuid not null references public.tenants (id),
  code                    text not null,
  customer_id             uuid not null references public.customers (id),
  quotation_id            uuid references public.quotations (id),
  status                  text not null default 'draft'
                          check (status in ('draft', 'confirmed', 'delivering', 'completed', 'cancelled')),
  expected_delivery_date  date,
  discount_pct            numeric(5,2) not null default 0 check (discount_pct between 0 and 100),
  total                   numeric(18,2) not null default 0,
  credit_check            jsonb not null default '{}'::jsonb,
  notes                   text,
  attributes              jsonb not null default '{}'::jsonb,
  created_by              uuid references public.user_profiles (id),
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  unique (tenant_id, code)
);

comment on column public.sales_orders.credit_check is
  'Snapshot kiểm tra tín dụng lúc xác nhận: {passed, outstanding, order_total, credit_limit}.';

create index idx_sales_orders_tenant on public.sales_orders (tenant_id, status);
create index idx_sales_orders_customer on public.sales_orders (tenant_id, customer_id);

create trigger trg_sales_orders_updated_at
  before update on public.sales_orders
  for each row execute function public.set_updated_at();

create table public.sales_order_items (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid not null references public.tenants (id),
  sales_order_id  uuid not null references public.sales_orders (id) on delete cascade,
  product_id      uuid not null references public.products (id),
  product_name    text not null,
  qty             numeric(15,3) not null check (qty > 0),
  unit_price      numeric(18,2) not null check (unit_price >= 0),
  discount_pct    numeric(5,2) not null default 0 check (discount_pct between 0 and 100),
  line_total      numeric(18,2) not null default 0,
  atp_qty         numeric(15,3),
  sort_order      int not null default 0
);

comment on column public.sales_order_items.atp_qty is
  'Snapshot tồn kho khả dụng (ATP) tại thời điểm xác nhận đơn.';

create index idx_so_items_tenant on public.sales_order_items (tenant_id, sales_order_id);

-- ------------------------------------------------------------
-- 5. delivery_notes — lệnh giao hàng
-- ------------------------------------------------------------

create table public.delivery_notes (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid not null references public.tenants (id),
  code            text not null,
  sales_order_id  uuid not null references public.sales_orders (id),
  status          text not null default 'pending' check (status in ('pending', 'shipped')),
  shipped_at      timestamptz,
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (tenant_id, code)
);

create index idx_delivery_notes_tenant on public.delivery_notes (tenant_id, status);

create trigger trg_delivery_notes_updated_at
  before update on public.delivery_notes
  for each row execute function public.set_updated_at();

-- ------------------------------------------------------------
-- 6. invoices — hóa đơn (công nợ = tổng unpaid)
-- ------------------------------------------------------------

create table public.invoices (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid not null references public.tenants (id),
  code            text not null,
  sales_order_id  uuid not null references public.sales_orders (id),
  customer_id     uuid not null references public.customers (id),
  total           numeric(18,2) not null default 0,
  status          text not null default 'unpaid' check (status in ('unpaid', 'paid')),
  issued_on       date not null default current_date,
  paid_at         timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (tenant_id, code)
);

create index idx_invoices_tenant on public.invoices (tenant_id, status);
create index idx_invoices_customer on public.invoices (tenant_id, customer_id, status);

create trigger trg_invoices_updated_at
  before update on public.invoices
  for each row execute function public.set_updated_at();

-- ------------------------------------------------------------
-- 7. RLS: tenant isolation + quyền module kinh-doanh
-- ------------------------------------------------------------

alter table public.products enable row level security;
alter table public.product_stock enable row level security;
alter table public.customers enable row level security;
alter table public.quotations enable row level security;
alter table public.quotation_items enable row level security;
alter table public.sales_orders enable row level security;
alter table public.sales_order_items enable row level security;
alter table public.delivery_notes enable row level security;
alter table public.invoices enable row level security;

create policy products_tenant_all on public.products
  for all to authenticated
  using (tenant_id = public.current_tenant_id() and public.has_module_access('kinh-doanh'))
  with check (tenant_id = public.current_tenant_id() and public.has_module_access('kinh-doanh'));

create policy product_stock_tenant_all on public.product_stock
  for all to authenticated
  using (tenant_id = public.current_tenant_id() and public.has_module_access('kinh-doanh'))
  with check (tenant_id = public.current_tenant_id() and public.has_module_access('kinh-doanh'));

create policy customers_tenant_all on public.customers
  for all to authenticated
  using (tenant_id = public.current_tenant_id() and public.has_module_access('kinh-doanh'))
  with check (tenant_id = public.current_tenant_id() and public.has_module_access('kinh-doanh'));

create policy quotations_tenant_all on public.quotations
  for all to authenticated
  using (tenant_id = public.current_tenant_id() and public.has_module_access('kinh-doanh'))
  with check (tenant_id = public.current_tenant_id() and public.has_module_access('kinh-doanh'));

create policy quotation_items_tenant_all on public.quotation_items
  for all to authenticated
  using (tenant_id = public.current_tenant_id() and public.has_module_access('kinh-doanh'))
  with check (tenant_id = public.current_tenant_id() and public.has_module_access('kinh-doanh'));

create policy sales_orders_tenant_all on public.sales_orders
  for all to authenticated
  using (tenant_id = public.current_tenant_id() and public.has_module_access('kinh-doanh'))
  with check (tenant_id = public.current_tenant_id() and public.has_module_access('kinh-doanh'));

create policy sales_order_items_tenant_all on public.sales_order_items
  for all to authenticated
  using (tenant_id = public.current_tenant_id() and public.has_module_access('kinh-doanh'))
  with check (tenant_id = public.current_tenant_id() and public.has_module_access('kinh-doanh'));

create policy delivery_notes_tenant_all on public.delivery_notes
  for all to authenticated
  using (tenant_id = public.current_tenant_id() and public.has_module_access('kinh-doanh'))
  with check (tenant_id = public.current_tenant_id() and public.has_module_access('kinh-doanh'));

create policy invoices_tenant_all on public.invoices
  for all to authenticated
  using (tenant_id = public.current_tenant_id() and public.has_module_access('kinh-doanh'))
  with check (tenant_id = public.current_tenant_id() and public.has_module_access('kinh-doanh'));

-- ------------------------------------------------------------
-- 8. Xuất kho an toàn: trừ tồn không âm trong 1 câu lệnh
-- ------------------------------------------------------------

create or replace function public.decrement_stock(p_product_id uuid, p_qty numeric)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  updated int;
begin
  update public.product_stock
  set qty_on_hand = qty_on_hand - p_qty
  where product_id = p_product_id
    and qty_on_hand >= p_qty;
  get diagnostics updated = row_count;
  return updated > 0;
end;
$$;

comment on function public.decrement_stock(uuid, numeric) is
  'Trừ tồn kho nguyên tử, trả false nếu không đủ tồn. Chạy dưới RLS của user (security invoker).';
