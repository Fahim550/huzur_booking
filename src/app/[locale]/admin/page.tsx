'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Clock,
  MapPin,
  Phone,
  BarChart3,
  TrendingUp,
  Users,
  Calendar,
  AlertTriangle,
  RotateCw,
  ExternalLink,
  Search,
  Check,
  X,
  Building,
  UserCheck,
} from 'lucide-react';
import { Locale, isValidLocale, DEFAULT_LOCALE } from '@/lib/i18n/config';
import { getDictionary } from '@/lib/i18n/getDictionary';
import { getClientUser, AuthSessionUser } from '@/lib/auth';
import { AdminMetrics, HuzurVerificationItem } from '@/lib/queries/admin';

export default function AdminDashboardPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const rawLocale = params?.locale as string;
  const locale: Locale = isValidLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE;
  const dict = getDictionary(locale);

  const [currentUser, setCurrentUser] = useState<AuthSessionUser | null>(null);
  const [activeTab, setActiveTab] = useState<'queue' | 'verified' | 'all'>('queue');
  const [actingHuzurId, setActingHuzurId] = useState<string | null>(null);
  const [searchFilter, setSearchFilter] = useState('');

  useEffect(() => {
    getClientUser().then((u) => {
      if (u) setCurrentUser(u);
    });
  }, []);

  // Demo Admin Switcher for local development & testing convenience
  const enableDemoAdmin = () => {
    const adminUser: AuthSessionUser = {
      id: 'demo-admin-root',
      phone: '+8801700000000',
      role: 'admin',
      name: 'সিস্টেম অ্যাডমিনিস্ট্রেটর',
      isDemo: true,
    };
    document.cookie = `hb_demo_auth_session=${encodeURIComponent(JSON.stringify(adminUser))}; path=/; max-age=604800; SameSite=Lax`;
    localStorage.setItem('hb_current_user', JSON.stringify(adminUser));
    setCurrentUser(adminUser);
    window.location.reload();
  };

  // 1. Fetch Basic Reporting Aggregates
  const {
    data: metricsData,
    isLoading: isLoadingMetrics,
    refetch: refetchMetrics,
  } = useQuery<AdminMetrics>({
    queryKey: ['admin-metrics'],
    queryFn: async () => {
      const res = await fetch('/api/admin/reports');
      if (!res.ok) throw new Error('Failed to fetch admin metrics');
      const json = await res.json();
      return json.data;
    },
    staleTime: 30000,
  });

  // 2. Fetch Huzurs for Verification Queue
  const {
    data: huzurs = [],
    isLoading: isLoadingHuzurs,
    refetch: refetchHuzurs,
  } = useQuery<HuzurVerificationItem[]>({
    queryKey: ['admin-huzur-queue'],
    queryFn: async () => {
      const res = await fetch('/api/admin/huzurs');
      if (!res.ok) throw new Error('Failed to fetch huzurs queue');
      const json = await res.json();
      return json.data;
    },
    staleTime: 15000,
  });

  // Mutation to Approve / Reject Huzur Verification Flag
  const verifyMutation = useMutation({
    mutationFn: async ({ huzurId, isVerified }: { huzurId: string; isVerified: boolean }) => {
      const res = await fetch('/api/admin/huzurs', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ huzur_id: huzurId, is_verified: isVerified }),
      });
      if (!res.ok) throw new Error('Failed to update verification status');
      return res.json();
    },
    onMutate: async ({ huzurId, isVerified }) => {
      setActingHuzurId(huzurId);
      await queryClient.cancelQueries({ queryKey: ['admin-huzur-queue'] });
      const previous = queryClient.getQueryData<HuzurVerificationItem[]>(['admin-huzur-queue']);

      if (previous) {
        queryClient.setQueryData<HuzurVerificationItem[]>(
          ['admin-huzur-queue'],
          previous.map((h) => (h.id === huzurId ? { ...h, is_verified: isVerified } : h))
        );
      }
      return { previous };
    },
    onError: (err, variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['admin-huzur-queue'], context.previous);
      }
      alert(locale === 'bn' ? 'যাচাইকরণ স্থিতি আপডেট ব্যর্থ হয়েছে।' : 'Failed to update verification.');
    },
    onSettled: () => {
      setActingHuzurId(null);
      queryClient.invalidateQueries({ queryKey: ['admin-huzur-queue'] });
      queryClient.invalidateQueries({ queryKey: ['admin-metrics'] });
    },
  });

  const handleVerify = (huzurId: string, approve: boolean) => {
    verifyMutation.mutate({ huzurId, isVerified: approve });
  };

  // Filter Huzurs
  const unverifiedList = huzurs.filter((h) => !h.is_verified);
  const verifiedList = huzurs.filter((h) => h.is_verified);

  const displayedHuzurs = (
    activeTab === 'queue' ? unverifiedList : activeTab === 'verified' ? verifiedList : huzurs
  ).filter((h) => {
    if (!searchFilter.trim()) return true;
    const q = searchFilter.toLowerCase();
    return (
      h.name.toLowerCase().includes(q) ||
      (h.institution && h.institution.toLowerCase().includes(q)) ||
      (h.phone && h.phone.includes(q)) ||
      (h.home_district_name && h.home_district_name.toLowerCase().includes(q))
    );
  });

  const isAdmin = currentUser?.role === 'admin';

  // If not admin, show role-gate notification & developer bypass button
  if (!isAdmin) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 text-center space-y-4 shadow-lg">
          <div className="w-16 h-16 rounded-2xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <div className="space-y-1.5">
            <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
              {locale === 'bn' ? 'অ্যাক্সেস সংরক্ষিত (এডমিন প্যানেল)' : 'Access Restricted (Admin Only)'}
            </h1>
            <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400">
              {locale === 'bn'
                ? 'এই পৃষ্ঠাটি শুধুমাত্র সিস্টেম অ্যাডমিনিস্ট্রেটরদের জন্য সংরক্ষিত। অনুগ্রহ করে উপযুক্ত অ্যাডমিন একাউন্ট দিয়ে প্রবেশ করুন।'
                : 'This panel is strictly role-gated for administrators.'}
            </p>
          </div>

          <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 space-y-2">
            <button
              onClick={enableDemoAdmin}
              className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs sm:text-sm font-semibold transition-colors shadow-xs min-h-[44px]"
            >
              {locale === 'bn' ? 'অ্যাডমিন মোডে সুইচ করুন (টেস্টিং ডেমো)' : 'Switch to Admin Role (Testing Demo)'}
            </button>
            <Link
              href={`/${locale}`}
              className="inline-block text-xs font-semibold text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 py-2 min-h-[44px]"
            >
              {locale === 'bn' ? 'মূল পাতায় ফিরে যান' : 'Back to Home'}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24 pt-2">
      {/* Admin Top Header Banner */}
      <div className="bg-gradient-to-br from-zinc-900 via-emerald-950 to-zinc-900 rounded-2xl p-6 sm:p-7 text-white shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-emerald-500/20 text-emerald-300 text-xs font-semibold rounded-full border border-emerald-400/20">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>{locale === 'bn' ? 'সুপার অ্যাডমিন নিয়ন্ত্রণ কক্ষ' : 'Central Admin Console'}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              {locale === 'bn' ? 'প্ল্যাটফর্ম ব্যবস্থাপনা ও অডিট' : 'Platform Administration & Audit'}
            </h1>
            <p className="text-xs sm:text-sm text-zinc-300 max-w-xl">
              {locale === 'bn'
                ? 'বক্তা যাচাইকরণ কিউ, পোস্টগ্রেস এগ্রিগেট পরিসংখ্যান এবং জেলাভিত্তিক বুকিং মেট্রিক্স।'
                : 'Huzur verification queue, PostgreSQL aggregate analytics, and regional engagement reporting.'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                refetchMetrics();
                refetchHuzurs();
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-zinc-800/80 hover:bg-zinc-800 text-zinc-200 rounded-xl text-xs font-semibold border border-zinc-700/60 transition-colors min-h-[44px]"
            >
              <RotateCw className="w-3.5 h-3.5" />
              <span>{locale === 'bn' ? 'রিফ্রেশ মেট্রিক্স' : 'Refresh Data'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* SECTION 1: BASIC REPORTING (POSTGRES AGGREGATES) */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          <h2 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-zinc-100">
            {locale === 'bn'
              ? 'বেসিক রিপোর্টিং ও পরিসংখ্যান (Postgres Aggregates)'
              : 'Basic Reporting & Metrics (Postgres Aggregates)'}
          </h2>
        </div>

        {/* Metric Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          {/* Total Bookings This Month */}
          <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-xs">
            <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400 mb-1">
              <span className="text-xs font-semibold">
                {locale === 'bn' ? 'চলতি মাসের মোট বুকিং' : 'Bookings This Month'}
              </span>
              <Calendar className="w-4 h-4 text-emerald-600" />
            </div>
            <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400 mt-2">
              {locale === 'bn'
                ? (metricsData?.totalBookingsThisMonth ?? 0).toLocaleString('bn-BD')
                : metricsData?.totalBookingsThisMonth ?? 0}
            </p>
            <span className="text-[11px] text-zinc-400">Postgres date_trunc('month')</span>
          </div>

          {/* Total Registered Huzurs */}
          <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-xs">
            <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400 mb-1">
              <span className="text-xs font-semibold">
                {locale === 'bn' ? 'মোট নিবন্ধিত বক্তা' : 'Total Huzurs'}
              </span>
              <Users className="w-4 h-4 text-blue-600" />
            </div>
            <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mt-2">
              {locale === 'bn'
                ? (metricsData?.totalHuzurs ?? 0).toLocaleString('bn-BD')
                : metricsData?.totalHuzurs ?? 0}
            </p>
            <span className="text-[11px] text-zinc-400">
              {locale === 'bn'
                ? `যাচাইকৃত: ${(metricsData?.verifiedHuzurs ?? 0).toLocaleString('bn-BD')}`
                : `Verified: ${metricsData?.verifiedHuzurs ?? 0}`}
            </span>
          </div>

          {/* Pending Verification Queue Count */}
          <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-amber-200 dark:border-amber-900/40 shadow-xs">
            <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400 mb-1">
              <span className="text-xs font-semibold text-amber-700 dark:text-amber-400">
                {locale === 'bn' ? 'যাচাই অপেক্ষমাণ' : 'Awaiting Verification'}
              </span>
              <Clock className="w-4 h-4 text-amber-500" />
            </div>
            <p className="text-2xl font-bold text-amber-900 dark:text-amber-200 mt-2">
              {locale === 'bn'
                ? unverifiedList.length.toLocaleString('bn-BD')
                : unverifiedList.length}
            </p>
            <span className="text-[11px] text-amber-600/80 dark:text-amber-400/80">
              {locale === 'bn' ? 'পর্যালোচনা প্রয়োজন' : 'Requires review'}
            </span>
          </div>

          {/* Total System Bookings */}
          <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-xs">
            <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400 mb-1">
              <span className="text-xs font-semibold">
                {locale === 'bn' ? 'মোট বুকিং রেকর্ড' : 'All-time Bookings'}
              </span>
              <TrendingUp className="w-4 h-4 text-purple-600" />
            </div>
            <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mt-2">
              {locale === 'bn'
                ? (metricsData?.totalBookings ?? 0).toLocaleString('bn-BD')
                : metricsData?.totalBookings ?? 0}
            </p>
            <span className="text-[11px] text-zinc-400">
              {locale === 'bn'
                ? `অনুমোদিত: ${(metricsData?.confirmedBookings ?? 0).toLocaleString('bn-BD')}`
                : `Confirmed: ${metricsData?.confirmedBookings ?? 0}`}
            </span>
          </div>
        </div>

        {/* Most Active Districts Report */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-emerald-600" />
              <h3 className="font-bold text-sm sm:text-base text-zinc-900 dark:text-zinc-100">
                {locale === 'bn'
                  ? 'সর্বাধিক সক্রিয় জেলাসমূহ (Most Active Districts)'
                  : 'Most Active Districts by Booking Count'}
              </h3>
            </div>
            <span className="text-xs text-zinc-500">Postgres GROUP BY district_id</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-1">
            {metricsData?.activeDistricts && metricsData.activeDistricts.length > 0 ? (
              metricsData.activeDistricts.map((district, idx) => {
                const maxCount = metricsData.activeDistricts[0]?.booking_count || 1;
                const percentage = Math.round((district.booking_count / maxCount) * 100);

                return (
                  <div
                    key={district.district_id}
                    className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate">
                        {idx + 1}. {locale === 'bn' ? district.district_bn_name : district.district_name}
                      </span>
                      <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                        {locale === 'bn'
                          ? `${district.booking_count.toLocaleString('bn-BD')} টি`
                          : `${district.booking_count}`}
                      </span>
                    </div>

                    <div className="w-full h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-xs text-zinc-500 col-span-full py-2">
                {locale === 'bn' ? 'কোনো জেলা ডাটা পাওয়া যায়নি।' : 'No district aggregates available.'}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* SECTION 2: HUZUR VERIFICATION QUEUE */}
      <div className="space-y-4 pt-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <h2 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-zinc-100">
              {locale === 'bn'
                ? 'বক্তা যাচাইকরণ কিউ (Huzur Verification Queue)'
                : 'Huzur Verification Queue'}
            </h2>
          </div>

          {/* Search box within queue */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={locale === 'bn' ? 'নাম, প্রতিষ্ঠান বা ফোন...' : 'Search by name, madrasa...'}
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 min-h-[44px]"
            />
          </div>
        </div>

        {/* Tab Filters */}
        <div className="flex items-center gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-2">
          {[
            {
              key: 'queue',
              label: locale === 'bn' ? `যাচাই অপেক্ষমাণ (${unverifiedList.length})` : `Pending Queue (${unverifiedList.length})`,
              countClass: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
            },
            {
              key: 'verified',
              label: locale === 'bn' ? `যাচাইকৃত (${verifiedList.length})` : `Verified (${verifiedList.length})`,
              countClass: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
            },
            {
              key: 'all',
              label: locale === 'bn' ? `সকল বক্তা (${huzurs.length})` : `All Speakers (${huzurs.length})`,
              countClass: 'bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200',
            },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl transition-all min-h-[44px] ${
                activeTab === tab.key
                  ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-xs'
                  : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Queue Listing */}
        {isLoadingHuzurs ? (
          <div className="space-y-3">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 animate-pulse space-y-3"
              >
                <div className="h-5 bg-zinc-200 dark:bg-zinc-800 rounded w-1/4" />
                <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : displayedHuzurs.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-zinc-900 rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800 p-8 space-y-2">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
            <p className="font-semibold text-sm text-zinc-800 dark:text-zinc-200">
              {locale === 'bn'
                ? activeTab === 'queue'
                  ? 'কোনো অপেক্ষমাণ বক্তা নেই! সমস্ত প্রোফাইল অনুমোদিত।'
                  : 'কোনো বক্তা খুঁজে পাওয়া যায়নি।'
                : activeTab === 'queue'
                ? 'No pending verification requests in the queue.'
                : 'No speakers found.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {displayedHuzurs.map((huzur) => {
              const isActing = actingHuzurId === huzur.id;

              return (
                <div
                  key={huzur.id}
                  className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors"
                >
                  <div className="flex items-start sm:items-center gap-3.5">
                    {huzur.photo_url ? (
                      <div className="relative w-13 h-13 rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-700 shrink-0">
                        <Image
                          src={huzur.photo_url}
                          alt={huzur.name}
                          fill
                          sizes="52px"
                          className="object-cover"
                        />
                      </div>
                    ) : (
                      <div className="w-13 h-13 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-500 font-bold shrink-0">
                        {huzur.name.slice(0, 1)}
                      </div>
                    )}

                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-100 leading-tight">
                          {huzur.name}
                        </h3>

                        {huzur.is_verified ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 rounded-full text-[11px] font-semibold border border-emerald-200 dark:border-emerald-800">
                            <ShieldCheck className="w-3 h-3" />
                            <span>{locale === 'bn' ? 'যাচাইকৃত' : 'Verified'}</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 rounded-full text-[11px] font-semibold border border-amber-200 dark:border-amber-800">
                            <Clock className="w-3 h-3" />
                            <span>{locale === 'bn' ? 'অপেক্ষমাণ' : 'Pending'}</span>
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-500 dark:text-zinc-400">
                        {huzur.institution && (
                          <span className="flex items-center gap-1">
                            <Building className="w-3.5 h-3.5" />
                            {huzur.institution}
                          </span>
                        )}
                        {huzur.home_district_name && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5" />
                            {huzur.home_district_name}
                          </span>
                        )}
                        {huzur.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="w-3.5 h-3.5" />
                            {huzur.phone}
                          </span>
                        )}
                      </div>

                      {huzur.specialties && huzur.specialties.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-0.5">
                          {huzur.specialties.map((spec, i) => (
                            <span
                              key={i}
                              className="px-2 py-0.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded text-[10px] font-medium"
                            >
                              {spec}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Verification Queue Actions */}
                  <div className="flex items-center gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-zinc-100 dark:border-zinc-800">
                    <Link
                      href={`/${locale}/huzur/${huzur.id}`}
                      target="_blank"
                      className="inline-flex items-center gap-1 px-3 py-2 text-xs font-semibold text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white border border-zinc-200 dark:border-zinc-700 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors min-h-[44px]"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>{locale === 'bn' ? 'প্রোফাইল' : 'View'}</span>
                    </Link>

                    {!huzur.is_verified ? (
                      <button
                        onClick={() => handleVerify(huzur.id, true)}
                        disabled={isActing}
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all min-h-[44px] disabled:opacity-50"
                      >
                        <Check className="w-4 h-4" />
                        <span>{locale === 'bn' ? 'অনুমোদন দিন' : 'Approve'}</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => handleVerify(huzur.id, false)}
                        disabled={isActing}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 border border-rose-200 dark:border-rose-900/40 text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl text-xs font-semibold transition-all min-h-[44px] disabled:opacity-50"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>{locale === 'bn' ? 'যাচাই বাতিল' : 'Revoke'}</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
