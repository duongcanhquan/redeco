import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { isTenantPathSegment, RESERVED_TENANT_SLUGS } from '@/lib/tenant-slug';

/**
 * Định tuyến đa tenant theo TÊN MIỀN CÔNG TY (path prefix):
 *   optimake.com/{slug}         -> workspace của công ty {slug} (rewrite nội bộ về /app)
 *   optimake.com/{slug}/login   -> trang đăng nhập riêng của công ty
 * Người dùng công ty LUÔN bị ép về đúng prefix của công ty mình
 * (kể cả gõ /app trực tiếp hay prefix của công ty khác).
 */
export default async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  // Đọc session từ cookie — KHÔNG round-trip tới Auth server khi token còn
  // hạn; getSession tự refresh (1 lần/giờ) khi token hết hạn và ghi cookie
  // mới qua setAll. Routing dựa trên claim trong cookie là đủ an toàn:
  // dữ liệu thật luôn bị Supabase verify JWT + RLS chặn ở tầng DB.
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const user = session?.user ?? null;

  const path = request.nextUrl.pathname;
  const isPlatformAdminUser = user?.app_metadata['is_platform_admin'] === true;
  const tenantId = user?.app_metadata['tenant_id'];
  const isTenantUser = typeof tenantId === 'string' && tenantId.length > 0;
  const slugClaim = user?.app_metadata['tenant_slug'];
  const tenantSlug = typeof slugClaim === 'string' && slugClaim.length > 0 ? slugClaim : null;

  const redirectTo = (pathname: string, search = ''): NextResponse => {
    const url = request.nextUrl.clone();
    url.pathname = pathname;
    url.search = search;
    return NextResponse.redirect(url);
  };

  // Rewrite giữ nguyên URL trên trình duyệt, đổi route xử lý nội bộ.
  // Copy cookie từ response gốc để không mất phiên vừa refresh.
  const rewriteTo = (pathname: string): NextResponse => {
    const url = request.nextUrl.clone();
    url.pathname = pathname;
    const res = NextResponse.rewrite(url, { request });
    for (const cookie of response.cookies.getAll()) {
      res.cookies.set(cookie);
    }
    return res;
  };

  const firstSegment = path.split('/')[1] ?? '';

  // Gõ URL có chữ hoa (vd /Demo) -> tự chuyển về chữ thường thay vì 404
  if (
    !RESERVED_TENANT_SLUGS.has(firstSegment.toLowerCase()) &&
    /^[A-Za-z0-9-]+$/.test(firstSegment) &&
    firstSegment !== firstSegment.toLowerCase()
  ) {
    return redirectTo(path.toLowerCase(), request.nextUrl.search.replace(/^\?/, ''));
  }

  const isTenantPath = isTenantPathSegment(firstSegment);

  // ---------- URL theo tên miền công ty: /{slug}/... ----------
  if (isTenantPath) {
    const rest = path.slice(firstSegment.length + 1); // '' | '/login' | '/sales/...'

    if (rest === '/login') {
      // Chỉ user công ty bị ép về workspace; superadmin/khách xem được trang login công ty
      if (isTenantUser) return redirectTo(`/${tenantSlug ?? firstSegment}`);
      return rewriteTo('/login'); // URL vẫn là /{slug}/login — trang login nhận diện công ty
    }

    if (!user) return redirectTo(`/${firstSegment}/login`);
    if (!isTenantUser) {
      return isPlatformAdminUser
        ? redirectTo('/platform')
        : redirectTo('/login', 'error=forbidden');
    }
    // Ép về đúng tên miền của công ty mình — không xem được prefix công ty khác
    if (tenantSlug && tenantSlug !== firstSegment) {
      return redirectTo(`/${tenantSlug}${rest}`, request.nextUrl.search.replace(/^\?/, ''));
    }
    if (!tenantSlug) return redirectTo(`/app${rest}`); // user cũ chưa có claim slug

    // rest rỗng = /{slug} -> /app ; rest = /sales/... -> /app/sales/...
    return rewriteTo(rest ? `/app${rest}` : '/app');
  }

  // Đã đăng nhập -> vào thẳng khu làm việc, khỏi login lại
  if (path === '/login' || path === '/') {
    if (isPlatformAdminUser) return redirectTo('/platform');
    if (isTenantUser) return redirectTo(tenantSlug ? `/${tenantSlug}` : '/app');
  }

  // /app là route nội bộ: user có tên miền LUÔN bị ép về /{slug}/...
  if (path === '/app' || path.startsWith('/app/')) {
    if (!user) return redirectTo('/login', `next=${encodeURIComponent(path)}`);
    if (!isTenantUser) {
      return isPlatformAdminUser
        ? redirectTo('/platform')
        : redirectTo('/login', 'error=forbidden');
    }
    if (tenantSlug) {
      return redirectTo(
        `/${tenantSlug}${path.slice('/app'.length)}`,
        request.nextUrl.search.replace(/^\?/, ''),
      );
    }
  }

  // Bảo vệ khu quản trị nền tảng
  if (path.startsWith('/platform')) {
    if (!user) return redirectTo('/login', `next=${encodeURIComponent(path)}`);
    if (!isPlatformAdminUser) return redirectTo('/login', 'error=forbidden');
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)'],
};
