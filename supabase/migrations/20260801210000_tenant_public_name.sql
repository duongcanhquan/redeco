-- Trang đăng nhập riêng của công ty (/{slug}/login) cần hiển thị tên công ty
-- cho khách chưa đăng nhập. RPC security definer chỉ lộ đúng TÊN của tenant
-- đang active theo slug — không lộ thêm bất kỳ dữ liệu nào khác.

create or replace function public.tenant_public_name(p_slug text)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select name
  from public.tenants
  where slug = p_slug
    and status = 'active'
  limit 1
$$;

revoke all on function public.tenant_public_name(text) from public;
grant execute on function public.tenant_public_name(text) to anon, authenticated;
