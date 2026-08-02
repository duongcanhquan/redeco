-- ============================================================
-- Accounting KT1 + ADR-011 composable capabilities
-- Spec: docs/superpowers/specs/2026-08-02-composable-modules-kt1-design.md
-- ============================================================

-- 1. Namespace accounting
alter table public.tenant_settings
  drop constraint if exists tenant_settings_namespace_check;

alter table public.tenant_settings
  add constraint tenant_settings_namespace_check
  check (namespace in (
    'ai', 'sales', 'integrations', 'notifications', 'company',
    'inventory', 'production', 'accounting'
  ));

comment on table public.tenant_settings is
  'Cài đặt tenant. Namespace gồm accounting (ADR-010/011 capabilities).';

-- 2. AR mirrors
create table public.ar_invoices (
  id                   uuid primary key default gen_random_uuid(),
  tenant_id            uuid not null references public.tenants (id),
  source_invoice_id    uuid not null,
  customer_id          uuid not null references public.customers (id),
  code                 text not null,
  amount               numeric(18,2) not null check (amount >= 0),
  status               text not null default 'open'
                       check (status in ('open', 'partial', 'paid', 'void')),
  issued_on            date not null default (timezone('utc', now()))::date,
  due_on               date not null,
  attributes           jsonb not null default '{}'::jsonb,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  unique (tenant_id, source_invoice_id),
  unique (tenant_id, code)
);

create index idx_ar_invoices_tenant on public.ar_invoices (tenant_id, status, due_on);
create index idx_ar_invoices_customer on public.ar_invoices (tenant_id, customer_id);
create trigger trg_ar_invoices_updated_at
  before update on public.ar_invoices
  for each row execute function public.set_updated_at();

create table public.cash_receipts (
  id               uuid primary key default gen_random_uuid(),
  tenant_id        uuid not null references public.tenants (id),
  ar_invoice_id    uuid not null references public.ar_invoices (id),
  amount           numeric(18,2) not null check (amount > 0),
  received_on      date not null default (timezone('utc', now()))::date,
  method           text not null default 'transfer'
                   check (method in ('transfer', 'cash', 'other')),
  source_outbox_id uuid,
  attributes       jsonb not null default '{}'::jsonb,
  created_at       timestamptz not null default now()
);

create index idx_cash_receipts_tenant on public.cash_receipts (tenant_id, ar_invoice_id);

-- 3. COGS / valuation (optional capability)
create table public.inventory_valuation_entries (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null references public.tenants (id),
  source_type   text not null check (source_type in ('inventory_txn', 'production_receipt')),
  source_id     uuid not null,
  item_id       uuid references public.inventory_items (id),
  qty           numeric(15,3) not null,
  unit_cost     numeric(18,4) not null default 0,
  amount        numeric(18,2) not null default 0,
  posted_at     timestamptz not null default now(),
  attributes    jsonb not null default '{}'::jsonb,
  unique (tenant_id, source_type, source_id, item_id)
);

create index idx_inv_val_tenant on public.inventory_valuation_entries (tenant_id, posted_at desc);

-- 4. RLS
alter table public.ar_invoices enable row level security;
alter table public.cash_receipts enable row level security;
alter table public.inventory_valuation_entries enable row level security;

create policy ar_invoices_all on public.ar_invoices for all to authenticated
  using (
    tenant_id = (select public.current_tenant_id())
    and (select public.has_module_access('ke-toan'))
  )
  with check (
    tenant_id = (select public.current_tenant_id())
    and (select public.has_module_access('ke-toan'))
  );

create policy cash_receipts_all on public.cash_receipts for all to authenticated
  using (
    tenant_id = (select public.current_tenant_id())
    and (select public.has_module_access('ke-toan'))
  )
  with check (
    tenant_id = (select public.current_tenant_id())
    and (select public.has_module_access('ke-toan'))
  );

create policy inv_val_all on public.inventory_valuation_entries for all to authenticated
  using (
    tenant_id = (select public.current_tenant_id())
    and (select public.has_module_access('ke-toan'))
  )
  with check (
    tenant_id = (select public.current_tenant_id())
    and (select public.has_module_access('ke-toan'))
  );

-- Sales đọc AR tuổi nợ trên CRM (optional) — chỉ SELECT
create policy ar_invoices_sales_select on public.ar_invoices for select to authenticated
  using (
    tenant_id = (select public.current_tenant_id())
    and (select public.has_module_access('kinh-doanh'))
  );

-- 5. Outbox: KT đọc + đánh dấu published (ADR-011 adapter)
create policy sales_outbox_accounting_select on public.sales_outbox for select to authenticated
  using (
    tenant_id = (select public.current_tenant_id())
    and (select public.has_module_access('ke-toan'))
  );

create policy sales_outbox_accounting_update on public.sales_outbox for update to authenticated
  using (
    tenant_id = (select public.current_tenant_id())
    and (select public.has_module_access('ke-toan'))
  )
  with check (
    tenant_id = (select public.current_tenant_id())
    and (select public.has_module_access('ke-toan'))
  );

-- Đọc invoices Sales để đồng bộ (khi payload thiếu)
create policy invoices_accounting_select on public.invoices for select to authenticated
  using (
    tenant_id = (select public.current_tenant_id())
    and (select public.has_module_access('ke-toan'))
  );

create policy customers_accounting_select on public.customers for select to authenticated
  using (
    tenant_id = (select public.current_tenant_id())
    and (select public.has_module_access('ke-toan'))
  );

-- Phiếu kho cho COGS (khi cogs_enabled)
create policy inventory_tx_accounting_select on public.inventory_transactions for select to authenticated
  using (
    tenant_id = (select public.current_tenant_id())
    and (select public.has_module_access('ke-toan'))
  );

create policy inventory_tx_lines_accounting_select on public.inventory_transaction_lines for select to authenticated
  using (
    tenant_id = (select public.current_tenant_id())
    and (select public.has_module_access('ke-toan'))
  );

create policy inventory_items_accounting_select on public.inventory_items for select to authenticated
  using (
    tenant_id = (select public.current_tenant_id())
    and (select public.has_module_access('ke-toan'))
  );

comment on table public.ar_invoices is
  'KT1 AR mirror từ Sales. Capability accounting.ar_enabled (ADR-011).';
