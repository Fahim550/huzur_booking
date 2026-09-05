'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useInfiniteQuery } from '@tanstack/react-query';
import {
  Search,
  MapPin,
  CalendarCheck,
  RotateCcw,
  ArrowRight,
  ShieldCheck,
  Building2,
  Loader2,
} from 'lucide-react';
import type { Division, District, Upazila, Specialty } from '@/types/database';
import type { SearchHuzurResult, SearchHuzursResponse, SearchHuzursParams } from '@/lib/queries/searchHuzurs';
import { Locale } from '@/lib/i18n/config';

interface SearchClientProps {
  initialHuzurs: SearchHuzurResult[];
  initialTotal: number;
  initialFilters: SearchHuzursParams;
  divisions: Division[];
  districts: District[];
  upazilas: Upazila[];
  specialties: Specialty[];
  locale: Locale;
}

export default function SearchClient({
  initialHuzurs,
  initialTotal,
  initialFilters,
  divisions,
  districts,
  upazilas,
  specialties,
  locale,
}: SearchClientProps) {
  const isBn = locale === 'bn';

  // Filter States
  const [divisionId, setDivisionId] = useState<number | undefined>(initialFilters.divisionId);
  const [districtId, setDistrictId] = useState<number | undefined>(initialFilters.districtId);
  const [upazilaId, setUpazilaId] = useState<number | undefined>(initialFilters.upazilaId);
  const [startDate, setStartDate] = useState<string>(initialFilters.startDate || '');
  const [endDate, setEndDate] = useState<string>(initialFilters.endDate || '');
  const [specialty, setSpecialty] = useState<string>(initialFilters.specialty || '');
  const [searchTerm, setSearchTerm] = useState<string>(initialFilters.q || '');

  // Cascading dropdown filtering
  const availableDistricts = useMemo(() => {
    if (!divisionId) return districts;
    return districts.filter((d) => d.division_id === Number(divisionId));
  }, [districts, divisionId]);

  const availableUpazilas = useMemo(() => {
    if (!districtId) return [];
    return upazilas.filter((u) => u.district_id === Number(districtId));
  }, [upazilas, districtId]);

  // Handle cascading resets
  const handleDivisionChange = (newDivisionId: number | undefined) => {
    setDivisionId(newDivisionId);
    setDistrictId(undefined);
    setUpazilaId(undefined);
  };

  const handleDistrictChange = (newDistrictId: number | undefined) => {
    setDistrictId(newDistrictId);
    setUpazilaId(undefined);
  };

  const resetFilters = () => {
    setDivisionId(undefined);
    setDistrictId(undefined);
    setUpazilaId(undefined);
    setStartDate('');
    setEndDate('');
    setSpecialty('');
    setSearchTerm('');
  };

  const activeFilterCount = [
    divisionId,
    districtId,
    upazilaId,
    startDate,
    endDate,
    specialty,
    searchTerm,
  ].filter(Boolean).length;

  // Query Key for TanStack Query
  const queryKey = useMemo(
    () => [
      'huzurs-search',
      {
        divisionId,
        districtId,
        upazilaId,
        startDate,
        endDate,
        specialty,
        q: searchTerm,
      },
    ],
    [divisionId, districtId, upazilaId, startDate, endDate, specialty, searchTerm]
  );

  // TanStack Query useInfiniteQuery with 12 items per page
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useInfiniteQuery<SearchHuzursResponse>({
    queryKey,
    queryFn: async ({ pageParam = 1 }) => {
      const params = new URLSearchParams();
      params.set('page', String(pageParam));
      params.set('limit', '12');
      if (divisionId) params.set('divisionId', String(divisionId));
      if (districtId) params.set('districtId', String(districtId));
      if (upazilaId) params.set('upazilaId', String(upazilaId));
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);
      if (specialty) params.set('specialty', specialty);
      if (searchTerm) params.set('q', searchTerm);

      const res = await fetch(`/api/huzurs/search?${params.toString()}`);
      if (!res.ok) {
        throw new Error('Failed to fetch huzurs');
      }
      return res.json();
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      if (lastPage.page < lastPage.totalPages) {
        return lastPage.page + 1;
      }
      return undefined;
    },
    // Hydrate with initial data only when matching default initial filters
    initialData:
      activeFilterCount === 0
        ? {
            pages: [
              {
                huzurs: initialHuzurs,
                total: initialTotal,
                page: 1,
                limit: 12,
                totalPages: Math.ceil(initialTotal / 12) || 1,
              },
            ],
            pageParams: [1],
          }
        : undefined,
  });

  // Flattened huzurs list across all pages
  const allHuzurs: SearchHuzurResult[] = useMemo(() => {
    if (!data?.pages) return initialHuzurs;
    return data.pages.flatMap((page) => page.huzurs);
  }, [data, initialHuzurs]);

  const totalResults = data?.pages[0]?.total ?? initialTotal;

  // Infinite Scroll Sentinel IntersectionObserver
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!sentinelRef.current || !hasNextPage || isFetchingNextPage) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          fetchNextPage();
        }
      },
      { rootMargin: '200px' }
    );

    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  return (
    <div className="space-y-6">
      {/* Search Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-zinc-200 dark:border-zinc-800">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <span>{isBn ? 'সম্মানিত বক্তা অনুসন্ধান' : 'Find Islamic Speakers'}</span>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
              {isBn ? `${totalResults} জন প্রাপ্ত` : `${totalResults} Available`}
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
            {isBn
              ? 'বিভাগ, জেলা, তারিখ ও আলোচনার বিষয় অনুযায়ী আপনার মাহফিলের বক্তা নির্বাচন করুন'
              : 'Filter by division, district, date range, and specialty for your Mahfil'}
          </p>
        </div>

        {activeFilterCount > 0 && (
          <button
            onClick={resetFilters}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 rounded-lg border border-rose-200 dark:border-rose-900 hover:bg-rose-100 transition-colors w-fit min-h-[38px]"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{isBn ? 'ফিল্টার রিসেট' : 'Reset Filters'}</span>
          </button>
        )}
      </div>

      {/* Cascading Filter Controls Card */}
      <div className="bg-white dark:bg-zinc-900 p-4 sm:p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-4">
        {/* Search Input Bar */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={
              isBn
                ? 'বক্তার নাম, প্রতিষ্ঠান বা আলোচনার বিষয় লিখুন...'
                : 'Search by speaker name, institution, or keyword...'
            }
            className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl bg-slate-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 min-h-[44px]"
          />
        </div>

        {/* Cascading Dropdowns: Division -> District -> Upazila */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Division Selector */}
          <div>
            <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
              {isBn ? '১. বিভাগ নির্বাচন' : '1. Select Division'}
            </label>
            <select
              value={divisionId ?? ''}
              onChange={(e) =>
                handleDivisionChange(e.target.value ? Number(e.target.value) : undefined)
              }
              className="w-full px-3 py-2 text-sm rounded-xl bg-slate-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 min-h-[44px]"
            >
              <option value="">{isBn ? 'সকল বিভাগ' : 'All Divisions'}</option>
              {divisions.map((div) => (
                <option key={div.id} value={div.id}>
                  {isBn ? div.bn_name || div.name_bn || div.name : div.name_en || div.name}
                </option>
              ))}
            </select>
          </div>

          {/* District Selector (Cascaded) */}
          <div>
            <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
              {isBn ? '২. জেলা নির্বাচন' : '2. Select District'}
            </label>
            <select
              value={districtId ?? ''}
              onChange={(e) =>
                handleDistrictChange(e.target.value ? Number(e.target.value) : undefined)
              }
              className="w-full px-3 py-2 text-sm rounded-xl bg-slate-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 min-h-[44px]"
            >
              <option value="">{isBn ? 'সকল জেলা' : 'All Districts'}</option>
              {availableDistricts.map((dst) => (
                <option key={dst.id} value={dst.id}>
                  {isBn ? dst.bn_name || dst.name_bn || dst.name : dst.name_en || dst.name}
                </option>
              ))}
            </select>
          </div>

          {/* Upazila Selector (Cascaded) */}
          <div>
            <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
              {isBn ? '৩. উপজেলা / এলাকা' : '3. Select Upazila'}
            </label>
            <select
              value={upazilaId ?? ''}
              disabled={!districtId}
              onChange={(e) =>
                setUpazilaId(e.target.value ? Number(e.target.value) : undefined)
              }
              className="w-full px-3 py-2 text-sm rounded-xl bg-slate-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
            >
              <option value="">
                {!districtId
                  ? isBn
                    ? 'আগে জেলা নির্বাচন করুন'
                    : 'Select district first'
                  : isBn
                  ? 'সকল উপজেলা'
                  : 'All Upazilas'}
              </option>
              {availableUpazilas.map((upz) => (
                <option key={upz.id} value={upz.id}>
                  {isBn ? upz.bn_name || upz.name_bn || upz.name : upz.name_en || upz.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Date Range & Specialty Filter */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 border-t border-zinc-100 dark:border-zinc-800">
          <div>
            <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
              {isBn ? 'মাহফিলের শুরুর তারিখ' : 'Start Date'}
            </label>
            <div className="relative">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-xl bg-slate-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 min-h-[44px]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
              {isBn ? 'সমাপ্তির তারিখ' : 'End Date'}
            </label>
            <div className="relative">
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-xl bg-slate-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 min-h-[44px]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
              {isBn ? 'বিশেষত্ব / আলোচনার বিষয়' : 'Specialty'}
            </label>
            <select
              value={specialty}
              onChange={(e) => setSpecialty(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-xl bg-slate-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 min-h-[44px]"
            >
              <option value="">{isBn ? 'সকল বিষয়' : 'All Specialties'}</option>
              {specialties.map((spec) => (
                <option key={spec.id} value={isBn ? spec.name_bn : spec.name_en}>
                  {isBn ? spec.name_bn : spec.name_en}
                </option>
              ))}
              {/* Common topics fallback if specialties table is sparse */}
              {specialties.length === 0 && (
                <>
                  <option value="তাফসীরুল কুরআন">তাফসীরুল কুরআন (Tafseer)</option>
                  <option value="সিরাতুন্নবী (সা.)">সিরাতুন্নবী (সা.) (Seerat)</option>
                  <option value="হাদীস ও সুন্নাহ">হাদীস ও সুন্নাহ (Hadith)</option>
                  <option value="সমাজ সংস্কার">সমাজ সংস্কার (Social Reform)</option>
                  <option value="পারিবারিক জীবন">পারিবারিক জীবন (Family)</option>
                </>
              )}
            </select>
          </div>
        </div>
      </div>

      {/* Search Results Grid */}
      {isLoading ? (
        <div className="py-16 text-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-600 mx-auto" />
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {isBn ? 'বক্তাদের তালিকা লোড হচ্ছে...' : 'Loading speakers list...'}
          </p>
        </div>
      ) : allHuzurs.length === 0 ? (
        <div className="py-16 text-center bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-8 space-y-3">
          <div className="w-12 h-12 rounded-full bg-amber-50 dark:bg-amber-950/50 text-amber-600 flex items-center justify-center mx-auto">
            <Search className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-100">
            {isBn ? 'কোনো বক্তা খুঁজে পাওয়া যায়নি' : 'No speakers found'}
          </h3>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 max-w-md mx-auto">
            {isBn
              ? 'আপনার নির্বাচিত বিভাগ বা জেলার ফিল্টারে কোনো ফলাফল মেলেনি। অনুগ্রহ করে অন্য জেলা বা ফিল্টার রিসেট করে চেষ্টা করুন।'
              : 'No speakers match your chosen filters. Try broadening your location or resetting filters.'}
          </p>
          <button
            onClick={resetFilters}
            className="mt-2 px-4 py-2 rounded-xl bg-emerald-700 text-white text-xs font-semibold hover:bg-emerald-800 transition-colors"
          >
            {isBn ? 'সকল ফিল্টার রিসেট করুন' : 'Reset All Filters'}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {allHuzurs.map((huzur) => {
            const districtName =
              isBn
                ? huzur.home_district?.bn_name || huzur.home_district?.name || 'বাংলাদেশ'
                : huzur.home_district?.name || 'Bangladesh';

            return (
              <div
                key={huzur.id}
                className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/90 dark:border-zinc-800 shadow-xs hover:shadow-md hover:border-emerald-500/40 transition-all flex flex-col justify-between overflow-hidden group"
              >
                <div className="p-4 sm:p-5 space-y-4">
                  {/* Top: Avatar & Verification */}
                  <div className="flex items-start gap-3.5">
                    <div className="relative w-16 h-16 sm:w-18 sm:h-18 rounded-full overflow-hidden shrink-0 border-2 border-emerald-500/30 shadow-sm bg-emerald-50 dark:bg-emerald-950">
                      <Image
                        src={
                          huzur.photo_url ||
                          'https://images.unsplash.com/photo-1544717305-2782549b5136?w=400&auto=format&fit=crop&q=80'
                        }
                        alt={huzur.name}
                        fill
                        sizes="72px"
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>

                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {huzur.is_verified && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                            <ShieldCheck className="w-3 h-3 text-emerald-600" />
                            <span>{isBn ? 'যাচাইকৃত' : 'Verified'}</span>
                          </span>
                        )}
                        <span className="inline-flex items-center gap-1 text-[11px] text-zinc-500 dark:text-zinc-400">
                          <MapPin className="w-3 h-3 text-zinc-400" />
                          <span>{districtName}</span>
                        </span>
                      </div>

                      <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100 truncate group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">
                        {huzur.name}
                      </h2>

                      {huzur.institution && (
                        <p className="text-xs text-zinc-600 dark:text-zinc-400 line-clamp-1 flex items-center gap-1">
                          <Building2 className="w-3 h-3 text-zinc-400 shrink-0" />
                          <span>{huzur.institution}</span>
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Availability Post Highlight Badge */}
                  {huzur.has_availability_post && (
                    <div className="p-2.5 rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/60 dark:to-teal-950/40 border border-emerald-200/80 dark:border-emerald-800/80 text-xs text-emerald-900 dark:text-emerald-200 space-y-1">
                      <div className="flex items-center gap-1.5 font-bold text-emerald-800 dark:text-emerald-300">
                        <CalendarCheck className="w-3.5 h-3.5 text-emerald-600" />
                        <span>{isBn ? 'উন্মুক্ত সময়সূচি রয়েছে' : 'Open Availability Broadcast'}</span>
                      </div>
                      <p className="text-[11px] text-emerald-800/90 dark:text-emerald-300/90 line-clamp-2">
                        {huzur.matching_availability_post?.note ||
                          (huzur.all_availability_posts && huzur.all_availability_posts[0]?.note) ||
                          (isBn ? 'এই এলাকায় নির্ধারিত তারিখে মাহফিলের জন্য উন্মুক্ত।' : 'Available for speaking events in this area.')}
                      </p>
                    </div>
                  )}

                  {/* Specialties Pills */}
                  {huzur.specialties && huzur.specialties.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {huzur.specialties.slice(0, 3).map((spec, i) => (
                        <span
                          key={i}
                          className="text-[11px] px-2 py-0.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-medium"
                        >
                          {spec}
                        </span>
                      ))}
                      {huzur.specialties.length > 3 && (
                        <span className="text-[11px] px-1.5 py-0.5 rounded-lg text-zinc-400 font-medium">
                          +{huzur.specialties.length - 3}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Card Action Link */}
                <div className="p-3.5 bg-slate-50/80 dark:bg-zinc-800/50 border-t border-zinc-100 dark:border-zinc-800/80">
                  <Link
                    href={`/${locale}/huzur/${huzur.id}`}
                    className="w-full flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 text-white font-semibold text-xs transition-all shadow-xs min-h-[44px]"
                  >
                    <span>{isBn ? 'প্রোফাইল ও বুকিং আবেদন' : 'View Profile & Request Booking'}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Infinite Scroll Mobile Sentinel / Load More Button */}
      <div ref={sentinelRef} className="py-6 text-center">
        {isFetchingNextPage ? (
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs font-semibold text-emerald-700 dark:text-emerald-400 shadow-sm">
            <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
            <span>{isBn ? 'আরও বক্তা লোড হচ্ছে...' : 'Loading more speakers...'}</span>
          </div>
        ) : hasNextPage ? (
          <button
            onClick={() => fetchNextPage()}
            className="px-5 py-2.5 rounded-xl bg-white hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-xs font-semibold text-zinc-700 dark:text-zinc-300 shadow-xs transition-colors min-h-[44px]"
          >
            {isBn ? 'আরও দেখুন (Load More)' : 'Load More Speakers'}
          </button>
        ) : allHuzurs.length > 0 ? (
          <p className="text-xs text-zinc-400">
            {isBn ? '— সকল ফলাফল দেখানো হয়েছে —' : '— All results loaded —'}
          </p>
        ) : null}
      </div>
    </div>
  );
}
