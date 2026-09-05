'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Search, CalendarCheck, CalendarDays, User } from 'lucide-react';
import clsx from 'clsx';
import { Locale } from '@/lib/i18n/config';
import { getDictionary } from '@/lib/i18n/getDictionary';
import LanguageSwitcher from './LanguageSwitcher';

interface BottomNavProps {
  locale?: Locale;
}

export default function BottomNav({ locale = 'bn' }: BottomNavProps) {
  const pathname = usePathname();
  const dict = getDictionary(locale);

  const navItems = [
    {
      name: dict.nav.search,
      href: `/${locale}/search`,
      exactMatchPrefix: `/${locale}/search`,
      icon: Search,
    },
    {
      name: dict.nav.myBookings,
      href: `/${locale}/my-bookings`,
      exactMatchPrefix: `/${locale}/my-bookings`,
      icon: CalendarCheck,
    },
    {
      name: dict.nav.availability,
      href: `/${locale}/availability`,
      exactMatchPrefix: `/${locale}/availability`,
      icon: CalendarDays,
    },
    {
      name: dict.nav.profile,
      href: `/${locale}/profile`,
      exactMatchPrefix: `/${locale}/profile`,
      icon: User,
    },
  ];

  return (
    <nav
      aria-label="Mobile Navigation"
      className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-white/95 dark:bg-zinc-950/95 backdrop-blur-md border-t border-emerald-100 dark:border-emerald-900/40 shadow-lg shadow-emerald-950/10 pb-[env(safe-area-inset-bottom)]"
    >
      <div className="grid grid-cols-5 max-w-md mx-auto px-1 py-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.href === `/${locale}/search`
              ? pathname === `/${locale}` || pathname.startsWith(`/${locale}/search`)
              : pathname.startsWith(item.exactMatchPrefix);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                'group flex flex-col items-center justify-center min-h-[48px] min-w-[44px] py-1 px-0.5 rounded-xl transition-all duration-200 active:scale-95',
                isActive
                  ? 'text-emerald-700 dark:text-emerald-400 font-semibold'
                  : 'text-zinc-500 hover:text-emerald-600 dark:text-zinc-400 dark:hover:text-emerald-300'
              )}
            >
              <div
                className={clsx(
                  'flex items-center justify-center w-8 h-8 rounded-full transition-all duration-200',
                  isActive
                    ? 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-400 shadow-xs'
                    : 'group-hover:bg-zinc-100 dark:group-hover:bg-zinc-900'
                )}
              >
                <Icon className={clsx('w-4.5 h-4.5 transition-transform group-hover:scale-110', isActive && 'stroke-[2.25]')} />
              </div>
              <span className="text-[10px] sm:text-[11px] leading-tight mt-0.5 tracking-tight truncate max-w-[64px]">
                {item.name}
              </span>
            </Link>
          );
        })}

        {/* 1-Tap Language Switcher inside Mobile Bottom Nav */}
        <LanguageSwitcher currentLocale={locale} variant="bottom-nav" />
      </div>
    </nav>
  );
}
