-- ============================================================
-- Migration 0005: has_module_access nhận cả node CON của module
-- Member được phân công module con (vd kinh-doanh.bao-gia) phải
-- truy cập được dữ liệu module cha (RLS các bảng sales gate theo
-- key gốc 'kinh-doanh'). Quy tắc: có BẤT KỲ node nào thuộc nhánh
-- p_key (chính nó hoặc con cháu, so theo dotted-path) = có quyền.
-- ============================================================

create or replace function public.has_module_access(p_key text)
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select exists (
    select 1
    from public.modules m
    where m.id in (select public.my_module_ids())
      and (m.key = p_key or m.key like p_key || '.%')
  )
$$;

comment on function public.has_module_access(text) is
  'True nếu user có quyền với module p_key: sở hữu chính node đó HOẶC bất kỳ node con nào trong nhánh (dotted-path).';
