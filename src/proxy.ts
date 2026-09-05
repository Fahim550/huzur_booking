import createMiddleware from 'next-intl/middleware';
import type { NextRequest } from 'next/server';
import { routing } from '@/i18n/routing';

const handleI18nRouting = createMiddleware(routing);

export function proxy(request: NextRequest) {
  return handleI18nRouting(request);
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
