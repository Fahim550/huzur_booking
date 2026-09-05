import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Locale, isValidLocale, DEFAULT_LOCALE } from '@/lib/i18n/config';
import { getDictionary } from '@/lib/i18n/getDictionary';
import HuzurDashboardHomeClient from '@/components/dashboard/HuzurDashboardHomeClient';

interface HuzurDashboardProps {
  params: Promise<{ locale: string }>;
}

export default async function HuzurDashboard({ params }: HuzurDashboardProps) {
  const { locale: rawLocale } = await params;
  const locale: Locale = isValidLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE;
  const dict = getDictionary(locale);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 pb-24 pt-4">
      <div className="max-w-5xl mx-auto px-3.5 sm:px-6">
        {/* Back Link */}
        <Link
          href={`/${locale}/my-bookings`}
          className="inline-flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400 hover:text-emerald-700 dark:hover:text-emerald-400 mb-4 transition-colors min-h-[44px]"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{locale === 'bn' ? 'ফিরে যান' : 'Back'}</span>
        </Link>

        {/* Dynamic Huzur Dashboard Experience */}
        <HuzurDashboardHomeClient locale={locale} />
      </div>
    </div>
  );
}
