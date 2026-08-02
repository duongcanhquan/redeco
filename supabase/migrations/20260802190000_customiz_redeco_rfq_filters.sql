-- ============================================================
-- Customiz REDECO RFQ Phase 2 — bộ lọc phân loại
-- Plan: docs/superpowers/plans/2026-08-02-customiz-redeco-rfq-phase2.md
-- ============================================================

create table public.customiz_rfq_filter_profiles (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references public.tenants (id),
  pack_key    text not null,
  name        text not null default 'Mặc định',
  is_active   boolean not null default true,
  rules       jsonb not null default '[]'::jsonb,
  attributes  jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (tenant_id, pack_key, name)
);

create index idx_customiz_rfq_filter_profiles_tenant
  on public.customiz_rfq_filter_profiles (tenant_id, pack_key)
  where is_active;

create trigger trg_customiz_rfq_filter_profiles_updated_at
  before update on public.customiz_rfq_filter_profiles
  for each row execute function public.set_updated_at();

alter table public.customiz_rfq_filter_profiles enable row level security;

create policy customiz_rfq_filter_profiles_all on public.customiz_rfq_filter_profiles
  for all to authenticated
  using (
    tenant_id = public.current_tenant_id()
    and (select public.has_module_access('customiz'))
  )
  with check (
    tenant_id = public.current_tenant_id()
    and (select public.has_module_access('customiz'))
  );

comment on table public.customiz_rfq_filter_profiles is
  'Customiz: profile bộ lọc RFQ (rules JSONB: if conditions → then classification tag).';
