'use client';

import { Suspense } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Globe } from 'lucide-react';
import { Locale } from '@/i18n/routing';
import clsx from 'clsx';

const LOCALE_COOKIE_NAME = 'NEXT_LOCALE';

interface LanguageSwitcherProps {
  currentLocale: Locale;
  variant?: 'bottom-nav' | 'header';
}

function LanguageSwitcherContent({
  currentLocale,
  variant = 'bottom-nav',
}: LanguageSwitcherProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();

  const targetLocale: Locale = currentLocale === 'bn' ? 'en' : 'bn';
  const label = currentLocale === 'bn' ? 'English' : 'বাংলা';
  const shortLabel = currentLocale === 'bn' ? 'EN' : 'বাং';

  const handleSwitchLanguage = () => {
    // 1. Set persistence cookie for 1 year with SameSite=Lax
    document.cookie = `${LOCALE_COOKIE_NAME}=${targetLocale}; path=/; max-age=31536000; SameSite=Lax`;

    // 2. Compute new pathname with swapped locale prefix
    let newPathname = pathname;
    if (pathname.startsWith(`/${currentLocale}/`)) {
      newPathname = `/${targetLocale}/${pathname.slice(currentLocale.length + 2)}`;
    } else if (pathname === `/${currentLocale}`) {
      newPathname = `/${targetLocale}`;
    } else {
      newPathname = `/${targetLocale}${pathname}`;
    }

    // 3. Preserve query parameters/filters
    const queryString = searchParams?.toString() ? `?${searchParams.toString()}` : '';
    const newUrl = `${newPathname}${queryString}`;

    // 4. Client navigate & refresh
    router.push(newUrl);
    router.refresh();
  };

  if (variant === 'header') {
    return (
      <button
        type="button"
        onClick={handleSwitchLanguage}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50/80 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-900 dark:text-emerald-200 text-xs font-semibold transition-all min-h-[44px] min-w-[44px] active:scale-95 cursor-pointer"
        title={targetLocale === 'en' ? 'Switch to English' : 'বাংলায় পরিবর্তন করুন'}
        aria-label={`Switch language to ${label}`}
      >
        <Globe className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
        <span lang={targetLocale} className="tracking-wide">{label}</span>
      </button>
    );
  }

  // Mobile Bottom Nav 1-Tap button (>= 48x44px touch target)
  return (
    <button
      type="button"
      onClick={handleSwitchLanguage}
      className={clsx(
        'group flex flex-col items-center justify-center min-h-[48px] min-w-[44px] py-1 px-1 rounded-xl transition-all duration-200 active:scale-95 cursor-pointer',
        'text-emerald-700 hover:text-emerald-800 dark:text-emerald-400 dark:hover:text-emerald-300'
      )}
      aria-label={`Switch language to ${label}`}
      title={targetLocale === 'en' ? 'Switch to English' : 'বাংলায় পরিবর্তন করুন'}
    >
      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 shadow-xs group-hover:scale-105 transition-transform border border-emerald-300/60 dark:border-emerald-700/60">
        <span lang={targetLocale} className="text-[11px] font-bold tracking-tighter">
          {shortLabel}
        </span>
      </div>
      <span lang={targetLocale} className="text-[10px] font-semibold leading-tight mt-0.5 tracking-tight text-emerald-800 dark:text-emerald-300">
        {label}
      </span>
    </button>
  );
}

function LanguageSwitcherFallback({
  currentLocale,
  variant = 'bottom-nav',
}: LanguageSwitcherProps) {
  const targetLocale: Locale = currentLocale === 'bn' ? 'en' : 'bn';
  const label = currentLocale === 'bn' ? 'English' : 'বাংলা';
  const shortLabel = currentLocale === 'bn' ? 'EN' : 'বাং';

  if (variant === 'header') {
    return (
      <div
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50/80 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-200 text-xs font-semibold min-h-[44px] min-w-[44px]"
      >
        <Globe className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
        <span lang={targetLocale} className="tracking-wide">{label}</span>
      </div>
    );
  }

  return (
    <div
      className={clsx(
        'group flex flex-col items-center justify-center min-h-[48px] min-w-[44px] py-1 px-1 rounded-xl',
        'text-emerald-700 dark:text-emerald-400'
      )}
    >
      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300/60 dark:border-emerald-700/60">
        <span lang={targetLocale} className="text-[11px] font-bold tracking-tighter">
          {shortLabel}
        </span>
      </div>
      <span lang={targetLocale} className="text-[10px] font-semibold leading-tight mt-0.5 tracking-tight text-emerald-800 dark:text-emerald-300">
        {label}
      </span>
    </div>
  );
}

export default function LanguageSwitcher(props: LanguageSwitcherProps) {
  return (
    <Suspense fallback={<LanguageSwitcherFallback {...props} />}>
      <LanguageSwitcherContent {...props} />
    </Suspense>
  );
}
