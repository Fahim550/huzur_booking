import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { LOCALES, DEFAULT_LOCALE, LOCALE_COOKIE_NAME, isValidLocale } from '@/lib/i18n/config';

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // Check if pathname starts with any supported locale (e.g. /bn, /en)
  const pathnameLocale = LOCALES.find(
    (locale) => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`)
  );

  if (pathnameLocale) {
    // Path already has locale. Ensure NEXT_LOCALE cookie matches this locale.
    const response = NextResponse.next();
    const currentCookie = request.cookies.get(LOCALE_COOKIE_NAME)?.value;
    if (currentCookie !== pathnameLocale) {
      response.cookies.set(LOCALE_COOKIE_NAME, pathnameLocale, {
        path: '/',
        maxAge: 31536000, // 1 year
        sameSite: 'lax',
      });
    }
    return response;
  }

  // Path has no locale prefix (e.g., '/', '/search', '/my-bookings')
  // Check cookie first, otherwise fallback to default locale ('bn')
  const savedLocaleCookie = request.cookies.get(LOCALE_COOKIE_NAME)?.value;
  const targetLocale =
    savedLocaleCookie && isValidLocale(savedLocaleCookie)
      ? savedLocaleCookie
      : DEFAULT_LOCALE;

  const targetPath = pathname === '/' ? '' : pathname;
  const redirectUrl = new URL(`/${targetLocale}${targetPath}${search}`, request.url);

  const response = NextResponse.redirect(redirectUrl);
  // Persist cookie
  response.cookies.set(LOCALE_COOKIE_NAME, targetLocale, {
    path: '/',
    maxAge: 31536000,
    sameSite: 'lax',
  });

  return response;
}

export const config = {
  matcher: [
    // Match all paths except internal _next, static assets with extensions, and api
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)',
  ],
};
