import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { MapPin, Calendar, Clock, Sparkles, ChevronLeft, ShieldCheck, FileCheck } from 'lucide-react';
import { SEED_HUZURS } from '@/lib/data/mockData';
import { Locale, isValidLocale, DEFAULT_LOCALE } from '@/lib/i18n/config';
import { getDictionary } from '@/lib/i18n/getDictionary';

export const revalidate = 3600; // Next.js ISR: Revalidate cached profile pages every hour

interface HuzurProfilePageProps {
  params: Promise<{
    locale: string;
    id: string;
  }>;
}

export default async function HuzurProfilePage({ params }: HuzurProfilePageProps) {
  const { locale: rawLocale, id } = await params;
  const locale: Locale = isValidLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE;
  const dict = getDictionary(locale);

  const huzur = SEED_HUZURS.find((h) => h.id === id);

  if (!huzur) {
    notFound();
  }

  const districtDisplay = dict.reference.districts[huzur.district] || huzur.district;
  const divisionDisplay = dict.reference.divisions[huzur.division] || huzur.division;

  return (
    <div className="space-y-6">
      {/* Back button */}
      <Link
        href={`/${locale}/search`}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-800 dark:text-emerald-300 hover:text-emerald-950 p-1 min-h-[44px]"
      >
        <ChevronLeft className="w-4 h-4" />
        <span>{dict.huzurDetail.backBtn}</span>
      </Link>

      {/* Main Profile Header Card */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 sm:p-7 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6">
          <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-full overflow-hidden bg-emerald-100 dark:bg-emerald-950 shrink-0 border-3 border-emerald-500/30 shadow-md">
            <Image
              src={huzur.avatar_url || 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=400&auto=format&fit=crop&q=80'}
              alt={huzur.full_name}
              fill
              sizes="112px"
              priority
              className="object-cover"
            />
          </div>

          <div className="space-y-1.5 min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                {huzur.huzur_profile.title}
              </span>
              {huzur.huzur_profile.verified && (
                <span className="inline-flex items-center gap-1 text-xs text-emerald-700 dark:text-emerald-300 font-medium">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  {dict.huzurDetail.verifiedSpeaker}
                </span>
              )}
            </div>

            <h1 className="text-xl sm:text-3xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
              {huzur.full_name}
            </h1>

            <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-300 font-medium">
              {huzur.huzur_profile.designation} • {huzur.huzur_profile.madrasa_or_institution}
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-zinc-500 dark:text-zinc-400">
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-zinc-400" />
                <span>{districtDisplay}, {divisionDisplay}</span>
              </span>
              <span>•</span>
              <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                {dict.huzurDetail.hadyaRange} {huzur.huzur_profile.base_hadya_range}
              </span>
            </div>
          </div>
        </div>

        {/* Short Bio (User-entered text preserved as-is) */}
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800 text-xs sm:text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
          {huzur.bio || huzur.huzur_profile.short_bio_bn}
        </div>

        {/* Topics of Discussion */}
        <div className="space-y-2">
          <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
            {dict.huzurDetail.topicsTitle}
          </h2>
          <div className="flex flex-wrap gap-1.5">
            {huzur.huzur_profile.topics.map((topic) => (
              <span
                key={topic}
                className="text-xs bg-emerald-50 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 px-2.5 py-1 rounded-lg"
              >
                {dict.reference.topics[topic] || topic}
              </span>
            ))}
          </div>
        </div>

        {/* Primary Action Button — strictly 44x44px */}
        <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 flex flex-col sm:flex-row gap-3">
          <Link
            href={`/${locale}/availability?huzur=${huzur.id}`}
            className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 text-white font-semibold text-sm transition-all shadow-md shadow-emerald-900/20 min-h-[48px]"
          >
            <Calendar className="w-4 h-4" />
            <span>{dict.huzurDetail.bookAndCheckBtn}</span>
          </Link>
          <a
            href="tel:+8801700000000"
            className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 font-semibold text-sm transition-colors min-h-[48px]"
          >
            <Clock className="w-4 h-4 text-emerald-600" />
            <span>{dict.huzurDetail.callCoordinatorBtn}</span>
          </a>
        </div>
      </div>

      {/* Booking Guidelines & Assurance */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-2">
          <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>{dict.huzurDetail.guidelinesTitle}</span>
          </h3>
          <ul className="text-xs text-zinc-600 dark:text-zinc-400 space-y-1.5 list-disc list-inside leading-relaxed">
            <li>{dict.huzurDetail.guideline1}</li>
            <li>{dict.huzurDetail.guideline2}</li>
            <li>{dict.huzurDetail.guideline3}</li>
          </ul>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-2">
          <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
            <FileCheck className="w-4 h-4 text-emerald-600" />
            <span>{dict.huzurDetail.conflictTitle}</span>
          </h3>
          <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
            {dict.huzurDetail.conflictDesc}
          </p>
        </div>
      </div>
    </div>
  );
}
