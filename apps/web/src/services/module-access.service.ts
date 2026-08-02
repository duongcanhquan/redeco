import 'server-only';
import { cache } from 'react';
import { createServerSupabase, getSessionClaims } from '@/lib/supabase/server';
import {
  resolveAccountingTabs,
  resolveInventoryTabs,
  resolveProductionTabs,
  resolveSalesTabs,
  type HubTabDef,
} from '@/lib/workspace-nav';
import type { EntitledModule } from '@/services/sales.service';

interface ModuleRow {
  id: string;
  key: string;
  name: string;
  parent_id: string | null;
}

/** Một lần RPC + một lần đọc catalog / request (dedupe bằng cache). */
const loadMyModules = cache(async (): Promise<{
  keys: string[];
  roots: EntitledModule[];
}> => {
  const supabase = await createServerSupabase();
  const { data: ids, error } = await supabase.rpc('my_module_ids');
  if (error) throw new Error(`Không tải được quyền module: ${error.message}`);
  const idSet = new Set((ids ?? []) as string[]);
  if (idSet.size === 0) return { keys: [], roots: [] };

  const { data: modules } = await supabase
    .from('modules')
    .select('id, key, name, parent_id')
    .order('sort_order');
  const all = (modules ?? []) as ModuleRow[];
  const mine = all.filter((m) => idSet.has(m.id));
  const keys = mine.map((m) => m.key);
  const roots = all.filter(
    (m) =>
      m.parent_id === null &&
      keys.some((k) => k === m.key || k.startsWith(`${m.key}.`)),
  );
  return {
    keys,
    roots: roots.map((m) => ({ id: m.id, key: m.key, name: m.name })),
  };
});

/** Mọi key module user được gán (kể cả node con / tính năng). */
export async function getMyModuleKeys(): Promise<string[]> {
  const { keys } = await loadMyModules();
  return keys;
}

export interface WorkspaceNavContext {
  base: string;
  companyName: string;
  isManager: boolean;
  rootModules: EntitledModule[];
  moduleKeys: string[];
  salesTabs: HubTabDef[];
  inventoryTabs: HubTabDef[];
  productionTabs: HubTabDef[];
  accountingTabs: HubTabDef[];
}

/** Dedupe trong cùng request — layout cha + layout hub chỉ query 1 lần. */
export const getWorkspaceNavContext = cache(
  async (): Promise<WorkspaceNavContext | null> => {
    const [supabase, claims] = await Promise.all([
      createServerSupabase(),
      getSessionClaims(),
    ]);
    if (!claims?.tenantId) return null;

    const [{ data: profile }, { data: tenant }, mods] = await Promise.all([
      supabase.from('user_profiles').select('role').eq('id', claims.userId).single(),
      supabase.from('tenants').select('name, slug').eq('id', claims.tenantId).single(),
      loadMyModules(),
    ]);

    const role = (profile as { role?: string } | null)?.role ?? 'member';
    const isManager = role === 'owner' || role === 'admin';
    const tenantRow = tenant as { name?: string; slug?: string } | null;
    const slug = claims.tenantSlug ?? tenantRow?.slug ?? null;
    const base = slug ? `/${slug}` : '/app';
    const { keys: moduleKeys, roots: rootModules } = mods;

    return {
      base,
      companyName: tenantRow?.name ?? 'Công ty',
      isManager,
      rootModules,
      moduleKeys,
      salesTabs: resolveSalesTabs(moduleKeys, isManager),
      inventoryTabs: resolveInventoryTabs(moduleKeys, isManager),
      productionTabs: resolveProductionTabs(moduleKeys),
      accountingTabs: resolveAccountingTabs(moduleKeys),
    };
  },
);
