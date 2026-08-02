-- ============================================================
-- Migration: Sales Core Phase 2
-- Spec: docs/superpowers/specs/2026-08-02-sales-core-phase2-design.md
-- discount_rules, approval_workflows(+steps), quotation_approval_actions,
-- sales_outbox; mở rộng quotations + sales_orders.
-- ============================================================

-- ------------------------------------------------------------
-- 1. discount_rules
-- ------------------------------------------------------------

create table public.discount_rules (
  id             uuid primary key default gen_random_uuid(),
  tenant_id      uuid not null references public.tenants (id),
  name           text not null,
  priority       int not null default 100,
  is_active      boolean not null default true,
  valid_from     date,
  valid_until    date,
  discount_pct   numeric(5,2) not null check (discount_pct between 0 and 100),
  conditions     jsonb not null default '{}'::jsonb,
  attributes     jsonb not null default '{}'::jsonb,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

comment on table public.discount_rules is
  'Quy tắc chiết khấu/KM. conditions: {customer_kinds?, customer_ids?, min_doc_total?, product_ids?}.';

create index idx_discount_rules_tenant on public.discount_rules (tenant_id, is_active, priority);
create index idx_discount_rules_conditions on public.discount_rules using gin (conditions jsonb_path_ops);

create trigger trg_discount_rules_updated_at
  before update on public.discount_rules
  for each row execute function public.set_updated_at();

alter table public.discount_rules enable row level security;

create policy discount_rules_tenant on public.discount_rules
  for all to authenticated
  using (
    tenant_id = (select public.current_tenant_id())
    and (select public.has_module_access('kinh-doanh'))
  )
  with check (
    tenant_id = (select public.current_tenant_id())
    and (select public.has_module_access('kinh-doanh'))
  );

-- ------------------------------------------------------------
-- 2. approval_workflows + steps
-- ------------------------------------------------------------

create table public.approval_workflows (
  id           uuid primary key default gen_random_uuid(),
  tenant_id    uuid not null references public.tenants (id),
  name         text not null,
  entity_type  text not null default 'quotation'
               check (entity_type in ('quotation')),
  is_default   boolean not null default false,
  is_active    boolean not null default true,
  attributes   jsonb not null default '{}'::jsonb,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index idx_approval_workflows_tenant
  on public.approval_workflows (tenant_id, entity_type, is_active);

create unique index uq_approval_workflows_one_default
  on public.approval_workflows (tenant_id, entity_type)
  where is_default = true and is_active = true;

create trigger trg_approval_workflows_updated_at
  before update on public.approval_workflows
  for each row execute function public.set_updated_at();

create table public.approval_workflow_steps (
  id                 uuid primary key default gen_random_uuid(),
  tenant_id          uuid not null references public.tenants (id),
  workflow_id        uuid not null references public.approval_workflows (id) on delete cascade,
  step_order         int not null check (step_order >= 1),
  name               text not null,
  min_amount         numeric(18,2) not null default 0 check (min_amount >= 0),
  assignee_role      text check (assignee_role in ('owner', 'admin', 'member')),
  assignee_user_id   uuid references public.user_profiles (id),
  attributes         jsonb not null default '{}'::jsonb,
  created_at         timestamptz not null default now(),
  constraint approval_step_assignee_chk check (
    assignee_role is not null or assignee_user_id is not null
  ),
  unique (workflow_id, step_order)
);

create index idx_approval_workflow_steps_tenant
  on public.approval_workflow_steps (tenant_id, workflow_id);

alter table public.approval_workflows enable row level security;
alter table public.approval_workflow_steps enable row level security;

create policy approval_workflows_tenant on public.approval_workflows
  for all to authenticated
  using (
    tenant_id = (select public.current_tenant_id())
    and (select public.has_module_access('kinh-doanh'))
  )
  with check (
    tenant_id = (select public.current_tenant_id())
    and (select public.has_module_access('kinh-doanh'))
  );

create policy approval_workflow_steps_tenant on public.approval_workflow_steps
  for all to authenticated
  using (
    tenant_id = (select public.current_tenant_id())
    and (select public.has_module_access('kinh-doanh'))
  )
  with check (
    tenant_id = (select public.current_tenant_id())
    and (select public.has_module_access('kinh-doanh'))
  );

-- ------------------------------------------------------------
-- 3. quotation_approval_actions + alter quotations
-- ------------------------------------------------------------

alter table public.quotations
  add column if not exists approval_workflow_id uuid references public.approval_workflows (id),
  add column if not exists current_step_order int,
  add column if not exists applied_discount_rule_id uuid references public.discount_rules (id);

create table public.quotation_approval_actions (
  id             uuid primary key default gen_random_uuid(),
  tenant_id      uuid not null references public.tenants (id),
  quotation_id   uuid not null references public.quotations (id) on delete cascade,
  workflow_id    uuid not null references public.approval_workflows (id),
  step_order     int not null,
  step_name      text not null,
  status         text not null default 'pending'
                 check (status in ('pending', 'approved', 'rejected', 'skipped')),
  acted_by       uuid references public.user_profiles (id),
  acted_at       timestamptz,
  comment        text,
  created_at     timestamptz not null default now(),
  unique (quotation_id, step_order)
);

create index idx_quotation_approval_actions_tenant
  on public.quotation_approval_actions (tenant_id, quotation_id);

alter table public.quotation_approval_actions enable row level security;

create policy quotation_approval_actions_tenant on public.quotation_approval_actions
  for all to authenticated
  using (
    tenant_id = (select public.current_tenant_id())
    and (select public.has_module_access('kinh-doanh'))
  )
  with check (
    tenant_id = (select public.current_tenant_id())
    and (select public.has_module_access('kinh-doanh'))
  );

-- ------------------------------------------------------------
-- 4. sales_orders.promise_check + sales_outbox
-- ------------------------------------------------------------

alter table public.sales_orders
  add column if not exists promise_check jsonb not null default '{}'::jsonb;

comment on column public.sales_orders.promise_check is
  'Snapshot ATP/CTP lúc confirm: { lines: [{product_id, qty, atp_qty, open_wo_qty, shortfall, ctp_status, earliest_date, reason}] }.';

create table public.sales_outbox (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid not null references public.tenants (id),
  event_type      text not null,
  aggregate_type  text not null,
  aggregate_id    uuid not null,
  payload         jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now(),
  published_at    timestamptz
);

create index idx_sales_outbox_tenant_pending
  on public.sales_outbox (tenant_id, created_at)
  where published_at is null;

alter table public.sales_outbox enable row level security;

create policy sales_outbox_tenant on public.sales_outbox
  for all to authenticated
  using (
    tenant_id = (select public.current_tenant_id())
    and (select public.has_module_access('kinh-doanh'))
  )
  with check (
    tenant_id = (select public.current_tenant_id())
    and (select public.has_module_access('kinh-doanh'))
  );
