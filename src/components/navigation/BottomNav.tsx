'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Search,
  CalendarCheck,
  CalendarDays,
  User,
  Clock,
  ShieldCheck,
  BarChart3,
} from 'lucide-react';
import clsx from 'clsx';
import { Locale } from '@/lib/i18n/config';
import { getDictionary } from '@/lib/i18n/getDictionary';
import { getClientUser, UserRole } from '@/lib/auth';
import LanguageSwitcher from './LanguageSwitcher';

interface BottomNavProps {
  locale?: Locale;
}

export default function BottomNav({ locale = 'bn' }: BottomNavProps) {
  const pathname = usePathname();
  const dict = getDictionary(locale);
  const [role, setRole] = useState<UserRole | 'guest'>('guest');

  useEffect(() => {
    // Check client user role
    getClientUser().then((u) => {
      if (u?.role) {
        setRole(u.role);
      }
    });

    // Listen for storage events (e.g. role switch in profile or demo login)
    const handleStorage = () => {
      const stored = localStorage.getItem('hb_current_user');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (parsed?.role) setRole(parsed.role);
        } catch {}
      }
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  // Adapt 4 primary items based on logged-in role
  const getNavItems = () => {
    // 1. Search
    const searchItem = {
      name: dict.nav.search,
      href: `/${locale}/search`,
      exactMatchPrefix: `/${locale}/search`,
      icon: Search,
    };

    // 2. My Bookings-or-Requests
    let bookingsOrRequestsItem = {
      name: dict.nav.myBookings,
      href: `/${locale}/my-bookings`,
      exactMatchPrefix: `/${locale}/my-bookings`,
      icon: CalendarCheck,
    };

    if (role === 'organizer') {
      bookingsOrRequestsItem = {
        name: dict.nav.myRequests || (locale === 'bn' ? 'আমার আবেদন' : 'My Requests'),
        href: `/${locale}/dashboard/my-requests`,
        exactMatchPrefix: `/${locale}/dashboard/my-requests`,
        icon: Clock,
      };
    } else if (role === 'huzur' || role === 'manager') {
      bookingsOrRequestsItem = {
        name: dict.nav.myBookings || (locale === 'bn' ? 'বুকিং সমূহ' : 'My Bookings'),
        href: `/${locale}/dashboard/huzur`,
        exactMatchPrefix: `/${locale}/dashboard/huzur`,
        icon: CalendarCheck,
      };
    } else if (role === 'admin') {
      bookingsOrRequestsItem = {
        name: dict.nav.admin || (locale === 'bn' ? 'অ্যাডমিন' : 'Admin'),
        href: `/${locale}/admin`,
        exactMatchPrefix: `/${locale}/admin`,
        icon: ShieldCheck,
      };
    }

    // 3. Post Availability
    let availabilityItem = {
      name: dict.nav.availability,
      href: `/${locale}/availability`,
      exactMatchPrefix: `/${locale}/availability`,
      icon: CalendarDays,
    };

    if (role === 'huzur' || role === 'manager') {
      availabilityItem = {
        name: locale === 'bn' ? 'প্রাপ্যতা ঘোষণা' : 'Post Availability',
        href: `/${locale}/availability`,
        exactMatchPrefix: `/${locale}/availability`,
        icon: CalendarDays,
      };
    } else if (role === 'organizer') {
      availabilityItem = {
        name: locale === 'bn' ? 'বক্তার শিডিউল' : 'Schedules',
        href: `/${locale}/availability`,
        exactMatchPrefix: `/${locale}/availability`,
        icon: CalendarDays,
      };
    } else if (role === 'admin') {
      availabilityItem = {
        name: locale === 'bn' ? 'রিপোর্ট' : 'Reports',
        href: `/${locale}/admin`,
        exactMatchPrefix: `/${locale}/admin`,
        icon: BarChart3,
      };
    }

    // 4. Profile
    const profileItem = {
      name: dict.nav.profile,
      href: `/${locale}/profile`,
      exactMatchPrefix: `/${locale}/profile`,
      icon: User,
    };

    return [searchItem, bookingsOrRequestsItem, availabilityItem, profileItem];
  };

  const navItems = getNavItems();

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
              key={item.name + item.href}
              href={item.href}
              prefetch={false}
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
