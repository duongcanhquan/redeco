-- ============================================================
-- Migration 0006: Tối ưu hiệu năng RLS (InitPlan pattern)
-- Vấn đề: policy gọi hàm trực tiếp (current_tenant_id(),
-- has_module_access(), is_platform_admin()) => Postgres đánh giá
-- LẠI TỪNG DÒNG. has_module_access chạy 2 recursive CTE nên các
-- bảng sales chậm rõ khi dữ liệu tăng.
-- Cách sửa chuẩn (Supabase docs): bọc hàm trong (select ...) để
-- planner đưa vào InitPlan — tính đúng 1 lần mỗi câu lệnh.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Các bảng module Kinh doanh (nặng nhất: has_module_access)
-- ------------------------------------------------------------

do $$
declare
  t text;
begin
  foreach t in array array[
    'products', 'product_stock', 'customers',
    'quotations', 'quotation_items',
    'sales_orders', 'sales_order_items',
    'delivery_notes', 'invoices'
  ]
  loop
    execute format(
      $f$alter policy %1$I on public.%2$I
        using (
          tenant_id = (select public.current_tenant_id())
          and (select public.has_module_access('kinh-doanh'))
        )
        with check (
          tenant_id = (select public.current_tenant_id())
          and (select public.has_module_access('kinh-doanh'))
        )$f$,
      t || '_tenant_all', t
    );
  end loop;
end $$;

-- ------------------------------------------------------------
-- 2. Nền tảng: tenants, user_profiles
-- ------------------------------------------------------------

alter policy tenants_select_own on public.tenants
  using (id = (select public.current_tenant_id()));

alter policy tenants_platform_all on public.tenants
  using ((select public.is_platform_admin()))
  with check ((select public.is_platform_admin()));

alter policy user_profiles_select_same_tenant on public.user_profiles
  using (tenant_id = (select public.current_tenant_id()));

alter policy user_profiles_update_self on public.user_profiles
  using (id = (select auth.uid()))
  with check (
    id = (select auth.uid())
    and tenant_id = (select public.current_tenant_id())
  );

alter policy user_profiles_platform_all on public.user_profiles
  using ((select public.is_platform_admin()))
  with check ((select public.is_platform_admin()));

-- ------------------------------------------------------------
-- 3. Platform core: modules, contracts, entitlements, uma, settings
-- ------------------------------------------------------------

alter policy platform_admins_select on public.platform_admins
  using ((select public.is_platform_admin()));

alter policy modules_select on public.modules
  using (is_active or (select public.is_platform_admin()));

alter policy modules_write on public.modules
  using ((select public.is_platform_admin()))
  with check ((select public.is_platform_admin()));

alter policy contracts_platform_all on public.contracts
  using ((select public.is_platform_admin()))
  with check ((select public.is_platform_admin()));

alter policy contracts_tenant_select on public.contracts
  using (tenant_id = (select public.current_tenant_id()));

alter policy contract_entitlements_platform_all on public.contract_entitlements
  using ((select public.is_platform_admin()))
  with check ((select public.is_platform_admin()));

alter policy contract_entitlements_tenant_select on public.contract_entitlements
  using (
    exists (
      select 1 from public.contracts c
      where c.id = contract_id
        and c.tenant_id = (select public.current_tenant_id())
    )
  );

alter policy uma_tenant_select on public.user_module_assignments
  using (tenant_id = (select public.current_tenant_id()));

alter policy uma_admin_insert on public.user_module_assignments
  with check (
    tenant_id = (select public.current_tenant_id())
    and exists (
      select 1 from public.user_profiles me
      where me.id = (select auth.uid()) and me.role in ('owner', 'admin')
    )
    and exists (
      select 1 from public.user_profiles target
      where target.id = user_id
        and target.tenant_id = (select public.current_tenant_id())
    )
  );

alter policy uma_admin_update on public.user_module_assignments
  using (
    tenant_id = (select public.current_tenant_id())
    and exists (
      select 1 from public.user_profiles me
      where me.id = (select auth.uid()) and me.role in ('owner', 'admin')
    )
  )
  with check (tenant_id = (select public.current_tenant_id()));

alter policy uma_admin_delete on public.user_module_assignments
  using (
    tenant_id = (select public.current_tenant_id())
    and exists (
      select 1 from public.user_profiles me
      where me.id = (select auth.uid()) and me.role in ('owner', 'admin')
    )
  );

alter policy platform_settings_platform_all on public.platform_settings
  using ((select public.is_platform_admin()))
  with check ((select public.is_platform_admin()));
