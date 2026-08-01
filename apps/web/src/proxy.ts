import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

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

  // Đã đăng nhập (session lưu trong cookie) -> vào thẳng khu làm việc, khỏi login lại
  if (path === '/login' || path === '/') {
    if (isPlatformAdminUser) {
      const url = request.nextUrl.clone();
      url.pathname = '/platform';
      url.search = '';
      return NextResponse.redirect(url);
    }
    if (isTenantUser) {
      const url = request.nextUrl.clone();
      url.pathname = '/app';
      url.search = '';
      return NextResponse.redirect(url);
    }
  }

  // Bảo vệ workspace công ty
  if (path.startsWith('/app')) {
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      url.searchParams.set('next', path);
      return NextResponse.redirect(url);
    }
    if (!isTenantUser) {
      const url = request.nextUrl.clone();
      url.pathname = isPlatformAdminUser ? '/platform' : '/login';
      url.search = '';
      if (!isPlatformAdminUser) url.searchParams.set('error', 'forbidden');
      return NextResponse.redirect(url);
    }
  }

  // Bảo vệ khu quản trị nền tảng
  if (path.startsWith('/platform')) {
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      url.searchParams.set('next', path);
      return NextResponse.redirect(url);
    }
    if (!isPlatformAdminUser) {
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      url.searchParams.set('error', 'forbidden');
      return NextResponse.redirect(url);
    }
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)'],
};
