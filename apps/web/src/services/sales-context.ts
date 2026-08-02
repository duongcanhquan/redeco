import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createServerSupabase, getSessionClaims } from '@/lib/supabase/server';

export type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export interface TenantContext {
  supabase: SupabaseClient;
  userId: string;
  tenantId: string;
  role: 'owner' | 'admin' | 'member';
}

export async function getTenantContext(): Promise<TenantContext> {
  const [supabase, claims] = await Promise.all([createServerSupabase(), getSessionClaims()]);
  if (!claims) throw new Error('Chưa đăng nhập.');
  if (!claims.tenantId) throw new Error('Tài khoản không thuộc công ty nào.');
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', claims.userId)
    .single();
  return {
    supabase,
    userId: claims.userId,
    tenantId: claims.tenantId,
    role: ((profile as { role?: string } | null)?.role ?? 'member') as TenantContext['role'],
  };
}

export function requireManager(ctx: TenantContext): void {
  if (ctx.role !== 'owner' && ctx.role !== 'admin') {
    throw new Error('Chỉ quản trị công ty (owner/admin) được thực hiện thao tác này.');
  }
}
