-- ============================================================
-- AI RAG R1 — collections, documents, chunks (float[] embeddings)
-- Blueprint: docs/blueprints/2026-08-02-ai-rag-r1-blueprint.md
-- ============================================================

create table public.rag_collections (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null references public.tenants (id),
  module_key    text not null
                check (module_key in (
                  'chung', 'kinh-doanh', 'kho', 'san-xuat', 'nhan-su', 'thiet-bi'
                )),
  name          text not null,
  description   text not null default '',
  is_active     boolean not null default true,
  attributes    jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (tenant_id, module_key)
);

create index idx_rag_collections_tenant
  on public.rag_collections (tenant_id, is_active);

create trigger trg_rag_collections_updated_at
  before update on public.rag_collections
  for each row execute function public.set_updated_at();

create table public.rag_documents (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid not null references public.tenants (id),
  collection_id   uuid not null references public.rag_collections (id) on delete cascade,
  title           text not null,
  source_type     text not null default 'paste'
                  check (source_type in ('paste', 'markdown', 'manual')),
  status          text not null default 'draft'
                  check (status in (
                    'draft', 'indexing', 'ready', 'failed', 'archived'
                  )),
  body_text       text not null default '',
  error_message   text,
  chunk_count     int not null default 0 check (chunk_count >= 0),
  indexed_at      timestamptz,
  created_by      uuid references public.user_profiles (id),
  attributes      jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index idx_rag_documents_tenant
  on public.rag_documents (tenant_id, collection_id, status);

create trigger trg_rag_documents_updated_at
  before update on public.rag_documents
  for each row execute function public.set_updated_at();

create table public.rag_chunks (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid not null references public.tenants (id),
  document_id     uuid not null references public.rag_documents (id) on delete cascade,
  collection_id   uuid not null references public.rag_collections (id) on delete cascade,
  chunk_index     int not null check (chunk_index >= 0),
  content         text not null,
  token_est       int not null default 0 check (token_est >= 0),
  -- OpenAI text-embedding-3-small = 1536 dims; lưu jsonb number[]
  embedding       jsonb not null default '[]'::jsonb,
  attributes      jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now(),
  unique (document_id, chunk_index)
);

create index idx_rag_chunks_collection
  on public.rag_chunks (tenant_id, collection_id);

alter table public.rag_collections enable row level security;
alter table public.rag_documents enable row level security;
alter table public.rag_chunks enable row level security;

-- Đọc: có module ai
create policy rag_collections_select on public.rag_collections for select to authenticated
  using (
    tenant_id = (select public.current_tenant_id())
    and (select public.has_module_access('ai'))
  );

create policy rag_documents_select on public.rag_documents for select to authenticated
  using (
    tenant_id = (select public.current_tenant_id())
    and (select public.has_module_access('ai'))
  );

create policy rag_chunks_select on public.rag_chunks for select to authenticated
  using (
    tenant_id = (select public.current_tenant_id())
    and (select public.has_module_access('ai'))
  );

-- Ghi: owner/admin + ai
create policy rag_collections_write on public.rag_collections for all to authenticated
  using (
    tenant_id = (select public.current_tenant_id())
    and (select public.has_module_access('ai'))
    and exists (
      select 1 from public.user_profiles up
      where up.id = auth.uid()
        and up.tenant_id = public.current_tenant_id()
        and up.role in ('owner', 'admin')
    )
  )
  with check (
    tenant_id = (select public.current_tenant_id())
    and (select public.has_module_access('ai'))
    and exists (
      select 1 from public.user_profiles up
      where up.id = auth.uid()
        and up.tenant_id = public.current_tenant_id()
        and up.role in ('owner', 'admin')
    )
  );

create policy rag_documents_write on public.rag_documents for all to authenticated
  using (
    tenant_id = (select public.current_tenant_id())
    and (select public.has_module_access('ai'))
    and exists (
      select 1 from public.user_profiles up
      where up.id = auth.uid()
        and up.tenant_id = public.current_tenant_id()
        and up.role in ('owner', 'admin')
    )
  )
  with check (
    tenant_id = (select public.current_tenant_id())
    and (select public.has_module_access('ai'))
    and exists (
      select 1 from public.user_profiles up
      where up.id = auth.uid()
        and up.tenant_id = public.current_tenant_id()
        and up.role in ('owner', 'admin')
    )
  );

create policy rag_chunks_write on public.rag_chunks for all to authenticated
  using (
    tenant_id = (select public.current_tenant_id())
    and (select public.has_module_access('ai'))
    and exists (
      select 1 from public.user_profiles up
      where up.id = auth.uid()
        and up.tenant_id = public.current_tenant_id()
        and up.role in ('owner', 'admin')
    )
  )
  with check (
    tenant_id = (select public.current_tenant_id())
    and (select public.has_module_access('ai'))
    and exists (
      select 1 from public.user_profiles up
      where up.id = auth.uid()
        and up.tenant_id = public.current_tenant_id()
        and up.role in ('owner', 'admin')
    )
  );

comment on table public.rag_collections is 'RAG R1: KB theo module_key';
comment on table public.rag_documents is 'RAG R1: tài liệu nguồn (paste/markdown)';
comment on table public.rag_chunks is 'RAG R1: đoạn + embedding jsonb float[]';
