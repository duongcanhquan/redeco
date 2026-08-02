-- ============================================================
-- AI ops security: rate-limit RPC, secret RLS, usage stats
-- ============================================================

-- 1) Rate limits + stats (SECURITY DEFINER — bypass row filter for tenant totals)
create or replace function public.ai_assert_rate_limits(p_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tenant uuid := public.current_tenant_id();
  v_user_hour int;
  v_tenant_day int;
  v_hour_ago timestamptz := now() - interval '1 hour';
  -- Ngày làm việc VN (UTC+7)
  v_day_start timestamptz := (date_trunc('day', now() at time zone 'Asia/Ho_Chi_Minh')
    at time zone 'Asia/Ho_Chi_Minh');
begin
  if v_tenant is null then
    raise exception 'Không có tenant context';
  end if;
  if p_user_id is null or p_user_id <> auth.uid() then
    raise exception 'User không hợp lệ';
  end if;

  select count(*)::int into v_user_hour
  from public.ai_usage_logs
  where tenant_id = v_tenant
    and user_id = p_user_id
    and created_at >= v_hour_ago;

  if v_user_hour >= 20 then
    raise exception 'Bạn đã hỏi AI khá nhiều trong giờ qua — thử lại sau.';
  end if;

  select count(*)::int into v_tenant_day
  from public.ai_usage_logs
  where tenant_id = v_tenant
    and created_at >= v_day_start;

  if v_tenant_day >= 200 then
    raise exception 'Công ty đã đạt hạn mức AI trong ngày — thử lại vào ngày mai hoặc liên hệ Optimake.';
  end if;

  return true;
end;
$$;

revoke all on function public.ai_assert_rate_limits(uuid) from public;
grant execute on function public.ai_assert_rate_limits(uuid) to authenticated;

create or replace function public.ai_usage_stats_today()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_tenant uuid := public.current_tenant_id();
  v_day_start timestamptz := (date_trunc('day', now() at time zone 'Asia/Ho_Chi_Minh')
    at time zone 'Asia/Ho_Chi_Minh');
  v_ok int;
  v_fail int;
begin
  if v_tenant is null then
    return jsonb_build_object('okCalls', 0, 'failCalls', 0, 'limit', 200);
  end if;

  select
    count(*) filter (where ok)::int,
    count(*) filter (where not ok)::int
  into v_ok, v_fail
  from public.ai_usage_logs
  where tenant_id = v_tenant
    and created_at >= v_day_start;

  return jsonb_build_object(
    'okCalls', coalesce(v_ok, 0),
    'failCalls', coalesce(v_fail, 0),
    'limit', 200
  );
end;
$$;

revoke all on function public.ai_usage_stats_today() from public;
grant execute on function public.ai_usage_stats_today() to authenticated;

create or replace function public.ai_is_configured()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.tenant_settings s
    where s.tenant_id = public.current_tenant_id()
      and s.namespace = 'ai'
      and s.key = 'api_key'
      and nullif(btrim(s.value #>> '{}'), '') is not null
  );
$$;

revoke all on function public.ai_is_configured() from public;
grant execute on function public.ai_is_configured() to authenticated;

-- 2) Index for rate queries
create index if not exists idx_ai_usage_logs_tenant_created_all
  on public.ai_usage_logs (tenant_id, created_at desc);

-- 3) Lock down api_key: members cannot SELECT/WRITE secret
drop policy if exists tenant_settings_select on public.tenant_settings;
create policy tenant_settings_select on public.tenant_settings
  for select to authenticated
  using (
    tenant_id = (select public.current_tenant_id())
    and (
      not (namespace = 'ai' and key = 'api_key')
      or exists (
        select 1 from public.user_profiles up
        where up.id = (select auth.uid())
          and up.tenant_id = (select public.current_tenant_id())
          and up.role in ('owner', 'admin')
      )
    )
  );

drop policy if exists tenant_settings_write on public.tenant_settings;
create policy tenant_settings_write on public.tenant_settings
  for all to authenticated
  using (
    tenant_id = (select public.current_tenant_id())
    and exists (
      select 1 from public.user_profiles up
      where up.id = (select auth.uid())
        and up.tenant_id = (select public.current_tenant_id())
        and up.role in ('owner', 'admin')
    )
  )
  with check (
    tenant_id = (select public.current_tenant_id())
    and exists (
      select 1 from public.user_profiles up
      where up.id = (select auth.uid())
        and up.tenant_id = (select public.current_tenant_id())
        and up.role in ('owner', 'admin')
    )
  );

-- 4) Tighten ai_usage_logs select InitPlan
drop policy if exists ai_usage_logs_select on public.ai_usage_logs;
create policy ai_usage_logs_select on public.ai_usage_logs
  for select to authenticated
  using (
    tenant_id = (select public.current_tenant_id())
    and (
      user_id = (select auth.uid())
      or exists (
        select 1 from public.user_profiles up
        where up.id = (select auth.uid())
          and up.tenant_id = (select public.current_tenant_id())
          and up.role in ('owner', 'admin')
      )
    )
  );

comment on function public.ai_assert_rate_limits(uuid) is
  'AI ops: enforce 20/user/hour + 200/tenant/day (mọi lần gọi, ngày VN).';
comment on function public.ai_usage_stats_today() is
  'AI ops: thống kê usage tenant hôm nay (VN).';
comment on function public.ai_is_configured() is
  'AI ops: tenant đã lưu API key? (không lộ key).';
