-- ============================================================
-- AI Platform Ops: usage audit + daily quota helpers
-- ============================================================

create table if not exists public.ai_usage_logs (
  id           uuid primary key default gen_random_uuid(),
  tenant_id    uuid not null references public.tenants (id),
  user_id      uuid not null references auth.users (id),
  feature_key  text not null,
  module_key   text not null,
  ok           boolean not null default true,
  latency_ms   integer,
  error_code   text,
  meta         jsonb not null default '{}'::jsonb,
  created_at   timestamptz not null default now()
);

create index if not exists idx_ai_usage_logs_tenant_created
  on public.ai_usage_logs (tenant_id, created_at desc);

create index if not exists idx_ai_usage_logs_tenant_user_created
  on public.ai_usage_logs (tenant_id, user_id, created_at desc);

alter table public.ai_usage_logs enable row level security;

drop policy if exists ai_usage_logs_select on public.ai_usage_logs;
create policy ai_usage_logs_select on public.ai_usage_logs
  for select to authenticated
  using (tenant_id = (select public.current_tenant_id()));

drop policy if exists ai_usage_logs_insert on public.ai_usage_logs;
create policy ai_usage_logs_insert on public.ai_usage_logs
  for insert to authenticated
  with check (
    tenant_id = (select public.current_tenant_id())
    and user_id = auth.uid()
  );

-- Owner/admin may read all tenant logs; members only own rows (tighten select)
drop policy if exists ai_usage_logs_select on public.ai_usage_logs;
create policy ai_usage_logs_select on public.ai_usage_logs
  for select to authenticated
  using (
    tenant_id = (select public.current_tenant_id())
    and (
      user_id = auth.uid()
      or exists (
        select 1 from public.user_profiles up
        where up.id = auth.uid()
          and up.tenant_id = public.current_tenant_id()
          and up.role in ('owner', 'admin')
      )
    )
  );

comment on table public.ai_usage_logs is
  'AI Platform Ops — audit mỗi lần gọi LLM (feature/module/latency).';
