-- ============================================================
-- Migration 0001: Multi-tenant Foundation
-- Bảng tenants + user_profiles, RLS isolation, helper current_tenant_id()
-- Quy ước: tenant_id của user được lưu trong auth.users.raw_app_meta_data
-- ('app_metadata' trong JWT) — client KHÔNG thể tự sửa app_metadata.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Helper functions
-- ------------------------------------------------------------

-- Lấy tenant_id của user hiện tại từ JWT (app_metadata.tenant_id).
-- Trả về NULL nếu chưa đăng nhập hoặc chưa gán tenant → mọi RLS policy sẽ chặn.
create or replace function public.current_tenant_id()
returns uuid
language sql
stable
security invoker
set search_path = ''
as $$
  select nullif(
    ((select auth.jwt()) -> 'app_metadata') ->> 'tenant_id',
    ''
  )::uuid
$$;

comment on function public.current_tenant_id() is
  'Tenant hiện tại từ JWT app_metadata.tenant_id. Dùng trong mọi RLS policy.';

-- Trigger tự cập nhật updated_at
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ------------------------------------------------------------
-- 2. Bảng tenants
-- ------------------------------------------------------------

create table public.tenants (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  status      text not null default 'active' check (status in ('active', 'suspended')),
  attributes  jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table public.tenants is 'Danh sách tenant (khách hàng SaaS). Quản trị qua service role.';

create trigger trg_tenants_updated_at
  before update on public.tenants
  for each row execute function public.set_updated_at();

alter table public.tenants enable row level security;

-- User chỉ đọc được tenant của chính mình. Tạo/sửa/xóa tenant là việc của
-- service role (onboarding/admin flow) — service role bypass RLS.
create policy tenants_select_own
  on public.tenants
  for select
  to authenticated
  using (id = public.current_tenant_id());

-- ------------------------------------------------------------
-- 3. Bảng user_profiles (1-1 với auth.users, gắn user vào tenant)
-- ------------------------------------------------------------

create table public.user_profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  tenant_id   uuid not null references public.tenants (id),
  full_name   text,
  role        text not null default 'member' check (role in ('owner', 'admin', 'member')),
  attributes  jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table public.user_profiles is 'Hồ sơ người dùng trong tenant. id = auth.users.id.';

-- Index bắt buộc theo database.mdc: bắt đầu bằng tenant_id
create index idx_user_profiles_tenant_id on public.user_profiles (tenant_id);
create index idx_user_profiles_attributes on public.user_profiles using gin (attributes jsonb_path_ops);

create trigger trg_user_profiles_updated_at
  before update on public.user_profiles
  for each row execute function public.set_updated_at();

alter table public.user_profiles enable row level security;

-- Đọc: mọi thành viên cùng tenant thấy nhau
create policy user_profiles_select_same_tenant
  on public.user_profiles
  for select
  to authenticated
  using (tenant_id = public.current_tenant_id());

-- Sửa: chỉ sửa hồ sơ của chính mình, và không thể đổi sang tenant khác
create policy user_profiles_update_self
  on public.user_profiles
  for update
  to authenticated
  using (id = (select auth.uid()))
  with check (
    id = (select auth.uid())
    and tenant_id = public.current_tenant_id()
  );

-- Insert/Delete hồ sơ do service role thực hiện trong luồng onboarding
-- (gán tenant_id vào app_metadata cùng lúc) — không mở cho authenticated.
