import { defineRouting } from 'next-intl/routing';
import { createNavigation } from 'next-intl/navigation';

export const routing = defineRouting({
  // A list of all locales that are supported
  locales: ['bn', 'en'],

  // Used when no locale matches
  defaultLocale: 'bn',

  // Ensure /bn and /en prefixes are always present
  localePrefix: 'always',

  // Detect locale from saved cookie (NEXT_LOCALE) first, then browser Accept-Language, fallback to bn
  localeDetection: true,
});

export type Locale = (typeof routing.locales)[number];

// Lightweight wrappers around Next.js' navigation APIs
// that will consider the routing configuration
export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
