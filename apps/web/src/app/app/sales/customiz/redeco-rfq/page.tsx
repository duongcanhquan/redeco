import { redirect } from 'next/navigation';
import { getSessionClaims } from '@/lib/supabase/server';

/** Legacy path → hub Kinh doanh.REDECO tab đề xuất. */
export default async function RedecoRfqRedirectPage({
  searchParams,
}: {
  searchParams: Promise<{ tag?: string }>;
}) {
  const { tag } = await searchParams;
  const claims = await getSessionClaims();
  const base = claims?.tenantSlug ? `/${claims.tenantSlug}` : '/app';
  const q = new URLSearchParams({ tab: 'proposals' });
  if (tag) q.set('tag', tag);
  redirect(`${base}/sales/redeco?${q.toString()}`);
}
