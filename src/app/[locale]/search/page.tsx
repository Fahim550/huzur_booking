import Link from 'next/link';
import Image from 'next/image';
import { Search, MapPin, CheckCircle2, CalendarCheck, SlidersHorizontal } from 'lucide-react';
import { SEED_HUZURS } from '@/lib/data/mockData';
import { POPULAR_DISTRICTS_BN, POPULAR_TOPICS_BN } from '@/types/database';
import { Locale, isValidLocale, DEFAULT_LOCALE } from '@/lib/i18n/config';
import { getDictionary } from '@/lib/i18n/getDictionary';

export const revalidate = 3600; // Next.js ISR

interface SearchPageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    q?: string;
    district?: string;
    topic?: string;
    page?: string;
  }>;
}

export default async function SearchPage({ params, searchParams }: SearchPageProps) {
  const { locale: rawLocale } = await params;
  const locale: Locale = isValidLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE;
  const dict = getDictionary(locale);

  const { q = '', district = '', topic = '', page = '1' } = await searchParams;
  const currentPage = parseInt(page, 10) || 1;
  const pageSize = 6;

  // Filter speakers based on search parameters
  const filteredHuzurs = SEED_HUZURS.filter((h) => {
    const translatedDistrict = dict.reference.districts[h.district] || h.district;
    const translatedTopics = h.huzur_profile.topics.map((t) => dict.reference.topics[t] || t);

    const matchesQuery =
      !q ||
      h.full_name.toLowerCase().includes(q.toLowerCase()) ||
      translatedTopics.some((t) => t.toLowerCase().includes(q.toLowerCase())) ||
      h.huzur_profile.topics.some((t) => t.toLowerCase().includes(q.toLowerCase())) ||
      (h.huzur_profile.designation && h.huzur_profile.designation.toLowerCase().includes(q.toLowerCase()));

    const matchesDistrict =
      !district || h.district === district || translatedDistrict === district;

    const matchesTopic =
      !topic ||
      h.huzur_profile.topics.some((t) => t === topic) ||
      translatedTopics.some((t) => t === topic);

    return matchesQuery && matchesDistrict && matchesTopic;
  });

  const totalResults = filteredHuzurs.length;
  const totalPages = Math.ceil(totalResults / pageSize) || 1;
  const paginatedHuzurs = filteredHuzurs.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  return (
    <div className="space-y-6">
      {/* Header & Filter Summary */}
      <div className="space-y-2">
        <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
          <span>{dict.speakers.searchTitle}</span>
          <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
            {dict.speakers.resultsCount(totalResults)}
          </span>
        </h1>
        <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
          {dict.speakers.searchSubtitle}
        </p>
      </div>

      {/* Filter Form — Mobile Friendly */}
      <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 shadow-xs space-y-3">
        <form method="GET" action={`/${locale}/search`} className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              name="q"
              defaultValue={q}
              placeholder={dict.hero.searchPlaceholder}
              className="w-full pl-9 pr-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 min-h-[44px]"
            />
          </div>

          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-400">
              <MapPin className="w-4 h-4" />
            </div>
            <select
              name="district"
              defaultValue={district}
              className="w-full pl-9 pr-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 min-h-[44px]"
            >
              <option value="">{dict.hero.allDistricts}</option>
              {POPULAR_DISTRICTS_BN.map((d) => (
                <option key={d} value={d}>
                  {dict.reference.districts[d] || d}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-2">
            <select
              name="topic"
              defaultValue={topic}
              className="flex-1 px-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 min-h-[44px]"
            >
              <option value="">{dict.hero.allTopics}</option>
              {POPULAR_TOPICS_BN.map((t) => (
                <option key={t} value={t}>
                  {dict.reference.topics[t] || t}
                </option>
              ))}
            </select>

            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm transition-colors min-h-[44px] flex items-center gap-1.5"
            >
              <SlidersHorizontal className="w-4 h-4" />
              <span>{dict.hero.filterBtn}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Results List */}
      {paginatedHuzurs.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 space-y-3">
          <p className="text-base font-semibold text-zinc-700 dark:text-zinc-300">
            {dict.speakers.noResults}
          </p>
          <p className="text-xs text-zinc-500 max-w-sm mx-auto">
            {dict.speakers.noResultsDesc}
          </p>
          <Link
            href={`/${locale}/search`}
            className="inline-flex items-center px-4 py-2 rounded-lg text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 min-h-[44px]"
          >
            {dict.speakers.resetFilter}
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {paginatedHuzurs.map((huzur) => (
            <div
              key={huzur.id}
              className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 flex flex-col justify-between hover:shadow-md transition-shadow"
            >
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="relative w-14 h-14 rounded-full overflow-hidden bg-emerald-100 dark:bg-emerald-950 shrink-0 border-2 border-emerald-500/20">
                    <Image
                      src={huzur.avatar_url || 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=200&auto=format&fit=crop&q=80'}
                      alt={huzur.full_name}
                      fill
                      sizes="56px"
                      className="object-cover"
                    />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1">
                      <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                        {huzur.huzur_profile.title}
                      </span>
                      {huzur.huzur_profile.verified && (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      )}
                    </div>
                    <h2 className="font-bold text-sm text-zinc-900 dark:text-zinc-100 truncate">
                      {huzur.full_name}
                    </h2>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
                      {huzur.huzur_profile.designation || huzur.huzur_profile.madrasa_or_institution}
                    </p>
                  </div>
                </div>

                <p className="text-xs text-zinc-600 dark:text-zinc-400 line-clamp-2 leading-relaxed">
                  {huzur.huzur_profile.short_bio_bn || huzur.bio}
                </p>

                <div className="flex flex-wrap gap-1">
                  {huzur.huzur_profile.topics.map((t) => (
                    <span
                      key={t}
                      className="text-[10px] bg-slate-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 px-1.5 py-0.5 rounded-md"
                    >
                      {dict.reference.topics[t] || t}
                    </span>
                  ))}
                </div>

                <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 text-xs flex items-center justify-between">
                  <div className="flex items-center gap-1 text-zinc-500">
                    <MapPin className="w-3.5 h-3.5" />
                    <span>{dict.reference.districts[huzur.district] || huzur.district}</span>
                  </div>
                  <div className="font-semibold text-emerald-700 dark:text-emerald-400">
                    {dict.speakers.hadyaLabel} {huzur.huzur_profile.base_hadya_range}
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-2">
                <Link
                  href={`/${locale}/huzur/${huzur.id}`}
                  className="w-full flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white transition-colors min-h-[44px]"
                >
                  <CalendarCheck className="w-3.5 h-3.5" />
                  <span>{dict.speakers.viewProfileAndBook}</span>
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <Link
              key={p}
              href={`/${locale}/search?page=${p}&q=${encodeURIComponent(q)}&district=${encodeURIComponent(district)}&topic=${encodeURIComponent(topic)}`}
              className={`min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-xs font-semibold transition-colors ${
                p === currentPage
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800'
              }`}
            >
              {p}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
