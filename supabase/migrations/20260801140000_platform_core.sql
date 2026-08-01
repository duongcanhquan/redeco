-- ============================================================
-- Migration 0002: Platform Core
-- Danh mục module dạng cây, hợp đồng + entitlements (subtree),
-- phân công module cho nhân sự, superadmin, tham số hệ thống.
-- Spec: docs/specs/2026-08-01-platform-core-design.md (ADR-008)
-- ============================================================

-- ------------------------------------------------------------
-- 1. Helper: nhận diện superadmin từ JWT app_metadata
-- ------------------------------------------------------------

create or replace function public.is_platform_admin()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select coalesce(
    (((select auth.jwt()) -> 'app_metadata') ->> 'is_platform_admin')::boolean,
    false
  )
$$;

comment on function public.is_platform_admin() is
  'True nếu JWT có app_metadata.is_platform_admin = true (superadmin nền tảng).';

-- ------------------------------------------------------------
-- 2. platform_admins — danh sách superadmin (nguồn sự thật)
-- ------------------------------------------------------------

create table public.platform_admins (
  id          uuid primary key references auth.users (id) on delete cascade,
  full_name   text,
  created_at  timestamptz not null default now()
);

comment on table public.platform_admins is
  'Superadmin nền tảng. Ghi qua service role; claim is_platform_admin gán vào app_metadata khi tạo.';

alter table public.platform_admins enable row level security;

create policy platform_admins_select
  on public.platform_admins
  for select
  to authenticated
  using (public.is_platform_admin());

-- ------------------------------------------------------------
-- 3. modules — danh mục module dạng CÂY (ADR-008)
-- ------------------------------------------------------------

create table public.modules (
  id          uuid primary key default gen_random_uuid(),
  parent_id   uuid references public.modules (id) on delete cascade,
  key         text not null unique
              check (key ~ '^[a-z0-9]+(-[a-z0-9]+)*(\.[a-z0-9]+(-[a-z0-9]+)*)*$'),
  name        text not null,
  description text,
  kind        text not null default 'module' check (kind in ('module', 'feature')),
  sort_order  int  not null default 0,
  is_active   boolean not null default true,
  attributes  jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table public.modules is
  'Danh mục module dạng cây: module -> module con/phần -> tính năng. key = dotted-path duy nhất.';

create index idx_modules_parent on public.modules (parent_id);

create trigger trg_modules_updated_at
  before update on public.modules
  for each row execute function public.set_updated_at();

alter table public.modules enable row level security;

-- Catalog: mọi user đăng nhập đọc được node active; superadmin thấy tất cả
create policy modules_select
  on public.modules
  for select
  to authenticated
  using (is_active or public.is_platform_admin());

create policy modules_write
  on public.modules
  for all
  to authenticated
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

-- ------------------------------------------------------------
-- 4. contracts — hợp đồng theo công ty
-- ------------------------------------------------------------

create table public.contracts (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references public.tenants (id),
  code        text not null unique,
  status      text not null default 'draft'
              check (status in ('draft', 'active', 'suspended', 'terminated')),
  starts_on   date not null,
  ends_on     date not null,
  seats       int  not null check (seats > 0),
  notes       text,
  attributes  jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  check (ends_on >= starts_on)
);

comment on table public.contracts is
  'Hợp đồng: thời hạn, seats, trạng thái. Module mua nằm ở contract_entitlements.';

create index idx_contracts_tenant_id on public.contracts (tenant_id, ends_on);

create trigger trg_contracts_updated_at
  before update on public.contracts
  for each row execute function public.set_updated_at();

alter table public.contracts enable row level security;

create policy contracts_platform_all
  on public.contracts
  for all
  to authenticated
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

-- Thành viên công ty đọc được hợp đồng công ty mình (hiện banner hết hạn, seats...)
create policy contracts_tenant_select
  on public.contracts
  for select
  to authenticated
  using (tenant_id = public.current_tenant_id());

-- ------------------------------------------------------------
-- 5. contract_entitlements — hợp đồng mua node module nào
--    Ngữ nghĩa SUBTREE: cấp node = được toàn bộ nhánh con.
-- ------------------------------------------------------------

create table public.contract_entitlements (
  id          uuid primary key default gen_random_uuid(),
  contract_id uuid not null references public.contracts (id) on delete cascade,
  module_id   uuid not null references public.modules (id) on delete cascade,
  created_at  timestamptz not null default now(),
  unique (contract_id, module_id)
);

comment on table public.contract_entitlements is
  'Node module trong hợp đồng. Cấp node nào được cả subtree của node đó (ADR-008).';

create index idx_contract_entitlements_contract on public.contract_entitlements (contract_id);

alter table public.contract_entitlements enable row level security;

create policy contract_entitlements_platform_all
  on public.contract_entitlements
  for all
  to authenticated
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

create policy contract_entitlements_tenant_select
  on public.contract_entitlements
  for select
  to authenticated
  using (
    exists (
      select 1 from public.contracts c
      where c.id = contract_id
        and c.tenant_id = public.current_tenant_id()
    )
  );

-- ------------------------------------------------------------
-- 6. user_module_assignments — admin công ty phân công module
-- ------------------------------------------------------------

create table public.user_module_assignments (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null references public.tenants (id),
  user_id       uuid not null references public.user_profiles (id) on delete cascade,
  module_id     uuid not null references public.modules (id) on delete cascade,
  access_level  text not null default 'view' check (access_level in ('view', 'edit', 'manage')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (user_id, module_id)
);

comment on table public.user_module_assignments is
  'Phân công module cho nhân sự (ngữ nghĩa subtree). Việc node có thuộc hợp đồng không được validate ở Service layer.';

create index idx_uma_tenant_id on public.user_module_assignments (tenant_id, user_id);

create trigger trg_uma_updated_at
  before update on public.user_module_assignments
  for each row execute function public.set_updated_at();

alter table public.user_module_assignments enable row level security;

create policy uma_tenant_select
  on public.user_module_assignments
  for select
  to authenticated
  using (tenant_id = public.current_tenant_id());

-- Chỉ owner/admin của tenant được ghi, và chỉ ghi cho user thuộc tenant mình
create policy uma_admin_insert
  on public.user_module_assignments
  for insert
  to authenticated
  with check (
    tenant_id = public.current_tenant_id()
    and exists (
      select 1 from public.user_profiles me
      where me.id = (select auth.uid()) and me.role in ('owner', 'admin')
    )
    and exists (
      select 1 from public.user_profiles target
      where target.id = user_id and target.tenant_id = public.current_tenant_id()
    )
  );

create policy uma_admin_update
  on public.user_module_assignments
  for update
  to authenticated
  using (
    tenant_id = public.current_tenant_id()
    and exists (
      select 1 from public.user_profiles me
      where me.id = (select auth.uid()) and me.role in ('owner', 'admin')
    )
  )
  with check (tenant_id = public.current_tenant_id());

create policy uma_admin_delete
  on public.user_module_assignments
  for delete
  to authenticated
  using (
    tenant_id = public.current_tenant_id()
    and exists (
      select 1 from public.user_profiles me
      where me.id = (select auth.uid()) and me.role in ('owner', 'admin')
    )
  );

-- ------------------------------------------------------------
-- 7. platform_settings — tham số hệ thống (superadmin đổi được)
-- ------------------------------------------------------------

create table public.platform_settings (
  key         text primary key,
  value       jsonb not null,
  description text,
  updated_at  timestamptz not null default now()
);

comment on table public.platform_settings is
  'Tham số hệ thống dạng key-value (ví dụ mốc ngày nhắc hạn hợp đồng).';

create trigger trg_platform_settings_updated_at
  before update on public.platform_settings
  for each row execute function public.set_updated_at();

alter table public.platform_settings enable row level security;

create policy platform_settings_platform_all
  on public.platform_settings
  for all
  to authenticated
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

-- Mặc định: mốc nhắc hạn hợp đồng
insert into public.platform_settings (key, value, description) values
  ('contract_reminder_days', '[30, 14, 7]'::jsonb, 'Các mốc ngày nhắc trước khi hợp đồng hết hạn');

-- ------------------------------------------------------------
-- 8. Hàm quyền dùng chung (RLS + API + UI menu)
-- ------------------------------------------------------------

-- Toàn bộ module_id một công ty được dùng (hợp đồng active + còn hạn, mở rộng subtree)
create or replace function public.tenant_entitled_module_ids(p_tenant_id uuid)
returns setof uuid
language sql
stable
security invoker
set search_path = ''
as $$
  with recursive granted (module_id) as (
    select e.module_id
    from public.contract_entitlements e
    join public.contracts c on c.id = e.contract_id
    where c.tenant_id = p_tenant_id
      and c.status = 'active'
      and current_date between c.starts_on and c.ends_on
    union
    select m.id
    from public.modules m
    join granted g on m.parent_id = g.module_id
    where m.is_active
  )
  select distinct module_id from granted
$$;

comment on function public.tenant_entitled_module_ids(uuid) is
  'Module công ty được dùng theo hợp đồng hiệu lực, đã mở rộng subtree (ADR-008).';

-- Module user hiện tại được thấy:
-- owner/admin của công ty = toàn bộ entitled; member = entitled ∩ assigned (subtree)
create or replace function public.my_module_ids()
returns setof uuid
language sql
stable
security invoker
set search_path = ''
as $$
  select e.module_id
  from public.tenant_entitled_module_ids(public.current_tenant_id()) as e (module_id)
  where exists (
      select 1 from public.user_profiles me
      where me.id = (select auth.uid()) and me.role in ('owner', 'admin')
    )
    or e.module_id in (
      with recursive assigned (module_id) as (
        select uma.module_id
        from public.user_module_assignments uma
        where uma.user_id = (select auth.uid())
        union
        select m.id
        from public.modules m
        join assigned a on m.parent_id = a.module_id
        where m.is_active
      )
      select module_id from assigned
    )
$$;

comment on function public.my_module_ids() is
  'Module user hiện tại thấy: 3 điều kiện (hợp đồng hiệu lực ∧ có trong hợp đồng ∧ được phân công; admin công ty bỏ qua điều kiện phân công).';
