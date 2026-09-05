import createMiddleware from 'next-intl/middleware';
import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { routing } from '@/i18n/routing';
import type { Database } from '@/types/database';

const handleI18nRouting = createMiddleware(routing);

export function proxy(request: NextRequest) {
  return handleProxy(request);
}

async function handleProxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Bypass i18n and auth redirection for internal API and Next.js asset routes
  if (pathname.startsWith('/api') || pathname.startsWith('/_next')) {
    return NextResponse.next();
  }

  // 1. First run next-intl internationalization routing
  const i18nResponse = handleI18nRouting(request);

  // If next-intl generated a redirect (e.g. '/' -> '/bn'), return it directly
  if (i18nResponse.headers.get('Location')) {
    return i18nResponse;
  }

  // Extract locale and path after locale: e.g. /bn/dashboard/huzur -> locale: bn, subPath: /dashboard/huzur
  const match = pathname.match(/^\/(bn|en)(\/.*)?$/);
  const locale = match ? match[1] : 'bn';
  const subPath = match && match[2] ? match[2] : '';

  // 2. Initialize Supabase SSR client for session verification
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://demo-huzur-booking.supabase.co';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'demo-anon-key-placeholder';

  let authenticatedUser: { id: string; role: 'huzur' | 'organizer' | 'manager' | 'admin' } | null = null;

  // Check demo cookie fallback for local development without active external SMS gateway
  const demoCookie = request.cookies.get('hb_demo_auth_session')?.value;
  if (demoCookie) {
    try {
      const parsed = JSON.parse(decodeURIComponent(demoCookie));
      if (parsed?.id) {
        authenticatedUser = {
          id: parsed.id,
          role: parsed.role || (parsed.role === 'huzur' ? 'huzur' : 'organizer'),
        };
      }
    } catch {
      // ignore invalid json in demo cookie
    }
  }

  // Check real Supabase SSR auth if not in demo or if real session exists
  if (!authenticatedUser && !supabaseUrl.includes('demo-huzur-booking')) {
    try {
      const supabase = createServerClient<Database>(
        supabaseUrl,
        supabaseAnonKey,
        {
          cookies: {
            getAll() {
              return request.cookies.getAll();
            },
            setAll(cookiesToSet) {
              cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
              cookiesToSet.forEach(({ name, value, options }) =>
                i18nResponse.cookies.set(name, value, options)
              );
            },
          },
        }
      );

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const role = (user.user_metadata?.role as 'huzur' | 'organizer' | 'manager' | 'admin') || 'organizer';
        authenticatedUser = {
          id: user.id,
          role,
        };
      }
    } catch (err) {
      console.warn('Supabase proxy auth check error:', err);
    }
  }

  // 3. Role-gated /admin route protection
  const isAdminRoute = subPath === '/admin' || subPath.startsWith('/admin/');
  if (isAdminRoute) {
    if (!authenticatedUser) {
      const loginUrl = new URL(`/${locale}/login`, request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }

    if (authenticatedUser.role !== 'admin') {
      return NextResponse.redirect(new URL(`/${locale}?error=unauthorized_admin`, request.url));
    }
  }

  // 4. Protect /(dashboard) routes
  const isDashboardRoute = subPath === '/dashboard' || subPath.startsWith('/dashboard/');

  if (isDashboardRoute) {
    // Unauthenticated: redirect to /login with original return url
    if (!authenticatedUser) {
      const loginUrl = new URL(`/${locale}/login`, request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Role-based routing
    const { role } = authenticatedUser;

    // Generic /dashboard visits -> redirect to specific dashboard
    if (subPath === '/dashboard' || subPath === '/dashboard/') {
      const targetPath =
        role === 'admin'
          ? `/${locale}/admin`
          : role === 'huzur'
          ? `/${locale}/dashboard/huzur`
          : `/${locale}/dashboard/organizer`;
      return NextResponse.redirect(new URL(targetPath, request.url));
    }

    // Role mismatch protection
    if (subPath.startsWith('/dashboard/huzur') && role === 'organizer') {
      return NextResponse.redirect(new URL(`/${locale}/dashboard/organizer`, request.url));
    }

    if (subPath.startsWith('/dashboard/calendar') && role === 'organizer') {
      return NextResponse.redirect(new URL(`/${locale}/dashboard/organizer`, request.url));
    }

    if (subPath.startsWith('/dashboard/organizer') && role === 'huzur') {
      return NextResponse.redirect(new URL(`/${locale}/dashboard/huzur`, request.url));
    }

    if (subPath.startsWith('/dashboard/my-requests') && role === 'huzur') {
      return NextResponse.redirect(new URL(`/${locale}/dashboard/huzur`, request.url));
    }
  }

  // 5. Redirect already authenticated users away from /login and /register
  const isAuthRoute = subPath === '/login' || subPath === '/register';
  if (isAuthRoute && authenticatedUser) {
    const targetPath =
      authenticatedUser.role === 'admin'
        ? `/${locale}/admin`
        : authenticatedUser.role === 'huzur'
        ? `/${locale}/dashboard/huzur`
        : `/${locale}/dashboard/organizer`;
    return NextResponse.redirect(new URL(targetPath, request.url));
  }

  return i18nResponse;
}

export const config = {
  matcher: [
    // Enable a redirect to a matching locale at the root
    '/',

    // Set a cookie to remember the previous locale for
    // all requests that have a locale prefix
    '/(bn|en)/:path*',

    // Enable redirects that add missing locales
    // (e.g. `/pathnames` -> `/bn/pathnames`)
    '/((?!_next|_vercel|api|.*\\..*).*)',
  ],
};
