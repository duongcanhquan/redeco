-- ============================================================
-- Tenant Settings Hub — cài đặt riêng từng khách hàng
-- Spec: docs/superpowers/specs/2026-08-02-tenant-settings-design.md
-- ============================================================

create table public.tenant_settings (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references public.tenants (id) on delete cascade,
  namespace   text not null check (namespace in (
                'ai', 'sales', 'integrations', 'notifications', 'company'
              )),
  key         text not null,
  value       jsonb not null default 'null'::jsonb,
  updated_by  uuid references public.user_profiles (id),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (tenant_id, namespace, key)
);

comment on table public.tenant_settings is
  'Cài đặt theo tenant. Namespace: ai | sales | integrations | notifications | company. Secret (api_key) chỉ lộ masked ở tầng service.';

create index idx_tenant_settings_tenant on public.tenant_settings (tenant_id, namespace);

create trigger trg_tenant_settings_updated_at
  before update on public.tenant_settings
  for each row execute function public.set_updated_at();

alter table public.tenant_settings enable row level security;

-- Đọc: mọi thành viên cùng tenant (UI overview có thể cần đọc flags không secret)
create policy tenant_settings_select on public.tenant_settings
  for select to authenticated
  using (tenant_id = (select public.current_tenant_id()));

-- Ghi: cùng tenant (service tầng app chặn member; RLS không đọc được role dễ)
create policy tenant_settings_write on public.tenant_settings
  for all to authenticated
  using (tenant_id = (select public.current_tenant_id()))
  with check (tenant_id = (select public.current_tenant_id()));
