-- Hub Kinh doanh.REDECO: migrate pack_key + entitlements; bảng profile tính + lần tính.

-- 1) Đổi pack_key dữ liệu RFQ sang key mới
update public.customiz_rfq_batches
  set pack_key = 'kinh-doanh.redeco'
  where pack_key = 'customiz.kinh-doanh.redeco-rfq';

update public.customiz_rfq_requests
  set pack_key = 'kinh-doanh.redeco'
  where pack_key = 'customiz.kinh-doanh.redeco-rfq';

update public.customiz_rfq_filter_profiles
  set pack_key = 'kinh-doanh.redeco'
  where pack_key = 'customiz.kinh-doanh.redeco-rfq';

-- 2) Entitlement: HĐ có node legacy → thêm kinh-doanh.redeco (nếu đã seed)
insert into public.contract_entitlements (contract_id, module_id)
select distinct e.contract_id, m_new.id
from public.contract_entitlements e
join public.modules m_old on m_old.id = e.module_id
join public.modules m_new on m_new.key = 'kinh-doanh.redeco'
where m_old.key in (
  'customiz.kinh-doanh.redeco-rfq',
  'customiz.kinh-doanh',
  'customiz'
)
on conflict do nothing;

-- 3) Profiles tính báo giá
create table public.redeco_quote_calc_profiles (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references public.tenants (id),
  pack_key    text not null default 'kinh-doanh.redeco',
  name        text not null,
  is_default  boolean not null default false,
  config      jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index idx_redeco_quote_calc_profiles_tenant
  on public.redeco_quote_calc_profiles (tenant_id, pack_key);

create trigger trg_redeco_quote_calc_profiles_updated_at
  before update on public.redeco_quote_calc_profiles
  for each row execute function public.set_updated_at();

alter table public.redeco_quote_calc_profiles enable row level security;

create policy redeco_quote_calc_profiles_all on public.redeco_quote_calc_profiles
  for all to authenticated
  using (tenant_id = public.current_tenant_id())
  with check (tenant_id = public.current_tenant_id());

-- 4) Lần tính / báo giá hub
create table public.redeco_quote_calculations (
  id               uuid primary key default gen_random_uuid(),
  tenant_id        uuid not null references public.tenants (id),
  pack_key         text not null default 'kinh-doanh.redeco',
  request_id       uuid not null references public.customiz_rfq_requests (id),
  profile_id       uuid references public.redeco_quote_calc_profiles (id) on delete set null,
  input_snapshot   jsonb not null default '{}'::jsonb,
  output_snapshot  jsonb not null default '{}'::jsonb,
  hub_status       text not null default 'pending'
                   check (hub_status in (
                     'pending', 'review', 'rejected', 'to_production', 'quoted'
                   )),
  quotation_id     uuid references public.quotations (id) on delete set null,
  calculated_at    timestamptz not null default now(),
  created_by       uuid references public.user_profiles (id),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  deleted_at       timestamptz
);

create index idx_redeco_quote_calculations_tenant_status
  on public.redeco_quote_calculations (tenant_id, pack_key, hub_status, calculated_at desc)
  where deleted_at is null;

create index idx_redeco_quote_calculations_request
  on public.redeco_quote_calculations (tenant_id, request_id)
  where deleted_at is null;

create index idx_redeco_quote_calculations_quotation
  on public.redeco_quote_calculations (tenant_id, quotation_id)
  where quotation_id is not null;

create trigger trg_redeco_quote_calculations_updated_at
  before update on public.redeco_quote_calculations
  for each row execute function public.set_updated_at();

alter table public.redeco_quote_calculations enable row level security;

create policy redeco_quote_calculations_all on public.redeco_quote_calculations
  for all to authenticated
  using (tenant_id = public.current_tenant_id())
  with check (tenant_id = public.current_tenant_id());

comment on table public.redeco_quote_calc_profiles is
  'Profile công thức tính BG hub Kinh doanh.REDECO';
comment on table public.redeco_quote_calculations is
  'Kết quả tính + trạng thái hub; quotation_id = BG Optimake sync';
