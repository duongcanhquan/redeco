import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { cache } from 'react';

/**
 * Client Supabase theo request. Bọc React cache() để layout + page +
 * service trong CÙNG một request dùng chung 1 client (không tạo lại).
 */
export const createServerSupabase = cache(async () => {
  const cookieStore = await cookies();

  return createServerClient(
    requireEnv(process.env.NEXT_PUBLIC_SUPABASE_URL, 'NEXT_PUBLIC_SUPABASE_URL'),
    requireEnv(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, 'NEXT_PUBLIC_SUPABASE_ANON_KEY'),
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Gọi từ Server Component: middleware sẽ refresh session, bỏ qua an toàn
          }
        },
      },
    },
  );
});

export interface SessionClaims {
  userId: string;
  email: string | null;
  tenantId: string | null;
  /** Tên miền (slug) của công ty — dùng cho URL /{slug}/... */
  tenantSlug: string | null;
  isPlatformAdmin: boolean;
}

/**
 * Claims của user hiện tại, decode TRỰC TIẾP từ access token trong cookie —
 * KHÔNG round-trip tới Supabase Auth (getSession chỉ gọi mạng khi token hết
 * hạn cần refresh, ~1 lần/giờ).
 *
 * An toàn vì claims lấy từ chính token mà mọi query DB sẽ mang theo: token
 * bị sửa → Supabase từ chối chữ ký → mọi query RLS fail. Riêng luồng
 * SERVICE ROLE bắt buộc kèm một bước kiểm tra qua client RLS (vd đọc role
 * từ user_profiles) hoặc dùng auth.getUser() để xác thực đầy đủ.
 */
export const getSessionClaims = cache(async (): Promise<SessionClaims | null> => {
  const supabase = await createServerSupabase();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return null;

  const payload = decodeJwtPayload(session.access_token);
  if (!payload || typeof payload['sub'] !== 'string') return null;
  const meta = (payload['app_metadata'] ?? {}) as Record<string, unknown>;
  const tenantId = meta['tenant_id'];
  const tenantSlug = meta['tenant_slug'];
  return {
    userId: payload['sub'],
    email: typeof payload['email'] === 'string' ? payload['email'] : null,
    tenantId: typeof tenantId === 'string' && tenantId.length > 0 ? tenantId : null,
    tenantSlug: typeof tenantSlug === 'string' && tenantSlug.length > 0 ? tenantSlug : null,
    isPlatformAdmin: meta['is_platform_admin'] === true,
  };
});

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  const part = token.split('.')[1];
  if (!part) return null;
  try {
    return JSON.parse(Buffer.from(part, 'base64url').toString('utf8')) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function requireEnv(value: string | undefined, name: string): string {
  if (!value) throw new Error(`Thiếu biến môi trường ${name}`);
  return value;
}
