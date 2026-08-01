import type { SupabaseClient } from '@supabase/supabase-js';

/** Row types khớp schema public (migration 0001 + 0002). */
export interface TenantRow {
  id: string;
  name: string;
  slug: string;
  status: 'active' | 'suspended';
  attributes: { admin_email?: string };
  created_at: string;
  user_profiles?: { count: number }[];
}

export interface ContractRow {
  id: string;
  tenant_id: string;
  code: string;
  status: 'draft' | 'active' | 'suspended' | 'terminated';
  starts_on: string;
  ends_on: string;
  seats: number;
  notes: string | null;
  tenants?: { name: string } | null;
  contract_entitlements?: { modules: { name: string } | null }[];
}

export interface ModuleRow {
  id: string;
  parent_id: string | null;
  key: string;
  name: string;
  description: string | null;
  kind: 'module' | 'feature';
  sort_order: number;
  is_active: boolean;
}

export interface SettingRow {
  key: string;
  value: unknown;
  description: string | null;
  updated_at: string;
}

export interface PlatformOverview {
  tenantCount: number;
  activeContractCount: number;
  expiringSoonCount: number;
  totalSeats: number;
  moduleCount: number;
  recentContracts: ContractRow[];
}

const EXPIRING_SOON_DAYS = 30;

export async function getPlatformOverview(
  supabase: SupabaseClient,
): Promise<PlatformOverview> {
  const today = new Date().toISOString().slice(0, 10);
  const soon = new Date(Date.now() + EXPIRING_SOON_DAYS * 86_400_000)
    .toISOString()
    .slice(0, 10);

  const [tenants, modules, activeContracts, expiring, recent] = await Promise.all([
    supabase.from('tenants').select('id', { count: 'exact', head: true }),
    supabase.from('modules').select('id', { count: 'exact', head: true }),
    supabase
      .from('contracts')
      .select('seats')
      .eq('status', 'active')
      .gte('ends_on', today),
    supabase
      .from('contracts')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'active')
      .gte('ends_on', today)
      .lte('ends_on', soon),
    supabase
      .from('contracts')
      .select('id, tenant_id, code, status, starts_on, ends_on, seats, notes, tenants(name)')
      .order('created_at', { ascending: false })
      .limit(6),
  ]);

  const activeRows = (activeContracts.data ?? []) as { seats: number }[];

  return {
    tenantCount: tenants.count ?? 0,
    moduleCount: modules.count ?? 0,
    activeContractCount: activeRows.length,
    expiringSoonCount: expiring.count ?? 0,
    totalSeats: activeRows.reduce((sum, row) => sum + row.seats, 0),
    recentContracts: (recent.data ?? []) as unknown as ContractRow[],
  };
}

export async function listModules(supabase: SupabaseClient): Promise<ModuleRow[]> {
  const { data, error } = await supabase
    .from('modules')
    .select('id, parent_id, key, name, description, kind, sort_order, is_active')
    .order('sort_order');
  if (error) throw new Error(`Không tải được danh mục module: ${error.message}`);
  return (data ?? []) as ModuleRow[];
}

export async function listTenants(supabase: SupabaseClient): Promise<TenantRow[]> {
  const { data, error } = await supabase
    .from('tenants')
    .select('id, name, slug, status, attributes, created_at, user_profiles(count)')
    .order('created_at', { ascending: false });
  if (error) throw new Error(`Không tải được danh sách công ty: ${error.message}`);
  return (data ?? []) as unknown as TenantRow[];
}

export async function listContracts(supabase: SupabaseClient): Promise<ContractRow[]> {
  const { data, error } = await supabase
    .from('contracts')
    .select(
      'id, tenant_id, code, status, starts_on, ends_on, seats, notes, tenants(name), contract_entitlements(modules(name))',
    )
    .order('ends_on');
  if (error) throw new Error(`Không tải được danh sách hợp đồng: ${error.message}`);
  return (data ?? []) as unknown as ContractRow[];
}

export async function listSettings(supabase: SupabaseClient): Promise<SettingRow[]> {
  const { data, error } = await supabase
    .from('platform_settings')
    .select('key, value, description, updated_at')
    .order('key');
  if (error) throw new Error(`Không tải được tham số hệ thống: ${error.message}`);
  return (data ?? []) as SettingRow[];
}

/** Node cây module đã dựng từ danh sách phẳng. */
export interface ModuleTreeNode extends ModuleRow {
  children: ModuleTreeNode[];
}

export function buildModuleTree(rows: ModuleRow[]): ModuleTreeNode[] {
  const byId = new Map<string, ModuleTreeNode>();
  for (const row of rows) byId.set(row.id, { ...row, children: [] });
  const roots: ModuleTreeNode[] = [];
  for (const node of byId.values()) {
    if (node.parent_id && byId.has(node.parent_id)) {
      byId.get(node.parent_id)?.children.push(node);
    } else {
      roots.push(node);
    }
  }
  return roots;
}
