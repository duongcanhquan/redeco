-- ============================================================
-- Migration 0003: Superadmin đọc/ghi tenants + user_profiles
-- Migration 0001 chỉ cho user xem tenant của mình; superadmin
-- (JWT is_platform_admin) cần quản trị toàn bộ công ty và hồ sơ.
-- Ghi chú: các mutation tạo công ty/user vẫn đi qua service role
-- (Server Actions), policy này chủ yếu phục vụ ĐỌC ở console.
-- ============================================================

create policy tenants_platform_all
  on public.tenants
  for all
  to authenticated
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

create policy user_profiles_platform_all
  on public.user_profiles
  for all
  to authenticated
  using (public.is_platform_admin())
  with check (public.is_platform_admin());
