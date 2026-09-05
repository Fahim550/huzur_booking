'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CalendarCheck,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  MapPin,
  Phone,
  ArrowLeft,
  Plus,
  RotateCw,
  FileText,
  User,
  ExternalLink,
  Ban,
} from 'lucide-react';
import { BookingWithDetails, BOOKING_STATUS_LABELS_BN, BookingStatus } from '@/types/database';
import { Locale, isValidLocale, DEFAULT_LOCALE } from '@/lib/i18n/config';
import { getDictionary } from '@/lib/i18n/getDictionary';
import { getClientUser, AuthSessionUser } from '@/lib/auth';
import { SEED_BOOKINGS } from '@/lib/data/mockData';
import NotificationBell from '@/components/navigation/NotificationBell';

export default function OrganizerMyRequestsPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const rawLocale = params?.locale as string;
  const locale: Locale = isValidLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE;
  const dict = getDictionary(locale);

  const [currentUser, setCurrentUser] = useState<AuthSessionUser | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'confirmed' | 'rejected'>('all');
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  useEffect(() => {
    getClientUser().then((u) => {
      if (u) {
        setCurrentUser(u);
      }
    });
  }, []);

  const organizerId = currentUser?.id || 'b1111111-1111-1111-1111-111111111111';

  // TanStack Query with 30s auto-refetch interval as specified
  const {
    data: requests = [],
    isLoading,
    isRefetching,
    refetch,
    dataUpdatedAt,
  } = useQuery<BookingWithDetails[]>({
    queryKey: ['organizer-requests', organizerId, locale],
    queryFn: async () => {
      try {
        const res = await fetch(`/api/bookings?organizerId=${encodeURIComponent(organizerId)}`);
        if (res.ok) {
          const json = await res.json();
          if (json.bookings && Array.isArray(json.bookings)) {
            return json.bookings;
          }
        }
      } catch (e) {
        console.warn('API fetch failed, falling back to local dataset:', e);
      }

      // Local fallback for demo/unconfigured Supabase environment
      return SEED_BOOKINGS.filter((b) => b.organizer_id === organizerId || true);
    },
    refetchInterval: 30000, // 30s auto-refetch interval so status changes appear without manual reload
    staleTime: 10000,
  });

  // Cancel pending booking mutation
  const cancelMutation = useMutation({
    mutationFn: async (bookingId: string) => {
      const res = await fetch(`/api/bookings/${bookingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'cancelled' }),
      });
      if (!res.ok) {
        throw new Error('Failed to cancel booking request');
      }
      return res.json();
    },
    onMutate: async (bookingId) => {
      setCancellingId(bookingId);
      await queryClient.cancelQueries({ queryKey: ['organizer-requests', organizerId, locale] });
      const previous = queryClient.getQueryData<BookingWithDetails[]>(['organizer-requests', organizerId, locale]);

      if (previous) {
        queryClient.setQueryData<BookingWithDetails[]>(
          ['organizer-requests', organizerId, locale],
          previous.map((b) => (b.id === bookingId ? { ...b, status: 'cancelled' as BookingStatus } : b))
        );
      }
      return { previous };
    },
    onError: (err, id, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['organizer-requests', organizerId, locale], context.previous);
      }
      alert(locale === 'bn' ? 'আবেদন বাতিল করতে সমস্যা হয়েছে।' : 'Failed to cancel request.');
    },
    onSettled: () => {
      setCancellingId(null);
      queryClient.invalidateQueries({ queryKey: ['organizer-requests', organizerId, locale] });
    },
  });

  const handleCancel = (bookingId: string) => {
    const confirmMsg =
      locale === 'bn'
        ? 'আপনি কি নিশ্চিতভাবে এই বুকিং আবেদনটি বাতিল করতে চান?'
        : 'Are you sure you want to cancel this booking request?';
    if (window.confirm(confirmMsg)) {
      cancelMutation.mutate(bookingId);
    }
  };

  // Metrics
  const totalCount = requests.length;
  const pendingCount = requests.filter((r) => r.status === 'pending').length;
  const confirmedCount = requests.filter((r) => r.status === 'confirmed').length;
  const rejectedCount = requests.filter((r) => r.status === 'rejected' || r.status === 'cancelled').length;

  const filteredRequests = requests.filter((r) => {
    if (activeTab === 'all') return true;
    if (activeTab === 'pending') return r.status === 'pending';
    if (activeTab === 'confirmed') return r.status === 'confirmed';
    if (activeTab === 'rejected') return r.status === 'rejected' || r.status === 'cancelled';
    return true;
  });

  return (
    <div className="min-h-screen pb-24 pt-2">
      {/* Back to Organizer Dashboard / Home */}
      <div className="flex items-center justify-between mb-4">
        <Link
          href={`/${locale}/dashboard/organizer`}
          className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors min-h-[44px] px-2 rounded-lg"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{locale === 'bn' ? 'আয়োজক ড্যাশবোর্ড' : 'Organizer Dashboard'}</span>
        </Link>

        {/* Live Auto-Refetch Badge, Notification Bell & Manual Refresh */}
        <div className="flex items-center gap-2">
          {/* Notification Bell */}
          <NotificationBell locale={locale} />

          <div
            className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/60 rounded-full text-[11px] font-medium text-emerald-700 dark:text-emerald-300"
            title="TanStack Query background auto-refetch interval is 30s"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>{locale === 'bn' ? 'স্বয়ংক্রিয় হালনাগাদ (৩০ সে.)' : 'Live Polling (30s)'}</span>
          </div>

          <button
            onClick={() => refetch()}
            disabled={isRefetching}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all min-h-[44px]"
            aria-label="Refresh requests"
          >
            <RotateCw className={`w-3.5 h-3.5 ${isRefetching ? 'animate-spin text-emerald-600' : ''}`} />
            <span className="hidden xs:inline">{locale === 'bn' ? 'রিফ্রেশ' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {/* Banner / Title Card */}
      <div className="bg-gradient-to-br from-emerald-900 via-teal-900 to-zinc-900 rounded-2xl p-5 sm:p-7 text-white shadow-md mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-emerald-500/20 text-emerald-300 text-xs font-semibold rounded-full border border-emerald-400/20">
              <CalendarCheck className="w-3.5 h-3.5" />
              <span>{locale === 'bn' ? 'প্রেরিত বুকিং ট্র্যাকার' : 'Sent Request Tracker'}</span>
            </div>
            <h1 className="text-xl sm:text-3xl font-bold tracking-tight">
              {locale === 'bn' ? 'আমার মাহফিল বুকিং আবেদনসমূহ' : 'My Mahfil Booking Requests'}
            </h1>
            <p className="text-xs sm:text-sm text-emerald-100/80 max-w-xl">
              {locale === 'bn'
                ? 'বক্তাদের নিকট প্রেরিত বুকিং আবেদন এবং সেগুলোর হালনাগাদ অনুমোদন স্থিতি। প্রতি ৩০ সেকেন্ড পর পর তথ্য স্বয়ংক্রিয়ভাবে হালনাগাদ হয়।'
                : 'Track the status of speaking invitations sent to respected scholars. Automatically refreshes every 30 seconds.'}
            </p>
          </div>

          <div className="shrink-0">
            <Link
              href={`/${locale}/search`}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-emerald-950 font-bold rounded-xl text-xs sm:text-sm shadow-sm transition-all min-h-[44px]"
            >
              <Plus className="w-4 h-4" />
              <span>{locale === 'bn' ? 'নতুন বক্তা খুঁজুন' : 'Find Speakers'}</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
              {locale === 'bn' ? 'মোট আবেদন' : 'Total Sent'}
            </span>
            <FileText className="w-4 h-4 text-zinc-400" />
          </div>
          <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mt-2">
            {locale === 'bn' ? totalCount.toLocaleString('bn-BD') : totalCount}
          </p>
        </div>

        <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-amber-200/80 dark:border-amber-900/40 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-amber-700 dark:text-amber-400">
              {locale === 'bn' ? 'অপেক্ষমাণ' : 'Pending'}
            </span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-bold text-amber-800 dark:text-amber-300 mt-2">
            {locale === 'bn' ? pendingCount.toLocaleString('bn-BD') : pendingCount}
          </p>
        </div>

        <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-emerald-200/80 dark:border-emerald-900/40 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
              {locale === 'bn' ? 'নিশ্চিতকৃত' : 'Confirmed'}
            </span>
            <CheckCircle className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-bold text-emerald-800 dark:text-emerald-300 mt-2">
            {locale === 'bn' ? confirmedCount.toLocaleString('bn-BD') : confirmedCount}
          </p>
        </div>

        <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
              {locale === 'bn' ? 'প্রত্যাখ্যাত / বাতিল' : 'Rejected / Cancelled'}
            </span>
            <XCircle className="w-4 h-4 text-rose-500" />
          </div>
          <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mt-2">
            {locale === 'bn' ? rejectedCount.toLocaleString('bn-BD') : rejectedCount}
          </p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-2 mb-5 overflow-x-auto no-scrollbar">
        {[
          { key: 'all', label: locale === 'bn' ? `সকল আবেদন (${totalCount})` : `All (${totalCount})` },
          { key: 'pending', label: locale === 'bn' ? `অপেক্ষমাণ (${pendingCount})` : `Pending (${pendingCount})` },
          { key: 'confirmed', label: locale === 'bn' ? `নিশ্চিতকৃত (${confirmedCount})` : `Confirmed (${confirmedCount})` },
          { key: 'rejected', label: locale === 'bn' ? `অন্যান্য (${rejectedCount})` : `Other (${rejectedCount})` },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl transition-all whitespace-nowrap min-h-[44px] ${
              activeTab === tab.key
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Main List Area */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 animate-pulse space-y-3"
            >
              <div className="flex justify-between items-center">
                <div className="h-5 bg-zinc-200 dark:bg-zinc-800 rounded w-1/3" />
                <div className="h-6 bg-zinc-200 dark:bg-zinc-800 rounded-full w-20" />
              </div>
              <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-2/3" />
              <div className="h-10 bg-zinc-200 dark:bg-zinc-800 rounded-xl w-full" />
            </div>
          ))}
        </div>
      ) : filteredRequests.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-zinc-900 rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-800 p-8 space-y-4">
          <div className="w-14 h-14 mx-auto rounded-full bg-emerald-50 dark:bg-emerald-950/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <CalendarCheck className="w-7 h-7" />
          </div>
          <div className="space-y-1 max-w-md mx-auto">
            <h2 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-zinc-100">
              {locale === 'bn' ? 'কোনো বুকিং আবেদন পাওয়া যায়নি' : 'No Booking Requests Found'}
            </h2>
            <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
              {activeTab === 'all'
                ? locale === 'bn'
                  ? 'আপনি এখনও কোনো বক্তার নিকট মাহফিল বুকিং অনুরোধ পাঠাননি। শীর্ষস্থানীয় বক্তাদের প্রোফাইল দেখে সহজেই আবেদন করুন।'
                  : 'You have not submitted any speaking invitations yet.'
                : locale === 'bn'
                ? 'এই ফিল্টারে কোনো আবেদন নেই।'
                : 'No requests match this filter.'}
            </p>
          </div>
          <Link
            href={`/${locale}/search`}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs sm:text-sm font-semibold transition-colors shadow-sm min-h-[44px]"
          >
            <Plus className="w-4 h-4" />
            <span>{locale === 'bn' ? 'বক্তাদের তালিকা দেখুন' : 'Browse Speakers'}</span>
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredRequests.map((b) => {
            const booking = b as any;
            const statusConfig = BOOKING_STATUS_LABELS_BN[b.status] || {
              label: b.status,
              badgeClass: 'bg-zinc-100 text-zinc-700 border-zinc-200',
            };
            const statusLabel = dict.reference?.statuses?.[b.status] || statusConfig.label;
            const slot = booking.session_slot || 'after_esha';
            const slotLabel = dict.reference?.slots?.[slot] || slot;
            const districtStr =
              typeof booking.district === 'string'
                ? booking.district
                : booking.district?.bn_name || booking.district?.name || 'ঢাকা';
            const speakerName = booking.huzur?.full_name || booking.huzur?.name || 'সম্মানিত বক্তা';
            const speakerTitle = booking.huzur?.huzur_profile?.title || 'মাওলানা';
            const speakerInstitution =
              booking.huzur?.huzur_profile?.madrasa_or_institution || booking.huzur?.institution || '';
            const speakerPhoto =
              booking.huzur?.avatar_url || booking.huzur?.photo_url || null;

            return (
              <div
                key={b.id}
                className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 space-y-4 shadow-xs hover:border-emerald-300 dark:hover:border-emerald-800/80 transition-colors"
              >
                {/* Header: Speaker identity & status badge */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    {speakerPhoto ? (
                      <div className="relative w-12 h-12 rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-700 shrink-0">
                        <Image
                          src={speakerPhoto}
                          alt={speakerName}
                          fill
                          sizes="48px"
                          className="object-cover"
                        />
                      </div>
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center text-emerald-700 dark:text-emerald-300 font-bold shrink-0">
                        <User className="w-6 h-6" />
                      </div>
                    )}
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                          {speakerTitle}
                        </span>
                        {booking.huzur?.huzur_profile?.verified && (
                          <span className="inline-flex items-center px-1.5 py-0.2 bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 rounded text-[10px] font-medium border border-emerald-200 dark:border-emerald-800">
                            {locale === 'bn' ? 'যাচাইকৃত' : 'Verified'}
                          </span>
                        )}
                      </div>
                      <h3 className="font-bold text-base sm:text-lg text-zinc-900 dark:text-zinc-100 leading-tight">
                        {speakerName}
                      </h3>
                      {speakerInstitution && (
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate max-w-xs">
                          {speakerInstitution}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Status Badge */}
                  <span
                    className={`shrink-0 px-3 py-1 text-xs font-semibold rounded-full border ${statusConfig.badgeClass}`}
                  >
                    {statusLabel}
                  </span>
                </div>

                {/* Mahfil Title */}
                <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800/60">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1">
                    <FileText className="w-3.5 h-3.5" />
                    <span>{locale === 'bn' ? 'মাহফিলের বিবরণ:' : 'Event Details:'}</span>
                  </div>
                  <p className="font-semibold text-sm sm:text-base text-zinc-800 dark:text-zinc-200">
                    {booking.mahfil_name || booking.event_details || 'ওয়াজ মাহফিল'}
                  </p>
                </div>

                {/* Logistics Info Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs text-zinc-600 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-800/40 p-3.5 rounded-xl">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span>
                      {locale === 'bn' ? 'তারিখ ও অধিবেশন:' : 'Date & Slot:'}{' '}
                      <strong className="text-zinc-900 dark:text-zinc-100">{b.event_date}</strong> ({slotLabel})
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span className="truncate">
                      {b.venue_address}, {districtStr}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-zinc-400 shrink-0" />
                    <span>
                      {locale === 'bn' ? 'যোগাযোগ:' : 'Contact:'}{' '}
                      {booking.contact_person_name || 'আয়োজক'} ({booking.contact_phone || '+8801700000000'})
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>
                      {locale === 'bn' ? 'প্রস্তাবিত হাদিয়া:' : 'Hadya Offered:'}{' '}
                      <strong className="text-emerald-700 dark:text-emerald-400">
                        {booking.hadya_offered
                          ? locale === 'bn'
                            ? `${booking.hadya_offered.toLocaleString('bn-BD')} ৳`
                            : `BDT ${booking.hadya_offered.toLocaleString('en-US')}`
                          : locale === 'bn'
                          ? 'আলোচনা সাপেক্ষে'
                          : 'Negotiable'}
                      </strong>
                    </span>
                  </div>
                </div>

                {/* Additional Notes if provided */}
                {booking.notes && (
                  <div className="p-3 bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/30 rounded-xl text-xs text-amber-900 dark:text-amber-200">
                    <span className="font-semibold">{locale === 'bn' ? 'আবেদনের নোট: ' : 'Note: '}</span>
                    {booking.notes}
                  </div>
                )}

                {/* Bottom Actions */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
                  <div className="text-[11px] text-zinc-400 dark:text-zinc-500">
                    {locale === 'bn' ? 'আবেদনের সময়: ' : 'Submitted: '}
                    {b.created_at ? new Date(b.created_at).toLocaleDateString(locale === 'bn' ? 'bn-BD' : 'en-US') : ''}
                  </div>

                  <div className="flex items-center gap-2">
                    {/* View Huzur Profile */}
                    <Link
                      href={`/${locale}/huzur/${b.huzur_id}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:text-emerald-700 dark:hover:text-emerald-400 border border-zinc-200 dark:border-zinc-700 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors min-h-[44px]"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>{locale === 'bn' ? 'বক্তার প্রোফাইল' : 'View Profile'}</span>
                    </Link>

                    {/* Cancel button if still pending */}
                    {b.status === 'pending' && (
                      <button
                        onClick={() => handleCancel(b.id)}
                        disabled={cancellingId === b.id}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-900/50 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors min-h-[44px] disabled:opacity-50"
                      >
                        <Ban className="w-3.5 h-3.5" />
                        <span>
                          {cancellingId === b.id
                            ? locale === 'bn'
                              ? 'বাতিল হচ্ছে...'
                              : 'Cancelling...'
                            : locale === 'bn'
                            ? 'আবেদন প্রত্যাহার'
                            : 'Cancel Request'}
                        </span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
