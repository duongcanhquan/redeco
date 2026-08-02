-- Mở rộng namespace tenant_settings cho Kho + Sản xuất (ADR-010)
alter table public.tenant_settings
  drop constraint if exists tenant_settings_namespace_check;

alter table public.tenant_settings
  add constraint tenant_settings_namespace_check
  check (namespace in (
    'ai', 'sales', 'integrations', 'notifications', 'company',
    'inventory', 'production'
  ));

comment on table public.tenant_settings is
  'Cài đặt theo tenant. Namespace: ai|sales|integrations|notifications|company|inventory|production. ADR-010 cá nhân hóa.';
