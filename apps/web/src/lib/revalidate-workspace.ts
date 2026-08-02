import 'server-only';
import { revalidatePath } from 'next/cache';
import { getSessionClaims } from '@/lib/supabase/server';

/**
 * Revalidate cả path rewrite `/app/...` và path tenant `/{slug}/...`.
 */
export async function revalidateWorkspace(paths: string[]): Promise<void> {
  const claims = await getSessionClaims();
  const slug = claims?.tenantSlug;
  for (const path of paths) {
    const normalized = path.startsWith('/') ? path : `/${path}`;
    const appPath = normalized.startsWith('/app')
      ? normalized
      : `/app${normalized}`;
    revalidatePath(appPath);
    if (slug) {
      const rest = appPath.replace(/^\/app/, '') || '';
      revalidatePath(`/${slug}${rest}`);
    }
  }
}
