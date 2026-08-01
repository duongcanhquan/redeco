import 'server-only';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Client dùng SERVICE ROLE — bypass RLS, có quyền Auth Admin.
 * CHỈ được import từ code chạy trên server (Server Actions / RSC).
 */
export function createAdminClient(): SupabaseClient {
  return createClient(
    requireEnv(process.env.NEXT_PUBLIC_SUPABASE_URL, 'NEXT_PUBLIC_SUPABASE_URL'),
    requireEnv(process.env.SUPABASE_SERVICE_ROLE_KEY, 'SUPABASE_SERVICE_ROLE_KEY'),
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

function requireEnv(value: string | undefined, name: string): string {
  if (!value) throw new Error(`Thiếu biến môi trường ${name}`);
  return value;
}
