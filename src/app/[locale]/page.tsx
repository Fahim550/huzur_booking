import Link from 'next/link';
import Image from 'next/image';
import { Search, ShieldCheck, CalendarCheck, MapPin, Sparkles, ChevronRight, CheckCircle2, Clock } from 'lucide-react';
import { SEED_HUZURS } from '@/lib/data/mockData';
import { POPULAR_DISTRICTS_BN, POPULAR_TOPICS_BN } from '@/types/database';
import { Locale, isValidLocale, DEFAULT_LOCALE } from '@/lib/i18n/config';
import { getDictionary } from '@/lib/i18n/getDictionary';

export const revalidate = 3600; // Next.js ISR: Revalidate cached public page every hour

interface HomePageProps {
  params: Promise<{ locale: string }>;
}

export default async function HomePage({ params }: HomePageProps) {
  const { locale: rawLocale } = await params;
  const locale: Locale = isValidLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE;
  const dict = getDictionary(locale);

  const featuredHuzurs = SEED_HUZURS.slice(0, 4);

  return (
    <div className="space-y-6 sm:space-y-10">
      {/* Hero Section — Mobile-First at 375px */}
      <section className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-emerald-800 via-emerald-900 to-zinc-900 text-white p-5 sm:p-8 shadow-xl shadow-emerald-950/20">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-48 h-48 sm:w-72 sm:h-72 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-48 h-48 sm:w-64 sm:h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-2xl space-y-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-700/60 border border-emerald-500/30 text-emerald-200">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>{dict.hero.badge}</span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-bold tracking-tight leading-snug sm:leading-tight">
            {dict.hero.title}
          </h1>

          <p className="text-sm sm:text-base text-emerald-100/90 leading-relaxed">
            {dict.hero.subtitle}
          </p>

          {/* Quick Search Card */}
          <div className="mt-4 p-3 sm:p-4 rounded-xl bg-white/10 dark:bg-black/30 backdrop-blur-md border border-white/15 shadow-inner">
            <form action={`/${locale}/search`} method="GET" className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div className="relative">
                <label htmlFor="search-query" className="sr-only">{dict.hero.searchPlaceholder}</label>
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-emerald-300">
                  <Search className="w-4 h-4" />
                </div>
                <input
                  id="search-query"
                  type="text"
                  name="q"
                  placeholder={dict.hero.searchPlaceholder}
                  className="w-full pl-9 pr-3 py-2.5 text-sm rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-400 min-h-[44px]"
                />
              </div>

              <div className="relative">
                <label htmlFor="search-district" className="sr-only">{dict.hero.allDistricts}</label>
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-emerald-300">
                  <MapPin className="w-4 h-4" />
                </div>
                <select
                  id="search-district"
                  name="district"
                  className="w-full pl-9 pr-3 py-2.5 text-sm rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-emerald-400 min-h-[44px] appearance-none"
                >
                  <option value="">{dict.hero.allDistricts}</option>
                  {POPULAR_DISTRICTS_BN.map((d) => (
                    <option key={d} value={d}>
                      {dict.reference.districts[d] || d}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-zinc-950 font-semibold text-sm transition-colors shadow-md shadow-amber-950/20 min-h-[44px]"
              >
                <Search className="w-4 h-4" />
                <span>{dict.hero.searchBtn}</span>
              </button>
            </form>

            {/* Popular Topics Chips */}
            <div className="mt-3 flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px] text-emerald-200">
              <span className="shrink-0 text-emerald-300/80">{dict.hero.popularTopicsLabel}</span>
              {POPULAR_TOPICS_BN.slice(0, 3).map((topic) => (
                <Link
                  key={topic}
                  href={`/${locale}/search?topic=${encodeURIComponent(topic)}`}
                  className="shrink-0 px-2 py-0.5 rounded-md bg-white/10 hover:bg-white/20 transition-colors"
                >
                  {dict.reference.topics[topic] || topic}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Feature Highlights Grid */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-emerald-100 dark:border-emerald-950/60 shadow-xs flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center text-emerald-700 dark:text-emerald-300 shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div className="space-y-0.5">
            <h3 className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">
              {dict.trust.conflictTitle}
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
              {dict.trust.conflictDesc}
            </p>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-emerald-100 dark:border-emerald-950/60 shadow-xs flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center text-emerald-700 dark:text-emerald-300 shrink-0">
            <CalendarCheck className="w-5 h-5" />
          </div>
          <div className="space-y-0.5">
            <h3 className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">
              {dict.trust.calendarTitle}
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
              {dict.trust.calendarDesc}
            </p>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-emerald-100 dark:border-emerald-950/60 shadow-xs flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950/60 flex items-center justify-center text-amber-700 dark:text-amber-300 shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div className="space-y-0.5">
            <h3 className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">
              {dict.trust.approvalTitle}
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
              {dict.trust.approvalDesc}
            </p>
          </div>
        </div>
      </section>

      {/* Featured Huzurs Section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <span>{dict.speakers.featuredTitle}</span>
              <span className="text-xs font-normal text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                {dict.speakers.verifiedBadge}
              </span>
            </h2>
            <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
              {dict.speakers.featuredSubtitle}
            </p>
          </div>

          <Link
            href={`/${locale}/search`}
            className="inline-flex items-center gap-1 text-xs sm:text-sm font-semibold text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 p-2 min-h-[44px]"
          >
            <span>{dict.speakers.seeAll}</span>
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Responsive Huzur Cards Grid — strictly 375px friendly */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {featuredHuzurs.map((huzur) => (
            <div
              key={huzur.id}
              className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200/80 dark:border-zinc-800/80 p-3.5 sm:p-4 flex flex-col justify-between hover:shadow-md hover:border-emerald-300 dark:hover:border-emerald-800 transition-all group"
            >
              <div className="space-y-3">
                {/* Huzur Avatar & Title */}
                <div className="flex items-center gap-3">
                  <div className="relative w-14 h-14 rounded-full overflow-hidden bg-emerald-100 dark:bg-emerald-950 shrink-0 border-2 border-emerald-500/20">
                    <Image
                      src={huzur.avatar_url || 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=200&auto=format&fit=crop&q=80'}
                      alt={huzur.full_name}
                      fill
                      sizes="56px"
                      className="object-cover group-hover:scale-105 transition-transform"
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1">
                      <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                        {huzur.huzur_profile.title}
                      </span>
                      {huzur.huzur_profile.verified && (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      )}
                    </div>

                    <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100 truncate">
                      {huzur.full_name}
                    </h3>

                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
                      {huzur.huzur_profile.designation || huzur.huzur_profile.madrasa_or_institution}
                    </p>
                  </div>
                </div>

                {/* Topics tags (Reference translated) */}
                <div className="flex flex-wrap gap-1">
                  {huzur.huzur_profile.topics.slice(0, 2).map((t: string) => (
                    <span
                      key={t}
                      className="text-[10px] bg-slate-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 px-1.5 py-0.5 rounded-md"
                    >
                      {(dict.reference.topics as Record<string, string>)[t] || t}
                    </span>
                  ))}
                  {huzur.huzur_profile.topics.length > 2 && (
                    <span className="text-[10px] text-zinc-400 px-1">
                      +{huzur.huzur_profile.topics.length - 2}
                    </span>
                  )}
                </div>

                {/* Location & Hadya */}
                <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 text-xs flex items-center justify-between text-zinc-600 dark:text-zinc-400">
                  <div className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-zinc-400" />
                    <span>{dict.reference.districts[huzur.district] || huzur.district}</span>
                  </div>
                  <div className="font-medium text-emerald-700 dark:text-emerald-400">
                    {huzur.huzur_profile.base_hadya_range}
                  </div>
                </div>
              </div>

              {/* Action Button — strictly >= 44x44px */}
              <div className="mt-3.5 pt-2">
                <Link
                  href={`/${locale}/huzur/${huzur.id}`}
                  className="w-full flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 active:bg-emerald-200 dark:bg-emerald-950/80 dark:hover:bg-emerald-900 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/80 transition-colors min-h-[44px]"
                >
                  <CalendarCheck className="w-3.5 h-3.5" />
                  <span>{dict.speakers.viewProfileAndBook}</span>
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Quick Bottom Banner for Mahfil Organizers */}
      <section className="p-4 sm:p-6 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/60 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="space-y-1 text-center sm:text-left">
          <h3 className="font-bold text-base text-emerald-950 dark:text-emerald-200">
            {dict.mahfilBanner.organizerQuestion}
          </h3>
          <p className="text-xs sm:text-sm text-emerald-800/80 dark:text-emerald-400/90 leading-relaxed">
            {dict.mahfilBanner.organizerDesc}
          </p>
        </div>

        <Link
          href={`/${locale}/search`}
          className="shrink-0 px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs sm:text-sm shadow-md shadow-emerald-900/20 active:scale-95 transition-all min-h-[44px] flex items-center justify-center"
        >
          {dict.mahfilBanner.ctaBtn}
        </Link>
      </section>
    </div>
  );
}
