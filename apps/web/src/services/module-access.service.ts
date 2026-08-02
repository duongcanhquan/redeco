import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createServerSupabase, getSessionClaims } from '@/lib/supabase/server';
import {
  resolveAccountingTabs,
  resolveInventoryTabs,
  resolveProductionTabs,
  resolveSalesTabs,
  type HubTabDef,
} from '@/lib/workspace-nav';
import { getMyRootModules, type EntitledModule } from '@/services/sales.service';

/** Mọi key module user được gán (kể cả node con / tính năng). */
export async function getMyModuleKeys(supabase: SupabaseClient): Promise<string[]> {
  const { data: ids, error } = await supabase.rpc('my_module_ids');
  if (error) throw new Error(`Không tải được quyền module: ${error.message}`);
  const idSet = new Set((ids ?? []) as string[]);
  if (idSet.size === 0) return [];

  const { data: modules } = await supabase.from('modules').select('id, key');
  return ((modules ?? []) as { id: string; key: string }[])
    .filter((m) => idSet.has(m.id))
    .map((m) => m.key);
}

export interface WorkspaceNavContext {
  base: string;
  isManager: boolean;
  rootModules: EntitledModule[];
  moduleKeys: string[];
  salesTabs: HubTabDef[];
  inventoryTabs: HubTabDef[];
  productionTabs: HubTabDef[];
  accountingTabs: HubTabDef[];
}

export async function getWorkspaceNavContext(): Promise<WorkspaceNavContext | null> {
  const [supabase, claims] = await Promise.all([createServerSupabase(), getSessionClaims()]);
  if (!claims?.tenantId) return null;

  const [{ data: profile }, { data: tenant }, rootModules, moduleKeys] = await Promise.all([
    supabase.from('user_profiles').select('role').eq('id', claims.userId).single(),
    supabase.from('tenants').select('slug').eq('id', claims.tenantId).single(),
    getMyRootModules(supabase),
    getMyModuleKeys(supabase),
  ]);

  const role = (profile as { role?: string } | null)?.role ?? 'member';
  const isManager = role === 'owner' || role === 'admin';
  const slug = claims.tenantSlug ?? (tenant as { slug?: string } | null)?.slug ?? null;
  const base = slug ? `/${slug}` : '/app';

  return {
    base,
    isManager,
    rootModules,
    moduleKeys,
    salesTabs: resolveSalesTabs(moduleKeys, isManager),
    inventoryTabs: resolveInventoryTabs(moduleKeys, isManager),
    productionTabs: resolveProductionTabs(moduleKeys),
    accountingTabs: resolveAccountingTabs(moduleKeys),
  };
}
