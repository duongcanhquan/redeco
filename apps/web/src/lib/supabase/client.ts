import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  return createBrowserClient(
    requireEnv(process.env.NEXT_PUBLIC_SUPABASE_URL, 'NEXT_PUBLIC_SUPABASE_URL'),
    requireEnv(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, 'NEXT_PUBLIC_SUPABASE_ANON_KEY'),
  );
}

function requireEnv(value: string | undefined, name: string): string {
  if (!value) throw new Error(`Thiếu biến môi trường ${name}`);
  return value;
}
