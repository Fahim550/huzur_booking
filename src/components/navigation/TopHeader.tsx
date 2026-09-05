'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Sparkles, PhoneCall, CalendarCheck, Search, CalendarDays, User, ShieldCheck } from 'lucide-react';
import clsx from 'clsx';
import { Locale } from '@/lib/i18n/config';
import { getDictionary } from '@/lib/i18n/getDictionary';
import LanguageSwitcher from './LanguageSwitcher';

interface TopHeaderProps {
  locale?: Locale;
}

export default function TopHeader({ locale = 'bn' }: TopHeaderProps) {
  const pathname = usePathname();
  const dict = getDictionary(locale);

  const navLinks = [
    { name: dict.nav.search, href: `/${locale}/search`, icon: Search },
    { name: dict.nav.myBookings, href: `/${locale}/my-bookings`, icon: CalendarCheck },
    { name: dict.nav.availability, href: `/${locale}/availability`, icon: CalendarDays },
    { name: dict.nav.profile, href: `/${locale}/profile`, icon: User },
  ];

  return (
    <header className="sticky top-0 z-40 w-full bg-white/95 dark:bg-zinc-950/95 backdrop-blur-md border-b border-emerald-100 dark:border-emerald-950/60 transition-colors">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-2">
        {/* Brand & Logo */}
        <Link href={`/${locale}`} className="flex items-center gap-2.5 group shrink-0">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-600 to-emerald-800 flex items-center justify-center text-white shadow-md shadow-emerald-700/20 group-hover:scale-105 transition-transform">
            <span className="text-xl font-bold font-serif">ح</span>
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-base sm:text-xl text-emerald-900 dark:text-emerald-300 tracking-tight">
                {dict.brand.name}
              </span>
              <span className="hidden sm:inline-flex items-center gap-0.5 text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 px-1.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                <ShieldCheck className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                {dict.brand.verified}
              </span>
            </div>
            <span className="text-[11px] text-zinc-500 dark:text-zinc-400 hidden sm:inline leading-none">
              {dict.brand.tag}
            </span>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive =
              link.href === `/${locale}/search`
                ? pathname === `/${locale}` || pathname.startsWith(`/${locale}/search`)
                : pathname.startsWith(link.href);

            return (
              <Link
                key={link.href}
                href={link.href}
                className={clsx(
                  'flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all min-h-[44px]',
                  isActive
                    ? 'bg-emerald-50 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 shadow-xs'
                    : 'text-zinc-600 hover:text-emerald-700 dark:text-zinc-300 dark:hover:text-emerald-300 hover:bg-zinc-50 dark:hover:bg-zinc-900'
                )}
              >
                <Icon className="w-4 h-4" />
                <span>{link.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Right Actions: Desktop Language Switcher + Support Hotline + CTA */}
        <div className="flex items-center gap-2">
          {/* Header Language Switcher (Visible on all viewports) */}
          <LanguageSwitcher currentLocale={locale} variant="header" />

          {/* Hotline (Hidden on small mobile) */}
          <a
            href="tel:+8801700000000"
            className="hidden sm:flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 rounded-lg border border-emerald-200/70 dark:border-emerald-800/60 transition-colors min-h-[44px] min-w-[44px]"
            title={dict.brand.hotline}
          >
            <PhoneCall className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span className="hidden lg:inline">{dict.brand.hotline}</span>
          </a>

          {/* Find Speaker CTA */}
          <Link
            href={`/${locale}/search`}
            className="flex items-center gap-1.5 px-3 sm:px-3.5 py-2 text-xs sm:text-sm font-semibold text-white bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 rounded-lg shadow-sm shadow-emerald-700/20 active:scale-95 transition-all min-h-[44px]"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span className="hidden xs:inline sm:inline">{dict.brand.findSpeakerBtn}</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
