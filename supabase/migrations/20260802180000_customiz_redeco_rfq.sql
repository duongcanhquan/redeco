-- ============================================================
-- Customiz · Kinh doanh · REDECO RFQ Phase 1
-- Spec: docs/superpowers/specs/2026-08-02-customiz-redeco-rfq-design.md
-- ============================================================

create table public.customiz_rfq_batches (
  id             uuid primary key default gen_random_uuid(),
  tenant_id      uuid not null references public.tenants (id),
  pack_key       text not null,
  file_name      text not null,
  row_total      int not null default 0 check (row_total >= 0),
  row_imported   int not null default 0 check (row_imported >= 0),
  row_duplicate  int not null default 0 check (row_duplicate >= 0),
  row_error      int not null default 0 check (row_error >= 0),
  attributes     jsonb not null default '{}'::jsonb,
  created_by     uuid references auth.users (id),
  created_at     timestamptz not null default now()
);

create index idx_customiz_rfq_batches_tenant
  on public.customiz_rfq_batches (tenant_id, pack_key, created_at desc);

create table public.customiz_rfq_requests (
  id                  uuid primary key default gen_random_uuid(),
  tenant_id           uuid not null references public.tenants (id),
  pack_key            text not null,
  batch_id            uuid references public.customiz_rfq_batches (id) on delete set null,
  external_quote_no   text not null,
  tags                text[] not null default '{}',
  attributes          jsonb not null default '{}'::jsonb,
  source_row          int,
  deleted_at          timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index idx_customiz_rfq_requests_tenant
  on public.customiz_rfq_requests (tenant_id, pack_key, created_at desc)
  where deleted_at is null;

create index idx_customiz_rfq_requests_quote_no
  on public.customiz_rfq_requests (tenant_id, pack_key, external_quote_no)
  where deleted_at is null;

create index idx_customiz_rfq_requests_tags
  on public.customiz_rfq_requests using gin (tags);

create trigger trg_customiz_rfq_requests_updated_at
  before update on public.customiz_rfq_requests
  for each row execute function public.set_updated_at();

alter table public.customiz_rfq_batches enable row level security;
alter table public.customiz_rfq_requests enable row level security;

-- Bất kỳ node dưới cây customiz đều đủ quyền đọc/ghi bảng (lọc pack ở service)
create policy customiz_rfq_batches_all on public.customiz_rfq_batches
  for all to authenticated
  using (
    tenant_id = public.current_tenant_id()
    and (select public.has_module_access('customiz'))
  )
  with check (
    tenant_id = public.current_tenant_id()
    and (select public.has_module_access('customiz'))
  );

create policy customiz_rfq_requests_all on public.customiz_rfq_requests
  for all to authenticated
  using (
    tenant_id = public.current_tenant_id()
    and (select public.has_module_access('customiz'))
  )
  with check (
    tenant_id = public.current_tenant_id()
    and (select public.has_module_access('customiz'))
  );

comment on table public.customiz_rfq_batches is
  'Customiz: mỗi lần upload Excel yêu cầu BG (pack_key phân biệt gói DN).';
comment on table public.customiz_rfq_requests is
  'Customiz: 1 dòng Excel = 1 yêu cầu; tags gồm trung; soft-delete.';
